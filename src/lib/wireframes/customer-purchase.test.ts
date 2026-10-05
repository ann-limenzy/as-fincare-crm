import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  PLANS,
  PRODUCT_CATEGORIES,
  PROVIDERS,
  UNKNOWN_CATALOGUE_LABEL,
  catalogueProblems,
  categoryById,
  isPlanSelectable,
  mayDeactivateCategory,
  planById,
  planLineage,
  plansByProvider,
  plansFor,
  plansInCategory,
  providerById,
  providersForCategory,
  selectablePlans,
  type Plan,
} from "@/lib/wireframes/catalogue";
import {
  ALL_CUSTOMER_PURCHASES,
  SPECIFIED_PURCHASE_STATUSES,
  CUSTOMER_PURCHASES,
  DOCUMENT_PERMISSIONS_PENDING,
  INTERMEDIATE_STATUS_PENDING,
  CLOSED_ACTIVE,
  PRE_CLOSURE,
  PURCHASE_STATUS_LABEL,
  STATUS_TERMINOLOGY_PENDING,
  REVERSAL_PENDING,
  isSpecifiedStatus,
  DOCUMENT_TYPES,
  PURCHASE_AUDIT,
  REQUIRED_DOCUMENTS_LEVEL_PENDING,
  auditForPurchase,
  completenessLabel,
  documentCompleteness,
  eligibleClosedAmount,
  formatPaise,
  markClosedActive,
  mayMarkClosedActive,
  purchaseById,
  purchaseIntegrityProblem,
  purchasesForCustomer,
  recordedClosedAmount,
  resolvePurchase,
  rupeesToPaise,
  sumPaise,
  totalEligibleClosedAmount,
  totalRecordedClosedAmount,
  uploadDocument,
  type CustomerPurchase,
} from "@/lib/wireframes/customer-purchase";
import {
  LINKED_RECORDS,
  SETTINGS_USERS,
  type RenewalStatus,
} from "@/lib/wireframes/mock-data";
import {
  SALES_TEAMS,
  configFor,
  nextAutomaticRecipients,
  rotationPool,
  teamBySlug,
  userById,
} from "@/lib/wireframes/sales-teams";

/**
 * Batch 4B — the insurance catalogue, Customer Purchases, policy documents and
 * Closed Amount (§65–§68.3, §83, §193–§193.4, §205, §206).
 *
 * The two rules worth most of these tests are the ones that are easiest to get
 * wrong by accident: a purchase must reference a PLAN and nothing coarser
 * (§66), and a Closed Amount becomes eligible only when documents are complete
 * AND the purchase is `Closed/Active` (§68.3) — two facts, neither implying the
 * other.
 */

/** Ramesh Kumar's two canonical purchases. */
const ELIGIBLE = "cp-881-a";
const DOCS_INCOMPLETE = "cp-881-b";
/** Vikram Reddy's — documents complete, not yet closed. */
const DOCS_COMPLETE_NOT_CLOSED = "cp-904-a";
/** Anil Varghese's — held against a withdrawn plan. */
const WITHDRAWN_PLAN = "cp-893-a";

function purchase(id: string): CustomerPurchase {
  return purchaseById(id)!;
}

/* --------------------------------------- 1, 2, 3, 4. the four entities */

