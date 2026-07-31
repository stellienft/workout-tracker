"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Sparkles, Save, Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SCAN_BUCKET = "body-scans";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function BodyScanUpload({ isPro = false }: { isPro?: boolean } = {}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanText, setScanText] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Record<string, number | string | undefined> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      alert("File too large. Max 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userData.user.id}/${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage.from(SCAN_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
      });
      if (error) {
        alert(error.message || "Upload failed");
        return;
      }
      setImagePath(path);
      // Read the uploaded file straight away so the member doesn't also have to
      // paste the text — the server extracts the metrics from the image/PDF.
      await parseUploadedFile(path);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function parseUploadedFile(path: string) {
    setParsing(true);
    try {
      const { parseScanImage } = await import("@/lib/actions/body-composition");
      const res = await parseScanImage(path);
      if (res.ok && res.data) {
        setParsed(res.data as Record<string, number | string | undefined>);
      } else {
        alert(res.error ?? "Couldn't read that file. Paste the scan text instead.");
      }
    } catch {
      alert("Couldn't read that file. Paste the scan text instead.");
    } finally {
      setParsing(false);
    }
  }

  async function handleParse() {
    if (!scanText.trim()) {
      alert("Paste your scan results text first.");
      return;
    }
    setParsing(true);
    try {
      const { parseScanResult } = await import("@/lib/actions/body-composition");
      const res = await parseScanResult(scanText.trim());
      if (res.ok && res.data) {
        setParsed(res.data as Record<string, number | string | undefined>);
      } else {
        alert(res.error ?? "Could not parse scan.");
      }
    } catch {
      alert("Something went wrong.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { saveScanResult } = await import("@/lib/actions/body-composition");
      const data = parsed ?? {};
      const res = await saveScanResult({
        scanDate: data.scanDate as string | undefined,
        source: data.source as string | undefined,
        weightKg: data.weightKg as number | undefined,
        bodyFatPct: data.bodyFatPct as number | undefined,
        muscleMassKg: data.muscleMassKg as number | undefined,
        waterPct: data.waterPct as number | undefined,
        bmr: data.bmr as number | undefined,
        bmi: data.bmi as number | undefined,
        visceralFat: data.visceralFat as number | undefined,
        boneMassKg: data.boneMassKg as number | undefined,
        proteinKg: data.proteinKg as number | undefined,
        leftArmMass: data.leftArmMass as number | undefined,
        rightArmMass: data.rightArmMass as number | undefined,
        trunkMass: data.trunkMass as number | undefined,
        leftLegMass: data.leftLegMass as number | undefined,
        rightLegMass: data.rightLegMass as number | undefined,
        rawText: scanText,
        scanImagePath: imagePath ?? undefined,
      });
      if (res.ok) {
        alert("Scan saved!");
        router.refresh();
      } else {
        alert(res.error ?? "Could not save scan.");
      }
    } catch {
      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!isPro) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 text-center">
        <Lock className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Body Composition Scanning</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Upload your InBody, DEXA, or Evolt scan results and we&apos;ll automatically extract and track your body composition data.
        </p>
        <button
          onClick={() => router.push("/billing")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!parsed && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-[var(--accent-primary)] bg-[var(--accent-muted)]" : "border-[var(--border-subtle)]"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <UploadCloud className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {uploading
                ? "Uploading..."
                : parsing
                  ? "Reading your scan with AI…"
                  : imagePath
                    ? "File uploaded ✓"
                    : "Drag & drop or click to upload scan"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">PNG, JPG, WebP, or PDF (max 10 MB)</p>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-[var(--text-secondary)]">Or paste scan results text:</p>
            <textarea
              value={scanText}
              onChange={(e) => setScanText(e.target.value)}
              rows={5}
              placeholder="Paste the text from your InBody, DEXA, or Evolt scan results..."
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
            />
          </div>

          <button
            onClick={handleParse}
            disabled={parsing || !scanText.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
          >
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {parsing ? "Parsing..." : "Parse with AI"}
          </button>
        </>
      )}

      {parsed && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(parsed)
              .filter(([k]) => k !== "scanDate" && k !== "source")
              .map(([key, val]) => (
                val !== undefined && val !== null ? (
                  <div key={key} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</p>
                    <p className="text-lg font-bold">{String(val)}</p>
                  </div>
                ) : null
              ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save scan"}
            </button>
            <button
              onClick={() => setParsed(null)}
              className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)]"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
