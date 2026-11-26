// Önálló gyakorlás: egy feladat javítása (SPEC 4.4). Tanár, kód és becenév nélkül. A kulcsot az adatbázisból olvassa
// (service role), javít, és az eredményt a megoldással együtt küldi vissza. A szerveren csak névtelen darabszám marad
// (feladat, pont, időpont) a practice_runs táblában; a válaszok és az eszköz nem kerülnek mentésre.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gradeTask, solutions } from '../_shared/grade.ts';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
function serverKey(): string {
  try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const v = k.default || Object.values(k)[0]; if (v) return String(v); } catch { /* régi rendszer */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const TASK_ID = /^\d{4}-[a-z0-9]+-(kozep|emelt)-[RLH]\d{1,2}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const taskId = String(body?.taskId || '');
  const answers = body?.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
  if (!TASK_ID.test(taskId)) return json({ error: 'bad_task' }, 400);
  if (JSON.stringify(answers).length > 50_000) return json({ error: 'too_large' }, 413);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serverKey(), { auth: { persistSession: false } });
  const { data: k, error } = await db.from('task_keys').select('task').eq('task_id', taskId).maybeSingle();
  if (error) { console.error('task_keys', error); return json({ error: 'db' }, 500); }
  if (!k) return json({ error: 'not_found' }, 404);

  const g = gradeTask(k.task, answers);
  // a napló hibája nem akadályozza a diákot: az eredményt akkor is megkapja
  const { error: e2 } = await db.from('practice_runs').insert({ task_id: taskId, score: g.score, max_score: g.max });
  if (e2) console.error('practice_runs', e2);
  return json({ id: taskId, score: g.score, max: g.max, results: g.results, solutions: solutions(k.task) });
});
