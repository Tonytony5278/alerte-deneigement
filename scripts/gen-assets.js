// Generates placeholder PNG assets for Expo — no external dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crc]);
}

function createPNG(width, height, r, g, b) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  // ihdrData[10..12] = 0 (deflate, adaptive filter, non-interlaced)
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Build raw image rows
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const off = y * rowSize;
    rawData[off] = 0; // filter none
    for (let x = 0; x < width; x++) {
      rawData[off + 1 + x * 3] = r;
      rawData[off + 1 + x * 3 + 1] = g;
      rawData[off + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const OUT = path.join(__dirname, '..', 'apps', 'mobile', 'assets', 'images');
fs.mkdirSync(OUT, { recursive: true });

// [filename, width, height, R, G, B]
const assets = [
  ['icon.png',             1024, 1024,  27,  87, 187], // #1B57BB brand blue
  ['adaptive-icon.png',    1024, 1024,  27,  87, 187],
  ['splash.png',           1284, 2778,  15,  23,  42], // #0F172A near-black
  ['favicon.png',            32,   32,  27,  87, 187],
  ['notification-icon.png',  96,   96, 255, 255, 255], // white (Android notif icon)
];

for (const [name, w, h, r, g, b] of assets) {
  const buf = createPNG(w, h, r, g, b);
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`✓ ${name} (${w}×${h}, ${(buf.length / 1024).toFixed(1)} KB)`);
}

console.log('\nAll placeholder assets created.');
