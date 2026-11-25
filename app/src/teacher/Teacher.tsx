// A tanári felület (SPEC 4.2, 8.6): belépés és regisztráció, kezdőlap (csoportok, legutóbbi kiosztások), feladattár és
// kiosztás, a kiosztás megosztó nézete (kód, link, QR-kód; kivetítésre). Asztali nézetre és kivetítőre készül, telefonon is használható.
// Címek: /tanar, /tanar/feladattar[?csoport=<id>], /tanar/kiosztas/<id> (megosztás, élő nézet, hang, lezárás),
// /tanar/kiosztas/<id>/eredmeny (statisztika), /tanar/uj-jelszo
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import Task from '../Task';
import Player, { clipUrl } from '../Player';
import { solutions } from '../../../supabase/functions/_shared/grade';
import {
  sb, authError, loadGroups, createGroup, updateGroup, deleteGroup, loadAssignments, loadAssignment, deleteAssignment, createAssignment,
  loadLibrary, loadTaskContent, loadSubmissions, deleteSubmission, taskLabel, SECTION, SECTION_LONG,
  loadTaskContents, setAssignmentStatus, loadStats, loadClosedKeys, watchSubmissions, type Stats,
  type Group, type Level, type LibTask, type AssignmentRow, type SubmissionRow, type Section,
} from './data';
import './teacher.css';

const go = (path: string) => { history.pushState(null, '', path); dispatchEvent(new PopStateEvent('popstate')); scrollTo(0, 0); };
const shareUrl = (code: string) => `${location.origin}/k/${code}`;
const shareHost = () => location.host.replace(/^www\./, '');
const dateHu = (s: string) => new Date(s).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' });

export default function Teacher({ path }: { path: string }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!sb) { setSession(null); return; }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((ev, s) => { setSession(s); if (ev === 'PASSWORD_RECOVERY') setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!sb) return <Center><h1>Mr. Andrew's <span className="hl">Matura</span></h1><p className="warn">A tanári felület Supabase-kapcsolat nélkül nem működik. Helyben az <code>app/.env.local</code> fájlban add meg a címet és a kulcsot.</p></Center>;
  if (session === undefined) return <div className="t-page"><div className="t-main"><div className="skel" /><div className="skel" /></div></div>;
  if (recovery || path.startsWith('/tanar/uj-jelszo')) {
    if (!session) return <Center><h1>Új jelszó</h1><p className="warn">A link lejárt vagy már felhasználták. Kérj új jelszó-visszaállító levelet.</p>
      <button className="pill primary" onClick={() => go('/tanar')}>Vissza a belépéshez</button></Center>;
    return <NewPassword done={() => { setRecovery(false); go('/tanar'); }} />;
  }
  if (!session) return <Login />;

  const st = /^\/tanar\/kiosztas\/([0-9a-f-]{36})\/eredmeny\/?$/.exec(path);
  if (st) return <Shell email={session.user.email} active="none"><StatsView key={st[1]} id={st[1]} /></Shell>;
  const m = /^\/tanar\/kiosztas\/([0-9a-f-]{36})\/?$/.exec(path);
  if (m) return <AssignmentView key={m[1]} id={m[1]} />;
  if (path.startsWith('/tanar/feladattar')) return <Shell email={session.user.email} active="lib"><Library /></Shell>;
  return <Shell email={session.user.email} active="home"><Home /></Shell>;
}

// ---------- keret ----------
function Center({ children }: { children: ReactNode }) {
  return <div className="page green"><div className="center-card card t-auth">{children}</div></div>;
}

function Shell({ email, active, children }: { email?: string; active: 'home' | 'lib' | 'none'; children: ReactNode }) {
  const link = (to: string, on: boolean, label: string) =>
    <a href={to} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={(e) => { e.preventDefault(); go(to); }}>{label}</a>;
  return (<div className="t-page">
    <header className="t-top">
      <a className="t-brand" href="/tanar" onClick={(e) => { e.preventDefault(); go('/tanar'); }}>Mr. Andrew's <b>Matura</b></a>
      <nav>{link('/tanar', active === 'home', 'Csoportjaim')}{link('/tanar/feladattar', active === 'lib', 'Feladattár')}</nav>
      {active === 'home' && <button className="pill primary t-cta" onClick={() => go('/tanar/feladattar')}>Feladat kiosztása</button>}
      <div className="t-user"><span title={email}>{email}</span><button className="t-link" onClick={() => sb!.auth.signOut().then(() => go('/tanar'))}>Kilépek</button></div>
    </header>
    {children}
  </div>);
}

