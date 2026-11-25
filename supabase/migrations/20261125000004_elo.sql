-- Matura, 3. szakasz: élő nézet, lezárás, statisztika (SPEC 4.1, 4.2, 4.3).

-- ---------- élő frissítés ----------
-- A tanári élő nézet a Supabase Realtime-ra iratkozik fel a beküldésekre. A Realtime a sorszintű szabályokat alkalmazza:
-- a tanár csak a saját kiosztásainak beküldéseiről kap értesítést (a „beküldés: olvasás” szabály).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions') then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;

-- ---------- a diák nézete: lezárás után a megoldás is ----------
-- Lezárt kiosztásnál a feladatok mellé a kulcs is kimegy (key): ekkor már nem fogad beküldést, és a diák megnézheti a
-- megoldást (SPEC 4.1 „Visszatérés a megoldáshoz”, 4.2 „Lezárás”). Nyitott kiosztásnál a kulcs továbbra sem hagyja el a szervert.
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
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'examId', t.exam_id, 'section', t.section, 'points', t.points,
               'exam', jsonb_build_object('year', e.year, 'session', e.session, 'level', e.level),
               'content', t.content)
               || case when closed then jsonb_build_object('key', k.task) else '{}'::jsonb end
             order by at.position)
      from public.assignment_tasks at join public.tasks t on t.id = at.task_id join public.exams e on e.id = t.exam_id
      left join public.task_keys k on k.task_id = t.id
      where at.assignment_id = a.id), '[]'::jsonb),
    'submitted', (p_device is not null and exists (select 1 from public.submissions s where s.assignment_id = a.id and s.device_id = p_device))
  ) into result;
  return result;
end $$;
revoke all on function public.get_assignment(text, uuid) from public;
grant execute on function public.get_assignment(text, uuid) to anon, authenticated;

-- ---------- statisztika ----------
-- Kiosztásonként: kitöltők, átlag, kérdésenként a helyes arány és a leggyakoribb rossz válasz. Eszközönként csak az első
-- beküldés számít (counts). A függvény a hívó jogával fut (security invoker): a sorszintű szabályok miatt a tanár csak a
-- saját kiosztásáról kap adatot, másénál üres eredményt.
-- Helyesnek számít az elfogadott elírás is (typo). A rossz válaszokat kisbetűsítve, a szóközöket rendbe téve vonjuk össze.
create or replace function public.assignment_stats(p_assignment uuid)
returns jsonb
language sql stable security invoker set search_path = public
as $$
  with s as (
    select id, score, max_score from public.submissions where assignment_id = p_assignment and counts
  ), a as (
    select an.task_id, an.item_n, an.result,
      case when an.given is null or an.given = 'null'::jsonb or an.given = '""'::jsonb or an.given = '[]'::jsonb then null
           when jsonb_typeof(an.given) = 'string' then to_jsonb(lower(regexp_replace(btrim(an.given #>> '{}'), '\s+', ' ', 'g')))
           else an.given end as given
    from public.answers an join s on s.id = an.submission_id
  ), per as (
    select task_id, item_n, count(*) as total,
      count(*) filter (where result <> 'bad') as correct,
      count(*) filter (where result = 'typo') as typo,
      count(*) filter (where result = 'bad' and given is null) as empty
    from a group by task_id, item_n
  ), wrong as (
    select task_id, item_n, given, count(*) as n,
      row_number() over (partition by task_id, item_n order by count(*) desc, given::text) as rn
    from a where result = 'bad' and given is not null group by task_id, item_n, given
  )
  select jsonb_build_object(
    'n', (select count(*) from s),
    'avg', (select round(avg(score)::numeric, 2) from s),
    'max', (select max(max_score) from s),
    'items', coalesce((select jsonb_agg(jsonb_build_object('task', p.task_id, 'n', p.item_n, 'total', p.total, 'correct', p.correct,
                 'typo', p.typo, 'empty', p.empty, 'wrong', w.given, 'wrongN', coalesce(w.n, 0)) order by p.task_id, p.item_n)
               from per p left join wrong w on w.task_id = p.task_id and w.item_n = p.item_n and w.rn = 1), '[]'::jsonb)
  );
$$;
revoke all on function public.assignment_stats(uuid) from public, anon;
grant execute on function public.assignment_stats(uuid) to authenticated;
