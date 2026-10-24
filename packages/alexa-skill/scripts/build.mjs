/**
 * Bundle the Alexa skill into an AWS-Lambda-ready zip.
 *
 * esbuild compiles src/index.ts (plus the inlined @chaoshome/core simulation
 * and ChaosState) into a single CommonJS index.js targeting node20. We then
 * write a lambda.zip containing just that file - no node_modules, no SDK. The
 * only runtime config is the GEMINI_API_KEY environment variable you set in the
 * Lambda console.
 *
 * Output: packages/alexa-skill/dist/lambda.zip  (upload this)
 */

import { build } from 'esbuild';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const distDir = join(pkgRoot, 'dist');
mkdirSync(distDir, { recursive: true });

const outfile = join(distDir, 'index.js');

console.log('Bundling Lambda handler with esbuild...');
await build({
  entryPoints: [join(pkgRoot, 'src', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  sourcemap: false,
  minify: false, // keep it readable for debugging in the Lambda console
  logLevel: 'info',
  // The chaoshome packages are ESM; esbuild inlines them into the CJS bundle.
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default'],
});

const bundleBytes = statSync(outfile).size;
console.log(`Bundled index.js: ${(bundleBytes / 1024).toFixed(1)} KB`);

// The bundle is CommonJS, but this package is "type": "module", so Node would
// try to load dist/index.js as ESM locally. A dist/package.json marking it
// commonjs fixes local loads/tests. It is NOT included in lambda.zip (AWS has
// no package.json there and defaults to CJS), so the deployed artifact is
// unaffected.
writeFileSync(join(distDir, 'package.json'), '{"type":"commonjs"}\n');

/* ------------------------------------------------------------------ */
/* Zero-dependency ZIP writer (deflate, no external archiver).         */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Build a ZIP (stored or deflated) from { name, data } entries. Uses deflate
 * for the payload; Lambda accepts standard ZIPs. No alignment tricks needed.
 */
function makeZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate =
    ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.from(entry.data);
    const crc = crc32(raw);
    const deflated = deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const payload = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len

    chunks.push(local, nameBuf, payload);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8); // flags
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(dosTime, 12);
    cd.writeUInt16LE(dosDate, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    // extra/comment/disk/attrs already 0
    cd.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cd, nameBuf]));

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, centralBuf, end]);
}

const bundle = await import('node:fs').then((fs) => fs.readFileSync(outfile));
const zip = makeZip([{ name: 'index.js', data: bundle }]);
const zipPath = join(distDir, 'lambda.zip');
writeFileSync(zipPath, zip);

console.log(`Wrote ${zipPath} (${(zip.length / 1024).toFixed(1)} KB)`);
console.log('Handler: index.handler  |  Runtime: nodejs20.x  |  Set env GEMINI_API_KEY.');
