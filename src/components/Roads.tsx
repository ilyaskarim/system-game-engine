import { useMemo } from 'react';
import * as THREE from 'three';
import type { MapConfig } from '../types/MapConfig';
import { DEFAULT_MAP } from '../types/MapConfig';
import { generateRegions, getRegionCentroids } from '../utils/regionGenerator';
import { seededRandom } from '../utils/terrainUtils';
import { getTerrainHeightGlobal } from '../utils/terrainHeight';

interface RoadsProps {
  heightScale?: number;
  config?: MapConfig;
  terrainSize?: number;
}

// Generate settlement positions (same logic as Buildings.tsx)
function generateSettlementPositions(
  config: MapConfig,
  size: number
): { x: number; z: number }[] {
  const regions = generateRegions(config.regionCount, config.seed, size);
  const centroids = getRegionCentroids(regions);
  const random = seededRandom(config.seed + 5000);

  return centroids.map((centroid) => ({
    x: centroid.x + (random() - 0.5) * 10,
    z: centroid.y + (random() - 0.5) * 10,
  }));
}

// Generate road connections based on region count
// Uses specific connection patterns per map type
function generateRoadConnections(
  regionCount: number
): [number, number][] {
  // Define specific road connections per region count
  // Region indices are 0-based (Region 1 = index 0, Region 2 = index 1, etc.)
  switch (regionCount) {
    case 5:
      // Desert Mountains: 5 regions
      // 1-2, 2-3, 3-4, 4-5, 5-1
      return [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 0],
      ];

    case 7:
      // Fields: 7 regions
      // 1-2, 2-3, 4-5, 6-7, 7-1
      return [
        [0, 1],
        [1, 2],
        [3, 4],
        [5, 6],
        [6, 0],
      ];

    case 10:
      // Mountains & Fields: 10 regions
      // 1-2, 2-3, 3-4, 5-6, 6-7, 8-9, 9-10, 10-1
      return [
        [0, 1],
        [1, 2],
        [2, 3],
        [4, 5],
        [5, 6],
        [7, 8],
        [8, 9],
        [9, 0],
      ];

    case 12:
      // Desert: 12 regions
      // 1-2, 2-3, 3-4, 5-6, 6-7, 8-9, 9-10, 11-12, 12-1
      return [
        [0, 1],
        [1, 2],
        [2, 3],
        [4, 5],
        [5, 6],
        [7, 8],
        [8, 9],
        [10, 11],
        [11, 0],
      ];

    default:
      // Fallback: connect in a simple chain with loop back
      const connections: [number, number][] = [];
      for (let i = 0; i < regionCount - 1; i++) {
        connections.push([i, i + 1]);
      }
      if (regionCount > 2) {
        connections.push([regionCount - 1, 0]);
      }
      return connections;
  }
}

export function Roads({
  heightScale = 8,
  config = DEFAULT_MAP,
  terrainSize = 100,
}: RoadsProps) {
  const roadGeometries = useMemo(() => {
    const settlements = generateSettlementPositions(config, terrainSize);
    const roadConnections = generateRoadConnections(config.regionCount);
    const geometries: THREE.BufferGeometry[] = [];
    const random = seededRandom(config.seed + 8000);

    for (const [startIdx, endIdx] of roadConnections) {
      const start = settlements[startIdx];
      const end = settlements[endIdx];

      if (!start || !end) continue;

      // Calculate distance between settlements for scaling curve intensity
      const dist = Math.sqrt(
        (end.x - start.x) ** 2 + (end.z - start.z) ** 2
      );
      const curveIntensity = dist * 0.15; // Scale curves based on road length

      // Create natural curved path using CatmullRomCurve3 with multiple waypoints
      const waypoints: THREE.Vector3[] = [];
      waypoints.push(new THREE.Vector3(start.x, 0, start.z));

      // Add 3 intermediate waypoints with perpendicular offsets for natural curves
      const numWaypoints = 3;
      for (let w = 1; w <= numWaypoints; w++) {
        const t = w / (numWaypoints + 1);
        const baseX = start.x + (end.x - start.x) * t;
        const baseZ = start.z + (end.z - start.z) * t;

        // Calculate perpendicular direction for offset
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        const perpX = -dz / dist;
        const perpZ = dx / dist;

        // Alternating sine-wave-like offset for natural S-curves
        const offsetAmount = Math.sin(t * Math.PI) * curveIntensity * (random() - 0.3);
        const wanderX = baseX + perpX * offsetAmount + (random() - 0.5) * 3;
        const wanderZ = baseZ + perpZ * offsetAmount + (random() - 0.5) * 3;

        waypoints.push(new THREE.Vector3(wanderX, 0, wanderZ));
      }

      waypoints.push(new THREE.Vector3(end.x, 0, end.z));

      // Use CatmullRomCurve3 for smooth interpolation through waypoints
      const curve = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.5);

      // Sample points along curve
      const points = curve.getPoints(40);

      // Create road vertices with width (thin road)
      const roadWidth = 0.2;
      const vertices: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        // Use global terrain height for consistency across all components
        const height =
          getTerrainHeightGlobal(point.x, point.z, heightScale, config, terrainSize) +
          0.15;

        // Get direction
        let dir: THREE.Vector3;
        if (i < points.length - 1) {
          dir = new THREE.Vector3()
            .subVectors(points[i + 1], point)
            .normalize();
        } else {
          dir = new THREE.Vector3()
            .subVectors(point, points[i - 1])
            .normalize();
        }

        // Perpendicular direction for road width
        const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(
          roadWidth / 2
        );

        // Add left and right vertices
        vertices.push(
          point.x - perp.x,
          height,
          point.z - perp.z,
          point.x + perp.x,
          height,
          point.z + perp.z
        );

        // Create triangles
        if (i < points.length - 1) {
          const baseIdx = i * 2;
          indices.push(
            baseIdx,
            baseIdx + 1,
            baseIdx + 2,
            baseIdx + 1,
            baseIdx + 3,
            baseIdx + 2
          );
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      geometries.push(geometry);
    }

    return geometries;
  }, [heightScale, config, terrainSize]);

  return (
    <group>
      {roadGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} receiveShadow>
          <meshStandardMaterial color="#6b5c4a" roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
