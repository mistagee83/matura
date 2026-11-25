# Matura – specifikáció

Angol érettségi gyakorló app: az összes eddigi kétszintű angol érettségi feladata digitálisan, mobilon megoldható formában, tanári kiosztással és csoportszintű statisztikával.

Állapot: a tervezés lezárult (2026-11-24), a fejlesztés még nem indult. Éles kód nincs; a `prototipus/` mappa csak a feladattípusok és az adatformátum kipróbálására készült.

Utolsó frissítés: 2026-11-24 (a tervezés lezárva)

---

## 1. Cél és hatókör

### Mit old meg

A tanár kiválaszt egy vagy több érettségi feladatot, megosztja a csoportjával egy linken, a diákok telefonon megoldják, a tanár pedig látja, hogy a csoportnak mely kérdések és mely feladattípusok okoznak nehézséget.

### Benne van

- Az írásbeli vizsga három automatikusan javítható része: olvasott szöveg értése, nyelvhelyesség, hallott szöveg értése.
- Közép- és emelt szint, 2005-től napjainkig.
- Tanári fiók, csoportok, kiosztás, megosztás linkkel és QR-kóddal.
- Diákoldali kitöltés fiók nélkül, becenévvel.
- Automatikus javítás a hivatalos javítási útmutató szerint.
- Csoportszintű statisztika.
- Két hangmód: a tanár játssza le a hanganyagot az órán, vagy a diák hallgatja a saját eszközén.

### Nincs benne

- Íráskészség és szóbeli.
- Egyéni nyomon követés: a rendszer nem azonosítja a diákot, és nem épít róla előzményt.
- Diákfiók, jelszó, e-mail-cím a diáktól.
- Teljes vizsga szimulációja időméréssel (az első változatban nincs).
- A feladatlapok illusztrációi.

### Későbbi irány

Önálló gyakorlás tanár nélkül, fizetős formában, szülőknek és diákoknak. Az adatmodellnek ezt nem szabad kizárnia (a kiosztás csoport nélkül is létezhessen), de az első változat nem tartalmazza.

---

## 2. Szereplők

| Szereplő | Azonosítás | Mit csinál |
|---|---|---|
| Tanár | fiók: Google-fiókkal, vagy e-mail-címmel és jelszóval | csoportot hoz létre, feladatot oszt ki, hangot játszik le, eredményt és statisztikát néz |
| Diák | nincs fiók; becenév kiosztásonként | megnyitja a linket, kitölti a feladatot, látja az eredményét |

Regisztráció: bárki regisztrálhat, és aki regisztrál, tanár. Diákregisztráció nincs. Az első időszakban a megrendelő és a kollégái használják, tanórán; a nyílt regisztráció ezért nem igényel jóváhagyási folyamatot, de az e-mailes regisztrációnál a cím megerősítése kötelező.

A becenév szabadon választott és kiosztásonként más lehet. Ugyanaz a diák egyszer „Pistike", máskor „Józsika" néven is beléphet; ez elfogadott, mert a tanárt a csoport mintázata érdekli.

---

## 3. Tartalom

### 3.1 Forrásanyag

A projekt gyökerében évenkénti mappákban van a hivatalos anyag:

- `*_fl.pdf` – feladatlap
- `*_ut.pdf` – javítási-értékelési útmutató (megoldókulcs, pontátszámítás, szövegátirat)
- `*_fl.mp3` – a hallásértés teljes hanganyaga (kb. 30 perc, kb. 28 MB)

Állomány a hatókörbe tartozó vizsgákból (2026-11-24): 91 feladatlap, mindegyikhez útmutató és vizsgahang (kb. 2,7 GB hang). Mind gépileg olvasható.

Felmérés: a 91 lapból kb. 957 feladat azonosítható a három érintett részben. A szám kulcsszavas besorolásból származik, közelítő, és néhány tévesen besorolt íráskészség-feladatot is tartalmazhat.

### 3.2 A hiányzó feladatsorok

Megérkeztek és ellenőrizve (2026-11-24): 2005. ősz emelt; 2018. május és október (közép, emelt); 2019. május emelt útmutató; 2019., 2020. és 2021. október (közép, emelt); 2022. május és október emelt.

Az ellenőrzés tartalma: mind a 27 PDF gépileg olvasható, a bennük szereplő vizsganap és szint egyezik a mappával; a 13 hangfájl 30 perces; azonos tartalmú fájl nincs a teljes anyagban. A hangok közül 12 automatikusan vágható, a 2005. őszi emelt kézi időpontot kér. A PDF-ek tartalmát ember nem olvasta át, a hangokba senki nem hallgatott bele.

Fennmaradó eltérések a forrásanyagban:

| Hol | Mi | Teendő |
|---|---|---|
| 2005. május közép, második feladatsor (`k_angolV30`) | nincs hozzá hangfájl | **kimarad** (döntés, 2026-11-24). Az emelt szintű `e_angolV30` teljes, az bekerül |
| 2021. május közép | a hang 71 MB, a többinél nagyobb (más tömörítéssel készült) | nincs teendő; a vágás működik rajta. A fájlt 2026-11-24-én átneveztük `érettségi_2021_május.mp3`-ról `k_angol_21maj_fl.mp3`-ra |

Kimarad (döntés, 2026-11-24): csak a 2005-től írt rendes kétszintű érettségi dolgozatok kerülnek be.

- A 2003-as és 2004-es próbaérettségi és a négy mintafeladatsor nem.
- A 2005-ös „hagyományos" (régi rendszerű) feladatlapok nem.

### 3.3 Feladattípusok és beviteli módok

Minden feladat egy beviteli módhoz (`kind`) tartozik. A darabszámok a teljes, 91 lapos állomány gépi felmérésének közelítő értékei (összesen kb. 957 feladat, ebből 18-at a besorolás nem ismert fel).

| `kind` | Vizsgatípusok | Kb. darab | Kitöltés a felületen |
|---|---|---|---|
| `bank` | mondat vagy mondatrész visszahelyezése, cím vagy kérdés párosítása, félmondatok párosítása, szóbank, szöveg–állítás párosítás, sorrend | ~215 | a hézagra koppintva alulról felnyíló listából választ; egy elem egy helyen szerepelhet |
| `choice` | igaz/hamis, igaz/hamis/nincs infó, feleletválasztás (A–D), feleletválasztós szöveg | ~270 | egy válasz kijelölése |
| `multi` | kettős választás hallás után (A, B vagy mindkettő) | ~60 | egy vagy két válasz kijelölése; pont csak pontos egyezésre jár |
| `text` | nyílt cloze, szóképzés, hallás utáni kiegészítés (egy vagy két szó), összefoglaló kiegészítése | ~290 | beírás; az elfogadott válaszok listájával veti össze |
| `lines` | soronkénti hibakeresés | ~93 | a felesleges szóra koppint, vagy helyesnek jelöli a sort |

Még nem digitalizált és nem kipróbált típusok:

| Típus | Időszak | Darab | Megjegyzés |
|---|---|---|---|
| Hibás szó javítása hallás után | közép: 2011. május és október, 2015. október, 2017. május, 2019. május | 5 | kijelölés és beírás együtt; `fix` |
| Összekevert szavak mondattá rendezése | közép nyelvhelyesség: 2005 (három lap), 2006. május és október, 2007. május | 6 (ebből 5 került be, a hatodik a kimaradó 2005. májusi második középszintű lapon van) | szavak sorba rendezése; `order` |
| Mondatátalakítás | közép nyelvhelyesség: 2006. február, 2007. október | 2 | szabad szöveges, géppel nehezen javítható |
| Rövid válasz kérdésre hallás után | 18 lap 2005 és 2019 között, 13 közép és 5 emelt; laponként a három hallásfeladat egyike | 18 | a kulcs tartalmilag értékel; csak elfogadott válaszok listájával közelíthető |
| Jegyzet vagy táblázat kiegészítése hallás után | 17 lap 2005 és 2011 között | 17 | várhatóan `text`, de több szavas válaszok lehetnek; a kulcsokat még nem néztük át |

A mondatok vagy bekezdések sorba rendezése olvasott szövegnél (7 feladat, 2005–2020) nem tartozik ide: az a `bank` típussal megoldható.

A lapazonosítás gépi besorolásból származik; a digitalizáláskor laponként ellenőrizni kell.

**Döntés (2026-11-24):**

| Típus | Sorsa | Megvalósítás |
|---|---|---|
| Hibás szó javítása hallás után | bekerül | új `kind`: `fix` – a diák rákoppint a hibás szóra, és beírja a helyeset; a pont a helyes szóért jár (lásd 3.5) |
| Összekevert szavak mondattá rendezése | bekerül | új `kind`: `order` – a szavakat koppintással rakja sorba; a megadott első szó rögzített |
| Rövid válasz és jegyzetkiegészítés, zárt kulccsal | bekerül | `text`, a meglévő módon |
| Rövid válasz és jegyzetkiegészítés, kulcsszavas kulccsal | bekerül | `text`, új javítási móddal: `grading.spelling: "keywords"` (lásd 3.5) |
| Rövid válasz tartalmi kulccsal (3 emelt feladat) | kimarad | – |
| Mondatátalakítás (2 feladat) | kimarad | – |

A kimaradó feladatokat a feladatsor JSON-jában nem vesszük fel (a vizsgarész `omitted` listája sorolja fel őket az okkal); a lap többi feladata megoldható marad. A két új `kind` és a kulcsszavas mód a prototípusban működik.

