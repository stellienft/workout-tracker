"use client";

import { useState, useTransition } from "react";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { exportMyData, deleteMyAccount } from "@/lib/actions/account";

export function AccountDataControls() {
  const toast = useToast();
  const [exporting, startExport] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  function onExport() {
    startExport(async () => {
      const res = await exportMyData();
      if (!res.ok) {
        toast(res.error ?? "Couldn't export your data.", "error");
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Your data has been downloaded.", "success");
    });
  }

  function onDelete() {
    startDelete(async () => {
      // deleteMyAccount redirects on success; it only returns on failure.
      const res = await deleteMyAccount();
      if (res && !res.ok) toast(res.error ?? "Couldn't delete your account.", "error");
    });
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
          <Download className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Export my data</span>
          <span className="block text-xs text-[var(--text-muted)]">
            Download a JSON copy of your profile, workouts and logs.
          </span>
        </span>
        <button
          onClick={onExport}
          disabled={exporting}
          className="shrink-0 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium hover:border-[var(--border-active)] disabled:opacity-50"
        >
          {exporting ? "Preparing…" : "Export"}
        </button>
      </div>

      <div className="p-4">
        {!confirmOpen ? (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
              <Trash2 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Delete my account</span>
              <span className="block text-xs text-[var(--text-muted)]">
                Permanently remove your account and all your data.
              </span>
            </span>
            <button
              onClick={() => setConfirmOpen(true)}
              className="shrink-0 rounded-xl border border-[var(--danger)]/40 px-3 py-2 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--danger)]" />
              <div>
                <p className="text-sm font-semibold text-[var(--danger)]">
                  This can&apos;t be undone
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Your workouts, progress, photos and messages will be permanently
                  deleted. Consider exporting your data first. Type{" "}
                  <span className="font-mono font-semibold">DELETE</span> to confirm.
                </p>
              </div>
            </div>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              className="mt-3 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--danger)] focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={onDelete}
                disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
                className="flex-1 rounded-xl bg-[var(--danger)] py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                }}
                disabled={deleting}
                className="rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
