// Simple Simplex-like noise implementation for terrain generation
export function createNoise2D(seed: number = 42) {
  const perm = new Uint8Array(512);
  const grad2 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  // Initialize permutation table with seed
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
  }

  // Shuffle using seed
  let random = seed;
  for (let i = 255; i > 0; i--) {
    random = (random * 16807) % 2147483647;
    const j = random % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  // Duplicate for overflow
  for (let i = 0; i < 256; i++) {
    perm[256 + i] = perm[i];
  }

  function dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  return function noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = fade(x);
    const v = fade(y);

    const a = perm[X] + Y;
    const b = perm[X + 1] + Y;

    const g00 = grad2[perm[a] & 7];
    const g10 = grad2[perm[b] & 7];
    const g01 = grad2[perm[a + 1] & 7];
    const g11 = grad2[perm[b + 1] & 7];

    const n00 = dot(g00, x, y);
    const n10 = dot(g10, x - 1, y);
    const n01 = dot(g01, x, y - 1);
    const n11 = dot(g11, x - 1, y - 1);

    return lerp(
      lerp(n00, n10, u),
      lerp(n01, n11, u),
      v
    );
  };
}

// Fractal Brownian Motion for more natural terrain
export function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  persistence: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}
