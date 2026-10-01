import { describe, expect, it } from "vitest";

import {
  CONVERSATIONS,
  LINKED_RECORDS,
  SETTINGS_USERS,
  TEMPLATES,
  TEMPLATE_VARIABLES,
  linkedRecordById,
  type Conversation,
  type Template,
} from "@/lib/wireframes/mock-data";
import {
  SALES_TEAMS,
  USER,
  activeMemberships,
  activeTeamOf,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";
import {
  mayReplyToConversation,
  mayViewConversation,
  operationalUserIdsInScope,
  reassignmentTargetsFor,
} from "@/lib/wireframes/whatsapp-access";
import {
  checkSend,
  eligibleTemplatesFor,
  isTemplateSelectable,
  previewTemplate,
} from "@/lib/wireframes/whatsapp-messaging";
import {
  fillTemplate,
  isTemplateVariable,
  placeholdersIn,
  resolveTemplateValues,
  templateRecordRequirement,
  validateTemplate,
} from "@/lib/wireframes/whatsapp-template-variables";

/**
 * Batch 3B final correction — the §98 template-variable contract.
 *
 * §98 fixes the permitted variables, forbids several categories outright, and
 * requires that "variables resolve only from the recipient's own record" and
 * never "from a record outside the sending user's permitted scope". These
 * tests hold the implementation to that literally.
 */

const admin = userById(USER.arun);
const manager = userById(USER.vikram);
const lead = userById(USER.sneha);
const salesperson = userById(USER.divya);

function conv(id: string): Conversation {
  return CONVERSATIONS.find((c) => c.id === id)!;
}

/** Ramesh: a Customer with TWO purchases, owned by Neha, assigned to Sneha. */
const RAMESH = conv("w1");
const RAMESH_HEALTH = "c881-a";
const RAMESH_MOTOR = "c881-b";
/** Rajesh: a conversation linked to a Lead. */
const LEAD_CONV = conv("w8");

const CUSTOMER_TEMPLATE = TEMPLATES.find(
  (t) => isTemplateSelectable(t) && t.variables.includes("customer_name"),
)!;
const LEAD_TEMPLATE = TEMPLATES.find(
  (t) => isTemplateSelectable(t) && t.variables.includes("lead_name"),
)!;
const OWNERSHIP_TEMPLATE = TEMPLATES.find(
  (t) => isTemplateSelectable(t) && t.variables.includes("team_lead_name"),
)!;

/* ------------------------------------------------------- 1. the allow-list */

describe("the supported-variable set is exactly §98's", () => {
  /* 1 */
  it("lists every §98 variable and nothing else", () => {
    // §98 "Available variables", in the order the specification prints them.
    expect([...TEMPLATE_VARIABLES]).toEqual([
      "customer_name",
      "lead_name",
      "product_category",
      "provider",
      "plan_sub_product",
      "policy_reference_number",
      "renewal_date",
      "record_owner_name",
      "team_lead_name",
      "business_name",
      "business_contact_details",
    ]);
    expect(TEMPLATE_VARIABLES.length).toBe(11);
    expect(new Set(TEMPLATE_VARIABLES).size).toBe(11);
  });

  /* 1b */
  it("rejects the categories §98 forbids outright", () => {
    // Policy document contents, credentials, internal identifiers, and
    // Closed Amount or other performance figures.
    for (const forbidden of [
      "policy_document",
      "document_contents",
      "access_token",
      "api_key",
      "password",
      "record_id",
      "internal_id",
      "closed_amount",
      "incentive_total",
    ]) {
      expect(isTemplateVariable(forbidden), forbidden).toBe(false);
    }
  });
});

/* -------------------------------------------- 2. no unsupported placeholder */

describe("no production template uses an unsupported placeholder", () => {
  /* 2 */
  it("uses none of the retired or ambiguous names", () => {
    const banned = [
      "document",
      "date",
      "time",
      "product",
      "due_date",
      "amount",
    ];
    for (const t of TEMPLATES) {
      for (const name of placeholdersIn(t.body)) {
        expect(banned, `${t.name} uses {{${name}}}`).not.toContain(name);
        expect(isTemplateVariable(name), `${t.name} uses {{${name}}}`).toBe(
          true,
        );
      }
    }
  });

  /* 2b */
  it("keeps every template consistent with its own declaration", () => {
    for (const t of TEMPLATES) {
      const result = validateTemplate(t);
      expect(result.unknown, t.name).toEqual([]);
      expect(result.undeclared, t.name).toEqual([]);
      expect(result.unused, t.name).toEqual([]);
      expect(result.conflictingNames, t.name).toBe(false);
      expect(result.ok, t.name).toBe(true);
    }
  });

  /* 2c */
  it("keeps Category, Provider and Plan as three separate values", () => {
    const renewal = CUSTOMER_TEMPLATE;
    expect(renewal.variables).toContain("plan_sub_product");
    expect(renewal.variables).toContain("provider");
    const resolved = resolveTemplateValues(
      admin,
      RAMESH,
      renewal,
      RAMESH_HEALTH,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const purchase = linkedRecordById("c881")!.purchases[0]!;
    expect(resolved.values.plan_sub_product).toBe(purchase.planSubProduct);
    expect(resolved.values.provider).toBe(purchase.provider);
    // Three distinct concepts, three distinct strings.
    expect(purchase.planSubProduct).not.toBe(purchase.provider);
    expect(purchase.planSubProduct).not.toBe(purchase.productCategory);
    expect(purchase.provider).not.toBe(purchase.productCategory);
  });
});

/* --------------------------------------------------- 3 & 4. validation gates */

describe("placeholder validation blocks sending", () => {
  /* 3 */
  it("rejects an unknown placeholder", () => {
    const bad: Template = {
      ...CUSTOMER_TEMPLATE,
      id: "t-bad",
      variables: ["customer_name"],
      body: "Hello {{customer_name}}, see you at {{time}}.",
    };
    const result = validateTemplate(bad);
    expect(result.ok).toBe(false);
    expect(result.unknown).toEqual(["time"]);
    const preview = previewTemplate(admin, RAMESH, bad, RAMESH_HEALTH);
    expect(preview.ok).toBe(false);
    expect(preview.ok === false && preview.reason).toContain("{{time}}");
  });

  /* 3b */
  it("rejects a supported placeholder that was never declared", () => {
    const bad: Template = {
      ...CUSTOMER_TEMPLATE,
      id: "t-undeclared",
      variables: ["customer_name"],
      body: "Hello {{customer_name}}, your {{provider}} policy.",
    };
    const result = validateTemplate(bad);
    expect(result.ok).toBe(false);
    expect(result.undeclared).toEqual(["provider"]);
  });

  /* 3c */
  it("rejects a declaration the body never uses", () => {
    const bad: Template = {
      ...CUSTOMER_TEMPLATE,
      id: "t-unused",
      variables: ["customer_name", "renewal_date"],
      body: "Hello {{customer_name}}.",
    };
    const result = validateTemplate(bad);
    expect(result.ok).toBe(false);
    expect(result.unused).toEqual(["renewal_date"]);
  });

  /* 3d */
  it("rejects a template asking for both a Customer and a Lead name", () => {
    const bad: Template = {
      ...CUSTOMER_TEMPLATE,
      id: "t-both",
      variables: ["customer_name", "lead_name"],
      body: "Hello {{customer_name}} {{lead_name}}.",
    };
    expect(validateTemplate(bad).conflictingNames).toBe(true);
    expect(validateTemplate(bad).ok).toBe(false);
  });

  /* 4 */
  it("leaves an unresolvable placeholder visible rather than sending it", () => {
    const filled = fillTemplate(
      "Hello {{customer_name}} on {{renewal_date}}.",
      {
        customer_name: "Ramesh Kumar",
      },
    );
    expect(filled.unresolved).toEqual(["renewal_date"]);
    expect(filled.text).toContain("{{renewal_date}}");
  });

  /* 4b */
  it("substitutes nothing from an unsupported name even if one is supplied", () => {
    // `{{time}}` has no TemplateVariable, so there is no key that could fill
    // it — the contract cannot be sidestepped by passing extra values.
    const filled = fillTemplate("At {{time}} with {{business_name}}.", {
      business_name: "A&S Fincare",
    });
    expect(filled.unresolved).toEqual(["time"]);
    expect(filled.text).toContain("A&S Fincare");
  });
});

/* ------------------------------------------------ 5, 6, 7. Lead vs Customer */

describe("Lead and Customer names are never interchanged (§98)", () => {
  /* 5 */
  it("resolves only Customer Name on a Customer conversation", () => {
    const resolved = resolveTemplateValues(
      admin,
      RAMESH,
      CUSTOMER_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.values.customer_name).toBe("Ramesh Kumar");
    expect(resolved.values.lead_name).toBeUndefined();
  });

  /* 6 */
  it("resolves only Lead Name on a Lead conversation", () => {
    const resolved = resolveTemplateValues(admin, LEAD_CONV, LEAD_TEMPLATE);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.values.lead_name).toBe("Rajesh Menon");
    expect(resolved.values.customer_name).toBeUndefined();
  });

  /* 7 */
  it("blocks a record-type mismatch in both directions", () => {
    const customerOnLead = resolveTemplateValues(
      admin,
      LEAD_CONV,
      CUSTOMER_TEMPLATE,
    );
    expect(customerOnLead.ok).toBe(false);
    expect(customerOnLead.ok === false && customerOnLead.block).toBe(
      "record-type-mismatch",
    );

    const leadOnCustomer = resolveTemplateValues(
      admin,
      RAMESH,
      LEAD_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(leadOnCustomer.ok).toBe(false);
    expect(leadOnCustomer.ok === false && leadOnCustomer.block).toBe(
      "record-type-mismatch",
    );
  });

  /* 7b */
  it("never takes a name from a record other than the linked one", () => {
    const cases: readonly [Conversation, Template, string | null][] = [
      [LEAD_CONV, LEAD_TEMPLATE, null],
      [RAMESH, CUSTOMER_TEMPLATE, RAMESH_HEALTH],
    ];
    for (const [conversation, template, purchaseId] of cases) {
      const resolved = resolveTemplateValues(
        admin,
        conversation,
        template,
        purchaseId,
      );
      expect(resolved.ok, conversation.id).toBe(true);
      if (!resolved.ok) continue;
      const own = linkedRecordById(conversation.linkedRecordId!)!;
      expect(
        resolved.values.customer_name ?? resolved.values.lead_name,
        conversation.id,
      ).toBe(own.name);
      // Nobody else's name appears anywhere in the resolved values.
      for (const other of LINKED_RECORDS) {
        if (other.id === own.id || other.name === own.name) continue;
        expect(
          Object.values(resolved.values),
          `${conversation.id} leaked ${other.name}`,
        ).not.toContain(other.name);
      }
    }
  });

  /* 7c */
  it("derives the record requirement from the name variable, not a flag", () => {
    expect(templateRecordRequirement(CUSTOMER_TEMPLATE)).toBe("Customer");
    expect(templateRecordRequirement(LEAD_TEMPLATE)).toBe("Lead");
  });
});

/* ------------------------------------- 9, 10, 17. purchase-derived values */

describe("purchase values come from the linked record only", () => {
  /* 9 */
  it("takes the policy reference from the chosen purchase on that record", () => {
    const docTemplate = TEMPLATES.find((t) =>
      t.variables.includes("policy_reference_number"),
    )!;
    // Suresh holds exactly one policy, so no choice is needed.
    const suresh = conv("w4");
    const resolved = resolveTemplateValues(admin, suresh, docTemplate);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.values.policy_reference_number).toBe("PUC-TEST-517-A");
    // And it belongs to Suresh's own record, not to any other.
    expect(
      linkedRecordById("c517")!.purchases.map((p) => p.policyReference),
    ).toContain(resolved.values.policy_reference_number);
  });

  /* 10 */
  it("takes the renewal date from the chosen purchase, not from elsewhere", () => {
    const health = resolveTemplateValues(
      admin,
      RAMESH,
      CUSTOMER_TEMPLATE,
      RAMESH_HEALTH,
    );
    const motor = resolveTemplateValues(
      admin,
      RAMESH,
      CUSTOMER_TEMPLATE,
      RAMESH_MOTOR,
    );
    expect(health.ok && motor.ok).toBe(true);
    if (!health.ok || !motor.ok) return;
    expect(health.values.renewal_date).toBe("26 September 2026");
    expect(motor.values.renewal_date).toBe("11 January 2027");
    // Two purchases, two different answers — proof it is read per purchase
    // rather than taken from the record as a whole.
    expect(health.values.renewal_date).not.toBe(motor.values.renewal_date);
    expect(health.values.plan_sub_product).not.toBe(
      motor.values.plan_sub_product,
    );
    expect(health.values.provider).not.toBe(motor.values.provider);
  });

  /* 17 */
  it("refuses to choose among several purchases, and offers them instead", () => {
    const resolved = resolveTemplateValues(admin, RAMESH, CUSTOMER_TEMPLATE);
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.block).toBe("purchase-not-chosen");
    expect(resolved.choices.map((p) => p.id)).toEqual([
      RAMESH_HEALTH,
      RAMESH_MOTOR,
    ]);
    // Emphatically NOT the first one picked silently.
    expect(resolved.reason).toContain("will not pick for you");
  });

  /* 17b */
  it("refuses a purchase that belongs to another record", () => {
    const resolved = resolveTemplateValues(
      admin,
      conv("w4"),
      CUSTOMER_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(resolved.ok).toBe(false);
    expect(resolved.ok === false && resolved.block).toBe(
      "purchase-not-on-record",
    );
  });

  /* 16 */
  it("blocks rather than borrowing when a value is genuinely absent", () => {
    // A Lead has no purchase, so a renewal date has nothing to come from.
    const needsRenewal: Template = {
      ...LEAD_TEMPLATE,
      id: "t-lead-renewal",
      variables: ["lead_name", "renewal_date"],
      body: "Hello {{lead_name}}, renewal on {{renewal_date}}.",
    };
    const resolved = resolveTemplateValues(admin, LEAD_CONV, needsRenewal);
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.missing).toContain("renewal_date");
    expect(resolved.reason).toContain("no other record is consulted");
  });
});

