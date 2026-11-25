// A tartalom/ feladatsoraiból előállítja a supabase/seed.sql fájlt: feladatsorok, feladatok kulcs nélkül, kulcsok külön táblában,
// és két próbakiosztás a két kézzel készült mintasorra (MINTA24K, MINTA24E). Újrafuttatható: minden sor upsert.
// Használat: node eszkozok/seed.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { publicTask } from '../supabase/functions/_shared/grade.ts';

const root = new URL('../', import.meta.url);
const dir = new URL('tartalom/', root);
const TAG = '$mtr$';
const q = (v: unknown) => { const s = typeof v === 'string' ? v : JSON.stringify(v); if (s.includes(TAG)) throw new Error('A tartalomban szerepel a ' + TAG + ' jel'); return TAG + s + TAG; };
const LEVEL: Record<string, string> = { kozep: 'közép', emelt: 'emelt' };

const out: string[] = ['-- generált fájl: node eszkozok/seed.ts – ne szerkeszd kézzel', 'begin;'];
let nt = 0;
for (const f of readdirSync(dir).filter(f => /^20.*\.json$/.test(f)).sort()) {
  const e = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const meta = { ...e, sections: e.sections.map((s: any) => { const { tasks, ...rest } = s; return { ...rest, taskIds: tasks.map((t: any) => t.id) }; }) };
  out.push(`insert into public.exams (id, year, session, level, meta) values (${q(e.id)}, ${e.year}, ${q(e.session)}, ${q(LEVEL[e.level] || e.level)}, ${q(meta)}::jsonb)
  on conflict (id) do update set year = excluded.year, session = excluded.session, level = excluded.level, meta = excluded.meta;`);
  let pos = 0;
  for (const s of e.sections) for (const t of s.tasks) {
    pos++; nt++;
    out.push(`insert into public.tasks (id, exam_id, section, number, kind, exam_type, points, position, content, audio) values (${q(t.id)}, ${q(e.id)}, ${q(s.id)}, ${t.number}, ${q(t.kind)}, ${q(t.examType || '')}, ${t.points}, ${pos}, ${q(publicTask(t))}::jsonb, ${t.audio ? q(t.audio) + '::jsonb' : 'null'})
  on conflict (id) do update set exam_id = excluded.exam_id, section = excluded.section, number = excluded.number, kind = excluded.kind, exam_type = excluded.exam_type, points = excluded.points, position = excluded.position, content = excluded.content, audio = excluded.audio;`);
    out.push(`insert into public.task_keys (task_id, task) values (${q(t.id)}, ${q(t)}::jsonb) on conflict (task_id) do update set task = excluded.task;`);
  }
}
// próbakiosztások (1. szakasz): a két mintasor minden feladata, nyitva, azonnal látható megoldással
for (const [code, exam] of [['MINTA24K', '2024-maj-kozep'], ['MINTA24E', '2024-maj-emelt']]) {
  out.push(`insert into public.assignments (code, audio_mode, solution_visibility, status) values (${q(code)}, 'student', 'immediate', 'open') on conflict (code) do nothing;`);
  out.push(`insert into public.assignment_tasks (assignment_id, task_id, position)
  select a.id, t.id, t.position from public.assignments a, public.tasks t where a.code = ${q(code)} and t.exam_id = ${q(exam)}
  on conflict (assignment_id, task_id) do update set position = excluded.position;`);
}
out.push('commit;', '');
writeFileSync(new URL('supabase/seed.sql', root), out.join('\n'));
console.log(`seed.sql: ${nt} feladat`);
