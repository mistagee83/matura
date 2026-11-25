-- Matura: alapséma (1. szakasz: diákoldal). Adatmodell: SPEC.md 5., biztonság: SPEC.md 6.
-- Elv: a diák (anon) közvetlenül egyetlen táblát sem olvas és nem ír. A kiosztást a get_assignment() függvény adja
-- kulcs nélkül, a beküldést a `submit` Edge Function fogadja és javítja (service role, a kulcs nem hagyja el a szervert).

create table public.exams (
  id          text primary key,                 -- pl. 2024-maj-kozep
  year        int  not null,
  session     text not null,
  level       text not null check (level in ('közép', 'emelt')),
  meta        jsonb not null default '{}'       -- a feladatsor adatai a feladatok nélkül (vizsgarészek, időtartam, átszámítás)
);

create table public.tasks (
  id          text primary key,                 -- pl. 2024-maj-kozep-R2
  exam_id     text not null references public.exams on delete cascade,
  section     text not null check (section in ('reading', 'language', 'listening')),
  number      int  not null,
  kind        text not null check (kind in ('bank', 'choice', 'multi', 'text', 'lines', 'fix', 'order')),
  exam_type   text,
  points      int  not null,
  position    int  not null,                    -- sorrend a feladatsoron belül
  content     jsonb not null,                   -- a feladat kulcs nélkül (ezt kapja a diák)
  audio       jsonb                             -- hallásnál: file, start, end, clip
);
create index on public.tasks (exam_id);

create table public.task_keys (
  task_id     text primary key references public.tasks on delete cascade,
  task        jsonb not null                    -- a teljes, kulcsos feladat; csak a javító olvassa
);

create table public.assignments (
  id                   uuid primary key default gen_random_uuid(),
  teacher_id           uuid references auth.users on delete cascade,   -- a 2. szakasztól kötelező
  code                 text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  audio_mode           text not null default 'student' check (audio_mode in ('teacher', 'student')),
  solution_visibility  text not null default 'immediate' check (solution_visibility in ('immediate', 'after_close')),
  status               text not null default 'open' check (status in ('open', 'closed')),
  created_at           timestamptz not null default now(),
  closed_at            timestamptz
);

create table public.assignment_tasks (
  assignment_id  uuid not null references public.assignments on delete cascade,
  task_id        text not null references public.tasks,
  position       int  not null,
  primary key (assignment_id, task_id)
);

create table public.submissions (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments on delete cascade,
  nickname       text not null check (char_length(nickname) between 1 and 20),
  device_id      uuid not null,                 -- véletlen eszközazonosító; kiosztások között nem kapcsolja össze a diákot
  score          int  not null,
  max_score      int  not null,
  counts         boolean not null,              -- eszközönként csak az első beküldés számít a statisztikába
  created_at     timestamptz not null default now()
);
create index on public.submissions (assignment_id, device_id);

create table public.answers (
  submission_id  uuid not null references public.submissions on delete cascade,
  task_id        text not null references public.tasks,
  item_n         int  not null,
  given          jsonb,
  result         text not null check (result in ('ok', 'typo', 'bad')),
  primary key (submission_id, task_id, item_n)
);

-- Sorszintű jogosultság: bekapcsolva mindenhol, szabály nélkül → az anon és a bejelentkezett felhasználó semmit sem lát közvetlenül.
-- A tanári szabályok a 2. szakaszban jönnek.
alter table public.exams            enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_keys        enable row level security;
alter table public.assignments      enable row level security;
alter table public.assignment_tasks enable row level security;
alter table public.submissions      enable row level security;
alter table public.answers          enable row level security;
revoke all on public.task_keys from anon, authenticated;

-- A diák nézete egy kiosztásról: a feladatok kulcs nélkül, a beállítások, és hogy ez az eszköz beküldött-e már.
-- (A feladatok szövege kulcs nélkül nem titkos: a feladatlapok nyilvánosak.)
create or replace function public.get_assignment(p_code text, p_device uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare a public.assignments; result jsonb;
begin
  select * into a from public.assignments where code = upper(trim(p_code));
  if not found then return jsonb_build_object('found', false); end if;
  select jsonb_build_object(
    'found', true,
    'code', a.code,
    'status', a.status,
    'audioMode', a.audio_mode,
    'solutionVisibility', a.solution_visibility,
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'examId', t.exam_id, 'section', t.section, 'points', t.points,
               'exam', jsonb_build_object('year', e.year, 'session', e.session, 'level', e.level),
               'content', t.content) order by at.position)
      from public.assignment_tasks at join public.tasks t on t.id = at.task_id join public.exams e on e.id = t.exam_id
      where at.assignment_id = a.id), '[]'::jsonb),
    'submitted', (p_device is not null and exists (select 1 from public.submissions s where s.assignment_id = a.id and s.device_id = p_device))
  ) into result;
  return result;
end $$;
revoke all on function public.get_assignment(text, uuid) from public;
grant execute on function public.get_assignment(text, uuid) to anon, authenticated;
