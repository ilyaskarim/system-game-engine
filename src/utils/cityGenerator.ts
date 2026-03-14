import type { MapConfig } from '../types/MapConfig';
import { seededRandom, generateRiverPath, getDistanceToRiver } from './terrainUtils';
import { getBuildingPlacement } from './terrainHeight';

// Building types with different characteristics
export type BuildingStyle = 'residential' | 'commercial' | 'house';
export type FootprintShape = 'square' | 'rectangular' | 'lShaped';

export interface BuildingDefinition {
  x: number;
  z: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  style: BuildingStyle;
  footprint: FootprintShape;
  colorIndex: number;
}


// Road segment for collision detection
interface RoadSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

// Poisson Disk Sampling implementation
// Returns well-distributed random points with minimum distance between them
export function poissonDiskSampling(
  width: number,
  height: number,
  minDistance: number,
  maxAttempts: number,
  random: () => number,
  isValidPosition: (x: number, z: number) => boolean
): { x: number; z: number }[] {
  const cellSize = minDistance / Math.sqrt(2);
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);

  // Grid to track occupied cells (-1 means empty)
  const grid: number[][] = [];
  for (let i = 0; i < gridWidth; i++) {
    grid[i] = [];
    for (let j = 0; j < gridHeight; j++) {
      grid[i][j] = -1;
    }
  }

  const points: { x: number; z: number }[] = [];
  const activeList: number[] = [];

  // Helper to get grid index
  const getGridIndex = (x: number, z: number) => ({
    i: Math.floor((x + width / 2) / cellSize),
    j: Math.floor((z + height / 2) / cellSize),
  });

  // Generate first point
  let firstPoint: { x: number; z: number } | null = null;
  for (let attempt = 0; attempt < 100 && !firstPoint; attempt++) {
    const x = (random() - 0.5) * width * 0.9;
    const z = (random() - 0.5) * height * 0.9;
    if (isValidPosition(x, z)) {
      firstPoint = { x, z };
    }
  }

  if (!firstPoint) return points;

  points.push(firstPoint);
  activeList.push(0);
  const { i, j } = getGridIndex(firstPoint.x, firstPoint.z);
  if (i >= 0 && i < gridWidth && j >= 0 && j < gridHeight) {
    grid[i][j] = 0;
  }

  // Main sampling loop
  while (activeList.length > 0) {
    // Pick a random active point
    const activeIdx = Math.floor(random() * activeList.length);
    const pointIdx = activeList[activeIdx];
    const point = points[pointIdx];

    let found = false;

    // Try to find a new point around the active point
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random point in annulus around active point
      const angle = random() * Math.PI * 2;
      const radius = minDistance + random() * minDistance;
      const newX = point.x + Math.cos(angle) * radius;
      const newZ = point.z + Math.sin(angle) * radius;

      // Check bounds
      if (Math.abs(newX) > width * 0.45 || Math.abs(newZ) > height * 0.45) {
        continue;
      }

      // Check if position is buildable
      if (!isValidPosition(newX, newZ)) {
        continue;
      }

      // Check distance to all nearby points
      const { i: newI, j: newJ } = getGridIndex(newX, newZ);
      if (newI < 0 || newI >= gridWidth || newJ < 0 || newJ >= gridHeight) {
        continue;
      }

      let tooClose = false;

      // Check neighboring cells (2 cell radius)
      for (let di = -2; di <= 2 && !tooClose; di++) {
        for (let dj = -2; dj <= 2 && !tooClose; dj++) {
          const ni = newI + di;
          const nj = newJ + dj;

          if (ni >= 0 && ni < gridWidth && nj >= 0 && nj < gridHeight) {
            const neighborIdx = grid[ni][nj];
            if (neighborIdx !== -1) {
              const neighbor = points[neighborIdx];
              const dist = Math.sqrt(
                (newX - neighbor.x) ** 2 + (newZ - neighbor.z) ** 2
              );
              if (dist < minDistance) {
                tooClose = true;
              }
            }
          }
        }
      }

      if (!tooClose) {
        // Add the new point
        const newIdx = points.length;
        points.push({ x: newX, z: newZ });
        activeList.push(newIdx);
        grid[newI][newJ] = newIdx;
        found = true;
        break;
      }
    }

    // If no new point found, remove from active list
    if (!found) {
      activeList.splice(activeIdx, 1);
    }
  }

  return points;
}

