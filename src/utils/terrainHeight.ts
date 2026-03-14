import type { MapConfig } from '../types/MapConfig';
import { generateRiverPath, getDistanceToRiver } from './terrainUtils';

// Global terrain height cache for consistency across all components
const heightCache = new Map<string, number>();

// Get terrain height - flat terrain with river depression
export function getTerrainHeightGlobal(
  x: number,
  z: number,
  heightScale: number,
  config: MapConfig,
  size: number = 100
): number {
  // Check cache first for consistency
  const cacheKey = `${x.toFixed(2)},${z.toFixed(2)},${config.seed}`;
  if (heightCache.has(cacheKey)) {
    return heightCache.get(cacheKey)! * heightScale;
  }

  const riverPoints = generateRiverPath(size, config.seed);
  const minRiverDist = getDistanceToRiver(x, z, riverPoints);
  const riverWidth = 2;

  // Flat terrain at y=0
  let height = 0;

  // River carving - creates slight depression
  if (minRiverDist < riverWidth) {
    const riverFactor = 1 - minRiverDist / riverWidth;
    height -= riverFactor * 0.3;
  }

  // Cache the result
  heightCache.set(cacheKey, height);

  return height * heightScale;
}

// Get flat terrain height (for building foundations)
// All terrain is flat at y=0
export function getFlattenedHeight(
  _x: number,
  _z: number,
  _heightScale: number,
  _config: MapConfig
): number {
  return 0;
}

// Clear height cache (call when config changes)
export function clearHeightCache(): void {
  heightCache.clear();
}

// Building placement data
export interface BuildingPlacement {
  x: number;
  z: number;
  y: number;  // Ground level
  isFlat: boolean;  // Whether the ground is flat enough
}

// Get optimal building placement with snap-to-mesh
export function getBuildingPlacement(
  x: number,
  z: number,
  footprintSize: number,
  heightScale: number,
  config: MapConfig,
  size: number = 100
): BuildingPlacement {
  // Sample heights at building footprint corners
  const halfSize = footprintSize / 2;
  const samples = [
    getTerrainHeightGlobal(x - halfSize, z - halfSize, heightScale, config, size),
    getTerrainHeightGlobal(x + halfSize, z - halfSize, heightScale, config, size),
    getTerrainHeightGlobal(x - halfSize, z + halfSize, heightScale, config, size),
    getTerrainHeightGlobal(x + halfSize, z + halfSize, heightScale, config, size),
    getTerrainHeightGlobal(x, z, heightScale, config, size),
  ];

  const minHeight = Math.min(...samples);
  const maxHeight = Math.max(...samples);

  // Check if terrain is flat enough (height variance < threshold)
  const heightVariance = maxHeight - minHeight;
  const isFlat = heightVariance < 0.5;

  // For building placement, use the minimum height so building sits on ground
  // This prevents floating buildings
  return {
    x,
    z,
    y: minHeight,
    isFlat,
  };
}

// Check if position is suitable for building (not in water)
export function isBuildableTerrain(
  x: number,
  z: number,
  config: MapConfig,
  size: number = 100
): boolean {
  const riverPoints = generateRiverPath(size, config.seed);
  const minRiverDist = getDistanceToRiver(x, z, riverPoints);

  // Not in river
  if (minRiverDist < 3) return false;

  return true;
}
