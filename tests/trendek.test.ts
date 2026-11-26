// A csoportszintű trendek számolásának próbája (app/src/teacher/trends.ts), kézzel kiszámolt értékekkel.
// Futtatás: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, weakest, overall, compare, type TrendRow, type TaskMeta } from '../app/src/teacher/trends.ts';

const meta = new Map<string, TaskMeta>([
  ['R1', { section: 'reading', exam_type: 'félmondatok párosítása' }],
  ['R2', { section: 'reading', exam_type: 'mondat visszahelyezése szövegbe' }],
  ['L1', { section: 'language', exam_type: 'nyílt cloze (egy szó)' }],
  ['L2', { section: 'language', exam_type: 'nyílt cloze (egy szó)' }],
]);
const row = (group: string, task: string, subs: number, total: number, correct: number): TrendRow => ({ group, task, asg: 1, subs, total, correct, last: '' });
// G: három kiosztás (R1, R2, L1+L2); H: ugyanaz az R1 és L1
const rows: TrendRow[] = [
  row('G', 'R1', 10, 80, 60),    // 8 kérdés × 10 diák, 75%
  row('G', 'R2', 12, 84, 42),    // 7 × 12, 50%
  row('G', 'L1', 9, 90, 27),     // 10 × 9, 30%
  row('G', 'L2', 9, 81, 54),     // 9 × 9, 66,7%
  row('H', 'R1', 5, 40, 36),     // 90%
  row('H', 'L1', 4, 40, 10),     // 25%
  row('X', 'R9', 3, 30, 30),     // ismeretlen feladat: kimarad
];

test('vizsgarészenként: a pontok összege / az elérhető pontok összege', () => {
  const s = aggregate(rows, meta, 'G', 'section');
  // olvasás: (60 + 42) / (80 + 84) = 102 / 164; nyelvhelyesség: (27 + 54) / (90 + 81) = 81 / 171
  assert.deepEqual(s.map((a) => [a.key, a.correct, a.total, a.tasks]), [['language', 81, 171, 2], ['reading', 102, 164, 2]]);
  assert.equal(s[0].ratio, 81 / 171);
  assert.equal(s[1].ratio, 102 / 164);
});

test('feladattípusonként a leggyengébbtől, és a leggyengébb típus', () => {
  const t = aggregate(rows, meta, 'G', 'type');
  // nyílt cloze: 81/171 = 47,4%; mondat visszahelyezése: 50%; félmondatok: 75%
  assert.deepEqual(t.map((a) => a.key), ['nyílt cloze (egy szó)', 'mondat visszahelyezése szövegbe', 'félmondatok párosítása']);
  assert.equal(weakest(t)?.key, 'nyílt cloze (egy szó)');
  assert.equal(weakest(aggregate(rows, meta, 'H', 'section').slice(0, 1)), null, 'egyetlen típusnál nincs „leggyengébb”');
});

test('összesítve és üres csoport', () => {
  assert.deepEqual(overall(rows, 'G'), { total: 335, correct: 183, ratio: 183 / 335 });
  assert.deepEqual(aggregate(rows, meta, 'Z', 'type'), []);
  assert.equal(overall(rows, 'Z').ratio, 0);
});

test('összevetés: csak a közös feladatok, a legjobb csoporttal kezdve', () => {
  const c = compare(rows, 'G');
  assert.deepEqual(c.map((x) => [x.task, x.groups.map((g) => [g.group, g.ratio])]), [
    ['R1', [['H', 0.9], ['G', 0.75]]],
    ['L1', [['G', 0.3], ['H', 0.25]]],
  ]);
});
