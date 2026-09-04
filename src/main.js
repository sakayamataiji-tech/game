import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { ads } from './services/ads.js';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

ads.init().finally(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1b1e2b',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { activePointers: 1 },
    scene: [GameScene],
  });
  // Exposed for smoke tests and debugging in the browser console.
  window.__blockle = game;
});
