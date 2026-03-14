import type { Region } from '../components/Regions';
import { seededRandom } from './terrainUtils';

interface Point {
  x: number;
  y: number;
}

interface Edge {
  start: Point;
  end: Point;
  cells: [number, number]; // indices of the two cells this edge separates
}

// Generate seed points using grid + jitter (deterministic via seed)
function generateSeedPoints(
  count: number,
  size: number,
  seed: number,
  margin: number = 5
): Point[] {
  const random = seededRandom(seed);
  const points: Point[] = [];

  // Calculate grid dimensions
  const gridSize = Math.ceil(Math.sqrt(count));
  const cellSize = (size - margin * 2) / gridSize;

  let generated = 0;
  for (let row = 0; row < gridSize && generated < count; row++) {
    for (let col = 0; col < gridSize && generated < count; col++) {
      // Base position at cell center
      const baseX = margin + cellSize * (col + 0.5) - size / 2;
      const baseY = margin + cellSize * (row + 0.5) - size / 2;

      // Add jitter
      const jitterX = (random() - 0.5) * cellSize * 0.6;
      const jitterY = (random() - 0.5) * cellSize * 0.6;

      points.push({
        x: baseX + jitterX,
        y: baseY + jitterY,
      });

      generated++;
    }
  }

  return points;
}

// Find the nearest seed point for a given position (brute-force Voronoi)
function findNearestSeed(x: number, y: number, seeds: Point[]): number {
  let minDist = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < seeds.length; i++) {
    const dist = (x - seeds[i].x) ** 2 + (y - seeds[i].y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return nearestIdx;
}

// Compute centroid of a set of points
function computeCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }

  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

// Lloyd relaxation - move seeds to centroids of their Voronoi cells
function lloydRelaxation(
  seeds: Point[],
  size: number,
  resolution: number = 20
): Point[] {
  const halfSize = size / 2;
  const step = size / resolution;

  // Group sample points by nearest seed
  const cellPoints: Point[][] = seeds.map(() => []);

  for (let x = -halfSize; x <= halfSize; x += step) {
    for (let y = -halfSize; y <= halfSize; y += step) {
      const nearestIdx = findNearestSeed(x, y, seeds);
      cellPoints[nearestIdx].push({ x, y });
    }
  }

  // Move seeds to centroids
  return seeds.map((seed, i) => {
    if (cellPoints[i].length > 0) {
      return computeCentroid(cellPoints[i]);
    }
    return seed;
  });
}

// Snap point to grid to ensure consistency
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// Generate Voronoi edges and vertices using grid-based edge detection
// This ensures shared edges between adjacent cells have identical coordinates
function generateVoronoiStructure(
  seeds: Point[],
  size: number,
  resolution: number = 100
): { edges: Edge[]; cellEdges: Map<number, Edge[]> } {
  const halfSize = size / 2;
  const step = size / resolution;
  const snapGrid = step / 2;

  // Create a grid to identify cell ownership
  const grid: number[][] = [];

  for (let yi = 0; yi <= resolution; yi++) {
    grid[yi] = [];
    for (let xi = 0; xi <= resolution; xi++) {
      const x = -halfSize + xi * step;
      const y = -halfSize + yi * step;
      grid[yi][xi] = findNearestSeed(x, y, seeds);
    }
  }

  // Find edges by detecting cell boundaries
  const edgeMap = new Map<string, Edge>();
  const cellEdges = new Map<number, Edge[]>();

  // Initialize cellEdges for all seeds
  for (let i = 0; i < seeds.length; i++) {
    cellEdges.set(i, []);
  }

  // Scan horizontally for vertical edges
  for (let yi = 0; yi <= resolution; yi++) {
    for (let xi = 0; xi < resolution; xi++) {
      const cell1 = grid[yi][xi];
      const cell2 = grid[yi][xi + 1];

      if (cell1 !== cell2) {
        // Edge between cell1 and cell2
        const x = -halfSize + (xi + 1) * step;

        // Find the extent of this edge segment
        let startY = yi;
        while (startY > 0 && grid[startY - 1][xi] === cell1 && grid[startY - 1][xi + 1] === cell2) {
          startY--;
        }

        // Create edge key for deduplication
        const edgeStart: Point = {
          x: snapToGrid(x, snapGrid),
          y: snapToGrid(-halfSize + startY * step, snapGrid)
        };
        const edgeEnd: Point = {
          x: snapToGrid(x, snapGrid),
          y: snapToGrid(-halfSize + (yi + 1) * step, snapGrid)
        };

        const key = `${edgeStart.x.toFixed(4)},${edgeStart.y.toFixed(4)}|${edgeEnd.x.toFixed(4)},${edgeEnd.y.toFixed(4)}`;

        if (!edgeMap.has(key)) {
          const edge: Edge = {
            start: edgeStart,
            end: edgeEnd,
            cells: [Math.min(cell1, cell2), Math.max(cell1, cell2)]
          };
          edgeMap.set(key, edge);
          cellEdges.get(cell1)!.push(edge);
          cellEdges.get(cell2)!.push(edge);
        }
      }
    }
  }

  // Scan vertically for horizontal edges
  for (let yi = 0; yi < resolution; yi++) {
    for (let xi = 0; xi <= resolution; xi++) {
      const cell1 = grid[yi][xi];
      const cell2 = grid[yi + 1][xi];

      if (cell1 !== cell2) {
        const y = -halfSize + (yi + 1) * step;

        // Find the extent of this edge segment
        let startX = xi;
        while (startX > 0 && grid[yi][startX - 1] === cell1 && grid[yi + 1][startX - 1] === cell2) {
          startX--;
        }

        const edgeStart: Point = {
          x: snapToGrid(-halfSize + startX * step, snapGrid),
          y: snapToGrid(y, snapGrid)
        };
        const edgeEnd: Point = {
          x: snapToGrid(-halfSize + (xi + 1) * step, snapGrid),
          y: snapToGrid(y, snapGrid)
        };

        const key = `${edgeStart.x.toFixed(4)},${edgeStart.y.toFixed(4)}|${edgeEnd.x.toFixed(4)},${edgeEnd.y.toFixed(4)}`;

        if (!edgeMap.has(key)) {
          const edge: Edge = {
            start: edgeStart,
            end: edgeEnd,
            cells: [Math.min(cell1, cell2), Math.max(cell1, cell2)]
          };
          edgeMap.set(key, edge);
          cellEdges.get(cell1)!.push(edge);
          cellEdges.get(cell2)!.push(edge);
        }
      }
    }
  }

  return { edges: Array.from(edgeMap.values()), cellEdges };
}

