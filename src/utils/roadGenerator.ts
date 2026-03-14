import * as THREE from 'three';
import type { Road, RoadSystemSettings } from '../types/RoadConfig';
import type { MapConfig } from '../types/MapConfig';
import { ROAD_SURFACE_COLORS, ROAD_SYSTEM_SETTINGS } from '../config/roads';
import { getTerrainHeightGlobal } from './terrainHeight';

// Build path from road config
export function buildRoadPath(
  road: Road,
  heightScale: number,
  config: MapConfig,
  terrainSize: number,
  settings: RoadSystemSettings = ROAD_SYSTEM_SETTINGS
): THREE.Vector3[] {
  // Create waypoints array starting with startPosition
  const waypoints: THREE.Vector3[] = [];
  waypoints.push(new THREE.Vector3(road.startPosition.x, 0, road.startPosition.z));

  // Add all waypoints
  for (const wp of road.waypoints) {
    waypoints.push(new THREE.Vector3(wp.x, 0, wp.z));
  }

  // Use CatmullRomCurve3 for smooth interpolation through waypoints
  const curve = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.5);

  // Sample points along curve
  const points = curve.getPoints(settings.curveResolution);

  // Set terrain height for each point
  for (const point of points) {
    const height = getTerrainHeightGlobal(
      point.x,
      point.z,
      heightScale,
      config,
      terrainSize
    ) + settings.heightOffset;
    point.y = height;
  }

  return points;
}

// Build geometry from path
export function buildRoadGeometry(
  path: THREE.Vector3[],
  width: number
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < path.length; i++) {
    const point = path[i];

    // Get direction
    let dir: THREE.Vector3;
    if (i < path.length - 1) {
      dir = new THREE.Vector3()
        .subVectors(path[i + 1], point)
        .normalize();
    } else {
      dir = new THREE.Vector3()
        .subVectors(point, path[i - 1])
        .normalize();
    }

    // Perpendicular direction for road width
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);

    // Add left and right vertices
    vertices.push(
      point.x - perp.x,
      point.y,
      point.z - perp.z,
      point.x + perp.x,
      point.y,
      point.z + perp.z
    );

    // Create triangles
    if (i < path.length - 1) {
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

  return geometry;
}

// Get road color based on surface type or custom color
export function getRoadColor(road: Road): string {
  // Use custom color if provided
  if (road.color) {
    return road.color;
  }

  // Use surface type color
  const surfaceType = road.surfaceType ?? ROAD_SYSTEM_SETTINGS.defaultSurfaceType;
  return ROAD_SURFACE_COLORS[surfaceType];
}
