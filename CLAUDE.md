# Matura – kód

Angol érettségi gyakorló: a tanár kioszt egy feladatot, a diákok telefonon, becenévvel megoldják, a szerver javít. A teljes specifikáció: `SPEC.md` (a forrásanyag mappájából átvéve; ha döntés születik, ott és itt is vezesd át).

A forrásanyag (PDF, mp3, a digitalizáló eszközök) külön mappában van: `D:\Dokumentumok\Tanári segédanyagok\e-books\Érettségi 2005-2026`. A `tartalom/` ennek a másolata; tartalmi javítás ott történik (kinyerő, `kezi.js`), utána ide másolandó, és újra kell generálni a `supabase/seed.sql`-t.

## Szerkezet

| Hely | Mi van benne |
|---|---|
| `app/` | a diákfelület (React, TypeScript, Vite); Cloudflare Pages-re épül |
| `supabase/migrations/` | adatbázis-séma és jogosultságok |
| `supabase/functions/submit/` | beküldés és javítás (Edge Function) |
| `supabase/functions/_shared/grade.ts` | a javító: a függvény és a próbák is ezt használják |
| `supabase/seed.sql` | generált: `node eszkozok/seed.ts` |
| `tartalom/` | a 91 feladatsor JSON-ban |
| `tests/` | `node --test tests/grade.test.ts` – a javító mind a 949 feladaton |

## Parancsok

```
node --test tests/grade.test.ts     # a javító próbája
node eszkozok/seed.ts               # supabase/seed.sql újragenerálása a tartalom/ alapján
cd app && npm run dev               # http://localhost:5175 ; helyi próba-háttérrel, ha nincs .env.local
cd app && npm run build             # típusellenőrzés és build
```

Helyi próbakódok (csak a fejlesztői kiszolgálón): `/k/MINTA24K`, `/k/MINTA24E`, bármely feladatsor `/k/<ÉV><HÓNAP><SZINT>` (pl. `/k/2019OKTEMELT`); `?vis=after_close` a „megoldás csak lezárás után” beállítás.

## Szabályok

- A megoldókulcs a beküldés előtt nem kerülhet a diák eszközére: a diák a `publicTask()` szerinti, kulcs nélküli feladatot kapja; a javítás a szerveren fut. Új kulcsmezőnél bővítsd a `grade.ts` `ITEM_KEY_FIELDS` listáját és a próbát.
- A diákról csak becenév és véletlen eszközazonosító tárolható; ne kapcsold össze a diákot kiosztások között.
- A felület magyar és tegeződő, a vizsgaszöveg angol, változtatás nélkül. Emoji és felkiáltójel nincs a felületi szövegben. A helyes és a hibás válasz ikonnal is különbözik.
- A diákoldal 360 px-től működik vízszintes görgetés nélkül.
- Titkos kulcs (service role, adatbázis-jelszó) nem kerülhet a tárolóba és a felületbe.

## Állapot

1. szakasz (diákoldal) – kód kész, helyben kipróbálva; az éles Supabase-re még nincs feltöltve.
