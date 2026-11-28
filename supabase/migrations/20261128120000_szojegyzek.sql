-- Matura: szövegre szabott szójegyzék az olvasásfeladatokhoz az önálló gyakorlásban (SPEC 4.5, 11./23.).
-- A címszavak két részben: `entries` a beküldés előtt is látható, `after_submit` csak a javítás után, mert ezek magyarázata
-- a megoldást adná ki (pl. a beírós feladat elfogadott válasza). Az utóbbit csak a `practice` Edge Function adja ki (service role).
-- A tartalmat a seed.sql tölti fel (node eszkozok/seed.ts, a szojegyzek/ mappából).

create table public.task_glossary (
  task_id       text primary key references public.tasks on delete cascade,
  entries       jsonb not null default '[]'::jsonb,
  after_submit  jsonb not null default '[]'::jsonb
);
alter table public.task_glossary enable row level security;
revoke all on public.task_glossary from anon, authenticated;
grant select, insert, update, delete on public.task_glossary to service_role;

-- A gyakorló feladat a beküldés előtt látható címszavakkal (glossary); az after_submit rész nem megy ki.
create or replace function public.practice_task(p_id text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('id', t.id, 'examId', t.exam_id, 'section', t.section, 'points', t.points,
           'exam', jsonb_build_object('year', e.year, 'session', e.session, 'level', e.level), 'content', t.content,
           'glossary', coalesce(g.entries, '[]'::jsonb))
  from public.tasks t join public.exams e on e.id = t.exam_id
  left join public.task_glossary g on g.task_id = t.id
  where t.id = p_id;
$$;
revoke all on function public.practice_task(text) from public;
grant execute on function public.practice_task(text) to anon, authenticated;
