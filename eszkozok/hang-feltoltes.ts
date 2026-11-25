// A feladatonként kivágott hangfájlok feltöltése a Cloudflare R2 `matura-hang` tárolójába (SPEC 3.7, 7.).
// A wrangler bejelentkezett fiókjával fut (npx wrangler login). Újrafuttatható: a meglévő fájlt felülírja.
// Használat: node eszkozok/hang-feltoltes.ts <a hang/ mappa> [szűrő]
//   pl. node eszkozok/hang-feltoltes.ts "D:\Dokumentumok\Tanári segédanyagok\e-books\Érettségi 2005-2026\hang"
// A fájlnév a tárolóban ugyanaz, mint a mappában; a tartalom `audio.clip` mezője (`hang/<név>`) erre mutat, a felület
// a `hang/` előtagot a VITE_AUDIO_BASE címre cseréli.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const [dir, filter = ''] = process.argv.slice(2);
if (!dir) { console.error('Használat: node eszkozok/hang-feltoltes.ts <hang mappa> [szűrő]'); process.exit(2); }
const BUCKET = 'matura-hang', PARALLEL = 4;
const files = readdirSync(dir).filter((f) => f.endsWith('.mp3') && f.includes(filter)).sort();
console.log(`${files.length} fájl, ${(files.reduce((n, f) => n + statSync(join(dir, f)).size, 0) / 1e6).toFixed(0)} MB`);

const put = (f: string) => new Promise<boolean>((done) => {
  const args = ['--yes', 'wrangler@4', 'r2', 'object', 'put', `${BUCKET}/${f}`, '--remote', '--file', join(dir, f),
    '--content-type', 'audio/mpeg', '--cache-control', 'public, max-age=604800'];
  const p = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args.map((a) => (process.platform === 'win32' && /\s/.test(a) ? `"${a}"` : a)),
    { shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => { if (code !== 0) console.error(`HIBA ${f}\n${out.slice(-600)}`); done(code === 0); });
});

let next = 0, ok = 0, bad: string[] = [];
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  while (next < files.length) {
    const f = files[next++];
    if (await put(f)) { ok++; if (ok % 10 === 0 || ok === files.length) console.log(`${ok} / ${files.length}`); } else bad.push(f);
  }
}));
console.log(`Kész: ${ok} feltöltve${bad.length ? `, ${bad.length} hibás: ${bad.join(', ')}` : ''}`);
if (bad.length) process.exitCode = 1;