describe("Category, Provider, Plan and Purchase are separate (§66, §193)", () => {
  /* 1 */
  it("keeps the three catalogue levels as distinct records", () => {
    expect(PRODUCT_CATEGORIES.length).toBeGreaterThan(0);
    expect(PROVIDERS.length).toBeGreaterThan(0);
    expect(PLANS.length).toBeGreaterThan(0);
    // No id is shared between the levels, so none can stand in for another.
    const ids = [
      ...PRODUCT_CATEGORIES.map((c) => c.id),
      ...PROVIDERS.map((p) => p.id),
      ...PLANS.map((p) => p.id),
      ...CUSTOMER_PURCHASES.map((p) => p.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(catalogueProblems()).toEqual([]);
  });

  /* 1b */
  it("holds §66's worked example at each level", () => {
    const lineage = planLineage("plan-fho");
    expect(lineage.ok).toBe(true);
    if (!lineage.ok) return;
    expect(lineage.lineage.category.name).toBe("Health Insurance");
    expect(lineage.lineage.provider.name).toBe("Star Health");
    expect(lineage.lineage.plan.name).toBe("Family Health Optima");
  });

  /* 2 */
  it("joins on stable ids, never on display names", () => {
    for (const plan of PLANS) {
      expect(plan.id, plan.name).toMatch(/^plan-/);
      expect(plan.categoryId, plan.name).toMatch(/^cat-/);
      expect(plan.providerId, plan.name).toMatch(/^prov-/);
      // The id is never the label.
      expect(plan.id).not.toBe(plan.name);
    }
    for (const p of CUSTOMER_PURCHASES) {
      expect(p.planId, p.id).toMatch(/^plan-/);
      expect(p.customerId, p.id).toMatch(/^c\d+$/);
      expect(p.recordOwnerUserId, p.id).toMatch(/^s\d+$/);
    }
  });

  /* 3 */
  it("has every purchase reference a Plan and nothing coarser", () => {
    for (const p of CUSTOMER_PURCHASES) {
      expect(planById(p.planId), p.id).toBeDefined();
      // §66: never a Category and never a Provider on its own.
      expect(categoryById(p.planId), p.id).toBeUndefined();
      expect(providerById(p.planId), p.id).toBeUndefined();
      // And it carries no free-text copies of either.
      expect(p, p.id).not.toHaveProperty("productCategory");
      expect(p, p.id).not.toHaveProperty("provider");
      expect(p, p.id).not.toHaveProperty("categoryId");
      expect(p, p.id).not.toHaveProperty("providerId");
    }
  });

  /* 4 */
  it("derives Category and Provider through the catalogue relationship", () => {
    const resolved = resolvePurchase(purchase(ELIGIBLE));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const plan = planById(purchase(ELIGIBLE).planId)!;
    expect(resolved.resolved.lineage.provider.id).toBe(plan.providerId);
    expect(resolved.resolved.lineage.category.id).toBe(plan.categoryId);
  });

  /* 4b */
  it("enforces §66's cardinality in both directions", () => {
    // "Each Plan belongs to exactly one Product Category and exactly one
    // Provider" — singular fields, so a second parent is unrepresentable.
    for (const plan of PLANS) {
      expect(typeof plan.categoryId).toBe("string");
      expect(typeof plan.providerId).toBe("string");
    }
    // "A Provider may offer multiple Plans, across more than one Product
    // Category" — so at least one provider spans two categories.
    expect(PROVIDERS.some((p) => p.categoryIds.length > 1)).toBe(true);
    // "A Product Category may contain Plans from multiple Providers."
    const health = plansInCategory("cat-health");
    expect(new Set(health.map((p) => p.providerId)).size).toBeGreaterThan(1);
  });

  /* 4c */
  it("narrows providers by category and plans by provider (§67)", () => {
    const providers = providersForCategory("cat-health");
    expect(providers.map((p) => p.id)).toContain("prov-star");
    for (const p of providers) expect(p.categoryIds).toContain("cat-health");

    const plans = plansFor("cat-health", "prov-star");
    expect(plans.map((p) => p.id)).toContain("plan-fho");
    for (const p of plans) {
      expect(p.categoryId).toBe("cat-health");
      expect(p.providerId).toBe("prov-star");
      expect(p.active).toBe(true);
    }
    expect(plansByProvider("prov-shield").length).toBeGreaterThan(1);
  });
});

/* ------------------------------------------- 5, 6. multiple purchases */

describe("one Customer, many independent purchases (§65, §67)", () => {
  /* 5 */
  it("gives one Customer several purchases", () => {
    const mine = purchasesForCustomer("c881");
    expect(mine.length).toBe(2);
    for (const p of mine) expect(p.customerId).toBe("c881");
    // At least one Customer holds more than one (§65).
    expect(mine.length).toBeGreaterThan(1);
  });

  /* 5b */
  it("spans more than one Product Category", () => {
    const categories = new Set(
      purchasesForCustomer("c881").map((p) => planById(p.planId)!.categoryId),
    );
    // A health plan and a motor plan at the same time, as §6 of the brief asks.
    expect(categories.has("cat-health")).toBe(true);
    expect(categories.has("cat-motor")).toBe(true);
    expect(categories.size).toBeGreaterThanOrEqual(2);
  });

  /* 6 */
  it("keeps every purchase's own data separate", () => {
    const mine = purchasesForCustomer("c881");
    const fields = [
      mine.map((p) => p.planId),
      mine.map((p) => p.policyReference),
      mine.map((p) => p.id),
    ];
    for (const values of fields) {
      // No two purchases share a plan, a policy number or an id.
      expect(new Set(values).size, String(values)).toBe(values.length);
    }
    // Documents belong to one purchase only — never pooled at Customer level.
    const documentIds = mine.flatMap((p) => p.documents.map((d) => d.id));
    expect(new Set(documentIds).size).toBe(documentIds.length);
    // Statuses, amounts and renewal dates differ per purchase.
    expect(new Set(mine.map((p) => p.status)).size).toBeGreaterThan(1);
    expect(new Set(mine.map((p) => p.recordedClosedAmount)).size).toBe(
      mine.length,
    );
  });

  /* 6b */
  it("never aggregates them into one generic record", () => {
    for (const p of CUSTOMER_PURCHASES) {
      expect(p, p.id).not.toHaveProperty("product");
      expect(p, p.id).not.toHaveProperty("productService");
    }
  });
});

/* ------------------------------------------- 7, 8. Closed Amount basics */

describe("Closed Amount belongs to the purchase (§68.3)", () => {
  /* 7 */
  it("is stored on the Customer Purchase and nowhere else", () => {
    for (const p of CUSTOMER_PURCHASES) {
      expect(p).toHaveProperty("recordedClosedAmount");
    }
    // Not on the catalogue, which §66 keeps free of customer data.
    for (const record of [...PRODUCT_CATEGORIES, ...PROVIDERS, ...PLANS]) {
      expect(record, record.id).not.toHaveProperty("recordedClosedAmount");
      expect(record, record.id).not.toHaveProperty("closedAmount");
    }
    // Nor on a user profile.
    for (const user of SETTINGS_USERS) {
      expect(user, user.name).not.toHaveProperty("closedAmount");
    }
    // A Customer's total is derived, not entered (§68.3).
    expect(totalRecordedClosedAmount(purchasesForCustomer("c881"))).toBe(
      sumPaise(
        purchasesForCustomer("c881").map((p) => p.recordedClosedAmount ?? 0),
      ),
    );
  });

  /* 8 */
  it("uses integer paise so currency cannot drift", () => {
    for (const p of CUSTOMER_PURCHASES) {
      if (p.recordedClosedAmount === null) continue;
      expect(Number.isInteger(p.recordedClosedAmount), p.id).toBe(true);
    }
    // The classic float failure, which integers avoid.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumPaise([10, 20])).toBe(30);
    expect(rupeesToPaise(18_400)).toBe(1_840_000);
    expect(rupeesToPaise(1, 5)).toBe(105);
    // A hundred small amounts add up exactly.
    expect(sumPaise(Array.from({ length: 100 }, () => 1))).toBe(100);
  });

  /* 8b */
  it("formats rupees with Indian grouping, from integers", () => {
    expect(formatPaise(1_840_000)).toBe("₹18,400.00");
    expect(formatPaise(725_000)).toBe("₹7,250.00");
    expect(formatPaise(105)).toBe("₹1.05");
    expect(formatPaise(0)).toBe("₹0.00");
    expect(formatPaise(123_456_789)).toBe("₹12,34,567.89");
  });
});

/* --------------------------- 9, 10, 11. documents, scope and non-scope */

describe("required policy documents (§68.2, §193.4, §205)", () => {
  /* 9 */
  it("scopes the checklist to the purchase, not the Customer", () => {
    const a = documentCompleteness(purchase(ELIGIBLE));
    const b = documentCompleteness(purchase(DOCS_INCOMPLETE));
    expect(a.required).toBe(3);
    expect(b.required).toBe(2);
    // Different purchases, different checklists — one cannot satisfy the other.
    expect(a.required).not.toBe(b.required);
    expect(a.complete).toBe(true);
    expect(b.complete).toBe(false);
    expect(completenessLabel(purchase(DOCS_INCOMPLETE))).toBe("1 of 2");
    // Every document names the purchase it belongs to by living on it.
    for (const p of CUSTOMER_PURCHASES) {
      for (const d of p.documents) {
        expect(
          d.documentTypeId === null ||
            DOCUMENT_TYPES.some((t) => t.id === d.documentTypeId),
          `${p.id}/${d.id}`,
        ).toBe(true);
      }
    }
  });

  /* 9b */
  it("ignores extra documents in the completeness count (§68.2)", () => {
    const completeness = documentCompleteness(purchase(ELIGIBLE));
    expect(completeness.additional.length).toBeGreaterThan(0);
    // 3 of 3 even though four files are attached.
    expect(completeness.uploaded).toBe(3);
    expect(completeness.required).toBe(3);
    expect(purchase(ELIGIBLE).documents.length).toBe(4);
  });

  /* 9c */
  it("does not assume where the checklist is administered (§193.4)", () => {
    // §193.4: "implementation must not assume a particular administration
    // level." Each purchase resolves its own definite list, and the open
    // question is recorded rather than answered.
    expect(REQUIRED_DOCUMENTS_LEVEL_PENDING).toMatch(/pending confirmation/);
    for (const p of CUSTOMER_PURCHASES) {
      expect(Array.isArray(p.requiredDocumentTypeIds), p.id).toBe(true);
      expect(p.requiredDocumentTypeIds.length, p.id).toBeGreaterThan(0);
    }
    // The catalogue carries no required-document list, so no level is implied.
    for (const plan of PLANS) {
      expect(plan, plan.name).not.toHaveProperty("requiredDocumentTypeIds");
    }
  });

  /* 10 */
  it("introduces no personal or KYC document concept (§205)", () => {
    // No document TYPE is a personal one…
    for (const type of DOCUMENT_TYPES) {
      expect(type.name, type.name).not.toMatch(
        /identity|kyc|aadhaar|aadhar|\bpan\b|passport|\bid proof\b/i,
      );
    }
    // …and no identifier or data shape names one either. Prose that says KYC is
    // OUT of scope is required by §205, so only code is scanned.
    for (const file of productionSources()) {
      const code = codeOnly(readFileSync(file, "utf8"));
      expect(code, file).not.toMatch(
        /kycDocument|identityDocument|idProof|aadhaarNumber|panNumber|kycStatus|kycVerified/i,
      );
    }
    // The purchase screen states the exclusion in as many words.
    const screen = readFileSync(
      "src/components/wireframes/customers/purchase-detail.tsx",
      "utf8",
    );
    expect(screen).toContain("Policy documents only");
    // The source wraps the sentence, so whitespace is normalised first.
    expect(screen.replace(/\s+/g, " ")).toContain(
      "identity and KYC documents are not part of this",
    );
  });

  /* 11 */
  it("introduces no approval state or approval action (§68.1, §205)", () => {
    for (const p of CUSTOMER_PURCHASES) {
      for (const d of p.documents) {
        expect(d, d.id).not.toHaveProperty("approved");
        expect(d, d.id).not.toHaveProperty("approvalStatus");
        expect(d, d.id).not.toHaveProperty("reviewedBy");
        expect(d, d.id).not.toHaveProperty("reviewer");
      }
    }
    const purchaseSources = productionSources().filter((f) =>
      /purchase|catalogue/.test(f),
    );
    expect(purchaseSources.length).toBeGreaterThan(0);
    for (const file of purchaseSources) {
      const code = codeOnly(readFileSync(file, "utf8"));
      expect(code, file).not.toMatch(
        /approvalStatus|approvedBy|reviewQueue|signOff|\breject(ed)?Document\b/i,
      );
    }
  });
});

/* ------------------- 12, 13, 14, 15, 16. the Closed/Active gate */

describe("the `Closed/Active` gate (§68.1, §68.3)", () => {
  /* 12 */
  it("blocks closing while a required document is missing, and says which", () => {
    const check = mayMarkClosedActive(purchase(DOCS_INCOMPLETE));
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.missing.map((d) => d.name)).toEqual(["Policy certificate"]);
    expect(check.reason).toContain("Policy certificate");
    expect(check.reason).toContain("Closed/Active");
    // And the transition itself refuses, not only the button.
    expect(markClosedActive(purchase(DOCS_INCOMPLETE), "today").ok).toBe(false);
  });

  /* 13 */
  it("does not close the purchase when the last document is uploaded", () => {
    const before = purchase(DOCS_INCOMPLETE);
    expect(before.status).toBe(PRE_CLOSURE);
    const after = uploadDocument(
      before,
      {
        id: "ud-test",
        documentTypeId: "doc-certificate",
        fileName: "certificate.pdf",
        fileType: "PDF",
        uploadedByUserId: before.recordOwnerUserId,
        uploadedAt: "today",
      },
      "today",
    );
    // §68.1: uploading satisfies the prerequisite and nothing more.
    expect(documentCompleteness(after).complete).toBe(true);
    expect(after.status).toBe(PRE_CLOSURE);
    expect(mayMarkClosedActive(after).ok).toBe(true);
    // Still not eligible until somebody closes it.
    expect(eligibleClosedAmount(after).eligible).toBe(false);
  });

  /* 14 */
  it("makes the amount eligible on documents complete plus Closed/Active", () => {
    const result = eligibleClosedAmount(purchase(ELIGIBLE));
    expect(result.eligible).toBe(true);
    if (!result.eligible) return;
    expect(result.amount).toBe(purchase(ELIGIBLE).recordedClosedAmount);
    expect(formatPaise(result.amount)).toBe("₹18,400.00");
  });

  /* 15 */
  it("keeps the amount ineligible when documents are complete but not closed", () => {
    const p = purchase(DOCS_COMPLETE_NOT_CLOSED);
    expect(documentCompleteness(p).complete).toBe(true);
    expect(p.status).not.toBe("closed-active");
    expect(p.recordedClosedAmount).not.toBeNull();
    const result = eligibleClosedAmount(p);
    expect(result.eligible).toBe(false);
    if (result.eligible) return;
    expect(result.reason).toContain("not Closed/Active");
  });

  /* 15b */
  it("keeps it ineligible when documents are incomplete", () => {
    const result = eligibleClosedAmount(purchase(DOCS_INCOMPLETE));
    expect(result.eligible).toBe(false);
    if (result.eligible) return;
    expect(result.reason).toContain("documents are incomplete");
  });

  /* 15c */
  it("counts nothing merely because a purchase or Customer exists (§68.3)", () => {
    const eligible = totalEligibleClosedAmount(purchasesForCustomer("c881"));
    const recorded = totalRecordedClosedAmount(purchasesForCustomer("c881"));
    // Recorded is larger, because only some purchases qualify.
    expect(recorded).toBeGreaterThan(eligible);
    // The eligible total is exactly the qualifying purchases' amounts.
    const qualifying = purchasesForCustomer("c881").filter(
      (p) => eligibleClosedAmount(p).eligible,
    );
    expect(eligible).toBe(
      sumPaise(qualifying.map((p) => p.recordedClosedAmount ?? 0)),
    );
  });

  /* 16 */
  it("treats Closed/Active with a missing document as invalid", () => {
    const invalid: CustomerPurchase = {
      ...purchase(DOCS_INCOMPLETE),
      status: "closed-active",
    };
    expect(purchaseIntegrityProblem(invalid)).toMatch(/§68.1 does not permit/);
    // And such a record never yields an eligible amount.
    const result = eligibleClosedAmount(invalid);
    expect(result.eligible).toBe(false);
    if (result.eligible) return;
    expect(result.reason).toMatch(/Closed\/Active while required/);
  });

  /* 16b */
  it("finds no such inconsistency in the shipped data", () => {
    for (const p of CUSTOMER_PURCHASES) {
      expect(purchaseIntegrityProblem(p), p.id).toBeNull();
    }
  });

  /* 17 */
  it("reports recorded and eligible as two separate figures", () => {
    const p = purchase(DOCS_COMPLETE_NOT_CLOSED);
    expect(recordedClosedAmount(p)).toBe(rupeesToPaise(24_000));
    expect(eligibleClosedAmount(p).eligible).toBe(false);
    // Recorded exists while eligible does not — they cannot be the same label.
    expect(recordedClosedAmount(p)).not.toBeNull();
  });
});

/* --------------------------- 18, 19, 20. inactive catalogue records */

describe("inactive catalogue records (§193.2, §193.3)", () => {
  /* 18 */
  it("stays readable on the purchase that already holds it", () => {
    const p = purchase(WITHDRAWN_PLAN);
    const plan = planById(p.planId)!;
    expect(plan.active).toBe(false);
    // §193.3: "existing purchases keep their Plan reference, their history and
    // their renewal cycles."
    const resolved = resolvePurchase(p);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.resolved.lineage.plan.name).toContain("withdrawn");
    expect(resolved.resolved.lineage.provider.name).toBe("Star Health");
    expect(resolved.resolved.lineage.category.name).toBe("Health Insurance");
    // Its amount, documents and history are untouched.
    expect(p.recordedClosedAmount).toBe(rupeesToPaise(11_900));
    expect(p.documents.length).toBeGreaterThan(0);
    expect(auditForPurchase(p.id).length).toBeGreaterThan(0);
  });

  /* 19 */
  it("is unavailable for a new purchase", () => {
    expect(isPlanSelectable("plan-health-classic")).toBe(false);
    expect(selectablePlans().map((p) => p.id)).not.toContain(
      "plan-health-classic",
    );
    for (const plan of selectablePlans()) expect(plan.active).toBe(true);
  });

  /* 19b */
  it("is unavailable when its Provider or Category is deactivated", () => {
    const providers = PROVIDERS.map((p) =>
      p.id === "prov-star" ? { ...p, active: false } : p,
    );
    expect(isPlanSelectable("plan-fho", { providers })).toBe(false);
    // But still readable — lineage resolves regardless of active state.
    expect(planLineage("plan-fho", { providers }).ok).toBe(true);

    const categories = PRODUCT_CATEGORIES.map((c) =>
      c.id === "cat-health" ? { ...c, active: false } : c,
    );
    expect(isPlanSelectable("plan-fho", { categories })).toBe(false);
  });

  /* 19c */
  it("refuses to deactivate a Category that still has active plans (§193.1)", () => {
    const blocked = mayDeactivateCategory("cat-health");
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.reason).toMatch(/active plan/);

    // Once its plans and providers are inactive, it may be deactivated.
    const plans = PLANS.map((p) =>
      p.categoryId === "cat-health" ? { ...p, active: false } : p,
    );
    const providers = PROVIDERS.map((p) =>
      p.categoryIds.includes("cat-health") ? { ...p, active: false } : p,
    );
    expect(mayDeactivateCategory("cat-health", { plans, providers }).ok).toBe(
      true,
    );
  });

  /* 20 */
  it("never falls back to another catalogue record for an unknown id", () => {
    for (const unknown of ["plan-nope", "cat-health", "prov-star", ""]) {
      const result = planLineage(unknown);
      expect(result.ok, unknown).toBe(false);
      if (result.ok) continue;
      expect(result.reason, unknown).toMatch(/not in the catalogue/);
      // No plan is handed back to pick up by mistake.
      expect("lineage" in result, unknown).toBe(false);
    }
    expect(isPlanSelectable("plan-nope")).toBe(false);
    const broken: CustomerPurchase = {
      ...purchase(ELIGIBLE),
      planId: "plan-nope",
    };
    const resolved = resolvePurchase(broken);
    expect(resolved.ok).toBe(false);
    expect(UNKNOWN_CATALOGUE_LABEL).toBe("Not available");
  });

  /* 20b */
  it("reports a structurally impossible catalogue rather than rendering it", () => {
    // A plan whose provider does not operate in the plan's category would make
    // the hierarchy shown on screen a fiction (§66).
    const plans: readonly Plan[] = [
      ...PLANS,
      {
        id: "plan-bad",
        name: "Impossible Plan",
        categoryId: "cat-life",
        providerId: "prov-star",
        active: true,
      },
    ];
    const problems = catalogueProblems({ plans });
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain("does not operate in that category");
  });
});

