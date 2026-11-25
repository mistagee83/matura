// A javító próbája mind a 949 feladaton. Futtatás: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { gradeTask, publicTask, cleanW } from '../supabase/functions/_shared/grade.ts';

const dir = new URL('../tartalom/', import.meta.url);
const tasks: any[] = [];
for (const f of readdirSync(dir).filter(f => /^20.*\.json$/.test(f)))
  for (const s of JSON.parse(readFileSync(new URL(f, dir), 'utf8')).sections) tasks.push(...s.tasks);

// a kulcs szerinti válasz, ahogy a felület elküldené
function keyAnswer(t: any, it: any): any {
  switch (t.kind) {
    case 'choice': case 'bank': return it.answer;
    case 'multi': return it.answer;
    case 'lines': return it.answer === null ? 'OK' : { i: 0, w: it.answer };
    case 'fix': return { w: it.fixes[0].wrong, text: it.fixes[0].accept[0] };
    case 'order': { const left = it.words.map((_: string, i: number) => i); return it.accept[0].map((w: string) => { const k = left.findIndex((i: number) => it.words[i] === w); return left.splice(k, 1)[0]; }); }
    case 'text':
      if (it.gaps) return it.combos ? it.combos[0] : it.gaps.map((g: string[]) => g[0]);
      if (it.keywords) return it.keywords[0].join(' ');
      return it.accept[0];
  }
}

test('a feladatok száma', () => assert.equal(tasks.length, 949));

test('a kulcs szerinti válaszok teljes pontot érnek', () => {
  const bad: string[] = [];
  for (const t of tasks) {
    const ans: Record<string, any> = {};
    for (const it of t.items) if (!it.example) ans[it.n] = keyAnswer(t, it);
    const r = gradeTask(t, ans);
    if (r.score !== r.max) bad.push(`${t.id}: ${r.score}/${r.max} – ${r.results.filter(x => x.result === 'bad').map(x => x.n).join(',')}`);
  }
  assert.deepEqual(bad, []);
});

test('az üres beküldés 0 pont', () => {
  for (const t of tasks) assert.equal(gradeTask(t, {}).score, 0, t.id);
});

test('a diáknak küldött változatban nincs kulcs', () => {
  const KEY = ['accept', 'answer', 'alt', 'gaps', 'combos', 'keywords', 'key', 'fixes', 'unordered', 'group', 'groupKey', 'maxWords', 'note'];
  for (const t of tasks) {
    const p = publicTask(t);
    assert.equal(p.note, undefined, t.id);
    if (p.grading) assert.deepEqual(Object.keys(p.grading), ['spelling'], t.id);
    for (const it of p.items) if (!it.example) for (const k of KEY) assert.equal(it[k], undefined, `${t.id}/${it.n}.${k}`);
  }
});

test('a hivatalos útmutató példái', () => {
  const find = (id: string) => tasks.find(t => t.id === id);
  // 2018. május emelt R3/21: a puszta „mistaken” az ellenkezőjét jelenti
  assert.equal(gradeTask(find('2018-maj-emelt-R3'), { 21: 'mistaken' }).results.find(r => r.n === 21)!.result, 'bad');
  assert.equal(gradeTask(find('2018-maj-emelt-R3'), { 21: 'wasn’t mistaken' }).results.find(r => r.n === 21)!.result, 'ok');
  // 2005. május emelt H3/27–28: két különböző tulajdonság kell
  const h3 = find('2005-maj-emelt-H3'), r = (a: any) => gradeTask(h3, a).results.filter(x => x.n === 27 || x.n === 28).map(x => x.result).join(',');
  assert.equal(r({ 27: 'blue eyes', 28: 'blue-eyed' }), 'ok,bad');
  assert.equal(r({ 27: 'blond hair', 28: 'blue-eyed' }), 'ok,ok');
  assert.equal(cleanW('“Hello,'), 'hello');
});
