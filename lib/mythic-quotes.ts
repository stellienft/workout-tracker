/**
 * Original, god-voice motivational lines for Ares Fitness — used when
 * achievements unlock and on the shareable achievement cards, plus mythic
 * greetings for the app. All lines are original brand copy.
 *
 * Pools are intentionally large: greetings rotate by day, so 40+ means no
 * repeat within a month; the quote pool is deep so unlocks and share cards
 * stay varied.
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
  "Iron remembers who returns.",
  "The mountain yields to the patient and the fierce.",
  "You were not made for easy roads.",
  "Let your effort echo in the halls of legend.",
  "Weakness is a visitor — send it away.",
  "The barbell is honest; it rewards only the worthy.",
  "Storms are forged in silence, then unleashed.",
  "Carry the weight until the weight fears you.",
  "Comfort is the tomb of the great.",
  "Each set is another step up the mountain.",
  "The strong are simply those who refused to stop.",
  "Effort is the only offering the gods accept.",
  "Doubt dies where discipline lives.",
  "You are the storm they warned about.",
  "Break today; rise unbreakable tomorrow.",
  "The heavy things make the mighty.",
  "No god ever pitied the idle.",
  "Your only rival wears your face.",
  "The grind is sacred ground.",
  "Fatigue is the toll on the road to glory.",
  "Bend the iron, and you begin to bend fate.",
  "Titans are built one rep at a time.",
  "Rest is earned, never given.",
  "The worthy are known by their scars.",
  "Lift as if legends depend on it — they do.",
  "Ordinary was never your destiny.",
  "The forge burns hottest before the masterpiece.",
  "What breaks the mortal forges the titan.",
  "Strength answers only to the relentless.",
  "Chaos fears a disciplined hand.",
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
  "The arena calls",
  "Steel yourself",
  "Claim your throne",
  "Onward to Olympus",
  "The iron waits",
  "Awaken the titan",
  "Today, be legend",
  "The storm is yours",
  "Forge your legend",
  "Enter the arena",
  "Take up the iron",
  "Your legend continues",
  "Command the day",
  "Strength is calling",
  "The summit awaits",
  "Rise above mortal limits",
  "Let the earth tremble",
  "Seize your glory",
  "The gods demand more",
  "Prove yourself",
  "Answer with iron",
  "The trial begins",
  "Stand and be counted",
  "Wield your will",
  "Greatness is waiting",
  "March to the forge",
  "Break your limits",
  "Fear no weight",
  "Earn your name",
  "The pantheon watches",
  "Ready your resolve",
  "Draw your strength",
  "Today belongs to the bold",
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

/** A greeting that rotates by day so it stays stable within a session and
 *  doesn't repeat within a month. */
export function mythicGreetingForDate(d: Date = new Date()): string {
  const day = Math.floor(d.getTime() / 86_400_000);
  return MYTHIC_GREETINGS[day % MYTHIC_GREETINGS.length];
}
