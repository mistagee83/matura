// A diák útja (SPEC 4.1, 8.6): kód → belépés becenévvel → feladat(ok) → beküldés → eredmény.
// Címek: /  (nyitóoldal, rajta a kód beírása: Landing.tsx), /k/<kód> (a kiosztás); önálló gyakorlás: /gyakorlas (Practice.tsx, SPEC 4.4).
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Practice from './Practice';
import { Header, go } from './ui';
import { getAssignment, submit, SubmitError, type Assignment, type GlossEntry, type TaskRef, type TaskResult } from './api';
import { DictBar, useDict } from './gloss';
import { solutions } from '../../supabase/functions/_shared/grade';
import Player, { clipUrl } from './Player';
import { deviceId, loadSaved, save, lastNickname, rememberNickname, type Saved } from './store';
import Task, { filled, toSubmit } from './Task';
import Landing from './Landing';
import './landing.css';

const SECTION: Record<string, string> = { reading: 'Olvasott szöveg értése', language: 'Nyelvhelyesség', listening: 'Hallott szöveg értése' };
const label = (t: TaskRef) => `${t.exam.year}. ${t.exam.session}, ${t.exam.level}szint`;
// a tanári felület külön csomag: a diák telefonja nem tölti le
const Teacher = lazy(() => import('./teacher/Teacher'));
// lezárt kiosztásnál a szerver a kulcsos feladatot is küldi; ebből áll elő a megjelenítendő megoldás
const solOf = (t: TaskRef) => (t.key ? solutions(t.key) : null);

export default function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => { const f = () => setPath(location.pathname); addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, []);
  if (path === '/tanar' || path.startsWith('/tanar/')) return <Suspense fallback={null}><Teacher path={path} /></Suspense>;
  if (path === '/gyakorlas' || path.startsWith('/gyakorlas/')) return <Practice path={path} />;
  const m = /^\/k\/([A-Za-z0-9]+)\/?$/.exec(path);
  return m ? <AssignmentView key={m[1]} code={m[1].toUpperCase()} /> : <Landing />;
}

function CodeEntry({ invalid }: { invalid?: string }) {
  const [code, setCode] = useState(invalid || '');
  return (<div className="page green">
    <div className="center-card card">
      <h1>Mr. Andrew's <span className="hl">Matura</span></h1>
      {invalid ? <p className="warn">Ezzel a kóddal nem találtunk feladatot: <b>{invalid}</b>. Nézd meg, jól írtad-e be.</p>
        : <p>Írd be a kódot, amit a tanárodtól kaptál.</p>}
      <form onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (c) go('/k/' + c); }}>
        <label className="field">Kód<input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} /></label>
        <button className="pill primary" disabled={!code.trim()}>Megnyitom a feladatot</button>
      </form>
      <div className="solo">
        <p><b>Nincs kódod?</b> Gyakorolj egyedül a 2005–2026-os érettségik feladataival. Regisztrálnod nem kell.</p>
        <button className="pill ghost" onClick={() => go('/gyakorlas')}>Gyakorlok egyedül</button>
      </div>
      {!invalid && <p className="hint teacher-link">Tanár vagy? <a href="/tanar" onClick={(e) => { e.preventDefault(); go('/tanar'); }}>Itt lépsz be</a>, és kiosztod a feladatot.</p>}
    </div>
  </div>);
}

