/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapNode, MapObject, TerrainType, TERRAIN_CONFIGS } from '../types';

export const MAP_WIDTH = 22;
export const MAP_HEIGHT = 18;

/**
 * Serializes map scenario headers into a binary .MAP buffer using single-byte Windows-1252 / ASCII encoding
 * and null-terminated strings (0x00).
 */
export function serializeMapToBinary(mapData: { scenario: { title: string; dimensions: { width: number; height: number } }; grid: any[]; entities: any[] }): Uint8Array {
  const title = mapData.scenario?.title || 'HoMM1 Adventure Map';
  const headerSize = 128;
  const buffer = new ArrayBuffer(headerSize + 1024);
  const uint8 = new Uint8Array(buffer);

  const writeNullTerminatedString = (str: string, maxLength: number, offset: number) => {
    const maxLen = Math.min(str.length, maxLength - 1);
    for (let i = 0; i < maxLen; i++) {
      uint8[offset + i] = str.charCodeAt(i) & 0xff;
    }
    uint8[offset + maxLen] = 0x00;
  };

  writeNullTerminatedString(title, 64, 0);

  return uint8;
}

export function generateAdventureMap(customMap?: any): { grid: MapNode[][]; objects: MapObject[]; playerStart: { x: number; y: number } } {
  const width = customMap?.scenario?.dimensions?.width || MAP_WIDTH;
  const height = customMap?.scenario?.dimensions?.height || MAP_HEIGHT;

  const grid: MapNode[][] = [];
  const objects: MapObject[] = [];

  // Strictly load from customMap if provided
  if (customMap && (customMap.grid || customMap.entities || customMap.objects)) {
    const gridMap = new Map<string, string>();
    for (const gNode of customMap.grid || []) {
      gridMap.set(`${gNode.x},${gNode.y}`, (gNode.terrain || '').toUpperCase());
    }

    for (let y = 0; y < height; y++) {
      const row: MapNode[] = [];
      for (let x = 0; x < width; x++) {
        let tStr = gridMap.get(`${x},${y}`) || 'GRASS';
        let terrain: TerrainType = 'GRASS';
        if (tStr.includes('ROAD')) terrain = 'ROAD';
        else if (tStr.includes('DIRT')) terrain = 'DIRT';
        else if (tStr.includes('WATER')) terrain = 'WATER';
        else if (tStr.includes('SWAMP')) terrain = 'SWAMP';
        else if (tStr.includes('ROUGH') || tStr.includes('HILL')) terrain = 'ROUGH';
        else if (tStr.includes('MOUNTAIN')) terrain = 'MOUNTAIN';
        else if (tStr.includes('WALL') || tStr.includes('CASTLE')) terrain = 'WALL';

        const conf = TERRAIN_CONFIGS[terrain] || TERRAIN_CONFIGS['GRASS'];
        row.push({
          x,
          y,
          terrainType: terrain,
          mpCost: conf.cost,
          isExplored: false,
          isVisible: false,
          occupant: null,
          object: null,
        });
      }
      grid.push(row);
    }

    const rawEntities = customMap.entities || customMap.objects || [];
    rawEntities.forEach((ent: any, idx: number) => {
      let objType: any = 'GOLD_MINE';
      const eType = (ent.type || '').toLowerCase();
      const subType = (ent.subType || '').toLowerCase();
      const pos = ent.position || { x: ent.x || 0, y: ent.y || 0 };

      if (eType.includes('castle') || subType.includes('castle') || eType.includes('town')) {
        objType = ent.owner === 0 ? 'CASTLE' : 'ENEMY_CASTLE';
      } else if (eType.includes('mine') || subType.includes('mine')) {
        objType = 'GOLD_MINE';
      } else if (eType.includes('sawmill') || subType.includes('resource') && !subType.includes('chest')) {
        objType = 'SAWMILL';
      } else if (subType.includes('chest') || subType.includes('treasure') || eType.includes('chest')) {
        objType = 'CHEST';
      } else if (eType.includes('monster') || subType.includes('camp') || subType.includes('guard')) {
        objType = 'MONSTER_CAMP';
      }

      objects.push({
        id: ent.id || `obj_${idx}`,
        type: objType,
        name: ent.subType || ent.type || 'Entity',
        x: pos.x,
        y: pos.y,
        claimedBy: ent.owner === 0 ? 'PLAYER' : ent.owner !== null && ent.owner !== undefined ? 'ENEMY' : null,
        hasFort: objType === 'CASTLE' ? true : objType === 'ENEMY_CASTLE' ? false : undefined,
        value: ent.quantity || ent.value || 500,
        collected: ent.collected,
        defeated: ent.defeated,
      });
    });

    for (const obj of objects) {
      if (grid[obj.y] && grid[obj.y][obj.x]) {
        grid[obj.y][obj.x].object = obj;
      }
    }

    const playerStartEntity = objects.find(o => o.type === 'CASTLE') || { x: 2, y: Math.floor(height / 2) };
    return {
      grid,
      objects,
      playerStart: { x: playerStartEntity.x, y: playerStartEntity.y }
    };
  }

  // Fallback default procedural terrain grid (only when no custom map is provided)
  for (let y = 0; y < height; y++) {
    const row: MapNode[] = [];
    for (let x = 0; x < width; x++) {
      let terrain: TerrainType = 'GRASS';

      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        terrain = 'MOUNTAIN';
      } else if (
        (x >= 1 && x <= 3 && y === 8) || (x === 1 && y === 9) || (x === 3 && y === 9)
      ) {
        terrain = 'WALL';
      } else if (x === 2 && y === 9) {
        terrain = 'ROAD';
      } else if (
        (x >= 12 && x <= 15 && y >= 4 && y <= 8) ||
        (x >= 3 && x <= 6 && y >= 12 && y <= 15)
      ) {
        terrain = 'WATER';
      } else if (
        x >= 15 && y >= 11
      ) {
        terrain = 'SWAMP';
      } else if (
        (x >= 3 && x <= 7 && y >= 2 && y <= 6) ||
        (x >= 17 && y >= 2 && y <= 5)
      ) {
        terrain = 'ROUGH';
      } else if (
        (y === 8 && x >= 4 && x <= width - 2) ||
        (x === 8 && y >= 2 && y <= height - 2) ||
        (x === 14 && y >= 5 && y <= height - 3)
      ) {
        terrain = 'DIRT';
      } else if (
        (x >= 2 && x <= 8 && y === 9) ||
        (x === 8 && y >= 3 && y === 9)
      ) {
        terrain = 'ROAD';
      }

      const conf = TERRAIN_CONFIGS[terrain];

      row.push({
        x,
        y,
        terrainType: terrain,
        mpCost: conf.cost,
        isExplored: false,
        isVisible: false,
        occupant: null,
        object: null,
      });
    }
    grid.push(row);
  }

  const rawObjects: Omit<MapObject, 'id'>[] = [
    { type: 'CASTLE', name: 'Castle Town', x: 2, y: 9, claimedBy: 'PLAYER', hasFort: true },
    { type: 'ENEMY_CASTLE', name: 'Necropolis Stronghold', x: 19, y: 9, claimedBy: 'ENEMY', hasFort: false },
    { type: 'GOLD_MINE', name: 'Ancient Gold Mine', x: 5, y: 3, claimedBy: null, value: 500 },
    { type: 'SAWMILL', name: 'Pine Sawmill', x: 10, y: 14, claimedBy: null, value: 5 },
    { type: 'CHEST', name: 'Hidden Treasure', x: 16, y: 2, collected: false, value: 1000 },
    { type: 'CHEST', name: 'Abandoned Chest', x: 4, y: 16, collected: false, value: 750 },
    { type: 'MONSTER_CAMP', name: 'Goblin Horde', x: 7, y: 7, defeated: false },
    { type: 'MONSTER_CAMP', name: 'Orc Raiders', x: 13, y: 7, defeated: false },
    { type: 'MONSTER_CAMP', name: 'Undead Skeletal Guard', x: 17, y: 13, defeated: false },
    { type: 'GOLD_MINE', name: 'Crystal Gold Mine', x: 19, y: 4, claimedBy: null, value: 500 },
  ];

  let objIdCounter = 1;
  for (const raw of rawObjects) {
    const obj: MapObject = {
      id: `obj_${objIdCounter++}`,
      ...raw,
    };
    objects.push(obj);
    grid[obj.y][obj.x].object = obj;
  }

  const playerStart = { x: 2, y: 9 };

  return { grid, objects, playerStart };
}