// Build cell boundary from edges - ordered polygon vertices
function buildCellBoundary(
  cellEdges: Edge[]
): Point[] {
  if (cellEdges.length === 0) return [];

  // Collect all unique vertices from edges
  const vertexMap = new Map<string, Point>();

  for (const edge of cellEdges) {
    const startKey = `${edge.start.x.toFixed(4)},${edge.start.y.toFixed(4)}`;
    const endKey = `${edge.end.x.toFixed(4)},${edge.end.y.toFixed(4)}`;

    vertexMap.set(startKey, edge.start);
    vertexMap.set(endKey, edge.end);
  }

  // Get all vertices and sort by angle from centroid
  const vertices = Array.from(vertexMap.values());
  if (vertices.length < 3) return [];

  const centroid = computeCentroid(vertices);

  vertices.sort((a, b) => {
    const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
    const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
    return angleA - angleB;
  });

  return vertices;
}

// Clip polygon to map bounds
function clipPolygonToBounds(points: Point[], size: number): Point[] {
  if (points.length < 3) return points;

  const halfSize = size / 2;
  const clipped: Point[] = [];

  for (const p of points) {
    clipped.push({
      x: Math.max(-halfSize, Math.min(halfSize, p.x)),
      y: Math.max(-halfSize, Math.min(halfSize, p.y))
    });
  }

  // Remove duplicate consecutive points
  const result: Point[] = [clipped[0]];
  for (let i = 1; i < clipped.length; i++) {
    const prev = result[result.length - 1];
    const curr = clipped[i];
    if (Math.abs(curr.x - prev.x) > 0.01 || Math.abs(curr.y - prev.y) > 0.01) {
      result.push(curr);
    }
  }

  return result;
}

// Region name generator
function generateRegionName(index: number, seed: number): string {
  const random = seededRandom(seed + index * 1000);

  const prefixes = [
    'Northern', 'Southern', 'Eastern', 'Western', 'Central',
    'Upper', 'Lower', 'Greater', 'Lesser', 'Old', 'New',
  ];

  const types = [
    'Plains', 'Valley', 'Highlands', 'Territory', 'District',
    'Region', 'Province', 'Domain', 'Frontier', 'Borderlands',
    'Reaches', 'Expanse', 'Basin', 'Plateau', 'Meadows',
  ];

  const prefix = prefixes[Math.floor(random() * prefixes.length)];
  const type = types[Math.floor(random() * types.length)];

  return `${prefix} ${type}`;
}

// Assign status based on seed and index
function assignStatus(
  index: number,
  seed: number
): 'friendly' | 'hostile' | 'neutral' | 'contested' {
  const random = seededRandom(seed + index * 500);
  const value = random();

  if (value < 0.5) return 'friendly';
  if (value < 0.7) return 'hostile';
  if (value < 0.9) return 'contested';
  return 'neutral';
}

// Get status color
function getStatusColor(status: 'friendly' | 'hostile' | 'neutral' | 'contested'): string {
  switch (status) {
    case 'friendly': return '#22c55e';
    case 'hostile': return '#ef4444';
    case 'contested': return '#eab308';
    default: return '#6b7280';
  }
}

// Main function: Generate regions using Voronoi with proper shared edges
export function generateRegions(
  regionCount: number,
  seed: number,
  size: number = 100
): Region[] {
  // Step 1: Generate seed points with grid + jitter
  let seeds = generateSeedPoints(regionCount, size, seed);

  // Step 2: Apply Lloyd relaxation (3 iterations)
  for (let i = 0; i < 3; i++) {
    seeds = lloydRelaxation(seeds, size);
  }

  // Step 3: Generate Voronoi structure with shared edges
  const { cellEdges } = generateVoronoiStructure(seeds, size, 80);

  // Step 4: Build regions from cell edges
  const regions: Region[] = [];

  for (let i = 0; i < seeds.length; i++) {
    const edges = cellEdges.get(i) || [];
    let boundary = buildCellBoundary(edges);

    if (boundary.length < 3) continue;

    // Clip to map bounds
    boundary = clipPolygonToBounds(boundary, size);

    if (boundary.length < 3) continue;

    const status = assignStatus(i, seed);

    regions.push({
      id: `region-${i + 1}`,
      name: generateRegionName(i, seed),
      points: boundary.map((p) => [p.x, p.y] as [number, number]),
      color: getStatusColor(status),
      status,
    });
  }

  return regions;
}

// Export for use in Buildings component - get region centroids
export function getRegionCentroids(regions: Region[]): Point[] {
  return regions.map((region) => {
    const centroid = computeCentroid(
      region.points.map(([x, y]) => ({ x, y }))
    );
    return centroid;
  });
}