/* ------------------------------------------ 11, 12, 13. ownership variables */

describe("ownership variables use ids and the real hierarchy (§98)", () => {
  /* 11 */
  it("names the record's actual owner", () => {
    const record = linkedRecordById("c881")!;
    const resolved = resolveTemplateValues(
      admin,
      RAMESH,
      OWNERSHIP_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.values.record_owner_name).toBe(
      userById(record.recordOwnerUserId).name,
    );
    // The owner is deliberately NOT the conversation assignee here.
    expect(record.recordOwnerUserId).not.toBe(RAMESH.assignedToUserId);
    expect(resolved.values.record_owner_name).not.toBe(
      userById(RAMESH.assignedToUserId!).name,
    );
  });

  /* 12 */
  it("names the Team Lead of the owner's own team", () => {
    const record = linkedRecordById("c881")!;
    const ownerTeam = activeTeamOf(record.recordOwnerUserId)!;
    const expected = userById(teamLeadOf(ownerTeam)!.userId).name;
    const resolved = resolveTemplateValues(
      admin,
      RAMESH,
      OWNERSHIP_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.values.team_lead_name).toBe(expected);
  });

  /* 13 */
  it("never substitutes the acting Admin or Manager as owner", () => {
    for (const actor of [admin, manager]) {
      const resolved = resolveTemplateValues(
        actor,
        RAMESH,
        OWNERSHIP_TEMPLATE,
        RAMESH_HEALTH,
      );
      expect(resolved.ok, actor.role).toBe(true);
      if (!resolved.ok) continue;
      expect(resolved.values.record_owner_name, actor.role).not.toBe(
        actor.name,
      );
      expect(resolved.values.team_lead_name, actor.role).not.toBe(actor.name);
    }
  });
});

