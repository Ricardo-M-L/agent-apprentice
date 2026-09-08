import { writeFile, mkdir } from "node:fs/promises";
import { deflateSync } from "node:zlib";
// Original application mark: a rising A and a small learning spark. No external assets.
const size = 1024,
  pixels = Buffer.alloc((size * 4 + 1) * size);
const polygon = (x, y, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i],
      [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
};
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const i = y * (size * 4 + 1) + 1 + x * 4;
    const dx = Math.max(120 - x, 0, x - 904),
      dy = Math.max(120 - y, 0, y - 904);
    const alpha = dx * dx + dy * dy <= 120 * 120 ? 255 : 0;
    let color = [24, 28, 43];
    if (
      polygon(x, y, [
        [220, 760],
        [440, 250],
        [560, 250],
        [345, 760],
      ]) ||
      polygon(x, y, [
        [510, 360],
        [585, 535],
        [500, 535],
      ]) ||
      polygon(x, y, [
        [568, 493],
        [688, 760],
        [803, 760],
        [633, 372],
      ]) ||
      polygon(x, y, [
        [390, 610],
        [672, 610],
        [707, 690],
        [356, 690],
      ])
    )
      color = [193, 173, 245];
    if (
      polygon(x, y, [
        [769, 201],
        [790, 253],
        [841, 273],
        [790, 294],
        [769, 346],
        [748, 294],
        [697, 273],
        [748, 253],
      ])
    )
      color = [146, 212, 180];
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = alpha;
  }
function crc(b) {
  let c = 0xffffffff;
  for (const n of b) {
    c ^= n;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    n = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  n.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([n, t, data, checksum]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;
await mkdir("resources", { recursive: true });
await writeFile(
  "resources/icon.png",
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
