import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MapConfig } from '../types/MapConfig';
import { DEFAULT_MAP } from '../types/MapConfig';
import { generateRiverPath, getDistanceToRiver, getTerrainColor } from '../utils/terrainUtils';
import { clearHeightCache } from '../utils/terrainHeight';

interface TerrainProps {
  size?: number;
  segments?: number;
  heightScale?: number;
  config?: MapConfig;
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

    // Generate river path based on config seed (global)
    const riverPoints = generateRiverPath(size, config.seed);

    // Process vertices
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Flat terrain at y=0
      let height = 0;

      // Check distance to river
      const minRiverDist = getDistanceToRiver(x, y, riverPoints);
      const riverWidth = 2;

      // River carving - depression for river bed
      if (minRiverDist < riverWidth) {
        const riverFactor = 1 - minRiverDist / riverWidth;
        height -= riverFactor * 0.3;
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
