// Szójegyzék az olvasásfeladatokhoz (SPEC 4.5): a szövegben a címszavak kiemelése, és koppintásra alul a magyarázat.
// A címszavak a szöveghez előre elkészültek (szojegyzek/); a megoldást elárulható címszavak csak a javítás után érkeznek.
import { useState, type ReactNode } from 'react';
import type { GlossEntry } from './api';

const POS_HU: Record<string, string> = { noun: 'főnév', verb: 'ige', adjective: 'melléknév', adverb: 'határozószó', preposition: 'elöljárószó',
  conjunction: 'kötőszó', pronoun: 'névmás', 'phrasal verb': 'többszavas ige', phrase: 'kifejezés', idiom: 'állandósult kifejezés' };
const key = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type Pick = (e: GlossEntry, text: string) => void;
export type Matcher = (s: string, pick: Pick) => ReactNode;

/** A szöveg címszavait kattintható elemmé alakító függvény. A hosszabb alak nyer („breeding programmes” a „breed” előtt).
 *  Szóhatár: az aposztróf a szó része („don't”), az idézőjelként álló nem („‘fail’”). Lookbehind nélkül, a régebbi iOS miatt. */
export function glossMatcher(list: GlossEntry[]): Matcher | null {
  const byForm = new Map<string, GlossEntry>();
  for (const e of list) for (const f of e.forms) if (!byForm.has(key(f))) byForm.set(key(f), e);
  if (!byForm.size) return null;
  const alts = [...byForm.keys()].sort((a, b) => b.length - a.length).map((f) => esc(f).replace(/'/g, "['‘’]").replace(/ /g, '\\s+'));
  const rx = new RegExp("(^|[^A-Za-z0-9-])(" + alts.join('|') + ")(?![A-Za-z0-9-])(?!['’][A-Za-z])", 'gi');
  return (s, pick) => {
    const out: ReactNode[] = []; let last = 0, m: RegExpExecArray | null;
    rx.lastIndex = 0;
    while ((m = rx.exec(s))) {
      const start = m.index + m[1].length, word = m[2];
      // az aposztróf utáni szórész nem önálló szó (pl. „I’m” „m”-je)
      if (/['’]/.test(m[1]) && /[A-Za-z]/.test(s[m.index - 1] || '')) { rx.lastIndex = m.index + 1; continue; }
      const e = byForm.get(key(word));
      if (!e) { rx.lastIndex = m.index + 1; continue; }
      if (start > last) out.push(s.slice(last, start));
      out.push(<span key={start} className="gl" role="button" tabIndex={0} onClick={() => pick(e, word)}
        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(e, word); } }}>{word}</span>);
      last = start + word.length;
      rx.lastIndex = last;
    }
    if (!out.length) return s;
    if (last < s.length) out.push(s.slice(last));
    return out;
  };
}

// a Szótár kapcsoló állását az eszköz megjegyzi (kényelmi beállítás; ha a tároló nem érhető el, kikapcsolva indul)
const DICT_KEY = 'matura:szotar';
export function useDict(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(DICT_KEY) === '1'; } catch { return false; } });
  return [on, (v) => { setOn(v); try { localStorage.setItem(DICT_KEY, v ? '1' : '0'); } catch { /* nincs tároló */ } }];
}

/** A szójegyzék kapcsolója a feladat fölött: csak ott látszik, ahol a feladathoz van szójegyzék. */
export function DictBar({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (<div className="dictbar">
    <button type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => set(!on)}>Szótár</button>
    <span className="muted">{on ? 'Koppints egy aláhúzott szóra. A vizsgán nincs szótár, ezért csak akkor használd, ha elakadtál.' : 'Bekapcsolva a nehezebb szavak jelentése egy koppintással előhívható.'}</span>
  </div>);
}

/** A magyarázat lapja: angolul elöl, a magyar és a tipp kérésre. A kiemelt kifejezésen belüli önálló címszavak („Benne:”)
 *  külön gombként, mert a szövegben a hosszabb kifejezés kapja a kiemelést. */
export function GlossSheet({ pick, list, onPick, onClose }: { pick: { e: GlossEntry; text: string }; list: GlossEntry[]; onPick: Pick; onClose: () => void }) {
  const [hu, setHu] = useState(false);
  const { e, text } = pick;
  const words = ' ' + key(text).replace(/[^a-z0-9'-]+/g, ' ') + ' ';
  const inner = list.filter((x) => x !== e && x.forms.some((f) => words.includes(' ' + key(f) + ' ')));
  return (
    <div className="glsheet" role="dialog" aria-label="Szómagyarázat">
      <div className="in">
        <div className="gh"><b lang="en">{e.lemma}</b><i>{POS_HU[e.pos] || e.pos}</i>
          <button type="button" className="x" onClick={onClose} aria-label="Bezárás">×</button></div>
        <p className="en exam" lang="en">{e.en}</p>
        {hu ? <><p className="hu">{e.hu}</p>{e.tip && <p className="tip">{e.tip}</p>}</>
          : <button type="button" className="pill ghost" onClick={() => setHu(true)}>Magyarul</button>}
        {inner.length > 0 && <div className="sub">Benne:{inner.map((x) => <button type="button" key={x.lemma + x.forms[0]} lang="en" onClick={() => onPick(x, x.forms[0])}>{x.lemma}</button>)}</div>}
      </div>
    </div>
  );
}
