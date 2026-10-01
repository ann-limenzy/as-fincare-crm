/**
 * Template variables: the §98 contract, and resolving them safely.
 *
 * §98 is unusually prescriptive, so this module follows it literally:
 *
 *   • it names the only variables permitted, as a closed union in
 *     `TEMPLATE_VARIABLES`;
 *   • "variables resolve only from the recipient's own record" — so resolution
 *     starts from the conversation's ONE linked record and can reach no other;
 *   • "a template must never be able to pull data from a record outside the
 *     sending user's permitted scope" — so the actor is checked against the
 *     conversation AND against the linked record's owner before any value is
 *     returned;
 *   • "if a required value is missing: identify the missing value, prevent
 *     that recipient's message from being sent until resolved" — so a partial
 *     result is never produced. It is all of the values or none of them, with
 *     the missing ones named.
 *
 * There is deliberately no lookup by name, no search across records and no
 * fallback to another customer. A missing value blocks the send; it is never
 * borrowed.
 */
import {
  BUSINESS,
  TEMPLATE_VARIABLES,
  linkedRecordById,
  type Conversation,
  type LinkedPurchase,
  type LinkedRecord,
  type SettingsUser,
  type Template,
  type TemplateVariable,
} from "@/lib/wireframes/mock-data";
import {
  activeTeamOf,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";
import {
  mayReplyToConversation,
  mayViewConversation,
  operationalUserIdsInScope,
} from "@/lib/wireframes/whatsapp-access";

/* ------------------------------------------------------------- the values */

/**
 * Resolved variable values.
 *
 * A mapped type over the union, not `Record<string, string>`: an arbitrary key
 * is a compile error, so no cast or loose object can smuggle a variable §98
 * does not permit past the contract.
 */
export type TemplateValues = {
  readonly [K in TemplateVariable]?: string;
};

const VARIABLE_SET: ReadonlySet<string> = new Set(TEMPLATE_VARIABLES);

/** Whether `name` is one of §98's variables. */
export function isTemplateVariable(name: string): name is TemplateVariable {
  return VARIABLE_SET.has(name);
}

/**
 * Variables a Customer Purchase supplies.
 *
 * Product Category is one of them: a customer holding both a health and a
 * motor policy has two categories, so "your {{product_category}} policy" is
 * only meaningful once the applicable purchase is known. A Lead has no
 * purchase at all, and takes its category from the enquiry on its own record.
 */
const PURCHASE_VARIABLES: readonly TemplateVariable[] = [
  "product_category",
  "provider",
  "plan_sub_product",
  "policy_reference_number",
  "renewal_date",
];

/* ------------------------------------------------------------- validation */

/** Every `{{placeholder}}` in a body, in order, including unsupported ones. */
export function placeholdersIn(body: string): readonly string[] {
  const out: string[] = [];
  for (const match of body.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) {
    const name = match[1]!;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

export type TemplateValidation = {
  readonly ok: boolean;
  /** Placeholders §98 does not permit at all. */
  readonly unknown: readonly string[];
  /** Supported placeholders used in the body but not declared. */
  readonly undeclared: readonly TemplateVariable[];
  /** Declared variables that never appear in the body. */
  readonly unused: readonly TemplateVariable[];
  /** Both name variables at once — §98 keeps Lead and Customer apart. */
  readonly conflictingNames: boolean;
};

/**
 * Check a template against §98 in both directions.
 *
 * A one-way check is not enough. An unknown placeholder would reach the
 * customer as literal `{{...}}`; a declared-but-absent variable means the
 * catalogue is describing something the message does not actually say, which
 * is how the Admin screen starts lying about what will be sent.
 */
export function validateTemplate(template: Template): TemplateValidation {
  const used = placeholdersIn(template.body);
  const unknown = used.filter((name) => !isTemplateVariable(name));
  const supported = used.filter(isTemplateVariable);
  const undeclared = supported.filter(
    (name) => !template.variables.includes(name),
  );
  const unused = template.variables.filter((name) => !supported.includes(name));
  const conflictingNames =
    template.variables.includes("customer_name") &&
    template.variables.includes("lead_name");
  return {
    ok:
      unknown.length === 0 &&
      undeclared.length === 0 &&
      unused.length === 0 &&
      !conflictingNames,
    unknown,
    undeclared,
    unused,
    conflictingNames,
  };
}

/** The first thing wrong with a template, phrased for the screen. */
export function templateContractProblem(template: Template): string | null {
  const result = validateTemplate(template);
  if (result.ok) return null;
  if (result.unknown.length > 0) {
    return `This template uses ${result.unknown
      .map((n) => `{{${n}}}`)
      .join(", ")}, which the CRM does not support. It cannot be sent.`;
  }
  if (result.conflictingNames) {
    return "This template asks for both a Customer name and a Lead name. One record cannot be both.";
  }
  if (result.undeclared.length > 0) {
    return `This template uses ${result.undeclared.join(", ")} without declaring it.`;
  }
  return `This template declares ${result.unused.join(", ")} but never uses it.`;
}

/* ------------------------------------------------------ record requirement */

export type RecordRequirement = "Lead" | "Customer" | "any";

/**
 * Which kind of record a template can address.
 *
 * Derived from the name variable it uses rather than stored separately, so the
 * two can never disagree. §98 keeps Customer Name and Lead Name apart, and a
 * template that needs a policy reference or renewal date needs a purchase,
 * which only a Customer has.
 */
export function templateRecordRequirement(
  template: Template,
): RecordRequirement {
  if (template.variables.includes("customer_name")) return "Customer";
  if (template.variables.includes("lead_name")) return "Lead";
  if (template.variables.some((v) => PURCHASE_VARIABLES.includes(v))) {
    return "Customer";
  }
  return "any";
}

/** Whether this template needs a Customer Purchase chosen. */
export function templateNeedsPurchase(template: Template): boolean {
  return template.variables.some((v) => PURCHASE_VARIABLES.includes(v));
}

/* ------------------------------------------------------------- resolution */

export type VariableBlock =
  /** The actor may not view or reply to this conversation. */
  | "not-authorized"
  /** No Lead or Customer is linked — an unknown number. */
  | "no-linked-record"
  /** The linked record's owner sits outside the actor's scope. */
  | "record-out-of-scope"
  /** The template addresses the other kind of record. */
  | "record-type-mismatch"
  /** More than one purchase and none chosen. */
  | "purchase-not-chosen"
  /** A chosen purchase that is not on this record. */
  | "purchase-not-on-record"
  /** A §98-supported value this record simply does not hold. */
  | "missing-values"
  /** The template itself breaks the §98 contract. */
  | "template-invalid";

export type VariableResolution =
  | {
      readonly ok: true;
      readonly values: TemplateValues;
      /** The purchase the values came from, where one applied. */
      readonly purchase: LinkedPurchase | null;
      readonly record: LinkedRecord;
    }
  | {
      readonly ok: false;
      readonly block: VariableBlock;
      readonly reason: string;
      /** Named, as §98 requires, so the user knows what to correct. */
      readonly missing: readonly TemplateVariable[];
      /** The purchases to choose between, when that is what is wrong. */
      readonly choices: readonly LinkedPurchase[];
    };

function blocked(
  block: VariableBlock,
  reason: string,
  missing: readonly TemplateVariable[] = [],
  choices: readonly LinkedPurchase[] = [],
): VariableResolution {
  return { ok: false, block, reason, missing, choices };
}

/**
 * Resolve a template's variables for one conversation, or refuse.
 *
 * The order of the guards is the order §98 and §89.1 require: authorization
 * first, then the record link, then the record's own scope, then whether the
 * template even addresses this kind of record, then the values themselves.
 * Nothing personal is read until every one of those has passed.
 */
export function resolveTemplateValues(
  actor: SettingsUser,
  conversation: Conversation,
  template: Template,
  purchaseId: string | null = null,
): VariableResolution {
  if (templateContractProblem(template) !== null) {
    return blocked(
      "template-invalid",
      templateContractProblem(template) ?? "This template cannot be sent.",
    );
  }

  // §98: "outside the sending user's permitted scope". Replying is the right
  // test, not merely viewing — a supervisor who may read an unassigned
  // conversation may not send on it, so they have no business populating a
  // message for it either.
  if (
    !mayViewConversation(actor, conversation) ||
    !mayReplyToConversation(actor, conversation)
  ) {
    return blocked(
      "not-authorized",
      "You cannot send on this conversation, so no customer details are populated for it.",
    );
  }

  if (conversation.linkedRecordId === null) {
    return blocked(
      "no-linked-record",
      "This conversation is not linked to a Lead or Customer yet, so there is no record to take these details from. Create the Lead first.",
    );
  }

  const record = linkedRecordById(conversation.linkedRecordId);
  if (!record) {
    return blocked(
      "no-linked-record",
      "The linked record is not available, so nothing is populated.",
    );
  }

  // The owner is checked, not just the conversation. A conversation can be
  // assigned into one team while its record is owned in another, and §98 does
  // not let a template reveal the second.
  if (!operationalUserIdsInScope(actor).has(record.recordOwnerUserId)) {
    return blocked(
      "record-out-of-scope",
      "The linked record is owned outside your permitted scope, so its details are not populated here.",
    );
  }

  const requirement = templateRecordRequirement(template);
  if (requirement !== "any" && requirement !== record.kind) {
    return blocked(
      "record-type-mismatch",
      `This template is written for a ${requirement} and this conversation is linked to a ${record.kind}. ${
        requirement === "Customer"
          ? "A Lead has no policy to refer to."
          : "Choose a template written for a Customer."
      }`,
    );
  }

  // §98: never select a purchase silently. Where the record holds more than
  // one, the applicable one is an explicit choice.
  let purchase: LinkedPurchase | null = null;
  if (templateNeedsPurchase(template) || record.kind === "Customer") {
    if (purchaseId !== null) {
      purchase = record.purchases.find((p) => p.id === purchaseId) ?? null;
      if (purchase === null) {
        return blocked(
          "purchase-not-on-record",
          "That policy does not belong to this record, so nothing is populated from it.",
        );
      }
    } else if (record.purchases.length === 1) {
      purchase = record.purchases[0]!;
    } else if (record.purchases.length > 1 && templateNeedsPurchase(template)) {
      return blocked(
        "purchase-not-chosen",
        "This customer holds more than one policy. Choose which one the message is about — the CRM will not pick for you.",
        [],
        record.purchases,
      );
    }
  }

  const owner = userById(record.recordOwnerUserId);
  const ownerTeam = activeTeamOf(owner.id);
  const ownerTeamLead = ownerTeam ? teamLeadOf(ownerTeam) : undefined;
  // §98 "Team Lead Name, where appropriate" — the owner's Team Lead, and only
  // when that person is themselves inside the actor's scope.
  const teamLeadName =
    ownerTeamLead && operationalUserIdsInScope(actor).has(ownerTeamLead.userId)
      ? userById(ownerTeamLead.userId).name
      : undefined;

  const productCategory =
    purchase?.productCategory ?? record.productCategory ?? undefined;

  /** Every §98 variable this record can answer. Nothing is invented. */
  const available: TemplateValues = {
    ...(record.kind === "Customer" ? { customer_name: record.name } : {}),
    ...(record.kind === "Lead" ? { lead_name: record.name } : {}),
    ...(productCategory === undefined
      ? {}
      : { product_category: productCategory }),
    ...(purchase === null
      ? {}
      : {
          provider: purchase.provider,
          plan_sub_product: purchase.planSubProduct,
          policy_reference_number: purchase.policyReference,
          renewal_date: purchase.renewalDate,
        }),
    record_owner_name: owner.name,
    ...(teamLeadName === undefined ? {} : { team_lead_name: teamLeadName }),
    business_name: BUSINESS.name,
    business_contact_details: BUSINESS.contactDetails,
  };

  const missing = template.variables.filter(
    (v) => available[v] === undefined || available[v] === "",
  );
  if (missing.length > 0) {
    return blocked(
      "missing-values",
      `This record does not hold ${missing.join(", ")}. Add it to the record before sending — no other record is consulted for it.`,
      missing,
    );
  }

  // Only what the template declared. A resolved value the template never
  // asked for has no reason to be handed onwards.
  const values: TemplateValues = Object.fromEntries(
    template.variables.map((v) => [v, available[v]!]),
  );
  return { ok: true, values, purchase, record };
}

/* ------------------------------------------------------------ substitution */

export type FilledTemplate = {
  readonly text: string;
  /** Placeholders still showing after substitution, in first-seen order. */
  readonly unresolved: readonly string[];
};

/**
 * Substitute a template body from resolved values.
 *
 * Takes `TemplateValues`, so an untyped bag of strings cannot be passed in.
 * Anything left unsubstituted is reported rather than shipped: §98 forbids
 * sending incomplete template text.
 */
export function fillTemplate(
  body: string,
  values: TemplateValues,
): FilledTemplate {
  const unresolved: string[] = [];
  const text = body.replace(
    /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g,
    (whole, name: string) => {
      const value = isTemplateVariable(name) ? values[name] : undefined;
      if (value === undefined) {
        if (!unresolved.includes(name)) unresolved.push(name);
        return whole;
      }
      return value;
    },
  );
  return { text, unresolved };
}
