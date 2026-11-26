// A tanári jogosultságok próbája az éles (vagy bármely) Supabase-projekten, két tanárfiókkal (SPEC 6., 10. 2. szakasz).
// Használat: node tests/tanar.ts <supabase url> <publishable kulcs>
//   a fiókok: MATURA_A_EMAIL, MATURA_B_EMAIL, MATURA_PW környezeti változóban (mindkettő ugyanazzal a jelszóval)
// A próba létrehoz egy-egy csoportot és kiosztást, a végén törli őket (a beküldésekkel együtt).
// 3. szakasz: élő frissítés (Realtime), lezárás, a megoldás megnyitása, statisztika – ugyanígy két fiókkal.
// 4. szakasz: csoportszintű trendek (group_trends), a leggyengébb típus és a csoportok összevetése, kézzel kiszámolt értékekkel.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { aggregate, weakest, compare } from '../app/src/teacher/trends.ts';
// az élő frissítés próbájához a felület Supabase-kliense (app/node_modules)
const { createClient } = createRequire(new URL('../app/package.json', import.meta.url))('@supabase/supabase-js');

const [URL_, KEY] = process.argv.slice(2);
const { MATURA_A_EMAIL: EA, MATURA_B_EMAIL: EB, MATURA_PW: PW } = process.env;
if (!URL_ || !KEY || !EA || !EB || !PW) { console.error('Használat: lásd a fájl elejét.'); process.exit(2); }
const ok = (cond: boolean, msg: string) => { console.log((cond ? 'RENDBEN  ' : 'HIBA     ') + msg); if (!cond) process.exitCode = 1; };

async function login(email: string) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PW }) });
  const j = await r.json(); if (!j.access_token) throw new Error('belépés: ' + JSON.stringify(j));
  return { token: j.access_token as string, id: j.user.id as string };
}
const hdr = (t?: string) => ({ apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(t ? { Authorization: 'Bearer ' + t } : {}) });
const rest = async (t: string | undefined, method: string, path: string, body?: unknown) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: hdr(t), body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let data: any = null; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, ok: r.ok, data };
};

const A = await login(EA), B = await login(EB);
ok(A.id !== B.id, 'két különböző tanárfiók belép');

// saját tanársor
const ta = await rest(A.token, 'GET', 'teachers?select=id,email');
ok(ta.ok && ta.data.length === 1 && ta.data[0].id === A.id, `A a teachers táblából csak magát látja (${ta.data.length} sor)`);

// csoportok
const ga = await rest(A.token, 'POST', 'groups', { name: 'Próba A', level: 'emelt' });
const gb = await rest(B.token, 'POST', 'groups', { name: 'Próba B', level: 'közép' });
ok(ga.ok && gb.ok, `csoport létrehozása (A: ${ga.status}, B: ${gb.status})`);
const gA = ga.data[0], gB = gb.data[0];
ok(gA.teacher_id === A.id, 'A csoportja A-hoz tartozik (a tanárt a szerver tölti ki)');
const spoof = await rest(B.token, 'POST', 'groups', { name: 'Hamis', level: 'emelt', teacher_id: A.id });
ok(!spoof.ok, `B nem hozhat létre csoportot A nevében → ${spoof.status}`);
const seeB = await rest(B.token, 'GET', 'groups?select=id');
ok(seeB.ok && seeB.data.every((g: any) => g.id !== gA.id), `B nem látja A csoportját (${seeB.data.length} saját csoport)`);
const updB = await rest(B.token, 'PATCH', `groups?id=eq.${gA.id}`, { name: 'Átírva' });
ok(updB.ok && updB.data.length === 0, 'B nem nevezheti át A csoportját');
const delB = await rest(B.token, 'DELETE', `groups?id=eq.${gA.id}`);
ok(delB.ok && delB.data.length === 0, 'B nem törölheti A csoportját');
const ren = await rest(A.token, 'PATCH', `groups?id=eq.${gA.id}`, { name: 'Próba A2', archived: true });
ok(ren.ok && ren.data[0]?.name === 'Próba A2' && ren.data[0]?.archived === true, 'A átnevezi és archiválja a saját csoportját');

