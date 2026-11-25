// A Matura javítója. A prototípus (prototipus/index.html, check és match) logikája, szerveroldalra átültetve.
// Tiszta függvények, külső függőség nélkül: a Supabase-függvény (Deno) és a helyi próbák (Node) is ezt használják.
// A javítási szabályok leírása: SPEC.md 3.5.

export type Result = 'ok' | 'typo' | 'bad';
// deno-lint-ignore no-explicit-any
type Json = any;

const norm = (s: Json): string => String(s ?? '').trim().toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '');
export const cleanW = (w: string): string => w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '').replace(/[’‘]/g, "'");

function lev(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// engedékeny mód: egy betű elírás hosszabb szavaknál, illetve hiányzó vagy fölös -s végződés
const near = (a: string, x: string): boolean => (a.length >= 5 && lev(a, x) <= 1) || a + 's' === x || x + 's' === a;

// A betűvel írt szám a számjegyes alakkal egyenértékű: „twelve thousand five hundred” → 12500. Nyelvhelyességnél (strict) nem alkalmazzuk.
const N1: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const N10: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const NBIG: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9 };
export function nums(s: string): string {
  const toks = s.replace(/(\d),(?=\d{3})/g, '$1')
    .replace(/\b(\d+(?:\.\d+)?) (thousand|million|billion)\b/g, (_m, a, b) => String(Math.round(+a * NBIG[b])))
    .replace(/\b([a-z]+)-([a-z]+)\b/g, (m, a, b) => a in N10 && b in N1 ? a + ' ' + b : m).split(' ');
  const out: string[] = [];
  const isN = (w: string) => w in N1 || w in N10 || w === 'hundred' || w in NBIG;
  for (let i = 0; i < toks.length; i++) {
    if (!(toks[i] in N1 || toks[i] in N10) && !(toks[i] === 'a' && (toks[i + 1] === 'hundred' || toks[i + 1] in NBIG))) { out.push(toks[i]); continue; }
    let total = 0, cur = toks[i] === 'a' ? 1 : 0, last = toks[i] === 'a' ? 'unit' : '', j = toks[i] === 'a' ? i + 1 : i;
    for (; j < toks.length; j++) {
      const w = toks[j];
      if (w === 'and' && last && isN(toks[j + 1] || '')) continue;
      if (w in N1) { const v = N1[w]; if (last === 'tens' && v < 10) cur += v; else if ((last === 'unit' || last === 'tens') && cur >= 10 && cur < 100 && v >= 10) cur = cur * 100 + v; else if (last === 'unit' || last === 'tens') break; else cur += v; last = 'unit'; }
      else if (w in N10) { if ((last === 'unit' || last === 'tens') && cur >= 10 && cur < 100) cur = cur * 100 + N10[w]; else if (last === 'unit' || last === 'tens') break; else cur += N10[w]; last = 'tens'; }
      else if (w === 'hundred' && cur > 0 && cur < 100) { cur *= 100; last = 'hundred'; }
      else if (w in NBIG && cur > 0) { total += cur * NBIG[w]; cur = 0; last = 'big'; }
      else break;
    }
    out.push(String(total + cur)); i = j - 1;
  }
  return out.join(' ');
}

