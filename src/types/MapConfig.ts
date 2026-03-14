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

// Desert: 12 states, sandy tan/orange palette, 1 river
export const DESERT_MAP: MapConfig = {
  id: 'desert',
  name: 'Desert',
  regionCount: 12,
  seed: 11111,
  terrain: {
    desertFactor: 1.0,
    mountainFactor: 0.1,
    vegetationFactor: 0.0,
  },
  colors: {
    water: [0.2, 0.5, 0.7],
    lowland: [0.85, 0.75, 0.55],     // Sandy tan
    midland: [0.9, 0.78, 0.5],       // Light orange-tan
    highland: [0.82, 0.65, 0.45],    // Darker tan
    mountain: [0.7, 0.55, 0.4],      // Brown-orange
  },
};

// Mountains & Fields: ~10 states, 25% mountains, 75% green fields, 1 river
export const MOUNTAINS_FIELDS_MAP: MapConfig = {
  id: 'mountains-fields',
  name: 'Mountains & Fields',
  regionCount: 10,
  seed: 22222,
  terrain: {
    desertFactor: 0.0,
    mountainFactor: 0.8,
    vegetationFactor: 0.75,
  },
  colors: {
    water: [0.2, 0.5, 0.7],
    lowland: [0.35, 0.55, 0.25],     // Dark green (fertile)
    midland: [0.45, 0.6, 0.3],       // Medium green
    highland: [0.55, 0.5, 0.35],     // Tan-green transition
    mountain: [0.5, 0.45, 0.4],      // Rocky gray-brown
  },
};

// Desert Mountains: 5 states, 70% desert, 30% mountains, 1 river
export const DESERT_MOUNTAINS_MAP: MapConfig = {
  id: 'desert-mountains',
  name: 'Desert Mountains',
  regionCount: 5,
  seed: 33333,
  terrain: {
    desertFactor: 0.7,
    mountainFactor: 0.6,
    vegetationFactor: 0.0,
  },
  colors: {
    water: [0.2, 0.5, 0.7],
    lowland: [0.88, 0.78, 0.58],     // Sandy desert
    midland: [0.8, 0.7, 0.5],        // Desert tan
    highland: [0.65, 0.55, 0.45],    // Rocky tan
    mountain: [0.55, 0.45, 0.38],    // Dark mountain
  },
};

// Fields: 7 states, lush green terrain, 1 river
export const FIELDS_MAP: MapConfig = {
  id: 'fields',
  name: 'Fields',
  regionCount: 7,
  seed: 44444,
  terrain: {
    desertFactor: 0.0,
    mountainFactor: 0.15,
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
  DESERT_MAP,
  MOUNTAINS_FIELDS_MAP,
  DESERT_MOUNTAINS_MAP,
  FIELDS_MAP,
];

export const DEFAULT_MAP = MOUNTAINS_FIELDS_MAP;