**A digitalizálás végén (2026-11-24) kimaradó hét feladat:**

| Feladat | Pont | Ok |
|---|---|---|
| 2006. február közép, nyelvhelyesség 1. | 5 | mondatátalakítás |
| 2007. október közép, nyelvhelyesség 1. | 6 | mondatátalakítás |
| 2005. május emelt, hallás 1. | 9 | rövid válasz tartalmi kulccsal |
| 2006. február emelt, hallás 1. | 10 | rövid válasz tartalmi kulccsal |
| 2009. október emelt, hallás 2. | 10 | rövid válasz tartalmi kulccsal |
| 2019. május közép, hallás 1. | 7 | képek párosítása országokhoz – kép nélkül nem oldható meg |
| 2019. október emelt, hallás 2. | 9 | képek párosítása táblákhoz – kép nélkül nem oldható meg |

Az utolsó két feladat az illusztrációkról szóló döntés (11. fejezet, 5. pont) következménye; ha a képek mégis bekerülhetnek, ezek pótolhatók.

**A régi lapokon talált további típusok** (mind a meglévő `kind` értékekkel megoldva, új beviteli mód nélkül):

| Vizsgatípus (`examType`) | `kind` / `layout` | Megjegyzés |
|---|---|---|
| állítások párosítása szövegrészekhez | `choice` / `stems` | a szöveg betűjeles részekből áll (A–F), egy betű több állításhoz is tartozhat; a közös opciók a betűk |
| rövid szövegek párosítása állításokhoz | `bank` / `stems` | számozott levelek, hozzászólások; mindegyikhez egy betűjeles állítás |
| rövid válasz olvasott szöveg alapján | `text` / `stems`, kulcsszavas javítás | kérdés és rövid válasz (legfeljebb 2–4 szó) |
| szó keresése a szövegben meghatározás alapján | `text` / `stems`, engedékeny | egy szó a szövegből |
| bekezdés összefoglalásának kiválasztása (A–D) | `choice` / `inline` | a választás a bekezdés előtt áll |
| párosítás hallás után | `bank` / `stems` | betűjeles lista és számozott tételek |
| táblázat kitöltése hallás után | `text` | a táblázat sorai „ \| ” jellel elválasztva vagy állításonként |
| igaz / hamis / nem tudjuk (T/F/DK) | `choice` / `stems` | 2005-ös középszintű lapok; az opciók kulcsa `T`, `F`, `DK` |

**A kulcsok átnézésének eredménye (2026-11-24).** A rövid válaszos és a jegyzetkiegészítős hallásfeladatok 35 kulcsából 29-et sikerült kiolvasni; négy lapé táblázatos elrendezés miatt nem jött ki gépileg (2005. május közép V30, 2015. május közép, 2017. október közép, 2019. május közép), egyé hiányzik (2019. május emelt), egy találat téves volt. A kulcsok három csoportba esnek:

| Csoport | Jellemző | Példa a kulcsból | Kb. hány | Javíthatóság |
|---|---|---|---|---|
| Zárt | egy szó, szám vagy név, kevés alternatívával | `1776`, `leather`, `3 / three hours` | 16 | a meglévő `text` mód elég |
| Kulcsszavas | rövid kifejezés; a zárójeles rész elhagyható, a többi kötelező | `(right) ear(drum)`, `(At / Outside) a (Manhattan) police station` | 10 | új javítási mód kell: a válasz jó, ha a kötelező szavak szerepelnek benne |
| Tartalmi | több, egymástól eltérő megfogalmazás is jó; az útmutató szerint azt kell nézni, hogy „megfelelő választ adott-e a tanuló" | `fell to the ground / floor // fainted`; `was honest // refused to sell bad whiskey // he only sold the best` | 3 (2005. május emelt, 2006. február emelt, 2009. október emelt) | géppel nem megbízható |

A csoportok darabszáma becslés a kulcsok alapján, nem itemenkénti besorolás.

A kulcsszavas mód korlátai: a kötelező szavakat a nyomtatott útmutató vastag betűvel jelöli, ami a kinyert szövegben nem látszik, ezért digitalizáláskor a PDF-et kell nézni; és a mód elfogadhat olyan választ, amelyben a kulcsszó szerepel, de a mondat mást állít. Ezért a kulcsszavas feladatoknál a diáknak az eredmény mellett a teljes kulcsot is meg kell mutatni.

### 3.4 Adatformátum

Feladatsoronként egy JSON-fájl a `tartalom/` mappában, `<év>-<időszak>-<szint>.json` néven (pl. `2024-maj-emelt.json`). Két kész minta van: `2024-maj-kozep.json` és `2024-maj-emelt.json`. Ezek a formátum hiteles példái.

Feladatsor:

| Mező | Tartalom |
|---|---|
| `formatVersion` | jelenleg `1` |
| `id`, `year`, `session`, `level`, `examDate`, `code` | azonosítók |
| `sourceFiles` | a feladatlap, az útmutató és a hang elérési útja |
| `sections[]` | `reading`, `language`, `listening` |

Vizsgarész (`sections[]`): `id`, `title`, `minutes`, `maxTaskPoints`, `maxExamPoints`, `conversion` (a hivatalos feladatpont–vizsgapont tábla), `tasks[]`.

Feladat (`tasks[]`):

| Mező | Tartalom |
|---|---|
| `id` | `<feladatsor>-<R\|L\|H><sorszám>`, pl. `2024-maj-emelt-L4` |
| `number`, `points` | sorszám a részen belül; a pontszám megegyezik a nem példa itemek számával |
| `kind` | `bank`, `choice`, `multi`, `text`, `lines`, `fix`, `order` |
| `layout` | `inline` (hézagok a szövegben), `stems` (állítások a szöveg után), `lines` |
| `examType` | a vizsgatípus magyar neve; ez a statisztika csoportosításának alapja |
| `instructions[]` | a feladat utasítása angolul, a papírra utaló részek nélkül |
| `title`, `source` | a szöveg címe és az útmutatóban megadott eredeti forrás |
| `body[]` | bekezdések; a hézag helye `{{9}}` |
| `bank[]` | `bank` típusnál a választható elemek (`key`, `text`) |
| `options[]` | `choice` típusnál a közös opciók, ha minden itemnél ugyanazok |
| `grading` | `text` típusnál: `spelling` = `strict` vagy `lenient` |
| `audio` | hallásnál: `file`, `start`, `end` (másodperc a forrásfájlban; `null`, amíg nincs meghallgatott vágás), `clip` (a kivágott fájl) |
| `items[]` | a kérdések |

Item (`items[]`): `n` (sorszám, a példánál `0`), `example` (a példa nem pontozott), valamint típustól függően `answer` (betűjel, `multi` típusnál betűjelek listája, `lines` típusnál a felesleges szó vagy `null`), `accept[]` (elfogadott válaszok), `gaps[][]` és `unordered` (több mezős beírás), `stem`, `prompt` (szóképzés alapszava), `options[]` (itemenkénti opciók), `text` (`lines` típusnál a sor), `note` (ellenőrizendő megjegyzés).

A szerkezetet az `eszkozok/validate.js` ellenőrzi.

A gépi kinyerés további mezői:

| Mező | Hol | Tartalom |
|---|---|---|
| `partial` | feladatsor | `true`, ha a lap egy vagy több feladata hiányzik |
| `pending[]` | vizsgarész | a kézi feldolgozásra váró feladatok: sorszám, pontszám, típus, ok |
| `omitted[]` | vizsgarész | a döntés szerint kimaradó feladatok (mondatátalakítás) |
| `originalMaxTaskPoints` | vizsgarész | a rész eredeti összpontszáma, ha feladat hiányzik belőle; ilyenkor `conversion` nincs |
| `note` | feladat, item, vizsgarész | ellenőrizendő megjegyzés a gépi kinyerésből |
| `key`, `keywords[][]` | item | kulcsszavas javításnál a teljes kulcs és a kötelező szavak változatai |
| `stemLead` | feladat | az állítások közös bevezető sora (pl. „If you decide to do this charity work during your holiday, you …”) |
| `bankLead` | feladat | a listaelemek közös bevezető sora (pl. „This letter”) |
| `combos[][]` | item (`text`, két mező) | az együtt elfogadott mezőpárok; ha megvan, csak ezek jók |
| `alt[]` | item (`lines`, `bank`, `choice`) | további elfogadott megoldás, ha a kulcs kettőt enged: `lines`-nál a másik felesleges szó, `bank`-nál és `choice`-nál a másik betűjel (`D / K`) |
| `outro` | feladat (`lines`) | a számozott sorok utáni szövegvég |
| `group` | item | azonos csoportjelű itemeknél a kulcs ugyanazt a válaszkészletet adja, de a válaszoknak különbözniük kell (2005. május emelt, hallás 3.) |
| `groupKey` | item | a `group` kiegészítése: az elfogadott válaszok jelentése (`{"blue eyes": "blue", "blue-eyed": "blue", …}`); a válaszoknak jelentésben kell különbözniük, nem csak alakban (2005. május emelt, hallás 3., 27–28.) |
| `omitted[].reason` | vizsgarész | a kimaradás oka |

**A két utóbb megvalósított típus formátuma** (az ellenőrző és a prototípus is ismeri; 5–5 feladat van belőlük):

`fix` – hibás szó javítása hallás után. Itemenként egy mondat, amelyben egy szó nem egyezik az elhangzottal.

