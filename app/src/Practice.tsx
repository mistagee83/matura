// Önálló gyakorlás (SPEC 4.4): tanár, kód, becenév és fiók nélkül. Címek: /gyakorlas (a feladatok listája) és
// /gyakorlas/<feladatazonosító> (egy feladat). A javítás a szerveren fut, az eredmény a megoldással együtt azonnal jön.
// A diák haladása (válaszok, utolsó eredmény, szűrés) csak az eszközén, a localStorage-ban tárolódik.
import { useEffect, useMemo, useState } from 'react';
import { getCatalog, getPracticeTask, submitPractice, type CatalogTask, type TaskRef } from './api';
import Player, { clipUrl } from './Player';
import { loadFilter, saveFilter, loadPractice, savePractice, practiceDone, type PracticeFilter, type PracticeSaved } from './store';
import Task, { filled, toSubmit } from './Task';
import { Header, go } from './ui';

const SECTION: Record<string, string> = { reading: 'Olvasás', language: 'Nyelvhelyesség', listening: 'Hallás' };
const SECTION_LONG: Record<string, string> = { reading: 'Olvasott szöveg értése', language: 'Nyelvhelyesség', listening: 'Hallott szöveg értése' };
const SESSION_ORDER: Record<string, number> = { 'február': 1, 'május': 2, 'május (második feladatsor)': 3, 'október': 4, 'november': 5 };
const byExam = (a: CatalogTask, b: CatalogTask) =>
  b.year - a.year || (SESSION_ORDER[b.session] || 0) - (SESSION_ORDER[a.session] || 0) || a.position - b.position;
const examLabel = (t: { year: number; session: string }) => `${t.year}. ${t.session}`;
const matches = (f: PracticeFilter) => (t: CatalogTask) => t.level === f.level && (f.section === 'all' || t.section === f.section);
const LOAD_ERR = 'Nem sikerült betölteni. Ellenőrizd az internetkapcsolatot, és töltsd újra az oldalt.';
// a Szótár kapcsoló állását az eszköz megjegyzi (kényelmi beállítás; ha a tároló nem érhető el, kikapcsolva indul)
const DICT_KEY = 'matura:szotar';
const loadDict = () => { try { return localStorage.getItem(DICT_KEY) === '1'; } catch { return false; } };
const saveDict = (on: boolean) => { try { localStorage.setItem(DICT_KEY, on ? '1' : '0'); } catch { /* nincs tároló */ } };

/** A szójegyzék kapcsolója a feladat fölött (SPEC 4.5): csak ott látszik, ahol a feladathoz van szójegyzék. */
function DictBar({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (<div className="dictbar">
    <button type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => set(!on)}>Szótár</button>
    <span className="muted">{on ? 'Koppints egy aláhúzott szóra. A vizsgán nincs szótár, ezért csak akkor használd, ha elakadtál.' : 'Bekapcsolva a nehezebb szavak jelentése egy koppintással előhívható.'}</span>
  </div>);
}

export default function Practice({ path }: { path: string }) {
  const m = /^\/gyakorlas\/([0-9a-z-]+[RLH]\d+)\/?$/.exec(path);
  return m ? <PracticeTask key={m[1]} id={m[1]} /> : <PracticeList />;
}

const Check = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);

