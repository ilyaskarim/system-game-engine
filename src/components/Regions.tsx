import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { MapConfig } from '../types/MapConfig';
import { DEFAULT_MAP } from '../types/MapConfig';
import { generateRegions } from '../utils/regionGenerator';
import { getTerrainHeightGlobal } from '../utils/terrainHeight';

export interface Region {
  id: string;
  name: string;
  points: [number, number][]; // [x, z] coordinates
  color: string;
  status: 'friendly' | 'hostile' | 'neutral' | 'contested';
}

// Get status color with opacity
function getOverlayColor(status: Region['status']) {
  switch (status) {
    case 'friendly':
      return '#22c55e';
    case 'hostile':
      return '#ef4444';
    case 'contested':
      return '#eab308';
    default:
      return '#6b7280';
  }
}

// Create a unique key for an edge segment (order-independent)
function makeEdgeKey(x1: number, z1: number, x2: number, z2: number): string {
  // Round to avoid floating point issues
  const p1 = `${x1.toFixed(2)},${z1.toFixed(2)}`;
  const p2 = `${x2.toFixed(2)},${z2.toFixed(2)}`;
  // Sort to ensure same key regardless of direction
  return p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
}

// Region fill overlay (without border) - uses polygon offset to prevent Z-fighting
function RegionFill({ region, index }: { region: Region; index: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    region.points.forEach((point, idx) => {
      if (idx === 0) {
        s.moveTo(point[0], point[1]);
      } else {
        s.lineTo(point[0], point[1]);
      }
    });
    s.closePath();
    return s;
  }, [region]);

  // Stagger heights slightly to prevent Z-fighting between overlapping regions
  const heightOffset = 0.1 + index * 0.001;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, heightOffset, 0]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial
        color={getOverlayColor(region.status)}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset={true}
        polygonOffsetFactor={1}
        polygonOffsetUnits={index}
      />
    </mesh>
  );
}

// Generate unique border segments from all regions
function generateUniqueBorderSegments(
  regions: Region[],
  heightScale: number,
  config: MapConfig,
  size: number = 100
): THREE.Vector3[][] {
  const edgeSet = new Set<string>();
  const segments: { start: [number, number]; end: [number, number] }[] = [];

  // Collect all unique edge segments
  for (const region of regions) {
    for (let i = 0; i < region.points.length; i++) {
      const start = region.points[i];
      const end = region.points[(i + 1) % region.points.length];
      const key = makeEdgeKey(start[0], start[1], end[0], end[1]);

      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        segments.push({ start, end });
      }
    }
  }

  // Convert segments to 3D points following terrain
  // Use consistent height above terrain to prevent Z-fighting with region fills
  const heightOffset = 0.3;
  const result: THREE.Vector3[][] = [];

  for (const segment of segments) {
    const points: THREE.Vector3[] = [];
    const steps = 5;

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = segment.start[0] + (segment.end[0] - segment.start[0]) * t;
      const z = segment.start[1] + (segment.end[1] - segment.start[1]) * t;
      // Use global terrain height for consistency
      const y = getTerrainHeightGlobal(x, z, heightScale, config, size) + heightOffset;
      points.push(new THREE.Vector3(x, y, z));
    }

    result.push(points);
  }

  return result;
}

// Single border segment line
function BorderSegment({ points }: { points: THREE.Vector3[] }) {
  return (
    <Line
      points={points}
      color="#16a34a"
      lineWidth={2}
      transparent
      opacity={0.9}
    />
  );
}

interface RegionsProps {
  heightScale?: number;
  config?: MapConfig;
  size?: number;
}

export function Regions({
  heightScale = 8,
  config = DEFAULT_MAP,
  size = 100,
}: RegionsProps) {
  // Generate regions based on config
  const regions = useMemo(() => {
    return generateRegions(config.regionCount, config.seed, size);
  }, [config.regionCount, config.seed, size]);

  // Generate unique border segments (no duplicates where regions meet)
  const borderSegments = useMemo(() => {
    return generateUniqueBorderSegments(regions, heightScale, config, size);
  }, [regions, heightScale, config, size]);

  return (
    <group>
      {/* Region fills */}
      {regions.map((region, index) => (
        <RegionFill key={region.id} region={region} index={index} />
      ))}

      {/* Unique border segments (drawn once per edge) */}
      {borderSegments.map((points, index) => (
        <BorderSegment key={`border-${index}`} points={points} />
      ))}
    </group>
  );
}

export { generateRegions };
