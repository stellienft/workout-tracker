import { requireUser } from "@/lib/auth";
import { getActiveEnrolment } from "@/lib/queries";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { EnrolmentControls } from "@/components/enrolment-controls";
import { CoverImage } from "@/components/ui/cover-image";
import Link from "next/link";

export const metadata = { title: "Current program" };

export default async function CurrentProgramPage() {
  const { user } = await requireUser();
  const enrolment = await getActiveEnrolment(user.id);

  if (!enrolment) {
    return (
      <PageShell>
        <PageHeader title="Current program" />
        <p className="mt-8 text-[var(--text-secondary)]">
          You&apos;re not enrolled in a program yet.{" "}
          <Link href="/programs" className="text-[var(--accent-primary)]">
            Browse programs
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  const p = enrolment.program;

  return (
    <PageShell>
      <PageHeader title="Current program" />
      <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
        <div className="relative h-40 w-full">
          <CoverImage path={p.cover_image_path} alt={p.name} sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--accent-primary)]">
              Week {enrolment.current_week} of {p.duration_weeks} ·{" "}
              <span className="capitalize">{enrolment.status}</span>
            </p>
            <h2 className="text-2xl font-bold">{p.name}</h2>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-[var(--text-secondary)]">
            {p.short_description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-black"
            >
              Go to today&apos;s workout
            </Link>
            <Link
              href={`/programs/${p.slug}`}
              className="rounded-2xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm"
            >
              View program details
            </Link>
          </div>
          <div className="mt-4">
            <EnrolmentControls
              enrolmentId={enrolment.id}
              status={enrolment.status}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
