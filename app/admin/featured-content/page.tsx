import { createClient } from "@/lib/supabase/server";
import { FeaturedRow } from "@/components/admin/featured-row";

interface Featured {
  id: string;
  placement: string;
  content_type: string;
  headline: string | null;
  subheading: string | null;
  display_order: number;
  active: boolean;
}

export default async function AdminFeaturedPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("featured_content")
    .select("id, placement, content_type, headline, subheading, display_order, active")
    .order("placement")
    .order("display_order");

  return (
    <div>
      <h1 className="text-2xl font-bold">Featured content</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Curate the dashboard hero and discovery cards. Toggle items on or off.
      </p>
      <div className="mt-6 space-y-2">
        {(items as Featured[] | null)?.map((item) => (
          <FeaturedRow key={item.id} item={item} />
        ))}
        {(!items || items.length === 0) && (
          <p className="text-sm text-[var(--text-muted)]">
            No featured content yet.
          </p>
        )}
      </div>
    </div>
  );
}
