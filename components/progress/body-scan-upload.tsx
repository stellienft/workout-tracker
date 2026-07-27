"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, Sparkles, Save, X, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  parseScanResult,
  saveScanResult,
  type ParsedScanData,
} from "@/lib/actions/body-composition";

const SCAN_BUCKET = "body-scans";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

function fileExt(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";
  const dot = file.name.lastIndexOf(".");
  return dot > -1 ? file.name.slice(dot + 1).toLowerCase() : "jpg";
}

// ── Field config for editable grid ──────────────────────────
interface FieldDef {
  key: keyof ParsedScanData;
  label: string;
  unit?: string;
  step?: string;
}

const METRIC_FIELDS: FieldDef[] = [
  { key: "weightKg", label: "Weight", unit: "kg", step: "0.1" },
  { key: "bodyFatPct", label: "Body Fat", unit: "%", step: "0.1" },
  { key: "muscleMassKg", label: "Muscle Mass", unit: "kg", step: "0.1" },
  { key: "waterPct", label: "Water", unit: "%", step: "0.1" },
  { key: "bmr", label: "BMR", unit: "kcal" },
  { key: "bmi", label: "BMI", unit: "", step: "0.1" },
  { key: "visceralFat", label: "Visceral Fat", unit: "lvl", step: "0.1" },
  { key: "boneMassKg", label: "Bone Mass", unit: "kg", step: "0.1" },
  { key: "proteinKg", label: "Protein", unit: "kg", step: "0.1" },
];

const SEGMENTAL_FIELDS: FieldDef[] = [
  { key: "leftArmMass", label: "L. Arm", unit: "kg", step: "0.01" },
  { key: "rightArmMass", label: "R. Arm", unit: "kg", step: "0.01" },
  { key: "trunkMass", label: "Trunk", unit: "kg", step: "0.01" },
  { key: "leftLegMass", label: "L. Leg", unit: "kg", step: "0.01" },
  { key: "rightLegMass", label: "R. Leg", unit: "kg", step: "0.01" },
];

const SOURCES = [
  { value: "inbody", label: "InBody" },
  { value: "dexa", label: "DEXA" },
  { value: "evolt", label: "Evolt" },
  { value: "other", label: "Other" },
] as const;

// ── Component ──────────────────────────────────────────────

