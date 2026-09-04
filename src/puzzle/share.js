import { PALETTE } from './generator.js';

export function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Build the Wordle-style share text. The emoji grid shows the player's own
 * solution colours, so every share looks a little different while still being
 * obviously "the same puzzle".
 */
export function buildShareText({ number, timeMs, moves, board, pieces, url, lang = 'ja' }) {
  const colorOf = new Map(pieces.map((p) => [p.id, PALETTE[p.color].emoji]));
  const rows = board.cells.map((row) => row.map((id) => (id === -1 ? '⬛' : colorOf.get(id))).join(''));
  const head =
    lang === 'ja'
      ? `ブロックル #${number} ⏱${formatTime(timeMs)} 🔄${moves}`
      : `Blockle #${number} ⏱${formatTime(timeMs)} 🔄${moves}`;
  return [head, '', ...rows, '', url].join('\n');
}
