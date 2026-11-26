// A nyitóoldal (/): kinek szól a Matura, mit tud, hogyan megy egy óra; a tanár innen regisztrál vagy lép be, a diák
// innen is beírhatja a kódot (aki QR-kóddal vagy linkkel jön, az egyenesen a /k/<kód> oldalra érkezik).
// Telefonon 360 px-től vízszintes görgetés nélkül; a hub dizájnrendszere (SPEC 8.); nézetenként egy sárga gomb.
import { useState } from 'react';

const go = (path: string) => { history.pushState(null, '', path); dispatchEvent(new PopStateEvent('popstate')); scrollTo(0, 0); };
const WRITING_REVIEW_URL = 'https://review.mrandrewshub.com/#matura';

const Icon = ({ d }: { d: string }) => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const ICON = {
  library: 'M4 5h5v14H4zM10 5h4v14h-4zM15.5 5.5l4-1 3 13.5-4 1z',
  phone: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2',
  check: 'M4 12.5l5 5L20 6.5',
  sound: 'M4 10v4h4l5 4V6L8 10H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  trend: 'M4 17l5-5 4 3 7-8M15 7h5v5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13z',
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
};

function CodeBox() {
  const [code, setCode] = useState('');
  return (<form id="kod" className="l-code card" onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (c) go('/k/' + c); }}>
    <h2>Diák vagy?</h2>
    <p>Írd be a kódot, amit a tanárodtól kaptál. Fiók nem kell, csak egy becenév.</p>
    <label className="field">Kód<input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="pl. K7QM4X" /></label>
    <button className="pill dark" disabled={!code.trim()}>Megnyitom a feladatot</button>
  </form>);
}

/** Egy kitalált mintakérdés a hős mellett: így néz ki a feladat a diák telefonján. */
function PhoneMock() {
  return (<div className="l-phone" aria-hidden="true">
    <div className="l-phonetop"><b>Nyelvhelyesség 2.</b><span>5 / 8</span></div>
    <div className="l-phonebody exam">
      <p>The old bridge <span className="l-gap ok">was built</span> in 1902 and it is still in use.</p>
      <p>Most visitors <span className="l-gap bad">has</span> no idea how old it really is.</p>
      <p>Every summer the town <span className="l-gap empty">6.</span> a small festival on it.</p>
    </div>
    <div className="l-phonefoot"><span className="l-score">Pontszám</span><b>6 / 8</b></div>
  </div>);
}