export function BodyScanUpload({
  isPro = false,
  onSaved,
}: {
  isPro?: boolean;
  onSaved?: () => void;
} = {}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [scanText, setScanText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedScanData | null>(null);
  const [editData, setEditData] = useState<ParsedScanData | null>(null);
  const [scanDate, setScanDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── File handling ────────────────────────────────────────

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError("File is too large (max 10 MB).");
      return;
    }
    if (f.type && !ACCEPTED_TYPES.includes(f.type)) {
      setError("Use a PNG, JPEG, WebP image or PDF.");
      return;
    }
    setError(null);
    setFile(f);
    if (f.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(f));
    } else {
      setFilePreview(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function clearFile() {
    setFile(null);
    setFilePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Upload to storage ───────────────────────────────────

  async function uploadFile(): Promise<string | null> {
    if (!file) return null;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in again.");
      setUploading(false);
      return null;
    }

    const path = `${user.id}/${crypto.randomUUID()}.${fileExt(file)}`;
    const { error: upErr } = await supabase.storage
      .from(SCAN_BUCKET)
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    setUploading(false);
    if (upErr) {
      setError(upErr.message || "Couldn't upload. Try again.");
      return null;
    }
    setUploadedPath(path);
    return path;
  }

  // ── Parse with AI ───────────────────────────────────────

  async function handleParse() {
    setError(null);
    setSuccess(null);

    if (!scanText.trim() && !file) {
      setError("Paste your scan text or upload a scan image/PDF first.");
      return;
    }

    // Upload file first if provided
    if (file && !uploadedPath) {
      const path = await uploadFile();
      if (!path) return;
    }

    if (!scanText.trim()) {
      setError(
        "Please paste the text from your scan results so the AI can parse it. Image OCR is coming soon."
      );
      return;
    }

    setParsing(true);
    const res = await parseScanResult(scanText);
    setParsing(false);

    if (!res.ok || !res.data) {
      setError(res.error ?? "Could not parse scan.");
      return;
    }

    const data = res.data;
    setParsed(data);
    setEditData(data);
    if (data.scanDate) setScanDate(data.scanDate);
    if (data.source) setSource(data.source);
    setSuccess("Scan parsed! Review and edit the values below before saving.");
  }

  // ── Save to database ────────────────────────────────────

  async function handleSave() {
    setError(null);
    setSaving(true);

    const dataToSave = editData ?? parsed;
    const res = await saveScanResult({
      scanDate,
      source,
      weightKg: dataToSave?.weightKg,
      bodyFatPct: dataToSave?.bodyFatPct,
      muscleMassKg: dataToSave?.muscleMassKg,
      waterPct: dataToSave?.waterPct,
      bmr: dataToSave?.bmr,
      bmi: dataToSave?.bmi,
      visceralFat: dataToSave?.visceralFat,
      boneMassKg: dataToSave?.boneMassKg,
      proteinKg: dataToSave?.proteinKg,
      leftArmMass: dataToSave?.leftArmMass,
      rightArmMass: dataToSave?.rightArmMass,
      trunkMass: dataToSave?.trunkMass,
      leftLegMass: dataToSave?.leftLegMass,
      rightLegMass: dataToSave?.rightLegMass,
      rawText: scanText || undefined,
      scanImagePath: uploadedPath ?? undefined,
    });

    setSaving(false);

    if (!res.ok) {
      setError(res.error ?? "Could not save scan.");
      return;
    }

    setSuccess("Body composition scan saved!");
    // Reset state
    setParsed(null);
    setEditData(null);
    setScanText("");
    clearFile();
    setUploadedPath(null);
    router.refresh();
    onSaved?.();
  }

  // ── Save manually (no AI parse) ────────────────────────

  async function handleManualSave() {
    setError(null);

    // Ensure file is uploaded if provided
    if (file && !uploadedPath) {
      const path = await uploadFile();
      if (!path) return;
    }

    // If no parsed data yet, start with empty for manual entry
    if (!editData) {
      setEditData({});
      setParsed({});
    }
    setSuccess("Enter your scan values below and save when ready.");
  }

  // ── Edit helpers ────────────────────────────────────────

  function updateField(key: keyof ParsedScanData, value: string) {
    if (!editData) return;
    const num = value === "" ? undefined : Number(value);
    setEditData({
      ...editData,
      [key]: num !== undefined && !isNaN(num) ? num : undefined,
    });
  }

  // ── Render ──────────────────────────────────────────────

  if (!isPro) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 text-center">
        <Lock className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
          Body Composition Scanning
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Upload your InBody, DEXA, or Evolt scan results and we'll automatically
          extract and track your body composition data.
        </p>
        <button
          onClick={() => router.push("/billing")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload + paste area */}
      {!editData && !parsed && (
        <div className="space-y-4">
          {/* Drag-and-drop / file picker */}
          <div
            ref={dragRef}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver
                ? "border-[var(--accent-primary)] bg-[var(--accent-muted)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-secondary)] hover:border-[var(--text-muted)]"
            )}
          >
            {filePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={filePreview}
                alt="Scan preview"
                className="max-h-40 rounded-lg object-contain"
              />
            ) : file ? (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <FileText className="h-8 w-8" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-[var(--text-muted)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Drop a scan image/PDF or click to browse
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  PNG, JPEG, WebP or PDF · max 10 MB
                </p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {file && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
            >
              <X className="h-3.5 w-3.5" /> Remove file
            </button>
          )}

          {/* Paste text area */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
              Paste scan results text
            </p>
            <textarea
              value={scanText}
              onChange={(e) => setScanText(e.target.value)}
              rows={6}
              placeholder={
                "Paste the text from your InBody, DEXA, or Evolt scan results here. " +
                "The AI will extract the numbers automatically."
              }
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleParse}
              disabled={parsing || uploading || (!scanText.trim() && !file)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {uploading
                ? "Uploading…"
                : parsing
                  ? "Parsing…"
                  : "Upload & Parse"}
            </button>
            <button
              onClick={handleManualSave}
              disabled={saving || uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--text-muted)] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Enter manually
            </button>
          </div>
        </div>
      )}

      {/* Parsed data preview / edit */}
      {editData && (
        <div className="space-y-4">
          {/* Date + source */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Scan date
              </label>
              <input
                type="date"
                value={scanDate}
                onChange={(e) => setScanDate(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              >
                <option value="">—</option>
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Body composition metrics */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Body Composition
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {METRIC_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                    {f.label}
                    {f.unit && (
                      <span className="text-[var(--text-muted)]"> ({f.unit})</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step={f.step ?? "1"}
                    value={
                      editData[f.key] !== undefined && editData[f.key] !== null
                        ? String(editData[f.key])
                        : ""
                    }
                    onChange={(e) => updateField(f.key, e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Segmental measurements */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Segmental Muscle Mass
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SEGMENTAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                    {f.label}
                    {f.unit && (
                      <span className="text-[var(--text-muted)]"> ({f.unit})</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step={f.step ?? "0.01"}
                    value={
                      editData[f.key] !== undefined && editData[f.key] !== null
                        ? String(editData[f.key])
                        : ""
                    }
                    onChange={(e) => updateField(f.key, e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save / cancel */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving…" : "Save scan"}
            </button>
            <button
              onClick={() => {
                setEditData(null);
                setParsed(null);
              }}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--text-muted)] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-muted)] p-3 text-sm text-[var(--text-primary)]">
          <Check className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
          {success}
        </div>
      )}
    </div>
  );
}
