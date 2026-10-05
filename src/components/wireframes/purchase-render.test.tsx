import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ConfigurationScreen } from "@/components/wireframes/admin/configuration-screen";
import { SettingsHubScreen } from "@/components/wireframes/admin/settings-hub-screen";
import { MobileCustomerRecordScreen } from "@/components/wireframes/customers/mobile-record";
import { PurchaseDetailScreen } from "@/components/wireframes/customers/purchase-detail";
import {
  ClosedAmountPair,
  DocumentChecklist,
} from "@/components/wireframes/purchase-parts";
import {
  PLANS,
  PRODUCT_CATEGORIES,
  PROVIDERS,
} from "@/lib/wireframes/catalogue";
import {
  CUSTOMER_PURCHASES,
  documentCompleteness,
  purchaseById,
  purchasesForCustomer,
} from "@/lib/wireframes/customer-purchase";
import { LINKED_RECORDS } from "@/lib/wireframes/mock-data";
import { SEQUENCE } from "@/lib/wireframes/flows";
import { userById } from "@/lib/wireframes/sales-teams";

/**
 * Batch 4B, rendered: what the client actually sees.
 *
 * The library tests prove the model; these prove the screens use it, show §66's
 * four levels apart, and never present a Recorded Closed Amount as though it
 * already counted.
 */

/** Ramesh Kumar's two canonical purchases. */
const ELIGIBLE = "cp-881-a";
const DOCS_INCOMPLETE = "cp-881-b";
/** Vikram Reddy's — documents complete, not yet closed. */
const DOCS_COMPLETE_NOT_CLOSED = "cp-904-a";
/** Anil Varghese's — held against a withdrawn plan. */
const WITHDRAWN = "cp-893-a";

/* --------------------------------------------- catalogue hierarchy (§66) */