```json
{"n": 8, "text": "The basic price is $22 for large dogs.", "fixes": [{"wrong": "$22", "accept": ["62", "$62"]}, {"wrong": "large", "accept": ["small", "smaller"]}]}
```

A `fixes` egy vagy több lehetséges javítás (a kulcs néhol kétféle javítást is elfogad). A `wrong` a mondat hibás szava kisbetűvel, írásjelek nélkül; az `accept` az elfogadott helyes szavak. A javítás szabálya a 3.5 pontban van.

`order` – összekevert szavak mondattá rendezése. A megadott első szó rögzített.

```json
{"n": 1, "first": "Which", "words": ["city", "of", "is", "Australia", "capital", "the"], "end": "?", "accept": [["city", "is", "the", "capital", "of", "Australia"], ["is", "the", "capital", "city", "of", "Australia"]]}
```

A `words` a feladatlap szerinti sorrendben áll (az első szó nélkül), az `end` a mondatvégi írásjel; az `accept` egy vagy több helyes sorrend. A pont teljes egyezésre jár.

Kulcsszavas javítás – `text` típusú feladat `grading.spelling: "keywords"` beállítással. Az item elfogadott változatai kötelező szavak listái, a `key` a diáknak megmutatott teljes kulcs.

```json
{"n": 22, "stem": "Where did she hand herself in?", "keywords": [["police", "station"]], "key": "(At / Outside) a (Manhattan) police station.", "maxWords": 5}
```

A `fix` és az `order` példája valódi vizsgaitem (2011. október közép, hallás 1.; 2005. május közép, nyelvhelyesség 1.); a kulcsszavas példa csak a formátumot szemlélteti.

### 3.5 Javítási szabályok

A hivatalos útmutatót követjük.

- **Betűjeles válaszok:** pontos egyezés. Több beírt válasz esetén nem jár pont; a felület eleve csak egyet enged.
- **Kettős választás:** a kijelölt halmaznak pontosan egyeznie kell.
- **Nyelvhelyesség, beírás (`strict`):** a helyesírási vagy nyelvtani hiba hiba. Kis- és nagybetű, valamint a szóközök a szélén nem számítanak.
- **Hallásértés, beírás (`lenient`):** a helyesírási hiba csak akkor számít, ha akadályozza az érthetőséget. Megvalósítás: öt betűnél hosszabb szónál egy betű eltérés elfogadott, és a hiányzó vagy fölös `-s` végződés is. Az elírással elfogadott választ a felület jelzi.
- **Ismert korlát:** az engedékeny mód elvétve átengedhet egy másik értelmes angol szót, amit az útmutató hibának venne. Ha ez a gyakorlatban gondot okoz, itemenkénti tiltólista kell.
- **Hallásértés, kulcsszavas (`keywords`):** az item elfogadott változatai kötelező szavak listái; a válasz jó, ha valamelyik változat minden kötelező szava szerepel benne (az engedékeny mód helyesírási tűrésével). A sorrend nem számít; a válaszban az írásjelek és a perjel szóhatárnak számítanak (így a 20/09/1932 a 20, 09 és 1932 szavakat adja). A kulcsban zárójelben álló részek nem kötelezők. Ha az utasítás szószámkorlátot ad, a hosszabb válasz hibás. A diák az eredmény mellett a teljes kulcsot is látja, mert ez a mód elfogadhat olyan választ, amelyben a kulcsszó szerepel, de a mondat mást állít.
- **Több mezős beírás:** a pont csak akkor jár, ha minden mező jó. Ahol a kulcs jelzi, a sorrend felcserélhető (`unordered`).
- **Soronkénti hibakeresés:** helyes sornál a „sor helyes" jelölés, hibás sornál a felesleges szó kijelölése a jó válasz.
- **Hibás szó javítása (`fix`):** mind az öt érintett útmutató kimondja, hogy a pont akkor is jár, ha a vizsgázó a hibás szót nem húzta át, de a vonalra a helyes szót írta. Ezért a pont a beírt helyes szóért jár (engedékeny helyesírással). Ha a diák szót is megjelölt, annak a kulcs szerinti hibás szónak kell lennie; ha mást jelölt meg, nem jár pont.
- **Szórendezés (`order`):** a teljes sorrendnek egyeznie kell a kulcs valamelyik változatával.
- **Kulcsszavas javítás, számok és pénzösszegek:** az ezres tagolás nem számít (`30,000` = `30000`); a pénznem jele a pénznem nevével egyenértékű (`$120 billion` = `120 billion dollars`), de a pénznem nem hagyható el, mert az útmutató a puszta számot nem fogadja el. Szám és mértékegység együtt kötelező (`30/thirty pounds`: a `30` önmagában kevés). Egytől húszig a szám betűvel írva is elfogadott.
- **Zárójel és perjel a kulcsban:** a zárójeles rész elhagyható (`(water) taxis` = `water taxis` vagy `taxis`); ha a zárójelben perjellel elválasztott szavak állnak a válasz után (`bathtub (bath/tub)`), azok önálló változatok. A `//` teljes válaszokat választ el. A szóközökkel körülvett `/` szintén teljes válaszokat választ el (`have taken / took / have brought`), és ezeket nem szorozzuk össze egymással; ha azonban egy több szavas változat után egy-egy szó áll, az az utolsó szavát is válthatja (`wrote novels / books / fiction` → `wrote books`), és a több szavas változat elé írt egyetlen szó az első szavát (`26 / twenty-six grams` → `26 grams`); a számjegyes alak a betűvel írt szám egészét váltja (`800 / eight hundred pounds` → `800 pounds`, nem `800 hundred pounds`). A szóköz nélküli `/` szót vált (`a grey/gray suit`); mivel teljes válaszokat is elválaszthat, a csonka olvasat (`a grey`) is elfogadott marad. Nyelvhelyességnél a vesszővel felsorolt egyszavas megoldások külön változatok (`improving, improved`).
- **Számok betűvel:** ahol a helyesírás nem szigorú (hallás, olvasás), a betűvel írt szám a számjegyes alakkal egyenértékű, bármekkora számra és évszámra is (`twelve thousand five hundred` = `12,500`, `nineteen ninety-four` = `1994`, `sixty-two` = `62`). A javító a diák válaszát és a kulcsot egyaránt számjegyre alakítja; ezt a kulcs nem sorolja fel külön.
- **Összetartozó párok két mezőnél:** ha a kulcs két teljes, kétszavas megoldást ad (`armed guards // security agents`), a két mező csak a megadott párokkal jó (`armed agents` nem). Ezt az item `combos` listája tárolja; ha nincs ilyen, a mezők egymástól függetlenek.
- **Két sorba tört válaszvonal:** ha két szomszédos pontsorhoz a kulcs nem kétszavas válaszokat ad (`injured/hurt/damaged his knee`), a két sor egyetlen mező.
- **Soronkénti hibakeresés két jó szóval:** ahol a kulcs két szó bármelyikének törlését elfogadja (`one / that`), a második az item `alt` listájában áll.
- **Szószámkorlát kulcsszavas feladatnál:** ha az utasítás korlátot ad (`maximum two words`, `no more than three words`, `one or two words`), a kinyerő a `grading.maxWords` mezőbe írja, és a hosszabb válasz hibás. Egyetlen itemre az item `maxWords` mezője adhat korlátot.
- **Szóhoz tapadt zárójel a kulcsszavas kulcsban:** `(tele)phone`, `ear(drum)`: a rövid és a teljes alak is külön változat. A `consultation/s` alak a `consultation` és a `consultations` szót jelenti.
- **Az útmutató által kimondott szöveghiba:** ha az útmutató a feladatlap hibája miatt minden vizsgázónak megadja a pontot, és közli a helyes alakot, nálunk a javított szöveg szerepel, és a kérdés a szokásos módon pontozódik (11. fejezet, 15. döntés).
- **Azonos válaszkészletű itemek (`group`):** bármelyik sorrend jó, de ugyanaz a válasz kétszer nem ér pontot. Ha az itemnek `groupKey` mezője van, az összevetés a válasz jelentése szerint történik (az elírással elfogadott válasz annak az elfogadott alaknak a jelentését kapja, amelyhez illeszkedett).

### 3.6 Digitalizálás menete

1. Gépi kinyerés: az `eszkozok/kinyer.js` a feladatlap nyers szövegéből (`pdftotext -raw`; a bekezdéshatárokhoz és a táblázatos kulcsokhoz a `-layout` kimenetből) és az útmutató kulcsából építi fel a JSON-t.
2. Amit a PDF szövegéből nem lehet gépileg kiolvasni (összekeveredett hasábok sorrendje, a kulcsból hiányzó adat, egyedi feladatok), azt az `eszkozok/kezi.js` feladatonkénti kiegészítései pótolják. Jelenleg 157 feladathoz tartozik ilyen. A `tartalom/` fájljait kézzel nem szerkesztjük, így bármikor újra előállíthatók.
3. Gépi ellenőrzés: `node eszkozok/validate.js`.
4. Emberi átolvasás a PDF-fel szemben. A két oszlopos elrendezésű feladatoknál (szóbank, félmondatok, feleletválasztós táblázat) a kinyert szöveg rendszeresen összekeveredik; ezeket mindig kézzel kell összevetni.

Két dolog nem olvasható ki gépileg, és kézi ellenőrzést igényel: a hallásértés kettős választásos feladatainál a példa megoldása (bekarikázás), és az illusztrációk.

### 3.7 Hanganyag