// feladattár
const lib = await rest(A.token, 'GET', 'tasks?select=id,section,kind,exam_type,points,exams(year,session,level)&limit=2000');
ok(lib.ok && lib.data.length === 949, `a feladattár olvasható bejelentkezve (${lib.data.length} feladat)`);
const keys = await rest(A.token, 'GET', 'task_keys?select=task_id&limit=1');
ok(!keys.ok || keys.data.length === 0, `a kulcs bejelentkezve sem olvasható → ${keys.status}`);
const anonLib = await rest(undefined, 'GET', 'tasks?select=id&limit=1');
ok(!anonLib.ok || anonLib.data.length === 0, 'a feladattár bejelentkezés nélkül nem olvasható');
const anonGroups = await rest(undefined, 'GET', 'groups?select=id&limit=1');
ok(!anonGroups.ok || anonGroups.data.length === 0, 'a csoportok bejelentkezés nélkül nem olvashatók');

// kiosztás
const tasks = ['2024-maj-kozep-R2'];
const ca = await rest(A.token, 'POST', 'rpc/create_assignment', { p_group: gA.id, p_tasks: tasks, p_audio_mode: 'student', p_solution_visibility: 'immediate' });
ok(ca.ok && /^[A-HJ-NP-Z2-9]{6}$/.test(ca.data?.code), `A kioszt egy feladatot → kód: ${ca.data?.code}`);
const cb = await rest(B.token, 'POST', 'rpc/create_assignment', { p_group: gB.id, p_tasks: ['2024-maj-emelt-R1'], p_audio_mode: 'teacher', p_solution_visibility: 'after_close' });
ok(cb.ok, `B is kioszt → ${cb.data?.code}`);
const steal = await rest(B.token, 'POST', 'rpc/create_assignment', { p_group: gA.id, p_tasks: tasks });
ok(!steal.ok, `B nem oszthat ki A csoportjának → ${steal.status}`);
const bad = await rest(A.token, 'POST', 'rpc/create_assignment', { p_group: gA.id, p_tasks: ['nincs-ilyen'] });
ok(!bad.ok, `nem létező feladat nem osztható ki → ${bad.status}`);
const anonCreate = await rest(undefined, 'POST', 'rpc/create_assignment', { p_group: null, p_tasks: tasks });
ok(!anonCreate.ok, `bejelentkezés nélkül nem lehet kiosztani → ${anonCreate.status}`);
const direct = await rest(A.token, 'POST', 'assignments', { code: 'SAJAT1', teacher_id: A.id });
ok(!direct.ok, `kiosztás saját kóddal, közvetlenül nem hozható létre → ${direct.status}`);
const recode = await rest(A.token, 'PATCH', `assignments?id=eq.${ca.data.id}`, { code: 'AAAAAA' });
ok(!recode.ok, `a kód utólag nem írható át → ${recode.status}`);

// a diák a kóddal eljut a feladathoz, és be tud küldeni
const ga2 = await rest(undefined, 'POST', 'rpc/get_assignment', { p_code: ca.data.code, p_device: crypto.randomUUID() });
ok(ga2.ok && ga2.data.found && ga2.data.tasks.length === 1 && ga2.data.tasks[0].id === tasks[0], 'a diák (bejelentkezés nélkül) megkapja a kiosztott feladatot');
const sub = await fetch(`${URL_}/functions/v1/submit`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: ca.data.code, nickname: 'Jogproba', deviceId: crypto.randomUUID(), answers: {} }) }).then((r) => r.json());
ok(typeof sub.score === 'number', `a diák beküld → ${sub.score} / ${sub.max}`);

// eredmények elkülönítése
const subsA = await rest(A.token, 'GET', `submissions?select=id,nickname&assignment_id=eq.${ca.data.id}`);
ok(subsA.ok && subsA.data.length === 1, `A látja a saját kiosztásának beküldését (${subsA.data.length})`);
const subsB = await rest(B.token, 'GET', `submissions?select=id&assignment_id=eq.${ca.data.id}`);
ok(subsB.ok && subsB.data.length === 0, 'B nem látja A beküldéseit');
const ansB = await rest(B.token, 'GET', `answers?select=item_n&submission_id=eq.${subsA.data[0]?.id}`);
ok(ansB.ok && ansB.data.length === 0, 'B nem látja A diákjainak válaszait');
const asgB = await rest(B.token, 'GET', `assignments?select=id&id=eq.${ca.data.id}`);
ok(asgB.ok && asgB.data.length === 0, 'B nem látja A kiosztását');
const atB = await rest(B.token, 'GET', `assignment_tasks?select=task_id&assignment_id=eq.${ca.data.id}`);
ok(atB.ok && atB.data.length === 0, 'B nem látja A kiosztásának feladatait');
const delSubB = await rest(B.token, 'DELETE', `submissions?id=eq.${subsA.data[0]?.id}`);
ok(delSubB.ok && delSubB.data.length === 0, 'B nem törölheti A beküldését');
const delAsgB = await rest(B.token, 'DELETE', `assignments?id=eq.${ca.data.id}`);
ok(delAsgB.ok && delAsgB.data.length === 0, 'B nem törölheti A kiosztását');
const moveB = await rest(B.token, 'PATCH', `assignments?id=eq.${cb.data.id}`, { group_id: gA.id });
ok(!moveB.ok || moveB.data.length === 0, `B nem teheti a kiosztását A csoportjába → ${moveB.status}`);
const anonSubs = await rest(undefined, 'GET', 'submissions?select=id&limit=1');
ok(!anonSubs.ok || anonSubs.data.length === 0, 'a beküldések bejelentkezés nélkül nem olvashatók');

