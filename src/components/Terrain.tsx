import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createNoise2D, fbm } from '../utils/noise';
import type { MapConfig } from '../types/MapConfig';
import { DEFAULT_MAP } from '../types/MapConfig';
import { generateRiverPath, getDistanceToRiver, getTerrainColor } from '../utils/terrainUtils';
import { isMountainZone, clearHeightCache } from '../utils/terrainHeight';

interface TerrainProps {
  size?: number;
  segments?: number;
  heightScale?: number;
  config?: MapConfig;
}

// Step function for sharp transitions between flat and mountain terrain
function stepFunction(value: number, threshold: number, sharpness: number = 8): number {
  const x = (value - threshold) * sharpness;
  return 1 / (1 + Math.exp(-x));
}

export function Terrain({
  size = 100,
  segments = 128,
  heightScale = 8,
  config = DEFAULT_MAP,
}: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    // Clear height cache when config changes
    clearHeightCache();

    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    const noise = createNoise2D(config.seed);

    // Generate river path based on config seed (global)
    const riverPoints = generateRiverPath(size, config.seed);

    // Process vertices
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Start with flat terrain at y=0 (plains)
      let height = 0;

      // Check distance to river
      const minRiverDist = getDistanceToRiver(x, y, riverPoints);
      const riverWidth = 2;

      // River carving - slight depression for river bed
      if (minRiverDist < riverWidth) {
        const riverFactor = 1 - minRiverDist / riverWidth;
        height -= riverFactor * 0.3;
      }

      // Mountain zones ONLY - step function for sharp transitions
      if (config.terrain.mountainFactor > 0) {
        const { inMountain, intensity } = isMountainZone(x, y, config);

        if (inMountain && intensity > 0.05) {
          // Mountain height using noise
          const mountainHeight = fbm(noise, x * 0.08, y * 0.08, 4, 2, 0.6);

          // Apply step-function intensity for sharp falloff at mountain edges
          // This ensures minimal transition area between flat plains and mountains
          const sharpIntensity = stepFunction(intensity, 0.3, 12);
          height += sharpIntensity * Math.max(0, mountainHeight) * 1.5;
        }
      }

      positions[i + 2] = height * heightScale;

      // Determine terrain color based on height and config
      const normalizedHeight = (height + 0.5) / 1.5; // Normalize for color mapping
      const [r, g, b] = getTerrainColor(normalizedHeight, minRiverDist, config);

      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return geo;
  }, [size, segments, heightScale, config]);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} metalness={0} flatShading={false} />
    </mesh>
  );
}
