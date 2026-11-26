// Csoportszintű trendek (SPEC 4.3, 4. szakasz): a group_trends() soraiból (csoport × feladat) vizsgarészenkénti és
// feladattípusonkénti átlag, a leggyengébb típus, és a csoportok összevetése ugyanazon a feladaton.
// Tiszta függvények, hogy a próba (tests/trendek.test.ts) a felület nélkül is kiszámolhassa ugyanazt.
//
// Az átlag a helyes válaszok aránya az összes kiértékelt kérdésen (eszközönként az első beküldés; elírás helyesnek,
// üres rossznak számít). Egy kérdés egy pont, így ez a pontarány is: egy típus átlaga = a típus feladataiban szerzett pontok
// összege / az elérhető pontok összege, a kitöltők szerint súlyozva.

export interface TrendRow { group: string; task: string; asg: number; subs: number; total: number; correct: number; last: string }
export interface TaskMeta { section: string; exam_type: string | null }
export interface Agg { key: string; tasks: number; subs: number; total: number; correct: number; ratio: number }

const ratio = (correct: number, total: number) => (total ? correct / total : 0);

/** Egy csoport átlaga vizsgarészenként vagy feladattípusonként, a leggyengébbtől a legerősebbig. */
export function aggregate(rows: TrendRow[], meta: Map<string, TaskMeta>, group: string, by: 'section' | 'type'): Agg[] {
  const m = new Map<string, Agg>();
  for (const r of rows) {
    if (r.group !== group || !r.total) continue;
    const t = meta.get(r.task); if (!t) continue;
    const key = by === 'section' ? t.section : (t.exam_type || 'egyéb');
    const a = m.get(key) || { key, tasks: 0, subs: 0, total: 0, correct: 0, ratio: 0 };
    a.tasks++; a.subs += r.subs; a.total += r.total; a.correct += r.correct;
    m.set(key, a);
  }
  return [...m.values()].map((a) => ({ ...a, ratio: ratio(a.correct, a.total) }))
    .sort((x, y) => x.ratio - y.ratio || y.total - x.total || x.key.localeCompare(y.key));
}

/** A leggyengébb csoport: a legkisebb arányú; csak ha legalább két összevethető van. */
export const weakest = (aggs: Agg[]): Agg | null => (aggs.length >= 2 ? aggs[0] : null);

/** A csoport összesített aránya. */
export function overall(rows: TrendRow[], group: string) {
  let total = 0, correct = 0;
  for (const r of rows) if (r.group === group) { total += r.total; correct += r.correct; }
  return { total, correct, ratio: ratio(correct, total) };
}

export interface Compare { task: string; groups: { group: string; subs: number; total: number; correct: number; ratio: number }[] }
/** Azok a feladatok, amelyeket ez a csoport és legalább egy másik csoport is megoldott; csoportonként az arány, a legjobbtól. */
export function compare(rows: TrendRow[], group: string): Compare[] {
  const mine = new Set(rows.filter((r) => r.group === group && r.total).map((r) => r.task));
  const by = new Map<string, Compare>();
  for (const r of rows) {
    if (!mine.has(r.task) || !r.total) continue;
    const c = by.get(r.task) || { task: r.task, groups: [] };
    c.groups.push({ group: r.group, subs: r.subs, total: r.total, correct: r.correct, ratio: ratio(r.correct, r.total) });
    by.set(r.task, c);
  }
  return [...by.values()].filter((c) => c.groups.length >= 2)
    .map((c) => ({ ...c, groups: c.groups.sort((x, y) => y.ratio - x.ratio || x.group.localeCompare(y.group)) }));
}
