import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle } from '../src/puzzle/generator.js';
import { rotateCW, rotateTimes, shapeKey, normalize } from '../src/puzzle/shapes.js';
import { Board } from '../src/puzzle/board.js';
import { dateKey, puzzleNumber, dailySeed, dailyOptions, LAUNCH_DATE } from '../src/puzzle/daily.js';
import { buildShareText, formatTime } from '../src/puzzle/share.js';

test('generator covers the whole grid with pieces of allowed sizes', () => {
  for (let seed = 0; seed < 200; seed++) {
    const size = 6;
    const p = generatePuzzle(seed, { size, minPiece: 3, maxPiece: 5 });
    const total = p.pieces.reduce((n, piece) => n + piece.cells.length, 0);
    assert.equal(total, size * size, `seed ${seed} total cells`);
    for (const piece of p.pieces) {
      assert.ok(piece.cells.length >= 3, `seed ${seed} piece too small: ${piece.cells.length}`);
      assert.ok(piece.cells.length <= 9, `seed ${seed} piece too large: ${piece.cells.length}`);
    }
    // Solution map is a valid partition: each id appears with the right count.
    const counts = new Map();
    for (const row of p.solution) for (const id of row) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const piece of p.pieces) assert.equal(counts.get(piece.id), piece.cells.length);
  }
});

test('generator is deterministic for a seed and differs between seeds', () => {
  const a = generatePuzzle('abc');
  const b = generatePuzzle('abc');
  const c = generatePuzzle('abd');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.solution, c.solution);
});

test('solution pieces can be placed on a board to solve it', () => {
  const p = generatePuzzle(42);
  const board = new Board(p.size);
  for (const piece of p.pieces) {
    // Find the piece's origin in the solution map.
    let origin = null;
    for (let r = 0; r < p.size && !origin; r++)
      for (let c = 0; c < p.size; c++)
        if (p.solution[r][c] === piece.id) {
          origin = [r, c];
          break;
        }
    // Origin cell is the first normalised cell (min row, then min col within that row).
    const [fr, fc] = piece.cells[0];
    assert.ok(board.place(piece.id, piece.cells, origin[0] - fr, origin[1] - fc));
  }
  assert.ok(board.isSolved());
});

test('rotateCW cycles back after four turns', () => {
  const L = normalize([[0, 0], [1, 0], [2, 0], [2, 1]]);
  assert.equal(shapeKey(rotateTimes(L, 4)), shapeKey(L));
  assert.notEqual(shapeKey(rotateCW(L)), shapeKey(L));
  assert.deepEqual(rotateCW([[0, 0], [0, 1]]), [[0, 0], [1, 0]]);
});

test('board rejects overlaps and out-of-bounds placements', () => {
  const b = new Board(4);
  assert.ok(b.place(1, [[0, 0], [0, 1]], 0, 0));
  assert.equal(b.place(2, [[0, 0]], 0, 1), false);
  assert.equal(b.place(2, [[0, 0], [0, 1]], 0, 3), false);
  assert.ok(b.place(1, [[0, 0], [0, 1]], 1, 0)); // moving the same piece is fine
  assert.equal(b.cells[0][0], -1);
  b.remove(1);
  assert.equal(b.filledCount(), 0);
});

test('daily helpers', () => {
  assert.equal(puzzleNumber(LAUNCH_DATE), 1);
  assert.equal(puzzleNumber('2026-09-05'), 2);
  assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(dailySeed('2026-09-04'), dailySeed('2026-09-04'));
  assert.notEqual(dailySeed('2026-09-04'), dailySeed('2026-09-05'));
  assert.equal(dailyOptions('2026-09-05').size, 7); // Saturday
  assert.equal(dailyOptions('2026-09-07').size, 6); // Monday
});

test('share text renders an emoji grid', () => {
  const p = generatePuzzle(7, { size: 3, minPiece: 3, maxPiece: 3 });
  const board = new Board(3);
  const text = buildShareText({ number: 12, timeMs: 83000, moves: 4, board, pieces: p.pieces, url: 'https://x' });
  assert.match(text, /^ブロックル #12 ⏱1:23 🔄4\n/);
  assert.equal(text.split('\n').length, 1 + 1 + 3 + 1 + 1);
  assert.equal(formatTime(0), '0:00');
});

test('touching pieces never share a colour', () => {
  for (let seed = 0; seed < 100; seed++) {
    const p = generatePuzzle(seed);
    const color = new Map(p.pieces.map((pc) => [pc.id, pc.color]));
    for (let r = 0; r < p.size; r++) {
      for (let c = 0; c < p.size; c++) {
        const id = p.solution[r][c];
        if (c + 1 < p.size && p.solution[r][c + 1] !== id) assert.notEqual(color.get(id), color.get(p.solution[r][c + 1]), `seed ${seed}`);
        if (r + 1 < p.size && p.solution[r + 1][c] !== id) assert.notEqual(color.get(id), color.get(p.solution[r + 1][c]), `seed ${seed}`);
      }
    }
  }
});