- A forrás soronként egy kb. 30 perces mp3, amely mindhárom hallásfeladatot tartalmazza zenével, utasítással, szünetekkel és kétszeri lejátszással.
- Feldolgozás: feladatonkénti szétvágás és átkódolás beszédre elég minőségre (mono, 48–64 kbps). Várható méret feladatonként 3–4 MB, összesen kb. 1 GB.
- Vágás (döntés, 2026-11-24): automatikus felismerés ffmpeggel, utána minden vágási pont emberi belehallgatással ellenőrizve. Eszköz: `eszkozok/hangvagas.js`.
- A felismerés elve: minden feladat zenével indul, ezt felolvasott utasítás, majd egy hosszú csend követi (a feladat tanulmányozása), utána jön a teljes lejátszás. A script ezt a csendet keresi (legalább 20 mp, utána legalább 100 mp megszakítás nélküli lejátszás), és a 2. és 3. feladat kezdetét az előző feladat végi csend végéhez teszi.
- **Az 1. feladat a fájl elejétől indul, az általános bevezetővel együtt** („Welcome to the Listening component…", kb. másfél perc). A bevezető vége és a feladat zenéje között nincs felismerhető szünet; az első próbánál a vágás a magyarázat végébe vágott bele.
- Próba (2026-11-24) a 91 vizsgahangon:

| Eredmény | Fájlok |
|---|---|
| három feladat, hihető hosszakkal (6,8–13,3 perc) | 82 |
| nem három feladatot talált, kézi időpont kell | 9: 2005. ősz (közép, emelt), 2006. május (közép, emelt), 2007. május közép, 2007. október emelt, 2008. május emelt, 2009. május közép, 2010. október emelt |

- **Meghallgatás:** a megrendelő a prototípus `/hang` oldalán laponként meghallgatja a két vágási pontot, és jónak vagy hibásnak jelöli. A jelölések az `eszkozok/hangellenorzes.json` fájlba kerülnek (2026-11-25 előtt a böngészőben tárolódtak; a 11-24-i jelölések így elvesztek, a meghallgatás 11-25-én újraindult).
- A jó vágás bevitele: a `hangvagas.js` minden sikeres felismerésnél rögzíti a pontokat az `eszkozok/hangpontok.json` fájlban; a `kinyer.js` csak a jónak jelölt lapoknál írja be az `audio.start`, `audio.end` és `audio.clip` mezőt. Utána a szokásos újrakinyerés és átvétel következik (`kinyer-mind.js`, `atvesz.js`). A két kézi mintát az átvétel nem írja felül, ezért ott a mezőket közvetlenül kell kitölteni.
- Állás (2026-11-25): a megrendelő mind a 82 felismert lap vágását meghallgatta, mind jó; a tartalomba bekerült (241 hallásfeladat; a többi az 3.3 szerint kimaradó feladat). A 9 fel nem ismert lap kézi pontjai az `eszkozok/hangpontok-kezi.json` fájlban vannak (ugyanazzal a szabállyal számolva: a tanulmányozási csend előtti utolsó, legalább 5 mp-es szünet vége); a `hangvagas.js` ezekkel vág, ha a felismerés nem ad három feladatot. A 2005. őszi középszintű 3. feladatánál két jelölt volt (983,5 és 1209,6 mp); az első a jó. **Mind a 91 lap vágása meghallgatva, jó, és bekerült a tartalomba (2026-11-25): 268 hallásfeladat, mindegyik `audio.start`, `audio.end` és `audio.clip` mezővel.** A 2021. május közép 3. feladata egy rövid püttyögéssel indul a zene helyett; meghallgatva ez a lap része, a vágás jó.
- Ahol a felismerés nem megy, kézi időpontmegadás kell (laponként két időpont: a 2. és a 3. feladat kezdete).
- Mért méret: a 2024. májusi középszintű sor három feladata 4,1 + 2,6 + 3,5 MB (mono, 24 kHz, 48 kbps); a teljes anyag ezzel kb. 0,9 GB.
- A JSON-ban az `audio.start` és `audio.end` a forrásfájlon belüli időpont másodpercben, az `audio.clip` a kivágott fájl.
- Tárolás: Cloudflare R2, tekerhető lejátszással.

Hangmódok, a kiosztás beállításaként:

| Mód | Diák eszköze | Tanár eszköze |
|---|---|---|
| A tanár játssza le | nincs lejátszó, csak jelzés | lejátszó az élő nézetben |
| A diák hallgatja | lejátszó a feladat tetején, görgetés közben is látszik | nincs teendő |

---

## 4. Funkciók

### 4.1 Diák

1. Megnyitja a linket vagy beolvassa a QR-kódot.
2. Látja, mit kapott (rész, szint, feladat, kérdésszám), és beír egy becenevet.
3. Kitölti a feladatot. Az utasítás összecsukható, a kitöltöttség folyamatosan látszik.
4. Beküldi. Üres válaszoknál megerősítést kér.
5. Látja a pontszámát. A helyes megoldásokat a kiosztás beállítása szerint azonnal vagy a lezárás után.

Több feladatból álló kiosztásnál a feladatok egymás után jönnek, a diák szabadon léphet előre és vissza, a beküldés a végén egyszer történik.

**Visszatérés a megoldáshoz.** Ha a megoldás csak lezárás után látható, a diák a beküldés után a pontszámát látja és azt, hogy a megoldás később nyílik meg. Ugyanazt a linket ugyanarról az eszközről újra megnyitva a rendszer az eszközazonosító alapján felismeri a beküldését, és lezárás után megmutatja a megoldásokat. Másik eszközről vagy törölt böngészőadatokkal a saját válaszai nem érhetők el; ilyenkor lezárt kiosztásnál csak a feladat és a kulcs látszik.

**Újrakitöltés.** Ugyanarról az eszközről a kiosztás újra kitölthető, amíg nyitva van; ezek a beküldések gyakorlásnak számítanak, a statisztikába nem.

**Megszakadt kitöltés.** A válaszok a beküldésig az eszközön tárolódnak; az oldal újratöltése után a diák ott folytatja, ahol abbahagyta.

### 4.2 Tanár

- **Regisztráció és belépés:** Google-fiókkal, vagy e-mail-címmel és jelszóval; elfelejtett jelszó visszaállítása e-mailben.
- **Csoportok:** létrehozás, átnevezés, archiválás. Egy csoport: név és szint. Diáklista nincs.
- **Feladattár:** szűrés szint, vizsgarész, feladattípus és év szerint; előnézet; jelzés, ha a kiválasztott csoport már megoldotta a feladatot.
- **Kiosztás:** egy vagy több feladat, csoport, hangmód, a megoldás láthatósága.
- **Megosztás:** rövid kód, link és QR-kód, kivetítésre alkalmas nézetben.
- **Élő nézet:** az érkező beküldések becenévvel és pontszámmal; a nevek kivetítéskor elrejthetők; tanári hanglejátszó.
- **Lezárás:** utána a link nem fogad beküldést, és a diákok megnézhetik a megoldást.

### 4.3 Statisztika

- **Kiosztásonként:** kitöltők száma, átlag, kérdésenkénti helyes arány, és kérdésenként a leggyakoribb rossz válasz.
- **Csoportonként:** átlag vizsgarészenként és feladattípusonként az összes eddigi kiosztás alapján; a leggyengébb típusok kiemelve.
- **Csoportok összevetése** ugyanazon a feladaton.

A statisztikába eszközönként csak az első beküldés számít (lásd 6. fejezet).

---

## 5. Adatmodell

| Tábla | Fő mezők |
|---|---|
| `teachers` | azonosító, e-mail, név; minden regisztrált felhasználó tanár |
| `groups` | tanár, név, szint, archivált |
| `exams` | a feladatsor metaadatai |
| `tasks` | feladatsor, rész, sorszám, `kind`, `exam_type`, pontszám, tartalom (JSON, kulcs nélkül), kulcs (JSON, külön oszlopban), hang |
| `assignments` | tanár, csoport (lehet üres), hangmód, megoldás láthatósága, kód, állapot (nyitva/zárva), időpontok |
| `assignment_tasks` | kiosztás, feladat, sorrend |
| `submissions` | kiosztás, becenév, eszközazonosító, pontszám, beszámít-e a statisztikába, időpont |
| `answers` | beküldés, feladat, item, adott válasz, eredmény (`ok`, `typo`, `bad`) |

A statisztikák az `answers` táblából számolódnak; külön összesítő táblára az első változatban nincs szükség.

---

## 6. Biztonság és adatvédelem

- **A megoldókulcs nem kerülhet a diák eszközére a beküldés előtt.** A diák a feladatot kulcs nélkül kapja, a javítást a szerver végzi. (A prototípusban a kulcs a letöltött fájlban van; ez éles rendszerben nem megengedett.)
- **Diákadat:** csak a becenév és egy véletlen eszközazonosító. A felület kéri, hogy a diák ne a valódi nevét írja be.
- **Eszközazonosító:** a böngészőben tárolt véletlen érték, kizárólag arra, hogy kiosztásonként az első beküldést meg lehessen különböztetni az ismétlésektől. Kiosztások között nem kapcsolja össze a diákot.
- **Hozzáférés:** a tanár csak a saját csoportjait, kiosztásait és eredményeit látja. A diák csak a saját beküldésének eredményét.
- **Törlés:** a tanár törölhet beküldést, kiosztást és csoportot, az eredményekkel együtt.
- **Kódok:** a megosztó kód nem kitalálható sorozat; lezárás után új beküldést nem fogad.
- **Megőrzés:** a beküldések és az eredmények addig maradnak meg, amíg a tanár nem törli őket; automatikus törlés nincs. Fiók törlésekor a tanár minden csoportja, kiosztása és eredménye törlődik.
- **Jelszavak:** a rendszer nem tárol jelszót olvasható formában; a belépést a Supabase beépített szolgáltatása kezeli.

---

## 7. Architektúra

| Réteg | Választás | Miért |
|---|---|---|
| Felület | React, TypeScript, Vite; statikus oldalként | egyszerű üzemeltetés, mobilon gyors |
| Kiszolgálás | Cloudflare Pages | ingyenes, gyors |
| Adatbázis, belépés, élő frissítés | Supabase (Postgres) | a statisztika SQL-ben egyszerű; tanári belépés készen van |
| Javítás | szerveroldali függvény a Supabase-ben | a kulcs nem hagyja el a szervert |
| Hang | Cloudflare R2 | a letöltési forgalomért nem számít fel díjat |

Cím: `matura.mrandrewshub.com`, a meglévő hub aldomainjeként; külön domaindíj nincs.

Költség: fejlesztés és saját használat alatt az ingyenes csomagok elegendők. A Supabase ingyenes csomagja egy hét tétlenség után leállítja a projektet, és nincs benne automatikus mentés; fizető felhasználók megjelenésekor érdemes a fizetős csomagra váltani (a tervezéskor havi 25 dollár; az aktuális árat ellenőrizni kell).

**A kód helye.** A kód külön mappába és külön GitHub-tárolóba kerül (javasolt név: `matura`), nem a forrásanyag mellé. A forrásanyag (PDF, mp3) nem megy verziókezelésbe. A tárolóba kerül: az app kódja, az adatbázis-séma és a szerveroldali függvények, a `tartalom/` JSON-fájljai, az `eszkozok/` scriptjei, a `SPEC.md` és a `CLAUDE.md`. A kivágott hangfájlok a Cloudflare R2-be töltődnek fel, a tárolóba nem.

Javasolt szerkezet:

| Mappa | Tartalom |
|---|---|
| `app/` | a felület (React, TypeScript, Vite) |
| `supabase/` | adatbázis-séma, jogosultsági szabályok, a javítást végző függvény |
| `tartalom/` | a digitalizált feladatsorok |
| `eszkozok/` | ellenőrző, hangvágó és feltöltő scriptek |

**Amit a megrendelő hoz létre** (fiókot a fejlesztő nem nyithat helyette): Supabase-projekt; a Cloudflare-fiókban egy Pages-projekt és egy R2-tároló; egy üres GitHub-tároló; a `matura` aldomain bekötése a `mrandrewshub.com` DNS-ében; a Google-belépéshez egy Google Cloud OAuth-azonosító.

**Állás (2026-11-25):**

| Elem | Állapot |
|---|---|
| Supabase-projekt | kész: ref `fjhwqynnlgjpjsfxncbj`, West EU (Ireland, eu-west-1), Free/Nano, a „MrAndrew's Hub” szervezetben; üres (nincs tábla, migráció). A neve a fiók e-mail-címe, átnevezhető `matura`-ra. |
| Cloudflare R2 | kész: `matura-hang` tároló, automatikus helyszín (Kelet-Európa), Standard; nem nyilvános, üres |
| Cloudflare Pages | kész: `matura` projekt (`matura-7r4.pages.dev`), a `mistagee83/matura` tárolóból; a `main` ág minden commitja automatikusan épül (a megrendelő megadta a GitHub-alkalmazásnak a hozzáférést; kipróbálva) |
| Aldomain | kész: `matura.mrandrewshub.com` (2026-11-25) |
| Supabase-tartalom | séma, 949 feladat, `submit` függvény élesítve és kipróbálva; próbakiosztások: MINTA24K, MINTA24E. 2. szakasz (2026-11-25): tanárok, csoportok, tanári jogosultsági szabályok és a kiosztás létrehozása élesítve; két tanárfiókkal kipróbálva |
| Supabase Auth | megerősítő levél nélküli regisztráció; Site URL és átirányítási címek beállítva (2026-11-25); saját levélküldő (Resend) és Google-szolgáltató még nincs |
| GitHub-tároló | kész: `mistagee83/matura`, helyben `D:\dev\matura`; az 1. szakasz kódja feltöltve a `main` ágra (2026-11-25); az adatbázisba és a Pages-re még nincs telepítve |
| Google OAuth-azonosító | még nincs |

A javítási logika a prototípusban (`prototipus/index.html`, `check` és `match` függvény) működő kiindulópont, de szerveroldalra kell átültetni.

---

## 8. Dizájn

Képernyőtervek: https://claude.ai/artifact/WZRsfroHhRzZ7zhB55UggB (privát vászon; 12 képernyő).

### 8.1 Arculat

- **Név:** Matura. A hubon belül „Mr. Andrew's Matura".
- **Alap:** a Mr. Andrew's EdTech Hub dizájnrendszere (https://claude.ai/artifact/WPBbsdGrdWrasfGQ2SaBEq). Táblazöld, krétasárga, korall; iskolai tábla hangulat.
- **Cím:** `matura.mrandrewshub.com` (a hub aldomainje). A megosztó link formája: `matura.mrandrewshub.com/k/<kód>`.

### 8.2 Színek

| Szerep | Érték |
|---|---|
| Márka, fejléc (`board-green`) | `#23423A` |
| Fő szöveg világos háttéren (`deep-green`) | `#17302A` |
| Fő gomb, kiemelés sötét háttéren (`yellow`) | `#F2C14E` |
| Oldalháttér (`cream`) | `#FBF6EA` |
| Kártya (`white`), kártyakeret (`sand`) | `#FFFFFF`, `#E8DFC8` |
| Másodlagos szöveg (`muted`) | `#4E5F59` |
| Kitöltött hézag, kijelölés | `#D9F0EA` háttér, `#1F5C4F` tinta |
| Helyes | `#DDF1E6` háttér, `#1E6B4C` tinta |
| Hibás | `#F9DCDA` háttér, `#8C2A26` tinta |
| Figyelmeztető sáv | `#FBE9C8` háttér, `#7A4E08` tinta |
| Nehéz kérdés a statisztikában | `#FCE3DE` háttér, `#D9573F` sáv, `#8F3A2D` tinta |

A teljes paletta és a használati szabályok a dizájnrendszerben vannak; eltérés esetén az az irányadó.

### 8.3 Betűk

| Szerep | Betűtípus |
|---|---|
| Címsor, pontszám, kártyacím | Fredoka 600 |
| Felületi szöveg, gomb, címke | Shantell Sans 400 és 600 |
| Címsoronként legfeljebb egy kiemelt szó | Caveat Brush |
| **Vizsgaszöveg** (olvasmány, állítások, válaszlehetőségek, a diák beírt válasza) | **Atkinson Hyperlegible** |

A vizsgaszöveg semleges betűje tudatos eltérés a hub rendszerétől: egy emelt szintű olvasmány 400–500 szó, ezt telefonon kézírásos betűvel végigolvasni megterhelő. A vizsgaszöveg mérete telefonon legalább 17 px, sorköze legalább 1,6.

### 8.4 Formák és szabályok

- Gomb és címke pirula alakú; kártya sarka 14 px, nagy felület 22 px.
- Árnyék és színátmenet nincs; a kártyát vékony keret választja el.
- Nézetenként egy sárga gomb, a legfontosabb művelethez.
- Ikonok: vékony körvonalas, egyszínű. Emoji és felkiáltójel nincs a felületi szövegben.
- Koppintható elem legalább 44 px magas.
- A helyes és a hibás válasz nem csak színben tér el: pipa és kereszt is jelzi.

### 8.5 Nyelv és hang

- A felület magyar (tudatos eltérés a hub angol nyelvű szabályától). A vizsgaszöveg és a feladat utasítása angol, változtatás nélkül.
- Tegeződő, rövid, konkrét mondatok. A gomb igével kezd, és megmondja, mi történik: „Kezdem a feladatot", „Beküldöm", „Kiosztom és megosztom".

### 8.6 Képernyők

Diák, telefonra tervezve (390 px széles alapméret):

1. Belépés
2. Feladat (szöveg hézagokkal, állítások, beírás, soronkénti hibakeresés)
3. Választólap (alulról felnyíló lista)
4. Hallásfeladat (mindkét hangmódban)
5. Eredmény

Tanár, asztali nézetre és kivetítőre tervezve; telefonon használhatónak kell lennie, de nem arra optimalizált:

1. Kezdőlap (csoportok, legutóbbi kiosztások)
2. Feladattár és kiosztás
3. Megosztás és élő nézet
4. Statisztika

A fenti kilenc képernyő meg van rajzolva, a megrendelő jóváhagyta (2026-11-24). A következők nincsenek megrajzolva; ugyanabból az elemkészletből építendők:

| Képernyő | Leírás |
|---|---|
| Beírós feladat | a mező a szövegben vagy a mondatban áll, a hézag sorszámával; szóképzésnél mellette a zárójeles alapszó; a mező kerete a kitöltött hézag színeit kapja; a billentyűzet ne javítson és ne írjon nagybetűt automatikusan |
| Soronkénti hibakeresés | soronként egy kártya: a sor szavai egyenként koppinthatók, a kijelölt szó áthúzva és hibaszínnel jelenik meg; alatta „A sor helyes" gomb; egy sorban egyszerre egy jelölés lehet |
| Hibás szó javítása | mint a soronkénti hibakeresés, de a szó kijelölése után a kártyán megjelenik egy beviteli mező a helyes szónak |
| Szavak sorba rendezése | felül a készülő mondat a rögzített első szóval, alatta a szavak pirula alakú gombokként; koppintásra a szó a mondat végére kerül, a mondatban lévő szóra koppintva visszakerül |
| Több feladatból álló kiosztás | a fejlécben „2 / 3 feladat" jelzés; a láblécben „Előző" és „Következő", az utolsó feladatnál „Beküldöm"; beküldés előtt összesítő a feladatonként üresen hagyott kérdésekről |
| Eredmény, ha a megoldás még zárt | pontszám és rövid visszajelzés; a válaszlista helyett figyelmeztető sáv: a megoldásokat a tanár a lezárás után nyitja meg |
| Lezárt kiosztás új belépőnek | a belépés helyén közlés, hogy a feladat lezárult; becenévmező és gomb nincs |
| Érvénytelen kód | rövid közlés és egy mező a kód újbóli beírásához |
| Tanári belépés és regisztráció | zöld háttér, középen fehér kártya: „Belépés Google-fiókkal" gomb, alatta e-mail és jelszó; váltás belépés és regisztráció között; elfelejtett jelszó |
| Csoportkezelés | a kezdőlap csoportkártyáján menü: átnevezés, szint módosítása, archiválás, törlés; új csoportnál név és szint |
| Kiosztás részletei | a kiosztás feladatai, beállításai, kódja; innen nyitható újra a megosztó nézet, zárható le a kiosztás, és törölhető egy-egy beküldés |
| Üres állapotok | új tanárnál a kezdőlapon egy mondat és a „Feladat kiosztása" gomb; beküldés nélküli kiosztásnál a statisztika helyén közlés |
| Betöltés és hiba | betöltéskor a kártyák helyén halvány sávok; hálózati hibánál a válaszok megmaradnak, és a „Beküldöm" gomb újrapróbálható |

---

## 9. Nem funkcionális követelmények

- **Mobil az elsődleges a diákoldalon:** 360 px szélességtől működik, vízszintes görgetés nélkül.
- **Gyenge hálózat:** a feladat betöltése után a kitöltés nem igényel kapcsolatot; a válaszok a beküldésig az eszközön maradnak, és véletlen újratöltés után sem vesznek el.
- **Egyszerre egy osztály:** 35 egyidejű diák zökkenőmentes kiszolgálása, hanggal együtt.
- **Akadálymentesség:** szövegkontraszt legalább 4,5:1; billentyűzettel kezelhető; a beviteli mezőknek címkéjük van.
- **Böngészők:** az utolsó két év Chrome, Safari, Firefox és Samsung Internet változatai.

---

## 10. Ütemezés és elfogadás

A tervezés lezárult. A fejlesztés akkor indul, amikor a megrendelő létrehozta a 7. fejezetben felsorolt fiókokat és projekteket.

### Tartalom

Döntés (2026-11-24): az indulás előtt a teljes állományt (91 lap) digitalizálni kell; az ellenőrzés szúrópróbaszerű.

- Sorrend: a legújabb vizsgáktól visszafelé, mert azok a leghasznosabbak és a formátumuk a legegységesebb.
- Minden lapon lefut a gépi ellenőrzés; hibás fájl nem kerül be.
- Szúrópróba: laponként legalább egy feladatot a megrendelő vagy egy kolléga összevet a PDF-fel és a kulccsal. A két oszlopos elrendezésű feladatoknál (szóbank, félmondatok, feleletválasztós táblázat) és a kulcsszavas feladatoknál a hiba esélye nagyobb, a szúrópróba ezeket részesítse előnyben.
- A hang vágási pontjait laponként meg kell hallgatni; kilenc lapnál kézi időpont kell (3.7).
- Ami digitalizálás közben nem dönthető el gépileg (nem olvasható példaválasz, vastag betűs kulcsszó), az a fájlban `note` mezőt kap, és a szúrópróba ezeket mind megnézi.

**Módszer és állás (2026-11-24).** A digitalizálás gépi: az `eszkozok/kinyer.js` a PDF-ek nyers szövegéből és az útmutató kulcsából állítja elő a JSON-t. A két kézzel készült mintasoron a kimenete tartalmilag egyezik a kézi változattal (az egyetlen eltérés a hallás 1. feladat példaválasza, amely a PDF-ből nem olvasható ki); a kézi változatban egy elírást is feltárt.

Mind a 91 lap teljes: a `tartalom/` mappában 949 feladat és 7856 pontozott kérdés van, kézi feldolgozásra váró feladat nincs. Hét feladat a döntések szerint kimarad (3.3). Két lap kézzel készült (2024. május közép és emelt), a többi 89 gépi.

| Beviteli mód (`kind`) | Feladat |
|---|---|
| `text` (beírás) | 293 |
| `choice` (egy választás) | 278 |
| `bank` (választás listából) | 263 |
| `multi` (kettős választás) | 59 |
| `lines` (soronkénti hibakeresés) | 46 |
| `fix` (hibás szó javítása) | 5 |
| `order` (szórendezés) | 5 |

Gépi ellenőrzés, amely lefutott:

- a szerkezeti ellenőrző (`validate.js`) mind a 91 fájlra hibátlan;
- a prototípusban mind a 949 feladat megjelenik, üres beküldésre 0 pontot, a kulcs szerinti válaszokra teljes pontszámot ad;
- a két kézi mintasorral való összevetés továbbra is egyetlen eltérést ad (a hallás 1. feladat példaválasza).

A második körben (az addig hiányzó 98 feladat feldolgozásakor) a kinyerő javításai a már bent lévő feladatok közül mintegy 145-öt is érintettek. Ezek túlnyomó része javulás: a szövegbe csúszott válaszrubrikák („0) C”) eltűntek, 30 hallásfeladat visszakapta a hiányzó első utasításmondatát, több soronkénti hibakereső feladat példája a helyére került.