function AssignmentView({ code }: { code: string }) {
  const device = useMemo(deviceId, []);
  const [a, setA] = useState<Assignment | null>(null);
  const [err, setErr] = useState('');
  const [s, setS] = useState<Saved>(() => loadSaved(code));
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const [showKey, setShowKey] = useState(false);
  const [dict, setDict] = useDict();
  useEffect(() => { getAssignment(code, device).then(setA).catch(() => setErr('Nem sikerült betölteni a feladatot. Ellenőrizd az internetkapcsolatot, és töltsd újra az oldalt.')); }, [code, device]);
  // beküldés után, ha a megoldás csak lezáráskor nyílik meg: időnként megnézzük, lezárta-e már a tanár (SPEC 4.1)
  const waiting = !!s.result && !s.result.solutionsVisible && !!a?.found && a.status === 'open';
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => { if (!document.hidden) getAssignment(code, device).then(setA).catch(() => {}); }, 15000);
    return () => clearInterval(id);
  }, [waiting, code, device]);
  const update = (f: (s: Saved) => Saved) => setS((old) => { const n = f(old); save(code, n); return n; });

  if (err) return <div className="page"><Header title="Matura" /><main><p className="warn">{err}</p></main></div>;
  if (!a) return <div className="page"><Header title="Betöltés…" /><main><div className="skel" /><div className="skel" /><div className="skel short" /></main></div>;
  if (!a.found) return <CodeEntry invalid={code} />;
  const tasks = a.tasks;
  // szójegyzék, ha a tanár bekapcsolta (SPEC 4.5): a megoldást elárulható címszavak csak akkor, amikor a megoldás is látható
  const glossOf = (t: TaskRef, after?: GlossEntry[]) => {
    const list = a.glossary ? [...(t.glossary || []), ...(after || [])] : [];
    return list.length ? { list, on: dict } : undefined;
  };
  const dictBar = (show: boolean) => show && <DictBar on={dict} set={setDict} />;

  // ---- eredmény ----
  if (s.result) {
    const r = s.result;
    const visible = r.solutionsVisible || a.status === 'closed';
    const gradedOf = (t: TaskRef): TaskResult | undefined => {
      const g = r.tasks.find((x) => x.id === t.id);
      return g && { ...g, solutions: r.solutionsVisible ? g.solutions : solOf(t) };
    };
    return (<div className="page">
      <Header title="Eredmény" sub={s.nickname} />
      <main>
        <div className="card score-card"><div className="big">{r.score} / {r.max}</div><div>pont</div></div>
        {tasks.length > 1 && <ul className="tasklist">{r.tasks.map((t) => { const ref = tasks.find((x) => x.id === t.id)!; return <li key={t.id}>{SECTION[ref.section]} – {ref.content.number}. feladat<b>{t.score} / {t.max}</b></li>; })}</ul>}
        {!visible && <p className="warn">A megoldásokat a tanárod a lezárás után nyitja meg. Ha nyitva hagyod ezt az oldalt, magától megjelennek; később ugyanezt a linket ezen az eszközön újra megnyitva is megnézheted őket.</p>}
        {visible && !r.solutionsVisible && <p className="note">A tanárod lezárta a feladatot: lent látod a megoldást.</p>}
        {visible && dictBar(tasks.some((t) => glossOf(t)))}
        {visible && tasks.map((t) => (<section key={t.id} className="graded">
          <h2>{SECTION[t.section]} – {t.content.number}. feladat <span className="muted">{r.tasks.find((x) => x.id === t.id)?.score} / {t.points}</span></h2>
          <Task task={t.content} ans={s.answers[t.id] || {}} set={() => {}} graded={gradedOf(t)} audio={studentAudio(t, a)}
            gloss={glossOf(t, r.solutionsVisible ? r.tasks.find((x) => x.id === t.id)?.glossaryAfter : t.glossaryAfter)} />
        </section>))}
        <div className="actions">
          {a.status === 'open' && <button className="pill ghost" onClick={() => update((o) => ({ ...o, answers: {}, index: 0, result: null }))}>Újra kitöltöm gyakorlásként</button>}
        </div>
      </main>
    </div>);
  }

  // lezárt kiosztás, ezen az eszközön nincs beküldés: csak a feladat és a kulcs látszik (SPEC 4.1, 8.6)
  if (a.status === 'closed') return (<div className="page"><Header title="Matura" sub={tasks[0] && label(tasks[0])} /><main>
    <p className="warn">Ez a feladat lezárult, új megoldást már nem fogad.{s.started ? ' A válaszaidat nem küldted be, ezért pontszám nincs; lent összevetheted őket a megoldással.' : ''}</p>
    {!showKey ? <div className="actions"><button className="pill primary" onClick={() => setShowKey(true)}>Megnézem a megoldást</button></div>
      : <>{dictBar(tasks.some((t) => glossOf(t)))}{tasks.map((t) => (<section key={t.id} className="graded">
        <h2>{SECTION[t.section]} – {t.content.number}. feladat</h2>
        <Task task={t.content} ans={s.answers[t.id] || {}} set={() => {}} keyOnly audio={studentAudio(t, a)}
          graded={{ id: t.id, score: 0, max: 0, results: [], solutions: solOf(t) }} gloss={glossOf(t, t.glossaryAfter)} />
      </section>))}</>}
  </main></div>);

  // ---- belépés ----
  if (!s.started) {
    const nItems = tasks.reduce((n, t) => n + t.points, 0);
    const first = tasks[0];
    return (<div className="page green">
      <div className="center-card card">
        <h1>Mr. Andrew's <span className="hl">Matura</span></h1>
        <p className="muted">{label(first)}</p>
        <ul className="tasklist">{tasks.map((t) => <li key={t.id}>{SECTION[t.section]} – {t.content.number}. feladat<span>{t.points} kérdés</span></li>)}</ul>
        {tasks.length > 1 && <p className="muted">{tasks.length} feladat, összesen {nItems} kérdés</p>}
        {a.submitted && <p className="note">Ezen az eszközön már beküldted egyszer. Újra kitöltheted gyakorlásként.</p>}
        <form onSubmit={(e) => { e.preventDefault(); if (!s.nickname.trim()) return; rememberNickname(s.nickname.trim()); update((o) => ({ ...o, nickname: o.nickname.trim(), started: true })); scrollTo(0, 0); }}>
          <label className="field">Becenév<input value={s.nickname || ''} placeholder={lastNickname() || 'pl. Bagoly'} maxLength={20} autoComplete="off"
            onChange={(e) => update((o) => ({ ...o, nickname: e.target.value }))} /></label>
          <p className="hint">Ne a valódi neved írd be, hanem egy becenevet, amiről a tanárod felismer.</p>
          <button className="pill primary" disabled={!s.nickname.trim()}>Kezdem a feladatot</button>
        </form>
      </div>
    </div>);
  }

  // ---- kitöltés ----
  const idx = Math.min(s.index, tasks.length - 1), t = tasks[idx];
  const ans = s.answers[t.id] || {};
  const real = (x: TaskRef) => x.content.items.filter((i: any) => !i.example);
  const emptyOf = (x: TaskRef) => real(x).filter((i: any) => !filled(x.content, i, (s.answers[x.id] || {})[i.n])).length;
  const doneN = real(t).length - emptyOf(t);
  const setAns = (n: number, v: any) => update((o) => ({ ...o, answers: { ...o.answers, [t.id]: { ...(o.answers[t.id] || {}), [n]: v } } }));
  const last = idx === tasks.length - 1;
  const totalEmpty = tasks.reduce((n, x) => n + emptyOf(x), 0);

  const send = async () => {
    setSending(true); setSendErr('');
    try {
      const payload = Object.fromEntries(tasks.map((x) => [x.id, toSubmit(x.content, s.answers[x.id] || {})]));
      const result = await submit(code, s.nickname, device, payload);
      update((o) => ({ ...o, result })); scrollTo(0, 0);
    } catch (e) {
      const why = e instanceof SubmitError ? e.reason : 'network';
      setSendErr(why === 'closed' ? 'A feladatot közben lezárták, új megoldást már nem fogad.' : 'Nem sikerült beküldeni. A válaszaid megmaradtak ezen az eszközön; próbáld újra.');
    } finally { setSending(false); setConfirmEmpty(false); }
  };

  const audio = t.content.audio ? (a.audioMode === 'teacher'
    ? <div className="note teacher-audio"><SpeakerIcon /><span>A hanganyagot a tanárod indítja. Figyeld a hangszórót.</span></div>
    : studentAudio(t, a) || <div className="note">A hanganyag még nincs feltöltve.</div>) : null;

  return (<div className="page">
    <Header title={`${SECTION[t.section]} – ${t.content.number}. feladat`} sub={t.content.examType} right={`${doneN} / ${real(t).length}`} />
    <main>
      {tasks.length > 1 && <p className="muted step">{idx + 1} / {tasks.length} feladat</p>}
      {dictBar(!!glossOf(t))}
      <Task key={t.id} task={t.content} ans={ans} set={setAns} audio={audio} gloss={glossOf(t)} />
    </main>
    {confirmEmpty && <><div className="shade" onClick={() => setConfirmEmpty(false)} /><div className="sheet" role="dialog" aria-modal="true">
      <div className="sh"><span>Még üres: {totalEmpty} kérdés</span></div>
      <div className="list">
        {tasks.filter((x) => emptyOf(x)).map((x) => <p key={x.id}>{SECTION[x.section]} – {x.content.number}. feladat: {emptyOf(x)} üres</p>)}
        <div className="actions"><button className="pill ghost" onClick={() => setConfirmEmpty(false)}>Visszamegyek</button>
          <button className="pill primary" disabled={sending} onClick={send}>Beküldöm így</button></div>
      </div></div></>}
    <footer className="foot">
      {sendErr && <p className="warn">{sendErr}</p>}
      <div className="in">
        {tasks.length > 1 && <button className="pill ghost" disabled={idx === 0} onClick={() => { update((o) => ({ ...o, index: idx - 1 })); scrollTo(0, 0); }}>Előző</button>}
        {!last ? <button className="pill primary" onClick={() => { update((o) => ({ ...o, index: idx + 1 })); scrollTo(0, 0); }}>Következő</button>
          : <button className="pill primary" disabled={sending} onClick={() => (totalEmpty ? setConfirmEmpty(true) : send())}>{sending ? 'Beküldés…' : 'Beküldöm'}</button>}
      </div>
    </footer>
  </div>);
}

const SpeakerIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M4 10v4h4l5 4V6L8 10H4z" /><path d="M16.5 9a4 4 0 010 6" /><path d="M19 6.5a8 8 0 010 11" /></svg>);

/** A diák lejátszója: csak a „diák hallgatja” hangmódban, és csak ha van hangcím (SPEC 3.7). */
function studentAudio(t: TaskRef, a: Assignment) {
  const src = a.audioMode === 'student' ? clipUrl(t.content.audio?.clip) : '';
  return src ? <div className="audio"><Player src={src} label="Hanganyag" /></div> : null;
}