// ---------- 3. szakasz: élő frissítés, lezárás, statisztika ----------
const R2 = '2024-maj-kozep-R2', H1 = '2024-maj-kozep-H1';
const fullR2 = JSON.parse(execFileSync(process.execPath, ['tests/kulcsvalasz.ts', '2024-maj-kozep'], { encoding: 'utf8' })).answers[R2];
const cc = await rest(A.token, 'POST', 'rpc/create_assignment', { p_group: gA.id, p_tasks: [R2, H1], p_audio_mode: 'teacher', p_solution_visibility: 'after_close' });
ok(cc.ok, `A kioszt egy „lezárás után” feladatot (tanár játssza a hangot) → ${cc.data?.code}`);
const send = (deviceId: string, answers: any) => fetch(`${URL_}/functions/v1/submit`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: cc.data.code, nickname: 'Statproba', deviceId, answers }) }).then(async (r) => ({ status: r.status, body: await r.json() }));

// élő frissítés: A értesítést kap a saját kiosztása beküldéséről, B nem
const sbA = createClient(URL_, KEY, { auth: { persistSession: false } }), sbB = createClient(URL_, KEY, { auth: { persistSession: false } });
await sbA.realtime.setAuth(A.token); await sbB.realtime.setAuth(B.token);
const seen = { A: 0, B: 0 };
const join = (c: any, who: 'A' | 'B', filter: string) => new Promise<string>((res) => {
  c.channel('proba-' + who).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions', filter }, () => { seen[who]++; })
    .subscribe((s: string) => { if (s !== 'CLOSED') res(s); });
});
const [stA, stB] = await Promise.all([join(sbA, 'A', `assignment_id=eq.${cc.data.id}`), join(sbB, 'B', `assignment_id=eq.${cc.data.id}`)]);
ok(stA === 'SUBSCRIBED' && stB === 'SUBSCRIBED', `élő csatorna: A ${stA}, B ${stB}`);
await new Promise((r) => setTimeout(r, 1500));

const d1 = crypto.randomUUID(), d2 = crypto.randomUUID();
const s1 = await send(d1, { [R2]: fullR2 });
ok(s1.status === 200 && s1.body.solutionsVisible === false && s1.body.tasks.every((t: any) => t.solutions === null), `beküldés nyitott „lezárás után” kiosztásra: megoldás nélkül jön vissza (${s1.body.score} / ${s1.body.max})`);
const wrongR2 = Object.fromEntries(Object.keys(fullR2).map((n) => [n, fullR2[n] === 'A' ? 'B' : 'A']));
const s2 = await send(d2, { [R2]: wrongR2 });
const s3 = await send(d1, { [R2]: wrongR2 });   // ugyanarról az eszközről újra: gyakorlás
ok(s2.status === 200 && s3.status === 200, 'még két beküldés (egy új eszköz, egy ismétlés)');
await new Promise((r) => setTimeout(r, 3000));
ok(seen.A === 3, `A élőben értesült mindhárom beküldésről (${seen.A})`);
ok(seen.B === 0, `B nem kapott értesítést A kiosztásáról (${seen.B})`);
await sbA.removeAllChannels(); await sbB.removeAllChannels();

const openA = await rest(undefined, 'POST', 'rpc/get_assignment', { p_code: cc.data.code });
ok(openA.data.tasks.every((t: any) => t.key === undefined), 'nyitott kiosztásnál a diák nézetében nincs kulcs');

