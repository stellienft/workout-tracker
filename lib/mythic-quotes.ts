/**
 * Original, god-voice motivational lines for Ares Fitness — used when
 * achievements unlock and on the shareable achievement cards, plus mythic
 * greetings for the app. All lines are original brand copy.
 */

export const MYTHIC_QUOTES: string[] = [
  "The iron bows to those who never kneel.",
  "Mortals rest. You forge on.",
  "Olympus is not climbed by the comfortable.",
  "Every rep is an offering — make it worthy.",
  "Pain is the chisel; you are the marble.",
  "The gods favour the relentless.",
  "Legends are earned in the dark hours.",
  "You do not reach the summit. You become it.",
  "Discipline is the blade the gods respect.",
  "Rise, and let thunder answer.",
  "The forge does not ask if you are tired.",
  "What you conquer here, no fate can take.",
  "Command your body as the heavens command the storm.",
  "Greatness is a debt repaid in effort.",
  "Strength is the tribute the worthy pay each day.",
  "Sweat now, so the ages remember your name.",
  "Move as though immortality were the prize.",
  "The weak beg for lighter loads; the strong ask for broader shoulders.",
  "Today you carried the sky — and did not break.",
  "Glory kneels only to those who never do.",
];

/** Mythic greetings used in place of a plain "Welcome back". */
export const MYTHIC_GREETINGS: string[] = [
  "The forge awaits",
  "Return to the arena",
  "Rise and conquer",
  "The gods are watching",
  "Answer the call",
  "Back to the forge",
  "Summon your strength",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic quote for a given seed (e.g. an achievement id/title) so the
 *  unlock and its share card show the same line. */
export function mythicQuoteFor(seed: string): string {
  return MYTHIC_QUOTES[hashString(seed) % MYTHIC_QUOTES.length];
}

/** A random mythic quote (for one-off moments like an unlock toast). */
export function randomMythicQuote(): string {
  return MYTHIC_QUOTES[Math.floor(Math.random() * MYTHIC_QUOTES.length)];
}

/** A greeting that rotates by day so it stays stable within a session. */
export function mythicGreetingForDate(d: Date = new Date()): string {
  const day = Math.floor(d.getTime() / 86_400_000);
  return MYTHIC_GREETINGS[day % MYTHIC_GREETINGS.length];
}
