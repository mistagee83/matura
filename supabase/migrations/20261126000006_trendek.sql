-- Matura, 4. szakasz: csoportszintű trendek és a csoportok összevetése (SPEC 4.3, 10.).
-- Csoportonként és feladatonként: hány kiosztásban, hány kitöltő, hány kiértékelt kérdés és ebből hány helyes. Ebből a
-- felület számolja a vizsgarészenkénti és feladattípusonkénti átlagot és az összevetést (a feladat része és típusa a
-- feladattárból jön). Egy kérdés egy pont (mind a 949 feladatnál), így a helyes arány a pontarány is.
-- Szabályok, mint a kiosztásonkénti statisztikánál: eszközönként csak az első beküldés számít (counts); helyesnek számít az
-- elfogadott elírás is; az üresen hagyott kérdés rossznak számít (a pontszámba sem ad pontot). Csoport nélküli kiosztás
-- nem számít bele.
-- A függvény a hívó jogával fut (security invoker): a sorszintű szabályok miatt a tanár csak a saját csoportjairól kap sort.
create or replace function public.group_trends()
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('group', x.group_id, 'task', x.task_id, 'asg', x.asg, 'subs', x.subs,
           'total', x.total, 'correct', x.correct, 'last', x.last) order by x.group_id, x.task_id), '[]'::jsonb)
  from (
    select a.group_id, an.task_id,
      count(distinct a.id) as asg,
      count(distinct s.id) as subs,
      count(*) as total,
      count(*) filter (where an.result <> 'bad') as correct,
      max(s.created_at) as last
    from public.assignments a
    join public.submissions s on s.assignment_id = a.id and s.counts
    join public.answers an on an.submission_id = s.id
    where a.group_id is not null
    group by a.group_id, an.task_id
  ) x;
$$;
revoke all on function public.group_trends() from public, anon;
grant execute on function public.group_trends() to authenticated;
