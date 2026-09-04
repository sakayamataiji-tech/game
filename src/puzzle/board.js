// Pure board state: which piece occupies which cell. No rendering here so it can be unit tested.

export class Board {
  constructor(size) {
    this.size = size;
    this.cells = Array.from({ length: size }, () => Array(size).fill(-1));
    this.placements = new Map(); // pieceId -> { row, col, cells }
  }

  inBounds(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  canPlace(cells, row, col, ignoreId = -1) {
    for (const [dr, dc] of cells) {
      const r = row + dr;
      const c = col + dc;
      if (!this.inBounds(r, c)) return false;
      const occ = this.cells[r][c];
      if (occ !== -1 && occ !== ignoreId) return false;
    }
    return true;
  }

  place(id, cells, row, col) {
    if (!this.canPlace(cells, row, col, id)) return false;
    this.remove(id);
    for (const [dr, dc] of cells) this.cells[row + dr][col + dc] = id;
    this.placements.set(id, { row, col, cells });
    return true;
  }

  remove(id) {
    const p = this.placements.get(id);
    if (!p) return;
    for (const [dr, dc] of p.cells) this.cells[p.row + dr][p.col + dc] = -1;
    this.placements.delete(id);
  }

  isPlaced(id) {
    return this.placements.has(id);
  }

  filledCount() {
    let n = 0;
    for (const row of this.cells) for (const v of row) if (v !== -1) n++;
    return n;
  }

  isSolved() {
    return this.filledCount() === this.size * this.size;
  }

  clear() {
    for (const row of this.cells) row.fill(-1);
    this.placements.clear();
  }
}
