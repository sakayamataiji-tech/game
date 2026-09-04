// Pure helpers for polyomino shapes. A shape is an array of [row, col] pairs,
// normalised so the minimum row and minimum column are both 0.

export function normalize(cells) {
  let minR = Infinity;
  let minC = Infinity;
  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return cells
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** Rotate 90 degrees clockwise and re-normalise. */
export function rotateCW(cells) {
  return normalize(cells.map(([r, c]) => [c, -r]));
}

export function rotateTimes(cells, times) {
  let out = cells;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) out = rotateCW(out);
  return out;
}

export function bounds(cells) {
  let maxR = 0;
  let maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

/** Canonical string key for a shape (used to compare shapes regardless of order). */
export function shapeKey(cells) {
  return normalize(cells)
    .map(([r, c]) => `${r},${c}`)
    .join(';');
}
