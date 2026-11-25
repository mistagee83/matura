// Hanglejátszó (SPEC 3.7): a diák a feladat tetején, a tanár az élő nézetben (kivetítőn is) használja.
// Lejátszás és megállítás, 10 mp vissza és előre, tekerhető sáv, eltelt és teljes idő. A hang az R2-ből jön (AUDIO_BASE).
import { useEffect, useRef, useState } from 'react';

// élesben az R2 nyilvános címe (.env.production); helyben a fejlesztői kiszolgáló a forrásmappából adja (/dev-hang/)
export const AUDIO_BASE = (import.meta.env.VITE_AUDIO_BASE as string | undefined) || (import.meta.env.DEV ? '/dev-hang/' : '');
/** A tartalom `audio.clip` mezőjéből (pl. `hang/k_angol_24maj_fl_H1.mp3`) a lejátszható cím; üres, ha nincs hangcím beállítva. */
export const clipUrl = (clip?: string | null) => (clip && AUDIO_BASE ? AUDIO_BASE.replace(/\/?$/, '/') + clip.replace(/^hang\//, '') : '');

const fmt = (s: number) => (isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');

const Icon = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);
const PLAY = 'M8 5l11 7-11 7V5z', PAUSE = 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z';
const BACK = 'M11 6L5 12l6 6M19 6l-6 6 6 6', FWD = 'M13 6l6 6-6 6M5 6l6 6-6 6';

export default function Player({ src, label, big }: { src: string; label: string; big?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0), [dur, setDur] = useState(NaN);
  const [err, setErr] = useState(false), [wait, setWait] = useState(false);
  useEffect(() => { setPlaying(false); setT(0); setDur(NaN); setErr(false); }, [src]);

  const el = () => ref.current!;
  const toggle = () => { if (el().paused) el().play().catch(() => setErr(true)); else el().pause(); };
  const skip = (d: number) => { el().currentTime = Math.max(0, Math.min((isFinite(dur) ? dur : Infinity), el().currentTime + d)); };

  return (<div className={'player' + (big ? ' big' : '')} role="group" aria-label={label}>
    <audio ref={ref} src={src} preload="metadata"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
      onDurationChange={(e) => setDur(e.currentTarget.duration)} onWaiting={() => setWait(true)} onPlaying={() => setWait(false)} onCanPlay={() => setWait(false)}
      onError={() => setErr(true)} />
    <button type="button" className="pl-main" onClick={toggle} aria-label={playing ? 'Megállítom' : 'Lejátszom'}><Icon d={playing ? PAUSE : PLAY} fill /></button>
    <div className="pl-mid">
      <div className="pl-label">{label}</div>
      <input type="range" min={0} max={isFinite(dur) ? dur : 0} step={1} value={Math.min(t, isFinite(dur) ? dur : 0)} aria-label="Tekerés"
        aria-valuetext={`${fmt(t)} / ${fmt(dur)}`} disabled={!isFinite(dur)}
        onChange={(e) => { el().currentTime = +e.target.value; setT(+e.target.value); }}
        style={{ ['--p' as string]: isFinite(dur) && dur ? `${(t / dur) * 100}%` : '0%' }} />
      <div className="pl-time"><span>{fmt(t)}{wait && playing ? ' · töltés…' : ''}</span><span>{fmt(dur)}</span></div>
      {err && <div className="pl-err">Nem sikerült betölteni a hangot. Ellenőrizd az internetkapcsolatot, és próbáld újra.</div>}
    </div>
    <button type="button" className="pl-skip" onClick={() => skip(-10)} aria-label="10 másodperccel vissza"><Icon d={BACK} /><small>10</small></button>
    <button type="button" className="pl-skip" onClick={() => skip(10)} aria-label="10 másodperccel előre"><Icon d={FWD} /><small>10</small></button>
  </div>);
}
