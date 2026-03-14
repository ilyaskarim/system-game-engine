import { createNoise2D, fbm } from './noise';
import type { MapConfig } from '../types/MapConfig';
import { generateRiverPath, getDistanceToRiver } from './terrainUtils';

// Global terrain height cache for consistency across all components
const heightCache = new Map<string, number>();

// Step function for sharp mountain transitions
function stepFunction(value: number, threshold: number, sharpness: number = 10): number {
  // Sigmoid-like step function for sharp transitions
  const x = (value - threshold) * sharpness;
  return 1 / (1 + Math.exp(-x));
}

// Check if a position is in a mountain zone
export function isMountainZone(
  x: number,
  z: number,
  config: MapConfig
): { inMountain: boolean; intensity: number } {
  if (config.terrain.mountainFactor <= 0) {
    return { inMountain: false, intensity: 0 };
  }

  const mountainNoise = createNoise2D(config.seed + 2000);
  const mountainArea = fbm(mountainNoise, x * 0.025, z * 0.025, 3, 2, 0.5);

  // Sharp threshold for mountain zones
  const mountainThreshold = 0.6 - config.terrain.mountainFactor * 0.4;

  if (mountainArea > mountainThreshold) {
    // Use step function for sharp falloff at mountain boundaries
    const intensity = stepFunction(mountainArea, mountainThreshold, 8);
    return { inMountain: true, intensity };
  }

  return { inMountain: false, intensity: 0 };
}

// Get terrain height with step-function topology
// Plains are flat at y=0, only mountains have elevation
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

  const noise = createNoise2D(config.seed);
  const riverPoints = generateRiverPath(size, config.seed);
  const minRiverDist = getDistanceToRiver(x, z, riverPoints);
  const riverWidth = 2;

  // Base height starts at 0 (flat plains)
  let height = 0;

  // River carving - creates slight depression
  if (minRiverDist < riverWidth) {
    const riverFactor = 1 - minRiverDist / riverWidth;
    height -= riverFactor * 0.3;
  }

  // Mountain zones only - use step function for sharp transitions
  const { inMountain, intensity } = isMountainZone(x, z, config);

  if (inMountain && intensity > 0.1) {
    // Mountain height with sharp falloff
    const mountainHeight = fbm(noise, x * 0.08, z * 0.08, 4, 2, 0.6);
    // Apply intensity for sharp edge transition
    height += intensity * Math.max(0, mountainHeight) * 1.5;
  }

  // Cache the result
  heightCache.set(cacheKey, height);

  return height * heightScale;
}

// Get flat terrain height (for building foundations)
// Returns y=0 for plains, elevated plateau for mountains
export function getFlattenedHeight(
  x: number,
  z: number,
  heightScale: number,
  config: MapConfig
): number {
  const { inMountain, intensity } = isMountainZone(x, z, config);

  // If in mountain zone, return a flat plateau at mountain base height
  if (inMountain && intensity > 0.5) {
    // Flat plateau at a consistent height within mountain zones
    return intensity * 0.8 * heightScale;
  }

  // Plains are at y=0
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

// Check if position is suitable for building (flat and not in water/mountains)
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

  // Not in steep mountain area
  const { inMountain, intensity } = isMountainZone(x, z, config);
  if (inMountain && intensity > 0.7) return false;

  return true;
}