function PracticeList() {
  const [all, setAll] = useState<CatalogTask[] | null>(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState<PracticeFilter>(loadFilter);
  const done = useMemo(practiceDone, []);
  useEffect(() => { getCatalog().then((c) => setAll([...c].sort(byExam))).catch(() => setErr(LOAD_ERR)); }, []);
  const change = (p: Partial<PracticeFilter>) => setF((o) => { const n = { ...o, ...p }; saveFilter(n); return n; });

  const shown = useMemo(() => (all || []).filter(matches(f)), [all, f]);
  const groups = useMemo(() => {
    const g: { key: string; label: string; tasks: CatalogTask[] }[] = [];
    for (const t of shown) { const last = g[g.length - 1]; if (last?.key === t.examId) last.tasks.push(t); else g.push({ key: t.examId, label: examLabel(t), tasks: [t] }); }
    return g;
  }, [shown]);
  const doneN = shown.filter((t) => done[t.id]).length;
  const random = () => { const pool = shown.filter((t) => !done[t.id]); const from = pool.length ? pool : shown; if (from.length) go('/gyakorlas/' + from[Math.floor(Math.random() * from.length)].id); };

  return (<div className="page">
    <Header title="Gyakorlás" sub="Érettségi feladatok, 2005–2026" back={{ label: 'Vissza a kezdőoldalra', to: '/' }} />
    <main className="practice">
      <p className="lead-in">Válassz egy feladatot a korábbi érettségikből. Beküldés után rögtön látod, mit oldottál meg jól, és mi lett volna a helyes válasz.
        Nem kell hozzá regisztrálnod: az eredményeidet csak ez az eszköz jegyzi meg.</p>
      <div className="seg" role="group" aria-label="Szint">
        {(['közép', 'emelt'] as const).map((l) => <button key={l} className={f.level === l ? 'on' : ''} aria-pressed={f.level === l} onClick={() => change({ level: l })}>{l === 'közép' ? 'Középszint' : 'Emelt szint'}</button>)}
      </div>
      <div className="chips" role="group" aria-label="Vizsgarész">
        {(['all', 'reading', 'language', 'listening'] as const).map((s) => <button key={s} className={'chip' + (f.section === s ? ' on' : '')} aria-pressed={f.section === s}
          onClick={() => change({ section: s })}>{s === 'all' ? 'Mind' : SECTION[s]}</button>)}
      </div>
      {err && <p className="warn">{err}</p>}
      {!all && !err && <><div className="skel" /><div className="skel" /><div className="skel short" /></>}
      {all && <>
        <div className="ptools">
          <span className="muted">{shown.length} feladat{doneN ? `, ebből ${doneN} megoldva` : ''}</span>
          <button className="pill primary" onClick={random} disabled={!shown.length}>Adj egy feladatot</button>
        </div>
        {groups.map((g) => (<section key={g.key} className="pgroup">
          <h2>{g.label}</h2>
          <ul className="plist">{g.tasks.map((t) => { const d = done[t.id]; return (<li key={t.id}>
            <a href={'/gyakorlas/' + t.id} onClick={(e) => { e.preventDefault(); go('/gyakorlas/' + t.id); }}>
              <span className="pmain"><b>{SECTION[t.section]} {t.number}.</b>{t.examType && <small>{t.examType}</small>}</span>
              {d ? <span className="pdone"><Check />{d.score} / {d.max}</span> : <span className="pcount">{t.points} kérdés</span>}
            </a></li>); })}</ul>
        </section>))}
        {!shown.length && <p className="muted">Ebben a szűrésben nincs feladat.</p>}
      </>}
    </main>
  </div>);
}

function PracticeTask({ id }: { id: string }) {
  const [t, setT] = useState<TaskRef | null | undefined>(undefined);
  const [err, setErr] = useState('');
  const [s, setS] = useState<PracticeSaved>(() => loadPractice(id));
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [next, setNext] = useState<CatalogTask | null>(null);
  useEffect(() => { getPracticeTask(id).then(setT).catch(() => setErr(LOAD_ERR)); }, [id]);
  // a „Következő feladat” a lista sorrendjében, a diák szűrésével (szint, vizsgarész)
  useEffect(() => {
    getCatalog().then((c) => {
      const f = loadFilter(), sorted = [...c].sort(byExam), me = sorted.findIndex((x) => x.id === id);
      const list = sorted.filter((x, i) => i > me && matches(f)(x));
      setNext(list[0] || null);
    }).catch(() => {});
  }, [id]);
  const update = (fn: (o: PracticeSaved) => PracticeSaved) => setS((o) => { const n = fn(o); savePractice(id, n); return n; });
  const [dict, setDictState] = useState(loadDict);
  const setDict = (v: boolean) => { setDictState(v); saveDict(v); };
  // beküldés előtt csak a nyilvános címszavak; a javítás után a megoldást elárulhatók is
  const glossAll = useMemo(() => [...(t?.glossary || []), ...(s.result?.glossaryAfter || [])], [t, s.result]);
  const gloss = { list: glossAll, on: dict };
  const dictBar = glossAll.length > 0 && <DictBar on={dict} set={setDict} />;
  const back = { label: 'Vissza a feladatokhoz', to: '/gyakorlas' };

  if (err) return <div className="page"><Header title="Gyakorlás" back={back} /><main><p className="warn">{err}</p></main></div>;
  if (t === undefined) return <div className="page"><Header title="Betöltés…" back={back} /><main><div className="skel" /><div className="skel" /><div className="skel short" /></main></div>;
  if (t === null) return <div className="page"><Header title="Gyakorlás" back={back} /><main>
    <p className="warn">Ilyen feladatot nem találtunk.</p>
    <div className="actions"><button className="pill primary" onClick={() => go('/gyakorlas')}>A feladatok listája</button></div></main></div>;

  const title = `${SECTION_LONG[t.section]} – ${t.content.number}. feladat`;
  const sub = `${examLabel(t.exam)}, ${t.exam.level}szint`;
  const src = clipUrl(t.content.audio?.clip);
  const audio = t.content.audio ? (src ? <div className="audio"><Player src={src} label="Hanganyag" /></div> : <div className="note">Ehhez a feladathoz még nincs hanganyag.</div>) : null;
  const nextBtn = next && <button className="pill primary" onClick={() => go('/gyakorlas/' + next.id)}>Következő feladat</button>;

  // ---- eredmény ----
  if (s.result) {
    const r = s.result;
    return (<div className="page">
      <Header title={title} sub={sub} back={back} />
      <main>
        <div className="card score-card"><div className="big">{r.score} / {r.max}</div><div>pont</div></div>
        <p className="note">Lent látod, melyik válaszod jó és melyik nem, és a hibás helyeken a helyes választ.</p>
        {dictBar}
        <Task task={t.content} ans={s.answers} set={() => {}} graded={r} audio={audio} gloss={gloss} />
        <div className="actions">
          <button className="pill ghost" onClick={() => { update((o) => ({ ...o, answers: {}, result: null })); scrollTo(0, 0); }}>Újra megoldom</button>
          {nextBtn}
          <button className="pill ghost" onClick={() => go('/gyakorlas')}>Vissza a feladatokhoz</button>
        </div>
      </main>
    </div>);
  }

  // ---- kitöltés ----
  const real = t.content.items.filter((i: any) => !i.example);
  const empty = real.filter((i: any) => !filled(t.content, i, s.answers[i.n])).length;
  const setAns = (n: number, v: any) => { setConfirmEmpty(false); update((o) => ({ ...o, answers: { ...o.answers, [n]: v } })); };
  const send = async () => {
    setSending(true); setSendErr('');
    try {
      const result = await submitPractice(t.id, toSubmit(t.content, s.answers));
      update((o) => ({ ...o, result, done: { score: result.score, max: result.max } })); scrollTo(0, 0);
    } catch { setSendErr('Nem sikerült ellenőrizni. A válaszaid megmaradtak ezen az eszközön; próbáld újra.'); }
    finally { setSending(false); setConfirmEmpty(false); }
  };

  return (<div className="page">
    <Header title={title} sub={sub} right={`${real.length - empty} / ${real.length}`} back={back} />
    <main>
      {dictBar}
      <Task key={t.id} task={t.content} ans={s.answers} set={setAns} audio={audio} gloss={gloss} />
    </main>
    <footer className="foot">
      {sendErr && <p className="warn">{sendErr}</p>}
      {confirmEmpty && <p className="warn">Még {empty} kérdés üres. Ellenőrzöd így is?</p>}
      <div className="in">
        <button className="pill primary" disabled={sending} onClick={() => (empty && !confirmEmpty ? setConfirmEmpty(true) : send())}>
          {sending ? 'Ellenőrzés…' : confirmEmpty ? 'Ellenőrzöm így' : 'Ellenőrzöm'}</button>
      </div>
    </footer>
  </div>);
}
