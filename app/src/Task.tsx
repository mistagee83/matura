// Egy feladat megjelenítése és kitöltése a hét beviteli móddal (SPEC 3.3): bank, choice, multi, text, lines, fix, order.
// A feladat kulcs nélkül érkezik; a példák (n = 0) a lapon is ki vannak töltve, ezért azok megoldása látszik.
// A belső részeket függvényként hívjuk (nem komponensként), hogy a beírómező gépelés közben ne veszítse el a fókuszt.
// Beküldés után (graded) a kérdések pipát vagy keresztet kapnak, és ha a kiosztás engedi, látszik a megoldás.
import { Fragment, useState, type ReactNode } from 'react';
import type { TaskResult } from './api';

type Ans = Record<string, any>;
interface Props { task: any; ans: Ans; set: (n: number, v: any) => void; graded?: TaskResult | null; audio?: ReactNode }

const cleanW = (w: string) => w.toLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, '').replace(/[’‘]/g, "'");
const gapCountIn = (s: string) => (s.match(/\{\{gap\}\}/g) || []).length;

/** Kitöltött-e a kérdés (a haladásjelzőhöz és a beküldés előtti figyelmeztetéshez). */
export function filled(task: any, it: any, v: any): boolean {
  if (v == null) return false;
  if (task.kind === 'fix') return !!(v.text && String(v.text).trim());
  if (task.kind === 'order') return Array.isArray(v) && v.length > 0;
  if (Array.isArray(v)) return v.some((s) => s && String(s).trim());
  return !!String(v).trim();
}

/** A beküldendő válasz: a több mezős kulcsszavas kérdésnél a mezők szövege egyben megy (a javító egyben nézi). */
export function toSubmit(task: any, ans: Ans): Ans {
  const out: Ans = {};
  for (const it of task.items) {
    if (it.example || ans[it.n] == null) continue;
    const v = ans[it.n];
    out[it.n] = task.kind === 'text' && !it.gapCount && Array.isArray(v) ? v.filter((x: string) => x && x.trim()).join(' ') : v;
  }
  return out;
}

