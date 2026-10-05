import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay background
    this.add.rectangle(width / 2, height / 2, width, height, 0x090d16, 0.9);

    this.add.text(width / 2, height / 2 - 80, 'VICTORY!', {
      fontSize: '48px',
      color: '#fbbf24',
      fontFamily: 'Cinzel, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 20, 'You have conquered the enemy stronghold and liberated the realm!', {
      fontSize: '18px',
      color: '#e2e8f0',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }).setOrigin(0.5);

    const restartBtn = this.add.rectangle(width / 2, height / 2 + 60, 220, 50, 0xd97706, 1)
      .setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      this.scene.start('MainScene');
    });

    this.add.text(width / 2, height / 2 + 60, 'Play Again', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Cinzel, serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }
}

