/* =========================================================================
   gen-icons.mjs — draws the app icons with zero dependencies and writes
   them into assets/.  Run:  node tools/gen-icons.mjs
   Art: a lit Moon, an amber orbit ring with a drifting debris chip, and a
   starfield on the exhibit's deep-space palette.
   ========================================================================= */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------ PNG encoder */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; /* filter: none */
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  /* bit depth  */
  ihdr[9] = 6;  /* RGBA       */
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------- draw space */
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderIcon(size, { maskable = false } = {}) {
  const SS = 4;                     /* supersample factor               */
  const N = size * SS;              /* working buffer edge              */
  const rgb = new Float32Array(N * N * 3);
  const rnd = mulberry32(0xab0f14); /* fixed seed — reproducible icons   */

  const put = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= N || y >= N || a <= 0) return;
    const i = (y * N + x) * 3;
    const k = a > 1 ? 1 : a;
    rgb[i] += (r - rgb[i]) * k;
    rgb[i + 1] += (g - rgb[i + 1]) * k;
    rgb[i + 2] += (b - rgb[i + 2]) * k;
  };

  /* 1. deep-space gradient + two soft colour auras (the exhibit's bg) */
  for (let y = 0; y < N; y++) {
    const v = y / N;
    const base = [10 + 6 * (1 - v), 14 + 8 * (1 - v), 30 + 14 * (1 - v)];
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 3;
      rgb[i] = base[0]; rgb[i + 1] = base[1]; rgb[i + 2] = base[2];
    }
  }
  const aura = (cx, cy, rr, col, amt) => {
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - cx, y - cy) / rr;
        if (d < 1) put(x, y, col[0], col[1], col[2], amt * (1 - d) * (1 - d));
      }
  };
  aura(N * 0.18, N * 0.14, N * 0.75, [66, 108, 205], 0.16);
  aura(N * 0.85, N * 0.88, N * 0.7, [226, 112, 58], 0.13);

  /* 2. starfield */
  const starCount = Math.max(45, Math.round(120 * (size / 512)));
  const starCols = [[233, 237, 246], [255, 246, 232], [190, 210, 255], [255, 212, 121]];
  for (let s = 0; s < starCount; s++) {
    const sx = rnd() * N, sy = rnd() * N;
    const rr = (0.55 + rnd() * 1.5) * SS * (size / 512) + 1;
    const c = starCols[(rnd() * starCols.length) | 0];
    const a0 = 0.3 + rnd() * 0.65;
    const R = Math.ceil(rr) + 1;
    for (let y = Math.floor(sy) - R; y <= sy + R; y++)
      for (let x = Math.floor(sx) - R; x <= sx + R; x++) {
        const d = Math.hypot(x + 0.5 - sx, y + 0.5 - sy);
        const fall = Math.max(0, 1 - d / rr);
        if (fall > 0) put(x, y, c[0], c[1], c[2], a0 * fall * fall);
      }
  }

  /* 3. geometry — full-bleed art, pulled into the maskable safe zone */
  const cx = N * 0.5, cy = N * 0.47;
  const R = N * (maskable ? 0.185 : 0.255);
  const A = R * 1.62, B = R * 0.60, W = Math.max(2, N * 0.011);
  const ring = (front) => {
    for (let y = Math.floor(cy - B - W * 3); y <= cy + B + W * 3; y++)
      for (let x = Math.floor(cx - A - W * 3); x <= cx + A + W * 3; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (front && dy < 0) continue;      /* only the near half rides in front */
        if (!front && dy >= 0) continue;    /* far half stays behind the Moon     */
        const e = Math.hypot(dx / A, dy / B);   /* 1 exactly on the ellipse       */
        const dist = Math.abs(e - 1) * Math.min(A, B); /* px distance approx      */
        const core = Math.max(0, 1 - dist / W);
        const glow = Math.max(0, 1 - dist / (W * 3.2));
        put(x, y, 255, 212, 121, 0.85 * core + 0.16 * glow);
      }
  };
  ring(false); /* far half behind the Moon */

  /* the Moon — lambert-lit sphere with a few crater fields */
  const craters = [
    [-0.38, -0.30, 0.17], [0.24, 0.16, 0.13], [-0.08, 0.47, 0.10],
    [0.44, -0.40, 0.11], [-0.56, 0.22, 0.12], [0.06, -0.14, 0.08],
    [0.52, 0.34, 0.08], [-0.24, -0.62, 0.09],
  ];
  const LX = 0.55, LY = -0.42, LZ = 0.72;   /* light from upper right */
  const Ln = Math.hypot(LX, LY, LZ);
  for (let y = Math.floor(cy - R * 1.05); y <= cy + R * 1.05; y++)
    for (let x = Math.floor(cx - R * 1.05); x <= cx + R * 1.05; x++) {
      const dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R;
      const d = Math.hypot(dx, dy);
      if (d > 1.05) continue;
      if (d <= 1) {
        const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
        const lam = Math.max(0, (dx * LX + dy * LY + nz * LZ) / Ln);
        let shade = 0.16 + 0.9 * Math.pow(lam, 0.85);
        for (const [fx, fy, fr] of craters) {
          const cd = Math.hypot(dx - fx, dy - fy) / fr;
          if (cd < 0.82) shade *= 0.9;
          else if (cd < 1.05) shade *= 1.07;
        }
        const edge = Math.min(1, (1 - d) * R / (0.06 * R));   /* AA rim */
        put(x, y, 176 * shade, 193 * shade, 220 * shade, edge);
      } else {
        /* thin amber atmosphere on the lit limb */
        const lit = Math.max(0, (dx * LX + dy * LY) / Math.hypot(LX, LY));
        put(x, y, 255, 212, 121, (1 - (d - 1) / 0.05) * 0.35 * lit);
      }
    }
  ring(true); /* near half sweeps in front */

  /* 4. the drifting debris chip on the near arc of the orbit */
  const t = 0.75, dx0 = A * Math.cos(t), dy0 = B * Math.sin(t);
  const px = cx + dx0, py = cy + dy0;
  const pr = N * (maskable ? 0.016 : 0.021);
  for (let y = Math.floor(py - pr * 3); y <= py + pr * 3; y++)
    for (let x = Math.floor(px - pr * 3); x <= px + pr * 3; x++) {
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (d <= pr) put(x, y, 255, 232, 170, 1);
      else if (d < pr * 3) put(x, y, 255, 212, 121, 0.5 * (1 - (d - pr) / (pr * 2)) ** 2);
    }

  /* 5. downsample + emit */
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * N + x * SS + sx) * 3;
          r += rgb[i]; g += rgb[i + 1]; b += rgb[i + 2];
        }
      const o = (y * size + x) * 4, k = 1 / (SS * SS);
      out[o] = Math.min(255, r * k);
      out[o + 1] = Math.min(255, g * k);
      out[o + 2] = Math.min(255, b * k);
      out[o + 3] = 255;
    }
  return encodePNG(size, size, out);
}

/* ------------------------------------------------------------------ write */
mkdirSync(join(ROOT, "assets"), { recursive: true });
const targets = [
  ["assets/icon-192.png", 192, {}],
  ["assets/icon-512.png", 512, {}],
  ["assets/icon-maskable-512.png", 512, { maskable: true }],
  ["assets/apple-touch-icon.png", 180, {}],
];
for (const [rel, size, opt] of targets) {
  const file = join(ROOT, rel);
  writeFileSync(file, renderIcon(size, opt));
  console.log("wrote", rel, `${size}x${size}`);
}
