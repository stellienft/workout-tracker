import { requireTrainer, getAuthContext } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "@/components/trainer/chat-view";

export const metadata = { title: "Messages" };

export default async function TrainerChatPage({
  searchParams,
}: {
  searchParams: { thread?: string };
}) {
  await requireTrainer();
  const { user } = await getAuthContext();
  const supabase = await createClient();

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
    .select(`
      id,
      client_id,
      last_message_at,
      created_at,
      client:client_id (email, full_name)
    `)
    .eq("tenant_id", tenant.id)
    .eq("trainer_id", user!.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  let messages: any[] = [];
  const activeThreadId = searchParams.thread;

  if (activeThreadId) {
    const { data: msgData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", activeThreadId)
      .order("created_at", { ascending: true })
      .limit(100);
    messages = msgData ?? [];
  }

  return (
    <PageShell>
      <PageHeader title="Messages" subtitle="Private chat with your clients." />
      <div className="mt-6">
        <ChatView
          threads={threads ?? []}
          messages={messages}
          activeThreadId={activeThreadId}
          currentUserId={user!.id}
        />
      </div>
    </PageShell>
  );
}
