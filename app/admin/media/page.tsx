import { createClient } from "@/lib/supabase/server";
import { MediaRow } from "@/components/admin/media-row";
import type { ContentStatus } from "@/lib/types";

interface MediaAsset {
  id: string;
  storage_path: string;
  alt_text: string | null;
  status: ContentStatus;
}

export default async function AdminMediaPage() {
  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, storage_path, alt_text, status")
    .order("status")
    .order("storage_path")
    .limit(500);

  const drafts = (assets ?? []).filter((a) => a.status === "draft");

  return (
    <div>
      <h1 className="text-2xl font-bold">Media</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Placeholder image records are marked draft. Upload the real asset to the
        Supabase <code className="text-[var(--accent-primary)]">media</code> bucket
        at the given path, then publish.
      </p>

      {drafts.length > 0 && (
        <p className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm text-[var(--warning)]">
          {drafts.length} placeholder image record{drafts.length === 1 ? "" : "s"}{" "}
          still need a real upload.
        </p>
      )}

      <div className="mt-6 space-y-2">
        {(assets as MediaAsset[] | null)?.map((a) => (
          <MediaRow key={a.id} asset={a} />
        ))}
      </div>
    </div>
  );
}
