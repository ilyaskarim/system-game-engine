import { useMemo } from 'react';
import * as THREE from 'three';
import type { MapConfig } from '../types/MapConfig';
import { DEFAULT_MAP } from '../types/MapConfig';
import { ROADS, ROAD_SYSTEM_SETTINGS } from '../config/roads';
import { buildRoadPath, buildRoadGeometry, getRoadColor } from '../utils/roadGenerator';

interface RoadsProps {
  heightScale?: number;
  config?: MapConfig;
  terrainSize?: number;
}

interface RoadRenderData {
  geometry: THREE.BufferGeometry;
  color: string;
  id: string;
}

export function Roads({
  heightScale = 8,
  config = DEFAULT_MAP,
  terrainSize = 100,
}: RoadsProps) {
  const roadRenderData = useMemo(() => {
    const renderData: RoadRenderData[] = [];

    for (const road of ROADS) {
      // Skip disabled roads
      if (road.enabled === false) {
        continue;
      }

      // Build path from config
      const path = buildRoadPath(
        road,
        heightScale,
        config,
        terrainSize,
        ROAD_SYSTEM_SETTINGS
      );

      // Build geometry
      const width = road.width ?? ROAD_SYSTEM_SETTINGS.defaultWidth;
      const geometry = buildRoadGeometry(path, width);

      // Get color
      const color = getRoadColor(road);

      renderData.push({
        geometry,
        color,
        id: road.id,
      });
    }

    return renderData;
  }, [heightScale, config, terrainSize]);

  return (
    <group>
      {roadRenderData.map((data) => (
        <mesh key={data.id} geometry={data.geometry} receiveShadow>
          <meshStandardMaterial color={data.color} roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
