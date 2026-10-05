import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CONVERSATIONS,
  CONVERSATION_THREADS,
  LINKED_RECORDS,
  THREADS_BY_CONVERSATION,
} from "@/lib/wireframes/mock-data";
import { planLineage } from "@/lib/wireframes/catalogue";
import { purchaseById } from "@/lib/wireframes/customer-purchase";
import {
  messagesFor,
  resetConversationStore,
  retryMessage,
  sendMessage,
} from "@/lib/wireframes/whatsapp-store";
import {
  isTemplateSelectable,
  previewTemplate,
} from "@/lib/wireframes/whatsapp-messaging";
import { TEMPLATES } from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";

/**
 * Message history must never cross between conversations.
 *
 * The shared seeded thread used to be the fallback for every conversation, so
 * Vikram Reddy's screen displayed Ramesh Kumar's insurer, plan and renewal date.
 * §89.1 governs what a user may see of another user's conversations; a customer's
 * policy appearing inside a different customer's thread is worse than that,
 * because no permission setting could ever make it correct.
 */

const RAMESH = "w1";
const VIKRAM = "w9";

/** Words that belong to exactly one customer, for leak detection. */
const RAMESH_ONLY = [
  "Ramesh",
  "Family Health Optima",
  "Star Health",
  "26 September 2026",
  "POL-TEST-881-A",
];
const VIKRAM_ONLY = [
  "Vikram",
  "Private Car Comprehensive",
  "20 September 2026",
  "POL-TEST-904-A",
];

beforeEach(() => resetConversationStore());
afterEach(() => resetConversationStore());

function bodyOf(conversationId: string): string {
  return messagesFor(conversationId)
    .map((m) => `${m.body} ${m.template ?? ""} ${m.failureReason ?? ""}`)
    .join(" | ");
}

/* --------------------------------------------- 1. every message is scoped */

describe("seeded history is scoped by conversation", () => {
  /* 1 */
  it("gives every conversation its own thread, with no shared array", () => {
    for (const conversation of CONVERSATIONS) {
      const thread = CONVERSATION_THREADS[conversation.id];
      expect(thread, conversation.id).toBeDefined();
      expect(thread!.length, conversation.id).toBeGreaterThan(0);
    }
    // No two conversations hold the same array instance, so appending to one
    // cannot append to another.
    const seen = new Set<readonly unknown[]>();
    for (const conversation of CONVERSATIONS) {
      const thread = CONVERSATION_THREADS[conversation.id]!;
      expect(seen.has(thread), conversation.id).toBe(false);
      seen.add(thread);
    }
  });

  /* 1b */
  it("gives every seeded message an id belonging to one conversation", () => {
    const owners = new Map<string, string>();
    for (const conversation of CONVERSATIONS) {
      for (const message of CONVERSATION_THREADS[conversation.id]!) {
        // No message id appears under two conversations.
        expect(owners.has(message.id), message.id).toBe(false);
        owners.set(message.id, conversation.id);
        // And the id names its own conversation.
        expect(message.id, message.id).toContain(conversation.id);
      }
    }
    expect(owners.size).toBeGreaterThan(CONVERSATIONS.length);
  });
});

/* --------------------------------------- 2, 3. no cross-customer content */

describe("no conversation shows another customer's data", () => {
  /* 2 */
  it("keeps Ramesh out of Vikram's thread", () => {
    const text = bodyOf(VIKRAM);
    expect(text.length).toBeGreaterThan(0);
    for (const term of RAMESH_ONLY) {
      expect(text, term).not.toContain(term);
    }
    // Vikram's own policy IS there.
    expect(text).toContain("Private Car Comprehensive");
    expect(text).toContain("20 September 2026");
  });

  /* 3 */
  it("keeps Vikram out of Ramesh's thread", () => {
    const text = bodyOf(RAMESH);
    for (const term of VIKRAM_ONLY) {
      expect(text, term).not.toContain(term);
    }
    expect(text).toContain("Family Health Optima");
  });

  /* 2b */
  it("lets no conversation mention another conversation's customer", () => {
    for (const conversation of CONVERSATIONS) {
      const text = bodyOf(conversation.id);
      for (const other of CONVERSATIONS) {
        if (other.id === conversation.id) continue;
        if (other.recordType === "Unknown") continue;
        // No other person's name, and no other person's phone number.
        const firstName = other.person.split(" ")[0]!;
        if (firstName === conversation.person.split(" ")[0]) continue;
        expect(text, `${conversation.id} leaked ${other.person}`).not.toContain(
          other.person,
        );
        expect(text, `${conversation.id} leaked ${other.phone}`).not.toContain(
          other.phone,
        );
      }
    }
  });

  /* 2c */
  it("lets no conversation mention another record's policy reference", () => {
    for (const conversation of CONVERSATIONS) {
      const text = bodyOf(conversation.id);
      const ownRefs = new Set(
        (conversation.linkedRecordId
          ? (LINKED_RECORDS.find((r) => r.id === conversation.linkedRecordId)
              ?.purchases ?? [])
          : []
        ).map((p) => p.policyReference),
      );
      for (const record of LINKED_RECORDS) {
        for (const purchase of record.purchases) {
          if (ownRefs.has(purchase.policyReference)) continue;
          expect(
            text,
            `${conversation.id} leaked ${purchase.policyReference}`,
          ).not.toContain(purchase.policyReference);
        }
      }
    }
  });
});

