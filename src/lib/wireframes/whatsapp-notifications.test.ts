import { describe, expect, it } from "vitest";

import { CONVERSATIONS, SETTINGS_USERS } from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import { visibleConversationsFor } from "@/lib/wireframes/whatsapp-access";
import {
  notificationBadgeCountFor,
  openNotification,
  whatsappNotificationsFor,
} from "@/lib/wireframes/whatsapp-notifications";
import type { AssignmentRecord } from "@/lib/wireframes/whatsapp-store";

/**
 * Batch 3B — WhatsApp notifications (§117).
 *
 * The interesting property is not that the right notifications appear; it is
 * that nothing outside the recipient's scope can leak through a title, a
 * preview or a count.
 */

const admin = userById(USER.arun);
const manager = userById(USER.vikram);
const lead = userById(USER.sneha);
const salesperson = userById(USER.divya);
const kavya = userById(USER.kavya);

/* 1 */
it("pings the assignee about a new reply, not their supervisors", () => {
  const w1 = CONVERSATIONS.find((c) => c.id === "w1")!;
  expect(w1.assignedToUserId).toBe(lead.id);

  const hers = whatsappNotificationsFor(lead).filter(
    (n) => n.kind === "new-reply" && n.conversationId === "w1",
  );
  expect(hers.length).toBe(1);

  for (const supervisor of [admin, manager]) {
    expect(
      whatsappNotificationsFor(supervisor).filter(
        (n) => n.kind === "new-reply",
      ),
      supervisor.role,
    ).toEqual([]);
  }
});

/* 2 */
it("sends unassigned-queue notifications only to Admins and Managers", () => {
  for (const supervisor of [admin, manager]) {
    const queue = whatsappNotificationsFor(supervisor).filter(
      (n) => n.kind === "unassigned-queue",
    );
    expect(queue.length, supervisor.role).toBeGreaterThan(0);
    // §117: opening one leads to a view-only conversation.
    for (const n of queue) expect(n.opensReadOnly).toBe(true);
  }
  for (const operational of [lead, salesperson, kavya]) {
    expect(
      whatsappNotificationsFor(operational).filter(
        (n) => n.kind === "unassigned-queue",
      ),
      operational.name,
    ).toEqual([]);
  }
});

/* 3 */
it("keeps a queue notification free of the contact's name, number and message", () => {
  const queue = whatsappNotificationsFor(admin).filter(
    (n) => n.kind === "unassigned-queue",
  );
  for (const n of queue) {
    const conversation = CONVERSATIONS.find((c) => c.id === n.conversationId)!;
    const text = `${n.title} ${n.preview}`;
    expect(text).not.toContain(conversation.phone);
    expect(text).not.toContain(conversation.lastMessage);
  }
});

/* 4 */
it("never names anybody outside the recipient's permitted scope", () => {
  for (const user of SETTINGS_USERS) {
    const permitted = visibleConversationsFor(user);
    const text = whatsappNotificationsFor(user)
      .map((n) => `${n.title} ${n.preview}`)
      .join(" | ");
    for (const c of CONVERSATIONS) {
      if (permitted.some((p) => p.id === c.id)) continue;
      expect(text, `${user.name} / ${c.id}`).not.toContain(c.phone);
      expect(text, `${user.name} / ${c.id}`).not.toContain(c.recordLabel);
      expect(text, `${user.name} / ${c.id}`).not.toContain(c.lastMessage);
    }
  }
});

/* 5 */
it("scopes the badge count the same way as the list", () => {
  for (const user of SETTINGS_USERS) {
    expect(notificationBadgeCountFor(user), user.name).toBe(
      whatsappNotificationsFor(user).length,
    );
  }
  // And it genuinely differs by role, rather than being one shared number.
  const counts = new Set(
    [admin, manager, lead, salesperson].map((u) =>
      notificationBadgeCountFor(u),
    ),
  );
  expect(counts.size).toBeGreaterThan(1);
});

/* 6 */
it("tells the assignee when their own message failed", () => {
  const failedForLead = CONVERSATIONS.filter(
    (c) => c.assignedToUserId === lead.id && c.delivery === "failed",
  );
  expect(failedForLead.length).toBeGreaterThan(0);
  const notified = whatsappNotificationsFor(lead).filter(
    (n) => n.kind === "message-failed",
  );
  expect(notified.map((n) => n.conversationId).sort()).toEqual(
    failedForLead.map((c) => c.id).sort(),
  );
});

