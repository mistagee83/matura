// A tanári jogosultságok próbája az éles (vagy bármely) Supabase-projekten, két tanárfiókkal (SPEC 6., 10. 2. szakasz).
// Használat: node tests/tanar.ts <supabase url> <publishable kulcs>
//   a fiókok: MATURA_A_EMAIL, MATURA_B_EMAIL, MATURA_PW környezeti változóban (mindkettő ugyanazzal a jelszóval)
// A próba létrehoz egy-egy csoportot és kiosztást, a végén törli őket (a beküldésekkel együtt).
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

// takarítás: a csoport törlése a kiosztásait és az eredményeit is törli
const delA = await rest(A.token, 'DELETE', `groups?id=eq.${gA.id}`);
ok(delA.ok && delA.data.length === 1, 'A törli a saját csoportját');
const gone = await rest(A.token, 'GET', `assignments?select=id&id=eq.${ca.data.id}`);
ok(gone.ok && gone.data.length === 0, 'a csoporttal a kiosztása is törlődött');
const goneCode = await rest(undefined, 'POST', 'rpc/get_assignment', { p_code: ca.data.code });
ok(goneCode.data?.found === false, 'a törölt kiosztás kódja már nem nyit feladatot');
await rest(B.token, 'DELETE', `groups?id=eq.${gB.id}`);
