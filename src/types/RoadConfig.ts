// Waypoint along a road path
export interface RoadWaypoint {
  x: number;      // X position on map (-50 to 50)
  z: number;      // Z position on map (-50 to 50)
}

// Road surface types with different colors
export type RoadSurfaceType = 'asphalt' | 'concrete' | 'dirt' | 'gravel';

// Road definition - fully configurable
export interface Road {
  id: string;

  // Starting point of the road
  startPosition: {
    x: number;
    z: number;
  };

  // Path waypoints - road follows these points in order
  // The road goes: startPosition -> waypoints[0] -> waypoints[1] -> ... -> last waypoint
  waypoints: RoadWaypoint[];

  // Visual properties
  width?: number;              // Road width (default 0.2)
  surfaceType?: RoadSurfaceType;  // Surface type (default 'dirt')
  color?: string;              // Override color (hex string)

  // Optional
  enabled?: boolean;           // Toggle visibility (default true)
}

// System settings
export interface RoadSystemSettings {
  heightOffset: number;        // Height above terrain (default 0.15)
  curveResolution: number;     // Points per road segment (default 40)
  defaultWidth: number;        // Default road width
  defaultSurfaceType: RoadSurfaceType;
}