/* 7 */
it("raises nothing for a successful outgoing message", () => {
  // §117: "do not generate a user notification for every successful outgoing
  // message." Sent, Delivered and Read must produce none.
  const settled = CONVERSATIONS.filter(
    (c) =>
      c.assignedToUserId === lead.id &&
      c.lastDirection === "out" &&
      c.delivery !== "failed",
  );
  expect(settled.length).toBeGreaterThan(0);
  const ids = whatsappNotificationsFor(lead).map((n) => n.conversationId);
  for (const c of settled) expect(ids, c.id).not.toContain(c.id);
});

/* 8 */
it("announces an assignment to the person who received it, and nobody else", () => {
  const assigned = CONVERSATIONS.find((c) => c.id === "w3")!;
  const record: AssignmentRecord = {
    conversationId: assigned.id,
    byUserId: admin.id,
    toUserId: USER.ajay,
    at: "Today",
  };
  const conversations = CONVERSATIONS.map((c) =>
    c.id === assigned.id ? { ...c, assignedToUserId: USER.ajay } : c,
  );

  const ajay = userById(USER.ajay);
  const mine = whatsappNotificationsFor(ajay, conversations, [record]);
  expect(mine.filter((n) => n.kind === "assigned-to-you").length).toBe(1);

  expect(
    whatsappNotificationsFor(lead, conversations, [record]).filter(
      (n) => n.kind === "assigned-to-you",
    ),
  ).toEqual([]);
});

/* 9 */
it("drops an assignment notification once the conversation moves out of scope", () => {
  // The record still says it was given to Ajay, but it has since been moved
  // into Sneha's team. Deriving from what he may currently see is what stops
  // the stale record producing a notification about somebody else's work.
  const record: AssignmentRecord = {
    conversationId: "w3",
    byUserId: admin.id,
    toUserId: USER.ajay,
    at: "Today",
  };
  const movedAway = CONVERSATIONS.map((c) =>
    c.id === "w3" ? { ...c, assignedToUserId: lead.id } : c,
  );
  const ajay = userById(USER.ajay);
  expect(whatsappNotificationsFor(ajay, movedAway, [record])).toEqual([]);
});

/* 10 */
it("reauthorizes on open and denies safely once scope has changed", () => {
  const record: AssignmentRecord = {
    conversationId: "w3",
    byUserId: admin.id,
    toUserId: USER.ajay,
    at: "Today",
  };
  const afterAssignment = CONVERSATIONS.map((c) =>
    c.id === "w3" ? { ...c, assignedToUserId: USER.ajay } : c,
  );
  const ajay = userById(USER.ajay);
  const notification = whatsappNotificationsFor(ajay, afterAssignment, [
    record,
  ])[0]!;

  // Still his: it opens.
  expect(openNotification(ajay, notification, afterAssignment).ok).toBe(true);

  // Reassigned into another team afterwards: refused, and the refusal says
  // nothing about where it went or who holds it.
  const movedAway = CONVERSATIONS.map((c) =>
    c.id === "w3" ? { ...c, assignedToUserId: lead.id } : c,
  );
  const denied = openNotification(ajay, notification, movedAway);
  expect(denied.ok).toBe(false);
  if (denied.ok) return;
  expect(denied.message).not.toContain(lead.name);
  expect(denied.message).not.toContain("Health");
  expect(denied.message).not.toContain("reassigned");
});

/* 10 */
it("opens a queue notification read-only for the supervisor who got it", () => {
  const queue = whatsappNotificationsFor(admin).find(
    (n) => n.kind === "unassigned-queue",
  )!;
  const opened = openNotification(admin, queue);
  expect(opened.ok).toBe(true);
  expect(opened.ok === true && opened.readOnly).toBe(true);
});

/* 11 */
it("gives a user who is not active nothing at all", () => {
  const inactive = SETTINGS_USERS.filter((u) => u.status !== "Active");
  expect(inactive.length).toBeGreaterThan(0);
  for (const u of inactive) {
    expect(whatsappNotificationsFor(u), u.name).toEqual([]);
    expect(notificationBadgeCountFor(u), u.name).toBe(0);
  }
});

/* 12 */
it("only ever points at a conversation the recipient may open", () => {
  for (const user of SETTINGS_USERS) {
    const permitted = visibleConversationsFor(user).map((c) => c.id);
    for (const n of whatsappNotificationsFor(user)) {
      expect(permitted, `${user.name} / ${n.id}`).toContain(n.conversationId);
    }
  }
});

describe("notification identity", () => {
  /* 13 */
  it("keeps ids unique per recipient", () => {
    for (const user of SETTINGS_USERS) {
      const ids = whatsappNotificationsFor(user).map((n) => n.id);
      expect(new Set(ids).size, user.name).toBe(ids.length);
    }
  });
});