/* ------------------------------------------------- 14, 15. scope enforcement */

describe("scope is enforced before any value is produced (§98)", () => {
  /* 14 */
  it("gives an unauthorized user no values at all", () => {
    // Divya is a Salesperson elsewhere in the hierarchy: Ramesh's
    // conversation is not hers.
    const resolved = resolveTemplateValues(
      salesperson,
      RAMESH,
      CUSTOMER_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.block).toBe("not-authorized");
    // Not a partial result: there is no `values` field to leak from.
    expect("values" in resolved).toBe(false);
  });

  /* 14b */
  it("gives nobody values on an unassigned conversation", () => {
    // §93.1: readable by Admins and Managers, repliable by nobody. A message
    // that cannot be sent has no business being populated.
    for (const actor of [admin, manager]) {
      const resolved = resolveTemplateValues(
        actor,
        conv("w3"),
        CUSTOMER_TEMPLATE,
      );
      expect(resolved.ok, actor.role).toBe(false);
      expect(resolved.ok === false && resolved.block, actor.role).toBe(
        "not-authorized",
      );
    }
  });

  /* 15 */
  it("blocks a record owned outside the actor's scope", () => {
    // Vikram Reddy's conversation is assigned into Sneha's Health team, but
    // his record is owned by Kavya in the Motor team. Sneha may reply; she may
    // not be shown that record's owner or details.
    const vikramConv = conv("w9");
    const record = linkedRecordById(vikramConv.linkedRecordId!)!;
    expect(activeTeamOf(record.recordOwnerUserId)!.id).not.toBe(
      activeTeamOf(lead.id)!.id,
    );
    const resolved = resolveTemplateValues(
      lead,
      vikramConv,
      CUSTOMER_TEMPLATE,
      "c904-a",
    );
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.block).toBe("record-out-of-scope");
    // The refusal names nobody.
    expect(resolved.reason).not.toContain(userById(USER.kavya).name);
    expect(resolved.reason).not.toContain("Motor");
  });

  /* 15b */
  it("never consults another record as a fallback for a missing value", () => {
    const needsRenewal: Template = {
      ...LEAD_TEMPLATE,
      id: "t-lead-renewal-2",
      variables: ["lead_name", "renewal_date"],
      body: "Hello {{lead_name}}, renewal on {{renewal_date}}.",
    };
    const resolved = resolveTemplateValues(admin, LEAD_CONV, needsRenewal);
    expect(resolved.ok).toBe(false);
    // No other record's renewal date appears anywhere in the refusal.
    const dates = LINKED_RECORDS.flatMap((r) =>
      r.purchases.map((p) => p.renewalDate),
    );
    for (const date of dates) {
      expect(resolved.ok === false && resolved.reason, date).not.toContain(
        date,
      );
    }
  });

  /* 15c */
  it("returns only the variables the template declared", () => {
    const resolved = resolveTemplateValues(admin, LEAD_CONV, LEAD_TEMPLATE);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(Object.keys(resolved.values).sort()).toEqual(
      [...LEAD_TEMPLATE.variables].sort(),
    );
  });
});

