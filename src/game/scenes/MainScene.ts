/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Phaser from 'phaser';
import { HeroClass, MapNode, MapObject, TerrainType, TERRAIN_CONFIGS } from '../../types';
import { findPath } from '../AStar';
import { generateAdventureMap } from '../MapGenerator';

const TILE_SIZE = 48;

interface DirectionInfo {
  animName: string;
  idleFrame: number;
  flipX: boolean;
}

export class MainScene extends Phaser.Scene {
  private mapGrid!: MapNode[][];
  private mapObjects: MapObject[] = [];
  private heroGridX = 2;
  private heroGridY = 9;
  private currentMP = 10;
  private maxMP = 10;
  private scoutingRadius = 3;

  private currentHeroClass: HeroClass = 'knight';

  private tileContainer!: Phaser.GameObjects.Container;
  private objectContainer!: Phaser.GameObjects.Container;
  private fogContainer!: Phaser.GameObjects.Container;
  private pathContainer!: Phaser.GameObjects.Container;
  private selectionContainer!: Phaser.GameObjects.Container;
  private heroSprite!: Phaser.GameObjects.Sprite;

  private currentPath: { x: number; y: number }[] = [];
  private isMoving = false;
  private hoveredTile: { x: number; y: number } | null = null;
  private selectedDestination: { x: number; y: number } | null = null;
  private lastDirection: DirectionInfo = { animName: 'walk-down', idleFrame: 36, flipX: false };

  // React callbacks
  private onStateUpdate?: (state: any) => void;
  private onLogEvent?: (text: string, type: 'info' | 'success' | 'warning' | 'combat') => void;
  private onInteraction?: (obj: MapObject) => void;

  constructor() {
    super('MainScene');
  }

  private customMapData?: any;

  private get mapWidth(): number {
    return this.mapGrid && this.mapGrid[0] ? this.mapGrid[0].length : 22;
  }

  private get mapHeight(): number {
    return this.mapGrid ? this.mapGrid.length : 18;
  }

  init(data: {
    heroClass?: HeroClass;
    customMapData?: any;
    onStateUpdate?: (state: any) => void;
    onLogEvent?: (text: string, type: 'info' | 'success' | 'warning' | 'combat') => void;
    onInteraction?: (obj: MapObject) => void;
  }) {
    if (data.heroClass) {
      this.currentHeroClass = data.heroClass;
    }
    if (data.customMapData) {
      this.customMapData = data.customMapData;
    }
    this.onStateUpdate = data.onStateUpdate;
    this.onLogEvent = data.onLogEvent;
    this.onInteraction = data.onInteraction;
  }

  preload() {
    const heroes: HeroClass[] = ['knight', 'barbarian', 'sorceress', 'warlock'];
    heroes.forEach((h) => {
      this.load.spritesheet(`hero_${h}`, `/sprites/hero_${h}.png`, {
        frameWidth: 64,
        frameHeight: 64,
      });
    });

    this.load.image('knight_overmap', '/sprites/knight_overmap.png');
  }