export default function Task({ task, ans, set, graded, audio }: Props) {
  const [sheet, setSheet] = useState<number | null>(null);
  const item = (n: number) => task.items.find((i: any) => i.n === n);
  const res = (n: number) => graded?.results.find((r) => r.n === n)?.result;
  const sol = (n: number) => graded?.solutions?.[n];
  const done = !!graded;
  const pool = (it: any): any[] => (task.kind === 'bank' ? task.bank : it.options || task.options) || [];
  const mark = (n: number) => { const r = res(n); return r ? (r === 'bad' ? ' bad' : ' ok') : ''; };
  const Sign = ({ n }: { n: number }) => { const r = res(n); return r ? <span className={'sign ' + (r === 'bad' ? 'bad' : 'ok')} aria-label={r === 'bad' ? 'hibás' : 'helyes'}>{r === 'bad' ? '✗' : '✓'}</span> : null; };
  const Fix = ({ n, text }: { n: number; text?: string }) => (res(n) && res(n) !== 'ok' && text ? <span className="solution">✓ {text}</span> : null);
  const optText = (it: any, k: string) => pool(it).find((o: any) => o.key === k)?.text;

  // ---- választós hézag (bank és szövegbe ágyazott feleletválasztás) ----
  const ChoiceGap = ({ it, block }: { it: any; block?: boolean }) => {
    const v = it.example ? it.answer : ans[it.n], text = v != null ? optText(it, v) : null;
    const s = sol(it.n);
    return (<>
      <button type="button" className={'gap' + (block ? ' block' : '') + (it.example ? ' ex' : '') + (text ? ' filled' : '') + mark(it.n)}
        disabled={it.example || done} onClick={() => setSheet(it.n)} aria-label={`${it.example ? 'Példa' : it.n + '. hely'}: ${text || 'üres'}`}>
        <span className="n">{it.example ? 'pl.' : it.n}</span>
        <span className="t">{text || (pool(it)[0]?.text.length > 25 ? 'Koppints a választáshoz' : '· · ·')}</span>
        <Sign n={it.n} />
      </button>
      {res(it.n) === 'bad' && s && <span className="solution">✓ {optText(it, s.keys[0])}</span>}
    </>);
  };

  // ---- beírós mező ----
  const TextIn = ({ it, gi, inStem }: { it: any; gi: number; inStem?: boolean }) => {
    const multi = it.gapCount || (it.stem && gapCountIn(it.stem) > 1);
    const ex = it.example ? (it.gaps ? (it.gaps[gi] || [])[0] : (it.accept || [])[0]) || '' : null;
    const v = ex ?? (multi ? (ans[it.n] || [])[gi] || '' : ans[it.n] || '');
    const onChange = (val: string) => {
      if (!multi) return set(it.n, val);
      const n = it.gapCount || gapCountIn(it.stem), arr = Array.isArray(ans[it.n]) ? [...ans[it.n]] : Array(n).fill('');
      arr[gi] = val; set(it.n, arr);
    };
    return (
      <span className={'tin' + (it.example ? ' ex' : '') + mark(it.n)}>
        {!inStem && <span className="n">{it.example ? 'pl.' : it.n}</span>}
        <input value={v} disabled={it.example || done} onChange={(e) => onChange(e.target.value)} className={multi ? 'short' : ''}
          autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={`${it.n}. kérdés${multi ? `, ${gi + 1}. mező` : ''}`} />
        {it.prompt && <span className="prompt">({it.prompt})</span>}
      </span>
    );
  };

  // ---- szöveg hézagokkal ----
  const Body = () => (
    <div className="body exam">
      {(task.body || []).map((par: string, pi: number) => (
        <p key={pi}>
          {par.split(/(\{\{\d+\}\}|\n)/).map((part, k) => {
            const m = /^\{\{(\d+)\}\}$/.exec(part);
            if (m) {
              if (task.layout !== 'inline') return null;
              const it = item(+m[1]); if (!it) return null;
              const block = par.startsWith(part + '\n');
              return (<span key={k}>{task.kind === 'text' ? TextIn({ it, gi: 0 }) : ChoiceGap({ it, block })}
                {task.kind === 'text' && <><Sign n={it.n} /><Fix n={it.n} text={sol(it.n)?.text} /></>}</span>);
            }
            if (part === '\n') return <br key={k} />;
            return part ? <span key={k}>{part}</span> : null;
          })}
        </p>
      ))}
    </div>
  );

  // ---- állítás / kérdés sor ----
  const StemRow = ({ it }: { it: any }) => {
    const head = <span className="num">{it.example ? 'Példa' : it.n + '.'}</span>;
    if (task.kind === 'text') {
      const parts = String(it.stem || '').split('{{gap}}');
      return (<div className={'item' + (it.example ? ' ex' : '') + mark(it.n)}>
        <p className="stem exam">{head}{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && TextIn({ it, gi: i, inStem: true })}</span>)}<Sign n={it.n} /></p>
        <Fix n={it.n} text={sol(it.n)?.text} />
      </div>);
    }
    if (task.kind === 'bank') return (<div className={'item' + (it.example ? ' ex' : '') + mark(it.n)}><p className="stem exam">{head}{it.stem}</p>{ChoiceGap({ it, block: true })}</div>);
    const opts = it.options || task.options || [], v = [].concat(it.example ? it.answer : ans[it.n] ?? []) as string[];
    const right = new Set<string>(sol(it.n)?.keys || []);
    return (<div className={'item' + (it.example ? ' ex' : '') + mark(it.n)}>
      <p className="stem exam">{head}{it.stem}<Sign n={it.n} /></p>
      <div className={'opts' + (it.options ? ' col' : '')} role={task.kind === 'multi' ? 'group' : 'radiogroup'}>
        {opts.map((o: any) => {
          const on = v.includes(o.key);
          const cls = done && graded?.solutions && !it.example ?(right.has(o.key) ? (on ? ' right' : ' missed') : on ? ' wrong' : '') : on ? ' on' : '';
          return (<button type="button" key={o.key} className={'opt exam' + cls} disabled={it.example || done} aria-pressed={on}
            onClick={() => {
              if (task.kind === 'multi') { const s = new Set(v); s.has(o.key) ? s.delete(o.key) : s.add(o.key); set(it.n, [...s].sort()); }
              else set(it.n, on ? undefined : o.key);
            }}>
            <span className="k">{o.key}</span><span>{o.text}</span>
            {done && graded?.solutions && right.has(o.key) && <span className="tick">✓</span>}
          </button>);
        })}
      </div>
    </div>);
  };

  // ---- soronkénti hibakeresés ----
  const LineRow = ({ it }: { it: any }) => {
    const words: string[] = it.text.split(' ');
    const v = it.example ? (it.answer === null ? 'OK' : { i: words.findIndex((w) => cleanW(w) === it.answer) }) : ans[it.n];
    const s = sol(it.n);
    return (<div className={'item line' + (it.example ? ' ex' : '') + mark(it.n)}>
      <p className="stem exam"><span className="num">{it.example ? 'Példa' : it.n + '.'}</span>
        {words.map((w, i) => (<button type="button" key={i} className={'w' + (v && v !== 'OK' && v.i === i ? ' on' : '')} disabled={it.example || done}
          onClick={() => set(it.n, v && v !== 'OK' && v.i === i ? undefined : { i, w: cleanW(w) })}>{w}</button>))}
        <Sign n={it.n} />
      </p>
      <button type="button" className={'opt okline' + (v === 'OK' ? ' on' : '')} disabled={it.example || done} onClick={() => set(it.n, v === 'OK' ? undefined : 'OK')}>
        <span className="k">✓</span><span>A sor helyes</span></button>
      {res(it.n) === 'bad' && s && <span className="solution">✓ {s.word === null ? 'A sor helyes' : 'Felesleges szó: ' + s.word}</span>}
    </div>);
  };

  // ---- hibás szó javítása ----
  const FixRow = ({ it }: { it: any }) => {
    const words: string[] = it.text.split(' ');
    const v = it.example ? { i: words.findIndex((w) => cleanW(w) === it.fixes[0].wrong), text: it.fixes[0].accept[0] || '' } : ans[it.n] || {};
    return (<div className={'item line' + (it.example ? ' ex' : '') + mark(it.n)}>
      <p className="stem exam"><span className="num">{it.example ? 'Példa' : it.n + '.'}</span>
        {words.map((w, i) => (<button type="button" key={i} className={'w' + (v.i === i ? ' on' : '')} disabled={it.example || done}
          onClick={() => { const nv = { ...v }; if (nv.i === i) { delete nv.i; delete nv.w; } else { nv.i = i; nv.w = cleanW(w); } set(it.n, nv); }}>{w}</button>))}
        <Sign n={it.n} />
      </p>
      <label className="fixin">A helyes szó:
        <input className="exam" value={v.text || ''} disabled={it.example || done} onChange={(e) => set(it.n, { ...v, text: e.target.value })}
          autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} /></label>
      <Fix n={it.n} text={sol(it.n)?.text} />
    </div>);
  };

  // ---- szavak sorba rendezése ----
  const OrderRow = ({ it }: { it: any }) => {
    let v: number[] = ans[it.n] || [];
    if (it.example) { const left = it.words.map((_: string, i: number) => i); v = it.accept[0].map((w: string) => { const k = left.findIndex((i: number) => it.words[i] === w); return left.splice(k, 1)[0]; }); }
    return (<div className={'item' + (it.example ? ' ex' : '') + mark(it.n)}>
      <p className="stem"><span className="num">{it.example ? 'Példa' : it.n + '.'}</span><Sign n={it.n} /></p>
      <div className="seq exam"><b>{it.first}</b>
        {v.map((wi, k) => (<button type="button" key={k} className="w pick" disabled={it.example || done} onClick={() => set(it.n, v.filter((_, j) => j !== k))}>{it.words[wi]}</button>))}
        <b>{it.end || '.'}</b></div>
      <div className="exam">{it.words.map((w: string, wi: number) => (<button type="button" key={wi} className={'w pick' + (v.includes(wi) ? ' used' : '')}
        disabled={it.example || done || v.includes(wi)} onClick={() => set(it.n, [...v, wi])}>{w}</button>))}</div>
      <Fix n={it.n} text={sol(it.n)?.text} />
    </div>);
  };

  // ---- választólap ----
  const Sheet = () => {
    if (sheet == null) return null;
    const it = item(sheet);
    return (<>
      <div className="shade" onClick={() => setSheet(null)} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet + '. hely'}>
        <div className="sh"><span>{sheet}. hely</span><button type="button" className="pill ghost" onClick={() => { set(sheet, undefined); setSheet(null); }}>Törlés</button></div>
        <div className="list">
          {pool(it).map((o: any) => {
            const usedBy = task.kind === 'bank' ? task.items.find((i: any) => (i.example ? i.answer : ans[i.n]) === o.key) : null;
            return (<button type="button" key={o.key} className={'opt exam' + (usedBy ? ' used' : '') + (ans[sheet] === o.key ? ' on' : '')} disabled={!!usedBy?.example}
              onClick={() => { if (usedBy && usedBy.n !== sheet) set(usedBy.n, undefined); set(sheet, o.key); setSheet(null); }}>
              <span className="k">{o.key}</span><span>{o.text}</span>
              {usedBy && <span className="where">{usedBy.example ? 'példa' : usedBy.n + '. helyen'}</span>}
            </button>);
          })}
        </div>
      </div>
    </>);
  };

  return (
    <div className="task">
      <details className="inst" open={!done}>
        <summary>Utasítás</summary>
        <ul className="exam">{task.instructions.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
      </details>
      {audio}
      {task.title && <h3 className="title exam">{task.title}</h3>}
      {task.body && Body()}
      {task.stemLead && <p className="lead exam">{task.stemLead}</p>}
      {task.bankLead && <p className="lead exam">{task.bankLead}</p>}
      {task.kind === 'lines' && task.intro && <p className="exam">{task.intro}</p>}
      {task.kind === 'fix' ? task.items.map((it: any) => <Fragment key={it.n}>{FixRow({ it })}</Fragment>)
        : task.kind === 'order' ? task.items.map((it: any) => <Fragment key={it.n}>{OrderRow({ it })}</Fragment>)
        : task.kind === 'lines' ? task.items.map((it: any) => <Fragment key={it.n}>{LineRow({ it })}</Fragment>)
        : task.layout === 'stems' ? task.items.map((it: any) => <Fragment key={it.n}>{StemRow({ it })}</Fragment>) : null}
      {task.kind === 'lines' && task.outro && <p className="exam">{task.outro}</p>}
      {Sheet()}
    </div>
  );
}
