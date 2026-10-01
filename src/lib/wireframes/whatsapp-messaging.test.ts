import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONVERSATIONS,
  TEMPLATES,
  type Conversation,
  type DeliveryState,
  type Message,
  type MessagingEligibility,
  type Template,
} from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import {
  checkSend,
  composerStateFor,
  demoTimeAt,
  eligibilityLabel,
  excludedFromBulkMessaging,
  isTemplateSelectable,
  nextDeliveryState,
  eligibleTemplatesFor,
  mayRetry,
  retryAttempt,
  retryInFlight,
  selectableTemplates,
  templateUnavailableReason,
} from "@/lib/wireframes/whatsapp-messaging";
import { resolveTemplateValues } from "@/lib/wireframes/whatsapp-template-variables";

/**
 * Batch 3B — composer state, templates, send preconditions and delivery
 * (§96, §97, §104, §105, §114).
 *
 * The messaging state is an input supplied by the integration, never computed
 * here, so these tests set it explicitly rather than manipulating a clock.
 */

const admin = userById(USER.arun);
const lead = userById(USER.sneha);
const otherSalesperson = userById(USER.divya);

function conv(id: string): Conversation {
  return CONVERSATIONS.find((c) => c.id === id)!;
}

/** Sneha's own conversation, with the messaging state under test. */
function hers(state: MessagingEligibility): Conversation {
  return { ...conv("w1"), messagingEligibility: state };
}

const APPROVED = TEMPLATES.find(isTemplateSelectable)!;
/** An approved template written for a Customer, and a policy to apply it to. */
const CUSTOMER_TEMPLATE = TEMPLATES.find(
  (t) => isTemplateSelectable(t) && t.variables.includes("customer_name"),
)!;
const RAMESH_HEALTH = "c881-a";

/* ------------------------------------------------------------- composer */

