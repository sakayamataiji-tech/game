import Phaser from 'phaser';
import { generatePuzzle, PALETTE } from '../puzzle/generator.js';
import { rotateCW, rotateTimes, bounds } from '../puzzle/shapes.js';
import { Board } from '../puzzle/board.js';
import { dateKey, puzzleNumber, dailySeed, dailyOptions, endlessSeed } from '../puzzle/daily.js';
import { buildShareText, formatTime } from '../puzzle/share.js';
import { loadState, saveState, recordDailySolve } from '../services/storage.js';
import { track } from '../services/analytics.js';
import { ads } from '../services/ads.js';
import { detectLang, t } from '../i18n.js';

const W = 480;
const H = 854;
const FONT = '"Hiragino Sans", "Noto Sans JP", "Segoe UI", Roboto, system-ui, sans-serif';
const COLORS = {
  bg: 0x1b1e2b,
  panel: 0x262a3b,
  cell: 0x30354a,
  cellLine: 0x1b1e2b,
  text: '#f4f4f8',
  muted: '#9aa0b8',
  accent: 0x4f7cff,
  accentText: '#ffffff',
};
const LIFT = 56; // px the piece floats above the finger while dragging
const ENDLESS_INTERSTITIAL_EVERY = 3;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  init(data) {
    this.mode = data.mode ?? 'daily';
    this.endlessCounter = data.endlessCounter ?? 0;
    this.state = loadState();
    this.lang = this.state.lang ?? detectLang();
    this.tr = t(this.lang);
  }

  create() {
    this.buildPuzzle();
    this.buildLayout();
    this.buildHeader();
    this.buildGrid();
    this.buildPieces();
    this.buildButtons();
    this.setupInput();

    this.moves = 0;
    this.hints = 0;
    this.solved = false;
    this.restored = false;
    this.startTime = this.time.now;

    const saved = this.mode === 'daily' ? this.state.daily[this.dayKey] : null;
    if (saved) {
      this.restoreSolved(saved);
    } else {
      ads.gameplayStart();
      track('puzzle_start', { mode: this.mode, number: this.number, size: this.puzzle.size });
    }
    this.layoutTray(false);
  }

  // ---------------------------------------------------------------- setup

  buildPuzzle() {
    if (this.mode === 'daily') {
      this.dayKey = dateKey();
      this.number = puzzleNumber(this.dayKey);
      this.puzzle = generatePuzzle(dailySeed(this.dayKey), dailyOptions(this.dayKey));
    } else {
      this.dayKey = null;
      this.number = this.endlessCounter + 1;
      this.puzzle = generatePuzzle(endlessSeed(this.endlessCounter), { size: 6 });
    }
    this.board = new Board(this.puzzle.size);
  }

  buildLayout() {
    const size = this.puzzle.size;
    this.cell = Math.min(56, Math.floor(380 / size));
    this.gridW = this.cell * size;
    this.gridX = Math.round((W - this.gridW) / 2);
    this.gridY = 118;
    this.trayY = this.gridY + this.gridW + 36;
    this.trayH = H - this.trayY - 96;
    this.trayScale = size >= 7 ? 0.42 : 0.5;
  }

  buildHeader() {
    const tr = this.tr;
    this.add.text(24, 22, tr.title, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: COLORS.text });

    let sub;
    if (this.mode === 'daily') {
      const [y, m, d] = this.dayKey.split('-').map(Number);
      const dow = tr.dayNames[new Date(y, m - 1, d).getDay()];
      sub = `${tr.daily} ${tr.puzzleNo(this.number)} · ${m}/${d} (${dow})`;
    } else {
      sub = `${tr.endless} ${tr.puzzleNo(this.number)}`;
    }
    this.add.text(24, 64, sub, { fontFamily: FONT, fontSize: '16px', color: COLORS.muted });

    this.timerText = this.add
      .text(W - 24, 22, '⏱ 0:00', { fontFamily: FONT, fontSize: '22px', color: COLORS.text })
      .setOrigin(1, 0);
    this.streakText = this.add
      .text(W - 24, 64, '', { fontFamily: FONT, fontSize: '16px', color: COLORS.muted })
      .setOrigin(1, 0);
    this.updateStreakText();

    this.hintText = this.add
      .text(W / 2, this.gridY + this.gridW + 20, tr.howTo, { fontFamily: FONT, fontSize: '13px', color: COLORS.muted })
      .setOrigin(0.5, 0.5);
  }

  updateStreakText() {
    const n = this.state.streak.count;
    this.streakText.setText(n > 0 ? this.tr.streak(n) : '');
  }

  buildGrid() {
    const g = this.add.graphics();
    const pad = 8;
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(this.gridX - pad, this.gridY - pad, this.gridW + pad * 2, this.gridW + pad * 2, 12);
    g.fillStyle(COLORS.cell, 1);
    for (let r = 0; r < this.puzzle.size; r++) {
      for (let c = 0; c < this.puzzle.size; c++) {
        g.fillRoundedRect(this.gridX + c * this.cell + 2, this.gridY + r * this.cell + 2, this.cell - 4, this.cell - 4, 4);
      }
    }
    this.gridGfx = g;
  }

  buildPieces() {
    this.pieces = this.puzzle.pieces.map((p) => this.createPiece(p));
  }

  createPiece(def) {
    const cont = this.add.container(0, 0);
    cont.def = def;
    cont.pieceId = def.id;
    cont.cells = rotateTimes(def.cells, def.initialRotation);
    cont.color = PALETTE[def.color].hex;
    cont.placed = null;
    cont.setScale(this.trayScale);
    this.drawPiece(cont);
    cont.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(cont);
    this.refreshHitArea(cont);
    return cont;
  }

  drawPiece(cont) {
    cont.removeAll(true);
    const dark = Phaser.Display.Color.IntegerToColor(cont.color).darken(28).color;
    const light = Phaser.Display.Color.IntegerToColor(cont.color).lighten(18).color;
    for (const [r, c] of cont.cells) {
      const x = c * this.cell + this.cell / 2;
      const y = r * this.cell + this.cell / 2;
      const rect = this.add.rectangle(x, y, this.cell - 4, this.cell - 4, cont.color);
      rect.setStrokeStyle(3, dark);
      cont.add(rect);
      // A small highlight gives a bevelled look without textures.
      const hl = this.add.rectangle(x, y - (this.cell - 4) / 2 + 5, this.cell - 14, 4, light, 0.6);
      cont.add(hl);
    }
    this.refreshHitArea(cont);
  }

  refreshHitArea(cont) {
    if (!cont.input) return;
    const b = bounds(cont.cells);
    cont.input.hitArea.setTo(0, 0, b.cols * this.cell, b.rows * this.cell);
  }

  buildButtons() {
    const y = H - 52;
    const tr = this.tr;
    this.btnReset = this.makeButton(90, y, 130, 46, tr.reset, () => this.resetBoard(), COLORS.panel);
    this.btnHint = this.makeButton(W / 2, y, 150, 46, `💡 ${tr.hint}`, () => this.requestHint(), COLORS.panel);
    const modeLabel = this.mode === 'daily' ? tr.endless : tr.dailyShort;
    this.btnMode = this.makeButton(W - 90, y, 130, 46, modeLabel, () => this.switchMode(), COLORS.accent);
  }

  makeButton(x, y, w, h, label, onClick, fill = COLORS.accent) {
    const cont = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    const txt = this.add
      .text(0, 0, label, { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: COLORS.accentText })
      .setOrigin(0.5);
    cont.add([g, txt]);
    cont.label = txt;
    cont.setSize(w, h);
    cont.setInteractive({ useHandCursor: true });
    cont.on('pointerdown', () => cont.setScale(0.96));
    cont.on('pointerout', () => cont.setScale(1));
    cont.on('pointerup', () => {
      cont.setScale(1);
      onClick();
    });
    return cont;
  }

  // ---------------------------------------------------------------- input

  setupInput() {
    this.input.on('dragstart', (pointer, obj) => {
      if (!obj.pieceId && obj.pieceId !== 0) return;
      if (this.solved) return;
      const b = bounds(obj.cells);
      const w = b.cols * this.cell * obj.scale;
      const h = b.rows * this.cell * obj.scale;
      obj.grab = { fx: (pointer.x - obj.x) / w, fy: (pointer.y - obj.y) / h, x: pointer.x, y: pointer.y, t: pointer.time };
      obj.wasPlaced = obj.placed;
      if (obj.placed) {
        this.board.remove(obj.pieceId);
        obj.placed = null;
      }
      this.children.bringToTop(obj);
      this.tweens.add({ targets: obj, scale: 1, duration: 90 });
    });

    this.input.on('drag', (pointer, obj) => {
      if (!obj.grab || this.solved) return;
      const b = bounds(obj.cells);
      const isTouch = pointer.wasTouch;
      obj.x = pointer.x - obj.grab.fx * b.cols * this.cell;
      obj.y = pointer.y - obj.grab.fy * b.rows * this.cell - (isTouch ? LIFT : 0);
    });

    this.input.on('dragend', (pointer, obj) => {
      if (!obj.grab || this.solved) return;
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, obj.grab.x, obj.grab.y);
      const dt = pointer.time - obj.grab.t;
      const isTap = dist < 10 && dt < 350;
      obj.grab = null;

      if (isTap) {
        obj.cells = rotateCW(obj.cells);
        this.drawPiece(obj);
        if (obj.wasPlaced) {
          if (!this.tryPlace(obj, obj.wasPlaced.row, obj.wasPlaced.col)) this.sendToTray(obj);
        } else {
          this.sendToTray(obj);
        }
        track('piece_rotate', { mode: this.mode });
        return;
      }

      const col = Math.round((obj.x - this.gridX) / this.cell);
      const row = Math.round((obj.y - this.gridY) / this.cell);
      if (!this.tryPlace(obj, row, col)) this.sendToTray(obj);
    });
  }

  tryPlace(obj, row, col) {
    if (!this.board.place(obj.pieceId, obj.cells, row, col)) return false;
    obj.placed = { row, col };
    this.moves += 1;
    this.tweens.add({
      targets: obj,
      x: this.gridX + col * this.cell,
      y: this.gridY + row * this.cell,
      scale: 1,
      duration: 80,
    });
    this.layoutTray(true);
    if (this.board.isSolved()) this.onSolved();
    return true;
  }

  sendToTray(obj) {
    obj.placed = null;
    this.layoutTray(true);
  }

  /** Flow-layout every unplaced piece inside the tray area. */
  layoutTray(animate) {
    const gap = 14;
    const scale = this.trayScale;
    const free = this.pieces.filter((p) => !p.placed);
    const rows = [];
    let cur = { items: [], w: 0, h: 0 };
    const maxW = W - 32;
    for (const p of free) {
      const b = bounds(p.cells);
      const w = b.cols * this.cell * scale;
      const h = b.rows * this.cell * scale;
      if (cur.items.length && cur.w + gap + w > maxW) {
        rows.push(cur);
        cur = { items: [], w: 0, h: 0 };
      }
      cur.items.push({ p, w, h });
      cur.w += (cur.items.length > 1 ? gap : 0) + w;
      cur.h = Math.max(cur.h, h);
    }
    if (cur.items.length) rows.push(cur);

    const totalH = rows.reduce((n, r) => n + r.h, 0) + gap * Math.max(0, rows.length - 1);
    // Shrink the tray scale a bit if the pieces would overflow the tray.
    const fit = totalH > this.trayH ? this.trayH / totalH : 1;
    let y = this.trayY + (this.trayH - totalH * fit) / 2;
    for (const r of rows) {
      let x = (W - r.w * fit) / 2;
      for (const it of r.items) {
        const targetScale = scale * fit;
        const ty = y + ((r.h - it.h) * fit) / 2;
        if (animate) {
          this.tweens.add({ targets: it.p, x, y: ty, scale: targetScale, duration: 140, ease: 'Quad.easeOut' });
        } else {
          it.p.setPosition(x, ty).setScale(targetScale);
        }
        x += (it.w + gap) * fit;
      }
      y += (r.h + gap) * fit;
    }
  }

  resetBoard() {
    if (this.solved) return;
    this.board.clear();
    for (const p of this.pieces) p.placed = null;
    this.layoutTray(true);
    track('board_reset', { mode: this.mode });
  }

  // ---------------------------------------------------------------- hint (rewarded ad hook)

  async requestHint() {
    if (this.solved) return;
    const candidate = this.findHintCandidate();
    if (!candidate) {
      this.toast(this.tr.hintNone);
      return;
    }
    const ok = await ads.showRewarded('hint');
    if (!ok) {
      this.toast(this.tr.hintFail);
      return;
    }
    const { obj, row, col } = candidate;
    obj.cells = obj.def.cells; // solution orientation
    this.drawPiece(obj);
    this.children.bringToTop(obj);
    this.hints += 1;
    this.tryPlace(obj, row, col);
    track('hint_used', { mode: this.mode, hints: this.hints });
  }

  findHintCandidate() {
    const sol = this.puzzle.solution;
    for (const obj of this.pieces) {
      if (obj.placed) continue;
      const def = obj.def;
      let origin = null;
      for (let r = 0; r < sol.length && !origin; r++)
        for (let c = 0; c < sol.length; c++)
          if (sol[r][c] === def.id) {
            origin = [r, c];
            break;
          }
      const [fr, fc] = def.cells[0];
      const row = origin[0] - fr;
      const col = origin[1] - fc;
      if (this.board.canPlace(def.cells, row, col)) return { obj, row, col };
    }
    // Every free piece's home is blocked by a misplaced piece: clear the board first.
    this.board.clear();
    for (const p of this.pieces) p.placed = null;
    this.layoutTray(true);
    return this.findHintCandidate();
  }

  // ---------------------------------------------------------------- solve / overlay

  onSolved() {
    this.solved = true;
    this.elapsed = this.time.now - this.startTime;
    ads.gameplayStop();
    track('puzzle_solved', { mode: this.mode, number: this.number, timeMs: this.elapsed, moves: this.moves, hints: this.hints });

    if (this.mode === 'daily') {
      const placements = this.pieces.map((p) => ({ id: p.pieceId, cells: p.cells, row: p.placed.row, col: p.placed.col }));
      recordDailySolve(this.state, this.dayKey, { timeMs: this.elapsed, moves: this.moves, hints: this.hints, placements });
      this.updateStreakText();
    } else {
      this.state.endlessSolved += 1;
      saveState(this.state);
    }

    // Celebration pulse.
    this.pieces.forEach((p, i) => {
      this.tweens.add({ targets: p, scale: 1.06, yoyo: true, duration: 120, delay: i * 40 });
    });
    this.time.delayedCall(700, () => this.showResultOverlay());
  }

  restoreSolved(saved) {
    this.solved = true;
    this.restored = true;
    this.elapsed = saved.timeMs;
    this.moves = saved.moves;
    this.hints = saved.hints ?? 0;
    for (const pl of saved.placements) {
      const obj = this.pieces.find((p) => p.pieceId === pl.id);
      if (!obj) continue;
      obj.cells = pl.cells;
      this.drawPiece(obj);
      if (this.board.place(obj.pieceId, obj.cells, pl.row, pl.col)) {
        obj.placed = { row: pl.row, col: pl.col };
        obj.setPosition(this.gridX + pl.col * this.cell, this.gridY + pl.row * this.cell).setScale(1);
      }
    }
    this.timerText.setText(`⏱ ${formatTime(this.elapsed)}`);
    this.showResultOverlay();
  }

  showResultOverlay() {
    const tr = this.tr;
    const overlay = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.35).setInteractive();
    overlay.add(dim);

    const panelW = 400;
    const panelH = this.mode === 'daily' ? 330 : 280;
    const py = Math.round(H - 96 - panelH / 2 - 8);
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(W / 2 - panelW / 2, py - panelH / 2, panelW, panelH, 18);
    overlay.add(g);

    let y = py - panelH / 2 + 34;
    const title = this.restored ? tr.doneToday : tr.cleared;
    overlay.add(this.add.text(W / 2, y, title, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5));
    y += 48;
    const hintPart = this.hints > 0 ? `   💡 ${this.hints}` : '';
    overlay.add(
      this.add
        .text(W / 2, y, `${tr.time} ${formatTime(this.elapsed)}   ${tr.moves} ${this.moves}${hintPart}`, {
          fontFamily: FONT,
          fontSize: '18px',
          color: COLORS.muted,
        })
        .setOrigin(0.5),
    );
    y += 44;

    if (this.mode === 'daily') {
      const streak = this.state.streak.count;
      overlay.add(this.add.text(W / 2, y, tr.streak(streak), { fontFamily: FONT, fontSize: '18px', color: COLORS.text }).setOrigin(0.5));
      y += 44;
      overlay.add(this.makeButton(W / 2 - 95, y, 180, 46, `📋 ${tr.share}`, () => this.share('copy')));
      overlay.add(this.makeButton(W / 2 + 95, y, 180, 46, `𝕏 ${tr.shareX}`, () => this.share('x'), 0x000000));
      y += 60;
      this.countdownText = this.add.text(W / 2, y, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.muted }).setOrigin(0.5);
      overlay.add(this.countdownText);
      y += 40;
      overlay.add(this.makeButton(W / 2, y, 240, 46, tr.playEndless, () => this.switchMode(), COLORS.accent));
    } else {
      overlay.add(this.makeButton(W / 2 - 95, y, 180, 46, `📋 ${tr.share}`, () => this.share('copy')));
      overlay.add(this.makeButton(W / 2 + 95, y, 180, 46, tr.next, () => this.nextEndless(), COLORS.accent));
      y += 60;
      overlay.add(this.makeButton(W / 2, y, 240, 46, tr.backToDaily, () => this.scene.restart({ mode: 'daily' }), COLORS.panel));
    }
    this.overlay = overlay;
  }

  shareText() {
    const url = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '';
    const text = buildShareText({
      number: this.number,
      timeMs: this.elapsed,
      moves: this.moves,
      board: this.board,
      pieces: this.puzzle.pieces,
      url,
      lang: this.lang,
    });
    return this.hints > 0 ? text.replace('\n\n', ` 💡${this.hints}\n\n`) : text;
  }

  async share(kind) {
    const text = this.shareText();
    track('share', { kind, mode: this.mode, number: this.number });
    if (kind === 'x') {
      const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(intent, '_blank', 'noopener');
      return;
    }
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      this.toast(this.tr.copied);
    } catch {
      this.toast(this.tr.copied);
    }
  }

  async nextEndless() {
    const n = this.endlessCounter + 1;
    if (n % ENDLESS_INTERSTITIAL_EVERY === 0) await ads.showInterstitial('endless_next');
    this.scene.restart({ mode: 'endless', endlessCounter: n });
  }

  switchMode() {
    if (this.mode === 'daily') this.scene.restart({ mode: 'endless', endlessCounter: 0 });
    else this.scene.restart({ mode: 'daily' });
  }

  toast(msg) {
    const txt = this.add
      .text(W / 2, H - 110, msg, {
        fontFamily: FONT,
        fontSize: '16px',
        color: COLORS.text,
        backgroundColor: '#000000cc',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({ targets: txt, alpha: 1, duration: 150, yoyo: true, hold: 1400, onComplete: () => txt.destroy() });
  }

  // ---------------------------------------------------------------- loop

  update() {
    if (!this.solved) {
      this.timerText.setText(`⏱ ${formatTime(this.time.now - this.startTime)}`);
    } else if (this.countdownText && this.mode === 'daily') {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ms = midnight - now;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      this.countdownText.setText(this.tr.nextIn(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`));
    }
  }
}
