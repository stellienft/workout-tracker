import { Dumbbell, Footprints, Utensils, Moon, Scale, HeartPulse } from "lucide-react";

const TIPS = [
  {
    icon: Dumbbell,
    title: "Lift 2–4× a week",
    body: "Resistance training builds muscle, your biggest glucose sink — it pulls sugar out of the blood without needing much insulin. You already have programs for this.",
  },
  {
    icon: Footprints,
    title: "Walk after meals",
    body: "A 10–15 minute walk after eating blunts the blood-sugar spike. Even gentle movement within ~30 minutes of a meal helps a lot.",
  },
  {
    icon: Utensils,
    title: "Protein & fibre first",
    body: "Build meals around protein and vegetables, go easy on refined carbs and sugary drinks, and eat the carbs last. This flattens glucose spikes.",
  },
  {
    icon: Moon,
    title: "Protect your sleep",
    body: "One bad night raises insulin resistance measurably. Aim for 7–9 hours — it's one of the highest-leverage things you can do.",
  },
  {
    icon: Scale,
    title: "Trim central fat",
    body: "Losing even 5–7% of body weight — especially around the waist — markedly improves insulin sensitivity. Your GLP-1 and nutrition tools support this.",
  },
  {
    icon: HeartPulse,
    title: "Add some zone-2 cardio",
    body: "Easy-paced cardio (you can still hold a conversation), 2–3× a week for 20–40 min, improves how your muscles use glucose over time.",
  },
];

export function ManagementGuide() {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Managing insulin resistance</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        The levers with the strongest evidence — most of which this app already
        helps you with.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TIPS.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.title}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
                <h3 className="font-semibold">{t.title}</h3>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{t.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