describe("the catalogue hierarchy is visible (§66, §193)", () => {
  it("shows all three levels as separate sections on the Admin screen", async () => {
    const user = userEvent.setup();
    render(<ConfigurationScreen />);
    await user.click(screen.getByRole("tab", { name: "Product Catalogue" }));
    const text = document.body.textContent ?? "";

    expect(text).toContain("Product Categories");
    expect(text).toContain("Providers");
    expect(text).toContain("Plans / Sub-products");
    // Every catalogue record is listed.
    for (const c of PRODUCT_CATEGORIES) expect(text, c.name).toContain(c.name);
    for (const p of PROVIDERS) expect(text, p.name).toContain(p.name);
    for (const p of PLANS) expect(text, p.name).toContain(p.name);
    // And the rule a client most needs to read.
    expect(text).toContain("A customer buys a");
    expect(text).toContain("Plan / Sub-product");
  });

  it("shows a provider that operates in more than one category", async () => {
    const user = userEvent.setup();
    render(<ConfigurationScreen />);
    await user.click(screen.getByRole("tab", { name: "Product Catalogue" }));
    const multi = PROVIDERS.find((p) => p.categoryIds.length > 1)!;
    const text = document.body.textContent ?? "";
    expect(text).toContain(multi.name);
    // Both of its categories are named against it.
    for (const id of multi.categoryIds) {
      const name = PRODUCT_CATEGORIES.find((c) => c.id === id)!.name;
      expect(text, name).toContain(name);
    }
  });

  it("marks a withdrawn plan inactive and keeps it listed", async () => {
    const user = userEvent.setup();
    render(<ConfigurationScreen />);
    await user.click(screen.getByRole("tab", { name: "Product Catalogue" }));
    const withdrawn = PLANS.find((p) => !p.active)!;
    expect(document.body.textContent).toContain(withdrawn.name);
    // Active or inactive in words, never colour alone.
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("will not offer to deactivate a category that still has active plans", async () => {
    const user = userEvent.setup();
    render(<ConfigurationScreen />);
    await user.click(screen.getByRole("tab", { name: "Product Catalogue" }));
    // §193.1: its plans and providers must be deactivated first.
    const buttons = screen.getAllByRole("button", { name: "Deactivate" });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toBeDisabled();
  });

  it("is reachable from the settings hub as the Product Catalogue", async () => {
    const user = userEvent.setup();
    render(<SettingsHubScreen />);
    await user.click(screen.getByRole("button", { name: /Product Catalogue/ }));
    expect(
      screen.getByRole("link", { name: /Open product catalogue/i }),
    ).toHaveAttribute("href", "/wireframes/admin/configuration");
    expect(document.body.textContent).toContain("A customer buys a plan");
  });
});

/* --------------------------------------- multiple purchases (§65, §67) */

describe("a Customer's purchases are listed independently (§65)", () => {
  /** The record opens on Overview, so the Purchases tab is selected first. */
  async function openPurchases() {
    const user = userEvent.setup();
    render(<MobileCustomerRecordScreen from={null} />);
    await user.click(screen.getByRole("tab", { name: /Purchases/ }));
    return user;
  }

  it("leads each card with the Plan, not the category", async () => {
    await openPurchases();
    const text = document.body.textContent ?? "";
    // §66: the Plan is what was bought.
    for (const p of purchasesForCustomer("c881")) {
      const plan = PLANS.find((x) => x.id === p.planId)!;
      expect(text, plan.name).toContain(plan.name);
    }
    // The tab is named for purchases, not for generic services.
    expect(text).not.toContain("Policies & Services");
    expect(text).not.toContain("Product / Service");
  });

  it("shows each purchase's own provider, policy number and documents", async () => {
    await openPurchases();
    const text = document.body.textContent ?? "";
    for (const p of purchasesForCustomer("c881")) {
      if (p.policyReference) expect(text, p.id).toContain(p.policyReference);
      const { uploaded, required } = documentCompleteness(p);
      expect(text, p.id).toContain(`${uploaded} of ${required} uploaded`);
    }
    // More than one category is represented at once.
    expect(text).toContain("Health Insurance");
    expect(text).toContain("Motor Insurance");
  });

  it("links each purchase to its own detail route", async () => {
    await openPurchases();
    const links = screen.getAllByRole("link", { name: /Open purchase/ });
    expect(links.length).toBe(purchasesForCustomer("c881").length);
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const p of purchasesForCustomer("c881")) {
      expect(hrefs).toContain(
        `/wireframes/customers/purchase?purchase=${p.id}`,
      );
    }
  });
});

/* ------------------------------------- document checklist (§68.2, §205) */

describe("the required-document checklist (§68.2)", () => {
  it("names each required document, present or missing, with the count", () => {
    render(
      <DocumentChecklist
        purchase={purchaseById(DOCS_INCOMPLETE)!}
        userName={(id) => userById(id).name}
      />,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("Required policy documents — 1 of 2");
    expect(text).toContain("Policy schedule");
    expect(text).toContain("Policy certificate");
    expect(text).toContain("Missing");
    // §68.2: the uploader and date where present.
    expect(text).toMatch(/Uploaded by .+, \d{2} \w{3} \d{4}/);
  });

  it("offers no approval control anywhere on the purchase screen", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    for (const name of [/Approve/i, /Reject/i, /Review/i, /Sign off/i]) {
      expect(screen.queryByRole("button", { name }), String(name)).toBeNull();
    }
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/awaiting approval|pending review|approved by/i);
    // And it says so outright.
    expect(text).toContain("nothing is sent for approval");
  });

  it("says policy documents only, excluding identity and KYC", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Policy documents only");
    expect(text).toContain("identity and KYC documents are not part of this");
  });

  it("counts extra documents separately from the checklist", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Required policy documents — 3 of 3");
    expect(text).toMatch(/further policy document/);
    expect(text).toContain("do not change the count");
  });
});

/* ------------------------------- the blocked and eligible states (§68.1) */