// ---------- belépés, regisztráció, elfelejtett jelszó ----------
function Login() {
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [email, setEmail] = useState(''), [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [info, setInfo] = useState('');
  const switchTo = (m: typeof mode) => { setMode(m); setErr(''); setInfo(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error } = await sb!.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + '/tanar/uj-jelszo' });
        if (error) throw error;
        setInfo('Ha van fiók ezzel a címmel, elküldtük rá a jelszó-visszaállító linket. Nézd meg a leveleidet (a levélszemétben is).');
      } else if (mode === 'up') {
        if (pw.length < 8) { setErr('A jelszó legalább 8 karakter legyen.'); return; }
        const { data, error } = await sb!.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: location.origin + '/tanar' } });
        if (error) throw error;
        if (!data.session) setInfo('Elküldtük a megerősítő levelet. A benne lévő linkre kattintva tudsz belépni.');
      } else {
        const { error } = await sb!.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
      }
    } catch (x) { setErr(authError(x)); } finally { setBusy(false); }
  };
  const google = async () => {
    setErr('');
    const { error } = await sb!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/tanar' } });
    if (error) setErr(authError(error));
  };

  return (<Center>
    <h1>Mr. Andrew's <span className="hl">Matura</span></h1>
    <p className="muted">{mode === 'up' ? 'Tanári fiók létrehozása' : mode === 'forgot' ? 'Elfelejtett jelszó' : 'Tanári belépés'}</p>
    {mode !== 'forgot' && <>
      <button className="pill t-google" onClick={google} type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a4 4 0 0 1-1.7 2.6v2.1h2.8c1.6-1.5 2.4-3.7 2.4-6.3z" /><path d="M12 20.5c2.3 0 4.2-.8 5.6-2l-2.8-2.1c-.8.5-1.7.8-2.8.8-2.2 0-4-1.5-4.7-3.4H4.4v2.2A8.5 8.5 0 0 0 12 20.5z" /><path d="M7.3 13.8a5 5 0 0 1 0-3.4V8.2H4.4a8.5 8.5 0 0 0 0 7.8z" /><path d="M12 6.9c1.3 0 2.4.4 3.3 1.3l2.5-2.5A8.5 8.5 0 0 0 4.4 8.2l2.9 2.2C8 8.4 9.8 6.9 12 6.9z" /></svg>
        {mode === 'up' ? 'Regisztrálok Google-fiókkal' : 'Belépek Google-fiókkal'}</button>
      <div className="t-or"><span>vagy e-mail-címmel</span></div>
    </>}
    <form onSubmit={submit}>
      <label className="field">E-mail-cím<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
      {mode !== 'forgot' && <label className="field">Jelszó<input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
        autoComplete={mode === 'up' ? 'new-password' : 'current-password'} minLength={mode === 'up' ? 8 : undefined} required /></label>}
      {mode === 'up' && <p className="hint">Legalább 8 karakter. Aki regisztrál, tanári fiókot kap; a diákoknak nem kell fiók.</p>}
      {err && <p className="t-err" role="alert">{err}</p>}
      {info && <p className="note" role="status">{info}</p>}
      <button className="pill primary" disabled={busy}>
        {busy ? 'Egy pillanat…' : mode === 'up' ? 'Létrehozom a fiókot' : mode === 'forgot' ? 'Kérem a linket' : 'Belépek'}</button>
    </form>
    <div className="t-switch">
      {mode === 'in' && <><button className="t-link" onClick={() => switchTo('forgot')}>Elfelejtettem a jelszavam</button>
        <span>Még nincs fiókod? <button className="t-link" onClick={() => switchTo('up')}>Regisztrálok</button></span></>}
      {mode !== 'in' && <span>{mode === 'up' ? 'Már van fiókod?' : ''} <button className="t-link" onClick={() => switchTo('in')}>Vissza a belépéshez</button></span>}
    </div>
  </Center>);
}

function NewPassword({ done }: { done: () => void }) {
  const [pw, setPw] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  return (<Center>
    <h1>Új jelszó</h1>
    <form onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      if (pw.length < 8) { setErr('A jelszó legalább 8 karakter legyen.'); return; }
      setBusy(true);
      const { error } = await sb!.auth.updateUser({ password: pw });
      setBusy(false);
      if (error) setErr(authError(error)); else done();
    }}>
      <label className="field">Új jelszó<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
      <p className="hint">Legalább 8 karakter.</p>
      {err && <p className="t-err" role="alert">{err}</p>}
      <button className="pill primary" disabled={busy}>{busy ? 'Egy pillanat…' : 'Elmentem az új jelszót'}</button>
    </form>
  </Center>);
}

// ---------- kezdőlap ----------
function useData() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [asg, setAsg] = useState<AssignmentRow[] | null>(null);
  const [lib, setLib] = useState<LibTask[] | null>(null);
  const [err, setErr] = useState('');
  const reload = () => Promise.all([loadGroups(), loadAssignments()]).then(([g, a]) => { setGroups(g); setAsg(a); })
    .catch(() => setErr('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot, és töltsd újra az oldalt.'));
  useEffect(() => { reload(); loadLibrary().then(setLib).catch(() => {}); }, []);
  return { groups, setGroups, asg, lib, err, reload };
}

function Home() {
  const { groups, setGroups, asg, lib, err, reload } = useData();
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const byId = useMemo(() => new Map((lib || []).map((t) => [t.id, t])), [lib]);
  const groupName = (id: string | null) => (id && groups?.find((g) => g.id === id)?.name) || 'Csoport nélkül';
  const describe = (a: AssignmentRow) => {
    const ts = [...a.assignment_tasks].sort((x, y) => x.position - y.position).map((x) => byId.get(x.task_id));
    if (!ts[0]) return a.assignment_tasks.length + ' feladat';
    return taskLabel(ts[0]) + (ts.length > 1 ? ` és további ${ts.length - 1}` : '');
  };

  if (err) return <main className="t-main"><p className="warn">{err}</p></main>;
  if (!groups || !asg) return <main className="t-main"><div className="skel" /><div className="skel" /><div className="skel short" /></main>;
  const active = groups.filter((g) => !g.archived), archived = groups.filter((g) => g.archived);
  const countOf = (g: Group) => asg.filter((a) => a.group_id === g.id).length;

  return (<main className="t-main">
    <h1 className="t-h1">Mit gyakorolunk <span className="hl coral">ma</span>?</h1>

    <section>
      <h2 className="t-h2">Csoportjaim</h2>
      <div className="t-groups">
        {active.map((g) => <GroupCard key={g.id} g={g} count={countOf(g)} onChange={(n) => setGroups(groups.map((x) => (x.id === g.id ? n : x)))}
          onDelete={() => { setGroups(groups.filter((x) => x.id !== g.id)); reload(); }} />)}
        {adding ? <GroupForm onDone={(g) => { setAdding(false); if (g) setGroups([...groups, g]); }} />
          : <button className="t-newgroup" onClick={() => setAdding(true)}><Plus />Új csoport</button>}
      </div>
      {archived.length > 0 && <div className="t-archived">
        <button className="t-link" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>
          Archivált csoportok ({archived.length}) {showArchived ? 'elrejtése' : 'mutatása'}</button>
        {showArchived && <div className="t-groups">{archived.map((g) => <GroupCard key={g.id} g={g} count={countOf(g)}
          onChange={(n) => setGroups(groups.map((x) => (x.id === g.id ? n : x)))} onDelete={() => { setGroups(groups.filter((x) => x.id !== g.id)); reload(); }} />)}</div>}
      </div>}
    </section>

    <section>
      <h2 className="t-h2">Legutóbbi kiosztások</h2>
      {asg.length === 0 ? <div className="card t-empty">
        <p>Még nem osztottál ki feladatot. Válassz egyet a feladattárból, és a diákok kóddal vagy QR-kóddal megnyitják a telefonjukon.</p>
        <button className="pill" onClick={() => go('/tanar/feladattar')}>Feladatot választok</button>
      </div> :<div className="card t-tablebox"><table className="t-table">
        <thead><tr><th>Feladat</th><th>Csoport</th><th>Kód</th><th>Kitöltők</th><th>Kiosztva</th><th>Állapot</th></tr></thead>
        <tbody>{asg.slice(0, 15).map((a) => {
          const n = a.submissions.filter((s) => s.counts).length;
          return (<tr key={a.id}>
            <td><a href={`/tanar/kiosztas/${a.id}`} onClick={(e) => { e.preventDefault(); go(`/tanar/kiosztas/${a.id}`); }}>{describe(a)}</a></td>
            <td>{groupName(a.group_id)}</td><td className="t-code">{a.code}</td><td>{n}</td><td>{dateHu(a.created_at)}</td>
            <td><span className={'t-badge ' + a.status}>{a.status === 'open' ? 'Nyitva' : 'Lezárva'}</span></td>
          </tr>);
        })}</tbody>
      </table></div>}
    </section>
  </main>);
}

