"use client";

import {
  ArrowLeft,
  CircleAlert,
  FileText,
  History,
  Info,
  Lock,
  Upload,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { PhoneFrame, PhoneScreen } from "@/components/wireframes/phone-frame";
import {
  ClosedAmountPair,
  DocumentChecklist,
  PurchaseHierarchy,
  PurchaseStatusBadge,
} from "@/components/wireframes/purchase-parts";
import { customerLabelFor } from "@/lib/wireframes/mock-data";
import {
  DOCUMENT_PERMISSIONS_PENDING,
  INTERMEDIATE_STATUS_PENDING,
  STATUS_TERMINOLOGY_PENDING,
  REQUIRED_DOCUMENTS_LEVEL_PENDING,
  auditForPurchase,
  documentCompleteness,
  markClosedActive,
  mayMarkClosedActive,
  purchaseById,
  purchasesForCustomer,
  resolvePurchase,
  uploadDocument,
  type CustomerPurchase,
} from "@/lib/wireframes/customer-purchase";
import { userById } from "@/lib/wireframes/sales-teams";

/**
 * F1 — Customer Purchase Detail (spec §68, §68.1, §68.2, §68.3).
 *
 * The screen that makes the model visible: the §66 hierarchy on one purchase,
 * its required-document checklist, and the two separate facts that decide
 * whether its Closed Amount counts for anything.
 *
 * Built in the phone frame because the Customer module in these wireframes is
 * the operational user's phone, and the owner who uploads the documents is a
 * Salesperson working from one.
 *
 * Upload and Mark Closed/Active are deliberately two controls. §68.1: uploading
 * the required documents "is by itself sufficient to satisfy the document
 * prerequisite" — and that is all it does. No approval follows, and nothing
 * closes itself.
 */

/** The purchase shown when the route carries no id. */
const DEFAULT_PURCHASE_ID = "cp-881-a";

export function PurchaseDetailScreen({
  purchaseId = null,
}: {
  purchaseId?: string | null;
} = {}) {
  const requested = purchaseId ?? DEFAULT_PURCHASE_ID;
  const seed = purchaseById(requested);

  /**
   * Local state so the walkthrough can upload a missing document and then close
   * the purchase, in that order. Nothing is saved and nothing is sent.
   */
  const [purchase, setPurchase] = useState<CustomerPurchase | null>(
    seed ?? null,
  );
  const [refused, setRefused] = useState<string | null>(null);

  if (!purchase) {
    return (
      <Shell>
        <section
          role="alert"
          className="surface-solid m-3 rounded-xl p-4 text-sm"
        >
          <h2 className="text-base font-semibold text-foreground">
            Purchase not available
          </h2>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">
            No Customer Purchase matching{" "}
            <code className="rounded bg-muted px-1">{requested}</code> is
            available. Nothing else is shown in its place.
          </p>
        </section>
      </Shell>
    );
  }

  const result = resolvePurchase(purchase);
  if (!result.ok) {
    return (
      <Shell>
        <section
          role="alert"
          className="surface-solid m-3 rounded-xl p-4 text-sm leading-relaxed text-danger-on-subtle"
        >
          {result.reason}
        </section>
      </Shell>
    );
  }

  const { lineage, completeness } = result.resolved;
  const closure = mayMarkClosedActive(purchase);
  const owner = userById(purchase.recordOwnerUserId);
  const audit = auditForPurchase(purchase.id);
  // The purchase names its own Customer. Hardcoding one meant every purchase
  // claimed to belong to Ramesh.
  const customer = customerLabelFor(purchase.customerId);
  const siblings = purchasesForCustomer(purchase.customerId).filter(
    (p) => p.id !== purchase.id,
  );

  /** §68.2: upload the next missing required document. Status is untouched. */
  const upload = () => {
    const next = completeness.missing[0];
    if (!next) return;
    setPurchase((current) =>
      current === null
        ? current
        : uploadDocument(
            current,
            {
              id: `ud-new-${next.id}`,
              documentTypeId: next.id,
              fileName: `${next.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
              fileType: "PDF",
              // The purchase's own owner, who §67 made responsible for it.
              uploadedByUserId: current.recordOwnerUserId,
              uploadedAt: "11 Sep 2026",
            },
            "11 Sep 2026",
          ),
    );
    setRefused(null);
  };

  /** §68.1: a separate action, refused while anything is missing. */
  const close = () => {
    const outcome = markClosedActive(purchase, "11 Sep 2026");
    if (!outcome.ok) {
      setRefused(outcome.reason);
      return;
    }
    setPurchase(outcome.purchase);
    setRefused(null);
  };

  return (
    <Shell customerName={customer?.name}>
      <div className="flex flex-col gap-3 px-3 py-3">
        {/* Identity: the customer, then §66's four levels. */}
        <section className="surface-solid rounded-xl p-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-foreground">
                {lineage.plan.name}
              </h2>
              <p className="truncate text-[11px] text-muted-foreground">
                {customer
                  ? `${customer.name} · ${customer.reference}`
                  : "Customer not available"}
              </p>
            </div>
            <PurchaseStatusBadge status={purchase.status} />
          </div>

          <PurchaseHierarchy
            lineage={lineage}
            policyReference={purchase.policyReference}
            className="mt-3 border-t border-border pt-3"
          />

          <dl className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-sm">
            <Row
              label="Start / effective date"
              value={purchase.startDate ?? "—"}
            />
            <Row
              label="Renewal date"
              value={purchase.renewalDate ?? "No further renewal"}
            />
            {/* §68: Record Owner. §2.5 keeps it operational — never a supervisor. */}
            <Row label="Record Owner" value={`${owner.name} · ${owner.role}`} />
          </dl>
        </section>

        {/* §68.2 — the checklist. */}
        <section className="surface-solid rounded-xl p-3">
          <DocumentChecklist
            purchase={purchase}
            userName={(id) => userById(id).name}
          />

          <button
            type="button"
            onClick={upload}
            disabled={completeness.complete}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Upload className="size-4" aria-hidden="true" />
            {completeness.complete
              ? "All required documents uploaded"
              : `Upload ${completeness.missing[0]?.name ?? "document"}`}
          </button>

          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            Policy documents only — identity and KYC documents are not part of
            this. Uploading is enough on its own: nothing is sent for approval
            or review.
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {REQUIRED_DOCUMENTS_LEVEL_PENDING}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {DOCUMENT_PERMISSIONS_PENDING}
          </p>
        </section>

        {/* §68.1 — the gate, and §68.3 — the two amounts. */}
        <section className="surface-solid rounded-xl p-3">
          <ClosedAmountPair purchase={purchase} />

          <div className="mt-3 border-t border-border pt-3">
            {purchase.status === "closed-active" ? (
              <p className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-subtle px-2.5 py-2 text-[11px] leading-relaxed text-success-on-subtle">
                <FileText
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                This purchase is Closed/Active and its required documents are
                complete, so its Recorded Closed Amount is eligible.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={close}
                  disabled={!closure.ok}
                  aria-describedby={closure.ok ? undefined : "closure-blocked"}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Lock className="size-4" aria-hidden="true" />
                  Mark Closed/Active
                </button>
                {closure.ok ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Every required policy document is present, so this purchase
                    may now be closed. It does not close by itself — completing
                    the documents and closing the sale are separate steps.
                  </p>
                ) : (
                  <p
                    id="closure-blocked"
                    className="mt-2 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-subtle px-2.5 py-2 text-[11px] leading-relaxed text-warning-on-subtle"
                  >
                    <CircleAlert
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    {closure.reason}
                  </p>
                )}
                {refused ? (
                  <p
                    role="alert"
                    className="mt-2 text-[11px] text-danger-on-subtle"
                  >
                    {refused}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {INTERMEDIATE_STATUS_PENDING}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {STATUS_TERMINOLOGY_PENDING}
          </p>
        </section>

        {/* §208 — the append-only trail. */}
        {audit.length > 0 ? (
          <section className="surface-solid rounded-xl p-3">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <History className="size-3.5" aria-hidden="true" />
              Audit history
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {audit.map((entry) => (
                <li key={entry.id} className="text-[11px]">
                  <p className="text-foreground">
                    <span className="font-medium">
                      {userById(entry.actorUserId).name}
                    </span>{" "}
                    · {AUDIT_LABEL[entry.action]}
                  </p>
                  <p className="text-muted-foreground">
                    {entry.previousValue
                      ? `${entry.previousValue} → ${entry.newValue}`
                      : entry.newValue}{" "}
                    · {entry.at}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Entries keep the wording recorded at the time. Renaming a plan
              later does not rewrite them, and acting on a purchase never makes
              the actor its owner.
            </p>
          </section>
        ) : null}

        {/* §65: this Customer's other purchases, so independence is visible. */}
        {siblings.length > 0 ? (
          <section className="surface-solid rounded-xl p-3">
            <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              This customer&rsquo;s other purchases
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {siblings.map((p) => {
                const other = resolvePurchase(p);
                if (!other.ok) return null;
                return (
                  <li key={p.id}>
                    <Link
                      href={
                        `/wireframes/customers/purchase?purchase=${p.id}` as Route
                      }
                      className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-1 text-[12px]"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {other.resolved.lineage.plan.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {documentCompleteness(p).uploaded} of{" "}
                        {documentCompleteness(p).required}
                      </span>
                      <PurchaseStatusBadge status={p.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}

const AUDIT_LABEL: Record<string, string> = {
  "purchase-created": "Purchase created",
  "plan-assigned": "Plan assigned",
  "closed-amount-recorded": "Closed Amount recorded",
  "closed-amount-changed": "Closed Amount changed",
  "document-uploaded": "Document uploaded",
  "marked-closed-active": "Marked Closed/Active",
  "owner-changed": "Record Owner changed",
};

function Shell({
  children,
  customerName,
}: {
  children: React.ReactNode;
  /** Whose purchase this is. Absent on the not-available screens. */
  customerName?: string;
}) {
  return (
    <div className="app-ambient min-h-dvh">
      <div className="mx-auto w-full max-w-[1100px] px-0 py-0 md:px-6 md:py-8">
        <PhoneFrame caption="Customer Purchase · documents gate the close">
          <PhoneScreen
            activeNav="customers"
            header={
              <header className="surface-glass sticky top-0 z-10 flex items-center gap-1 rounded-none border-x-0 border-t-0 px-2 py-2 pt-[env(safe-area-inset-top)]">
                <Link
                  href={"/wireframes/customers/mobile" as Route}
                  aria-label="Back to the customer"
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground"
                >
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Customer Purchase
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {customerName ?? "Customer Purchases"}
                  </p>
                </div>
              </header>
            }
          >
            {children}
          </PhoneScreen>
        </PhoneFrame>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
