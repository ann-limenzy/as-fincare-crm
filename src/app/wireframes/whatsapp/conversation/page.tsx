import { ConversationScreen } from "@/components/wireframes/whatsapp/conversation-screen";
import { StepFooter } from "@/components/wireframes/presentation-chrome";

/**
 * The inbox links each row to its own conversation, so the Unassigned queue
 * can open the unknown-number thread rather than always landing on the
 * built-out one. `conversation` is read on the server and handed down as a
 * plain string; the screen validates it against what the viewer may see and
 * never falls back to a different conversation.
 *
 * Reading searchParams makes this route dynamic, matching the pattern the
 * customer record route already uses for the same reason.
 */
export default async function Page({
  searchParams,
}: PageProps<"/wireframes/whatsapp/conversation">) {
  const { conversation } = await searchParams;
  return (
    <>
      <ConversationScreen
        conversationId={typeof conversation === "string" ? conversation : null}
      />
      <StepFooter />
    </>
  );
}