/* ---------------------------------------------- 21. audit snapshots */

describe("audit history (§208, §207)", () => {
  /* 21 */
  it("keeps the words it recorded when the catalogue is renamed", () => {
    const entry = PURCHASE_AUDIT.find((e) => e.purchaseId === WITHDRAWN_PLAN)!;
    // The plan has since been withdrawn and renamed; the entry still reads as
    // it did at the time (§207).
    expect(entry.newValue).toBe("Star Health Classic · Star Health");
    expect(planById(purchase(WITHDRAWN_PLAN).planId)!.name).toBe(
      "Star Health Classic (withdrawn)",
    );
    expect(entry.newValue).not.toBe(
      planById(purchase(WITHDRAWN_PLAN).planId)!.name,
    );
  });

  /* 21b */
  it("retains the actor, time and before/after values (§208)", () => {
    expect(PURCHASE_AUDIT.length).toBeGreaterThan(0);
    for (const entry of PURCHASE_AUDIT) {
      expect(entry.actorUserId, entry.id).toMatch(/^s\d+$/);
      expect(entry.at, entry.id).toBeTruthy();
      expect(entry.newValue, entry.id).toBeTruthy();
      expect(purchaseById(entry.purchaseId), entry.id).toBeDefined();
    }
    // The closure entry records the transition it performed.
    const closed = PURCHASE_AUDIT.find(
      (e) => e.action === "marked-closed-active",
    )!;
    expect(closed.previousValue).toBe("Not yet closed");
    expect(closed.newValue).toBe("Closed/Active");
  });

  /* 21c */
  it("records the action against the person who performed it (§207)", () => {
    const uploaded = PURCHASE_AUDIT.find(
      (e) => e.action === "document-uploaded",
    )!;
    const target = purchaseById(uploaded.purchaseId)!;
    // The purchase's own Salesperson Record Owner, so the entry asserts no
    // permission §83 and §205 still leave pending.
    expect(uploaded.actorUserId).toBe(target.recordOwnerUserId);
    expect(userById(uploaded.actorUserId).role).toBe("Salesperson");
  });
});