describe("the Closed/Active gate on screen (§68.1)", () => {
  it("disables Mark Closed/Active and names the missing document", () => {
    render(<PurchaseDetailScreen purchaseId={DOCS_INCOMPLETE} />);
    const close = screen.getByRole("button", { name: /Mark Closed\/Active/ });
    expect(close).toBeDisabled();
    const text = document.body.textContent ?? "";
    expect(text).toContain("Policy certificate");
    expect(text).toContain("before marking this purchase Closed/Active");
    // Nothing was deleted or reassigned to explain the block.
    expect(text).toContain("Neha Thomas");
  });

  it("shows the recorded amount as not eligible while documents are missing", () => {
    render(<PurchaseDetailScreen purchaseId={DOCS_INCOMPLETE} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Recorded Closed Amount");
    expect(text).toContain("₹7,250.00");
    expect(text).toContain("Eligible Closed Amount");
    expect(text).toContain("Not eligible");
    expect(text).toContain("Required policy documents are incomplete");
  });

  it("enables closing once the last document is uploaded, without closing it", async () => {
    const user = userEvent.setup();
    render(<PurchaseDetailScreen purchaseId={DOCS_INCOMPLETE} />);
    expect(
      screen.getByRole("button", { name: /Mark Closed\/Active/ }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /Upload Policy certificate/ }),
    );

    // §68.1: uploading satisfies the prerequisite and nothing else.
    expect(document.body.textContent).toContain(
      "Required policy documents — 2 of 2",
    );
    expect(
      screen.getByRole("button", { name: /Mark Closed\/Active/ }),
    ).toBeEnabled();
    // Still not closed, and still not eligible.
    expect(document.body.textContent).toContain("Not eligible");
    expect(screen.getAllByText("Not yet closed").length).toBeGreaterThan(0);

    // Closing is the second, separate action.
    await user.click(
      screen.getByRole("button", { name: /Mark Closed\/Active/ }),
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("Closed/Active");
    expect(text).toContain("₹7,250.00");
    expect(text).not.toContain("Not eligible");
  });

  it("shows documents complete yet still not eligible, before closing", () => {
    render(<PurchaseDetailScreen purchaseId={DOCS_COMPLETE_NOT_CLOSED} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Required policy documents — 2 of 2");
    // No approval step stands between the two.
    expect(text).toContain("may now be closed");
    expect(text).toContain("separate steps");
    expect(text).toContain("Not eligible");
    expect(text).toContain("not Closed/Active");
    expect(
      screen.getByRole("button", { name: /Mark Closed\/Active/ }),
    ).toBeEnabled();
  });

  it("shows an eligible purchase with both amounts agreeing", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Recorded Closed Amount");
    expect(text).toContain("Eligible Closed Amount");
    // Both figures present and equal.
    expect(text.match(/₹18,400\.00/g)?.length).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain("Not eligible");
    expect(text).toContain("counts towards performance totals");
    // Already closed, so no closing control is offered.
    expect(
      screen.queryByRole("button", { name: /Mark Closed\/Active/ }),
    ).toBeNull();
  });
});

/* ------------------------- recorded versus eligible, in isolation (§68.3) */

describe("Recorded and Eligible Closed Amount are distinct (§68.3)", () => {
  it("always labels both, never a bare Closed Amount", () => {
    for (const id of [ELIGIBLE, DOCS_INCOMPLETE, DOCS_COMPLETE_NOT_CLOSED]) {
      const { unmount } = render(
        <ClosedAmountPair purchase={purchaseById(id)!} />,
      );
      const text = document.body.textContent ?? "";
      expect(text, id).toContain("Recorded Closed Amount");
      expect(text, id).toContain("Eligible Closed Amount");
      unmount();
    }
  });

  it("explains in words why an amount is not eligible", () => {
    const { unmount } = render(
      <ClosedAmountPair purchase={purchaseById(DOCS_COMPLETE_NOT_CLOSED)!} />,
    );
    expect(document.body.textContent).toContain("not Closed/Active");
    expect(document.body.textContent).toContain(
      "does not count towards performance totals yet",
    );
    unmount();

    render(<ClosedAmountPair purchase={purchaseById(DOCS_INCOMPLETE)!} />);
    expect(document.body.textContent).toContain(
      "Required policy documents are incomplete",
    );
  });

  it("introduces no percentage, slab or incentive figure", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/%|slab|commission|payout|incentive/i);
  });
});

/* -------------------- cross-screen consistency and the status wording */

describe("the same Customer reads the same on every screen", () => {
  it("shows Ramesh the same two purchases on the profile as in messaging", async () => {
    const user = userEvent.setup();
    render(<MobileCustomerRecordScreen from={null} />);
    await user.click(screen.getByRole("tab", { name: /Purchases/ }));

    const canonical = purchasesForCustomer("c881");
    expect(canonical.length).toBe(2);
    // One card per purchase, and no more.
    expect(screen.getAllByRole("link", { name: /Open purchase/ }).length).toBe(
      canonical.length,
    );
    const whatsapp = LINKED_RECORDS.find((r) => r.id === "c881")!;
    expect(whatsapp.purchases.length).toBe(canonical.length);
  });

  it("names the purchase's own Customer, not a hardcoded one", () => {
    const vikram = render(
      <PurchaseDetailScreen purchaseId={DOCS_COMPLETE_NOT_CLOSED} />,
    );
    expect(document.body.textContent).toContain("Vikram Reddy");
    expect(document.body.textContent).not.toContain("Ramesh Kumar");
    vikram.unmount();

    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    expect(document.body.textContent).toContain("Ramesh Kumar");
  });

  it("shows the uploader as the purchase's own owner", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    const owner = userById(purchaseById(ELIGIBLE)!.recordOwnerUserId);
    const text = document.body.textContent ?? "";
    expect(text).toContain(`Uploaded by ${owner.name}`);
    // No supervisory or non-owner name appears as an uploader.
    for (const other of ["Arun Menon", "Vikram Shah", "Sneha Thomas"]) {
      expect(text, other).not.toContain(`Uploaded by ${other}`);
    }
  });

  it("describes the pre-closure state as a condition, not a status name", () => {
    render(<PurchaseDetailScreen purchaseId={DOCS_INCOMPLETE} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Not yet closed");
    // Not presented as an approved, configurable business status.
    expect(text).not.toMatch(/\bDraft\b/);
    expect(text).toContain("is not an approved status name");
  });

  it("states that document permissions are still pending", () => {
    render(<PurchaseDetailScreen purchaseId={DOCS_INCOMPLETE} />);
    expect(document.body.textContent).toContain("pending confirmation");
  });
});

