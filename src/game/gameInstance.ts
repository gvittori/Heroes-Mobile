import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { VictoryScene } from './scenes/VictoryScene';

export function createGame(
  parentContainerId: string,
  callbacks: {
    onStateUpdate: (state: any) => void;
    onLogEvent: (text: string, type: 'info' | 'success' | 'warning' | 'combat') => void;
    onInteraction: (obj: any) => void;
  }
): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentContainerId,
    width: window.innerWidth > 1024 ? window.innerWidth - 320 : window.innerWidth,
    height: window.innerHeight - 120,
    backgroundColor: '#030712',
    pixelArt: true,
    roundPixels: true,
    scene: [MainScene, VictoryScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);

  // Pass callbacks to MainScene when created
  game.events.once('ready', () => {
    const mainScene = game.scene.getScene('MainScene') as MainScene;
    if (mainScene) {
      // @ts-ignore
      mainScene.init(callbacks);
    }
  });

  return game;
}
