// A szójegyzék (SPEC 4.5) próbája: minden olvasásfeladathoz van, a feladatok léteznek, és a beküldés előtt kiadott rész
// (splitGlossary().entries) nem adja ki a megoldást: beírós feladatnál egy elfogadott válasz nem lehet nyilvános címszó.
// Futtatás: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { splitGlossary } from '../supabase/functions/_shared/glossary.ts';

const root = new URL('../', import.meta.url);
const read = (d: string, f: string) => JSON.parse(readFileSync(new URL(d + '/' + f, root), 'utf8'));
const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").trim();
const exams = readdirSync(new URL('tartalom/', root)).filter((f) => /^20.*\.json$/.test(f));

test('minden olvasásfeladathoz van szójegyzék, és csak olvasásfeladathoz', () => {
  let n = 0;
  for (const f of exams) {
    const e = read('tartalom', f), g = read('szojegyzek', f);
    const reading = e.sections.find((s: any) => s.id === 'reading').tasks.map((t: any) => t.id).sort();
    assert.deepEqual(Object.keys(g.tasks).sort(), reading, f);
    n += reading.length;
  }
  assert.equal(n, 364);
});

test('a nyilvános rész nem adja ki a beírós feladatok válaszát, és nincs benne afterSubmit jelölés', () => {
  let after = 0;
  for (const f of exams) {
    const e = read('tartalom', f), g = read('szojegyzek', f);
    for (const t of e.sections.find((s: any) => s.id === 'reading').tasks) {
      const { entries, after: a } = splitGlossary(g.tasks[t.id]);
      after += a.length;
      assert.equal(entries.length + a.length, g.tasks[t.id].length);
      for (const x of entries) assert.ok(!('afterSubmit' in x), t.id);
      if (t.kind !== 'text') continue;
      const answers = new Set<string>();
      for (const it of t.items) if (!it.example) for (const v of [...(it.accept || []), ...(it.gaps || []).flat()]) answers.add(norm(v));
      for (const x of entries) for (const form of x.forms) assert.ok(!answers.has(norm(form)), `${t.id}: „${form}” beküldés előtt kiadná a megoldást`);
    }
  }
  assert.ok(after > 0);
});
