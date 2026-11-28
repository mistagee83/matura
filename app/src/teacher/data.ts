// A tanári felület kapcsolata a Supabase-szel. A tanár bejelentkezik (e-mail és jelszó vagy Google); minden lekérdezés
// a saját jogosultságával fut, a sorszintű szabályok miatt csak a saját csoportjait, kiosztásait és eredményeit látja.
// A feladattárban a feladatok kulcs nélkül jönnek (a kulcs csak a szerveroldali javítóé).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const sb: SupabaseClient | null = URL_ && KEY
  ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'matura-tanar' } })
  : null;

export type Level = 'közép' | 'emelt';
export type Section = 'reading' | 'language' | 'listening';
export interface Group { id: string; name: string; level: Level; archived: boolean; created_at: string }
export interface LibTask { id: string; exam_id: string; section: Section; number: number; kind: string; exam_type: string | null; points: number; position: number;
  exams: { year: number; session: string; level: Level } }
export interface AssignmentRow { id: string; code: string; status: 'open' | 'closed'; created_at: string; audio_mode: 'teacher' | 'student';
  solution_visibility: 'immediate' | 'after_close'; glossary: boolean; group_id: string | null;
  assignment_tasks: { task_id: string; position: number }[]; submissions: { score: number; max_score: number; counts: boolean }[] }
export interface SubmissionRow { id: string; nickname: string; score: number; max_score: number; counts: boolean; created_at: string }

export const SECTION: Record<Section, string> = { reading: 'Olvasás', language: 'Nyelvhelyesség', listening: 'Hallás' };
export const SECTION_LONG: Record<Section, string> = { reading: 'Olvasott szöveg értése', language: 'Nyelvhelyesség', listening: 'Hallott szöveg értése' };
const SESSION_ORDER: Record<string, number> = { 'február': 1, 'május': 2, 'május (második feladatsor)': 3, 'október': 4, 'november': 5 };
export const taskLabel = (t: LibTask) => `${t.exams.year}. ${t.exams.session} · ${SECTION[t.section]} ${t.number}.`;
export const sortTasks = (a: LibTask, b: LibTask) =>
  b.exams.year - a.exams.year || (SESSION_ORDER[b.exams.session] || 0) - (SESSION_ORDER[a.exams.session] || 0)
  || a.exams.level.localeCompare(b.exams.level) || a.position - b.position;

const must = () => { if (!sb) throw new Error('nincs Supabase-beállítás'); return sb; };
const check = <T,>({ data, error }: { data: T | null; error: unknown }): T => { if (error) throw error; return data as T; };

let libCache: Promise<LibTask[]> | null = null;
export function loadLibrary(): Promise<LibTask[]> {
  if (!libCache) {
    libCache = Promise.resolve(must().from('tasks').select('id, exam_id, section, number, kind, exam_type, points, position, exams(year, session, level)')
      .range(0, 1999)).then((r) => (check(r as any) as LibTask[]).sort(sortTasks));
    libCache.catch(() => { libCache = null; });
  }
  return libCache;
}
export const loadTaskContent = async (id: string) => (check(await must().from('tasks').select('content').eq('id', id).single()) as any).content;

export const loadGroups = async () => check(await must().from('groups').select('id, name, level, archived, created_at').order('created_at')) as Group[];
export const createGroup = async (name: string, level: Level) => check(await must().from('groups').insert({ name: name.trim(), level }).select().single()) as Group;
export const updateGroup = async (id: string, patch: Partial<Pick<Group, 'name' | 'level' | 'archived'>>) =>
  check(await must().from('groups').update(patch).eq('id', id).select().single()) as Group;
export const deleteGroup = async (id: string) => { check(await must().from('groups').delete().eq('id', id)); };

const ASG = 'id, code, status, created_at, audio_mode, solution_visibility, glossary, group_id, assignment_tasks(task_id, position), submissions(score, max_score, counts)';
export const loadAssignments = async () => check(await must().from('assignments').select(ASG).order('created_at', { ascending: false })) as AssignmentRow[];
export const loadAssignment = async (id: string) => check(await must().from('assignments').select(ASG).eq('id', id).maybeSingle()) as AssignmentRow | null;
export const deleteAssignment = async (id: string) => { check(await must().from('assignments').delete().eq('id', id)); };
export const createAssignment = async (group: string | null, tasks: string[], audioMode: 'teacher' | 'student', visibility: 'immediate' | 'after_close', glossary: boolean) =>
  check(await must().rpc('create_assignment', { p_group: group, p_tasks: tasks, p_audio_mode: audioMode, p_solution_visibility: visibility, p_glossary: glossary })) as { id: string; code: string };