/* --------------------------------------- hierarchy on screen, and the route */

describe("hierarchy, ownership and registration", () => {
  it("shows §66's four levels as separately labelled fields", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    for (const label of [
      "Product Category",
      "Provider",
      "Plan / Sub-product",
      "Policy / Reference No.",
    ]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
    const text = document.body.textContent ?? "";
    expect(text).toContain("Health Insurance");
    expect(text).toContain("Star Health");
    expect(text).toContain("Family Health Optima");
    expect(text).toContain("POL-TEST-881-A");
  });

  it("names an operational Record Owner, never a supervisor", () => {
    render(<PurchaseDetailScreen purchaseId={ELIGIBLE} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Record Owner");
    expect(text).toContain("Neha Thomas · Salesperson");
    // No Admin or Manager appears as the owner.
    expect(text).not.toContain("Arun Menon · Admin");
    expect(text).not.toContain("Vikram Shah · Manager");
  });

  it("keeps a withdrawn plan readable on the purchase that holds it", () => {
    render(<PurchaseDetailScreen purchaseId={WITHDRAWN} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Star Health Classic (withdrawn)");
    expect(text).toContain("not offered for new ones");
    // Its amount and history survive.
    expect(text).toContain("₹11,900.00");
    expect(text).toContain("Audit history");
  });

  it("shows the audit trail with the words it recorded", () => {
    render(<PurchaseDetailScreen purchaseId={WITHDRAWN} />);
    const text = document.body.textContent ?? "";
    // The snapshot, not the plan's current renamed label.
    expect(text).toContain("Star Health Classic · Star Health");
    expect(text).toContain("Renaming a plan");
  });

  it("fails safely for an unknown purchase id", () => {
    render(<PurchaseDetailScreen purchaseId="cp-nope" />);
    expect(screen.getByRole("alert").textContent).toContain(
      "Purchase not available",
    );
    // No other purchase is shown in its place.
    for (const p of CUSTOMER_PURCHASES) {
      if (p.policyReference) {
        expect(document.body.textContent).not.toContain(p.policyReference);
      }
    }
  });

  it("registers the new route in the walkthrough", () => {
    const steps = SEQUENCE.filter(
      (s) => s.href === "/wireframes/customers/purchase",
    );
    expect(steps.length).toBe(1);
    expect(steps[0]!.label).toBe("Customer Purchase");
  });

  it("keeps the mobile screens labelled rather than icon-only", () => {
    render(<PurchaseDetailScreen purchaseId={DOCS_INCOMPLETE} />);
    // Every control carries an accessible name.
    for (const button of screen.getAllByRole("button")) {
      expect(
        (button.textContent ?? "").trim() ||
          button.getAttribute("aria-label") ||
          "",
      ).not.toBe("");
    }
    for (const link of screen.getAllByRole("link")) {
      expect(
        (link.textContent ?? "").trim() ||
          link.getAttribute("aria-label") ||
          "",
      ).not.toBe("");
    }
  });

  it("introduces no fixed width that would overflow a phone", () => {
    const { container } = render(
      <PurchaseDetailScreen purchaseId={ELIGIBLE} />,
    );
    const wide = container.querySelectorAll(
      '[class*="w-["], [class*="min-w-["]',
    );
    for (const node of wide) {
      const classes = node.className;
      expect(typeof classes === "string" ? classes : "").not.toMatch(
        /w-\[\d{3,}px\]/,
      );
    }
  });
});
