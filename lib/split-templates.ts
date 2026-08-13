/**
 * Ready-made starter splits. Exercises are referenced by slug and resolved to
 * real exercise rows when a member clones a template into their own editable
 * split. Beginner-friendly on purpose — a starting point people can customise.
 */

export interface TemplateExercise {
  slug: string;
  sets: number;
  repTarget: string;
  restSeconds: number;
  /** Exercises sharing a group number on the same day are a superset/circuit. */
  supersetGroup?: number;
}
export interface TemplateDay {
  name: string;
  focusMuscles: string[];
  exercises: TemplateExercise[];
}
export interface SplitTemplate {
  key: string;
  name: string;
  level: "Beginner" | "Intermediate";
  daysPerWeek: string;
  summary: string;
  days: TemplateDay[];
}

const S = (
  slug: string,
  sets: number,
  reps: string,
  rest = 90
): TemplateExercise => ({
  slug,
  sets,
  repTarget: reps,
  restSeconds: rest,
});

/** Superset variant: last arg is the group number (same number = paired). */
const SS = (
  group: number,
  slug: string,
  sets: number,
  reps: string,
  rest = 60
): TemplateExercise => ({
  slug,
  sets,
  repTarget: reps,
  restSeconds: rest,
  supersetGroup: group,
});