const Plus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const LEVEL_LABEL: Record<Level, string> = { 'közép': 'Középszint', emelt: 'Emelt szint' };

function GroupForm({ g, onDone }: { g?: Group; onDone: (g: Group | null) => void }) {
  const [name, setName] = useState(g?.name || ''), [level, setLevel] = useState<Level>(g?.level || 'közép');
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  return (<form className="card t-groupform" onSubmit={async (e) => {
    e.preventDefault(); if (!name.trim()) return; setBusy(true); setErr('');
    try { onDone(g ? await updateGroup(g.id, { name: name.trim(), level }) : await createGroup(name, level)); }
    catch { setErr('Nem sikerült menteni. Próbáld újra.'); setBusy(false); }
  }}>
    <label className="field">A csoport neve<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="pl. 12.B emelt" autoFocus required /></label>
    <fieldset className="t-seg"><legend>Szint</legend>
      {(['közép', 'emelt'] as Level[]).map((l) => <label key={l} className={level === l ? 'on' : ''}>
        <input type="radio" name="level" checked={level === l} onChange={() => setLevel(l)} />{LEVEL_LABEL[l]}</label>)}
    </fieldset>
    {err && <p className="t-err">{err}</p>}
    <div className="actions"><button type="button" className="pill ghost" onClick={() => onDone(null)}>Mégse</button>
      <button className="pill primary" disabled={busy || !name.trim()}>{g ? 'Mentem' : 'Létrehozom'}</button></div>
  </form>);
}