// Generate road segments for collision detection
export function generateRoadSegments(
  _config: MapConfig,
  _terrainSize: number
): RoadSegment[] {
  // Road avoidance currently handled by the buildable terrain check
  // This function is a placeholder for future enhancement where actual
  // road path segments could be used for more precise collision detection
  return [];
}

// Check if a position is too close to a road
export function isNearRoad(
  x: number,
  z: number,
  roadSegments: RoadSegment[],
  minDistance: number = 1.5
): boolean {
  for (const segment of roadSegments) {
    // Point to line segment distance
    const dx = segment.x2 - segment.x1;
    const dz = segment.z2 - segment.z1;
    const lengthSq = dx * dx + dz * dz;

    if (lengthSq === 0) {
      // Segment is a point
      const dist = Math.sqrt((x - segment.x1) ** 2 + (z - segment.z1) ** 2);
      if (dist < minDistance) return true;
      continue;
    }

    // Project point onto line segment
    let t = ((x - segment.x1) * dx + (z - segment.z1) * dz) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = segment.x1 + t * dx;
    const projZ = segment.z1 + t * dz;

    const dist = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2);
    if (dist < minDistance) return true;
  }

  return false;
}

// Enhanced buildable terrain check
export function isCityBuildable(
  x: number,
  z: number,
  _config: MapConfig,
  terrainSize: number,
  riverPath: { x: number; y: number }[],
  roadSegments: RoadSegment[]
): boolean {
  // Check distance to river (wider buffer for city buildings)
  const riverDist = getDistanceToRiver(x, z, riverPath);
  if (riverDist < 4) return false;

  // Check road proximity
  if (isNearRoad(x, z, roadSegments, 1.5)) return false;

  // Check bounds
  if (Math.abs(x) > terrainSize * 0.45 || Math.abs(z) > terrainSize * 0.45) {
    return false;
  }

  return true;
}

// Determine building style based on position and density
function determineBuildingStyle(
  x: number,
  z: number,
  terrainSize: number,
  random: () => number
): BuildingStyle {
  // Distance from center affects building type
  const distFromCenter = Math.sqrt(x * x + z * z);
  const normalizedDist = distFromCenter / (terrainSize * 0.5);

  const roll = random();

  if (normalizedDist < 0.3) {
    // Urban core - more commercial buildings
    if (roll < 0.5) return 'commercial';
    if (roll < 0.8) return 'residential';
    return 'house';
  } else if (normalizedDist < 0.6) {
    // Suburban - mixed
    if (roll < 0.3) return 'commercial';
    if (roll < 0.7) return 'residential';
    return 'house';
  } else {
    // Outer areas - mostly houses
    if (roll < 0.1) return 'commercial';
    if (roll < 0.3) return 'residential';
    return 'house';
  }
}

// Determine footprint shape
function determineFootprint(
  style: BuildingStyle,
  random: () => number
): FootprintShape {
  const roll = random();

  if (style === 'commercial') {
    // Commercial: mostly rectangular, some square
    if (roll < 0.3) return 'square';
    if (roll < 0.9) return 'rectangular';
    return 'lShaped';
  } else if (style === 'residential') {
    // Residential: mixed shapes
    if (roll < 0.4) return 'square';
    if (roll < 0.7) return 'rectangular';
    return 'lShaped';
  } else {
    // Houses: mostly square, some rectangular
    if (roll < 0.6) return 'square';
    return 'rectangular';
  }
}