export const SPLIT_TEMPLATES: SplitTemplate[] = [
  {
    key: "beginner-full-body",
    name: "Beginner Full Body",
    level: "Beginner",
    daysPerWeek: "2–3 days",
    summary:
      "The best place to start. Simple full-body sessions that hit everything, plus an easy cardio finish.",
    days: [
      {
        name: "Full Body A",
        focusMuscles: ["quads", "chest", "back", "core"],
        exercises: [
          S("goblet-squat", 3, "8–12"),
          S("push-up-flat", 3, "8–12"),
          S("one-arm-dumbbell-row", 3, "10–12"),
          S("glute-bridge", 3, "12–15"),
          S("plank", 3, "30–45s", 45),
          S("treadmill-walk", 1, "10 min easy", 0),
        ],
      },
      {
        name: "Full Body B",
        focusMuscles: ["hamstrings", "shoulders", "back", "core"],
        exercises: [
          S("romanian-deadlift-db", 3, "8–12"),
          S("seated-db-shoulder-press", 3, "8–12"),
          S("lat-pulldown-neutral", 3, "10–12"),
          S("stationary-lunge", 3, "10 each"),
          S("dead-bug", 3, "10 each", 45),
          S("treadmill-walk", 1, "10 min easy", 0),
        ],
      },
    ],
  },
  {
    key: "full-body-3day",
    name: "Full Body (3-Day)",
    level: "Beginner",
    daysPerWeek: "3 days",
    summary:
      "Three rotating full-body days for steady, balanced progress across the whole body.",
    days: [
      {
        name: "Day A",
        focusMuscles: ["quads", "chest", "back"],
        exercises: [
          S("goblet-squat", 3, "8–12"),
          S("dumbbell-bench-press", 3, "8–12"),
          S("one-arm-dumbbell-row", 3, "10–12"),
          S("seated-db-shoulder-press", 3, "10–12"),
          S("plank", 3, "30–45s", 45),
        ],
      },
      {
        name: "Day B",
        focusMuscles: ["hamstrings", "chest", "back", "core"],
        exercises: [
          S("romanian-deadlift-db", 3, "8–12"),
          S("machine-chest-press", 3, "10–12"),
          S("lat-pulldown-neutral", 3, "10–12"),
          S("glute-bridge", 3, "12–15"),
          S("dead-bug", 3, "10 each", 45),
        ],
      },
      {
        name: "Day C",
        focusMuscles: ["quads", "shoulders", "back", "core"],
        exercises: [
          S("leg-press", 3, "10–12"),
          S("incline-dumbbell-press", 3, "10–12"),
          S("seated-cable-row", 3, "10–12"),
          S("lateral-raise-light", 3, "12–15", 60),
          S("russian-twist", 3, "20", 45),
        ],
      },
    ],
  },
  {
    key: "push-pull-legs",
    name: "Push / Pull / Legs",
    level: "Intermediate",
    daysPerWeek: "3–6 days",
    summary:
      "A classic split: push muscles one day, pull the next, legs the third. Repeat for more volume.",
    days: [
      {
        name: "Push (Chest, Shoulders, Triceps)",
        focusMuscles: ["chest", "shoulders", "triceps"],
        exercises: [
          S("dumbbell-bench-press", 4, "8–12"),
          S("seated-db-shoulder-press", 3, "8–12"),
          S("incline-dumbbell-press", 3, "10–12"),
          S("lateral-raise-light", 3, "12–15", 60),
          S("triceps-pushdown", 3, "12–15", 60),
        ],
      },
      {
        name: "Pull (Back, Biceps)",
        focusMuscles: ["back", "lats", "biceps"],
        exercises: [
          S("lat-pulldown-neutral", 4, "8–12"),
          S("seated-cable-row", 3, "10–12"),
          S("one-arm-dumbbell-row", 3, "10–12"),
          S("face-pull", 3, "15", 60),
          S("dumbbell-curl", 3, "12–15", 60),
        ],
      },
      {
        name: "Legs",
        focusMuscles: ["quads", "hamstrings", "glutes", "calves"],
        exercises: [
          S("goblet-squat", 4, "8–12"),
          S("romanian-deadlift-db", 3, "8–12"),
          S("leg-press", 3, "10–12"),
          S("hamstring-curl", 3, "12–15", 60),
          S("standing-calf-raise", 4, "12–15", 45),
        ],
      },
    ],
  },
  {
    key: "upper-lower",
    name: "Upper / Lower",
    level: "Intermediate",
    daysPerWeek: "2–4 days",
    summary:
      "Alternate upper-body and lower-body days. Efficient and easy to fit around your week.",
    days: [
      {
        name: "Upper Body",
        focusMuscles: ["chest", "back", "shoulders", "biceps", "triceps"],
        exercises: [
          S("dumbbell-bench-press", 4, "8–12"),
          S("lat-pulldown-neutral", 4, "8–12"),
          S("seated-db-shoulder-press", 3, "10–12"),
          S("seated-cable-row", 3, "10–12"),
          S("dumbbell-curl", 3, "12–15", 60),
          S("triceps-pushdown", 3, "12–15", 60),
        ],
      },
      {
        name: "Lower Body",
        focusMuscles: ["quads", "hamstrings", "glutes", "calves", "core"],
        exercises: [
          S("goblet-squat", 4, "8–12"),
          S("romanian-deadlift-db", 3, "8–12"),
          S("leg-press", 3, "10–12"),
          S("hip-thrust-barbell", 3, "10–12"),
          S("standing-calf-raise", 4, "12–15", 45),
          S("plank", 3, "30–45s", 45),
        ],
      },
    ],
  },
  {
    key: "bro-split",
    name: "5-Day Body Part Split",
    level: "Intermediate",
    daysPerWeek: "5 days",
    summary:
      "A day for each major area — chest, back, legs, shoulders, arms. High focus and volume per muscle.",
    days: [
      {
        name: "Chest",
        focusMuscles: ["chest"],
        exercises: [
          S("machine-chest-press", 4, "8–12"),
          S("incline-dumbbell-press", 3, "10–12"),
          S("dumbbell-bench-press", 3, "10–12"),
          S("push-up-flat", 3, "AMRAP", 60),
        ],
      },
      {
        name: "Back",
        focusMuscles: ["back", "lats"],
        exercises: [
          S("lat-pulldown-neutral", 4, "8–12"),
          S("seated-cable-row", 3, "10–12"),
          S("one-arm-dumbbell-row", 3, "10–12"),
          S("face-pull", 3, "15", 60),
        ],
      },
      {
        name: "Legs",
        focusMuscles: ["quads", "hamstrings", "glutes", "calves"],
        exercises: [
          S("goblet-squat", 4, "8–12"),
          S("leg-press", 3, "10–12"),
          S("romanian-deadlift-db", 3, "8–12"),
          S("standing-calf-raise", 4, "12–15", 45),
        ],
      },
      {
        name: "Shoulders",
        focusMuscles: ["shoulders"],
        exercises: [
          S("seated-db-shoulder-press", 4, "8–12"),
          S("lateral-raise-light", 4, "12–15", 60),
          S("face-pull", 3, "15", 60),
          S("farmers-carry", 3, "40m", 60),
        ],
      },
      {
        name: "Arms",
        focusMuscles: ["biceps", "triceps"],
        exercises: [
          S("dumbbell-curl", 4, "10–12", 60),
          S("triceps-pushdown", 4, "10–12", 60),
          S("incline-push-up", 3, "AMRAP", 60),
        ],
      },
    ],
  },
  {
    key: "antagonist-supersets",
    name: "Antagonist Supersets",
    level: "Intermediate",
    daysPerWeek: "2–4 days",
    summary:
      "Pair opposing muscles back-to-back — push with pull, quads with hamstrings. Big time-saver, great pump.",
    days: [
      {
        name: "Upper Supersets",
        focusMuscles: ["chest", "back", "shoulders", "biceps", "triceps"],
        exercises: [
          SS(1, "dumbbell-bench-press", 4, "8–12"),
          SS(1, "one-arm-dumbbell-row", 4, "10–12"),
          SS(2, "seated-db-shoulder-press", 3, "10–12"),
          SS(2, "lat-pulldown-neutral", 3, "10–12"),
          SS(3, "dumbbell-curl", 3, "12–15"),
          SS(3, "triceps-pushdown", 3, "12–15"),
        ],
      },
      {
        name: "Lower Supersets",
        focusMuscles: ["quads", "hamstrings", "glutes", "calves"],
        exercises: [
          SS(1, "leg-press", 4, "10–12"),
          SS(1, "hamstring-curl", 4, "12–15"),
          SS(2, "goblet-squat", 3, "10–12"),
          SS(2, "romanian-deadlift-db", 3, "10–12"),
          S("standing-calf-raise", 4, "12–15", 45),
        ],
      },
    ],
  },
  {
    key: "full-body-supersets",
    name: "Full-Body Supersets (Express)",
    level: "Intermediate",
    daysPerWeek: "2–3 days",
    summary:
      "Two quick full-body sessions built entirely from supersets — in and out in 40 minutes.",
    days: [
      {
        name: "Express A",
        focusMuscles: ["quads", "chest", "back", "core"],
        exercises: [
          SS(1, "goblet-squat", 3, "10–12"),
          SS(1, "push-up-flat", 3, "10–15"),
          SS(2, "one-arm-dumbbell-row", 3, "10–12"),
          SS(2, "seated-db-shoulder-press", 3, "10–12"),
          S("plank", 3, "30–45s", 45),
        ],
      },
      {
        name: "Express B",
        focusMuscles: ["hamstrings", "chest", "back", "shoulders", "core"],
        exercises: [
          SS(1, "romanian-deadlift-db", 3, "10–12"),
          SS(1, "incline-dumbbell-press", 3, "10–12"),
          SS(2, "lat-pulldown-neutral", 3, "10–12"),
          SS(2, "lateral-raise-light", 3, "12–15"),
          S("russian-twist", 3, "20", 45),
        ],
      },
    ],
  },
  {
    key: "arm-blaster-supersets",
    name: "Arm Blaster Supersets",
    level: "Intermediate",
    daysPerWeek: "1–2 days",
    summary:
      "A dedicated arm pump — biceps and triceps supersetted back-to-back for maximum burn.",
    days: [
      {
        name: "Arms Superset",
        focusMuscles: ["biceps", "triceps"],
        exercises: [
          SS(1, "dumbbell-curl", 4, "10–12"),
          SS(1, "triceps-pushdown", 4, "10–12"),
          SS(2, "incline-push-up", 3, "AMRAP"),
          SS(2, "face-pull", 3, "15"),
          S("farmers-carry", 3, "40m", 60),
        ],
      },
    ],
  },
  {
    key: "dumbbell-home",
    name: "Dumbbell Only (Home)",
    level: "Beginner",
    daysPerWeek: "3 days",
    summary:
      "No machines needed — a full split you can run at home with a pair of dumbbells and bodyweight.",
    days: [
      {
        name: "Legs & Push",
        focusMuscles: ["quads", "chest", "shoulders", "core"],
        exercises: [
          S("goblet-squat", 3, "10–12"),
          S("dumbbell-bench-press", 3, "8–12"),
          S("seated-db-shoulder-press", 3, "10–12"),
          S("stationary-lunge", 3, "10 each"),
          S("plank", 3, "30–45s", 45),
        ],
      },
      {
        name: "Pull & Core",
        focusMuscles: ["back", "hamstrings", "biceps", "core"],
        exercises: [
          S("romanian-deadlift-db", 3, "8–12"),
          S("one-arm-dumbbell-row", 3, "10–12"),
          S("dumbbell-curl", 3, "12–15", 60),
          S("glute-bridge", 3, "12–15"),
          S("dead-bug", 3, "10 each", 45),
        ],
      },
      {
        name: "Full Body",
        focusMuscles: ["chest", "shoulders", "quads", "core"],
        exercises: [
          S("incline-dumbbell-press", 3, "10–12"),
          S("lateral-raise-light", 3, "12–15", 60),
          S("stationary-lunge", 3, "10 each"),
          S("farmers-carry", 3, "40m", 60),
          S("russian-twist", 3, "20", 45),
        ],
      },
    ],
  },
  {
    key: "home-shoulders",
    name: "Home Gym Shoulders",
    level: "Beginner",
    daysPerWeek: "1 day",
    summary:
      "A complete shoulder session you can do at home with just dumbbells and bodyweight — presses, raises and rear delts.",
    days: [
      {
        name: "Shoulder Day",
        focusMuscles: ["shoulders", "back"],
        exercises: [
          S("seated-db-shoulder-press", 4, "8–12", 120),
          S("lateral-raise-light", 4, "12–15", 60),
          S("one-arm-dumbbell-row", 3, "10–12"),
          S("incline-push-up", 3, "AMRAP", 60),
          S("farmers-carry", 3, "40m", 60),
        ],
      },
    ],
  },
];

export function getTemplate(key: string): SplitTemplate | undefined {
  return SPLIT_TEMPLATES.find((t) => t.key === key);
}
