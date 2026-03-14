export interface TerrainParams {
  desertFactor: number;     // 0-1: controls tan/orange coloring
  mountainFactor: number;   // 0-1: controls height amplification
  vegetationFactor: number; // 0-1: controls green coloring
}

export interface TerrainColors {
  water: [number, number, number];
  lowland: [number, number, number];
  midland: [number, number, number];
  highland: [number, number, number];
  mountain: [number, number, number];
}

export interface MapConfig {
  id: string;
  name: string;
  regionCount: number;
  seed: number;
  terrain: TerrainParams;
  colors: TerrainColors;
}

// Fields: 7 regions, lush green terrain, 1 river
export const FIELDS_MAP: MapConfig = {
  id: 'fields',
  name: 'Fields',
  regionCount: 7,
  seed: 44444,
  terrain: {
    desertFactor: 0.0,
    mountainFactor: 0.0,
    vegetationFactor: 1.0,
  },
  colors: {
    water: [0.2, 0.5, 0.7],
    lowland: [0.3, 0.55, 0.2],       // Rich dark green
    midland: [0.4, 0.6, 0.25],       // Medium green
    highland: [0.45, 0.55, 0.3],     // Light green
    mountain: [0.5, 0.5, 0.35],      // Grass-covered hills
  },
};

export const MAP_PRESETS: MapConfig[] = [
  FIELDS_MAP,
];

export const DEFAULT_MAP = FIELDS_MAP;
