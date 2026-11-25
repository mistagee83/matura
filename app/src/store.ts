// Az eszközön tárolt adatok. A válaszok a beküldésig itt maradnak, így újratöltés után a diák ott folytatja, ahol abbahagyta
// (SPEC 4.1, 9.). Az eszközazonosító véletlen érték; kizárólag az első beküldés megkülönböztetésére szolgál (SPEC 6.).
import type { SubmitResult } from './api';

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
export const lastNickname = () => safe(() => localStorage.getItem('matura:nick') || '', '');
export const rememberNickname = (n: string) => safe(() => localStorage.setItem('matura:nick', n), undefined);
