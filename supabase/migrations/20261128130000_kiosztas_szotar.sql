-- Matura: a szójegyzék a tanári kiosztásban is (SPEC 4.5, 11./24.). A tanár kiosztáskor bekapcsolhatja; alapból ki van kapcsolva,
-- mert a vizsgán nincs szótár. Bekapcsolva a diák ugyanazt kapja, mint az önálló gyakorlásban: a beküldés előtt a nyilvános
-- címszavakat, a megoldást elárulhatókat (after_submit) pedig csak akkor, amikor a megoldás is látható (azonnal, vagy a lezárás után).

alter table public.assignments add column glossary boolean not null default false;

-- új paraméter: p_glossary; a régi, négyparaméteres változat megszűnik, hogy a hívás ne legyen kétértelmű
drop function public.create_assignment(uuid, text[], text, text);
create or replace function public.create_assignment(p_group uuid, p_tasks text[], p_audio_mode text default 'teacher',
                                                    p_solution_visibility text default 'after_close', p_glossary boolean default false)
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
  if p_audio_mode not in ('teacher', 'student') or p_solution_visibility not in ('immediate', 'after_close') or p_glossary is null then
    raise exception 'bad_settings' using errcode = '22023';
  end if;

  insert into public.assignments (teacher_id, group_id, code, audio_mode, solution_visibility, glossary)
  values (me, p_group, public.new_assignment_code(), p_audio_mode, p_solution_visibility, p_glossary)
  returning * into a;
  insert into public.assignment_tasks (assignment_id, task_id, position)
    select a.id, t, o::int from unnest(p_tasks) with ordinality as u(t, o);
  return jsonb_build_object('id', a.id, 'code', a.code);
end $$;
revoke all on function public.create_assignment(uuid, text[], text, text, boolean) from public, anon;
grant execute on function public.create_assignment(uuid, text[], text, text, boolean) to authenticated;

-- a diák nézete: bekapcsolt szótárnál feladatonként a nyilvános címszavak (glossary); lezárt kiosztásnál, amikor a kulcs is
-- kimegy, a megoldást elárulhatók is (glossaryAfter)
create or replace function public.get_assignment(p_code text, p_device uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare a public.assignments; result jsonb; closed boolean;
begin
  select * into a from public.assignments where code = upper(trim(p_code));
  if not found then return jsonb_build_object('found', false); end if;
  closed := a.status = 'closed';
  select jsonb_build_object(
    'found', true,
    'code', a.code,
    'status', a.status,
    'audioMode', a.audio_mode,
    'solutionVisibility', a.solution_visibility,
    'glossary', a.glossary,
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'examId', t.exam_id, 'section', t.section, 'points', t.points,
               'exam', jsonb_build_object('year', e.year, 'session', e.session, 'level', e.level),
               'content', t.content)
               || case when closed then jsonb_build_object('key', k.task) else '{}'::jsonb end
               || case when a.glossary and g.task_id is not null then jsonb_build_object('glossary', g.entries) else '{}'::jsonb end
               || case when a.glossary and closed and g.task_id is not null then jsonb_build_object('glossaryAfter', g.after_submit) else '{}'::jsonb end
             order by at.position)
      from public.assignment_tasks at join public.tasks t on t.id = at.task_id join public.exams e on e.id = t.exam_id
      left join public.task_keys k on k.task_id = t.id
      left join public.task_glossary g on g.task_id = t.id
      where at.assignment_id = a.id), '[]'::jsonb),
    'submitted', (p_device is not null and exists (select 1 from public.submissions s where s.assignment_id = a.id and s.device_id = p_device))
  ) into result;
  return result;
end $$;
revoke all on function public.get_assignment(text, uuid) from public;
grant execute on function public.get_assignment(text, uuid) to anon, authenticated;
