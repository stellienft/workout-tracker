import { NewProgramButton } from "@/components/admin/new-program-button";

export default function AdminNewProgramPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">New program</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Start a new draft program.
      </p>
      <div className="mt-6">
        <NewProgramButton />
      </div>
    </div>
  );
}