Ami nincs ellenőrizve: hogy a kinyert szöveg, a listák és a kulcs valóban egyezik-e a nyomtatott feladatlappal. A 89 gépi lapot ember nem olvasta végig; a második körben feldolgozott mintegy 100 feladatot a gép kimenetén egyenként átnéztem, de nem a PDF képével, hanem annak szövegrétegével vetettem össze. A fájlokban 26 itemszintű `note` megjegyzés jelöli a bizonytalan pontokat; ebből 3 a példaválasz (főként a kettős választásos hallásfeladatoknál, ahol a bekarikázás nem olvasható ki), a többi összetett kulcs, összekeveredett oszlop és a bekezdésekhez sorrend alapján rendelt kérdés. A prototípus feladatonként megmutatja ezeket.

A szúrópróbának elsőként ezeket érdemes megnéznie:

- az `eszkozok/kezi.js`-ben felsorolt 157 feladatot, mert ezeknél kézi beavatkozás kellett (hasábok sorrendje, táblázat, a kulcsból hiányzó hibás szó);
- a 2005–2011-es lapok olvasásfeladatait, mert ezek tördelése a legváltozatosabb;
- a 29 kulcsszavas feladatot (a kötelező szavak köre gépi becslés);
- a `note` megjegyzéssel jelölt itemeket.

