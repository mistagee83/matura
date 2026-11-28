// Kapcsolat a háttérrel. Élesben: Supabase (get_assignment RPC, submit Edge Function). Helyben, ha nincs beállítva
// VITE_SUPABASE_URL: a fejlesztői kiszolgáló próba-háttere (/dev-api), ugyanazzal a válaszformával.
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const sb = URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'matura-diak' } }) : null;

export type Result = 'ok' | 'typo' | 'bad';
export interface TaskRef { id: string; examId: string; section: 'reading' | 'language' | 'listening'; points: number; exam: { year: number; session: string; level: string }; content: any;
  /** a kulcsos feladat: csak lezárt kiosztásnál jön (a megoldás megnyitása) */ key?: any;
  /** a szójegyzék beküldés előtt látható címszavai (csak az önálló gyakorlásban, olvasásfeladatnál; SPEC 4.5) */ glossary?: GlossEntry[] }
export interface GlossEntry { forms: string[]; lemma: string; pos: string; en: string; hu: string; tip?: string }
export interface Assignment { found: boolean; code: string; status: 'open' | 'closed'; audioMode: 'teacher' | 'student'; solutionVisibility: 'immediate' | 'after_close'; tasks: TaskRef[]; submitted: boolean }
export interface TaskResult { id: string; score: number; max: number; results: { n: number; result: Result }[]; solutions: Record<string, any> | null }
export interface SubmitResult { score: number; max: number; tasks: TaskResult[]; solutionsVisible: boolean }

export async function getAssignment(code: string, deviceId: string): Promise<Assignment> {
  if (sb) {
    const { data, error } = await sb.rpc('get_assignment', { p_code: code, p_device: deviceId });
    if (error) throw error;
    return data as Assignment;
  }
  const q = new URLSearchParams(location.search), p = (k: string) => encodeURIComponent(q.get(k) || '');
  const r = await fetch(`/dev-api/assignment?code=${encodeURIComponent(code)}&device=${deviceId}&vis=${p('vis')}&st=${p('st')}&hang=${p('hang')}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// ---- önálló gyakorlás (SPEC 4.4): tanár, kód és becenév nélkül ----
export interface CatalogTask { id: string; examId: string; section: TaskRef['section']; number: number; examType: string | null; points: number;
  position: number; year: number; session: string; level: 'közép' | 'emelt' }
export interface PracticeResult extends TaskResult { solutions: Record<string, any>;
  /** a szójegyzék megoldást elárulható címszavai: csak a javítás után jönnek */ glossaryAfter?: GlossEntry[] }

let catalogCache: Promise<CatalogTask[]> | null = null;
export function getCatalog(): Promise<CatalogTask[]> {
  if (!catalogCache) {
    catalogCache = (async () => {
      if (sb) { const { data, error } = await sb.rpc('practice_catalog'); if (error) throw error; return data as CatalogTask[]; }
      const r = await fetch('/dev-api/catalog'); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    })();
    catalogCache.catch(() => { catalogCache = null; });
  }
  return catalogCache;
}

export async function getPracticeTask(id: string): Promise<TaskRef | null> {
  if (sb) { const { data, error } = await sb.rpc('practice_task', { p_id: id }); if (error) throw error; return (data as TaskRef) || null; }
  const r = await fetch('/dev-api/practice-task?id=' + encodeURIComponent(id));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

export async function submitPractice(taskId: string, answers: Record<string, unknown>): Promise<PracticeResult> {
  let r: Response;
  try {
    r = await fetch(sb ? `${URL_}/functions/v1/practice` : '/dev-api/practice', { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(sb ? { apikey: KEY! } : {}) }, body: JSON.stringify({ taskId, answers }) });
  } catch { throw new SubmitError('network'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new SubmitError(data.error || 'http_' + r.status);
  return data as PracticeResult;
}

export class SubmitError extends Error { constructor(public reason: string) { super(reason); } }

export async function submit(code: string, nickname: string, deviceId: string, answers: Record<string, Record<string, unknown>>): Promise<SubmitResult> {
  const body = { code, nickname, deviceId, answers, vis: new URLSearchParams(location.search).get('vis') || undefined };
  let r: Response;
  try {
    r = sb
      ? await fetch(`${URL_}/functions/v1/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY! }, body: JSON.stringify(body) })
      : await fetch('/dev-api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch { throw new SubmitError('network'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new SubmitError(data.error || 'http_' + r.status);
  return data as SubmitResult;
}
