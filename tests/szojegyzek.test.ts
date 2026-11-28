// A szójegyzék (SPEC 4.5) próbája: minden olvasásfeladathoz van, a nyelvhelyességhez és a halláshoz szűkítve, és a beküldés
// előtt kiadott rész (splitGlossary().entries) nem adja ki a megoldást. Beírós feladatnál az elfogadott válasz nem lehet nyilvános
// címszó; nyelvhelyességnél és hallásnál a helyes lehetőség szava sem, és többszavas címszó sem tartalmazhatja a megoldást.
// Futtatás: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { splitGlossary } from '../supabase/functions/_shared/glossary.ts';

const root = new URL('../', import.meta.url);
const read = (d: string, f: string) => JSON.parse(readFileSync(new URL(d + '/' + f, root), 'utf8'));
const norm = (s: string) => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
const exams = readdirSync(new URL('tartalom/', root)).filter((f) => /^20.*\.json$/.test(f));
const NO_GLOSS = new Set(['lines', 'fix', 'order']);

test('minden olvasásfeladathoz van szójegyzék; a többi csak létező, szótárt engedő feladathoz', () => {
  let reading = 0, other = 0;
  for (const f of exams) {
    const e = read('tartalom', f), g = read('szojegyzek', f);
    const tasks = new Map<string, any>(e.sections.flatMap((s: any) => s.tasks.map((t: any) => [t.id, { ...t, section: s.id }])));
    for (const t of tasks.values()) if (t.section === 'reading') { assert.ok(g.tasks[t.id], t.id + ': nincs szójegyzék'); reading++; }
    for (const id of Object.keys(g.tasks)) {
      const t = tasks.get(id);
      assert.ok(t, f + ': nincs ilyen feladat: ' + id);
      assert.ok(!NO_GLOSS.has(t.kind), id + ': ennél a típusnál nincs szótár');
      if (t.section !== 'reading') other++;
    }
  }
  assert.equal(reading, 364);
  assert.ok(other > 400, 'a nyelvhelyesség és a hallás szótára hiányzik');
});

test('a nyilvános rész nem adja ki a megoldást, és nincs benne afterSubmit jelölés', () => {
  let after = 0;
  for (const f of exams) {
    const e = read('tartalom', f), g = read('szojegyzek', f);
    for (const s of e.sections) for (const t of s.tasks) {
      if (!g.tasks[t.id]) continue;
      const { entries, after: a } = splitGlossary(g.tasks[t.id]);
      after += a.length;
      assert.equal(entries.length + a.length, g.tasks[t.id].length);
      for (const x of entries) assert.ok(!('afterSubmit' in x), t.id);
      const strict = s.id !== 'reading', answers = new Set<string>();
      for (const it of t.items) if (!it.example) {
        if (t.kind === 'text') for (const v of [...(it.accept || []), ...(it.gaps || []).flat()]) answers.add(norm(v));
        if (strict && ['bank', 'choice', 'multi'].includes(t.kind)) {
          const pool = (t.kind === 'bank' ? t.bank : it.options || t.options) || [];
          for (const k of [].concat(it.answer || [], it.alt || [])) { const o = pool.find((p: any) => p.key === k); if (o && norm(o.text).split(' ').length <= 3) answers.add(norm(o.text).replace(/[.…]+$/, '')); }
        }
      }
      for (const x of entries) for (const form of x.forms) {
        assert.ok(!answers.has(norm(form)), `${t.id}: „${form}” beküldés előtt kiadná a megoldást`);
        if (strict) for (const ans of answers) {
          const multi = [x.lemma, form].filter((w) => norm(w).includes(' '));
          assert.ok(!multi.some((w) => (' ' + norm(w) + ' ').includes(' ' + ans + ' ')), `${t.id}: „${x.lemma}” tartalmazza a megoldást („${ans}”)`);
        }
      }
    }
  }
  assert.ok(after > 0);
});