  create() {
    // Generate map
    const generated = generateAdventureMap(this.customMapData);
    this.mapGrid = generated.grid;
    this.mapObjects = generated.objects;
    this.heroGridX = generated.playerStart.x;
    this.heroGridY = generated.playerStart.y;
    this.currentMP = 10;
    this.maxMP = 10;
    this.selectedDestination = null;

    if (!this.textures.exists('town_knight')) {
      const srcImage = this.textures.get('knight_overmap').getSourceImage() as HTMLImageElement;
      if (srcImage) {
        const w = srcImage.width;
        const h = srcImage.height;
        const halfW = Math.floor(w / 2);

        const processCanvas = (sx: number, sy: number, sw: number, sh: number, key: string) => {
          const canvas = this.textures.createCanvas(key, sw, sh);
          if (canvas && canvas.context) {
            canvas.context.drawImage(srcImage, sx, sy, sw, sh, 0, 0, sw, sh);
            const imgData = canvas.context.getImageData(0, 0, sw, sh);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i+1], b = data[i+2];
              if (r < 25 && g > 220 && b > 220) {
                data[i+3] = 0;
              }
            }
            canvas.context.putImageData(imgData, 0, 0);
            canvas.refresh();
          }
        };

        processCanvas(0, 0, halfW, h, 'town_knight');
        processCanvas(halfW, 0, w - halfW, h, 'town_knight_fort');
      }
    }

    // Set world bounds dynamically
    this.cameras.main.setBounds(0, 0, this.mapWidth * TILE_SIZE, this.mapHeight * TILE_SIZE);
    this.cameras.main.setZoom(1.0);
    this.cameras.main.roundPixels = true;

    this.createHeroAnimations();

    this.tileContainer = this.add.container(0, 0);
    this.tileContainer.setDepth(1);

    this.pathContainer = this.add.container(0, 0);
    this.pathContainer.setDepth(5);

    this.selectionContainer = this.add.container(0, 0);
    this.selectionContainer.setDepth(6);

    this.objectContainer = this.add.container(0, 0);
    this.objectContainer.setDepth(8);

    this.fogContainer = this.add.container(0, 0);
    this.fogContainer.setDepth(20);

    this.renderMap();
    this.renderObjects();
    this.setupHero();
    this.updateFogOfWar();
    this.renderFogOverlay();

    this.cameras.main.startFollow(this.heroSprite, true, 0.08, 0.08);
    this.centerCameraOnHero();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isMoving) return;

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const gx = Math.floor(worldPoint.x / TILE_SIZE);
      const gy = Math.floor(worldPoint.y / TILE_SIZE);

      if (gx >= 0 && gx < this.mapWidth && gy >= 0 && gy < this.mapHeight) {
        if (this.selectedDestination && this.selectedDestination.x === gx && this.selectedDestination.y === gy) {
          this.tryMoveAlongPath(gx, gy);
        } else {
          this.selectedDestination = { x: gx, y: gy };
          this.calculateAndShowPath(gx, gy);
          this.renderSelectionMarker();
          this.pushStateUpdate();
          this.onLogEvent?.(`Selected destination (${gx}, ${gy}). Tap again or click Move to travel.`, 'info');
        }
      }
    });

    this.pushStateUpdate();
    this.onLogEvent?.(`Hero ready (${this.currentHeroClass}). Tap a destination to select, tap again to move.`, 'info');
  }

  private createHeroAnimations() {
    const heroClasses: HeroClass[] = ['knight', 'barbarian', 'sorceress', 'warlock'];

    heroClasses.forEach((cls) => {
      const sheetKey = `hero_${cls}`;

      if (!this.anims.exists(`${cls}_walk-up`)) {
        this.anims.create({
          key: `${cls}_walk-up`,
          frames: this.anims.generateFrameNumbers(sheetKey, { start: 1, end: 8 }),
          frameRate: 10,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${cls}_walk-up-right`)) {
        this.anims.create({
          key: `${cls}_walk-up-right`,
          frames: this.anims.generateFrameNumbers(sheetKey, { start: 10, end: 17 }),
          frameRate: 10,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${cls}_walk-right`)) {
        this.anims.create({
          key: `${cls}_walk-right`,
          frames: this.anims.generateFrameNumbers(sheetKey, { start: 19, end: 26 }),
          frameRate: 10,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${cls}_walk-down-right`)) {
        this.anims.create({
          key: `${cls}_walk-down-right`,
          frames: this.anims.generateFrameNumbers(sheetKey, { start: 28, end: 35 }),
          frameRate: 10,
          repeat: -1,
        });
      }
      if (!this.anims.exists(`${cls}_walk-down`)) {
        this.anims.create({
          key: `${cls}_walk-down`,
          frames: this.anims.generateFrameNumbers(sheetKey, { start: 37, end: 44 }),
          frameRate: 10,
          repeat: -1,
        });
      }
    });
  }

  public setHeroClass(cls: HeroClass) {
    this.currentHeroClass = cls;
    if (this.heroSprite) {
      this.heroSprite.setTexture(`hero_${cls}`);
      this.heroSprite.setFrame(this.lastDirection.idleFrame);
      this.heroSprite.setFlipX(this.lastDirection.flipX);
      this.onLogEvent?.(`Hero changed to ${cls.toUpperCase()}.`, 'info');
      this.pushStateUpdate();
    }
  }

  public confirmMove() {
    if (this.selectedDestination && !this.isMoving) {
      this.tryMoveAlongPath(this.selectedDestination.x, this.selectedDestination.y);
    }
  }

  private getDirection(dx: number, dy: number): DirectionInfo {
    if (dx === 0 && dy < 0) {
      return { animName: 'walk-up', idleFrame: 0, flipX: false };
    } else if (dx > 0 && dy < 0) {
      return { animName: 'walk-up-right', idleFrame: 9, flipX: false };
    } else if (dx > 0 && dy === 0) {
      return { animName: 'walk-right', idleFrame: 18, flipX: false };
    } else if (dx > 0 && dy > 0) {
      return { animName: 'walk-down-right', idleFrame: 27, flipX: false };
    } else if (dx === 0 && dy > 0) {
      return { animName: 'walk-down', idleFrame: 36, flipX: false };
    } else if (dx < 0 && dy > 0) {
      return { animName: 'walk-down-right', idleFrame: 27, flipX: true };
    } else if (dx < 0 && dy === 0) {
      return { animName: 'walk-right', idleFrame: 18, flipX: true };
    } else if (dx < 0 && dy < 0) {
      return { animName: 'walk-up-right', idleFrame: 9, flipX: true };
    }
    return { animName: 'walk-down', idleFrame: 36, flipX: false };
  }

  private centerCameraOnHero() {
    const px = this.heroGridX * TILE_SIZE + TILE_SIZE / 2;
    const py = this.heroGridY * TILE_SIZE + TILE_SIZE / 2;
    this.cameras.main.centerOn(px, py);
  }

  private renderMap() {
    this.tileContainer.removeAll(true);

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const node = this.mapGrid[y][x];
        const conf = TERRAIN_CONFIGS[node.terrainType];

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        const tileBg = this.add.rectangle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, conf.color);
        tileBg.setStrokeStyle(1, 0x111827, 0.3);
        this.tileContainer.add(tileBg);

        if (node.terrainType === 'ROAD') {
          const roadMark = this.add.rectangle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 0.7, TILE_SIZE * 0.7, 0xd4af37, 0.4);
          this.tileContainer.add(roadMark);
        } else if (node.terrainType === 'WATER') {
          const waveMark = this.add.circle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 4, 0x68d8d6, 0.5);
          this.tileContainer.add(waveMark);
        } else if (node.terrainType === 'MOUNTAIN') {
          if (!((x >= 1 && x <= 3 && y === 8) || (x === 1 && y === 9) || (x === 3 && y === 9))) {
            const peak = this.add.triangle(
              px + TILE_SIZE / 2,
              py + TILE_SIZE / 2 + 8,
              0,
              12,
              16,
              -8,
              32,
              12,
              0x333333
            );
            this.tileContainer.add(peak);
          }
        }
      }
    }
  }

  private renderObjects() {
    this.objectContainer.removeAll(true);

    for (const obj of this.mapObjects) {
      const px = obj.x * TILE_SIZE + TILE_SIZE / 2;
      const py = obj.y * TILE_SIZE + TILE_SIZE / 2;

      if (obj.type === 'CASTLE' || obj.type === 'ENEMY_CASTLE') {
        const castleX = obj.x * TILE_SIZE + TILE_SIZE / 2;
        const castleY = (obj.y - 0.5) * TILE_SIZE + TILE_SIZE / 2;
        const textureKey = obj.hasFort ? 'town_knight_fort' : 'town_knight';
        const castleImg = this.add.image(castleX, castleY, textureKey);
        castleImg.setDisplaySize(144, 96);
        castleImg.setOrigin(0.5, 0.5);
        this.objectContainer.add(castleImg);
        continue;
      }

      let iconColor = 0xffd700;
      let symbol = '$';

      if (obj.type === 'GOLD_MINE') {
        iconColor = 0xf59e0b;
        symbol = '⛏️';
      } else if (obj.type === 'SAWMILL') {
        iconColor = 0x10b981;
        symbol = '🪵';
      } else if (obj.type === 'CHEST') {
        if (obj.collected) continue;
        iconColor = 0xa855f7;
        symbol = '🎁';
      } else if (obj.type === 'MONSTER_CAMP') {
        if (obj.defeated) continue;
        iconColor = 0xd97706;
        symbol = '👹';
      }

      const bg = this.add.circle(px, py, 18, 0x0f172a, 0.85);
      bg.setStrokeStyle(2, iconColor);
      this.objectContainer.add(bg);

      const text = this.add.text(px, py, symbol, {
        fontSize: '20px',
      }).setOrigin(0.5);
      this.objectContainer.add(text);
    }
  }

  private setupHero() {
    const px = this.heroGridX * TILE_SIZE + TILE_SIZE / 2;
    const py = this.heroGridY * TILE_SIZE + TILE_SIZE * 0.85;

    this.heroSprite = this.add.sprite(px, py, `hero_${this.currentHeroClass}`, 36);
    this.heroSprite.setOrigin(0.5, 0.90625);
    this.heroSprite.setDepth(15);
    this.lastDirection = { animName: 'walk-down', idleFrame: 36, flipX: false };
  }

  private updateFogOfWar() {
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const dist = Math.hypot(x - this.heroGridX, y - this.heroGridY);
        const node = this.mapGrid[y][x];

        if (dist <= this.scoutingRadius) {
          node.isExplored = true;
          node.isVisible = true;
        } else {
          node.isVisible = false;
        }
      }
    }
  }

  private renderFogOverlay() {
    this.fogContainer.removeAll(true);

    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const node = this.mapGrid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (!node.isExplored) {
          const fogRect = this.add.rectangle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x030712, 0.95);
          this.fogContainer.add(fogRect);
        } else if (!node.isVisible) {
          const fogRect = this.add.rectangle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x030712, 0.55);
          this.fogContainer.add(fogRect);
        }
      }
    }
  }

  private calculateAndShowPath(targetX: number, targetY: number) {
    this.pathContainer.removeAll(true);

    if (this.isMoving) return;

    const path = findPath(this.mapGrid, this.heroGridX, this.heroGridY, targetX, targetY, this.mapWidth, this.mapHeight);
    if (path.length <= 1) {
      this.currentPath = [];
      return;
    }

    this.currentPath = path;
    this.drawPathArrows(1);
  }

  private renderSelectionMarker() {
    this.selectionContainer.removeAll(true);
    if (!this.selectedDestination) return;

    const px = this.selectedDestination.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.selectedDestination.y * TILE_SIZE + TILE_SIZE / 2;

    const ring = this.add.circle(px, py, TILE_SIZE * 0.45, 0x38bdf8, 0.2);
    ring.setStrokeStyle(2, 0x38bdf8, 0.9);
    this.selectionContainer.add(ring);

    const crosshair = this.add.text(px, py, '🎯', { fontSize: '18px' }).setOrigin(0.5);
    this.selectionContainer.add(crosshair);
  }

  private drawPathArrows(fromIndex: number) {
    this.pathContainer.removeAll(true);

    let accumulatedCost = 0;
    for (let i = 1; i < this.currentPath.length; i++) {
      const prev = this.currentPath[i - 1];
      const pt = this.currentPath[i];
      const node = this.mapGrid[pt.y][pt.x];
      const isDiag = prev.x !== pt.x && prev.y !== pt.y;
      const stepCost = node.mpCost * (isDiag ? 1.414 : 1.0);
      accumulatedCost += stepCost;

      if (i < fromIndex) continue;

      const px = pt.x * TILE_SIZE + TILE_SIZE / 2;
      const py = pt.y * TILE_SIZE + TILE_SIZE / 2;

      const reachable = accumulatedCost <= this.currentMP;
      const badgeColor = reachable ? 0x16a34a : 0xdc2626;

      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      let arrowChar = '•';
      if (dx === 0 && dy < 0) arrowChar = '↑';
      else if (dx > 0 && dy < 0) arrowChar = '↗';
      else if (dx > 0 && dy === 0) arrowChar = '→';
      else if (dx > 0 && dy > 0) arrowChar = '↘';
      else if (dx === 0 && dy > 0) arrowChar = '↓';
      else if (dx < 0 && dy > 0) arrowChar = '↙';
      else if (dx < 0 && dy === 0) arrowChar = '←';
      else if (dx < 0 && dy < 0) arrowChar = '↖';

      const circleBg = this.add.circle(px, py, 15, badgeColor, 0.9);
      circleBg.setStrokeStyle(1.5, 0xffffff, 0.8);
      this.pathContainer.add(circleBg);

      const arrowText = this.add.text(px, py, arrowChar, {
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.pathContainer.add(arrowText);
    }
  }

  private tryMoveAlongPath(targetX: number, targetY: number) {
    if (this.currentPath.length <= 1 || this.isMoving) return;

    this.isMoving = true;
    this.selectionContainer.removeAll(true);
    this.executeNextStep(1);
  }

  private executeNextStep(pathIndex: number) {
    if (pathIndex >= this.currentPath.length || this.currentMP <= 0) {
      this.isMoving = false;
      this.heroSprite.stop();
      this.heroSprite.setFlipX(this.lastDirection.flipX);
      this.heroSprite.setFrame(this.lastDirection.idleFrame);
      this.currentPath = [];
      this.pathContainer.removeAll(true);
      this.selectedDestination = null;
      this.pushStateUpdate();
      return;
    }

    const nextPt = this.currentPath[pathIndex];
    const prevPt = this.currentPath[pathIndex - 1];
    const node = this.mapGrid[nextPt.y][nextPt.x];
    const isDiag = prevPt.x !== nextPt.x && prevPt.y !== nextPt.y;
    const stepCost = node.mpCost * (isDiag ? 1.414 : 1.0);

    if (this.currentMP < stepCost) {
      this.isMoving = false;
      this.heroSprite.stop();
      this.heroSprite.setFlipX(this.lastDirection.flipX);
      this.heroSprite.setFrame(this.lastDirection.idleFrame);
      this.onLogEvent?.('Out of Movement Points for this turn!', 'warning');
      this.selectedDestination = null;
      this.pushStateUpdate();
      return;
    }

    this.currentMP -= stepCost;
    this.heroGridX = nextPt.x;
    this.heroGridY = nextPt.y;

    const dx = nextPt.x - prevPt.x;
    const dy = nextPt.y - prevPt.y;
    const dir = this.getDirection(dx, dy);
    this.lastDirection = dir;

    const animKey = `${this.currentHeroClass}_${dir.animName}`;
    this.heroSprite.setFlipX(dir.flipX);
    this.heroSprite.play(animKey, true);

    this.drawPathArrows(pathIndex + 1);

    const targetWorldX = nextPt.x * TILE_SIZE + TILE_SIZE / 2;
    const targetWorldY = nextPt.y * TILE_SIZE + TILE_SIZE * 0.85;

    this.tweens.add({
      targets: this.heroSprite,
      x: targetWorldX,
      y: targetWorldY,
      duration: 90,
      ease: 'Linear',
      onComplete: () => {
        this.updateFogOfWar();
        this.renderFogOverlay();

        if (node.object) {
          this.handleObjectInteraction(node.object);
          this.isMoving = false;
          this.heroSprite.stop();
          this.heroSprite.setFlipX(this.lastDirection.flipX);
          this.heroSprite.setFrame(this.lastDirection.idleFrame);
          this.currentPath = [];
          this.pathContainer.removeAll(true);
          this.selectionContainer.removeAll(true);
          this.selectedDestination = null;
          this.pushStateUpdate();
          return;
        }

        this.executeNextStep(pathIndex + 1);
      },
    });
  }

  private handleObjectInteraction(obj: MapObject) {
    if (obj.type === 'CASTLE') {
      this.onLogEvent?.(`Entered Castle Town. Welcome, Lord!`, 'success');
      this.onInteraction?.(obj);
    } else if (obj.type === 'CHEST' && !obj.collected) {
      obj.collected = true;
      this.onLogEvent?.(`Collected Treasure (${obj.value || 500} Gold)!`, 'success');
      this.renderObjects();
    } else if (obj.type === 'GOLD_MINE') {
      obj.claimedBy = 'PLAYER';
      this.onLogEvent?.(`Claimed Gold Mine (+500 Gold/turn)!`, 'success');
      this.onInteraction?.(obj);
    } else if (obj.type === 'SAWMILL') {
      obj.claimedBy = 'PLAYER';
      this.onLogEvent?.(`Claimed Sawmill (+5 Wood/turn)!`, 'success');
      this.onInteraction?.(obj);
    } else if (obj.type === 'MONSTER_CAMP' && !obj.defeated) {
      obj.defeated = true;
      this.onLogEvent?.(`Defeated Monster Camp!`, 'combat');
      this.renderObjects();
    } else if (obj.type === 'ENEMY_CASTLE') {
      this.onLogEvent?.(`Victory! Conquered Enemy Stronghold!`, 'success');
      this.scene.start('VictoryScene');
    }
  }

  public endTurn() {
    if (this.isMoving) return;
    this.currentMP = this.maxMP;
    this.onLogEvent?.('New turn. MP restored.', 'info');
    this.selectedDestination = null;
    this.selectionContainer?.removeAll(true);
    this.pushStateUpdate();
  }

  private pushStateUpdate() {
    this.onStateUpdate?.({
      heroClass: this.currentHeroClass,
      currentMP: Math.round(this.currentMP * 10) / 10,
      maxMP: this.maxMP,
      heroX: this.heroGridX,
      heroY: this.heroGridY,
      hasSelectedDestination: !!this.selectedDestination,
    });
  }
}