/* ----------------------------------------------- 19. operational eligibility */

describe("eligible templates per conversation", () => {
  /* 19 */
  it("offers only approved, active and applicable templates", () => {
    for (const c of CONVERSATIONS) {
      for (const t of eligibleTemplatesFor(admin, c)) {
        expect(t.status, t.name).toBe("Approved");
        expect(t.active, t.name).toBe(true);
        const requirement = templateRecordRequirement(t);
        if (requirement !== "any") {
          expect(linkedRecordById(c.linkedRecordId!)!.kind, t.name).toBe(
            requirement,
          );
        }
      }
    }
  });

  /* 19b */
  it("offers a Team Lead nothing whose record sits outside her scope", () => {
    const vikramConv = conv("w9");
    for (const t of eligibleTemplatesFor(lead, vikramConv)) {
      // Nothing should be offered at all, because every value would come
      // from an out-of-scope record.
      expect(t.name).toBe("__nothing_should_be_offered__");
    }
  });

  /* 19c */
  it("still populates a fully resolvable preview end to end", () => {
    const preview = previewTemplate(
      admin,
      RAMESH,
      CUSTOMER_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.text).not.toContain("{{");
    expect(preview.text).toContain("Ramesh Kumar");
    expect(preview.text).toContain("Family Health Optima");
    expect(preview.text).toContain("Star Health");
    expect(preview.text).toContain("26 September 2026");
    expect(preview.purchase?.id).toBe(RAMESH_HEALTH);
  });
});