/* --------------------- 22, 23, 24, 25, 26. roles and ownership */

describe("roles, ownership and hierarchy (§2.5, §68, §207)", () => {
  /* 22 */
  it("never gives a purchase a supervisory owner", () => {
    for (const p of CUSTOMER_PURCHASES) {
      const owner = userById(p.recordOwnerUserId);
      expect(["Team Lead", "Salesperson"], p.id).toContain(owner.role);
      expect(owner.role, p.id).not.toBe("Admin");
      expect(owner.role, p.id).not.toBe("Manager");
    }
  });

  /* 23 */
  it("does not change ownership when a document is uploaded", () => {
    const before = purchase(DOCS_INCOMPLETE);
    const after = uploadDocument(
      before,
      {
        id: "ud-x",
        documentTypeId: "doc-certificate",
        fileName: "c.pdf",
        fileType: "PDF",
        // Uploaded by a Team Lead who is NOT the owner.
        uploadedByUserId: "s3",
        uploadedAt: "today",
      },
      "today",
    );
    expect(after.recordOwnerUserId).toBe(before.recordOwnerUserId);
    expect(after.recordOwnerUserId).not.toBe("s3");
    expect(after.customerId).toBe(before.customerId);
    expect(after.planId).toBe(before.planId);
    expect(after.recordedClosedAmount).toBe(before.recordedClosedAmount);
  });

  /* 24 */
  it("does not change ownership when the status changes", () => {
    const before = purchase(DOCS_COMPLETE_NOT_CLOSED);
    const outcome = markClosedActive(before, "today");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.purchase.recordOwnerUserId).toBe(before.recordOwnerUserId);
    expect(outcome.purchase.planId).toBe(before.planId);
    expect(outcome.purchase.documents).toEqual(before.documents);
    expect(outcome.purchase.recordedClosedAmount).toBe(
      before.recordedClosedAmount,
    );
  });

  /* 25 + 26 */
  it("leaves hierarchy visibility and peer isolation untouched", () => {
    // Nothing in this batch takes an actor, so no module here can widen or
    // narrow a scope. §193: catalogue visibility is deliberately unrestricted.
    for (const file of [
      "src/lib/wireframes/catalogue.ts",
      "src/lib/wireframes/customer-purchase.ts",
    ]) {
      const code = codeOnly(readFileSync(file, "utf8"));
      expect(code, file).not.toMatch(
        /mayViewConversation|operationalUserIdsInScope|visibleConversationsFor/,
      );
    }
    // Batch 3A's hierarchy data is unchanged.
    expect(SALES_TEAMS.length).toBe(3);
    expect(SETTINGS_USERS.filter((u) => u.role === "Manager").length).toBe(1);
  });
});

