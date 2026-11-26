-- Matura: ingyenes, önálló gyakorló mód (SPEC 4.4). Tanár, kód, becenév és fiók nélkül: a diák kiválaszt egy feladatot,
-- kitölti, a szerver javít, és azonnal megkapja az eredményt a megoldással. A diák haladása csak az ő eszközén tárolódik.
-- A szerveren a keresletpróbához csak névtelen darabszám marad (melyik feladat, hány pont, mikor), eszközazonosító nélkül.

-- A feladattár listája kulcs és feladatszöveg nélkül (a választóhoz).
create or replace function public.practice_catalog()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'examId', t.exam_id, 'section', t.section, 'number', t.number, 'examType', t.exam_type, 'points', t.points,
      'position', t.position, 'year', e.year, 'session', e.session, 'level', e.level)), '[]'::jsonb)
  from public.tasks t join public.exams e on e.id = t.exam_id;
$$;
revoke all on function public.practice_catalog() from public;
grant execute on function public.practice_catalog() to anon, authenticated;

-- Egy feladat kulcs nélkül, ugyanabban az alakban, mint a get_assignment() feladatai.
create or replace function public.practice_task(p_id text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('id', t.id, 'examId', t.exam_id, 'section', t.section, 'points', t.points,
           'exam', jsonb_build_object('year', e.year, 'session', e.session, 'level', e.level), 'content', t.content)
  from public.tasks t join public.exams e on e.id = t.exam_id
  where t.id = p_id;
$$;
revoke all on function public.practice_task(text) from public;
grant execute on function public.practice_task(text) to anon, authenticated;

-- Névtelen gyakorlási napló: nincs benne becenév, eszközazonosító vagy válasz, ezért személyes adat sincs.
-- Csak a `practice` Edge Function írja (service role); a böngészőből senki sem olvassa és írja.
create table public.practice_runs (
  id          bigint generated always as identity primary key,
  task_id     text not null references public.tasks on delete cascade,
  score       int  not null,
  max_score   int  not null,
  created_at  timestamptz not null default now()
);
create index on public.practice_runs (created_at);
alter table public.practice_runs enable row level security;
revoke all on public.practice_runs from anon, authenticated;
grant select, insert, delete on public.practice_runs to service_role;
