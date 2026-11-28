# Matura – kód

Angol érettségi gyakorló: a tanár kioszt egy feladatot, a diákok telefonon, becenévvel megoldják, a szerver javít. A teljes specifikáció: `SPEC.md` (a forrásanyag mappájából átvéve; ha döntés születik, ott és itt is vezesd át).

A forrásanyag (PDF, mp3, a digitalizáló eszközök) külön mappában van: `D:\Dokumentumok\Tanári segédanyagok\e-books\Érettségi 2005-2026`. A `tartalom/` és a `szojegyzek/` ennek a másolata; tartalmi javítás ott történik (kinyerő, `kezi.js`; a szójegyzéknél a `szojegyzek-ellenorzo.js` után), utána ide másolandó, és újra kell generálni a `supabase/seed.sql`-t.

## Szerkezet

| Hely | Mi van benne |
|---|---|
| `app/` | a felület (React, TypeScript, Vite); Cloudflare Pages-re épül. Nyitóoldal: `/` (`app/src/Landing.tsx`, benne a diák kódbeírója); diák: `/k/<kód>`; tanár: `/tanar` (`app/src/teacher/`, külön csomagként töltődik); kiosztás: `/tanar/kiosztas/<id>` (megosztás, élő nézet, tanári hang, lezárás), statisztika: `/tanar/kiosztas/<id>/eredmeny`; csoport oldala (trendek, összevetés): `/tanar/csoport/<id>`; önálló gyakorlás: `/gyakorlas`, `/gyakorlas/<feladat>` (`app/src/Practice.tsx`, SPEC 4.4) |
| `supabase/functions/practice/` | önálló gyakorlás: egy feladat javítása, a megoldással és a szójegyzék megoldást elárulható címszavaival (`glossaryAfter`); csak névtelen darabszámot ment (`practice_runs`) |
| `szojegyzek/` | az olvasásfeladatok szójegyzéke (SPEC 4.5), a forrásmappa `szojegyzek/` mappájának másolata; a seed `task_glossary` táblába tölti, kettébontva (`_shared/glossary.ts`): a beküldés előtt látható rész a `practice_task()`-kal megy ki, az `afterSubmit` rész csak a `practice` függvény válaszával. Felület: `app/src/gloss.tsx` (kiemelés, magyarázó lap), a kapcsoló a `Practice.tsx`-ben |
| `app/src/Player.tsx` | hanglejátszó (diák és tanár); a hang címe `VITE_AUDIO_BASE` + a `audio.clip` fájlneve |
| `eszkozok/fredoka-hu.py` | a címsorok betűje (Fredoka 600) az ő, ű, Ő, Ű betűvel, amely a Google Fontsról letölthetőből hiányzik; kimenet: `app/public/fonts/fredoka-matura-600.woff2` (OFL 1.1, a licenc mellette). A Fredokát ezért nem a Google Fontsról töltjük. |
| `eszkozok/hang-feltoltes.ts` | a kivágott hangok feltöltése az R2 `matura-hang` tárolóba (wrangler) |
| `app/src/teacher/trends.ts` | a csoportszintű trendek számolása (részenként, típusonként, leggyengébb típus, összevetés); a felület és a próbák is ezt használják |
| `supabase/migrations/` | adatbázis-séma és jogosultságok |
| `supabase/functions/submit/` | beküldés és javítás (Edge Function) |
| `supabase/functions/_shared/grade.ts` | a javító: a függvény és a próbák is ezt használják |
| `supabase/seed.sql` | generált: `node eszkozok/seed.ts` |
| `tartalom/` | a 91 feladatsor JSON-ban |
| `tests/` | `node --test tests/grade.test.ts` – a javító mind a 949 feladaton; `eles.ts` – élesítési próba; `tanar.ts` – a tanári jogosultságok két tanárfiókkal, a 3. szakasztól az élő frissítés, a lezárás és a statisztika, a 4.-től a csoportszintű trendek is; `trendek.test.ts` – a trendek számolása kézzel kiszámolt értékekkel |

## Parancsok

```
node --test tests/grade.test.ts tests/trendek.test.ts tests/szojegyzek.test.ts   # a javító, a trendek és a szójegyzék próbája
node eszkozok/seed.ts               # supabase/seed.sql újragenerálása a tartalom/ alapján
cd app && npm run dev               # http://localhost:5175 ; helyi próba-háttérrel, ha nincs .env.local
cd app && npm run build             # típusellenőrzés és build
node tests/tanar.ts <url> <publishable kulcs>   # két tanárfiók elkülönítése; a fiókok: MATURA_A_EMAIL, MATURA_B_EMAIL, MATURA_PW
node eszkozok/hang-feltoltes.ts <hang mappa>   # hangfájlok az R2-be (npx wrangler login után)
```

