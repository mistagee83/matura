// Az eszközön tárolt adatok. A válaszok a beküldésig itt maradnak, így újratöltés után a diák ott folytatja, ahol abbahagyta
// (SPEC 4.1, 9.). Az eszközazonosító véletlen érték; kizárólag az első beküldés megkülönböztetésére szolgál (SPEC 6.).
import type { SubmitResult, PracticeResult } from './api';

const safe = <T,>(f: () => T, fb: T): T => { try { return f(); } catch { return fb; } };

export function deviceId(): string {
  return safe(() => {
    let id = localStorage.getItem('matura:device');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('matura:device', id); }
    return id;
  }, crypto.randomUUID());
}

export type Answers = Record<string, Record<string, any>>;   // feladatazonosító → itemsorszám → válasz
export interface Saved { nickname: string; started: boolean; answers: Answers; index: number; result: SubmitResult | null }
const key = (code: string) => 'matura:a:' + code;
export const loadSaved = (code: string): Saved =>
  safe(() => ({ nickname: '', started: false, answers: {}, index: 0, result: null, ...JSON.parse(localStorage.getItem(key(code)) || '{}') }),
    { nickname: '', started: false, answers: {}, index: 0, result: null });
export const save = (code: string, s: Saved) => safe(() => localStorage.setItem(key(code), JSON.stringify(s)), undefined);
// Önálló gyakorlás (SPEC 4.4): feladatonként a válaszok és az utolsó eredmény, valamint a legutóbbi szűrés. Csak ezen az eszközön.
export interface PracticeSaved { answers: Record<string, any>; result: PracticeResult | null; done?: { score: number; max: number } }
const pkey = (id: string) => 'matura:p:' + id;
export const loadPractice = (id: string): PracticeSaved =>
  safe(() => ({ answers: {}, result: null, ...JSON.parse(localStorage.getItem(pkey(id)) || '{}') }), { answers: {}, result: null });
export const savePractice = (id: string, s: PracticeSaved) => safe(() => localStorage.setItem(pkey(id), JSON.stringify(s)), undefined);
/** az eszközön elvégzett gyakorlások legutóbbi eredménye feladatonként (a lista jelöléseihez) */
export function practiceDone(): Record<string, { score: number; max: number }> {
  return safe(() => {
    const out: Record<string, { score: number; max: number }> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (!k.startsWith('matura:p:')) continue;
      const d = JSON.parse(localStorage.getItem(k) || '{}').done;
      if (d) out[k.slice(9)] = d;
    }
    return out;
  }, {});
}
export interface PracticeFilter { level: 'közép' | 'emelt'; section: 'reading' | 'language' | 'listening' | 'all' }
export const loadFilter = (): PracticeFilter =>
  safe(() => ({ level: 'közép' as const, section: 'all' as const, ...JSON.parse(localStorage.getItem('matura:pf') || '{}') }), { level: 'közép', section: 'all' });
export const saveFilter = (f: PracticeFilter) => safe(() => localStorage.setItem('matura:pf', JSON.stringify(f)), undefined);

export const lastNickname = () => safe(() => localStorage.getItem('matura:nick') || '', '');
export const rememberNickname = (n: string) => safe(() => localStorage.setItem('matura:nick', n), undefined);