Két lapon a PDF maga hibás, ezt a fájl megjegyzése jelzi: a 2005. novemberi emelt olvasás 2. feladatában két olvasói levél vége a feladatlapon is csonka; a 2016. májusi emelt nyelvhelyesség 4. feladatában a PDF szövegrétegéből szóközök hiányoztak, ezeket pótoltam.

További ismert hiányok: a 273 vizsgarészből 14-nél nincs átszámítási tábla (hétnél azért, mert feladat marad ki a részből; a többi hét: 2012. május közép nyelvhelyesség, 2013. május és október közép nyelvhelyesség, 2014. október közép hallás, 2017. május emelt hallás, 2018. május emelt nyelvhelyesség és hallás – ezeknél a tábla még nem jött ki gépileg). Emelt szinten az olvasás és a hallás 30 feladatpontja egyben vizsgapont, ehhez az útmutató nem közöl táblát; ezt a vizsgarész megjegyzése jelzi. A hang vágási időpontjai csak a 2024. májusi középszintű sornál vannak beírva.

**Független ellenőrzés (2026-11-24, lezárult: mind a 91 lap, 949 feladat).** Egy másik eszköz (Codex) a PDF-ek oldalképével is összeveti a feladatsorokat; a jelentései az `ellenorzes/` mappában vannak. Az első öt lap (51 feladat) jelentése 47 eltérést talált, ebből 28 a kulcsot érintette. A többségük rendszerszintű volt, ezért a kinyerőben javítottam, így minden lapon hatnak: a hiányzó átszámítási táblák (130 helyett 14 hiányzik), a zárójeles és perjeles kulcsok értelmezése, a kulcsba csúszott magyar nyelvű magyarázatok, a kitöltött példák felismerése, a lapozási figyelmeztetés a szóbankban, a külön sorban álló példarubrikák. Az egyedi eseteket a `kezi.js` javítja. Két megállapítást nem vettem át, mert a megrendelő döntését igénylik (11. fejezet). Az öt lap jelentése a javítás előtti állapotot írja le. A második kör kilenc újabb lapot (93 feladat) nézett át, és 30 eltérést talált, ebből 21 a kulcsot érintette: a teljes válaszok egymással összeszorzott változatai, a vesszővel felsorolt megoldások egyetlen szövegként, a zárójelben felsorolt önálló változatok, a `$` és `£` jel utáni második hézag kimaradása, a két mezőre rosszul szétosztott kulcsok. Ezek is a kinyerőben lettek javítva, mind a 91 lapra; a javítás összesen 55 feladatot változtatott meg, a még nem ellenőrzött lapokon is. Öt bekarikázott példaválasz az oldalkép alapján került be. A harmadik kör tizenkét újabb lapot nézett át; a megállapításai közül 22 állt fenn: hat bekarikázott és egy teljesen hiányzó példa, hiányzó elfogadott válaszok (`wolf`, `gifted`, `1950s`, a második betűjel a `D / K` kulcsnál), a számjegy és a betűvel írt szám hibás összefűzése (`800 hundred pounds`; ez a kinyerőben lett javítva, és három további lapon is hatott), a megjegyzésben kötelezővé tett pénznem és mértékegység, a „bármely két megoldás elfogadható” kulcsok (2019. május közép, hallás 2.) és három rossz mezőbe került cím. A negyedik kör tizenhárom lapot nézett át (kb. 40 megállapítás): nyolc bekarikázott példa, tizenegy első bekezdéshez tapadt cím vagy alcím, a szóhoz tapadt zárójeles kulcsok (`(tele)phone`, `ear(drum)`), a `consultation/s` típusú többes szám, a kulcsszavas feladatok utasításban megadott szószámkorlátja és a vastagon szedett kötelező tartalmak (2011. május emelt, hallás 2.). Az általánosítható okok a kinyerőben lettek javítva. Az ötödik–kilencedik kör a hátralévő 52 lapot nézte át (ezeket a Codex már parancssorból, adagonként futott, közepes gondolkodási szinten). A jellemző megállapítások: további mintegy ötven bekarikázott példaválasz; a lapon kitöltve álló példamondatok, amelyekhez nem készült példaitem; az első bekezdéshez tapadt alcímek; egy teljesen összekeveredett két hasábos feladat (2014. május emelt, olvasás 1.); a második elfogadott betűjel (`B (also acceptable: C)`, `C / B*`); és – a 2017 utáni hallásfeladatoknál tömegesen – a vastagon szedett kötelező tartalom: a gép hol a teljes mondatot tette kötelezővé, hol egy töredékkel is beérte. Ezek feladatonként a `kezi.js`-ben lettek javítva. **Állás: mind a 91 lap ellenőrizve, összesen mintegy 260 megállapítás; a nyitva maradt kérdések a 11. fejezetben vannak.** A jelentések az írásukkor érvényes állapotot írják le, a bennük szereplő hibák azóta javítva vannak. Amit ez az ellenőrzés nem pótol: a hangvágás meghallgatása, és a megrendelő saját szúrópróbája.

