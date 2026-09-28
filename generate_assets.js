const fs = require('fs');
const path = require('path');

// Minimal valid PNG buffer generator
function createSolidPNGBuffer(width, height, r = 0, g = 120, b = 212) {
    const zlib = require('zlib');
    
    // PNG Header
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR Chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // color type (RGB)
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace
    const ihdrChunk = createChunk('IHDR', ihdr);
    
    // IDAT Chunk (Raw RGB image data with filter byte 0 per scanline)
    const rawData = [];
    for (let y = 0; y < height; y++) {
        rawData.push(0); // filter byte
        for (let x = 0; x < width; x++) {
            rawData.push(r, g, b);
        }
    }
    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const idatChunk = createChunk('IDAT', compressed);
    
    // IEND Chunk
    const iendChunk = createChunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
    }
    return (c ^ 0xffffffff) >>> 0;
}

const assetsDir = path.join(__dirname, 'Assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(path.join(assetsDir, 'Square150x150Logo.png'), createSolidPNGBuffer(150, 150, 0, 120, 212));
fs.writeFileSync(path.join(assetsDir, 'Square44x44Logo.png'), createSolidPNGBuffer(44, 44, 0, 120, 212));
fs.writeFileSync(path.join(assetsDir, 'StoreLogo.png'), createSolidPNGBuffer(50, 50, 0, 120, 212));
fs.writeFileSync(path.join(assetsDir, 'SplashScreen.png'), createSolidPNGBuffer(620, 300, 18, 18, 18));

console.log('UWP Asset PNGs generated successfully!');