/* ------------------------------------------- 4. no fallback for unknown ids */

describe("an unknown conversation gets nothing", () => {
  /* 4 */
  it("returns an empty thread rather than another conversation's", () => {
    for (const unknown of ["w-nope", "", "cp-881-a", "c881"]) {
      expect(messagesFor(unknown), unknown).toEqual([]);
    }
    // Emphatically not the first conversation's history.
    const first = CONVERSATIONS[0]!;
    expect(messagesFor("w-nope")).not.toEqual(messagesFor(first.id));
    expect(messagesFor("w-nope").length).toBe(0);
  });

  /* 4b */
  it("seeds only conversations that exist", () => {
    for (const id of Object.keys(THREADS_BY_CONVERSATION)) {
      expect(
        CONVERSATIONS.some((c) => c.id === id),
        id,
      ).toBe(true);
    }
  });
});

/* ------------------------------------- 5, 6. sending and retrying are scoped */

describe("store writes touch one conversation only", () => {
  /* 5 */
  it("leaves every other thread untouched when one conversation sends", () => {
    const before = new Map(
      CONVERSATIONS.map((c) => [c.id, messagesFor(c.id).length]),
    );
    sendMessage(RAMESH, { body: "A reply only Ramesh should see." });

    expect(messagesFor(RAMESH).length).toBe(before.get(RAMESH)! + 1);
    for (const conversation of CONVERSATIONS) {
      if (conversation.id === RAMESH) continue;
      expect(messagesFor(conversation.id).length, conversation.id).toBe(
        before.get(conversation.id)!,
      );
      expect(bodyOf(conversation.id), conversation.id).not.toContain(
        "only Ramesh should see",
      );
    }
  });

  /* 6 */
  it("appends a retry to the one conversation it belongs to", () => {
    const failed = messagesFor(RAMESH).find((m) => m.delivery === "failed")!;
    const before = new Map(
      CONVERSATIONS.map((c) => [c.id, messagesFor(c.id).length]),
    );

    const attempt = retryMessage(RAMESH, failed.id);
    expect(attempt).not.toBeNull();
    expect(messagesFor(RAMESH).length).toBe(before.get(RAMESH)! + 1);
    for (const conversation of CONVERSATIONS) {
      if (conversation.id === RAMESH) continue;
      expect(messagesFor(conversation.id).length, conversation.id).toBe(
        before.get(conversation.id)!,
      );
      expect(
        messagesFor(conversation.id).some((m) => m.id === attempt!.id),
        conversation.id,
      ).toBe(false);
    }
  });

  /* 6b */
  it("cannot retry a message id that belongs to another conversation", () => {
    const rameshFailed = messagesFor(RAMESH).find(
      (m) => m.delivery === "failed",
    )!;
    const before = messagesFor(VIKRAM).length;
    // Vikram's thread does not contain that id, so there is nothing to retry.
    expect(retryMessage(VIKRAM, rameshFailed.id)).toBeNull();
    expect(messagesFor(VIKRAM).length).toBe(before);
  });

  /* 6c */
  it("restores every thread independently on reset", () => {
    sendMessage(RAMESH, { body: "One." });
    sendMessage(VIKRAM, { body: "Two." });
    resetConversationStore();
    for (const conversation of CONVERSATIONS) {
      expect(messagesFor(conversation.id), conversation.id).toEqual(
        CONVERSATION_THREADS[conversation.id],
      );
    }
  });
});

/* --------------------------- 7. templates resolve from the linked purchase */

describe("a populated template uses the conversation's own purchase (§98)", () => {
  /* 7 */
  it("matches the canonical Customer Purchase behind that conversation", () => {
    const renewalTemplate = TEMPLATES.find(
      (t) =>
        isTemplateSelectable(t) &&
        t.variables.includes("policy_reference_number"),
    );
    const admin = userById(USER.arun);
    let checked = 0;

    for (const conversation of CONVERSATIONS) {
      if (conversation.linkedRecordId === null) continue;
      const record = LINKED_RECORDS.find(
        (r) => r.id === conversation.linkedRecordId,
      )!;
      for (const view of record.purchases) {
        const canonical = purchaseById(view.customerPurchaseId)!;
        const lineage = planLineage(canonical.planId);
        expect(lineage.ok, view.id).toBe(true);
        if (!lineage.ok) continue;
        // The WhatsApp-facing values are the canonical ones, field by field.
        expect(view.planSubProduct).toBe(lineage.lineage.plan.name);
        expect(view.provider).toBe(lineage.lineage.provider.name);
        expect(view.policyReference).toBe(canonical.policyReference ?? "");
        expect(view.renewalDate).toBe(canonical.renewalDate ?? "");
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(renewalTemplate).toBeDefined();
    void admin;
  });

  /* 7b */
  it("previews only the chosen purchase's own policy number", () => {
    const admin = userById(USER.arun);
    const template = TEMPLATES.find(
      (t) =>
        isTemplateSelectable(t) &&
        t.variables.includes("policy_reference_number"),
    )!;
    const ramesh = CONVERSATIONS.find((c) => c.id === RAMESH)!;
    const preview = previewTemplate(admin, ramesh, template, "c881-a");
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.text).toContain("POL-TEST-881-A");
    // And no other purchase's reference appears.
    expect(preview.text).not.toContain("POL-TEST-881-B");
    expect(preview.text).not.toContain("POL-TEST-904-A");
  });
});