**A megrendelő szúrópróbája (indult 2026-11-25).** A mintát az `eszkozok/szuropoba.js` állítja össze: minden `note` megjegyzéses feladat (39), minden kulcsszavas feladat (29), és ahol egy lapról így nem jut feladat, onnan egy a legkockázatosabbak közül (kézi javítás volt, két oszlopos elrendezés). Összesen 102 feladat, mind a 91 lapról legalább egy. Az ellenőrzés a prototípus `/szuropoba` oldalán megy: feladatonként a feladatlap és az útmutató oldala, a digitális változat kulcs-nézetben, és a jelölés (rendben / hibás + megjegyzés), amely az `eszkozok/szuropoba.json` fájlba kerül. A hibás jelölések javítása a szokásos úton (kinyerő vagy `kezi.js`) történik.

Módosítás (2026-11-25): a megrendelő 4 feladat után a PDF-összevetést túl lassúnak találta; mivel a független ellenőrzés mind a 91 lapot összevetette az oldalképekkel, a megrendelő ellenőrzése a gépileg eldönthetetlen pontokra szűkül. Eszköz: `eszkozok/nyitott.js` → a prototípus `/nyitott` oldala (77 bejegyzés: 27 megjegyzéses kérdés, 29 kulcsszavas feladat a kötelező szavakkal, 21 két oszlopos párosítás a kulcs szerinti mondatokkal), PDF nélkül; a jelölések az `eszkozok/nyitott.json` fájlba kerülnek. A `/szuropoba` oldal megmarad, de nem kötelező.

Módosítás (2026-11-25, később): PDF nélkül a megrendelő nem tud dönteni, ezért a 77 bejegyzést a fejlesztő nézte végig a forrás és a Codex-jelentések mellett; a megrendelő csak a valódi döntéseket kapja. Eredmény:
- a 21 két oszlopos párosítás: a Codex mindet oldalképpel igazolta, a szétválasztás helyes;
- a 27 megjegyzéses kérdés: 24 a kulcs szövege, a javító próbája vagy a Codex oldalképes igazolása alapján rendben (a két 2024-es bekarikázott példa és a 2016. május emelt R1 bekezdés-hozzárendelés is); nyitott marad a 2014. október emelt H2 példája és a szinonimákat is elfogadó kulcsok (2011. május emelt R1);
- a 29 kulcsszavas feladat: a Codex jelzései javítva voltak, de a perjeles kulcsok szétbontása 19 kérdésnél töredéket is elfogadott (pl. a puszta „so”, „body”, „Naomi”) vagy rossz szót kért; ezek a `kezi.js`-ben javítva, a javítóval kipróbálva (2009. május emelt H2, 2010. október emelt H3, 2016. május közép H2, 2019. május emelt H3 és közép H2, 2020. október emelt H3).

A „sorrend nem számít" kulcsok (ellenőrizve 2026-11-25, mind a 91 útmutatóban): 13 feladatnál `unordered` vagy `group` kezeli, a kulcsszavas kérdéseknél a javítás eleve sorrendfüggetlen (2005. ősz, 2023. ősz, 2025. ősz emelt). Egy eltérés volt: 2005. május emelt, hallás 3., 27–28.: az útmutató szerint a két válasznak különbözőnek kell lennie (szőke haj / kék szem), a javító viszont a „has blue eyes" + „is blue-eyed" párt is elfogadta. Javítva a `groupKey` mezővel (`kezi.js`), kipróbálva.

### Fejlesztési szakaszok

| Szakasz | Tartalom | Elfogadva, ha |
|---|---|---|
| 1. Diákoldal | adatbázis; feladat betöltése kulcs nélkül; szerveroldali javítás; a hét beviteli mód (`bank`, `choice`, `multi`, `text`, `lines`, `fix`, `order`); becenév, beküldés, eredmény | a két mintasor minden feladata végig megoldható telefonon (360 px), és a pontszám egyezik a kulccsal; a böngésző hálózati forgalmában a beküldés előtt nem szerepel megoldás; az oldal újratöltése után a válaszok megmaradnak |
| 2. Tanári alap | regisztráció és belépés (Google, e-mail és jelszó); csoportok; feladattár szűrőkkel; kiosztás; link és QR-kód | egy új tanár segítség nélkül regisztrál, csoportot hoz létre, kioszt egy feladatot, és a diák a QR-kóddal eljut a feladathoz; egy tanár nem látja más tanár csoportjait és eredményeit |
| 3. Élő nézet és statisztika | élő frissítés; tanári hanglejátszó; mindkét hangmód; lezárás; kiosztásonkénti statisztika | egy valódi tanóra elejétől a végéig lefut egy osztállyal: a hang a tanár gépéről szól, a beküldések megjelennek, lezárás után a diákok látják a megoldást, a tanár a kérdésenkénti arányokat és a leggyakoribb rossz válaszokat |
| 4. Csoportszintű trendek | típusonkénti és részenkénti átlag; csoportok összevetése | legalább három kiosztás után a csoport oldalán megjelenik a leggyengébb feladattípus, és az egyezik a kézzel kiszámolt értékkel |

A tartalom digitalizálása és a hang feldolgozása az 1. szakasztól párhuzamosan halad. Nyilvános vagy fizetős indulás előtt a jogi kérdést (11. fejezet) le kell zárni.

---

## 11. Döntések és nyitott kérdések

### Lezárt döntések (a megrendelő megerősítette, 2026-11-24)

