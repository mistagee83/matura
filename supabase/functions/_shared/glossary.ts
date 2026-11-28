// A szójegyzék (SPEC 4.5) szétválasztása: a beküldés előtt látható címszavak és a csak javítás után kiadható,
// a megoldást elárulható címszavak (`afterSubmit`). A seed, a helyi próba-háttér és a próba is ezt használja.
export interface GlossEntry { forms: string[]; lemma: string; pos: string; en: string; hu: string; tip?: string }

export function splitGlossary(entries: (GlossEntry & { afterSubmit?: boolean })[]): { entries: GlossEntry[]; after: GlossEntry[] } {
  const pub: GlossEntry[] = [], after: GlossEntry[] = [];
  for (const { afterSubmit, ...e } of entries) (afterSubmit ? after : pub).push(e);
  return { entries: pub, after };
}