/** Egy feladat javítása. `task` a teljes (kulcsos) feladat, `ans` az itemsorszám → válasz térkép. */
export function gradeTask(task: Json, ans: Record<string, Json>) {
  const spelling = task.grading && task.grading.spelling;
  const loose = spelling !== 'strict';
  const normN = (s: Json) => loose ? nums(norm(s)) : norm(s);
  const match = (x: Json, accept: string[]): number => {   // 2 = pontos, 1 = elírással, 0 = rossz
    const y = normN(x); if (!y) return 0;
    if (accept.some(a => normN(a) === y)) return 2;
    return spelling === 'lenient' && accept.some(a => near(normN(a), y)) ? 1 : 0;
  };
  const check = (it: Json): Result => {
    const v = ans[it.n];
    if (task.kind === 'lines') return it.answer === null ? (v === 'OK' ? 'ok' : 'bad') : (v && v !== 'OK' && [it.answer, ...(it.alt || [])].includes(v.w) ? 'ok' : 'bad');
    if (task.kind === 'fix') {            // a pont a helyes szóért jár; ha a diák szót is jelölt, annak a kulcs szerinti hibás szónak kell lennie
      if (!v || !v.text) return 'bad';
      let best = 0; for (const fx of it.fixes) if (v.w == null || v.w === fx.wrong) best = Math.max(best, match(v.text, fx.accept));
      return (['bad', 'typo', 'ok'] as Result[])[best];
    }
    if (task.kind === 'order') {
      if (!Array.isArray(v)) return 'bad';
      const key = (a: string[]) => a.map(cleanW).join(' '), mine = key(v.map((i: number) => it.words[i] ?? ''));
      return it.accept.some((a: string[]) => key(a) === mine) ? 'ok' : 'bad';
    }
    if (task.kind === 'text' && it.gaps) {
      const xs = Array.isArray(v) ? v : [], orders = it.unordered ? [[0, 1], [1, 0]] : [it.gaps.map((_: Json, i: number) => i)];
      let best = 0;
      // combos: csak a kulcsban együtt megadott párok jók („armed guards” vagy „security agents”, de „armed agents” nem)
      if (it.combos) for (const c of it.combos) best = Math.max(best, Math.min(...c.map((w: string, i: number) => match(xs[i], [w]))));
      else for (const o of orders) best = Math.max(best, Math.min(...o.map((gi: number, i: number) => match(xs[i], it.gaps[gi]))));
      return (['bad', 'typo', 'ok'] as Result[])[best];
    }
    // szószámkorlát: ha az utasítás megadja (kulcsszavas feladat) vagy az item külön rögzíti, a hosszabb válasz hibás
    const maxW = it.maxWords || (task.kind === 'text' && it.keywords && task.grading && task.grading.maxWords);
    if (task.kind === 'text' && !it.gaps && maxW && norm(v).split(' ').filter(Boolean).length > maxW) return 'bad';
    if (task.kind === 'text' && it.keywords) {     // kulcsszavas javítás: valamelyik változat minden kötelező szava szerepel a válaszban
      const words = nums(norm(v).replace(/\$/g, ' dollars ').replace(/£/g, ' pounds ').replace(/€/g, ' euros ').replace(/(\d),(?=\d{3})/g, '$1').replace(/[.,;:!?"/]/g, ' ').replace(/\s+/g, ' ').trim()).split(' ').filter(Boolean);
      if (!words.length) return 'bad';
      const has = (k: string) => words.some(w => w === k || near(k, w));
      return it.keywords.some((alt: string[]) => alt.length && nums(alt.join(' ').replace(/’/g, "'")).split(' ').every(has)) ? 'ok' : 'bad';
    }
    if (task.kind === 'text') return (['bad', 'typo', 'ok'] as Result[])[match(v, it.accept || [])];
    if (task.kind === 'multi') return (Array.isArray(v) ? [...v].sort().join('') : '') === [...it.answer].sort().join('') ? 'ok' : 'bad';
    return v === it.answer || (v != null && (it.alt || []).includes(v)) ? 'ok' : 'bad';      // alt: a kulcs két betűjelet is elfogad („D / K”)
  };

  const groups: Record<string, Set<string>> = {};   // azonos válaszkészletű itemeknél ugyanaz a válasz kétszer nem ér pontot
  const results = task.items.filter((it: Json) => !it.example).map((it: Json) => {
    let r = check(it);
    if (it.group && r !== 'bad') {
      // groupKey: az elfogadott válaszok jelentése; így a „blue eyes” és a „blue-eyed” ugyanannak számít (elírással elfogadott válasznál is)
      const acc = it.groupKey && (it.accept || []).find((a: string) => match(ans[it.n], [a]));
      const k = acc ? it.groupKey[acc] : norm(ans[it.n]);
      const g = groups[it.group] = groups[it.group] || new Set();
      if (g.has(k)) r = 'bad'; else g.add(k);
    }
    return { n: it.n as number, result: r };
  });
  return { score: results.filter((r: { result: Result }) => r.result !== 'bad').length, max: results.length, results };
}

/** A megoldás megjelenítéshez, itemenként (csak a beküldés után, és csak ha a kiosztás engedi). */
export function solutions(task: Json): Record<string, Json> {
  const out: Record<string, Json> = {};
  for (const it of task.items) {
    if (it.example) continue;
    if (task.kind === 'choice' || task.kind === 'bank') out[it.n] = { keys: [it.answer, ...(it.alt || [])] };
    else if (task.kind === 'multi') out[it.n] = { keys: it.answer };
    else if (task.kind === 'lines') out[it.n] = { word: it.answer };
    else if (task.kind === 'fix') out[it.n] = { text: it.fixes.map((x: Json) => x.wrong + ' → ' + x.accept.join(' / ')).join('  vagy  ') };
    else if (task.kind === 'order') out[it.n] = { text: it.accept.map((a: string[]) => it.first + ' ' + a.join(' ') + (it.end || '.')).join('  /  ') };
    else out[it.n] = { text: it.key || (it.gaps ? it.gaps.map((g: string[]) => g.join(' / ')).join(' + ') : (it.accept || []).join(' / ')) };
  }
  return out;
}

// a kulcsot hordozó mezők: ezek nem kerülhetnek a diák eszközére a beküldés előtt (a példa kivétel: az a lapon is ki van töltve)
const ITEM_KEY_FIELDS = ['accept', 'answer', 'alt', 'gaps', 'combos', 'keywords', 'key', 'fixes', 'unordered', 'group', 'groupKey', 'maxWords', 'note'];

/** A feladat diáknak küldhető változata: kulcs és belső megjegyzés nélkül. */
export function publicTask(task: Json): Json {
  const t = structuredClone(task);
  delete t.note;
  if (t.grading) t.grading = { spelling: t.grading.spelling };
  t.items = t.items.map((it: Json) => {
    if (it.example) { const e = { ...it }; delete e.note; return e; }
    const p: Json = { ...it };
    if (it.gaps) p.gapCount = it.gaps.length;
    for (const f of ITEM_KEY_FIELDS) delete p[f];
    return p;
  });
  return t;
}