/* ------------------------------------------------------ data consistency */

describe("the linked-record data holds together", () => {
  it("links every non-unknown conversation to a record of the right kind", () => {
    for (const c of CONVERSATIONS) {
      if (c.recordType === "Unknown") {
        expect(c.linkedRecordId, c.id).toBeNull();
        continue;
      }
      const record = linkedRecordById(c.linkedRecordId!);
      expect(record, c.id).toBeDefined();
      expect(record!.kind, c.id).toBe(c.recordType);
      expect(record!.name, c.id).toBe(c.person);
      expect(record!.reference, c.id).toBe(c.recordLabel);
    }
  });

  it("gives every record an owner id that is a real operational user", () => {
    for (const r of LINKED_RECORDS) {
      const owner = userById(r.recordOwnerUserId);
      expect(["Team Lead", "Salesperson"], r.id).toContain(owner.role);
    }
  });

  it("gives no Lead a Customer Purchase", () => {
    for (const r of LINKED_RECORDS) {
      if (r.kind === "Lead") expect(r.purchases, r.id).toEqual([]);
      else expect(r.purchases.length, r.id).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------- record visibility vs reassignment */

describe("record-data visibility is a separate permission from reassignment", () => {
  /**
   * §89.1 governs what an actor may read; §93 governs whom they may reassign
   * to, and leaves a Salesperson's reassignment permission pending. The two
   * must not be answered by one function: a Salesperson has no approved
   * reassignment target and yet plainly works their own records every day.
   */
  const kavya = userById(USER.kavya);
  /** Kavya is a Salesperson who both holds this conversation and owns its Lead. */
  const HERS = conv("w5");
  /**
   * A Lead template that also asks for the Record Owner.
   *
   * The catalogue has no such row, and resolution returns only the variables a
   * template declared — so proving the owner resolves needs a template that
   * declares it.
   */
  const LEAD_OWNER_TEMPLATE: Template = {
    ...LEAD_TEMPLATE,
    id: "t-lead-owner",
    variables: ["lead_name", "record_owner_name"],
    body: "Hello {{lead_name}}, {{record_owner_name}} is looking after your enquiry.",
  };

  /* 1 */
  it("lets a Salesperson resolve values from a record they personally own", () => {
    expect(kavya.role).toBe("Salesperson");
    const record = linkedRecordById(HERS.linkedRecordId!)!;
    expect(record.recordOwnerUserId).toBe(kavya.id);

    const resolved = resolveTemplateValues(kavya, HERS, LEAD_OWNER_TEMPLATE);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.values.lead_name).toBe(record.name);
    // She owns it, so she is the Record Owner the template names.
    expect(resolved.values.record_owner_name).toBe(kavya.name);
  });

  /* 2 */
  it("has that conversation assigned to her", () => {
    expect(HERS.assignedToUserId).toBe(kavya.id);
    expect(mayViewConversation(kavya, HERS)).toBe(true);
    expect(mayReplyToConversation(kavya, HERS)).toBe(true);
  });

  /* 3 */
  it("lets her preview and send an approved applicable template", () => {
    expect(eligibleTemplatesFor(kavya, HERS).map((t) => t.id)).toContain(
      LEAD_TEMPLATE.id,
    );

    const preview = previewTemplate(kavya, HERS, LEAD_TEMPLATE);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.text).not.toContain("{{");
    expect(preview.text).toContain("Anitha Desai");

    const send = checkSend(kavya, HERS, {
      text: "",
      templateId: LEAD_TEMPLATE.id,
      purchaseId: null,
    });
    expect(send.ok).toBe(true);
  });

  /* 4 */
  it("still gives her zero conversation reassignment targets", () => {
    // Her record-data scope is non-empty; her reassignment scope is empty.
    // Proof the two are not the same question.
    expect([...operationalUserIdsInScope(kavya)]).toEqual([kavya.id]);
    expect(reassignmentTargetsFor(kavya, HERS)).toEqual([]);
  });

  /* 5 */
  it("does not let her resolve values from a peer's record", () => {
    // Neha owns Customer #517 and is a Salesperson in another team. Even on a
    // conversation Kavya may answer, that record is not hers to read.
    const peerRecord = linkedRecordById("c517")!;
    expect(userById(peerRecord.recordOwnerUserId).role).toBe("Salesperson");
    expect(peerRecord.recordOwnerUserId).not.toBe(kavya.id);

    const resolved = resolveTemplateValues(
      kavya,
      { ...HERS, linkedRecordId: peerRecord.id },
      CUSTOMER_TEMPLATE,
    );
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.block).toBe("record-out-of-scope");
    expect(resolved.reason).not.toContain(peerRecord.name);
    expect(resolved.reason).not.toContain(
      userById(peerRecord.recordOwnerUserId).name,
    );
  });

  /* 6 */
  it("lets a Team Lead resolve her own records and her team's", () => {
    const scope = operationalUserIdsInScope(lead);
    // Her own: Customer #712 is owned by her.
    expect(linkedRecordById("c712")!.recordOwnerUserId).toBe(lead.id);
    expect(scope.has(lead.id)).toBe(true);
    const own = resolveTemplateValues(lead, conv("w10"), CUSTOMER_TEMPLATE);
    expect(own.ok).toBe(true);

    // Her team's: Ramesh's record is owned by Neha, a Salesperson in her team.
    const teamRecord = linkedRecordById("c881")!;
    expect(teamRecord.recordOwnerUserId).not.toBe(lead.id);
    expect(scope.has(teamRecord.recordOwnerUserId)).toBe(true);
    const theirs = resolveTemplateValues(
      lead,
      RAMESH,
      OWNERSHIP_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(theirs.ok).toBe(true);
    if (!theirs.ok) return;
    expect(theirs.values.record_owner_name).toBe(
      userById(teamRecord.recordOwnerUserId).name,
    );
  });

  /* 7 */
  it("does not let a Team Lead resolve values from another team", () => {
    // Farhan's record is owned by Ajay, who leads the Motor team.
    const otherTeamRecord = linkedRecordById("c733")!;
    expect(activeTeamOf(otherTeamRecord.recordOwnerUserId)!.id).not.toBe(
      activeTeamOf(lead.id)!.id,
    );
    const resolved = resolveTemplateValues(
      lead,
      { ...conv("w10"), linkedRecordId: otherTeamRecord.id },
      CUSTOMER_TEMPLATE,
    );
    expect(resolved.ok).toBe(false);
    expect(resolved.ok === false && resolved.block).toBe("record-out-of-scope");
  });

  /* 8 */
  it("limits a Manager to the records owned inside their hierarchy", () => {
    // The guarantee, stated as a set equality: exactly the active members of
    // the teams this Manager supervises, and nobody else.
    const expected = new Set(
      SALES_TEAMS.filter((t) => t.managerId === manager.id).flatMap((t) =>
        activeMemberships(t).map((m) => m.userId),
      ),
    );
    expect([...operationalUserIdsInScope(manager)].sort()).toEqual(
      [...expected].sort(),
    );

    // A record owned by somebody in no active team is outside it.
    const outsider = SETTINGS_USERS.find((u) => u.status === "Deactivated")!;
    expect(operationalUserIdsInScope(manager).has(outsider.id)).toBe(false);
    const resolved = resolveTemplateValues(
      manager,
      RAMESH,
      CUSTOMER_TEMPLATE,
      RAMESH_HEALTH,
    );
    expect(resolved.ok).toBe(true);
  });

  /* 9 */
  it("lets an Admin resolve values organization-wide", () => {
    const everyActiveMember = new Set(
      SALES_TEAMS.flatMap((t) => activeMemberships(t).map((m) => m.userId)),
    );
    expect([...operationalUserIdsInScope(admin)].sort()).toEqual(
      [...everyActiveMember].sort(),
    );
    // Every linked record, across every team, resolves for the Admin.
    for (const record of LINKED_RECORDS) {
      expect(
        operationalUserIdsInScope(admin).has(record.recordOwnerUserId),
        record.id,
      ).toBe(true);
    }
  });

  /* 10 */
  it("does not let reply permission alone expose an out-of-scope record", () => {
    // Sneha may answer Vikram Reddy's conversation; his record is owned in
    // another team. Replying is not reading the record.
    const vikramConv = conv("w9");
    expect(mayReplyToConversation(lead, vikramConv)).toBe(true);
    const resolved = resolveTemplateValues(
      lead,
      vikramConv,
      CUSTOMER_TEMPLATE,
      "c904-a",
    );
    expect(resolved.ok).toBe(false);
    expect(resolved.ok === false && resolved.block).toBe("record-out-of-scope");
  });

  /* 11 */
  it("never changes the Record Owner or the assignee by who is looking", () => {
    const record = linkedRecordById("c881")!;
    const ownerBefore = record.recordOwnerUserId;
    const assigneeBefore = RAMESH.assignedToUserId;

    const names = new Set<string>();
    for (const actor of [admin, manager, lead]) {
      const resolved = resolveTemplateValues(
        actor,
        RAMESH,
        OWNERSHIP_TEMPLATE,
        RAMESH_HEALTH,
      );
      expect(resolved.ok, actor.role).toBe(true);
      if (!resolved.ok) continue;
      names.add(resolved.values.record_owner_name!);
    }
    // One owner, whoever asked.
    expect(names.size).toBe(1);
    expect([...names][0]).toBe(userById(ownerBefore).name);
    // And nothing was mutated by reading.
    expect(linkedRecordById("c881")!.recordOwnerUserId).toBe(ownerBefore);
    expect(conv("w1").assignedToUserId).toBe(assigneeBefore);
  });
});
