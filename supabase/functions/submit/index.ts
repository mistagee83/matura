// Beküldés és javítás (SPEC 4.1, 6.). A diák válaszait fogadja, a kulcsot az adatbázisból olvassa (service role),
// javít, elmenti a beküldést, és csak az eredményt küldi vissza; a megoldást csak akkor, ha a kiosztás engedi.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { gradeTask, solutions } from '../_shared/grade.ts';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
// a szerveroldali kulcs: az új kulcsrendszerben SUPABASE_SECRET_KEYS (JSON), a régiben SUPABASE_SERVICE_ROLE_KEY
function serverKey(): string {
  try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); const v = k.default || Object.values(k)[0]; if (v) return String(v); } catch { /* régi rendszer */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const code = String(body?.code || '').trim().toUpperCase(), nickname = String(body?.nickname || '').trim(), device = String(body?.deviceId || '');
  const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {};
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return json({ error: 'bad_code' }, 400);
  if (nickname.length < 1 || nickname.length > 20) return json({ error: 'bad_nickname' }, 400);
  if (!UUID.test(device)) return json({ error: 'bad_device' }, 400);
  if (JSON.stringify(answers).length > 200_000) return json({ error: 'too_large' }, 413);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serverKey(), { auth: { persistSession: false } });
  const { data: a, error: e0 } = await db.from('assignments').select('id, status, solution_visibility').eq('code', code).maybeSingle();
  if (e0) { console.error('assignments', e0); return json({ error: 'db' }, 500); }
  if (!a) return json({ error: 'not_found' }, 404);
  if (a.status !== 'open') return json({ error: 'closed' }, 409);

  const { data: at, error: e1 } = await db.from('assignment_tasks').select('task_id, position').eq('assignment_id', a.id).order('position');
  if (e1 || !at?.length) return json({ error: 'no_tasks' }, 500);
  const { data: keys, error: e2 } = await db.from('task_keys').select('task_id, task').in('task_id', at.map((x) => x.task_id));
  if (e2 || !keys) return json({ error: 'keys' }, 500);
  const byId = new Map(keys.map((k) => [k.task_id, k.task]));

  const showSolutions = a.solution_visibility === 'immediate';
  let score = 0, max = 0;
  const rows: any[] = [], tasks: any[] = [];
  for (const { task_id } of at) {
    const task = byId.get(task_id); if (!task) continue;
    const ans = (answers[task_id] && typeof answers[task_id] === 'object') ? answers[task_id] : {};
    const g = gradeTask(task, ans);
    score += g.score; max += g.max;
    for (const r of g.results) rows.push({ task_id, item_n: r.n, given: ans[r.n] ?? null, result: r.result });
    tasks.push({ id: task_id, score: g.score, max: g.max, results: g.results, solutions: showSolutions ? solutions(task) : null });
  }

  // eszközönként csak az első beküldés számít a statisztikába (SPEC 4.3)
  const { count } = await db.from('submissions').select('id', { count: 'exact', head: true }).eq('assignment_id', a.id).eq('device_id', device);
  const { data: sub, error: e3 } = await db.from('submissions').insert({ assignment_id: a.id, nickname, device_id: device, score, max_score: max, counts: !count }).select('id').single();
  if (e3 || !sub) return json({ error: 'save' }, 500);
  const { error: e4 } = await db.from('answers').insert(rows.map((r) => ({ ...r, submission_id: sub.id })));
  if (e4) { await db.from('submissions').delete().eq('id', sub.id); return json({ error: 'save' }, 500); }

  return json({ score, max, tasks, solutionsVisible: showSolutions });
});
