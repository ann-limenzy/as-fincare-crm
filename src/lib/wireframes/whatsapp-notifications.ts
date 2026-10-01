/**
 * WhatsApp notifications (spec §117).
 *
 * Every notification is DERIVED from the conversations the recipient is
 * already permitted to see, rather than assembled first and filtered later.
 * §117 requires that a notification "must never reveal a conversation,
 * message content, customer name, phone number or record outside the
 * recipient's permitted scope — including in its title, preview text or badge
 * count", and the surest way to honour that is to make an out-of-scope
 * notification impossible to construct.
 */
import {
  CONVERSATIONS,
  type Conversation,
  type SettingsUser,
} from "@/lib/wireframes/mock-data";
import {
  mayViewConversation,
  maySeeUnassignedQueue,
} from "@/lib/wireframes/whatsapp-access";
import type { AssignmentRecord } from "@/lib/wireframes/whatsapp-store";

export type WhatsAppNotificationKind =
  "new-reply" | "assigned-to-you" | "message-failed" | "unassigned-queue";

export type WhatsAppNotification = {
  readonly id: string;
  readonly kind: WhatsAppNotificationKind;
  readonly conversationId: string;
  readonly title: string;
  /** Preview text. Held to the same scope as the title (§117). */
  readonly preview: string;
  /**
   * §117: an unassigned-queue notification "leads to a view-only
   * conversation with no reply composer".
   */
  readonly opensReadOnly: boolean;
};

/**
 * The notifications `user` would receive, newest concern first.
 *
 * §117 also says not to "generate a user notification for every successful
 * outgoing message", so Sent, Delivered and Read produce nothing.
 */
export function whatsappNotificationsFor(
  user: SettingsUser,
  from: readonly Conversation[] = CONVERSATIONS,
  assignments: readonly AssignmentRecord[] = [],
): readonly WhatsAppNotification[] {
  if (user.status !== "Active") return [];

  const out: WhatsAppNotification[] = [];
  const visible = from.filter((c) => mayViewConversation(user, c));

  for (const record of assignments) {
    if (record.toUserId !== user.id) continue;
    const conversation = visible.find((c) => c.id === record.conversationId);
    if (!conversation) continue;
    out.push({
      id: `assigned-${conversation.id}`,
      kind: "assigned-to-you",
      conversationId: conversation.id,
      title: `${conversation.person} was assigned to you`,
      preview: conversation.recordLabel,
      opensReadOnly: false,
    });
  }

  for (const conversation of visible) {
    // §117: "new WhatsApp reply on a conversation you are assigned" — the
    // assignee's own notification, not their supervisor's. A Team Lead still
    // sees the conversation in the inbox; they are not pinged for it.
    if (
      conversation.assignedToUserId === user.id &&
      conversation.unread > 0 &&
      conversation.lastDirection === "in"
    ) {
      out.push({
        id: `reply-${conversation.id}`,
        kind: "new-reply",
        conversationId: conversation.id,
        title: `New WhatsApp reply from ${conversation.person}`,
        preview: conversation.lastMessage,
        opensReadOnly: false,
      });
    }

    if (
      conversation.assignedToUserId === user.id &&
      conversation.delivery === "failed"
    ) {
      out.push({
        id: `failed-${conversation.id}`,
        kind: "message-failed",
        conversationId: conversation.id,
        title: `Message to ${conversation.person} failed`,
        preview: "Open the conversation to see the reason and retry.",
        opensReadOnly: false,
      });
    }

    if (conversation.assignedToUserId === null && maySeeUnassignedQueue(user)) {
      out.push({
        id: `queue-${conversation.id}`,
        kind: "unassigned-queue",
        conversationId: conversation.id,
        title: "A conversation is waiting to be assigned",
        // No name, no number and no message text: the point of the
        // notification is that somebody has to assign it, and an unassigned
        // conversation has no owner whose scope the detail would sit in.
        preview: "Nobody can reply until it is assigned to a Team Lead.",
        opensReadOnly: true,
      });
    }
  }

  return out;
}

/** §117: unread counts are scoped the same way as the notifications. */
export function notificationBadgeCountFor(
  user: SettingsUser,
  from: readonly Conversation[] = CONVERSATIONS,
  assignments: readonly AssignmentRecord[] = [],
): number {
  return whatsappNotificationsFor(user, from, assignments).length;
}

export type NotificationOpen =
  | {
      readonly ok: true;
      readonly conversationId: string;
      /** True for the unassigned queue, where no composer may appear. */
      readonly readOnly: boolean;
    }
  | { readonly ok: false; readonly message: string };

/**
 * §117 "Reauthorization on open".
 *
 * The notification is not a capability. Access is checked again against the
 * CURRENT conversation state, so a conversation reassigned into another team
 * after the notification was created is refused — and the refusal says only
 * that the item is gone, never where it went, who holds it or what it said.
 */
export function openNotification(
  user: SettingsUser,
  notification: WhatsAppNotification,
  from: readonly Conversation[] = CONVERSATIONS,
): NotificationOpen {
  const conversation = from.find((c) => c.id === notification.conversationId);
  if (!conversation || !mayViewConversation(user, conversation)) {
    return {
      ok: false,
      message: "This is no longer available to you.",
    };
  }
  if (
    notification.kind === "unassigned-queue" &&
    conversation.assignedToUserId !== null
  ) {
    // It has since been assigned. Whether this user may still open it is
    // decided above; what is certain is that the queue notification's own
    // premise has expired.
    return {
      ok: true,
      conversationId: conversation.id,
      readOnly: false,
    };
  }
  return {
    ok: true,
    conversationId: conversation.id,
    readOnly: notification.opensReadOnly,
  };
}