// Get building dimensions based on style
function getBuildingDimensions(
  style: BuildingStyle,
  footprint: FootprintShape,
  random: () => number
): { width: number; depth: number; height: number } {
  let width: number, depth: number, height: number;

  // Height in "stories" (2-15 as specified), converted to world units
  // Each story is approximately 0.4 world units
  const storyHeight = 0.4;

  switch (style) {
    case 'commercial':
      // Commercial: taller towers (8-15 stories)
      width = 0.8 + random() * 0.8;
      depth = footprint === 'rectangular' ? width * (0.5 + random() * 0.5) : width;
      height = (8 + Math.floor(random() * 8)) * storyHeight;
      break;

    case 'residential':
      // Residential: medium height (4-10 stories)
      width = 0.6 + random() * 0.6;
      depth = footprint === 'rectangular' ? width * (0.6 + random() * 0.4) : width;
      height = (4 + Math.floor(random() * 7)) * storyHeight;
      break;

    case 'house':
    default:
      // Houses: small and low (2-4 stories)
      width = 0.4 + random() * 0.4;
      depth = footprint === 'rectangular' ? width * (0.7 + random() * 0.5) : width;
      height = (2 + Math.floor(random() * 3)) * storyHeight;
      break;
  }

  return { width, depth, height };
}

// Main city generation function
export function generateCityBuildings(
  config: MapConfig,
  terrainSize: number,
  heightScale: number,
  seed: number
): BuildingDefinition[] {
  const random = seededRandom(seed);
  const riverPath = generateRiverPath(terrainSize, config.seed);
  const roadSegments = generateRoadSegments(config, terrainSize);

  // Minimum distance between buildings (20m grid = 2 world units at 100 terrain size)
  // Adjust based on terrain size
  const gridSize = 2.0;
  const minDistance = gridSize * 0.8; // Slight overlap allowed

  // Create validation function
  const isValidPosition = (x: number, z: number) =>
    isCityBuildable(x, z, config, terrainSize, riverPath, roadSegments);

  // Generate building positions using Poisson Disk Sampling
  const positions = poissonDiskSampling(
    terrainSize,
    terrainSize,
    minDistance,
    30, // Max attempts per point
    random,
    isValidPosition
  );

  // Convert positions to building definitions
  const buildings: BuildingDefinition[] = [];

  for (const pos of positions) {
    const style = determineBuildingStyle(pos.x, pos.z, terrainSize, random);
    const footprint = determineFootprint(style, random);
    const dims = getBuildingDimensions(style, footprint, random);

    // Get proper ground placement
    const placement = getBuildingPlacement(
      pos.x,
      pos.z,
      Math.max(dims.width, dims.depth),
      heightScale,
      config,
      terrainSize
    );

    // Skip if terrain is too uneven
    if (!placement.isFlat) continue;

    buildings.push({
      x: pos.x,
      z: pos.z,
      y: placement.y,
      width: dims.width,
      depth: dims.depth,
      height: dims.height,
      rotation: random() * Math.PI * 2,
      style,
      footprint,
      colorIndex: Math.floor(random() * 5),
    });
  }

  return buildings;
}

// Building color palettes by style
export const BUILDING_COLORS = {
  commercial: [
    [0.6, 0.65, 0.75],   // Steel blue
    [0.5, 0.55, 0.6],    // Gray blue
    [0.7, 0.7, 0.75],    // Light gray
    [0.45, 0.5, 0.55],   // Dark gray
    [0.55, 0.6, 0.65],   // Medium gray
  ],
  residential: [
    [0.85, 0.8, 0.7],    // Cream
    [0.9, 0.85, 0.75],   // Light tan
    [0.75, 0.7, 0.6],    // Darker tan
    [0.8, 0.75, 0.65],   // Medium tan
    [0.88, 0.82, 0.72],  // Warm cream
  ],
  house: [
    [0.9, 0.88, 0.82],   // Off-white
    [0.85, 0.78, 0.68],  // Beige
    [0.7, 0.65, 0.55],   // Brown
    [0.92, 0.9, 0.85],   // Light cream
    [0.75, 0.72, 0.65],  // Taupe
  ],
};
