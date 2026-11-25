// Kapcsolat a háttérrel. Élesben: Supabase (get_assignment RPC, submit Edge Function). Helyben, ha nincs beállítva
// VITE_SUPABASE_URL: a fejlesztői kiszolgáló próba-háttere (/dev-api), ugyanazzal a válaszformával.
import { createClient } from '@supabase/supabase-js';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const sb = URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'matura-diak' } }) : null;

export type Result = 'ok' | 'typo' | 'bad';
export interface TaskRef { id: string; examId: string; section: 'reading' | 'language' | 'listening'; points: number; exam: { year: number; session: string; level: string }; content: any;
  /** a kulcsos feladat: csak lezárt kiosztásnál jön (a megoldás megnyitása) */ key?: any }
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