A tanári felület helyben csak Supabase-szel működik: az `app/.env.local` (nincs verziókezelve) az `.env.production` két sorát tartalmazza; ilyenkor a diákoldal is az éles adatbázist használja.

Helyi próbakódok (csak a fejlesztői kiszolgálón, `.env.local` nélkül vagy üres `VITE_SUPABASE_URL`-lel): `/k/MINTA24K`, `/k/MINTA24E`, bármely feladatsor `/k/<ÉV><HÓNAP><SZINT>` (pl. `/k/2019OKTEMELT`); `?vis=after_close` a „megoldás csak lezárás után” beállítás, `?st=closed` a lezárt kiosztás, `?hang=teacher` az órai hangmód. Helyben a hang a forrásmappa `hang/` könyvtárából jön (`/dev-hang/`).

## Szabályok

- A megoldókulcs a beküldés előtt nem kerülhet a diák eszközére: a diák a `publicTask()` szerinti, kulcs nélküli feladatot kapja; a javítás a szerveren fut. Új kulcsmezőnél bővítsd a `grade.ts` `ITEM_KEY_FIELDS` listáját és a próbát.
- A diákról csak becenév és véletlen eszközazonosító tárolható; ne kapcsold össze a diákot kiosztások között.
- A felület magyar és tegeződő, a vizsgaszöveg angol, változtatás nélkül. Emoji és felkiáltójel nincs a felületi szövegben. A helyes és a hibás válasz ikonnal is különbözik.
- A diákoldal 360 px-től működik vízszintes görgetés nélkül.
- Titkos kulcs (service role, adatbázis-jelszó) nem kerülhet a tárolóba és a felületbe.
- A tanár csak a sajátját látja: minden tanári tábla sorszintű szabállyal szűrt (`supabase/migrations/…_tanar.sql`); új tanári táblánál szabály, táblajog és próba (`tests/tanar.ts`) is kell. A kiosztás csak a `create_assignment()` függvénnyel jön létre (ez adja a kódot: 6 jel, 0/O és 1/I nélkül). A kulcs (`task_keys`) bejelentkezett tanárnak sem olvasható, mert bárki regisztrálhat.

## Állapot

1. szakasz (diákoldal) – élesítve (2026-11-25):
- Supabase `fjhwqynnlgjpjsfxncbj`: séma, 949 feladat, `submit` függvény; próba: `node tests/eles.ts <url> <publishable kulcs>` (minden pont RENDBEN).
- Cloudflare Pages `matura` (`matura-7r4.pages.dev`), a `main` ágból automatikusan épül; gyökér `app`, `npm run build`, `dist`. Aldomain: `matura.mrandrewshub.com`.
- Próbakiosztások élesben: `/k/MINTA24K`, `/k/MINTA24E`. A próbabeküldések törölve (2026-11-26).
- A megrendelő telefonon élesben kipróbálta, működik (2026-11-25): az 1. szakasz lezárva. A hang (R2) a 3. szakaszban jön.
- A felület nyelve magyar marad (a megrendelő megerősítette, 2026-11-25).

