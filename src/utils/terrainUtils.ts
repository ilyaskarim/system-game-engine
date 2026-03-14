import { createNoise2D, fbm } from './noise';
import type { MapConfig } from '../types/MapConfig';

export interface RiverPoint {
  x: number;
  y: number;
}

// Generate river path based on map size and seed
export function generateRiverPath(size: number, seed: number): RiverPoint[] {
  const riverPoints: RiverPoint[] = [];
  const random = seededRandom(seed);

  // Add some randomization to river path based on seed
  const amplitude = size * 0.2 + random() * size * 0.1;
  const offset = (random() - 0.5) * size * 0.2;

  // Use smaller step for smoother river with narrow width
  for (let t = 0; t <= 1; t += 0.004) {
    const x = (t - 0.5) * size;
    const y = Math.sin(t * Math.PI * 2) * amplitude + (t - 0.5) * size * 0.3 + offset;
    riverPoints.push({ x, y });
  }

  return riverPoints;
}

// Seeded random number generator
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

// Check if position is in water (river)
export function isInWater(x: number, z: number, riverPath: RiverPoint[], riverWidth: number = 2): boolean {
  let minRiverDist = Infinity;
  for (const point of riverPath) {
    const dist = Math.sqrt((x - point.x) ** 2 + (z - point.y) ** 2);
    minRiverDist = Math.min(minRiverDist, dist);
  }
  return minRiverDist < riverWidth;
}

// Get minimum distance to river
export function getDistanceToRiver(x: number, z: number, riverPath: RiverPoint[]): number {
  let minRiverDist = Infinity;
  for (const point of riverPath) {
    const dist = Math.sqrt((x - point.x) ** 2 + (z - point.y) ** 2);
    minRiverDist = Math.min(minRiverDist, dist);
  }
  return minRiverDist;
}

// Get terrain height at a given position with map config
export function getTerrainHeight(
  x: number,
  z: number,
  heightScale: number,
  config: MapConfig,
  riverPath: RiverPoint[]
): number {
  const noise = createNoise2D(config.seed);
  const noise2 = createNoise2D(config.seed + 1000);

  // Generate base height using FBM noise
  let height = fbm(noise, x * 0.02, z * 0.02, 5, 2, 0.5);

  // Add some variation
  height += fbm(noise2, x * 0.05, z * 0.05, 3, 2, 0.3) * 0.3;

  // River valley carving
  const minRiverDist = getDistanceToRiver(x, z, riverPath);
  const riverWidth = 2;
  if (minRiverDist < riverWidth) {
    const riverFactor = 1 - minRiverDist / riverWidth;
    height -= riverFactor * 0.5;
  }

  // Mountain regions based on config
  if (config.terrain.mountainFactor > 0) {
    // Create mountain distribution based on seed
    const mountainNoise = createNoise2D(config.seed + 2000);
    const mountainArea = fbm(mountainNoise, x * 0.03, z * 0.03, 3, 2, 0.5);

    // Mountains appear in areas where noise exceeds threshold
    const mountainThreshold = 1 - config.terrain.mountainFactor;
    if (mountainArea > mountainThreshold) {
      const localMountainFactor = (mountainArea - mountainThreshold) / config.terrain.mountainFactor;
      height += localMountainFactor * fbm(noise, x * 0.1, z * 0.1, 4, 2, 0.6) * 1.5;
    }
  }

  return height * heightScale;
}

// Get terrain color based on height and config
export function getTerrainColor(
  normalizedHeight: number,
  minRiverDist: number,
  config: MapConfig
): [number, number, number] {
  const riverWidth = 2;
  const colors = config.colors;

  // Random variation
  const variation = () => (Math.random() - 0.5) * 0.05;

  if (minRiverDist < riverWidth * 0.5) {
    // River - blue water
    return colors.water;
  } else if (normalizedHeight < 0.35) {
    // Low areas
    return [
      colors.lowland[0] + variation(),
      colors.lowland[1] + variation(),
      colors.lowland[2] + variation(),
    ];
  } else if (normalizedHeight < 0.5) {
    // Mid areas
    return [
      colors.midland[0] + variation(),
      colors.midland[1] + variation(),
      colors.midland[2] + variation(),
    ];
  } else if (normalizedHeight < 0.7) {
    // Higher areas
    return [
      colors.highland[0] + variation(),
      colors.highland[1] + variation(),
      colors.highland[2] + variation(),
    ];
  } else {
    // Mountain
    return [
      colors.mountain[0] + variation(),
      colors.mountain[1] + variation(),
      colors.mountain[2] + variation(),
    ];
  }
}