/* ------------------------- 27, 28, 29. nothing else crept in */

describe("scope boundaries", () => {
  /* 27 */
  it("introduces no incentive formula, percentage or slab (§206)", () => {
    for (const file of [
      "src/lib/wireframes/catalogue.ts",
      "src/lib/wireframes/customer-purchase.ts",
      "src/components/wireframes/purchase-parts.tsx",
      "src/components/wireframes/customers/purchase-detail.tsx",
    ]) {
      const code = codeOnly(readFileSync(file, "utf8"));
      // Word-bounded: "completenessLabel" is not a slab.
      expect(code, file).not.toMatch(
        /\bslabs?\b|\bcommission\b|\bpayouts?\b|\bpayroll\b|incentiveRate|incentiveAmount/i,
      );
      // No rate arithmetic on an amount.
      expect(code, file).not.toMatch(/\*\s*0\.\d+|percentage/i);
    }
  });

  /* 28 */
  it("introduces no renewal automation", () => {
    for (const file of [
      "src/lib/wireframes/catalogue.ts",
      "src/lib/wireframes/customer-purchase.ts",
    ]) {
      const code = codeOnly(readFileSync(file, "utf8"));
      expect(code, file).not.toMatch(
        /setTimeout|setInterval|schedule.*reminder|cron/i,
      );
    }
  });

  /* 29 */
  it("leaves round robin and WhatsApp behaviour unchanged", () => {
    const motor = teamBySlug("motor-insurance");
    expect(rotationPool(motor).length).toBeGreaterThan(0);
    expect(nextAutomaticRecipients(motor, 2).length).toBeGreaterThan(0);
    expect(configFor(motor.id).batchSize).toBeGreaterThan(0);
    // No purchase helper reaches assignment at all.
    const code = codeOnly(
      readFileSync("src/lib/wireframes/customer-purchase.ts", "utf8"),
    );
    expect(code).not.toMatch(
      /rotationPool|nextAutomaticRecipients|roundRobin/i,
    );
  });

  /* 29b */
  it("keeps the WhatsApp template data consistent with the catalogue", () => {
    /*
     * §98's template variables read a purchase's Category, Provider and Plan.
     * WhatsApp is out of scope for this batch, so its linked-purchase data is
     * untouched — but every value in it must name a real catalogue record, or
     * the two would be describing different businesses.
     */
    const categories = new Set(PRODUCT_CATEGORIES.map((c) => c.name));
    const providers = new Set(PROVIDERS.map((p) => p.name));
    const plans = new Set(PLANS.map((p) => p.name));
    let checked = 0;
    for (const record of LINKED_RECORDS) {
      for (const p of record.purchases) {
        expect(categories, `${record.id}: ${p.productCategory}`).toContain(
          p.productCategory,
        );
        expect(providers, `${record.id}: ${p.provider}`).toContain(p.provider);
        expect(plans, `${record.id}: ${p.planSubProduct}`).toContain(
          p.planSubProduct,
        );
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

/* ------------------ the uploader demonstration (§83, §205, §207) */

describe("the document uploader demonstration encodes no pending permission", () => {
  /* uploader 1 */
  it("shows the purchase's own Salesperson Record Owner uploading", () => {
    let checked = 0;
    for (const p of ALL_CUSTOMER_PURCHASES) {
      for (const document of p.documents) {
        // Every uploader is this purchase's owner…
        expect(document.uploadedByUserId, `${p.id}/${document.id}`).toBe(
          p.recordOwnerUserId,
        );
        // …and that owner is a Salesperson.
        expect(
          userById(document.uploadedByUserId).role,
          `${p.id}/${document.id}`,
        ).toBe("Salesperson");
        // Identified by stable id, never a display name.
        expect(document.uploadedByUserId, document.id).toMatch(/^s\d+$/);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  /* uploader 2 */
  it("preserves ownership through an upload", () => {
    const before = purchase(DOCS_INCOMPLETE);
    const after = uploadDocument(
      before,
      {
        id: "ud-owner-check",
        documentTypeId: "doc-certificate",
        fileName: "certificate.pdf",
        fileType: "PDF",
        uploadedByUserId: before.recordOwnerUserId,
        uploadedAt: "today",
      },
      "today",
    );
    expect(after.recordOwnerUserId).toBe(before.recordOwnerUserId);
    expect(after.status).toBe(before.status);
    expect(after.recordedClosedAmount).toBe(before.recordedClosedAmount);
  });

  /* uploader 3 */
  it("implies no supervisory document permission anywhere", () => {
    const supervisors = SETTINGS_USERS.filter(
      (u) => u.role === "Admin" || u.role === "Manager",
    ).map((u) => u.id);
    expect(supervisors.length).toBeGreaterThan(0);

    for (const p of ALL_CUSTOMER_PURCHASES) {
      for (const d of p.documents) {
        expect(supervisors, `${p.id}/${d.id}`).not.toContain(
          d.uploadedByUserId,
        );
      }
    }
    // No audit entry shows a supervisor touching a document either.
    for (const entry of PURCHASE_AUDIT) {
      if (!entry.action.startsWith("document")) continue;
      expect(supervisors, entry.id).not.toContain(entry.actorUserId);
      const target = purchaseById(entry.purchaseId)!;
      expect(entry.actorUserId, entry.id).toBe(target.recordOwnerUserId);
    }
  });

  /* uploader 4 */
  it("encodes no role rule for documents, and records the open question", () => {
    expect(DOCUMENT_PERMISSIONS_PENDING).toMatch(/pending confirmation/);
    // The module decides nothing about who may upload: no role appears in it.
    const code = codeOnly(
      readFileSync("src/lib/wireframes/customer-purchase.ts", "utf8"),
    );
    expect(code).not.toMatch(/"Admin"|"Manager"|"Team Lead"|"Salesperson"/);
    expect(code).not.toMatch(/mayUpload|canUpload|uploadPermission/i);
    // `uploadDocument` takes the document it is given and checks no role.
    expect(uploadDocument.length).toBe(3);
  });
});

/* ------------- Ramesh across the Customer and WhatsApp flows */

describe("one Customer reads the same on every screen", () => {
  /** The WhatsApp-facing view is derived, so these are the same records. */
  const RAMESH = LINKED_RECORDS.find((r) => r.id === "c881")!;

  /* reconcile 1 */
  it("backs every WhatsApp purchase with a canonical Customer Purchase", () => {
    let checked = 0;
    for (const record of LINKED_RECORDS) {
      for (const view of record.purchases) {
        const canonical = purchaseById(view.customerPurchaseId);
        expect(canonical, `${record.id}/${view.id}`).toBeDefined();
        // And it belongs to the same Customer.
        expect(canonical!.customerId, view.id).toBe(record.id);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  /* reconcile 2 */
  it("represents each of Ramesh's canonical purchases in messaging", () => {
    const canonical = purchasesForCustomer("c881");
    expect(canonical.length).toBe(2);
    const represented = RAMESH.purchases.map((v) => v.customerPurchaseId);
    expect([...represented].sort()).toEqual(canonical.map((p) => p.id).sort());
  });

  /* reconcile 3 */
  it("agrees on Plan, Provider, Category, reference and Renewal Date", () => {
    for (const record of LINKED_RECORDS) {
      for (const view of record.purchases) {
        const canonical = purchaseById(view.customerPurchaseId)!;
        const lineage = planLineage(canonical.planId);
        expect(lineage.ok, view.id).toBe(true);
        if (!lineage.ok) continue;
        // Field by field, not "this plan name exists somewhere".
        expect(view.planSubProduct, view.id).toBe(lineage.lineage.plan.name);
        expect(view.provider, view.id).toBe(lineage.lineage.provider.name);
        expect(view.productCategory, view.id).toBe(
          lineage.lineage.category.name,
        );
        expect(view.policyReference, view.id).toBe(
          canonical.policyReference ?? "",
        );
        expect(view.renewalDate, view.id).toBe(canonical.renewalDate ?? "");
      }
    }
  });

  /* reconcile 4 */
  it("reports the same number of purchases for the same Customer", () => {
    for (const record of LINKED_RECORDS) {
      if (record.kind !== "Customer") continue;
      const canonical = purchasesForCustomer(record.id);
      // No filtering reason exists on these screens, so the counts must match.
      expect(record.purchases.length, record.id).toBe(canonical.length);
    }
  });

  /* reconcile 5 */
  it("still holds all three document and closure demonstration states", () => {
    // A — eligible.
    const a = eligibleClosedAmount(purchase(ELIGIBLE));
    expect(a.eligible).toBe(true);
    expect(documentCompleteness(purchase(ELIGIBLE)).complete).toBe(true);
    expect(purchase(ELIGIBLE).status).toBe("closed-active");

    // B — documents incomplete, closing blocked.
    expect(documentCompleteness(purchase(DOCS_INCOMPLETE)).complete).toBe(
      false,
    );
    expect(mayMarkClosedActive(purchase(DOCS_INCOMPLETE)).ok).toBe(false);
    expect(eligibleClosedAmount(purchase(DOCS_INCOMPLETE)).eligible).toBe(
      false,
    );
    expect(purchase(DOCS_INCOMPLETE).recordedClosedAmount).not.toBeNull();

    // C — documents complete, not closed.
    const c = purchase(DOCS_COMPLETE_NOT_CLOSED);
    expect(documentCompleteness(c).complete).toBe(true);
    expect(c.status).not.toBe("closed-active");
    expect(mayMarkClosedActive(c).ok).toBe(true);
    expect(eligibleClosedAmount(c).eligible).toBe(false);

    // And the inactive-catalogue history survives on its own purchase.
    expect(planById(purchase(WITHDRAWN_PLAN).planId)!.active).toBe(false);
  });
});

/* ---------------------- the status model (§68.1, §72) */

describe("purchase statuses versus renewal statuses (§68.1, §72)", () => {
  /* status 1 */
  it("keeps the two sets disjoint", () => {
    const purchaseValues: readonly string[] = [
      ...SPECIFIED_PURCHASE_STATUSES,
      PRE_CLOSURE,
    ];
    // §72's renewal states, which describe a renewal cycle and not a sale.
    const renewalValues: readonly RenewalStatus[] = [
      "Upcoming",
      "Due Today",
      "Overdue",
      "Renewed / Completed",
    ];
    for (const renewal of renewalValues) {
      expect(purchaseValues, renewal).not.toContain(renewal);
    }
    for (const status of purchaseValues) {
      expect(renewalValues as readonly string[], status).not.toContain(status);
    }
    // No purchase carries a renewal-flavoured status.
    for (const p of ALL_CUSTOMER_PURCHASES) {
      expect(renewalValues as readonly string[], p.id).not.toContain(p.status);
    }
  });

  /* status 2 */
  it("does not present any status name as client-approved", () => {
    // §68.1: "the names used above should not be treated as final." So the type
    // is named for what it is — specification-listed, not confirmed.
    expect(SPECIFIED_PURCHASE_STATUSES).toEqual([
      "closed-active",
      "completed",
      "expired",
      "cancelled",
    ]);
    expect(SPECIFIED_PURCHASE_STATUSES as readonly string[]).not.toContain(
      PRE_CLOSURE,
    );
    expect(isSpecifiedStatus(PRE_CLOSURE)).toBe(false);
    expect(isSpecifiedStatus("closed-active")).toBe(true);
    // Phrased as a condition, not as a name.
    expect(PURCHASE_STATUS_LABEL[PRE_CLOSURE]).toBe("Not yet closed");
    expect(PURCHASE_STATUS_LABEL[PRE_CLOSURE]).not.toBe("Draft");
    expect(INTERMEDIATE_STATUS_PENDING).toMatch(/pending confirmation/);
  });

  /* status naming */
  it("names the status type for its actual certainty", () => {
    const code = readFileSync(
      "src/lib/wireframes/customer-purchase.ts",
      "utf8",
    );
    // §68.1 says the names "should not be treated as final", so no exported
    // status type, constant or guard may claim they are confirmed.
    expect(code).not.toMatch(/ConfirmedPurchaseStatus/);
    expect(code).not.toMatch(/CONFIRMED_PURCHASE_STATUSES/);
    expect(code).not.toMatch(/isConfirmedStatus/);
    expect(code).toContain("SpecifiedPurchaseStatus");
    expect(code).toContain("SPECIFIED_PURCHASE_STATUSES");
    // The open terminology question is recorded.
    expect(STATUS_TERMINOLOGY_PENDING).toMatch(/pending confirmation/);
    expect(STATUS_TERMINOLOGY_PENDING).toMatch(
      /should not be treated as final/,
    );
  });

  /* status naming */
  it("describes no status label as client-confirmed anywhere", () => {
    const sources = [
      "src/lib/wireframes/customer-purchase.ts",
      "src/components/wireframes/purchase-parts.tsx",
      "src/components/wireframes/customers/purchase-detail.tsx",
    ];
    for (const file of sources) {
      const code = readFileSync(file, "utf8");
      // No sentence calls a status name confirmed or approved.
      for (const label of Object.values(PURCHASE_STATUS_LABEL)) {
        expect(
          new RegExp(`(confirmed|approved)[^.]{0,40}${label}`, "i").test(code),
          `${file}: ${label}`,
        ).toBe(false);
      }
    }
    // Closed/Active's ELIGIBILITY role is the part §68.1 does settle.
    expect(CLOSED_ACTIVE).toBe("closed-active");
    expect(STATUS_TERMINOLOGY_PENDING).toMatch(/Closed\/Active is the status/);
  });

  /* status 2b */
  it("invents no cancellation, lapse, refund or reversal behaviour", () => {
    // The open question is recorded, not answered.
    expect(REVERSAL_PENDING).toMatch(/pending confirmation/);
    expect(REVERSAL_PENDING).toMatch(/No reversal behaviour is implemented/);

    // And nothing implements one: no transition function, and no record is
    // created in a reversal state. "Cancelled" exists as a §68.1 status, but
    // nothing in this batch produces it.
    const code = codeOnly(
      readFileSync("src/lib/wireframes/customer-purchase.ts", "utf8"),
    ).replace(REVERSAL_PENDING, "");
    expect(code).not.toMatch(
      /markCancelled|markRefunded|markLapsed|reverseClosedAmount|function \w*(refund|reversal|lapse)/i,
    );
    expect(SPECIFIED_PURCHASE_STATUSES).toContain("cancelled");
    expect(code).not.toMatch(/status: "cancelled"/);
    for (const p of ALL_CUSTOMER_PURCHASES) {
      expect(p.status, p.id).not.toBe("cancelled");
    }
  });

  /* status 3 */
  it("cannot make the incomplete-document example Closed/Active", () => {
    expect(markClosedActive(purchase(DOCS_INCOMPLETE), "today").ok).toBe(false);
    expect(purchase(DOCS_INCOMPLETE).status).toBe(PRE_CLOSURE);
  });

  /* status 4 */
  it("leaves the complete-but-not-closed example in the condition only", () => {
    const c = purchase(DOCS_COMPLETE_NOT_CLOSED);
    expect(c.status).toBe(PRE_CLOSURE);
    expect(isSpecifiedStatus(c.status)).toBe(false);
    // Document completion alone did not change it.
    expect(documentCompleteness(c).complete).toBe(true);
    expect(c.status).not.toBe("closed-active");
  });

  /* status 5 */
  it("makes only Closed/Active plus complete documents eligible", () => {
    for (const status of SPECIFIED_PURCHASE_STATUSES) {
      const candidate: CustomerPurchase = { ...purchase(ELIGIBLE), status };
      const result = eligibleClosedAmount(candidate);
      expect(result.eligible, status).toBe(status === "closed-active");
    }
    // And with documents incomplete, even Closed/Active does not qualify.
    const invalid: CustomerPurchase = {
      ...purchase(DOCS_INCOMPLETE),
      status: "closed-active",
    };
    expect(eligibleClosedAmount(invalid).eligible).toBe(false);
  });
});

/* -------------------------------------------------------------- helpers */

function productionSources(): readonly string[] {
  return [
    ...walk("src/components/wireframes"),
    ...walk("src/lib/wireframes"),
    ...walk("src/app/wireframes"),
  ];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) out.push(path);
  }
  return out;
}

/** Source without comment lines, so documentation of a rule is not scanned. */
function codeOnly(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
}
