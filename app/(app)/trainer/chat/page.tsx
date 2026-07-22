import { requireTrainer, getAuthContext } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { ChatView, type Message } from "@/components/trainer/chat-view";

export const metadata = { title: "Messages" };

export default async function TrainerChatPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  await requireTrainer();
  const { user } = await getAuthContext();
  const supabase = await createClient();
  const { thread: activeThreadId } = await searchParams;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  if (!tenant) {
    return (
      <PageShell>
        <PageHeader title="Messages" subtitle="No tenant found." />
      </PageShell>
    );
  }

  const { data: threads } = await supabase
    .from("chat_threads")
    .select("id, client_id, last_message_at, created_at")
    .eq("tenant_id", tenant.id)
    .eq("trainer_id", user!.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  // chat_threads.client_id references auth.users (not profiles), so fetch the
  // client profiles separately and merge — an embed has no FK to resolve.
  const clientIds = (threads ?? []).map((t) => t.client_id as string);
  const { data: clientProfiles } = clientIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", clientIds)
    : { data: [] };
  const profileById = new Map(
    (clientProfiles ?? []).map((p) => [p.id as string, p])
  );

  const threadList = (threads ?? []).map((t) => {
    const p = profileById.get(t.client_id as string);
    return {
      ...t,
      client: p
        ? { email: p.email as string, full_name: p.full_name as string | null }
        : null,
    };
  });

  let messages: Message[] = [];

  if (activeThreadId) {
    const { data: msgData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", activeThreadId)
      .order("created_at", { ascending: true })
      .limit(100);
    messages = (msgData ?? []) as Message[];
  }

  return (
    <PageShell>
      <PageHeader title="Messages" subtitle="Private chat with your clients." />
      <div className="mt-6">
        <ChatView
          threads={threadList}
          messages={messages}
          activeThreadId={activeThreadId}
          currentUserId={user!.id}
        />
      </div>
    </PageShell>
  );
}
