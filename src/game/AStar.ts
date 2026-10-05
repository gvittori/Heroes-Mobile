import { MapNode, TERRAIN_CONFIGS } from '../types';

export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export function findPath(
  grid: MapNode[][],
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  width: number,
  height: number
): { x: number; y: number }[] {
  // Validate bounds
  if (
    targetX < 0 ||
    targetX >= width ||
    targetY < 0 ||
    targetY >= height ||
    startX < 0 ||
    startX >= width ||
    startY < 0 ||
    startY >= height
  ) {
    return [];
  }

  const targetNode = grid[targetY][targetX];
  const targetConfig = TERRAIN_CONFIGS[targetNode.terrainType];
  if (targetConfig.impassable) {
    return [];
  }

  const openSet: PathNode[] = [];
  const closedSet: Set<string> = new Set();

  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, targetX, targetY),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    const current = openSet.splice(lowestIndex, 1)[0];

    // Check if we reached target
    if (current.x === targetX && current.y === targetY) {
      const path: { x: number; y: number }[] = [];
      let curr: PathNode | null = current;
      while (curr !== null) {
        path.unshift({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    // 8-directional neighbors
    const directions = [
      { dx: 0, dy: -1, costMultiplier: 1.0 }, // Up
      { dx: 0, dy: 1, costMultiplier: 1.0 }, // Down
      { dx: -1, dy: 0, costMultiplier: 1.0 }, // Left
      { dx: 1, dy: 0, costMultiplier: 1.0 }, // Right
      { dx: -1, dy: -1, costMultiplier: 1.414 }, // Top-Left
      { dx: 1, dy: -1, costMultiplier: 1.414 }, // Top-Right
      { dx: -1, dy: 1, costMultiplier: 1.414 }, // Bottom-Left
      { dx: 1, dy: 1, costMultiplier: 1.414 }, // Bottom-Right
    ];

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const neighborMapNode = grid[ny][nx];
      const terrainConf = TERRAIN_CONFIGS[neighborMapNode.terrainType];

      if (terrainConf.impassable) continue;

      const key = `${nx},${ny}`;
      if (closedSet.has(key)) continue;

      // Calculate move cost
      const baseCost = neighborMapNode.mpCost;
      const moveCost = baseCost * dir.costMultiplier;
      const tentativeG = current.g + moveCost;

      let neighborOpenNode = openSet.find((node) => node.x === nx && node.y === ny);

      if (!neighborOpenNode) {
        neighborOpenNode = {
          x: nx,
          y: ny,
          g: tentativeG,
          h: heuristic(nx, ny, targetX, targetY),
          f: 0,
          parent: current,
        };
        neighborOpenNode.f = neighborOpenNode.g + neighborOpenNode.h;
        openSet.push(neighborOpenNode);
      } else if (tentativeG < neighborOpenNode.g) {
        neighborOpenNode.g = tentativeG;
        neighborOpenNode.f = neighborOpenNode.g + neighborOpenNode.h;
        neighborOpenNode.parent = current;
      }
    }
  }

  return [];
}

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  // Octile distance for 8-directional movement
  const F = 1.414 - 1;
  return dx < dy ? F * dx + dy : F * dy + dx;
}