// statisztika
const stA1 = await rest(A.token, 'POST', 'rpc/assignment_stats', { p_assignment: cc.data.id });
const r2items = (stA1.data?.items || []).filter((i: any) => i.task === R2), h1items = (stA1.data?.items || []).filter((i: any) => i.task === H1);
ok(stA1.ok && stA1.data.n === 2, `statisztika: 2 kitöltő (a gyakorlás nem számít) → ${stA1.data?.n}`);
ok(stA1.data && Number(stA1.data.avg) === s1.body.score / 2 && stA1.data.max === s1.body.max, `átlag: ${stA1.data?.avg} / ${stA1.data?.max} (várt ${s1.body.score / 2})`);
ok(r2items.length === Object.keys(fullR2).length && r2items.every((i: any) => i.total === 2 && i.correct === 1 && i.wrongN === 1 && i.wrong === wrongR2[i.n]),
  `kérdésenként: helyes arány 1/2, a leggyakoribb rossz válasz a beküldött rossz betű (${r2items.length} kérdés)`);
ok(h1items.length > 0 && h1items.every((i: any) => i.correct === 0 && i.empty === 2 && i.wrongN === 0), `üresen hagyott kérdések: üresnek számolva, nem rossz válasznak (${h1items.length} kérdés)`);
const stB1 = await rest(B.token, 'POST', 'rpc/assignment_stats', { p_assignment: cc.data.id });
ok(stB1.ok && stB1.data.n === 0 && stB1.data.items.length === 0, `B nem látja A kiosztásának statisztikáját (n = ${stB1.data?.n})`);
const stAnon = await rest(undefined, 'POST', 'rpc/assignment_stats', { p_assignment: cc.data.id });
ok(!stAnon.ok, `bejelentkezés nélkül nincs statisztika → ${stAnon.status}`);

// lezárás
const closeB = await rest(B.token, 'PATCH', `assignments?id=eq.${cc.data.id}`, { status: 'closed' });
ok(closeB.ok && closeB.data.length === 0, 'B nem zárhatja le A kiosztását');
const closeA = await rest(A.token, 'PATCH', `assignments?id=eq.${cc.data.id}`, { status: 'closed', closed_at: new Date().toISOString() });
ok(closeA.ok && closeA.data[0]?.status === 'closed', 'A lezárja a saját kiosztását');
const late = await send(crypto.randomUUID(), { [R2]: fullR2 });
ok(late.status === 409 && late.body.error === 'closed', `lezárás után nincs beküldés → ${late.status} ${late.body.error}`);
const closedView = await rest(undefined, 'POST', 'rpc/get_assignment', { p_code: cc.data.code, p_device: d1 });
const keyR2 = closedView.data.tasks.find((t: any) => t.id === R2)?.key;
ok(closedView.data.status === 'closed' && closedView.data.submitted === true && keyR2 && Object.keys(fullR2).every((n) => keyR2.items.find((i: any) => String(i.n) === n)?.answer === fullR2[n]),
  'lezárás után a diák (ugyanarról az eszközről) megkapja a kulcsot, és a rendszer felismeri a beküldését');
const reopen = await rest(A.token, 'PATCH', `assignments?id=eq.${cc.data.id}`, { status: 'open', closed_at: null });
ok(reopen.ok && reopen.data[0]?.status === 'open', 'A újranyithatja');
const reopenedView = await rest(undefined, 'POST', 'rpc/get_assignment', { p_code: cc.data.code });
ok(reopenedView.data.tasks.every((t: any) => t.key === undefined), 'újranyitás után a kulcs megint nem megy ki');

// ---------- 4. szakasz: csoportszintű trendek ----------
// Egy új csoport három kiosztással: R2 (két diák: egy hibátlan, egy csupa rossz; plusz egy gyakorló ismétlés), újra R2
// (egy hibátlan), L2 (egy üres beküldés). Egy második csoport ugyanazt az R2-t kapja (csupa rossz). Kézzel: R2-n
// 2k / 3k helyes (k = az R2 kérdései), L2-n 0; a leggyengébb típus az L2-é; az R2-n a két csoport 67% és 0%.
const L2 = '2024-maj-kozep-L2', k = Object.keys(fullR2).length;
const gt = await rest(A.token, 'POST', 'groups', { name: 'Trend A', level: 'közép' });
const gu = await rest(A.token, 'POST', 'groups', { name: 'Trend A2', level: 'közép' });
ok(gt.ok && gu.ok, 'A két új csoportot hoz létre a trendek próbájához');
const gT = gt.data[0].id, gU = gu.data[0].id;
const mk = async (g: string, t: string[]) => (await rest(A.token, 'POST', 'rpc/create_assignment', { p_group: g, p_tasks: t, p_audio_mode: 'student', p_solution_visibility: 'immediate' })).data;
const [t1, t2, t3, t4] = [await mk(gT, [R2]), await mk(gT, [R2]), await mk(gT, [L2]), await mk(gU, [R2])];
const post = (code: string, deviceId: string, answers: any) => fetch(`${URL_}/functions/v1/submit`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, nickname: 'Trendproba', deviceId, answers }) }).then((r) => r.json());
const dv = crypto.randomUUID();
await post(t1.code, dv, { [R2]: fullR2 }); await post(t1.code, crypto.randomUUID(), { [R2]: wrongR2 }); await post(t1.code, dv, { [R2]: wrongR2 });
await post(t2.code, crypto.randomUUID(), { [R2]: fullR2 });
await post(t3.code, crypto.randomUUID(), {});
await post(t4.code, crypto.randomUUID(), { [R2]: wrongR2 });