1. **Többszöri kitöltés:** a statisztikába eszközönként csak az első beküldés számít.
2. **Megoldás láthatósága:** kiosztásonként állítható, alapértelmezés a „lezárás után".
3. **Teljes vizsga mód időméréssel:** az első változatban nincs.
4. **Új elemek a képernyőterveken:** marad a „már megoldották" jelzés a feladattárban és a „nevek elrejtése kivetítéskor" kapcsoló.
5. **Illusztrációk:** nem kerülnek be. Ha digitalizálás közben olyan feladat kerül elő, amely kép nélkül nem oldható meg, azt jelezni kell a megrendelőnek.
6. **Próbaérettségik és mintafeladatsorok:** kimaradnak (3.2).
7. **Régi típusok:** lásd 3.3.
8. **Hangvágás módszere:** a fejlesztőre bízva (3.7).
9. **Regisztráció:** bárki regisztrálhat, aki regisztrál, tanár; diákregisztráció nincs. Első körben tanórai használatra készül.
10. **Belépés:** Google-fiók, valamint e-mail és jelszó.
11. **Tartalom:** a teljes állomány digitalizálva indulás előtt, szúrópróbaszerű ellenőrzéssel (10. fejezet).
12. **Képernyőtervek:** jóváhagyva; a meg nem rajzolt képernyők leírása a 8.6 pontban.
13. **2005. május közép, második feladatsor:** kimarad (3.2).
14. **Név és cím:** Matura, `matura.mrandrewshub.com`.
15. **Az útmutató által kimondott szöveghiba (2026-11-24):** a vizsgaszöveget szó szerint vesszük át, egyetlen kivétellel: ahol a hivatalos útmutató kifejezetten hibásnak nevezi a feladatlap szövegét, és megadja a helyes alakot, ott a javított szöveg kerül be, és a pont a jó válaszért jár (nem mindenkinek, mint a vizsgán). A javítás a `kezi.js`-ben áll, megjegyzéssel az eredeti alakról. Eddig egy ilyen eset van: 2016. május emelt, nyelvhelyesség 1., 1. kérdés (`was stopped; he managed` helyett `was stopped, he managed`). Saját megítélés alapján továbbra sem javítunk szöveget.
16. **Regisztráció megerősítő levél nélkül (2026-11-25):** a tanár regisztráció után azonnal belép. A jelszó-visszaállító levelet saját levélküldő (Resend) küldi, mert a Supabase beépített levélküldője csak a projekt tagjainak ír.
17. **Megosztó kód (2026-11-25):** 6 jel a 0/O és 1/I nélküli 32 jeles ábécéből, kriptográfiai véletlenből (kb. egymilliárd lehetőség); a kiosztást csak a szerveroldali `create_assignment()` hozhatja létre.

### Digitalizálás közben hozott döntések (2026-11-24; a megrendelő megerősítésére várnak)

1. **Hibás szó javítása:** a pont a helyes szóért jár, a hibás szó megjelölése nem feltétele (3.5). Ez eltér a korábbi tervtől („mindkettő jó”), mert az útmutatók így rendelkeznek.
2. **Képes feladatok:** a két képpárosítós hallásfeladat kimarad (3.3), a lap többi feladata bent van.
3. **Rövid válasz olvasott szöveghez:** kulcsszavas javítással került be, ugyanúgy, mint a hallás utáni rövid válaszok.
4. **Szár nélküli feleletválasztás:** ahol a kérdésnek nincs szövege, csak négy állítás (pl. 2010. május emelt, olvasás 4.), a feladat így került be; ahol az utasítás bekezdésekre hivatkozik, a kérdéseket sorrendben a bekezdésekhez rendeltem, és ezt megjegyzés jelzi.
5. **Táblázatok:** a két táblázatos hallásfeladat sorai szövegként kerültek be (3.3).

### A független ellenőrzésből nyitva maradt kérdések

1. **2005. május emelt, nyelvhelyesség 3., 26. kérdés:** a PDF szövegrétege szerint az alapszó `lucky`, az ellenőrzés szerint az oldal képén `unlucky` áll (a megoldás `unlucky`). A fájlban a szövegréteg szerinti `lucky` maradt; a nyomtatott lapon kell megnézni.
2. **2005. május emelt, hallás 3., 27–28. kérdés:** az útmutató szerint a két válasznak két különböző tulajdonságot kell megneveznie (pl. `blond hair` és `blue-eyed`); ezt a formátum nem tudja kifejezni, a feladat megjegyzése jelzi.
3. **2008. május közép, olvasás 1.:** a feladatban két példa van; a második a szövegben kitöltve látszik, külön példaitem nélkül.
4. **2008. október emelt, hallás 1., 3. kérdés:** az útmutató a `September 11` / `September 11th` mellett „egyéb érthető megoldásokat” is elfogad, de nem sorolja fel őket; a fájlban csak a két megnevezett alak van. Bővítve (megrendelő jóváhagyásával, 2026-11-25): Sept + eleventh.
5. **A vastagon szedett kötelező szavak:** néhány hallásfeladat útmutatója a megoldás vastagon szedett szavait kéri (pl. 2011. október emelt, hallás 2.: `at the camera(s)` – elég a `camera`). A vastag betű a PDF szövegéből nem olvasható ki, ezért ezt csak ott tudjuk, ahol az ellenőrzés az oldalképről jelezte; ezek a `kezi.js`-ben vannak. Az ellenőrzés mind a 91 lapon végigment; ahol a vastag betűt jelezte, ott a kulcs javítva van, de nem zárható ki, hogy egy-egy ilyen eset elkerülte a figyelmét.
6. **2005. november közép, hallás 3., 18. kérdés:** a rövid kulcs `graffiti//commando artists`, a részletes megjegyzés viszont `graffiti artists`-ról beszél, és a lapon két válaszvonal van. Eldöntve (2026-11-25): az útmutató általános része szerint ahol a lap két szót kér, csak a teljes megoldás fogadható el, és a példája is `graffiti artists`; a fájlban most `graffiti artists` / `commando artists` (`kezi.js`).
7. **2011. május emelt, olvasás 1., 2–4. és 6–7. kérdés:** az útmutató a felsorolt szavak mellett „a szövegből adódó, annak megértését alátámasztó szinonimákat” is elfogad, felsorolás nélkül. Bővítve (megrendelő jóváhagyásával, 2026-11-25): existing; heaviness, bulk; acquiring, obtaining, ordering; support, training, advice, documentation; prospects, progress, potential, chances. A tiltott alakok (written, having, popularity) továbbra sem jók; a `note` törölve.
8. **2014. október emelt, hallás 2., példa:** a feladatlapon A és B is be van karikázva, a hangfelvétel szövege szerint viszont csak a B helyes. Eldöntve (megrendelő, 2026-11-25): a nyomtatott lap a helyes – Tom Cruise is lemászott egy felhőkarcolón (Mission: Impossible), a szöveg erre utal –, a példa A és B marad, a megjegyzés törölve.
9. **Szabad megfogalmazású kulcsok:** 2020. október emelt, hallás 3., 23. és 25. kérdés („bármilyen más megfogalmazás elfogadható, amennyiben hiánytalanul megválaszolja a kérdést”); 2023. október emelt, hallás 1., 2. kérdés („a pontos dátum más formátumban is elfogadható”); 2018. május emelt, olvasás 3., 18. kérdés („más hasonló jelentésű nyomatékosítók is elfogadhatók”). Ezeknél a fájl csak a megnevezett alakokat tartalmazza; a többit a gép nem tudja megítélni. Bővítve (megrendelő jóváhagyásával, 2026-11-25): 2020/23 everyone/everybody … done, anyone/anybody … the same; 2020/25 the boy (Fleming) saved / rescued, the boy in the bog; 2023/2 számos dátumalakok (20.09.1932, 1932.09.20, 20/09/1932, 09/20/1932, 20 Sept 1932); 2018/R3/18 extremely, really, quite, rather, so, highly, totally + unwilling / reluctant. Ugyanitt javítva: a kulcs „not willing / prepared” részéből a puszta `prepared` is elfogadott volt, holott a jelentése ellentétes.
10. **Elavult figyelmeztetések:** 21 feladaton még rajta van a „két oszlop sorai keveredhettek” megjegyzés, és néhány itemen a „kézzel ellenőrizendő”. Az ellenőrzés ezeket a feladatokat rendben találta (egy kivétellel, amely javítva van); a megjegyzések törölhetők, ha a megrendelő szúrópróbája is megerősíti. Eldöntve (megrendelő, 2026-11-25): a lezárt megjegyzések törölve (40 db); a listájuk és az indoklásuk az `eszkozok/lezart.js`-ben, a kinyerő ezek alapján hagyja el őket. Megmaradt: a 2011. május emelt R1 szinonimás kérdései és a 2010. május emelt L4/40 (az útmutató elírásának javítását rögzíti).
11. **A perjel maradék kétértelműsége:** a szóköz nélküli perjelnél a csonka olvasat is elfogadott (`the/their city` mellett a puszta `the`), a tág perjelnél pedig előfordulhat a kulcsban nem szereplő összetétel (`running a campaign / campaigning` → `running a campaigning`). Géppel nem dönthető el, melyik olvasat a helyes; az ellenőrzés jelzései alapján egyenként javítjuk. 2026-11-25: a kulcsszavas kérdések mind a 105 perjeles kulcsa egyenként átnézve, a 19 hibás szétbontás javítva (10. fejezet); a pontos egyezésű perjeles kulcsok közül (647) a 140 kockázatosat (többszavas kulcson belüli perjel, töltelékszó vagy töredék az elfogadottak között) egyenként átnézve; 25 itemben javítva a `kezi.js` végén (`PERJEL`), köztük jelentésében ellentétes elfogadott válasz (2018. május emelt R3/21: `mistaken`) és puszta névelő (2018. május közép R4/29: `a`). A javítóval kipróbálva. A 280 több mezős (`gaps`) item is egyenként átnézve a kérdés szövegével és a nyers kulccsal: hibás mezőkiosztás vagy töredék nem volt; az útmutató tiltásai (pl. `front tooth`, `write it`) és a kötött párok (`armed guards`, de nem `armed agents`) a javítóval kipróbálva helyesen működnek.

### Tisztázandó

1. **Jogi háttér:** a feladatsorok nyilvánosak az Oktatási Hivatal oldalán, de a bennük lévő újságcikkek és hangfelvételek újraközlésének feltételeit nyilvános vagy fizetős szolgáltatás előtt meg kell vizsgálni.
2. **Hangvágás:** kész (2026-11-25): mind a 91 lap vágása meghallgatva és a tartalomba beírva (3.7).
