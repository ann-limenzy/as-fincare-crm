/**
 * Customer Purchases, their required policy documents, and Closed Amount
 * (spec §65, §67, §68, §68.1, §68.2, §68.3, §83, §193.4, §205).
 *
 * A Customer Purchase is "one specific Plan acquired by one Customer" (§66). It
 * references a PLAN id and reads its Provider and Product Category back through
 * `catalogue.ts`, because §66 forbids a purchase against a Category or a
 * Provider on their own, and §193 lets those names be renamed.
 *
 * Two rules drive almost everything here, and they are deliberately separate:
 *
 *   §68.1 — a purchase cannot be marked `Closed/Active` while any required
 *           policy document is missing. Uploading is sufficient; "no approval,
 *           review or sign-off follows the upload."
 *   §68.3 — a Closed Amount becomes ELIGIBLE only when the documents are
 *           complete AND the purchase is `Closed/Active`.
 *
 * So uploading a document and changing status are two actions, and neither one
 * performs the other. Nothing here touches ownership: §68 makes changing the
 * Record Owner its own audited action, and §2.5 keeps owners operational.
 *
 * Not in this module, on purpose: incentive arithmetic. §206 lists formulas,
 * percentages, slabs, periods and payouts as pending client confirmation and
 * says "no value, formula or rule should be assumed or illustrated until
 * confirmed". This module reports an eligible amount and stops there.
 */
import { planLineage, type PlanLineage } from "@/lib/wireframes/catalogue";

/* ------------------------------------------------------------------ money */

/**
 * Closed Amount, in paise.
 *
 * An integer count of the smallest unit. A rupee figure held as a float cannot
 * represent ₹18,400.10 exactly, and totals that roll up through a hierarchy
 * (§68.3) would drift by fractions of a paisa per purchase — small, invisible,
 * and in a money column. Integers cannot drift.
 */
export type Paise = number;

export function rupeesToPaise(rupees: number, paise = 0): Paise {
  return Math.round(rupees) * 100 + Math.round(paise);
}

