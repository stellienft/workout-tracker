/**
 * Daily motivational quotes. The pick is deterministic per calendar day, so a
 * member sees one quote for the whole day and it changes tomorrow.
 */

export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "It never gets easier, you just get stronger.", author: "Jordan Hoechlin" },
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Strength does not come from winning. Your struggles develop your strengths.", author: "Arnold Schwarzenegger" },
  { text: "Success is what comes after you stop making excuses.", author: "Luis Galarza" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "Motivation gets you started. Habit keeps you going.", author: "Jim Ryun" },
  { text: "Don't limit your challenges. Challenge your limits.", author: "Unknown" },
  { text: "A one-hour workout is 4% of your day. No excuses.", author: "Unknown" },
  { text: "Fall in love with taking care of yourself.", author: "Unknown" },
  { text: "Little by little, a little becomes a lot.", author: "Tanzanian proverb" },
  { text: "Your only competition is who you were yesterday.", author: "Unknown" },
  { text: "Sweat is just fat crying.", author: "Unknown" },
  { text: "Nobody who ever gave their best regretted it.", author: "George Halas" },
  { text: "The hardest lift of all is lifting your butt off the couch.", author: "Unknown" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Good things come to those who sweat.", author: "Unknown" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "The difference between try and triumph is a little 'umph'.", author: "Marvin Phillips" },
  { text: "Train insane or remain the same.", author: "Jillian Michaels" },
  { text: "Once you learn to quit, it becomes a habit.", author: "Vince Lombardi" },
  { text: "We are what we repeatedly do. Excellence, then, is a habit.", author: "Aristotle" },
  { text: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt" },
];

/** Day-of-year index so the quote is stable for the whole day and rotates. */
export function quoteForDate(d: Date = new Date()): Quote {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}