function GroupCard({ g, count, onChange, onDelete }: { g: Group; count: number; onChange: (g: Group) => void; onDelete: () => void }) {
  const [menu, setMenu] = useState(false), [edit, setEdit] = useState(false), [confirm, setConfirm] = useState(false), [err, setErr] = useState('');
  if (edit) return <GroupForm g={g} onDone={(n) => { setEdit(false); if (n) onChange(n); }} />;
  const act = async (f: () => Promise<void>) => { setErr(''); setMenu(false); try { await f(); } catch { setErr('Nem sikerült. Próbáld újra.'); } };
  return (<div className={'card t-group' + (g.archived ? ' archived' : '')}>
    <div className={'t-band ' + (g.level === 'emelt' ? 'emelt' : 'kozep')}>{LEVEL_LABEL[g.level]}{g.archived && ' · archivált'}
      <button className="t-dots" aria-label={`${g.name}: műveletek`} aria-expanded={menu} onClick={() => setMenu(!menu)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
    </div>
    {menu && <div className="t-menu" role="menu">
      <button role="menuitem" onClick={() => { setMenu(false); setEdit(true); }}>Átnevezés, szint</button>
      <button role="menuitem" onClick={() => act(async () => onChange(await updateGroup(g.id, { archived: !g.archived })))}>{g.archived ? 'Visszaállítás' : 'Archiválás'}</button>
      <button role="menuitem" className="danger" onClick={() => { setMenu(false); setConfirm(true); }}>Törlés</button>
    </div>}
    <a className="t-gbody" href={`/tanar/feladattar?csoport=${g.id}`} onClick={(e) => { e.preventDefault(); go(`/tanar/feladattar?csoport=${g.id}`); }}>
      <span className="t-gname">{g.name}</span>
      <span className="muted">{count ? `${count} kiosztás` : 'Még nincs kiosztás'}</span>
      <span className="t-gcta">Feladatot osztok ki nekik</span>
    </a>
    {confirm && <div className="t-confirm" role="alertdialog" aria-label="Csoport törlése">
      <p>Törlöd a(z) <b>{g.name}</b> csoportot? A kiosztásai és az eredményei is törlődnek, és ez nem vonható vissza.</p>
      <div className="actions"><button className="pill ghost" onClick={() => setConfirm(false)}>Mégse</button>
        <button className="pill danger" onClick={() => act(async () => { await deleteGroup(g.id); onDelete(); })}>Végleg törlöm</button></div>
    </div>}
    {err && <p className="t-err">{err}</p>}
  </div>);
}

// ---------- feladattár és kiosztás ----------
const SECTIONS: Section[] = ['reading', 'language', 'listening'];

function Library() {
  const { groups, asg, lib, err } = useData();
  const params = new URLSearchParams(location.search);
  const [groupId, setGroupId] = useState<string>(params.get('csoport') || '');
  const [level, setLevel] = useState<Level | ''>('');
  const [section, setSection] = useState<Section | ''>('');
  const [type, setType] = useState('');
  const [yFrom, setYFrom] = useState(0), [yTo, setYTo] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [preview, setPreview] = useState<LibTask | null>(null);
  const [audioMode, setAudioMode] = useState<'teacher' | 'student'>('teacher');
  const [vis, setVis] = useState<'immediate' | 'after_close'>('after_close');
  const [busy, setBusy] = useState(false), [sendErr, setSendErr] = useState('');
  const [limit, setLimit] = useState(40);

  const activeGroups = (groups || []).filter((g) => !g.archived || g.id === groupId);
  const group = activeGroups.find((g) => g.id === groupId);
  // a csoport szintje az alapértelmezett szűrő
  useEffect(() => { if (group) setLevel(group.level); }, [group?.id]);
  useEffect(() => { setLimit(40); }, [level, section, type, yFrom, yTo]);

  const years = useMemo(() => [...new Set((lib || []).map((t) => t.exams.year))].sort((a, b) => a - b), [lib]);
  const base = useMemo(() => (lib || []).filter((t) => (!level || t.exams.level === level) && (!section || t.section === section)
    && (!yFrom || t.exams.year >= yFrom) && (!yTo || t.exams.year <= yTo)), [lib, level, section, yFrom, yTo]);
  const types = useMemo(() => {
    const c = new Map<string, number>(); for (const t of base) if (t.exam_type) c.set(t.exam_type, (c.get(t.exam_type) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [base]);
  const list = base.filter((t) => !type || t.exam_type === type);
  const byId = useMemo(() => new Map((lib || []).map((t) => [t.id, t])), [lib]);
  // „már megoldották”: a kiválasztott csoportnak kiosztott és legalább egy beküldést kapott feladatok
  const solved = useMemo(() => new Set((asg || []).filter((a) => a.group_id && a.group_id === groupId && a.submissions.length)
    .flatMap((a) => a.assignment_tasks.map((x) => x.task_id))), [asg, groupId]);
  const pickedTasks = picked.map((id) => byId.get(id)).filter(Boolean) as LibTask[];
  const hasListening = pickedTasks.some((t) => t.section === 'listening');
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const assign = async () => {
    setBusy(true); setSendErr('');
    try { const r = await createAssignment(groupId || null, picked, audioMode, vis); go(`/tanar/kiosztas/${r.id}`); }
    catch { setSendErr('Nem sikerült kiosztani. Ellenőrizd az internetkapcsolatot, és próbáld újra.'); setBusy(false); }
  };

  if (err) return <main className="t-main"><p className="warn">{err}</p></main>;
  if (!lib || !groups) return <main className="t-main"><div className="skel" /><div className="skel" /><div className="skel short" /></main>;

  const chip = (on: boolean, label: string, f: () => void) => <button className={'t-chip' + (on ? ' on' : '')} aria-pressed={on} onClick={f}>{label}</button>;
  return (<div className="t-lib">
    <main className="t-libmain">
      <h1 className="t-h1 small">Feladattár</h1>
      <div className="t-filters" role="group" aria-label="Szűrők">
        <div className="t-chips">{chip(!level, 'Mindkét szint', () => setLevel(''))}{chip(level === 'közép', 'Közép', () => setLevel('közép'))}{chip(level === 'emelt', 'Emelt', () => setLevel('emelt'))}</div>
        <div className="t-chips">{chip(!section, 'Minden rész', () => { setSection(''); setType(''); })}
          {SECTIONS.map((s) => <span key={s}>{chip(section === s, SECTION[s], () => { setSection(s); setType(''); })}</span>)}</div>
        <div className="t-selects">
          <label>Feladattípus<select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Minden típus</option>{types.map(([t, n]) => <option key={t} value={t}>{t} ({n})</option>)}</select></label>
          <label>Évtől<select value={yFrom} onChange={(e) => setYFrom(+e.target.value)}><option value={0}>{years[0]}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
          <label>Évig<select value={yTo} onChange={(e) => setYTo(+e.target.value)}><option value={0}>{years[years.length - 1]}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
        </div>
      </div>
      <p className="muted t-count" aria-live="polite">{list.length} feladat a szűrők szerint</p>
      <ul className="t-tasks">{list.slice(0, limit).map((t) => {
        const on = picked.includes(t.id);
        return (<li key={t.id} className={'card t-task' + (on ? ' on' : '')}>
          <label className="t-pick"><input type="checkbox" checked={on} onChange={() => toggle(t.id)} />
            <span className="t-box" aria-hidden="true">{on && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}</span>
            <span className="t-tinfo"><span className="t-tname">{taskLabel(t)} <span className="muted t-lvl">{t.exams.level}szint</span></span>
              <span className="t-tags">{t.exam_type && <span className="t-tag">{t.exam_type}</span>}<span className="muted">{t.points} pont</span>
                {solved.has(t.id) && <span className="t-tag hot">{group?.name}: már megoldották</span>}</span></span>
          </label>
          <button className="pill ghost small" onClick={() => setPreview(t)}>Előnézet</button>
        </li>);
      })}</ul>
      {list.length > limit && <button className="pill ghost t-more" onClick={() => setLimit(limit + 40)}>Még {Math.min(40, list.length - limit)} feladat</button>}
      {list.length === 0 && <p className="note">Ezekkel a szűrőkkel nincs feladat. Lazíts valamelyiken.</p>}
    </main>

    <aside className="t-side" aria-label="Kiosztás">
      <h2>Kiosztás</h2>
      {pickedTasks.length === 0 ? <p className="t-sidehint">Jelölj ki egy vagy több feladatot a listában.</p> : <>
        <p className="t-sidehint">{pickedTasks.length} feladat · {pickedTasks.reduce((n, t) => n + t.points, 0)} pont</p>
        <ol className="t-picked">{pickedTasks.map((t) => <li key={t.id}><span>{taskLabel(t)}</span>
          <button className="t-x" aria-label={`${taskLabel(t)} kivétele`} onClick={() => toggle(t.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></li>)}</ol>
      </>}
      <label className="t-sidelabel" htmlFor="grp">Csoport</label>
      <select id="grp" className="t-sel" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
        <option value="">Csoport nélkül</option>{activeGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      {groups.length === 0 && <p className="t-sidehint">Csoportot a kezdőlapon hozhatsz létre; anélkül is kioszthatsz.</p>}

      <fieldset className="t-radio"><legend className="t-sidelabel">Hanganyag</legend>
        {([['teacher', 'Én játszom le az órán'], ['student', 'A diák hallgatja a saját eszközén']] as const).map(([v, l]) =>
          <label key={v} className={audioMode === v ? 'on' : ''}><input type="radio" name="audio" checked={audioMode === v} onChange={() => setAudioMode(v)} />{l}</label>)}
        <p className="t-sidehint">{hasListening ? (audioMode === 'teacher' ? 'A hangot a kiosztás oldaláról indítod, a kivetítő vagy a hangszóró mellől; a diákok telefonján nincs lejátszó.'
          : 'A diákok a saját telefonjukon hallgatják, fülhallgatóval; a lejátszó a feladat tetején van.')
          : 'Ebben a kiosztásban nincs hallásfeladat, a beállítás nem számít.'}</p>
      </fieldset>

      <fieldset className="t-radio pills"><legend className="t-sidelabel">A megoldást a diák</legend>
        {([['after_close', 'lezárás után látja'], ['immediate', 'azonnal látja']] as const).map(([v, l]) =>
          <label key={v} className={vis === v ? 'on' : ''}><input type="radio" name="vis" checked={vis === v} onChange={() => setVis(v)} />{l}</label>)}
      </fieldset>
      {sendErr && <p className="t-err">{sendErr}</p>}
      <button className="pill primary t-assign" disabled={!picked.length || busy} onClick={assign}>{busy ? 'Kiosztás…' : 'Kiosztom és megosztom'}</button>
    </aside>

    {preview && <Preview t={preview} picked={picked.includes(preview.id)} toggle={() => toggle(preview.id)} close={() => setPreview(null)} />}
  </div>);
}

function Preview({ t, picked, toggle, close }: { t: LibTask; picked: boolean; toggle: () => void; close: () => void }) {
  const [content, setContent] = useState<any>(null), [err, setErr] = useState(false);
  useEffect(() => { loadTaskContent(t.id).then(setContent).catch(() => setErr(true)); }, [t.id]);
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, []);
  return (<><div className="shade" onClick={close} />
    <div className="t-preview" role="dialog" aria-modal="true" aria-label={`Előnézet: ${taskLabel(t)}`}>
      <div className="t-phead"><div><b>{taskLabel(t)}</b><small>{t.exams.level}szint · {SECTION_LONG[t.section]} · {t.points} pont</small></div>
        <button className={'pill ' + (picked ? 'ghost' : 'primary')} onClick={toggle}>{picked ? 'Kiveszem' : 'Kiválasztom'}</button>
        <button className="t-x big" aria-label="Előnézet bezárása" onClick={close}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
      <div className="t-pbody">
        {err ? <p className="warn">Nem sikerült betölteni a feladatot.</p> : !content ? <div className="skel" />
          : <Task task={content} ans={{}} set={() => {}} audio={content.audio ? <div className="note">Hallásfeladat: a diák a hanganyag mellett tölti ki.</div> : null} />}
      </div>
    </div></>);
}

// ---------- a kiosztás: megosztás, élő nézet, hang, lezárás ----------
/** Beküldések élőben: Realtime-értesítésre újratölt; ha a kapcsolat nem áll fel (pl. iskolai tűzfal), 20 mp-enként kérdez. */
function useLiveSubmissions(id: string, extra?: () => void) {
  const [subs, setSubs] = useState<SubmissionRow[] | null>(null);
  const [live, setLive] = useState(false);
  const refresh = () => { loadSubmissions(id).then(setSubs).catch(() => {}); extra?.(); };
  useEffect(() => {
    refresh();
    let t: ReturnType<typeof setTimeout> | undefined;
    const stop = watchSubmissions(id, () => { clearTimeout(t); t = setTimeout(refresh, 400); }, setLive);
    return () => { clearTimeout(t); stop(); };
  }, [id]);
  useEffect(() => {
    if (live) return;
    const p = setInterval(() => { if (!document.hidden) refresh(); }, 20000);
    return () => clearInterval(p);
  }, [live, id]);
  return { subs, live, refresh };
}

function AssignmentView({ id }: { id: string }) {
  const [a, setA] = useState<AssignmentRow | null | undefined>(undefined);
  const [groups, setGroups] = useState<Group[]>([]);
  const [lib, setLib] = useState<LibTask[] | null>(null);
  const [contents, setContents] = useState<Map<string, any>>(new Map());
  const { subs, live, refresh } = useLiveSubmissions(id);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [hide, setHide] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [track, setTrack] = useState(0);
  const [err, setErr] = useState(''), [actErr, setActErr] = useState('');

  useEffect(() => {
    loadAssignment(id).then((x) => {
      setA(x);
      if (x) loadTaskContents(x.assignment_tasks.map((t) => t.task_id)).then((r) => setContents(new Map(r.map((t) => [t.id, t])))).catch(() => {});
    }).catch(() => setErr('Nem sikerült betölteni a kiosztást.'));
    loadGroups().then(setGroups).catch(() => {}); loadLibrary().then(setLib).catch(() => {});
  }, [id]);
  useEffect(() => { if (a) QRCode.toString(shareUrl(a.code), { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#17302A', light: '#FFFFFF' } }).then(setQr); }, [a?.code]);

  if (err) return <div className="t-page"><main className="t-main"><p className="warn">{err}</p><button className="pill" onClick={() => go('/tanar')}>Vissza a kezdőlapra</button></main></div>;
  if (a === undefined) return <div className="t-share"><section className="t-stage"><div className="skel" /></section></div>;
  if (a === null) return <div className="t-page"><main className="t-main"><p className="warn">Ez a kiosztás nem létezik, vagy nem a tiéd.</p><button className="pill" onClick={() => go('/tanar')}>Vissza a kezdőlapra</button></main></div>;

  const byId = new Map((lib || []).map((t) => [t.id, t]));
  const tasks = [...a.assignment_tasks].sort((x, y) => x.position - y.position).map((x) => byId.get(x.task_id)).filter(Boolean) as LibTask[];
  const group = groups.find((g) => g.id === a.group_id);
  const headline = tasks.length === 1 ? `${SECTION[tasks[0].section]} ${tasks[0].number}. feladat` : tasks.length ? `${tasks.length} feladat` : '';
  const url = shareUrl(a.code);
  const counted = (subs || []).filter((s) => s.counts);
  const open = a.status === 'open';
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* a link látszik, kézzel másolható */ } };
  const full = () => { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.().catch(() => {}); };
  const statsPath = `/tanar/kiosztas/${a.id}/eredmeny`;
  const setStatus = async (status: 'open' | 'closed', then?: () => void) => {
    setBusy(true); setActErr('');
    try { await setAssignmentStatus(a.id, status); setA({ ...a, status }); setConfirmClose(false); then?.(); }
    catch { setActErr('Nem sikerült. Ellenőrizd az internetkapcsolatot, és próbáld újra.'); }
    finally { setBusy(false); }
  };

  // tanári hanglejátszó: órai módban a hallásfeladatok hangja innen szól (SPEC 3.7)
  const listening = tasks.filter((t) => t.section === 'listening').map((t) => ({ t, src: clipUrl(contents.get(t.id)?.audio?.clip) }));
  const cur = listening[Math.min(track, listening.length - 1)];

  return (<div className="t-share">
    <section className="t-stage">
      <div className="t-stagetop">
        <a className="t-brand" href="/tanar" onClick={(e) => { e.preventDefault(); go('/tanar'); }}>Mr. Andrew's <b>Matura</b></a>
        <span className="t-pill">{[group?.name, headline].filter(Boolean).join(' · ')}</span>
      </div>
      {open ? <>
        <h1 className="t-bigh">Olvasd be, és <span className="hl">kezdhetjük</span></h1>
        <div className="t-qrrow">
          <div className="t-qr" role="img" aria-label={`QR-kód: ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="t-codebox">
            <div className="t-or2">vagy írd be a böngészőbe</div>
            <div className="t-url">{shareHost()}/k/</div>
            <div className="t-bigcode">{a.code}</div>
          </div>
        </div>
      </> : <>
        <h1 className="t-bigh">A feladat <span className="hl">lezárult</span></h1>
        <p className="t-stagetext">Új beküldést már nem fogad. Aki ezen a telefonon küldte be, ugyanezt a linket megnyitva látja a megoldást:
          <b className="t-inlinecode"> {shareHost()}/k/{a.code}</b></p>
      </>}

      {a.audio_mode === 'teacher' && listening.length > 0 && <div className="t-audio">
        {listening.length > 1 && <div className="t-tracks" role="group" aria-label="Melyik feladat hangja">
          {listening.map((x, i) => <button key={x.t.id} className={'t-chip' + (i === track ? ' on' : '')} aria-pressed={i === track} onClick={() => setTrack(i)}>{x.t.number}. feladat</button>)}</div>}
        {cur.src ? <Player key={cur.src} big src={cur.src} label={`Hanganyag · ${SECTION[cur.t.section]} ${cur.t.number}. feladat`} />
          : <p className="t-stagetext">{contents.size ? 'Ehhez a feladathoz még nincs feltöltve hang.' : 'A hang betöltése…'}</p>}
        <p className="t-stagetext small">Órai mód: a diákok eszközén nincs lejátszó, a hang innen szól. A vizsgán a felvétel minden szöveget kétszer játszik le, a szünetekkel együtt.</p>
      </div>}

      <div className="t-stagebar">
        <button className="pill" onClick={full}>Teljes képernyő</button>
        {open && <button className="pill" onClick={copy}>{copied ? 'Kimásolva' : 'Kimásolom a linket'}</button>}
        <span className={'t-badge ' + a.status}>{open ? 'Nyitva: fogad beküldést' : 'Lezárva'}</span>
      </div>
    </section>

    <aside className="t-panel">
      <div className="t-panelhead"><h2>Beküldések</h2><span className="t-num" aria-live="polite">{subs ? counted.length : '–'}</span></div>
      <p className="muted small">{live ? <><span className="t-live" aria-hidden="true" />A lista magától frissül, ahogy a diákok végeznek.</>
        : 'A lista félpercenként frissül.'} A statisztikába eszközönként csak az első beküldés számít; a többi gyakorlás.</p>
      <label className="t-check"><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />Nevek elrejtése kivetítéskor</label>
      {subs && subs.length === 0 && <p className="note">Még nem érkezett beküldés.</p>}
      <ul className="t-subs">{(subs || []).map((s, i) => <li key={s.id} className={s.counts ? '' : 'practice'}>
        <span className="t-nick">{hide ? `${i + 1}. diák` : s.nickname}{!s.counts && <small> gyakorlás</small>}</span>
        <b>{s.score} / {s.max_score}</b>
        <button className="t-x" aria-label={`${hide ? i + 1 + '. beküldés' : s.nickname} törlése`} onClick={async () => {
          if (!confirm('Törlöd ezt a beküldést? Ez nem vonható vissza.')) return;
          try { await deleteSubmission(s.id); refresh(); } catch { alert('Nem sikerült törölni.'); } }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </li>)}</ul>

      <div className="t-panelactions">
        {actErr && <p className="t-err">{actErr}</p>}
        {open ? (!confirmClose
          ? <button className="pill dark" onClick={() => setConfirmClose(true)}>Lezárom és megnézem az eredményt</button>
          : <div className="t-confirm"><p>Lezárás után a link nem fogad beküldést{a.solution_visibility === 'after_close' ? ', és a diákok látják a megoldást' : ''}. Aki még dolgozik, annak a válasza elvész, ha nem küldte be.</p>
            <div className="actions"><button className="pill ghost" onClick={() => setConfirmClose(false)}>Nyitva hagyom</button>
              <button className="pill dark" disabled={busy} onClick={() => setStatus('closed', () => go(statsPath))}>{busy ? 'Lezárás…' : 'Lezárom'}</button></div></div>)
          : <button className="pill dark" onClick={() => go(statsPath)}>Megnézem az eredményt</button>}
        {open && <button className="pill ghost" onClick={() => go(statsPath)}>Eredmény lezárás nélkül</button>}
      </div>

      <h3>A kiosztás</h3>
      <ul className="t-details">
        {tasks.map((t) => <li key={t.id}>{taskLabel(t)} <span className="muted">({t.exams.level}szint, {t.points} pont)</span></li>)}
        <li>Csoport: {group?.name || 'csoport nélkül'}</li>
        <li>Hanganyag: {a.audio_mode === 'teacher' ? 'a tanár játssza le' : 'a diák saját eszközén'}</li>
        <li>Megoldás: {a.solution_visibility === 'immediate' ? 'azonnal látszik' : 'lezárás után látszik'}</li>
        <li>Kiosztva: {dateHu(a.created_at)}</li>
      </ul>
      <div className="t-panelfoot">
        <button className="pill ghost" onClick={() => go('/tanar')}>Vissza a kezdőlapra</button>
        {!open && <button className="pill ghost" disabled={busy} onClick={() => setStatus('open')}>Újranyitom a beküldést</button>}
        {!confirmDel ? <button className="pill ghost" onClick={() => setConfirmDel(true)}>Törlöm a kiosztást</button>
          : <div className="t-confirm"><p>A kiosztás és minden beküldése törlődik, a kód nem nyit több feladatot. Ez nem vonható vissza.</p>
            <div className="actions"><button className="pill ghost" onClick={() => setConfirmDel(false)}>Mégse</button>
              <button className="pill danger" onClick={async () => { try { await deleteAssignment(a.id); go('/tanar'); } catch { alert('Nem sikerült törölni.'); } }}>Végleg törlöm</button></div></div>}
      </div>
    </aside>
  </div>);
}

// ---------- kiosztásonkénti statisztika (SPEC 4.3) ----------
const pct = (x: number) => Math.round(x * 100);

/** A diák válasza olvasható alakban, a feladat típusa szerint (a statisztika „leggyakoribb rossz válasz” oszlopához). */
function answerText(content: any, n: number, v: any): string {
  const it = (content?.items || []).find((i: any) => i.n === n) || {};
  const pool: any[] = (content?.kind === 'bank' ? content.bank : it.options || content?.options) || [];
  const opt = (k: string) => { const o = pool.find((x) => x.key === k); return o ? `${k} – ${o.text}` : String(k); };
  if (v == null) return '';
  switch (content?.kind) {
    case 'choice': case 'bank': return opt(String(v));
    case 'multi': return ([] as string[]).concat(v).join(', ');
    case 'lines': return v === 'OK' ? 'A sor helyes' : String(v?.w ?? '');
    case 'fix': return [v?.w, v?.text].filter(Boolean).join(' → ');
    case 'order': return Array.isArray(v) ? [it.first, ...v.map((i: number) => it.words?.[i]), it.end || ''].filter(Boolean).join(' ') : '';
    default: return Array.isArray(v) ? v.filter((x) => x).join(' / ') : String(v);
  }
}
/** A helyes válasz rövid alakja (csak lezárás után, a kulcsból). */
function keyText(content: any, n: number, sol: any): string {
  if (!sol) return '';
  if (sol.keys) return ([] as string[]).concat(sol.keys).filter(Boolean).map((k: string) => (content?.kind === 'multi' ? k : answerText(content, n, k))).join(content?.kind === 'multi' ? ', ' : ' / ');
  if ('word' in sol) return sol.word === null ? 'A sor helyes' : 'Felesleges: ' + sol.word;
  return String(sol.text || '');
}

function StatsView({ id }: { id: string }) {
  const [a, setA] = useState<AssignmentRow | null | undefined>(undefined);
  const [lib, setLib] = useState<LibTask[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contents, setContents] = useState<Map<string, any>>(new Map());
  const [keys, setKeys] = useState<Map<string, any>>(new Map());
  const [st, setSt] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  const reloadStats = () => loadStats(id).then(setSt).catch(() => setErr('Nem sikerült betölteni az eredményt.'));
  const { subs } = useLiveSubmissions(id, reloadStats);

  useEffect(() => {
    loadAssignment(id).then((x) => {
      setA(x); if (!x) return;
      loadTaskContents(x.assignment_tasks.map((t) => t.task_id)).then((r) => setContents(new Map(r.map((t) => [t.id, t.content])))).catch(() => {});
      if (x.status === 'closed') loadClosedKeys(x.code).then((k) => setKeys(new Map([...k].map(([tid, key]) => [tid, solutions(key)])))).catch(() => {});
    }).catch(() => setErr('Nem sikerült betölteni a kiosztást.'));
    loadLibrary().then(setLib).catch(() => {}); loadGroups().then(setGroups).catch(() => {});
  }, [id]);

  if (err) return <main className="t-main"><p className="warn">{err}</p></main>;
  if (a === undefined || !st) return <main className="t-main"><div className="skel" /><div className="skel" /><div className="skel short" /></main>;
  if (a === null) return <main className="t-main"><p className="warn">Ez a kiosztás nem létezik, vagy nem a tiéd.</p></main>;

  const byId = new Map((lib || []).map((t) => [t.id, t]));
  const ordered = [...a.assignment_tasks].sort((x, y) => x.position - y.position);
  const tasks = ordered.map((x) => byId.get(x.task_id)).filter(Boolean) as LibTask[];
  const group = groups.find((g) => g.id === a.group_id);
  const stat = new Map(st.items.map((i) => [i.task + '#' + i.n, i]));
  const rows = (t: LibTask) => ((contents.get(t.id)?.items || []) as any[]).filter((i) => !i.example).map((i) => ({ n: i.n as number, s: stat.get(t.id + '#' + i.n) }));
  const all = tasks.flatMap((t) => rows(t).filter((r) => r.s && r.s.total).map((r) => ({ t, ...r, ratio: r.s!.correct / r.s!.total })));
  const hardest = all.length ? all.reduce((m, x) => (x.ratio < m.ratio ? x : m)) : null;
  const hard = all.filter((x) => x.ratio < 0.5);
  const multi = tasks.length > 1;
  const qLabel = (t: LibTask, n: number) => (multi ? `${SECTION[t.section]} ${t.number}. / ${n}.` : `${n}.`);
  const back = `/tanar/kiosztas/${a.id}`;
  const practice = (subs || []).filter((s) => !s.counts).length;

  return (<main className="t-main t-stats">
    <div className="t-statshead">
      <div className="t-statstitle">
        <a className="t-link" href={back} onClick={(e) => { e.preventDefault(); go(back); }}>Vissza a kiosztáshoz</a>
        <div className="muted small">{[group?.name, tasks[0] && `${tasks[0].exams.year}. ${tasks[0].exams.session}, ${tasks[0].exams.level}szint`, a.code].filter(Boolean).join(' · ')}</div>
        <h1 className="t-h1 small">{tasks.length === 1 ? `${SECTION[tasks[0].section]} ${tasks[0].number}.${tasks[0].exam_type ? ' · ' + tasks[0].exam_type : ''}` : `${tasks.length} feladat`}</h1>
      </div>
      <div className="t-tiles">
        <div className="t-tile"><div>Kitöltők</div><b>{st.n}</b></div>
        <div className="t-tile"><div>Átlag</div><b>{st.avg != null ? `${String(Math.round(st.avg * 10) / 10).replace('.', ',')} / ${st.max}` : '–'}</b></div>
        {hardest && <div className="t-tile hot"><div>Legnehezebb</div><b>{qLabel(hardest.t, hardest.n)} kérdés</b></div>}
      </div>
    </div>
    <p className="muted small t-statsnote">
      <span className={'t-badge ' + a.status}>{a.status === 'open' ? 'Nyitva: még érkezhet beküldés' : 'Lezárva'}</span>{' '}
      Eszközönként csak az első beküldés számít{practice ? ` (${practice} gyakorló beküldés kimaradt)` : ''}. Helyesnek számít az elfogadott elírás is.
      {a.status === 'open' && ' A helyes válasz oszlop a lezárás után jelenik meg.'}</p>

    {st.n === 0 ? <div className="card t-empty"><p>Még nincs beküldés, ezért statisztika sincs. Amint az első diák beküldi, itt megjelenik.</p>
      <button className="pill" onClick={() => go(back)}>Vissza a kiosztáshoz</button></div>
      : tasks.map((t) => (<section key={t.id} className="card t-statcard">
        <div className="t-statcardhead"><h2>{multi ? `${SECTION_LONG[t.section]} – ${t.number}. feladat` : 'Kérdésenként'}</h2>
          <span className="muted small">helyes válaszok aránya · leggyakoribb rossz válasz</span></div>
        <div className="t-qgrid" role="table" aria-label={`${SECTION_LONG[t.section]} ${t.number}. feladat kérdésenként`}>
          <div className="t-qrow t-qhead" role="row"><span role="columnheader">Kérdés</span><span role="columnheader">Helyes</span><span role="columnheader" /><span role="columnheader">Leggyakoribb rossz válasz</span>{keys.size > 0 && <span role="columnheader">Megoldás</span>}</div>
          {rows(t).map(({ n, s }) => {
            const r = s && s.total ? s.correct / s.total : null, isHard = r != null && r < 0.5, content = contents.get(t.id);
            const wrong = s && s.wrongN ? `${answerText(content, n, s.wrong)} (${s.wrongN} diák)` : '';
            return (<div key={n} className={'t-qrow' + (isHard ? ' hard' : '')} role="row">
              <span role="cell" className="t-qn">{n}.</span>
              <span role="cell" className="t-bar" aria-hidden="true"><span style={{ width: `${r == null ? 0 : pct(r)}%` }} /></span>
              <span role="cell" className="t-qp">{r == null ? '–' : pct(r) + '%'}</span>
              <span role="cell" className="t-qw exam" title={wrong}>{wrong || (s && s.empty ? '' : '–')}{s && s.empty ? <small>{wrong ? ' · ' : ''}üresen: {s.empty}</small> : null}</span>
              {keys.size > 0 && <span role="cell" className="t-qk exam">{keyText(content, n, keys.get(t.id)?.[n])}</span>}
            </div>);
          })}
        </div>
      </section>))}

    {hard.length > 0 && <p className="note"><b>Érdemes megbeszélni:</b> a csoport kevesebb mint fele válaszolt jól a(z) {hard.map((x) => qLabel(x.t, x.n)).join(', ')} kérdésre.</p>}
  </main>);
}
