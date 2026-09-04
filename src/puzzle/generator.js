import { createRng } from './rng.js';
import { normalize } from './shapes.js';

// Palette chosen so adjacent pieces are distinguishable and each colour has a
// matching emoji square for the share text.
export const PALETTE = [
  { hex: 0xe74c3c, emoji: '🟥' },
  { hex: 0xf39c12, emoji: '🟧' },
  { hex: 0xf1c40f, emoji: '🟨' },
  { hex: 0x2ecc71, emoji: '🟩' },
  { hex: 0x3498db, emoji: '🟦' },
  { hex: 0x9b59b6, emoji: '🟪' },
  { hex: 0x8d6e63, emoji: '🟫' },
  { hex: 0xecf0f1, emoji: '⬜' },
];

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Partition a size x size grid into random polyominoes.
 * Returns a 2D array of region ids (0..n-1).
 */
function partitionGrid(rng, size, minSize, maxSize) {
  const region = Array.from({ length: size }, () => Array(size).fill(-1));
  const sizes = [];
  let nextId = 0;

  const unassignedNeighbors = (r, c) => {
    const out = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && region[nr][nc] === -1) out.push([nr, nc]);
    }
    return out;
  };

  // Grow regions from random seeds until every cell is assigned.
  // Scanning row-major with a random offset keeps leftovers from clustering in a corner.
  for (;;) {
    const free = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (region[r][c] === -1) free.push([r, c]);
    if (free.length === 0) break;

    const [sr, sc] = rng.pick(free);
    const id = nextId++;
    const target = rng.int(minSize, maxSize);
    const cells = [[sr, sc]];
    region[sr][sc] = id;

    while (cells.length < target) {
      const frontier = [];
      for (const [r, c] of cells) for (const n of unassignedNeighbors(r, c)) frontier.push(n);
      if (frontier.length === 0) break;
      const [nr, nc] = rng.pick(frontier);
      region[nr][nc] = id;
      cells.push([nr, nc]);
    }
    sizes[id] = cells.length;
  }

  // Merge undersized regions into a neighbouring region so no piece is a lonely 1 or 2 cells.
  let changed = true;
  while (changed) {
    changed = false;
    for (let id = 0; id < nextId; id++) {
      if (sizes[id] === 0 || sizes[id] >= minSize) continue;
      // Collect adjacent region ids.
      const adj = new Set();
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (region[r][c] !== id) continue;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && region[nr][nc] !== id) adj.add(region[nr][nc]);
          }
        }
      }
      if (adj.size === 0) continue;
      // Prefer the smallest neighbour to keep piece sizes balanced.
      let best = -1;
      for (const a of adj) if (best === -1 || sizes[a] < sizes[best]) best = a;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (region[r][c] === id) region[r][c] = best;
      sizes[best] += sizes[id];
      sizes[id] = 0;
      changed = true;
    }
  }

  // Re-number so ids are dense 0..n-1.
  const remap = new Map();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const old = region[r][c];
      if (!remap.has(old)) remap.set(old, remap.size);
      region[r][c] = remap.get(old);
    }
  }
  return region;
}

/**
 * Generate a puzzle for a seed. The puzzle is guaranteed solvable because
 * the pieces are literally a partition of the grid.
 *
 * @param {string|number} seed
 * @param {{size?: number, minPiece?: number, maxPiece?: number}} [opts]
 */
export function generatePuzzle(seed, opts = {}) {
  const size = opts.size ?? 6;
  const minPiece = opts.minPiece ?? 3;
  const maxPiece = opts.maxPiece ?? 5;
  const rng = createRng(seed);

  const solution = partitionGrid(rng, size, minPiece, maxPiece);

  const cellsById = new Map();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = solution[r][c];
      if (!cellsById.has(id)) cellsById.set(id, []);
      cellsById.get(id).push([r, c]);
    }
  }

  // Greedy colouring: a piece never shares a colour with a piece it touches,
  // so the board (and the emoji share grid) stays readable.
  const adjacency = new Map();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = solution[r][c];
      if (!adjacency.has(id)) adjacency.set(id, new Set());
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && solution[nr][nc] !== id) adjacency.get(id).add(solution[nr][nc]);
      }
    }
  }
  const colorOrder = rng.shuffle(PALETTE.map((_, i) => i));
  const colorOf = new Map();
  for (const id of cellsById.keys()) {
    const used = new Set();
    for (const n of adjacency.get(id)) if (colorOf.has(n)) used.add(colorOf.get(n));
    const start = rng.int(0, colorOrder.length - 1);
    let chosen = colorOrder[start];
    for (let i = 0; i < colorOrder.length; i++) {
      const cand = colorOrder[(start + i) % colorOrder.length];
      if (!used.has(cand)) {
        chosen = cand;
        break;
      }
    }
    colorOf.set(id, chosen);
  }

  const pieces = [];
  for (const [id, cells] of cellsById) {
    pieces.push({
      id,
      cells: normalize(cells),
      // Present each piece pre-rotated so the player has to work out the orientation.
      initialRotation: rng.int(0, 3),
      color: colorOf.get(id),
    });
  }

  return {
    seed: String(seed),
    size,
    pieces: rng.shuffle(pieces),
    solution,
  };
}
