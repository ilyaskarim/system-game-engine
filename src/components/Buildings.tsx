import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MapConfig } from '../types/MapConfig';
import { DEFAULT_MAP } from '../types/MapConfig';
import { generateRegions, getRegionCentroids } from '../utils/regionGenerator';
import {
  generateRiverPath,
  isInWater,
  seededRandom,
} from '../utils/terrainUtils';
import {
  getBuildingPlacement,
  isBuildableTerrain,
} from '../utils/terrainHeight';

interface Settlement {
  x: number;
  z: number;
  buildingCount: number;
  spread: number;
}

interface BuildingsProps {
  terrainSize?: number;
  heightScale?: number;
  config?: MapConfig;
}

// Generate settlements near region centroids - only in buildable areas
function generateSettlements(config: MapConfig, size: number): Settlement[] {
  const regions = generateRegions(config.regionCount, config.seed, size);
  const centroids = getRegionCentroids(regions);
  const random = seededRandom(config.seed + 5000);

  const settlements: Settlement[] = [];

  for (const centroid of centroids) {
    // Find a buildable location near the centroid
    let bestX = centroid.x;
    let bestZ = centroid.y;
    let found = false;

    // Search for buildable terrain near centroid
    for (let attempt = 0; attempt < 10 && !found; attempt++) {
      const offsetX = (random() - 0.5) * 15;
      const offsetZ = (random() - 0.5) * 15;
      const testX = centroid.x + offsetX;
      const testZ = centroid.y + offsetZ;

      if (isBuildableTerrain(testX, testZ, config, size)) {
        bestX = testX;
        bestZ = testZ;
        found = true;
      }
    }

    // Vary settlement size based on seed
    const buildingCount = Math.floor(6 + random() * 15);
    const spread = 3 + random() * 4;

    settlements.push({
      x: bestX,
      z: bestZ,
      buildingCount,
      spread,
    });
  }

  return settlements;
}

export function Buildings({
  terrainSize = 100,
  heightScale = 8,
  config = DEFAULT_MAP,
}: BuildingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { matrices, colors, count } = useMemo(() => {
    // Generate settlements based on region centroids
    const settlements = generateSettlements(config, terrainSize);
    const riverPath = generateRiverPath(terrainSize, config.seed);

    const matrices: THREE.Matrix4[] = [];
    const colorData: number[] = [];

    // Building colors (village style)
    const buildingColors = [
      new THREE.Color(0.85, 0.8, 0.7), // Cream/tan
      new THREE.Color(0.9, 0.85, 0.75), // Light tan
      new THREE.Color(0.75, 0.7, 0.6), // Darker tan
      new THREE.Color(0.8, 0.75, 0.65), // Medium tan
      new THREE.Color(0.7, 0.65, 0.55), // Brown-ish
    ];

    const random = seededRandom(config.seed + 7000);

    for (const settlement of settlements) {
      for (let i = 0; i < settlement.buildingCount; i++) {
        // Random position within settlement
        const angle = random() * Math.PI * 2;
        const distance = random() * settlement.spread;
        const x = settlement.x + Math.cos(angle) * distance;
        const z = settlement.z + Math.sin(angle) * distance;

        // Skip if in water or too close to edge
        if (isInWater(x, z, riverPath)) continue;
        if (
          Math.abs(x) > terrainSize * 0.45 ||
          Math.abs(z) > terrainSize * 0.45
        )
          continue;

        // Skip if not in buildable terrain
        if (!isBuildableTerrain(x, z, config, terrainSize)) continue;

        // Random building size
        const scaleX = 0.4 + random() * 0.4;
        const scaleY = 0.5 + random() * 0.8;
        const scaleZ = 0.4 + random() * 0.4;

        // Get building placement with snap-to-mesh
        // Uses the minimum height of the footprint corners so building sits on ground
        const footprintSize = Math.max(scaleX, scaleZ);
        const placement = getBuildingPlacement(
          x,
          z,
          footprintSize,
          heightScale,
          config,
          terrainSize
        );

        // Only place building if terrain is relatively flat
        // Or use the foundation flattening logic
        const groundY = placement.y;

        // Create transformation matrix
        // Building base at ground level, so center is at groundY + halfHeight
        const matrix = new THREE.Matrix4();
        matrix.compose(
          new THREE.Vector3(x, groundY + scaleY * 0.5, z),
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, random() * Math.PI * 2, 0)
          ),
          new THREE.Vector3(scaleX, scaleY, scaleZ)
        );

        matrices.push(matrix);

        // Random color
        const color =
          buildingColors[Math.floor(random() * buildingColors.length)];
        colorData.push(color.r, color.g, color.b);
      }
    }

    return { matrices, colors: colorData, count: matrices.length };
  }, [terrainSize, heightScale, config]);

  // Apply instance matrices and colors
  useMemo(() => {
    if (meshRef.current) {
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
  }, [matrices, colors]);

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
