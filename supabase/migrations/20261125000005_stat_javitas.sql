-- Javítás (3. szakasz): a statisztika csak a beírós feladatok válaszát kisbetűsíti; a választós feladatok betűjelét
-- (pl. A) változatlanul hagyja, különben a felület nem találja meg hozzá a válaszlehetőség szövegét.
-- Kiosztásonként: kitöltők, átlag, kérdésenként a helyes arány és a leggyakoribb rossz válasz. Eszközönként csak az első
-- beküldés számít (counts). A függvény a hívó jogával fut (security invoker): a sorszintű szabályok miatt a tanár csak a
-- saját kiosztásáról kap adatot, másénál üres eredményt.
-- Helyesnek számít az elfogadott elírás is (typo). A beírós (text) feladatok rossz válaszait kisbetűsítve, a szóközöket rendbe
-- téve vonjuk össze; a választós feladatok betűjele marad.
create or replace function public.assignment_stats(p_assignment uuid)
returns jsonb
language sql stable security invoker set search_path = public
as $$
  with s as (
    select id, score, max_score from public.submissions where assignment_id = p_assignment and counts
  ), a as (
    select an.task_id, an.item_n, an.result,
      case when an.given is null or an.given = 'null'::jsonb or an.given = '""'::jsonb or an.given = '[]'::jsonb then null
           when t.kind = 'text' and jsonb_typeof(an.given) = 'string' then to_jsonb(lower(regexp_replace(btrim(an.given #>> '{}'), '\s+', ' ', 'g')))
           else an.given end as given
    from public.answers an join s on s.id = an.submission_id join public.tasks t on t.id = an.task_id
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
