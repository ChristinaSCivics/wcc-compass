import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ChatClient } from "./ChatClient";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations").select("id, kind, status, decision_id").eq("id", id).single();
  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <ChatClient
      conversationId={conversation.id}
      kind={conversation.kind}
      decisionId={conversation.decision_id}
      initialMessages={messages ?? []}
    />
  );
}
