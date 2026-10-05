export type TerrainType = 'ROAD' | 'GRASS' | 'DIRT' | 'ROUGH' | 'SWAMP' | 'WATER' | 'MOUNTAIN' | 'WALL';

export interface TerrainConfig {
  cost: number;
  name: string;
  color: number;
  impassable: boolean;
}

export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  ROAD: { cost: 0.75, name: 'Road', color: 0xc2b280, impassable: false },
  GRASS: { cost: 1.0, name: 'Grassland', color: 0x4a7c59, impassable: false },
  DIRT: { cost: 1.0, name: 'Dirt Path', color: 0x8b5a2b, impassable: false },
  ROUGH: { cost: 1.5, name: 'Rough Terrain', color: 0x708090, impassable: false },
  SWAMP: { cost: 2.0, name: 'Swamp', color: 0x2f4f4f, impassable: false },
  WATER: { cost: Infinity, name: 'Water', color: 0x1e3f66, impassable: true },
  MOUNTAIN: { cost: Infinity, name: 'Mountain', color: 0x555555, impassable: true },
  WALL: { cost: Infinity, name: 'Castle Wall', color: 0x4a7c59, impassable: true },
};

export type ObjectType = 'GOLD_MINE' | 'SAWMILL' | 'CHEST' | 'MONSTER_CAMP' | 'CASTLE' | 'ENEMY_CASTLE';

export type HeroClass = 'knight' | 'barbarian' | 'sorceress' | 'warlock';

export interface MapObject {
  id: string;
  type: ObjectType;
  name: string;
  x: number;
  y: number;
  claimedBy?: 'PLAYER' | 'ENEMY' | null;
  collected?: boolean;
  defeated?: boolean;
  value?: number;
  hasFort?: boolean;
}

export interface MapNode {
  x: number;
  y: number;
  terrainType: TerrainType;
  mpCost: number;
  isExplored: boolean;
  isVisible: boolean;
  occupant?: 'PLAYER' | 'ENEMY' | null;
  object?: MapObject | null;
}

export interface HeroState {
  x: number;
  y: number;
  currentMP: number;
  maxMP: number;
  scoutingRadius: number;
  gold: number;
  wood: number;
  ore: number;
  attack: number;
  defense: number;
  armyCount: number;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'combat';
}
