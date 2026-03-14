import type { Road, RoadSystemSettings, RoadSurfaceType } from '../types/RoadConfig';

// Surface type colors
export const ROAD_SURFACE_COLORS: Record<RoadSurfaceType, string> = {
  asphalt: '#333333',    // Dark gray
  concrete: '#888888',   // Light gray
  dirt: '#6b5c4a',       // Brown
  gravel: '#8b7355',     // Light brown
};

// System settings
export const ROAD_SYSTEM_SETTINGS: RoadSystemSettings = {
  heightOffset: 0.15,
  curveResolution: 40,
  defaultWidth: 0.2,
  defaultSurfaceType: 'dirt',
};

// Road definitions - START SMALL WITH ONE ROAD
export const ROADS: Road[] = [
  // Single demo road connecting two points
  {
    id: 'demo-road',
    startPosition: { x: -45, z: -45 },
    waypoints: [
      { x: -40, z: -40 },
      { x: -31, z: -36 },
    ],
    width: 0.5,
    surfaceType: "concrete",
  },
];
