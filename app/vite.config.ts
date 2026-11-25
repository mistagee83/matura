import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { gradeTask, publicTask, solutions } from '../supabase/functions/_shared/grade';

// Helyi próba-háttér (csak `npm run dev` alatt, ha nincs VITE_SUPABASE_URL): ugyanazt adja vissza, mint élesben a
// get_assignment() függvény és a `submit` Edge Function. A kulcs itt is a kiszolgálón marad; a böngésző csak a kulcs nélküli
// feladatot kapja. Kiosztás: /k/MINTA24K és /k/MINTA24E (a két mintasor), és bármely feladatsor: /k/<ÉV><HÓNAP><SZINT>, pl. /k/2019OKTEMELT.
// A ?vis=after_close paraméter a „megoldás csak lezárás után” beállítást próbálja ki.
function devApi(): Plugin {
  const dir = new URL('../tartalom/', import.meta.url);
  const exams: Record<string, any> = {};
  const load = (id: string) => {
    if (exams[id]) return exams[id];
    const f = new URL(id + '.json', dir);
    if (!existsSync(f)) return null;
    return (exams[id] = JSON.parse(readFileSync(f, 'utf8')));
  };
  const examFor = (code: string) => {
    const m = /^MINTA24([KE])$/.exec(code);
    if (m) return load(m[1] === 'K' ? '2024-maj-kozep' : '2024-maj-emelt');
    const n = /^(\d{4})([A-Z0-9]+?)(KOZEP|EMELT)$/.exec(code);
    return n ? load(`${n[1]}-${n[2].toLowerCase()}-${n[3].toLowerCase()}`) : null;
  };
  const submitted = new Set<string>();
  return {
    name: 'matura-dev-api',
    configureServer(server) {
      // a kivágott hangfájlok helyben, a forrásmappából (élesben az R2-ből jönnek); tekeréshez Range-kérést is kiszolgál
      const hangDir = process.env.MATURA_HANG || 'D:/Dokumentumok/Tanári segédanyagok/e-books/Érettségi 2005-2026/hang';
      server.middlewares.use('/dev-hang/', (req, res) => {
        const name = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
        const f = join(hangDir, name);
        if (!/^[\w.-]+\.mp3$/.test(name) || !existsSync(f)) { res.statusCode = 404; return res.end(); }
        const size = statSync(f).size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
        res.setHeader('Content-Type', 'audio/mpeg'); res.setHeader('Accept-Ranges', 'bytes');
        if (!m) { res.setHeader('Content-Length', size); return createReadStream(f).pipe(res); }
        const start = m[1] ? +m[1] : size - +m[2], end = m[1] && m[2] ? +m[2] : size - 1;
        res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`); res.setHeader('Content-Length', end - start + 1);
        createReadStream(f, { start, end }).pipe(res);
      });
      server.middlewares.use('/dev-api/', (req, res) => {
        const send = (s: number, b: unknown) => { res.statusCode = s; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); };
        const url = new URL(req.url || '', 'http://x');
        if (url.pathname === '/assignment') {
          const code = (url.searchParams.get('code') || '').toUpperCase(), e = examFor(code);
          if (!e) return send(200, { found: false });
          // ?st=closed: lezárt kiosztás (a kulcs is kimegy, mint élesben); ?hang=teacher: a tanár játssza le a hangot
          const closed = url.searchParams.get('st') === 'closed';
          const tasks = e.sections.flatMap((s: any) => s.tasks.map((t: any) => ({ id: t.id, examId: e.id, section: s.id, points: t.points,
            exam: { year: e.year, session: e.session, level: e.level === 'kozep' ? 'közép' : e.level }, content: publicTask(t), ...(closed ? { key: t } : {}) })));
          return send(200, { found: true, code, status: closed ? 'closed' : 'open', audioMode: url.searchParams.get('hang') === 'teacher' ? 'teacher' : 'student',
            solutionVisibility: url.searchParams.get('vis') || 'immediate', tasks,
            submitted: submitted.has(code + (url.searchParams.get('device') || '')) });
        }
        if (url.pathname === '/submit' && req.method === 'POST') {
          let raw = ''; req.on('data', (c) => (raw += c)); req.on('end', () => {
            const b = JSON.parse(raw || '{}'), e = examFor(String(b.code || '').toUpperCase());
            if (!e) return send(404, { error: 'not_found' });
            let score = 0, max = 0; const tasks: any[] = [];
            for (const s of e.sections) for (const t of s.tasks) {
              const g = gradeTask(t, (b.answers || {})[t.id] || {}); score += g.score; max += g.max;
              tasks.push({ id: t.id, score: g.score, max: g.max, results: g.results, solutions: b.vis === 'after_close' ? null : solutions(t) });
            }
            submitted.add(b.code + b.deviceId);
            setTimeout(() => send(200, { score, max, tasks, solutionsVisible: b.vis !== 'after_close', id: randomUUID() }), 300);
          });
          return;
        }
        send(404, { error: 'unknown' });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  server: { port: 5175, fs: { allow: ['..'] } },
});