export default function Landing() {
  const teacher = (e: React.MouseEvent) => { e.preventDefault(); go('/tanar'); };
  const signup = (e: React.MouseEvent) => { e.preventDefault(); go('/tanar?regisztracio'); };
  return (<div className="l-page">
    <header className="l-top">
      <span className="l-brand">Mr. Andrew's <b>Matura</b></span>
      <a className="l-login" href="/tanar" onClick={teacher}>Tanári belépés</a>
    </header>

    <section className="l-hero">
      <div className="l-herotext">
        <p className="l-kicker">Angol érettségi gyakorló</p>
        <h1>Írásbeli érettségi feladatok, órán, <span className="hl">telefonon</span></h1>
        <p className="l-lead">A 2005 és 2026 közötti angol érettségik olvasás-, nyelvhelyesség- és hallásfeladatai, közép- és emelt szinten. Te kiosztod, a diákok QR-kóddal megnyitják, a gép kijavítja a hivatalos útmutató szerint, és azonnal látod, mi ment és mi nem.</p>
        <div className="l-ctas">
          <a className="pill primary" href="/tanar?regisztracio" onClick={signup}>Létrehozom a tanári fiókom</a>
          <a className="l-ghost" href="#hogyan">Hogyan megy egy óra</a>
        </div>
        <p className="l-student">Diák vagy? <a href="#kod">Itt írd be a kódot</a>, amit a tanárodtól kaptál.</p>
      </div>
      <PhoneMock />
    </section>

    <section className="l-facts" aria-label="Számokban">
      <div><b>91</b><span>feladatsor, 2005–2026</span></div>
      <div><b>949</b><span>feladat</span></div>
      <div><b>7856</b><span>javított kérdés</span></div>
      <div><b>2</b><span>szint: közép és emelt</span></div>
    </section>

    <main className="l-main">
      <section id="hogyan" className="l-steps">
        <h2>Hogyan megy egy óra</h2>
        <ol>
          <li><span className="l-n">1</span><div><h3>Kiválasztod a feladatot</h3><p>A feladattárban szint, vizsgarész, feladattípus és év szerint szűrsz, előnézetben megnézed, és egy vagy több feladatot kiosztasz a csoportodnak.</p></div></li>
          <li><span className="l-n">2</span><div><h3>A diákok megnyitják a telefonjukon</h3><p>Kivetíted a QR-kódot vagy a hat jeles kódot. A diákoknak nem kell fiók: becenévvel lépnek be, és a válaszaik az oldal újratöltése után is megmaradnak.</p></div></li>
          <li><span className="l-n">3</span><div><h3>A gép javít, te megbeszéled</h3><p>A beküldések élőben érkeznek. Lezárás után a diákok látják a megoldást, te pedig kérdésenként a helyes arányt és a leggyakoribb rossz választ.</p></div></li>
        </ol>
      </section>

      <section className="l-features">
        <h2>Mit tud</h2>
        <div className="l-grid">
          <article className="card"><Icon d={ICON.library} /><h3>Teljes feladattár</h3><p>Mind a 91 írásbeli feladatsor olvasás-, nyelvhelyesség- és hallásrésze, a hivatalos javítókulccsal. A már megoldott feladatokat a csoportnál jelzi.</p></article>
          <article className="card"><Icon d={ICON.check} /><h3>Javítás az útmutató szerint</h3><p>A beírós válaszoknál az elfogadott változatok és a hallásnál megengedett elírások is számítanak. A kulcs a beküldés előtt nem kerül a diák telefonjára.</p></article>
          <article className="card"><Icon d={ICON.sound} /><h3>Hang két módban</h3><p>A hallásfeladat hangja szólhat a tanári gépről, a kivetítő mellől, vagy a diákok fülhallgatóval a saját telefonjukon hallgatják.</p></article>
          <article className="card"><Icon d={ICON.chart} /><h3>Eredmény kérdésenként</h3><p>Kitöltők, átlag, kérdésenként a helyes arány és a leggyakoribb rossz válasz. A nehéz kérdések ki vannak emelve, így tudod, mit érdemes megbeszélni.</p></article>
          <article className="card"><Icon d={ICON.trend} /><h3>Csoportszintű trendek</h3><p>Több kiosztás után a csoport oldalán látod a vizsgarészenkénti és típusonkénti átlagot, a leggyengébb feladattípust, és a csoportjaidat ugyanazon a feladaton.</p></article>
          <article className="card"><Icon d={ICON.lock} /><h3>Diákadat nélkül</h3><p>A diákról csak a becenév és egy véletlen eszközazonosító kerül a rendszerbe. A tanár csak a saját csoportjait és eredményeit látja.</p></article>
        </div>
      </section>

      <section className="l-split">
        <CodeBox />
        <div className="l-writing card">
          <Icon d={ICON.pen} />
          <h2>Az írásfeladatok</h2>
          <p>Az érettségik levél- és fogalmazásfeladatai a Writing Review érettségi feladattárában vannak: ott a diákok a linkeden írnak, az értékelés a hivatalos szempontok szerint megy, és a visszajelzést te hagyod jóvá.</p>
          <a className="l-ghost dark" href={WRITING_REVIEW_URL} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Megnézem a Writing Review-t</a>
        </div>
      </section>

      <section className="l-final">
        <h2>Próbáld ki a következő órádon</h2>
        <p>Regisztrálj Google-fiókkal vagy e-mail-címmel, hozz létre egy csoportot, és osszd ki az első feladatot. Pár perc az egész.</p>
        <a className="pill l-onwhite" href="/tanar" onClick={teacher}>Belépek vagy regisztrálok</a>
      </section>
    </main>

    <footer className="l-foot">
      <p>A feladatok az Oktatási Hivatal által közzétett érettségi feladatlapokról és javítási útmutatókból származnak. A Matura nem az Oktatási Hivatal szolgáltatása.</p>
      <p>Mr. Andrew's Matura · a <a href="https://mrandrewshub.com" rel="noopener">Mr. Andrew's EdTech Hub</a> része</p>
    </footer>
  </div>);
}
