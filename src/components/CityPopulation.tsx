import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MapConfig } from '../types/MapConfig';
import { DEFAULT_MAP } from '../types/MapConfig';
import {
  generateCityBuildings,
  BUILDING_COLORS,
  type BuildingDefinition,
} from '../utils/cityGenerator';

interface CityPopulationProps {
  terrainSize?: number;
  heightScale?: number;
  config?: MapConfig;
  randomizeSeed?: boolean;
}

// Generate unique seed for each render when randomizeSeed is true
function generateRenderSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

// Create transformation matrices for a building
function createBuildingMatrices(
  building: BuildingDefinition,
  matrices: THREE.Matrix4[],
  colors: number[]
): void {
  const colorPalette = BUILDING_COLORS[building.style];
  const color = colorPalette[building.colorIndex % colorPalette.length];

  if (building.footprint === 'lShaped') {
    // L-shaped buildings are created with two boxes
    const mainWidth = building.width * 0.7;
    const mainDepth = building.depth;
    const wingWidth = building.width;
    const wingDepth = building.depth * 0.5;
    const wingHeight = building.height * 0.7;

    // Main section
    const mainMatrix = new THREE.Matrix4();
    mainMatrix.compose(
      new THREE.Vector3(
        building.x,
        building.y + building.height * 0.5,
        building.z
      ),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, building.rotation, 0)
      ),
      new THREE.Vector3(mainWidth, building.height, mainDepth)
    );
    matrices.push(mainMatrix);
    colors.push(color[0], color[1], color[2]);

    // Wing section (offset to form L shape)
    const wingOffsetX = Math.cos(building.rotation) * mainWidth * 0.5;
    const wingOffsetZ = Math.sin(building.rotation) * mainWidth * 0.5;
    const wingMatrix = new THREE.Matrix4();
    wingMatrix.compose(
      new THREE.Vector3(
        building.x + wingOffsetX,
        building.y + wingHeight * 0.5,
        building.z + wingOffsetZ + wingDepth * 0.3
      ),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, building.rotation, 0)
      ),
      new THREE.Vector3(wingWidth, wingHeight, wingDepth)
    );
    matrices.push(wingMatrix);
    colors.push(color[0] * 0.95, color[1] * 0.95, color[2] * 0.95); // Slightly darker
  } else {
    // Square and rectangular buildings are single boxes
    const matrix = new THREE.Matrix4();
    matrix.compose(
      new THREE.Vector3(
        building.x,
        building.y + building.height * 0.5,
        building.z
      ),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, building.rotation, 0)
      ),
      new THREE.Vector3(building.width, building.height, building.depth)
    );
    matrices.push(matrix);
    colors.push(color[0], color[1], color[2]);
  }
}

export function CityPopulation({
  terrainSize = 100,
  heightScale = 8,
  config = DEFAULT_MAP,
  randomizeSeed = true,
}: CityPopulationProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Generate render seed - changes each time component mounts
  // When randomizeSeed is false, use config.seed for deterministic generation
  const renderSeed = useMemo(() => {
    return randomizeSeed ? generateRenderSeed() : config.seed;
  }, [randomizeSeed, config.seed]);

  const { matrices, colors, count, buildings } = useMemo(() => {
    // Generate city buildings using Poisson Disk Sampling
    const cityBuildings = generateCityBuildings(
      config,
      terrainSize,
      heightScale,
      renderSeed
    );

    const matrices: THREE.Matrix4[] = [];
    const colorData: number[] = [];

    // Create matrices for all buildings
    for (const building of cityBuildings) {
      createBuildingMatrices(building, matrices, colorData);
    }

    return {
      matrices,
      colors: colorData,
      count: matrices.length,
      buildings: cityBuildings,
    };
  }, [terrainSize, heightScale, config, renderSeed]);

  // Apply instance matrices and colors
  useMemo(() => {
    if (meshRef.current && count > 0) {
      const mesh = meshRef.current;

      // Set matrices
      matrices.forEach((matrix, i) => {
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;

      // Set colors
      const colorAttribute = new THREE.InstancedBufferAttribute(
        new Float32Array(colors),
        3
      );
      mesh.instanceColor = colorAttribute;
    }
  }, [matrices, colors, count]);

  // Log building statistics for debugging
  useMemo(() => {
    if (buildings.length > 0) {
      const stats = {
        total: buildings.length,
        commercial: buildings.filter((b) => b.style === 'commercial').length,
        residential: buildings.filter((b) => b.style === 'residential').length,
        house: buildings.filter((b) => b.style === 'house').length,
        lShaped: buildings.filter((b) => b.footprint === 'lShaped').length,
      };
      console.log(`City generated: ${stats.total} buildings`, stats);
    }
  }, [buildings]);

  if (count === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} metalness={0.1} />
    </instancedMesh>
  );
}