export const loadSubmissions = async (assignmentId: string) =>
  check(await must().from('submissions').select('id, nickname, score, max_score, counts, created_at').eq('assignment_id', assignmentId).order('created_at')) as SubmissionRow[];
export const deleteSubmission = async (id: string) => { check(await must().from('submissions').delete().eq('id', id)); };

/** A Supabase belépési hibaüzenetei magyarul. */
export function authError(e: any): string {
  const m = String(e?.message || e || ''), code = String(e?.code || '');
  if (/invalid login credentials/i.test(m) || code === 'invalid_credentials') return 'Hibás e-mail-cím vagy jelszó.';
  if (/already registered|already been registered/i.test(m) || code === 'user_already_exists') return 'Ezzel a címmel már van fiók. Lépj be, vagy kérj új jelszót.';
  if (/password should be|weak/i.test(m) || code === 'weak_password') return 'A jelszó túl gyenge: legalább 8 karakter legyen.';
  if (/rate limit|too many/i.test(m) || code.includes('rate_limit')) return 'Túl sok próbálkozás. Várj néhány percet, és próbáld újra.';
  if (/invalid.*email|email.*invalid/i.test(m) || code === 'email_address_invalid') return 'Ez nem érvényes e-mail-cím.';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'A Google-belépés még nincs bekapcsolva. Addig lépj be e-mail-címmel.';
  if (/same.*password|different from the old/i.test(m) || code === 'same_password') return 'Az új jelszó nem egyezhet a régivel.';
  if (/fetch|network/i.test(m)) return 'Nincs kapcsolat a kiszolgálóval. Ellenőrizd az internetet.';
  return 'Nem sikerült: ' + m;
}

// ---------- 3. szakasz: élő nézet, lezárás, statisztika ----------
/** A kiosztás feladatainak kulcs nélküli tartalma és hangja (a hanglejátszóhoz és a statisztika kérdéseihez). */
export const loadTaskContents = async (ids: string[]) =>
  ids.length ? check(await must().from('tasks').select('id, content, audio').in('id', ids)) as { id: string; content: any; audio: any }[] : [];

/** Lezárás és újranyitás. Lezárás után a link nem fogad beküldést, és a diákok látják a megoldást. */
export const setAssignmentStatus = async (id: string, status: 'open' | 'closed') =>
  check(await must().from('assignments').update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null }).eq('id', id).select('id, status').single());

export interface ItemStat { task: string; n: number; total: number; correct: number; typo: number; empty: number; wrong: any; wrongN: number }
export interface Stats { n: number; avg: number | null; max: number | null; items: ItemStat[] }
/** Kiosztásonkénti statisztika (eszközönként az első beküldés); más tanár kiosztására üres. */
export const loadStats = async (id: string) => check(await must().rpc('assignment_stats', { p_assignment: id })) as Stats;

/** A lezárt kiosztás kulcsa a diák felületén keresztül (get_assignment): nyitott kiosztásnál nincs benne. */
export const loadClosedKeys = async (code: string) => {
  const r = check(await must().rpc('get_assignment', { p_code: code })) as any;
  return new Map<string, any>((r?.tasks || []).filter((t: any) => t.key).map((t: any) => [t.id, t.key]));
};

/**
 * Élő frissítés: a Supabase Realtime szól, ha a kiosztáshoz beküldés érkezik vagy törlődik (a sorszintű szabály szerint csak a
 * saját kiosztásnál). A hívó ilyenkor újratölti a listát. Visszaadja a leiratkozó függvényt; `onState` a kapcsolat állapota.
 */
export function watchSubmissions(assignmentId: string, onChange: () => void, onState: (live: boolean) => void) {
  const ch = must().channel('bekuldesek-' + assignmentId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `assignment_id=eq.${assignmentId}` }, () => onChange())
    .subscribe((status) => onState(status === 'SUBSCRIBED'));
  return () => { must().removeChannel(ch); };
}

// ---------- 4. szakasz: csoportszintű trendek ----------
/** Csoportonként és feladatonként a helyes válaszok száma (eszközönként az első beküldés); csak a saját csoportokról. */
export const loadTrends = async () => check(await must().rpc('group_trends')) as import('./trends').TrendRow[];
