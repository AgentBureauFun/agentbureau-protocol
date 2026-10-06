// Minimal PNG reader (8-bit, non-interlaced, colour types 2 and 6). Used by the build and the gates.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export function readPng(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let i = 8;
  let w = 0, h = 0, depth = 0, ct = 0, il = 0;
  const idat = [];
  while (i < b.length) {
    const len = b.readUInt32BE(i);
    const type = b.toString('latin1', i + 4, i + 8);
    const data = b.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; il = data[12];
    } else if (type === 'IDAT') idat.push(data);
    i += 12 + len;
  }
  if (depth !== 8 || il !== 0 || (ct !== 2 && ct !== 6)) throw new Error(`unsupported png ct=${ct} depth=${depth}`);
  const ch = ct === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[o + x - ch] : 0;
      const up = y ? out[o - stride + x] : 0;
      const c = x >= ch && y ? out[o - stride + x - ch] : 0;
      let v = row[x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      out[o + x] = v & 255;
    }
  }
  return { w, h, ch, ct, data: out, px: (x, y) => Array.from(out.subarray((y * w + x) * ch, (y * w + x) * ch + ch)) };
}
