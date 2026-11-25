// Élesítési próba a Supabase-projekten (csak a nyilvános, publishable kulccsal – úgy, ahogy a diák böngészője is látja).
// Használat: node tests/eles.ts <supabase url> <publishable kulcs>
import { execFileSync } from 'node:child_process';

const [URL_, KEY] = process.argv.slice(2);
const h = { apikey: KEY, 'Content-Type': 'application/json' };
const KEYF = ['accept', 'answer', 'alt', 'gaps', 'combos', 'keywords', 'key', 'fixes', 'unordered', 'group', 'groupKey', 'maxWords', 'note'];
const ok = (cond: boolean, msg: string) => { console.log((cond ? 'RENDBEN  ' : 'HIBA     ') + msg); if (!cond) process.exitCode = 1; };

// 1. a kiosztás kulcs nélkül jön
for (const code of ['MINTA24K', 'MINTA24E']) {
  const a = await fetch(`${URL_}/rest/v1/rpc/get_assignment`, { method: 'POST', headers: h, body: JSON.stringify({ p_code: code, p_device: crypto.randomUUID() }) }).then((r) => r.json());
  const leaks = a.tasks.flatMap((t: any) => t.content.items.filter((i: any) => !i.example).flatMap((i: any) => KEYF.filter((k) => i[k] !== undefined)));
  ok(a.found && a.tasks.length > 0 && leaks.length === 0, `${code}: ${a.tasks?.length} feladat, kulcsmező a válaszban: ${leaks.length}`);
}
ok((await fetch(`${URL_}/rest/v1/rpc/get_assignment`, { method: 'POST', headers: h, body: JSON.stringify({ p_code: 'NINCSILYEN' }) }).then((r) => r.json())).found === false, 'ismeretlen kód: found = false');

// 2. a táblák közvetlenül nem olvashatók (sorszintű jogosultság)
for (const t of ['task_keys', 'tasks', 'assignments', 'submissions', 'answers']) {
  const r = await fetch(`${URL_}/rest/v1/${t}?select=*&limit=1`, { headers: h });
  const body = await r.json().catch(() => null);
  ok(!r.ok || (Array.isArray(body) && body.length === 0), `${t}: közvetlen olvasás → ${r.status}, ${Array.isArray(body) ? body.length + ' sor' : 'tiltva'}`);
}
const ins = await fetch(`${URL_}/rest/v1/submissions`, { method: 'POST', headers: h, body: JSON.stringify({ assignment_id: crypto.randomUUID(), nickname: 'x', device_id: crypto.randomUUID(), score: 99, max_score: 99, counts: true }) });
ok(!ins.ok, `submissions: közvetlen írás → ${ins.status}`);

// 3. a szerveroldali javító: kulcs szerinti válaszok → teljes pont, üres → 0, két hibával → max − 2
for (const [code, exam] of [['MINTA24K', '2024-maj-kozep'], ['MINTA24E', '2024-maj-emelt']]) {
  const full = JSON.parse(execFileSync(process.execPath, ['tests/kulcsvalasz.ts', exam], { encoding: 'utf8' }));
  const send = (answers: any) => fetch(`${URL_}/functions/v1/submit`, { method: 'POST', headers: h, body: JSON.stringify({ code, nickname: 'Proba', deviceId: crypto.randomUUID(), answers }) }).then((r) => r.json());
  const r1 = await send(full.answers);
  ok(r1.score === r1.max && r1.max > 0, `${code}: kulcs szerinti válaszok → ${r1.score} / ${r1.max}`);
  const r0 = await send({});
  ok(r0.score === 0, `${code}: üres beküldés → ${r0.score} / ${r0.max}`);
  const first = Object.keys(full.answers)[0], n = Object.keys(full.answers[first])[0];
  const wrong = structuredClone(full.answers); wrong[first][n] = 'zzz';
  const last = Object.keys(full.answers).at(-1)!, m = Object.keys(full.answers[last]).at(-1)!;
  wrong[last][m] = 'zzz';
  const r2 = await send(wrong);
  ok(r2.score === r2.max - 2, `${code}: két hibával → ${r2.score} / ${r2.max}`);
}
const bad = await fetch(`${URL_}/functions/v1/submit`, { method: 'POST', headers: h, body: JSON.stringify({ code: 'MINTA24K', nickname: '', deviceId: 'x', answers: {} }) });
ok(bad.status === 400, `hibás beküldés (üres becenév) → ${bad.status}`);