describe("composer state follows §96", () => {
  /* 1 */
  it("gives an unassigned conversation no composer, for an Admin", () => {
    const state = composerStateFor(admin, conv("w3"));
    expect(state.mode).toBe("unassigned");
    expect(state.mayType).toBe(false);
    expect(state.mayChooseTemplate).toBe(false);
    expect(state.explanation).toContain("Admins and Managers too");
  });

  /* 2 */
  it("withholds the composer outside the viewer's scope", () => {
    // Divya is a Salesperson in another part of the hierarchy, so w1 — which
    // belongs to Sneha — is not hers to answer.
    const state = composerStateFor(otherSalesperson, conv("w1"));
    expect(state.mode).toBe("not-permitted");
    expect(state.mayType).toBe(false);
  });

  /* 3 */
  it("offers free text where the integration reports free-form messaging", () => {
    const state = composerStateFor(lead, hers("free-form"));
    expect(state.mode).toBe("free-form");
    expect(state.mayType).toBe(true);
    expect(state.requiresTemplate).toBe(false);
    expect(state.mayChooseTemplate).toBe(true);
  });

  /* 4 */
  it("withholds free text entirely where a template is required", () => {
    const state = composerStateFor(lead, hers("template-required"));
    expect(state.mode).toBe("template-required");
    // §96: "do not display an unrestricted composer as though a normal
    // message can be sent" — not even a disabled one.
    expect(state.mayType).toBe(false);
    expect(state.requiresTemplate).toBe(true);
    expect(state.mayChooseTemplate).toBe(true);
  });

  /* 5 */
  it("offers nothing at all when the customer has opted out (§114)", () => {
    const state = composerStateFor(lead, hers("opted-out"));
    expect(state.mode).toBe("messaging-blocked");
    expect(state.mayType).toBe(false);
    // A template must not look like a way round the restriction.
    expect(state.mayChooseTemplate).toBe(false);
    expect(state.heading).toBe("Customer opted out");
  });

  /* 6 */
  it("offers nothing when messaging is unavailable (§114)", () => {
    const state = composerStateFor(lead, hers("unavailable"));
    expect(state.mode).toBe("messaging-blocked");
    expect(state.mayChooseTemplate).toBe(false);
    expect(state.heading).toBe("WhatsApp messaging unavailable");
  });

  /* 7 */
  it("puts assignment ahead of eligibility", () => {
    // Perfectly eligible, but unassigned: §93.1 still wins.
    const state = composerStateFor(admin, {
      ...conv("w3"),
      messagingEligibility: "free-form",
    });
    expect(state.mode).toBe("unassigned");
  });

  /* 8 */
  it("labels every messaging state", () => {
    const states: MessagingEligibility[] = [
      "free-form",
      "template-required",
      "unavailable",
      "opted-out",
    ];
    for (const s of states)
      expect(eligibilityLabel(s).length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------ templates */

describe("template selectability follows §97", () => {
  /* 9 */
  it("allows only an approved template that is still in use", () => {
    for (const t of TEMPLATES) {
      expect(isTemplateSelectable(t), t.name).toBe(
        t.status === "Approved" && t.active,
      );
    }
  });

  /* 10 */
  it("explains every template it refuses, and only those", () => {
    for (const t of TEMPLATES) {
      const reason = templateUnavailableReason(t);
      if (isTemplateSelectable(t)) {
        expect(reason, t.name).toBeNull();
      } else {
        expect(reason, t.name).toBeTruthy();
        expect(reason!.length, t.name).toBeGreaterThan(10);
      }
    }
  });

  /* 11 */
  it("refuses an approved template A&S Fincare has withdrawn", () => {
    const withdrawn = TEMPLATES.find(
      (t) => t.status === "Approved" && !t.active,
    )!;
    expect(isTemplateSelectable(withdrawn)).toBe(false);
    expect(templateUnavailableReason(withdrawn)).toContain("administrator");
  });

  /* 12 */
  it("keeps pending, rejected and unavailable templates out of the picker", () => {
    const selectable = selectableTemplates();
    for (const t of selectable) expect(t.status).toBe("Approved");
    for (const t of TEMPLATES) {
      if (t.status !== "Approved" || !t.active) {
        expect(selectable.map((s) => s.id)).not.toContain(t.id);
      }
    }
  });

  /* 13 */
  it("offers the sending picker only what can be sent", () => {
    // §197 scopes the Approved/Pending/Rejected/Unavailable listing to
    // "Settings → WhatsApp Templates. Admin can view the templates available
    // to the CRM." The operational picker is §96's "Select Template", which
    // has no status column at all.
    const offered = selectableTemplates();
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.length).toBeLessThan(TEMPLATES.length);
    for (const t of offered) {
      expect(t.status, t.name).toBe("Approved");
      expect(t.active, t.name).toBe(true);
    }
  });

  /* 14 */
  it("returns nothing to offer when no template is approved and in use", () => {
    const none = TEMPLATES.filter((t) => !isTemplateSelectable(t));
    expect(none.length).toBeGreaterThan(0);
    expect(selectableTemplates(none)).toEqual([]);
  });

  /* 15 */
  it("covers all four §97 states, so each can be demonstrated", () => {
    const statuses = new Set(TEMPLATES.map((t) => t.status));
    expect([...statuses].sort()).toEqual([
      "Approved",
      "Pending",
      "Rejected",
      "Unavailable",
    ]);
  });
});

/* ------------------------------------------------- template eligibility */

describe("templates offered per conversation (§96, §98)", () => {
  /* 16 */
  it("offers a Customer conversation only Customer-addressed templates", () => {
    const customerConv = CONVERSATIONS.find(
      (c) => c.recordType === "Customer" && c.assignedToUserId !== null,
    )!;
    for (const t of eligibleTemplatesFor(admin, customerConv)) {
      expect(t.variables, t.name).not.toContain("lead_name");
    }
  });

  /* 17 */
  it("offers a Lead conversation only Lead-addressed templates", () => {
    const leadConv = CONVERSATIONS.find(
      (c) => c.recordType === "Lead" && c.assignedToUserId !== null,
    )!;
    const offered = eligibleTemplatesFor(admin, leadConv);
    expect(offered.length).toBeGreaterThan(0);
    for (const t of offered) {
      expect(t.variables, t.name).not.toContain("customer_name");
      // A Lead has no Customer Purchase, so no policy variable can resolve.
      expect(t.variables, t.name).not.toContain("renewal_date");
      expect(t.variables, t.name).not.toContain("policy_reference_number");
    }
  });

  /* 18 */
  it("offers nothing on an unassigned conversation", () => {
    expect(eligibleTemplatesFor(admin, conv("w3"))).toEqual([]);
  });

  /* 19 */
  it("keeps every offered template fully resolvable or purchase-pending", () => {
    for (const c of CONVERSATIONS) {
      for (const t of eligibleTemplatesFor(admin, c)) {
        const resolved = resolveTemplateValues(admin, c, t);
        expect(
          resolved.ok || resolved.block === "purchase-not-chosen",
          `${t.name} / ${c.id}`,
        ).toBe(true);
      }
    }
  });
});

/* ----------------------------------------------------------------- send */

describe("send preconditions follow §104", () => {
  const draft = (text = "", templateId: string | null = null) => ({
    text,
    templateId,
  });

  /* 17 */
  it("refuses an unassigned conversation and says assignment comes first", () => {
    const result = checkSend(admin, conv("w3"), draft("Hello"));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("unassigned");
    expect(result.ok === false && result.reason).toContain("Team Lead");
  });

  /* 18 */
  it("refuses a viewer outside their scope", () => {
    const result = checkSend(otherSalesperson, conv("w1"), draft("Hello"));
    expect(result.ok).toBe(false);
  });

  /* 19 */
  it("refuses whitespace-only free text", () => {
    const result = checkSend(lead, hers("free-form"), draft("   \n  "));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("Type a message");
  });

  /* 20 */
  it("refuses free text where a template is required", () => {
    const result = checkSend(
      lead,
      hers("template-required"),
      draft("Just a quick note"),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(
      "approved template is required",
    );
  });

  /* 21 */
  it("refuses an unapproved template even where free text is allowed", () => {
    const rejected = TEMPLATES.find((t) => t.status === "Rejected")!;
    const result = checkSend(
      lead,
      hers("free-form"),
      draft("", rejected.id),
      TEMPLATES,
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(rejected.name);
  });

  /* 22 */
  it("refuses a template whose variables are not all available", () => {
    const incomplete: Template = {
      ...APPROVED,
      id: "t-incomplete",
      body: "Your premium is {{amount}}.",
    };
    const result = checkSend(
      lead,
      hers("template-required"),
      draft("", "t-incomplete"),
      [...TEMPLATES, incomplete],
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("amount");
  });

  /* 23 */
  it("accepts an approved template where one is required, already populated", () => {
    const result = checkSend(lead, hers("template-required"), {
      text: "",
      templateId: CUSTOMER_TEMPLATE.id,
      purchaseId: RAMESH_HEALTH,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.templateName).toBe(CUSTOMER_TEMPLATE.name);
    expect(result.body).not.toContain("{{");
    expect(result.body).toContain("Ramesh Kumar");
  });

  /* 23b */
  it("refuses a Customer template on a conversation linked to a Lead", () => {
    const leadConv = CONVERSATIONS.find(
      (c) => c.recordType === "Lead" && c.assignedToUserId !== null,
    )!;
    const result = checkSend(admin, leadConv, {
      text: "",
      templateId: CUSTOMER_TEMPLATE.id,
      purchaseId: null,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("Customer");
    expect(result.ok === false && result.reason).toContain("Lead");
  });

  /* 23c */
  it("refuses to pick a policy when the customer holds more than one", () => {
    const result = checkSend(lead, hers("template-required"), {
      text: "",
      templateId: CUSTOMER_TEMPLATE.id,
      purchaseId: null,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(
      "more than one policy",
    );
  });

  /* 24 */
  it("accepts trimmed free text where free-form messaging is allowed", () => {
    const result = checkSend(
      lead,
      hers("free-form"),
      draft("  Sending the link now  "),
    );
    expect(result.ok).toBe(true);
    expect(result.ok === true && result.body).toBe("Sending the link now");
    expect(result.ok === true && result.templateName).toBeUndefined();
  });

  /* 25 */
  it("refuses an opted-out contact even with an approved template", () => {
    const result = checkSend(lead, hers("opted-out"), {
      text: "",
      templateId: CUSTOMER_TEMPLATE.id,
      purchaseId: RAMESH_HEALTH,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("opt-out");
  });

  /* 26 */
  it("refuses a contact with no usable phone number", () => {
    const result = checkSend(
      lead,
      { ...hers("free-form"), phone: "  " },
      draft("Hello"),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("phone number");
  });
});

/* ------------------------------------------------------------- delivery */

describe("delivery states follow §105", () => {
  /* 27 */
  it("advances Sending → Sent → Delivered → Read and then stops", () => {
    expect(nextDeliveryState("sending")).toBe("sent");
    expect(nextDeliveryState("sent")).toBe("delivered");
    expect(nextDeliveryState("delivered")).toBe("read");
    expect(nextDeliveryState("read")).toBeNull();
  });

  /* 28 */
  it("never advances out of Failed", () => {
    expect(nextDeliveryState("failed")).toBeNull();
  });

  /* 29 */
  it("stops at Delivered where read receipts are not available", () => {
    expect(nextDeliveryState("delivered", false)).toBeNull();
  });

  /* 30 */
  it("uses only the five states the specification lists", () => {
    const states: DeliveryState[] = [
      "sending",
      "sent",
      "delivered",
      "read",
      "failed",
    ];
    for (const s of states) {
      const next = nextDeliveryState(s);
      if (next !== null) expect(states).toContain(next);
    }
  });
});

/* ---------------------------------------------------------------- retry */

describe("retry follows §105", () => {
  const failed: Message = {
    id: "m5",
    direction: "out",
    body: "Could you confirm a convenient time?",
    time: "10:41 AM",
    delivery: "failed",
    failureReason: "The number was unreachable.",
    template: "Follow-up reminder",
  };
  const thread: readonly Message[] = [failed];

  /* 31 */
  it("creates a new attempt and leaves the failed one untouched", () => {
    const attempt = retryAttempt(thread, "m5", "10:45 AM", "retry-1")!;
    expect(attempt.id).not.toBe(failed.id);
    expect(attempt.retryOf).toBe("m5");
    expect(attempt.delivery).toBe("sending");
    expect(attempt.body).toBe(failed.body);
    // The original is a separate object and still Failed.
    expect(failed.delivery).toBe("failed");
    expect(failed.retryOf).toBeUndefined();
  });

  /* 32 */
  it("carries the template the failed attempt used", () => {
    expect(retryAttempt(thread, "m5", "10:45 AM", "r")!.template).toBe(
      "Follow-up reminder",
    );
  });

  /* 33 */
  it("refuses to retry a message that did not fail", () => {
    const delivered: Message = { ...failed, id: "m4", delivery: "delivered" };
    expect(retryAttempt([delivered], "m4", "10:45 AM", "r")).toBeNull();
  });

  /* 34 */
  it("refuses to retry an incoming message or an unknown id", () => {
    const incoming: Message = {
      id: "m2",
      direction: "in",
      body: "Yes please",
      time: "10:32 AM",
    };
    expect(retryAttempt([incoming], "m2", "10:45 AM", "r")).toBeNull();
    expect(retryAttempt(thread, "nope", "10:45 AM", "r")).toBeNull();
  });

  /* 35 */
  it("does not queue a second attempt while one is in flight", () => {
    const first = retryAttempt(thread, "m5", "10:45 AM", "retry-1")!;
    const again = retryAttempt([...thread, first], "m5", "10:46 AM", "retry-2");
    expect(again).toBeNull();
  });

  /* 36 */
  it("moves the Retry action to the newest failed attempt in the chain", () => {
    // The retry itself failed. The chain continues from THAT attempt, so the
    // same words never carry two Retry buttons at once.
    const firstFailed: Message = {
      id: "retry-1",
      direction: "out",
      body: failed.body,
      time: "10:45 AM",
      delivery: "failed",
      retryOf: "m5",
    };
    const chain = [...thread, firstFailed];
    expect(mayRetry(chain, "m5")).toBe(false);
    expect(mayRetry(chain, "retry-1")).toBe(true);
    expect(
      retryAttempt(chain, "retry-1", "10:46 AM", "retry-2"),
    ).not.toBeNull();
  });

  /* 37 */
  it("offers Retry only on a failed outgoing attempt that has not been retried", () => {
    expect(mayRetry(thread, "m5")).toBe(true);
    const attempt = retryAttempt(thread, "m5", "10:45 AM", "retry-1")!;
    const withRetry = [...thread, attempt];
    // Withdrawn the moment an attempt exists, and while it is settling.
    expect(mayRetry(withRetry, "m5")).toBe(false);
    expect(retryInFlight(withRetry, "m5")).toBe(true);
    // The new attempt is not itself retryable until it fails.
    expect(mayRetry(withRetry, attempt.id)).toBe(false);
  });

  /* 38 */
  it("stops reporting a retry in flight once that attempt has failed", () => {
    const attemptFailed: Message = {
      id: "retry-1",
      direction: "out",
      body: failed.body,
      time: "10:45 AM",
      delivery: "failed",
      retryOf: "m5",
    };
    expect(retryInFlight([...thread, attemptFailed], "m5")).toBe(false);
  });
});

/* ------------------------------------------------------- §114 and clock */

describe("bulk exclusion and the demo clock", () => {
  /* 39 */
  it("excludes opted-out and unavailable contacts from bulk sends (§114)", () => {
    const excluded = excludedFromBulkMessaging();
    expect(excluded.length).toBeGreaterThan(0);
    for (const c of CONVERSATIONS) {
      const blocked =
        c.messagingEligibility === "opted-out" ||
        c.messagingEligibility === "unavailable";
      expect(excluded.map((e) => e.id).includes(c.id), c.id).toBe(blocked);
    }
  });

  /* 40 */
  it("produces a deterministic, advancing wall clock", () => {
    expect(demoTimeAt(0)).toBe("10:44 AM");
    expect(demoTimeAt(0)).toBe(demoTimeAt(0));
    expect(demoTimeAt(1)).toBe("10:45 AM");
    expect(demoTimeAt(16)).toBe("11:00 AM");
    expect(demoTimeAt(76)).toBe("12:00 PM");
  });
});

/* -------------------------------------------------- no invented rule */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) out.push(path);
  }
  return out;
}

/**
 * Source with comment lines removed.
 *
 * The comments here deliberately discuss the rule in order to record why it is
 * absent; what must not appear is a claim the client would read on screen.
 */
function codeOnly(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
}

describe("the wireframes state no messaging-window rule", () => {
  /* 41 */
  it("names no duration the specification does not define", () => {
    // The specification contains no time window at all — §96 has the CRM read
    // the messaging state from the integration instead. A wireframe that
    // asserts "24 hours" would be putting an unconfirmed product rule in front
    // of the client as though it were settled.
    const offenders: string[] = [];
    for (const file of [
      ...walk("src/components/wireframes"),
      ...walk("src/lib/wireframes"),
      ...walk("src/app/wireframes"),
    ]) {
      const source = codeOnly(readFileSync(file, "utf8"));
      if (
        /24[\s-]?hours?|twenty-four hours|messaging window|service window/i.test(
          source,
        )
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
