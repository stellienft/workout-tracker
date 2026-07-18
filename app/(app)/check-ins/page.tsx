import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { CheckinForm } from "@/components/tracking/checkin-form";

export const metadata = { title: "Check-ins" };

export default async function CheckinsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checked_on", today)
    .eq("checkin_type", "daily")
    .maybeSingle();

  const { data: recent } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .order("checked_on", { ascending: false })
    .limit(10);

  return (
    <PageShell>
      <PageHeader
        title="Check-ins"
        subtitle="A quick daily pulse on energy, soreness and shoulder health."
      />
      <div className="mt-6">
        <CheckinForm
          existing={
            todayCheckin
              ? {
                  energy: todayCheckin.energy ?? 3,
                  soreness: todayCheckin.soreness ?? 1,
                  sleepQuality: todayCheckin.sleep_quality ?? 3,
                  mood: todayCheckin.mood ?? 3,
                  shoulderPain: todayCheckin.shoulder_pain ?? 0,
                  recovery: todayCheckin.recovery ?? 3,
                }
              : null
          }
        />
      </div>

      {recent && recent.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold">Recent check-ins</h2>
          <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
            {recent.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-[var(--text-secondary)]">
                  {new Date(c.checked_on).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                  {c.energy != null && <span>Energy {c.energy}</span>}
                  {c.soreness != null && <span>Sore {c.soreness}</span>}
                  {c.shoulder_pain != null && (
                    <span
                      className={
                        c.shoulder_pain >= 5 ? "text-[var(--danger)]" : undefined
                      }
                    >
                      Shoulder {c.shoulder_pain}/10
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
