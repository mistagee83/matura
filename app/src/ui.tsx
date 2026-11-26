// A diákoldal közös elemei: fejléc és oldalon belüli navigáció.
export const go = (path: string) => { history.pushState(null, '', path); dispatchEvent(new PopStateEvent('popstate')); scrollTo(0, 0); };

export function Header({ title, sub, right, back }: { title: string; sub?: string; right?: string; back?: { label: string; to: string } }) {
  return (<header className="top">
    {back ? <a className="back" href={back.to} aria-label={back.label} onClick={(e) => { e.preventDefault(); go(back.to); }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
    </a> : <div className="brand">Mr. Andrew's <b>Matura</b></div>}
    <div className="htitle"><span>{title}</span>{sub && <small>{sub}</small>}</div>{right && <span className="prog">{right}</span>}</header>);
}
