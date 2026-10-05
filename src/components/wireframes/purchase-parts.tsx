import { Check, FileText, X } from "lucide-react";

import {
  PRE_CLOSURE,
  PURCHASE_STATUS_LABEL,
  documentCompleteness,
  eligibleClosedAmount,
  formatPaise,
  type CustomerPurchase,
  type PurchaseStatus,
} from "@/lib/wireframes/customer-purchase";
import type { PlanLineage } from "@/lib/wireframes/catalogue";
import { cn } from "@/lib/utils";

/**
 * Shared Customer Purchase presentation (spec §65, §68, §68.1, §68.2, §68.3).
 *
 * One set of components so the Customer profile, the purchase list and the
 * purchase detail cannot drift into different wordings for the same fact —
 * particularly the difference between a Recorded and an Eligible Closed Amount,
 * which is the one place an ambiguous label would mislead about money.
 */

/* ------------------------------------------------------------- hierarchy */

/**
 * §66's four levels, named individually.
 *
 * §66 forbids a purchase against a Category or a Provider, so a single combined
 * "Product/Service" line would misrepresent what was actually bought. Each
 * level gets its own label and value.
 */
export function PurchaseHierarchy({
  lineage,
  policyReference,
  className,
}: {
  lineage: PlanLineage;
  policyReference: string | null;
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-col gap-2 text-sm", className)}>
      <HierarchyRow label="Product Category" value={lineage.category.name} />
      <HierarchyRow label="Provider" value={lineage.provider.name} />
      <HierarchyRow
        label="Plan / Sub-product"
        value={lineage.plan.name}
        note={
          lineage.plan.active
            ? undefined
            : "Withdrawn — kept on this purchase, not offered for new ones"
        }
      />
      <HierarchyRow
        label="Policy / Reference No."
        value={policyReference ?? "Not recorded yet"}
      />
    </dl>
  );
}

function HierarchyRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-foreground">
        {value}
        {note ? (
          <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

/* ---------------------------------------------------------------- status */

const STATUS_CLASS: Record<PurchaseStatus, string> = {
  "closed-active": "border-success/30 bg-success-subtle text-success-on-subtle",
  [PRE_CLOSURE]: "border-warning/30 bg-warning-subtle text-warning-on-subtle",
  completed: "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle",
  expired: "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle",
  cancelled: "border-danger/30 bg-danger-subtle text-danger-on-subtle",
};

/** The status in words. Never colour alone. */
export function PurchaseStatusBadge({
  status,
  className,
}: {
  status: PurchaseStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STATUS_CLASS[status],
        className,
      )}
    >
      {PURCHASE_STATUS_LABEL[status]}
    </span>
  );
}

/* ------------------------------------------------------------- documents */

/**
 * §68.2's checklist: each required type, present or missing, with the uploader
 * and date where present, and the overall count.
 *
 * There is no approval control and no reviewer column, because §68.1 and §205
 * are explicit that no approval follows an upload.
 */
export function DocumentChecklist({
  purchase,
  userName,
}: {
  purchase: CustomerPurchase;
  /** Resolves an uploader id to a name, so this component holds no user data. */
  userName: (userId: string) => string;
}) {
  const completeness = documentCompleteness(purchase);
  return (
    <div>
      <p className="text-xs font-medium text-foreground">
        Required policy documents — {completeness.uploaded} of{" "}
        {completeness.required}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {completeness.items.map((item) => (
          <li key={item.type.id} className="flex items-start gap-2">
            {item.present ? (
              <Check
                className="mt-0.5 size-3.5 shrink-0 text-success"
                aria-hidden="true"
              />
            ) : (
              <X
                className="mt-0.5 size-3.5 shrink-0 text-danger-on-subtle"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1 text-xs">
              <span className="font-medium text-foreground">
                {item.type.name}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {item.present && item.document
                  ? `Uploaded by ${userName(item.document.uploadedByUserId)}, ${item.document.uploadedAt}`
                  : "Missing"}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {completeness.additional.length > 0 ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <FileText className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {completeness.additional.length} further policy{" "}
          {completeness.additional.length === 1 ? "document" : "documents"} held
          against this purchase. Extra documents do not change the count above.
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- Closed Amount */

/**
 * Recorded and Eligible Closed Amount, side by side (§68.3).
 *
 * Always both, always labelled. §68.3 makes eligibility conditional on two
 * separate facts, so a single figure called "Closed Amount" next to a purchase
 * that is not yet closed would read as money already counted.
 */
export function ClosedAmountPair({
  purchase,
  className,
}: {
  purchase: CustomerPurchase;
  className?: string;
}) {
  const eligible = eligibleClosedAmount(purchase);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-xs text-muted-foreground">
          Recorded Closed Amount
        </span>
        <span className="text-sm font-semibold text-foreground">
          {purchase.recordedClosedAmount === null
            ? "Not recorded"
            : formatPaise(purchase.recordedClosedAmount)}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-xs text-muted-foreground">
          Eligible Closed Amount
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            eligible.eligible
              ? "text-success-on-subtle"
              : "text-muted-foreground",
          )}
        >
          {eligible.eligible ? formatPaise(eligible.amount) : "Not eligible"}
        </span>
      </div>
      {eligible.eligible ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Documents complete and the purchase is Closed/Active, so this amount
          counts towards performance totals.
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-warning-on-subtle">
          {eligible.reason} It does not count towards performance totals yet.
        </p>
      )}
    </div>
  );
}
