/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function parseMapFile(file: File): Promise<any> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 1. Try JSON first
  try {
    const textDecoder = new TextDecoder('utf-8');
    const jsonStr = textDecoder.decode(bytes);
    const parsed = JSON.parse(jsonStr.trim());
    if (parsed && (parsed.grid || parsed.scenario || parsed.entities || parsed.objects)) {
      return parsed;
    }
  } catch (e) {
    // Not JSON, parse as binary HoMM1 .MAP format
  }

  return parseMapBinary(bytes);
}

function readNullTerminatedString(bytes: Uint8Array, offset: number, maxLength: number): { str: string; nextOffset: number } {
  let end = offset;
  const maxEnd = Math.min(offset + maxLength, bytes.length);
  while (end < maxEnd && bytes[end] !== 0x00) {
    end++;
  }
  const slice = bytes.slice(offset, end);
  const decoder = new TextDecoder('windows-1252');
  const str = decoder.decode(slice).trim();
  return { str, nextOffset: offset + maxLength };
}

export function parseMapBinary(bytes: Uint8Array): any {
  let offset = 0;

  // 1. Read Map Title (64 bytes null-terminated)
  const titleResult = readNullTerminatedString(bytes, offset, 64);
  const title = titleResult.str || 'Custom HoMM1 Map';
  offset = 64;

  // 2. Read Map Description (256 bytes null-terminated)
  const descResult = readNullTerminatedString(bytes, offset, 256);
  const description = descResult.str || '';
  offset = 320;

  // 3. Read Dimensions from header or calculate from remaining file size
  let width = 36;
  let height = 36;
  if (offset + 4 <= bytes.length) {
    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const w = dataView.getUint16(offset, true);
    const h = dataView.getUint16(offset + 2, true);
    if (w >= 10 && w <= 256 && h >= 10 && h <= 256) {
      width = w;
      height = h;
      offset += 4;
    } else {
      const remainingBytes = bytes.length - offset;
      const side = Math.floor(Math.sqrt(remainingBytes));
      if (side >= 16 && side <= 128) {
        width = side;
        height = side;
      }
    }
  }

  const grid: any[] = [];
  const entities: any[] = [];

  // 4. Read actual terrain byte stream from file buffer
  const terrainMap: Record<number, string> = {
    0: 'Grass',
    1: 'Dirt',
    2: 'Water',
    3: 'Mountain',
    4: 'Road',
    5: 'Swamp',
    6: 'Rough',
    7: 'Wall',
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let terrain = 'Grass';
      if (offset < bytes.length) {
        const tByte = bytes[offset++];
        terrain = terrainMap[tByte % 8] || 'Grass';
      } else {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          terrain = 'Mountain';
        }
      }
      grid.push({ x, y, terrain, overlay: null });
    }
  }

  // 5. Read actual entities / objects from subsequent bytes in the binary stream
  while (offset + 4 <= bytes.length) {
    const eTypeByte = bytes[offset++];
    const ex = bytes[offset++];
    const ey = bytes[offset++];
    const eOwner = bytes[offset++];

    if (eTypeByte === 0xff || (eTypeByte === 0x00 && ex === 0 && ey === 0)) {
      break;
    }

    if (ex < width && ey < height) {
      let type = 'Castle';
      let subType = 'KnightCastle';
      let owner: number | null = eOwner === 0 ? 0 : eOwner === 1 ? 1 : eOwner === 2 ? 2 : eOwner === 3 ? 3 : null;

      if (eTypeByte === 1) { type = 'Castle'; subType = owner === 1 ? 'NecropolisCastle' : owner === 2 ? 'WarlockCastle' : owner === 3 ? 'BarbarianCastle' : 'KnightCastle'; }
      else if (eTypeByte === 2) { type = 'Mine'; subType = 'GoldMine'; owner = null; }
      else if (eTypeByte === 3) { type = 'Resource'; subType = 'Sawmill'; owner = null; }
      else if (eTypeByte === 4) { type = 'Resource'; subType = 'Chest'; owner = null; }
      else if (eTypeByte === 5) { type = 'Monster'; subType = 'GoblinCamp'; owner = null; }

      entities.push({
        id: `binary_ent_${entities.length + 1}`,
        type,
        subType,
        position: { x: ex, y: ey },
        owner,
      });
    }
  }

  if (!entities.some(e => e.type === 'Castle' && e.owner === 0)) {
    entities.push({
      id: 'castle_default',
      type: 'Castle',
      subType: 'KnightCastle',
      position: { x: Math.min(2, width - 2), y: Math.floor(height / 2) },
      owner: 0,
    });
  }

  return {
    scenario: { title, description, dimensions: { width, height } },
    grid,
    entities,
  };
}

