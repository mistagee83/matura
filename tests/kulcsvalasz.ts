// A kulcs szerinti válaszok a felület tárolási formájában (localStorage „matura:a:<kód>”), a felületi próbákhoz.
// Használat: node tests/kulcsvalasz.ts <feladatsor-azonosító> [üres]  → JSON a kimeneten
import { readFileSync } from 'node:fs';

const [id, mode] = process.argv.slice(2);
const e = JSON.parse(readFileSync(new URL(`../tartalom/${id}.json`, import.meta.url), 'utf8'));
const clean = (w: string) => w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '').replace(/[’‘]/g, "'");
const answers: Record<string, Record<string, unknown>> = {};
for (const s of e.sections) for (const t of s.tasks) {
  const a: Record<string, unknown> = {};
  for (const it of t.items) {
    if (it.example || mode === 'üres') continue;
    let v: unknown;
    switch (t.kind) {
      case 'choice': case 'bank': case 'multi': v = it.answer; break;
      case 'lines': v = it.answer === null ? 'OK' : { i: it.text.split(' ').findIndex((w: string) => clean(w) === it.answer), w: it.answer }; break;
      case 'fix': { const fx = it.fixes[0]; v = { i: it.text.split(' ').findIndex((w: string) => clean(w) === fx.wrong), w: fx.wrong, text: fx.accept[0] }; break; }
      case 'order': { const left = it.words.map((_: string, i: number) => i); v = it.accept[0].map((w: string) => { const k = left.findIndex((i: number) => it.words[i] === w); return left.splice(k, 1)[0]; }); break; }
      default: v = it.gaps ? (it.combos ? it.combos[0] : it.gaps.map((g: string[]) => g[0])) : it.keywords ? it.keywords[0].join(' ') : it.accept[0];
    }
    a[it.n] = v;
  }
  answers[t.id] = a;
}
process.stdout.write(JSON.stringify({ nickname: 'Proba', started: true, answers, index: 0, result: null }));