2. szakasz (tanári alap) – élesítve és lezárva (2026-11-25): a megrendelő élesben kipróbálta, működik.
- Kész: `teachers`, `groups`, tanári RLS, `create_assignment()` élesítve; tanári felület (belépés, regisztráció, elfelejtett jelszó, csoportok, feladattár szűrőkkel és előnézettel, kiosztás, megosztó nézet QR-kóddal, beküldések listája és törlése). Próba: `tests/tanar.ts` 34 pont RENDBEN (két próbafiók: proba1@matura.test, proba2@matura.test).
- Supabase Auth: megerősítő levél kikapcsolva (a megrendelő döntése); Site URL `https://matura.mrandrewshub.com`, átirányítás: `https://matura.mrandrewshub.com/**`, `http://localhost:5175/**`.
- Google-belépés kész és élesben kipróbálva (2026-11-25).
- Levélküldés: Resend SMTP (`noreply@mrandrewshub.com`), a jelszó-visszaállítás élesben kipróbálva (2026-11-25). A levélsablonok még a Supabase alapértelmezett angol szövegei.
- A Matura különálló termék, nem a Hub közös Firebase-fiókja (SPEC 11., 18. döntés).
Önálló gyakorló mód (SPEC 4.4, 11./22.) – élesben: migráció `…06_gyakorlas.sql` (`practice_catalog()`, `practice_task()`, `practice_runs`), `practice` függvény (`verify_jwt = false`). Helyben a próba-háttér a `/dev-api/catalog`, `/dev-api/practice-task`, `/dev-api/practice` címen adja ugyanezt.
Szójegyzék a gyakorló módban (SPEC 4.5, 11./23.) – 2026-11-28: migráció `…28120000_szojegyzek.sql` (`task_glossary`, a `practice_task()` `glossary` mezővel), a `practice` függvény `glossaryAfter` mezője, felület: „Szótár” kapcsoló a gyakorló feladat fölött. Ugyanekkor ment ki a tartalom 2026-11-28-i javítása (121 tördelési hiba, egy cím, három példa; SPEC 10.).
Élesítési tanulság (2026-11-28): a `db push --include-seed` a megváltozott seedet nem futtatja újra, csak a lenyomatát frissíti. A tartalom frissítése: a seed.sql kb. 800 kB-os részekre bontva (`insert` utasításonként), részenként `npx supabase db query --remote -f <rész> --yes` (egyben 413-as hibát ad).
Szótár a tanári kiosztásban (SPEC 4.5, 11./24.) – 2026-11-28: migráció `…28130000_kiosztas_szotar.sql` (`assignments.glossary`, `create_assignment(…, p_glossary)`, a `get_assignment()` feladatonként `glossary`, lezárva `glossaryAfter` mezővel), a `submit` függvény „azonnali megoldásnál” `glossaryAfter`-t ad; tanári felület: „Szótár az olvasásfeladatoknál” pipa a kiosztásnál. Helyben: `/k/<kód>?szotar=1`. A megrendelő élesben kipróbálta, működik (2026-11-28).
3. szakasz (élő nézet és statisztika) – élesítve (2026-11-25); a valódi tanórás elfogadási próba hátravan (ellenőrzőlista: a forrásmappa `3-szakasz-orai-proba.md` fájlja).
- Hang: mind a 273 fájl az R2 `matura-hang` tárolóban, nyilvános aldomain `https://matura-hang.mrandrewshub.com/` (wrangler r2 bucket domain, zóna: mrandrewshub.com). A jogi kérdést a megrendelő lezárta (SPEC 11., 19.).
- Migrációk: `…04_elo.sql` (Realtime a submissions táblára; `get_assignment()` lezárt kiosztásnál a kulcsos feladatot is adja `key` mezőben; `assignment_stats()`), `…05_stat_javitas.sql` (csak a beírós válaszokat kisbetűsíti).
- Élő nézet: Supabase Realtime, tartalékként 20 mp-es lekérdezés. Lezárás és újranyitás a tanári felületről (`assignments.status`). A diák a lezárás után a kulcsból (`solutions()` a `grade.ts`-ből, a kliensen) látja a megoldást; beküldött, „lezárás után” kiosztásnál 15 mp-enként ellenőrzi a lezárást.
- Próbák élesben (2026-11-25): `tests/tanar.ts` 53/53 RENDBEN (próbafiókok: proba3@matura.test, proba4@matura.test; a jelszó csak a munkamenet ideiglenes mappájában volt), `tests/eles.ts` RENDBEN, `grade.test.ts` RENDBEN. A próbafiókok (proba1–proba6) törölve (2026-11-26); új próbához két új fiók kell.

4. szakasz (csoportszintű trendek) – élesítve (2026-11-26); a megrendelő elfogadási próbája hátravan:
- Migráció: `…06_trendek.sql` (`group_trends()`, security invoker). Felület: a csoport oldala (`GroupView`), a csoportkártyáról és a statisztikából nyílik. Döntések: SPEC 11., 21.
- Próbák élesben (2026-11-26): `tests/tanar.ts` 63/63 RENDBEN (próbafiókok: proba5@matura.test, proba6@matura.test; a jelszó csak a munkamenet ideiglenes mappájában volt), `trendek.test.ts` és `grade.test.ts` RENDBEN. A próba után mind a hat próbafiók, a MINTA24K/E 19 próbabeküldése és a „Próba 12.B” csoport törölve (2026-11-26).

Élesítés menete: séma és tartalom `npx supabase db push --remote --include-seed --yes` (csak séma: `--include-seed` nélkül), függvény `npx supabase functions deploy submit --remote=fjhwqynnlgjpjsfxncbj --use-api --yes` (a CLI éles módosítás előtt a felhasználó kifejezett jóváhagyását kéri). Az új projekt kulcsrendszere: a függvény a `SUPABASE_SECRET_KEYS`-t használja; az új táblákhoz a `service_role` jogát migráció adja.
