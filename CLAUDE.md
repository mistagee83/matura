# Matura – kód

Angol érettségi gyakorló: a tanár kioszt egy feladatot, a diákok telefonon, becenévvel megoldják, a szerver javít. A teljes specifikáció: `SPEC.md` (a forrásanyag mappájából átvéve; ha döntés születik, ott és itt is vezesd át).

A forrásanyag (PDF, mp3, a digitalizáló eszközök) külön mappában van: `D:\Dokumentumok\Tanári segédanyagok\e-books\Érettségi 2005-2026`. A `tartalom/` ennek a másolata; tartalmi javítás ott történik (kinyerő, `kezi.js`), utána ide másolandó, és újra kell generálni a `supabase/seed.sql`-t.

## Szerkezet

| Hely | Mi van benne |
|---|---|
| `app/` | a felület (React, TypeScript, Vite); Cloudflare Pages-re épül. Diák: `/`, `/k/<kód>`; tanár: `/tanar` (`app/src/teacher/`, külön csomagként töltődik) |
| `supabase/migrations/` | adatbázis-séma és jogosultságok |
| `supabase/functions/submit/` | beküldés és javítás (Edge Function) |
| `supabase/functions/_shared/grade.ts` | a javító: a függvény és a próbák is ezt használják |
| `supabase/seed.sql` | generált: `node eszkozok/seed.ts` |
| `tartalom/` | a 91 feladatsor JSON-ban |
| `tests/` | `node --test tests/grade.test.ts` – a javító mind a 949 feladaton; `eles.ts` – élesítési próba; `tanar.ts` – a tanári jogosultságok két tanárfiókkal |

## Parancsok

```
node --test tests/grade.test.ts     # a javító próbája
node eszkozok/seed.ts               # supabase/seed.sql újragenerálása a tartalom/ alapján
cd app && npm run dev               # http://localhost:5175 ; helyi próba-háttérrel, ha nincs .env.local
cd app && npm run build             # típusellenőrzés és build
node tests/tanar.ts <url> <publishable kulcs>   # két tanárfiók elkülönítése; a fiókok: MATURA_A_EMAIL, MATURA_B_EMAIL, MATURA_PW
```

A tanári felület helyben csak Supabase-szel működik: az `app/.env.local` (nincs verziókezelve) az `.env.production` két sorát tartalmazza; ilyenkor a diákoldal is az éles adatbázist használja.

Helyi próbakódok (csak a fejlesztői kiszolgálón): `/k/MINTA24K`, `/k/MINTA24E`, bármely feladatsor `/k/<ÉV><HÓNAP><SZINT>` (pl. `/k/2019OKTEMELT`); `?vis=after_close` a „megoldás csak lezárás után” beállítás.

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
- Próbakiosztások élesben: `/k/MINTA24K`, `/k/MINTA24E`. Az adatbázisban próbabeküldések vannak („Proba”, „Elesproba” becenévvel); a 2. szakasz előtt törölhetők.
- A megrendelő telefonon élesben kipróbálta, működik (2026-11-25): az 1. szakasz lezárva. A hang (R2) a 3. szakaszban jön.
- A felület nyelve magyar marad (a megrendelő megerősítette, 2026-11-25).

2. szakasz (tanári alap) – folyamatban (2026-11-25):
- Kész: `teachers`, `groups`, tanári RLS, `create_assignment()` élesítve; tanári felület (belépés, regisztráció, elfelejtett jelszó, csoportok, feladattár szűrőkkel és előnézettel, kiosztás, megosztó nézet QR-kóddal, beküldések listája és törlése). Próba: `tests/tanar.ts` 34 pont RENDBEN (két próbafiók: proba1@matura.test, proba2@matura.test).
- Supabase Auth: megerősítő levél kikapcsolva (a megrendelő döntése); Site URL `https://matura.mrandrewshub.com`, átirányítás: `https://matura.mrandrewshub.com/**`, `http://localhost:5175/**`.
- Hátravan: Google-szolgáltató (OAuth-azonosító a megrendelőtől), saját levélküldő (Resend SMTP) a jelszó-visszaállításhoz – addig a beépített levélküldő csak a projekt tagjainak küld.
- A hang lejátszása (mindkét hangmód), a lezárás és az élő frissítés a 3. szakaszban jön; addig a „lezárás után” láthatóságú kiosztásnál a diák nem látja a megoldást.

Élesítés menete: séma és tartalom `npx supabase db push --remote --include-seed --yes`, függvény `npx supabase functions deploy submit --remote=fjhwqynnlgjpjsfxncbj --use-api --yes` (a CLI éles módosítás előtt a felhasználó kifejezett jóváhagyását kéri). Az új projekt kulcsrendszere: a függvény a `SUPABASE_SECRET_KEYS`-t használja; az új táblákhoz a `service_role` jogát migráció adja.