const tr = await rest(A.token, 'POST', 'rpc/group_trends', {});
const mineT = (tr.data || []).filter((r: any) => r.group === gT);
const rR2 = mineT.find((r: any) => r.task === R2), rL2 = mineT.find((r: any) => r.task === L2);
ok(tr.ok && mineT.length === 2, `group_trends: a csoportnak két feladata van (${mineT.length})`);
ok(rR2 && rR2.asg === 2 && rR2.subs === 3 && rR2.total === 3 * k && rR2.correct === 2 * k, `R2: 2 kiosztás, 3 kitöltő (a gyakorlás nem számít), ${rR2?.correct} / ${rR2?.total} helyes (várt ${2 * k} / ${3 * k})`);
ok(rL2 && rL2.subs === 1 && rL2.total === 8 && rL2.correct === 0, `L2: az üres beküldés 0 / 8 (${rL2?.correct} / ${rL2?.total})`);
const meta = new Map((lib.data as any[]).map((t) => [t.id, t]));
const types = aggregate(tr.data, meta, gT, 'type'), w = weakest(types);
ok(w?.key === 'nyílt cloze (egy szó)' && w.ratio === 0 && types[1]?.key === 'mondatrész visszahelyezése szövegbe' && types[1].ratio === 2 / 3,
  `a leggyengébb típus: ${w?.key} (${w?.ratio}); utána ${types[1]?.key} (${types[1]?.ratio})`);
const secs = aggregate(tr.data, meta, gT, 'section');
ok(secs.length === 2 && secs[0].key === 'language' && secs[1].key === 'reading', `vizsgarészenként: ${secs.map((x) => x.key + ' ' + x.correct + '/' + x.total).join(', ')}`);
const cR2 = compare(tr.data, gT).find((c) => c.task === R2);
ok(cR2 && cR2.groups.find((x) => x.group === gT)?.ratio === 2 / 3 && cR2.groups.find((x) => x.group === gU)?.ratio === 0,
  `összevetés az R2-n: ${cR2?.groups.map((x) => x.ratio.toFixed(2)).join(' / ')}`);
const trB = await rest(B.token, 'POST', 'rpc/group_trends', {});
ok(trB.ok && trB.data.every((r: any) => r.group !== gT && r.group !== gU && r.group !== gA.id), `B nem látja A csoportjainak trendjeit (${trB.data?.length} saját sor)`);
const trAnon = await rest(undefined, 'POST', 'rpc/group_trends', {});
ok(!trAnon.ok, `bejelentkezés nélkül nincs trend → ${trAnon.status}`);
await rest(A.token, 'DELETE', `groups?id=eq.${gT}`); await rest(A.token, 'DELETE', `groups?id=eq.${gU}`);

// takarítás: a csoport törlése a kiosztásait és az eredményeit is törli
const delA = await rest(A.token, 'DELETE', `groups?id=eq.${gA.id}`);
ok(delA.ok && delA.data.length === 1, 'A törli a saját csoportját');
const gone = await rest(A.token, 'GET', `assignments?select=id&id=eq.${ca.data.id}`);
ok(gone.ok && gone.data.length === 0, 'a csoporttal a kiosztása is törlődött');
const goneCode = await rest(undefined, 'POST', 'rpc/get_assignment', { p_code: ca.data.code });
ok(goneCode.data?.found === false, 'a törölt kiosztás kódja már nem nyit feladatot');
await rest(B.token, 'DELETE', `groups?id=eq.${gB.id}`);
