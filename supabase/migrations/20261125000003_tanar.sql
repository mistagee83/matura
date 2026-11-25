-- Matura, 2. szakasz: tanári alap (SPEC 4.2, 5., 6.).
-- Elv: minden regisztrált felhasználó tanár; a tanár csak a saját csoportjait, kiosztásait és eredményeit látja
-- (sorszintű jogosultság). A feladattár (exams, tasks) kulcs nélküli tartalmát minden bejelentkezett tanár olvashatja;
-- a kulcs (task_keys) továbbra is csak a szerveroldali szerepé, mert bárki regisztrálhat tanárként.
-- A kiosztást a create_assignment() függvény hozza létre, ez ad neki nem kitalálható kódot.

-- ---------- tanárok ----------
create table public.teachers (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz not null default now()
);

-- regisztrációkor (e-mail vagy Google) magától létrejön a tanár sora
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.teachers (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.teachers (id, email, name)
  select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name') from auth.users
  on conflict (id) do nothing;

-- ---------- csoportok ----------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references public.teachers on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  level       text not null check (level in ('közép', 'emelt')),
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.groups (teacher_id);

-- a kiosztás csoportja; a csoport törlésekor a kiosztásai és az eredményeik is törlődnek (SPEC 6.)
alter table public.assignments add column group_id uuid references public.groups on delete cascade;
create index on public.assignments (teacher_id);
create index on public.assignments (group_id);

alter table public.teachers enable row level security;
alter table public.groups   enable row level security;

-- ---------- sorszintű szabályok ----------
-- (select auth.uid()) alak: soronként egyszer értékelődik ki
create policy "tanár: saját adat olvasása" on public.teachers for select to authenticated using (id = (select auth.uid()));
create policy "tanár: saját név módosítása" on public.teachers for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "csoport: olvasás" on public.groups for select to authenticated using (teacher_id = (select auth.uid()));
create policy "csoport: létrehozás" on public.groups for insert to authenticated with check (teacher_id = (select auth.uid()));
create policy "csoport: módosítás" on public.groups for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "csoport: törlés" on public.groups for delete to authenticated using (teacher_id = (select auth.uid()));

create policy "feladattár: feladatsorok" on public.exams for select to authenticated using (true);
create policy "feladattár: feladatok" on public.tasks for select to authenticated using (true);

create policy "kiosztás: olvasás" on public.assignments for select to authenticated using (teacher_id = (select auth.uid()));
create policy "kiosztás: módosítás" on public.assignments for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid())
    and (group_id is null or exists (select 1 from public.groups g where g.id = group_id and g.teacher_id = (select auth.uid()))));
create policy "kiosztás: törlés" on public.assignments for delete to authenticated using (teacher_id = (select auth.uid()));

create policy "kiosztás feladatai: olvasás" on public.assignment_tasks for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid())));

create policy "beküldés: olvasás" on public.submissions for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid())));
create policy "beküldés: törlés" on public.submissions for delete to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and a.teacher_id = (select auth.uid())));

create policy "válasz: olvasás" on public.answers for select to authenticated
  using (exists (select 1 from public.submissions s join public.assignments a on a.id = s.assignment_id
                 where s.id = submission_id and a.teacher_id = (select auth.uid())));

-- ---------- táblajogok ----------
-- Az újabb Supabase-projektekben az új táblák nem kapnak automatikusan jogot; itt adjuk meg pontosan, mit tehet a
-- bejelentkezett tanár. A sorszintű szabályok ezen belül szűkítenek. A diák (anon) továbbra sem fér hozzá közvetlenül.
grant usage on schema public to authenticated;
grant select, update (name) on public.teachers to authenticated;
grant select, insert (name, level), update (name, level, archived), delete on public.groups to authenticated;
grant select on public.exams, public.tasks to authenticated;
grant select, update (group_id, status, closed_at), delete on public.assignments to authenticated;
grant select on public.assignment_tasks to authenticated;
grant select, delete on public.submissions to authenticated;
grant select on public.answers to authenticated;
revoke all on public.task_keys from anon, authenticated;
grant select, insert, update, delete on public.teachers, public.groups to service_role;

-- ---------- kiosztás létrehozása ----------
-- A kód 6 jel a 0/O és 1/I nélküli 32 jeles ábécéből (kivetítve sem téveszthető össze), kriptográfiai véletlenből:
-- kb. egymilliárd lehetőség, nem kitalálható sorozat (SPEC 6.).
create or replace function public.new_assignment_code()
returns text
language plpgsql volatile set search_path = public, extensions
as $$
declare abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; c text;
begin
  loop
    b := extensions.gen_random_bytes(6); c := '';
    for i in 0..5 loop c := c || substr(abc, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.assignments where code = c);
  end loop;
  return c;
end $$;
revoke all on function public.new_assignment_code() from public, anon, authenticated;

create or replace function public.create_assignment(p_group uuid, p_tasks text[], p_audio_mode text default 'teacher',
                                                    p_solution_visibility text default 'after_close')
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare me uuid := auth.uid(); a public.assignments; n int;
begin
  if me is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.teachers where id = me) then raise exception 'not_teacher' using errcode = '42501'; end if;
  if p_group is not null and not exists (select 1 from public.groups where id = p_group and teacher_id = me) then
    raise exception 'bad_group' using errcode = '42501';
  end if;
  if p_tasks is null or cardinality(p_tasks) = 0 or cardinality(p_tasks) > 20 then raise exception 'bad_tasks' using errcode = '22023'; end if;
  if (select count(distinct x) from unnest(p_tasks) x) <> cardinality(p_tasks) then raise exception 'bad_tasks' using errcode = '22023'; end if;
  select count(*) into n from public.tasks where id = any (p_tasks);
  if n <> cardinality(p_tasks) then raise exception 'bad_tasks' using errcode = '22023'; end if;
  if p_audio_mode not in ('teacher', 'student') or p_solution_visibility not in ('immediate', 'after_close') then
    raise exception 'bad_settings' using errcode = '22023';
  end if;

  insert into public.assignments (teacher_id, group_id, code, audio_mode, solution_visibility)
  values (me, p_group, public.new_assignment_code(), p_audio_mode, p_solution_visibility)
  returning * into a;
  insert into public.assignment_tasks (assignment_id, task_id, position)
    select a.id, t, o::int from unnest(p_tasks) with ordinality as u(t, o);
  return jsonb_build_object('id', a.id, 'code', a.code);
end $$;
revoke all on function public.create_assignment(uuid, text[], text, text) from public, anon;
grant execute on function public.create_assignment(uuid, text[], text, text) to authenticated;