/** Indian digit grouping, from integer paise. No floating-point arithmetic. */
export function formatPaise(amount: Paise): string {
  const negative = amount < 0;
  const total = Math.abs(Math.trunc(amount));
  const whole = Math.trunc(total / 100);
  const fraction = total % 100;
  const digits = String(whole);
  // 12,34,567 — the last three digits, then pairs.
  const head = digits.length > 3 ? digits.slice(0, digits.length - 3) : "";
  const tail = digits.slice(-3);
  const grouped = head
    ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${tail}`
    : tail;
  const sign = negative ? "-" : "";
  return `${sign}₹${grouped}.${String(fraction).padStart(2, "0")}`;
}

/** Sum paise exactly. Used for roll-ups (§68.3). */
export function sumPaise(amounts: readonly Paise[]): Paise {
  return amounts.reduce((total, amount) => total + Math.trunc(amount), 0);
}

/* ----------------------------------------------------------------- status */

/**
 * The purchase statuses §68.1 LISTS.
 *
 * Deliberately not called "confirmed". §68.1's own pending block says, of the
 * status list: "The names used above should not be treated as final." The
 * sentence is plural and refers to the list above it, so none of these names is
 * reported here as settled terminology.
 *
 * What §68.1 does settle is the significance of one of them: "`Closed/Active` is
 * the status introduced by this specification and is the one that gates
 * performance and incentive eligibility." That role is confirmed; the wording
 * A&S Fincare will finally use for any of these is not.
 *
 * `Completed`, `Expired` and `Cancelled` appear because §68.1 lists them and
 * §78 instructs one of them ("set the Customer Purchase status to
 * **Completed**"). They are specification-listed, not client-approved labels.
 */
export type SpecifiedPurchaseStatus =
  "closed-active" | "completed" | "expired" | "cancelled";

/**
 * The condition a purchase is in before it is closed.
 *
 * Held apart from the listed statuses because §212's register records the open
 * question as "whether a distinct intermediate purchase status is required
 * between creation and `Closed/Active`" — so whether this is a status at all is
 * undecided, never mind what it would be called.
 */
export const PRE_CLOSURE = "pre-closure" as const;
export type PreClosureCondition = typeof PRE_CLOSURE;

/** What a purchase may carry today: a listed status, or the condition. */
export type PurchaseStatus = SpecifiedPurchaseStatus | PreClosureCondition;

/** The four §68.1 lists. Nothing else is a status value. */
export const SPECIFIED_PURCHASE_STATUSES: readonly SpecifiedPurchaseStatus[] = [
  "closed-active",
  "completed",
  "expired",
  "cancelled",
];

export function isSpecifiedStatus(
  status: PurchaseStatus,
): status is SpecifiedPurchaseStatus {
  return (SPECIFIED_PURCHASE_STATUSES as readonly string[]).includes(status);
}

/**
 * The one thing §68.1 states affirmatively about a status, with no pending
 * qualifier anywhere: `Closed/Active` is what gates eligibility.
 */
export const CLOSED_ACTIVE: SpecifiedPurchaseStatus = "closed-active";

/** §68.1: the terminology itself is not final. */
export const STATUS_TERMINOLOGY_PENDING =
  "§68.1 lists these status names but says they \u201cshould not be treated as final\u201d, so the wording is pending confirmation with A&S Fincare. What is settled is that Closed/Active is the status that gates eligibility.";

/**
 * How each reads on screen — §68.1's own wording for the four it lists.
 *
 * The pre-closure wording is a description, "Not yet closed", rather than a
 * name, because whether it is a status at all is the pending question.
 */
export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  "closed-active": "Closed/Active",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
  [PRE_CLOSURE]: "Not yet closed",
};

export const INTERMEDIATE_STATUS_PENDING =
  "Whether A&S Fincare needs a distinct status between creating a purchase and Closed/Active \u2014 and what it would be called \u2014 is pending confirmation (§68.1, §212). \u201cNot yet closed\u201d describes the condition and is not an approved status name.";

/**
 * §68.1 and §68.3 both treat cancellation, lapse, refund and reversal after
 * `Closed/Active` — and their effect on an already-counted Closed Amount — as
 * pending. Nothing here implements a reversal, and no amount is ever
 * un-counted by this module.
 */
export const REVERSAL_PENDING =
  "What happens to an already-counted Closed Amount if a purchase is later cancelled, lapses, is refunded or is reversed is pending confirmation (§68.1, §68.3). No reversal behaviour is implemented.";

/* -------------------------------------------------------------- documents */

/**
 * A required policy-document type.
 *
 * §205: policy-related only — "V1 does not require personal identity documents,
 * KYC documents, general personal documents unrelated to the policy, document
 * approval, document review or approval queues." There is no approval field
 * here and no reviewer, because there is no approval step to record.
 */
export type DocumentType = {
  readonly id: string;
  readonly name: string;
};

/** §68.2's own example list, plus the two §205 names. */
export const DOCUMENT_TYPES: readonly DocumentType[] = [
  { id: "doc-schedule", name: "Policy schedule" },
  { id: "doc-proposal", name: "Proposal form" },
  { id: "doc-certificate", name: "Policy certificate" },
  { id: "doc-endorsement", name: "Endorsement document" },
  { id: "doc-renewal-notice", name: "Renewal notice" },
];

export function documentTypeById(
  id: string,
  from: readonly DocumentType[] = DOCUMENT_TYPES,
): DocumentType | undefined {
  return from.find((d) => d.id === id);
}

/**
 * One uploaded file, held against a Customer Purchase (§68.2, §205).
 *
 * §68.2: "documents are uploaded against the Customer Purchase, not against the
 * Customer." Fields are exactly §205's list — Document Type, File Name, File
 * Type, Uploaded By, Uploaded Date — and no more. No version, no approval, no
 * reviewer, no signature.
 */
export type UploadedDocument = {
  readonly id: string;
  /** The required type this file satisfies, or null for an extra document. */
  readonly documentTypeId: string | null;
  readonly fileName: string;
  readonly fileType: string;
  /** SETTINGS_USERS id. Never a display name. */
  readonly uploadedByUserId: string;
  readonly uploadedAt: string;
};

/* ------------------------------------------------------------- the record */

export type CustomerPurchase = {
  readonly id: string;
  /** Which Customer. §65: a Customer may have zero, one or many purchases. */
  readonly customerId: string;
  /**
   * §66, §193.3: the Plan — never a Category or Provider. Those are derived
   * through `planLineage`, so this is the single catalogue reference.
   */
  readonly planId: string;
  /** §67: "Policy / Reference Number — optional at creation". */
  readonly policyReference: string | null;
  /** §67: "Start / Effective Date — optional". */
  readonly startDate: string | null;
  /** §67: "Renewal Date — optional". */
  readonly renewalDate: string | null;
  readonly status: PurchaseStatus;
  /**
   * §67: Record Owner is required and "may be changed to another Team Lead or
   * Salesperson… Admins and Managers are never selectable." An id, so no screen
   * decides ownership by comparing printed names.
   */
  readonly recordOwnerUserId: string;
  /**
   * §68.3's Closed Amount — "the value recorded against an individual Customer
   * Purchase". Null where none has been recorded. Recording one does not make
   * it eligible; see `eligibleClosedAmount`.
   */
  readonly recordedClosedAmount: Paise | null;
  /**
   * This purchase's effective required-document checklist (§193.4).
   *
   * Held on the purchase because §193.4 leaves the administrative level
   * undecided — "it may be defined per Product Category, per Provider, per
   * Plan, per individual purchase, or as a combination… Implementation must not
   * assume a particular administration level." What §193.4 does fix is that
   * "each Customer Purchase resolves to a definite list of required documents
   * and reports its completeness", which is exactly this field.
   */
  readonly requiredDocumentTypeIds: readonly string[];
  readonly documents: readonly UploadedDocument[];
  readonly notes?: string;
  /** §68: "created and last-updated history". */
  readonly createdAt: string;
  readonly updatedAt: string;
};

/**
 * §83 and §205: "which roles may upload, replace or remove policy documents is
 * pending client confirmation before security implementation and UAT."
 *
 * So no role gate is encoded anywhere in this module. The demonstration data
 * shows the purchase's own Salesperson Record Owner doing the uploading, which
 * is the one persona the client has confirmed does this work — not a decision
 * that only owners may ever upload.
 */
export const DOCUMENT_PERMISSIONS_PENDING =
  "Which roles may upload, replace or remove policy documents is pending confirmation (§83, §205). These wireframes show the purchase's own Record Owner doing it and encode no role rule.";

/** §193.4: the checklist is illustrative until its administration is settled. */
export const REQUIRED_DOCUMENTS_LEVEL_PENDING =
  "The level at which the required-document list is maintained — per Product Category, Provider, Plan, individual purchase, or a combination — is pending confirmation (§193.4). Each purchase resolves to a definite list; where that list is administered is not yet decided.";

/* ------------------------------------------------------ document completeness */

export type RequiredDocumentState = {
  readonly type: DocumentType;
  readonly present: boolean;
  /** The file satisfying it, where present. */
  readonly document?: UploadedDocument;
};

export type DocumentCompleteness = {
  /** §68.2 "overall completeness, for example 2 of 3 uploaded". */
  readonly uploaded: number;
  readonly required: number;
  readonly complete: boolean;
  readonly items: readonly RequiredDocumentState[];
  readonly missing: readonly DocumentType[];
  /**
   * §68.2: "additional, non-required policy documents may also be uploaded.
   * They do not affect the completeness calculation."
   */
  readonly additional: readonly UploadedDocument[];
};

/**
 * This purchase's required-document checklist and how much of it is satisfied.
 *
 * Scoped to the purchase, never to the Customer — §68.2 is explicit about that,
 * and a Customer-level checklist would let one purchase's policy schedule close
 * another purchase.
 */
export function documentCompleteness(
  purchase: CustomerPurchase,
  types: readonly DocumentType[] = DOCUMENT_TYPES,
): DocumentCompleteness {
  const items: RequiredDocumentState[] = [];
  const missing: DocumentType[] = [];

  for (const typeId of purchase.requiredDocumentTypeIds) {
    const type = documentTypeById(typeId, types) ?? {
      id: typeId,
      name: `Unknown document type (${typeId})`,
    };
    const document = purchase.documents.find(
      (d) => d.documentTypeId === typeId,
    );
    if (document) {
      items.push({ type, present: true, document });
    } else {
      items.push({ type, present: false });
      missing.push(type);
    }
  }

  const required = purchase.requiredDocumentTypeIds.length;
  const uploaded = required - missing.length;
  const additional = purchase.documents.filter(
    (d) =>
      d.documentTypeId === null ||
      !purchase.requiredDocumentTypeIds.includes(d.documentTypeId),
  );

  return {
    uploaded,
    required,
    complete: missing.length === 0,
    items,
    missing,
    additional,
  };
}

/** §68.2's summary line, e.g. "2 of 3". */
export function completenessLabel(purchase: CustomerPurchase): string {
  const { uploaded, required } = documentCompleteness(purchase);
  return `${uploaded} of ${required}`;
}

/* --------------------------------------------------- the Closed/Active gate */

export type ClosureCheck =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly missing: readonly DocumentType[];
    };

/**
 * Whether this purchase may be marked `Closed/Active` (§68.1).
 *
 * §68.1: the action "must be unavailable while any required document is
 * missing, and must explain why rather than failing silently or without
 * reason" — hence the named missing types rather than a bare false.
 *
 * In a real system §68.1 also requires this to be validated on the server;
 * these are wireframes with no server, and the screens call this helper rather
 * than deciding for themselves.
 */
export function mayMarkClosedActive(purchase: CustomerPurchase): ClosureCheck {
  if (purchase.status === "closed-active") {
    return {
      ok: false,
      reason: "This purchase is already Closed/Active.",
      missing: [],
    };
  }
  const completeness = documentCompleteness(purchase);
  if (!completeness.complete) {
    const names = completeness.missing.map((d) => d.name).join(", ");
    return {
      ok: false,
      reason: `${completeness.missing.length} required policy ${
        completeness.missing.length === 1 ? "document is" : "documents are"
      } still missing: ${names}. Upload ${
        completeness.missing.length === 1 ? "it" : "them"
      } before marking this purchase Closed/Active.`,
      missing: completeness.missing,
    };
  }
  return { ok: true };
}

/**
 * Whether a purchase's recorded status is internally consistent.
 *
 * §68.1 makes `Closed/Active` with a missing required document impossible, so a
 * record in that state is invalid rather than merely ineligible — and saying so
 * is how a defect gets caught instead of quietly producing an eligible amount.
 */
export function purchaseIntegrityProblem(
  purchase: CustomerPurchase,
): string | null {
  if (
    purchase.status === "closed-active" &&
    !documentCompleteness(purchase).complete
  ) {
    return `${purchase.id} is recorded as Closed/Active while required policy documents are missing, which §68.1 does not permit.`;
  }
  return null;
}

/**
 * Mark a purchase `Closed/Active`, or refuse (§68.1).
 *
 * Pure. Returns a new purchase; the caller holds the result. Ownership,
 * documents, Closed Amount and the plan reference are all carried through
 * untouched — closing a sale is not a transfer of anything.
 */
export function markClosedActive(
  purchase: CustomerPurchase,
  at: string,
):
  | { readonly ok: true; readonly purchase: CustomerPurchase }
  | { readonly ok: false; readonly reason: string } {
  const check = mayMarkClosedActive(purchase);
  if (!check.ok) return { ok: false, reason: check.reason };
  return {
    ok: true,
    purchase: { ...purchase, status: "closed-active", updatedAt: at },
  };
}

/**
 * Add an uploaded document (§68.2).
 *
 * §68.1: "uploading the required documents is by itself sufficient to satisfy
 * the document prerequisite" — and nothing more. The status is deliberately
 * carried over unchanged, so completing the checklist makes the purchase
 * ELIGIBLE to be closed without closing it. §68 keeps Upload Documents and
 * Mark Closed/Active as two separate actions.
 */
export function uploadDocument(
  purchase: CustomerPurchase,
  document: UploadedDocument,
  at: string,
): CustomerPurchase {
  const withoutReplaced = purchase.documents.filter(
    (d) =>
      document.documentTypeId === null ||
      d.documentTypeId !== document.documentTypeId,
  );
  return {
    ...purchase,
    documents: [...withoutReplaced, document],
    // status, recordOwnerUserId, recordedClosedAmount and planId untouched.
    updatedAt: at,
  };
}

/* --------------------------------------------------------- Closed Amount */

export type EligibleAmount =
  | { readonly eligible: true; readonly amount: Paise }
  | { readonly eligible: false; readonly reason: string };

/**
 * The Closed Amount currently allowed to contribute to performance totals.
 *
 * §68.3: eligible "only when BOTH conditions hold: 1. the required policy
 * documents for that purchase are complete; and 2. the purchase is
 * `Closed/Active`." Each condition is checked separately so the reason names
 * the one that is actually outstanding.
 *
 * §68.3 also: "a Customer Purchase existing, or a Customer existing, does not
 * by itself make any amount eligible."
 */
export function eligibleClosedAmount(
  purchase: CustomerPurchase,
): EligibleAmount {
  const invalid = purchaseIntegrityProblem(purchase);
  if (invalid !== null) return { eligible: false, reason: invalid };

  if (purchase.recordedClosedAmount === null) {
    return {
      eligible: false,
      reason: "No Closed Amount has been recorded on this purchase.",
    };
  }
  if (!documentCompleteness(purchase).complete) {
    return {
      eligible: false,
      reason: "Required policy documents are incomplete.",
    };
  }
  if (purchase.status !== "closed-active") {
    return {
      eligible: false,
      reason: "This purchase is not Closed/Active.",
    };
  }
  return { eligible: true, amount: purchase.recordedClosedAmount };
}

/** The amount entered on the purchase, eligible or not (§68.3). */
export function recordedClosedAmount(purchase: CustomerPurchase): Paise | null {
  return purchase.recordedClosedAmount;
}

/**
 * Eligible Closed Amount across a set of purchases (§68.3 roll-ups).
 *
 * A total, not an incentive. §68.3: "Closed Amount is the transaction value
 * recorded on a purchase. It is not itself revenue, commission or an
 * incentive." No rate, slab or percentage is applied here or anywhere.
 */
export function totalEligibleClosedAmount(
  purchases: readonly CustomerPurchase[],
): Paise {
  return sumPaise(
    purchases.map((p) => {
      const result = eligibleClosedAmount(p);
      return result.eligible ? result.amount : 0;
    }),
  );
}

/** The recorded total, for contrast with the eligible one. */
export function totalRecordedClosedAmount(
  purchases: readonly CustomerPurchase[],
): Paise {
  return sumPaise(purchases.map((p) => p.recordedClosedAmount ?? 0));
}

/* ------------------------------------------------------------- resolution */

export type ResolvedPurchase = {
  readonly purchase: CustomerPurchase;
  readonly lineage: PlanLineage;
  readonly completeness: DocumentCompleteness;
  readonly closure: ClosureCheck;
  readonly recorded: Paise | null;
  readonly eligible: EligibleAmount;
};

export type ResolvedPurchaseResult =
  | { readonly ok: true; readonly resolved: ResolvedPurchase }
  | { readonly ok: false; readonly reason: string };

/**
 * Everything a purchase screen needs, with the catalogue hierarchy resolved.
 *
 * One function so the detail screen, the summary list and the Customer profile
 * cannot disagree about a purchase's category, completeness or eligibility.
 */
export function resolvePurchase(
  purchase: CustomerPurchase,
): ResolvedPurchaseResult {
  const lineage = planLineage(purchase.planId);
  if (!lineage.ok) return { ok: false, reason: lineage.reason };
  return {
    ok: true,
    resolved: {
      purchase,
      lineage: lineage.lineage,
      completeness: documentCompleteness(purchase),
      closure: mayMarkClosedActive(purchase),
      recorded: purchase.recordedClosedAmount,
      eligible: eligibleClosedAmount(purchase),
    },
  };
}

/* -------------------------------------------------------- illustrative data */

/**
 * The illustrative Customer Purchases.
 *
 * Ramesh Kumar (Customer · #881) holds exactly the two purchases already
 * established across the Customer profile and the WhatsApp policy selector —
 * §65 allows many, but two screens describing one person differently is worse
 * than a smaller example. The other two demonstration states belong to other
 * Customers.
 *
 * §65: "a Customer may have zero, one or many… Each Customer Purchase is
 * independent: it carries its own Provider, Plan, policy number, Closed Amount,
 * documents, status, Record Owner and renewal cycles."
 *
 * Four purchases, chosen to make every state in §68.1 and §68.3 visible:
 *
 *   cp-881-a  Ramesh — eligible: documents complete and Closed/Active
 *   cp-881-b  Ramesh — documents incomplete: closing blocked, not eligible
 *   cp-904-a  Vikram — documents complete but NOT closed: still not eligible
 *   cp-893-a  Anil   — held against a withdrawn Plan: historically readable
 *
 * The Record Owner is Neha Thomas (s4) throughout, which is §67's default: "Record
 * Owner defaults to the Customer's Record Owner." She is a Salesperson; §2.5
 * and §68.3 keep Admins and Managers out of ownership entirely.
 */
export const CUSTOMER_PURCHASES: readonly CustomerPurchase[] = [
  {
    id: "cp-881-a",
    customerId: "c881",
    planId: "plan-fho",
    policyReference: "POL-TEST-881-A",
    startDate: "26 September 2024",
    renewalDate: "26 September 2026",
    status: "closed-active",
    recordOwnerUserId: "s4",
    recordedClosedAmount: rupeesToPaise(18_400),
    requiredDocumentTypeIds: [
      "doc-schedule",
      "doc-proposal",
      "doc-certificate",
    ],
    documents: [
      {
        id: "ud-1",
        documentTypeId: "doc-schedule",
        fileName: "policy-schedule-881-a.pdf",
        fileType: "PDF",
        uploadedByUserId: "s4",
        uploadedAt: "01 Sep 2026",
      },
      {
        id: "ud-2",
        documentTypeId: "doc-proposal",
        fileName: "proposal-form-881-a.pdf",
        fileType: "PDF",
        uploadedByUserId: "s4",
        uploadedAt: "01 Sep 2026",
      },
      {
        /*
         * Uploaded by the purchase's own Record Owner, like every other file
         * here. §83 and §205 both leave "which roles may upload, replace or
         * remove policy documents" pending client confirmation, so the
         * wireframe demonstrates only the persona the client has already said
         * will do this work — the Salesperson who owns the purchase. It is not
         * a claim that nobody else will ever be permitted to.
         */
        id: "ud-3",
        documentTypeId: "doc-certificate",
        fileName: "policy-certificate-881-a.pdf",
        fileType: "PDF",
        uploadedByUserId: "s4",
        uploadedAt: "02 Sep 2026",
      },
      {
        // §68.2: an extra document that is not on the checklist. It must not
        // change the completeness figure.
        id: "ud-4",
        documentTypeId: null,
        fileName: "welcome-letter-881-a.pdf",
        fileType: "PDF",
        uploadedByUserId: "s4",
        uploadedAt: "02 Sep 2026",
      },
    ],
    createdAt: "26 Sep 2024",
    updatedAt: "02 Sep 2026",
  },
  {
    id: "cp-881-b",
    customerId: "c881",
    planId: "plan-car-comp",
    policyReference: "POL-TEST-881-B",
    startDate: "11 January 2025",
    renewalDate: "11 January 2027",
    // Not closed, because a required document is outstanding (§68.1).
    status: PRE_CLOSURE,
    recordOwnerUserId: "s4",
    // §68.3: recording an amount does not make it eligible.
    recordedClosedAmount: rupeesToPaise(7_250),
    requiredDocumentTypeIds: ["doc-schedule", "doc-certificate"],
    documents: [
      {
        id: "ud-5",
        documentTypeId: "doc-schedule",
        fileName: "policy-schedule-881-b.pdf",
        fileType: "PDF",
        uploadedByUserId: "s4",
        uploadedAt: "12 Jan 2025",
      },
    ],
    notes: "Awaiting the certificate from the provider.",
    createdAt: "11 Jan 2025",
    updatedAt: "12 Jan 2025",
  },
  {
    /*
     * Vikram Reddy's one purchase, not Ramesh's. §65 lets a Customer hold many,
     * but Ramesh already has exactly two established across the Customer and
     * WhatsApp flows, and a third would make the two screens disagree about the
     * same person. This is the same policy his WhatsApp conversation is about.
     */
    id: "cp-904-a",
    customerId: "c904",
    planId: "plan-car-comp",
    policyReference: "POL-TEST-904-A",
    startDate: "20 September 2025",
    renewalDate: "20 September 2026",
    /*
     * Documents complete, and §68.1 is explicit that "no approval, review or
     * sign-off follows the upload" — yet the purchase is still not closed.
     * Completing the checklist makes it ELIGIBLE to be closed; it does not
     * close it, and the amount stays ineligible until someone does.
     */
    status: PRE_CLOSURE,
    // Kavya Raghavan, a Salesperson in the Motor team — and the uploader below.
    recordOwnerUserId: "s10",
    recordedClosedAmount: rupeesToPaise(24_000),
    requiredDocumentTypeIds: ["doc-proposal", "doc-schedule"],
    documents: [
      {
        id: "ud-6",
        documentTypeId: "doc-proposal",
        fileName: "proposal-form-904-a.pdf",
        fileType: "PDF",
        uploadedByUserId: "s10",
        uploadedAt: "21 September 2025",
      },
      {
        id: "ud-7",
        documentTypeId: "doc-schedule",
        fileName: "policy-schedule-904-a.pdf",
        fileType: "PDF",
        uploadedByUserId: "s10",
        uploadedAt: "21 September 2025",
      },
    ],
    createdAt: "20 September 2025",
    updatedAt: "21 September 2025",
  },
  {
    /*
     * Bought before the plan was withdrawn. §193.3: "deactivating a Plan
     * prevents it from being selected for new Customer Purchases. Existing
     * purchases keep their Plan reference, their history and their renewal
     * cycles." So this one still resolves and still displays.
     */
    id: "cp-893-a",
    /*
     * Anil Varghese (Customer · #893). Deliberately a Customer with no WhatsApp
     * conversation, so adding this historical purchase cannot make two screens
     * report different numbers of purchases for the same person.
     *
     * §67: the purchase's Record Owner "defaults to the Customer's Record Owner
     * and may be changed to another Team Lead or Salesperson". Here it is Neha,
     * a Salesperson — and the uploader below.
     */
    customerId: "c893",
    planId: "plan-health-classic",
    policyReference: "POL-TEST-893-A",
    startDate: "18 March 2022",
    renewalDate: null,
    status: "completed",
    recordOwnerUserId: "s4",
    recordedClosedAmount: rupeesToPaise(11_900),
    requiredDocumentTypeIds: ["doc-schedule"],
    documents: [
      {
        id: "ud-8",
        documentTypeId: "doc-schedule",
        fileName: "policy-schedule-893-a.pdf",
        fileType: "PDF",
        uploadedByUserId: "s4",
        uploadedAt: "19 March 2022",
      },
    ],
    notes: "Ran its course and was not renewed.",
    createdAt: "18 March 2022",
    updatedAt: "20 March 2024",
  },
];

/**
 * The remaining Customers who hold a WhatsApp conversation.
 *
 * Each has the one purchase its conversation is about, so the WhatsApp policy
 * selector and the Customer profile report the same number for the same person.
 *
 * They carry no uploaded documents on purpose: §83 and §205 leave document
 * permissions pending, and a purchase with no uploader asserts nothing about
 * who may upload. The three demonstration states live on the four purchases
 * above.
 */
export const CONVERSATION_PURCHASES: readonly CustomerPurchase[] = [
  {
    id: "cp-712-a",
    customerId: "c712",
    planId: "plan-car-puc",
    policyReference: "PUC-TEST-712-A",
    startDate: "02 October 2025",
    renewalDate: "02 October 2026",
    status: PRE_CLOSURE,
    recordOwnerUserId: "s3",
    recordedClosedAmount: null,
    requiredDocumentTypeIds: ["doc-certificate"],
    documents: [],
    createdAt: "02 October 2025",
    updatedAt: "02 October 2025",
  },
  {
    id: "cp-688-a",
    customerId: "c688",
    planId: "plan-tw-comp",
    policyReference: "POL-TEST-688-A",
    startDate: "09 September 2026",
    renewalDate: "09 September 2027",
    status: PRE_CLOSURE,
    recordOwnerUserId: "s3",
    recordedClosedAmount: null,
    requiredDocumentTypeIds: ["doc-schedule"],
    documents: [],
    createdAt: "09 September 2026",
    updatedAt: "09 September 2026",
  },
  {
    id: "cp-517-a",
    customerId: "c517",
    planId: "plan-car-puc",
    policyReference: "PUC-TEST-517-A",
    startDate: "18 September 2025",
    renewalDate: "18 September 2026",
    status: PRE_CLOSURE,
    recordOwnerUserId: "s4",
    recordedClosedAmount: null,
    requiredDocumentTypeIds: ["doc-certificate"],
    documents: [],
    createdAt: "18 September 2025",
    updatedAt: "18 September 2025",
  },
  {
    id: "cp-733-a",
    customerId: "c733",
    planId: "plan-car-comp",
    policyReference: "POL-TEST-733-A",
    startDate: "09 September 2026",
    renewalDate: "09 September 2027",
    status: PRE_CLOSURE,
    recordOwnerUserId: "s8",
    recordedClosedAmount: null,
    requiredDocumentTypeIds: ["doc-schedule"],
    documents: [],
    createdAt: "09 September 2026",
    updatedAt: "09 September 2026",
  },
];

/** Every canonical Customer Purchase in the wireframes. */
export const ALL_CUSTOMER_PURCHASES: readonly CustomerPurchase[] = [
  ...CUSTOMER_PURCHASES,
  ...CONVERSATION_PURCHASES,
];

export function purchaseById(
  id: string,
  from: readonly CustomerPurchase[] = ALL_CUSTOMER_PURCHASES,
): CustomerPurchase | undefined {
  return from.find((p) => p.id === id);
}

/** §65: the purchases belonging to one Customer. */
export function purchasesForCustomer(
  customerId: string,
  from: readonly CustomerPurchase[] = ALL_CUSTOMER_PURCHASES,
): readonly CustomerPurchase[] {
  return from.filter((p) => p.customerId === customerId);
}

/* ------------------------------------------------------------------ audit */

/**
 * One append-only audit entry for a Customer Purchase action (§68.3, §205,
 * §208).
 *
 * §208 requires the actor, the time and the before/after values. The labels are
 * SNAPSHOTS of what the catalogue said at the time, not lookups: §207 forbids a
 * later rename rewriting what history recorded.
 */
export type PurchaseAuditEntry = {
  readonly id: string;
  readonly purchaseId: string;
  readonly action:
    | "purchase-created"
    | "plan-assigned"
    | "closed-amount-recorded"
    | "closed-amount-changed"
    | "document-uploaded"
    | "marked-closed-active"
    | "owner-changed";
  /** SETTINGS_USERS id of whoever performed it (§207). */
  readonly actorUserId: string;
  readonly at: string;
  readonly previousValue: string | null;
  readonly newValue: string;
  readonly note?: string;
};

/**
 * Sample audit entries. Deterministic — the wireframes have no persistence, and
 * §208's point is the shape and scope of the record rather than a live trail.
 */
export const PURCHASE_AUDIT: readonly PurchaseAuditEntry[] = [
  {
    id: "pau-1",
    purchaseId: "cp-881-a",
    action: "purchase-created",
    actorUserId: "s4",
    at: "26 Sep 2024, 11:04 AM",
    previousValue: null,
    // A snapshot of the plan's name at the time, not a live lookup (§207).
    newValue: "Family Health Optima · Star Health",
  },
  {
    id: "pau-2",
    purchaseId: "cp-881-a",
    action: "closed-amount-recorded",
    actorUserId: "s4",
    at: "01 Sep 2026, 4:20 PM",
    previousValue: null,
    newValue: "₹18,400.00",
  },
  {
    id: "pau-3",
    purchaseId: "cp-881-a",
    action: "document-uploaded",
    /*
     * The purchase's own Salesperson Record Owner. §207 records the action
     * against whoever performed it and never moves ownership — and because the
     * uploader here IS the owner, the entry asserts no permission that §83 and
     * §205 still leave pending.
     */
    actorUserId: "s4",
    at: "02 Sep 2026, 9:40 AM",
    previousValue: null,
    newValue: "Policy certificate",
  },
  {
    id: "pau-4",
    purchaseId: "cp-881-a",
    action: "marked-closed-active",
    actorUserId: "s4",
    at: "02 Sep 2026, 9:52 AM",
    previousValue: "Not yet closed",
    newValue: "Closed/Active",
    note: "All three required policy documents present.",
  },
  {
    id: "pau-5",
    purchaseId: "cp-881-b",
    action: "purchase-created",
    actorUserId: "s4",
    at: "11 Jan 2025, 10:15 AM",
    previousValue: null,
    newValue: "Private Car Comprehensive · Shield General (sample provider)",
  },
  {
    id: "pau-6",
    purchaseId: "cp-893-a",
    action: "purchase-created",
    actorUserId: "s4",
    at: "18 Mar 2022, 2:30 PM",
    previousValue: null,
    /*
     * The plan has since been withdrawn and renamed. The entry keeps the words
     * it recorded (§207), which is why this is a stored string rather than a
     * lookup through the catalogue.
     */
    newValue: "Star Health Classic · Star Health",
  },
];

export function auditForPurchase(
  purchaseId: string,
  from: readonly PurchaseAuditEntry[] = PURCHASE_AUDIT,
): readonly PurchaseAuditEntry[] {
  return from.filter((e) => e.purchaseId === purchaseId);
}
