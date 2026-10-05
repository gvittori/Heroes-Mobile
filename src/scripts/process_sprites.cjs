const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function encodePng(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgbaBuffer.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idatData = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function decodePng(filename) {
  const buf = fs.readFileSync(filename);
  let pos = 8;
  let idatList = [];
  let width, height;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idatList.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const idat = Buffer.concat(idatList);
  const raw = zlib.inflateSync(idat);
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const image = Buffer.alloc(width * height * bytesPerPixel);
  let rawPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rawPos++];
    const lineStart = y * stride;
    for (let x = 0; x < stride; x++) {
      let val = raw[rawPos++];
      let a = x >= bytesPerPixel ? image[lineStart + x - bytesPerPixel] : 0;
      let b = y > 0 ? image[lineStart - stride + x] : 0;
      let c = (x >= bytesPerPixel && y > 0) ? image[lineStart - stride + x - bytesPerPixel] : 0;
      if (filter === 0) {}
      else if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = c;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        val = (val + pr) & 0xff;
      }
      image[lineStart + x] = val;
    }
  }
  return { width, height, image };
}

function processHero(heroKey, fileName, rowYRanges) {
  const filePath = path.resolve(__dirname, '../res/sprites', fileName);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  const { width, height, image } = decodePng(filePath);

  const frameW = 64;
  const frameH = 64;
  const cols = 18;
  const rows = 3;
  const outW = cols * frameW; // 1152
  const outH = rows * frameH; // 192
  const outBuf = Buffer.alloc(outW * outH * 4); // 100% transparent background

  rowYRanges.forEach((r, rowIdx) => {
    // Detect 18 columns in this row
    const colCounts = [];
    for (let x = 0; x < width; x++) {
      let nonCyan = 0;
      for (let y = r.y0; y < r.y1; y++) {
        const idx = (y * width + x) * 4;
        if (!(image[idx] === 0 && image[idx + 1] === 255 && image[idx + 2] === 255)) nonCyan++;
      }
      colCounts.push(nonCyan);
    }
    let colRanges = [];
    let inC = false;
    let startX = 0;
    for (let x = 0; x < width; x++) {
      if (colCounts[x] > 0 && !inC) {
        inC = true;
        startX = x;
      } else if (colCounts[x] === 0 && inC) {
        inC = false;
        colRanges.push({ startX, endX: x - 1, w: x - startX });
      }
    }
    if (inC) colRanges.push({ startX, endX: width - 1, w: width - startX });

    colRanges.forEach((col, colIdx) => {
      if (colIdx >= 18) return;
      let minX = col.startX, maxX = col.endX;
      let minY = 9999, maxY = -1;

      for (let y = r.y0; y < r.y1; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = (y * width + x) * 4;
          if (!(image[idx] === 0 && image[idx + 1] === 255 && image[idx + 2] === 255)) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxY === -1) return;

      const spriteW = maxX - minX + 1;
      const spriteH = maxY - minY + 1;

      // Center horizontally in 64px cell
      const destCellX = colIdx * frameW;
      const offsetX = Math.floor((frameW - spriteW) / 2);

      // Bottom align with generous padding from borders (ground baseline at y = 58 in 64px cell)
      const destCellY = rowIdx * frameH;
      const groundY = 58;
      const offsetY = groundY - spriteH;

      for (let sy = minY; sy <= maxY; sy++) {
        const dy = destCellY + offsetY + (sy - minY);
        for (let sx = minX; sx <= maxX; sx++) {
          const dx = destCellX + offsetX + (sx - minX);
          const sIdx = (sy * width + sx) * 4;
          const dIdx = (dy * outW + dx) * 4;
          const red = image[sIdx], green = image[sIdx + 1], blue = image[sIdx + 2];
          if (!(red === 0 && green === 255 && blue === 255)) {
            outBuf[dIdx] = red;
            outBuf[dIdx + 1] = green;
            outBuf[dIdx + 2] = blue;
            outBuf[dIdx + 3] = 255;
          }
        }
      }
    });
  });

  const outDir = path.resolve(__dirname, '../public/sprites');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPng = encodePng(outW, outH, outBuf);
  const outPath = path.join(outDir, `hero_${heroKey}.png`);
  fs.writeFileSync(outPath, outPng);
  console.log(`Saved ${outPath} (${outPng.length} bytes)`);
}

// Process Knight
processHero('knight', 'hero_knight.png', [
  { y0: 0, y1: 54 },
  { y0: 58, y1: 112 },
  { y0: 119, y1: 173 },
]);

// Process Barbarian
processHero('barbarian', 'hero_barbarian.png', [
  { y0: 0, y1: 54 },
  { y0: 75, y1: 126 },
  { y0: 161, y1: 212 },
]);

// Process Sorceress
processHero('sorceress', 'hero_sorceress.png', [
  { y0: 0, y1: 54 },
  { y0: 61, y1: 112 },
  { y0: 118, y1: 169 },
]);

// Process Warlock
processHero('warlock', 'hero_warlock.png', [
  { y0: 0, y1: 54 },
  { y0: 60, y1: 111 },
  { y0: 119, y1: 170 },
]);