export function parseMapTextContent(text: string, defaultTitle = 'Custom Uploaded Map'): any {
  try {
    const json = JSON.parse(text);
    if (json && (json.grid || json.scenario || json.entities || json.objects)) {
      return json;
    }
  } catch (e) {}

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let title = defaultTitle;
  let description = 'Imported from scenario file.';
  let width = 22;
  let height = 18;
  const grid: any[] = [];
  const entities: any[] = [];
  const terrainRows: string[] = [];

  for (const line of lines) {
    if (line.startsWith('TITLE:')) {
      title = line.replace('TITLE:', '').trim();
      continue;
    }
    if (line.startsWith('DIMENSIONS:') || line.startsWith('SIZE:')) {
      const parts = line.replace(/DIMENSIONS:|SIZE:/i, '').trim().split(/[\s,x]+/).map(Number);
      if (parts.length >= 2) {
        width = parts[0];
        height = parts[1];
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        width = parts[0];
        height = parts[0];
      }
      continue;
    }
    if (line.startsWith('WIDTH:')) {
      width = parseInt(line.replace('WIDTH:', '').trim()) || width;
      continue;
    }
    if (line.startsWith('HEIGHT:')) {
      height = parseInt(line.replace('HEIGHT:', '').trim()) || height;
      continue;
    }

    if (/^(CASTLE|TOWN|MINE|SAWMILL|CHEST|MONSTER|ENTITY):/i.test(line)) {
      const parts = line.split(':');
      const typeStr = parts[0].trim();
      const rest = parts[1] || '';
      const coords = rest.match(/x\s*[:=]\s*(\d+)/i);
      const yCoords = rest.match(/y\s*[:=]\s*(\d+)/i);
      const ownerMatch = rest.match(/owner\s*[:=]\s*(\d+)/i);

      if (coords && yCoords) {
        const x = parseInt(coords[1]);
        const y = parseInt(yCoords[1]);
        let type = 'Castle';
        let subType = 'KnightCastle';
        let owner = ownerMatch ? parseInt(ownerMatch[1]) : null;

        if (/mine/i.test(typeStr)) { type = 'Mine'; subType = 'GoldMine'; owner = null; }
        else if (/sawmill|resource/i.test(typeStr)) { type = 'Resource'; subType = 'Sawmill'; owner = null; }
        else if (/chest|treasure/i.test(typeStr)) { type = 'Resource'; subType = 'Chest'; owner = null; }
        else if (/monster/i.test(typeStr)) { type = 'Monster'; subType = 'GoblinCamp'; owner = null; }
        else if (/town|castle/i.test(typeStr)) { type = 'Castle'; subType = owner === 1 ? 'NecropolisCastle' : 'KnightCastle'; }

        entities.push({
          id: `ent_${entities.length + 1}`,
          type,
          subType,
          position: { x, y },
          owner,
        });
      }
      continue;
    }

    if (/^[GDWMRS\.\#\~\^\s]+$/i.test(line) && line.length >= 3) {
      terrainRows.push(line);
      if (line.length > width) {
        width = line.length;
      }
    }
  }

  if (terrainRows.length > 0) {
    height = terrainRows.length;
    if (width === 0) width = Math.max(...terrainRows.map((l) => l.length));

    for (let y = 0; y < height; y++) {
      const rowStr = terrainRows[y] || '';
      for (let x = 0; x < width; x++) {
        const char = (rowStr[x] || '.').toUpperCase();
        let terrain = 'Grass';
        if (char === 'D') terrain = 'Dirt';
        else if (char === 'W') terrain = 'Water';
        else if (char === 'M' || char === '^') terrain = 'Mountain';
        else if (char === 'R') terrain = 'Road';
        else if (char === 'S') terrain = 'Swamp';
        else if (char === '#') terrain = 'Wall';

        grid.push({ x, y, terrain, overlay: null });
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let terrain = 'Grass';
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          terrain = 'Mountain';
        }
        grid.push({ x, y, terrain, overlay: null });
      }
    }
  }

  if (entities.length === 0) {
    entities.push(
      { id: 'castle_1', type: 'Castle', subType: 'KnightCastle', position: { x: Math.min(2, width - 2), y: Math.floor(height / 2) }, owner: 0, quantity: null },
      { id: 'castle_2', type: 'Castle', subType: 'NecropolisCastle', position: { x: Math.max(width - 3, 2), y: Math.floor(height / 2) }, owner: 1, quantity: null }
    );
  }

  return {
    scenario: { title, description, dimensions: { width, height } },
    grid,
    entities,
  };
}
