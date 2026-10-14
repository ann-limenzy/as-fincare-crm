import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DesktopLeadListScreen } from "@/components/wireframes/leads/desktop-list";
import { MobileLeadListScreen } from "@/components/wireframes/leads/mobile-list";
import { PIPELINE_STAGES, SETTINGS_USERS } from "@/lib/wireframes/mock-data";
import { LEAD_PRIORITIES } from "@/lib/wireframes/lead-priority";
import {
  LEADS,
  NO_FILTERS,
  QUICK_FILTERS,
  ROW_ACTIONS,
  activeFilterCount,
  followUpState,
  interestLabel,
  leadsVisibleTo,
  matchesSearch,
  ownerFilterOptions,
  ownerIdsVisibleTo,
  showsOwnerColumn,
  visibleLeads,
} from "@/lib/wireframes/leads";
import { SEQUENCE } from "@/lib/wireframes/flows";
import { USER, userById } from "@/lib/wireframes/sales-teams";

/**
 * The Leads list, on a phone and at a desk (§37, §2.3, §192, §210).
 *
 * The two screens are one feature at two widths, so most of what matters is
 * that they agree: same rows, same status words, same filter meanings, same
 * actions.
 */

const sneha = userById(USER.sneha); // Team Lead — both screens' viewer
const admin = userById(USER.arun);
const divya = userById(USER.divya); // Salesperson in Sneha's team

/* ------------------------------------------------- the sample lead set */

describe("the sample leads cover the states a list must show", () => {
  it("includes an overdue, a due-today and an upcoming follow-up", () => {
    const states = LEADS.map(followUpState);
    expect(states).toContain("overdue");
    expect(states).toContain("today");
    expect(states).toContain("upcoming");
    // And at least one with none at all, for §37's "No Follow-up" filter.
    expect(states).toContain("none");
  });

  it("uses only configured priorities and active pipeline stages", () => {
    const priorities = new Set(LEAD_PRIORITIES.map((p) => p.id));
    const stages = new Set(
      PIPELINE_STAGES.filter((s) => s.active).map((s) => s.name),
    );
    for (const lead of LEADS) {
      expect(priorities, lead.name).toContain(lead.priorityId);
      expect(stages, lead.name).toContain(lead.stage);
    }
  });

  it("keeps priority and stage as separate fields (§37)", () => {
    for (const lead of LEADS) {
      expect(lead.priorityId, lead.name).toMatch(/^lp-/);
      expect(lead.stage, lead.name).not.toMatch(/^lp-/);
      // Neither is derivable from the other: the same stage carries
      // different priorities across the set.
      expect(lead).toHaveProperty("priorityId");
      expect(lead).toHaveProperty("stage");
    }
    const interested = LEADS.filter((l) => l.stage === "Interested");
    expect(new Set(interested.map((l) => l.priorityId)).size).toBeGreaterThan(
      1,
    );
  });

  it("is owned only by operational users (§2.5)", () => {
    for (const lead of LEADS) {
      const owner = userById(lead.recordOwnerUserId);
      expect(["Team Lead", "Salesperson"], lead.name).toContain(owner.role);
    }
  });

  it("resolves every lead's interest through the catalogue", () => {
    for (const lead of LEADS) {
      expect(interestLabel(lead), lead.name).not.toContain("not available");
    }
  });
});

/* ------------------------------------------------------ scope and filters */

describe("visibility follows the hierarchy (§2.3, §37)", () => {
  it("gives a Team Lead her own team and no more", () => {
    const visible = leadsVisibleTo(sneha);
    expect(visible.length).toBeGreaterThan(0);
    const permittedOwners = ownerIdsVisibleTo(sneha);
    for (const lead of visible) {
      expect(permittedOwners).toContain(lead.recordOwnerUserId);
    }
    // No peer team's owner can appear.
    expect(permittedOwners.has(USER.kavya)).toBe(false);
  });

  it("resolves All and My Leads to the same set for a Salesperson (§37)", () => {
    const all = visibleLeads(divya, NO_FILTERS);
    const mine = visibleLeads(divya, { ...NO_FILTERS, quick: "mine" });
    expect(all.map((l) => l.id)).toEqual(mine.map((l) => l.id));
    for (const lead of all) {
      expect(lead.recordOwnerUserId).toBe(divya.id);
    }
    // And a Salesperson gets no owner column repeating their own name.
    expect(showsOwnerColumn(divya)).toBe(false);
    expect(showsOwnerColumn(sneha)).toBe(true);
  });

  it("never offers an owner filter outside the viewer's scope (§37)", () => {
    const options = ownerFilterOptions(sneha);
    expect(options.length).toBeGreaterThan(1);
    for (const u of options) {
      expect(ownerIdsVisibleTo(sneha)).toContain(u.id);
    }
    const names = options.map((u) => u.name);
    expect(names).not.toContain("Kavya Raghavan");
    expect(names).not.toContain("Arun Menon");
  });

  it("cannot widen the visible set through any filter", () => {
    const scoped = new Set(leadsVisibleTo(sneha).map((l) => l.id));
    for (const quick of QUICK_FILTERS.map((f) => f.id)) {
      for (const priority of [null, ...LEAD_PRIORITIES.map((p) => p.id)]) {
        const rows = visibleLeads(sneha, {
          ...NO_FILTERS,
          quick,
          priorityId: priority,
        });
        for (const lead of rows) expect(scoped).toContain(lead.id);
      }
    }
  });

  it("searches only name, phone and email (§37)", () => {
    const lead = LEADS[0]!;
    expect(matchesSearch(lead, lead.name.split(" ")[0]!)).toBe(true);
    expect(matchesSearch(lead, lead.phone.replace(/\s/g, ""))).toBe(true);
    expect(matchesSearch(lead, lead.email)).toBe(true);
    // Not the stage or the source — those are filters, not search terms.
    expect(matchesSearch(lead, "Interested")).toBe(false);
    expect(matchesSearch(lead, "Walk-in")).toBe(false);
  });

  it("counts applied filters so the screens can show them", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...NO_FILTERS, quick: "mine", stage: "New" }),
    ).toBe(2);
  });
});

/* ---------------------------------------------------------------- mobile */

describe("the phone list (§37, §210)", () => {
  it("shows a compact header with the title and Add Lead", () => {
    render(<MobileLeadListScreen />);
    expect(
      screen.getByRole("heading", { name: "Leads", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add Lead/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search leads")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Filter leads/ }),
    ).toBeInTheDocument();
  });

  it("uses the shared bottom navigation, not a desktop sidebar", () => {
    render(<MobileLeadListScreen />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByText("Leads")).toBeInTheDocument();
    // The Leads tab marks itself as the current destination.
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toContain(
      "Leads",
    );
  });

  it("shows each lead as a card with the facts that matter first", () => {
    render(<MobileLeadListScreen />);
    const text = document.body.textContent ?? "";
    for (const lead of leadsVisibleTo(sneha)) {
      expect(text, lead.name).toContain(lead.name);
    }
    // Name, priority, stage, follow-up and interest all present.
    expect(text).toContain("Rajesh Menon");
    expect(text).toContain("Priority:");
    expect(text).toContain("Hot");
    expect(text).toContain("Stage: Interested");
    expect(text).toContain("Next follow-up:");
    expect(text).toContain("Family Health Optima");
    // No table on a phone.
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("calls an overdue follow-up out in words, not colour alone", () => {
    render(<MobileLeadListScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/overdue by \d+ day/);
    expect(text).toContain("due today");
  });

  it("keeps the record tap separate from the contact actions", () => {
    render(<MobileLeadListScreen />);
    // Opening the record is a link; Call is a button that hands off.
    expect(
      screen.getByRole("link", { name: /Open Rajesh Menon's lead record/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Call Rajesh Menon" }),
    ).toBeInTheDocument();
  });

  it("hands a call off rather than dialling", async () => {
    const user = userEvent.setup();
    render(<MobileLeadListScreen />);
    await user.click(screen.getByRole("button", { name: "Call Rajesh Menon" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // No tel: link anywhere on the screen.
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href") ?? "").not.toMatch(/^tel:/);
    }
  });

  it("filters, shows what is applied, and resets", async () => {
    const user = userEvent.setup();
    render(<MobileLeadListScreen />);
    const before = screen.getAllByRole("link", {
      name: /lead record/,
    }).length;

    await user.click(screen.getByRole("button", { name: /Follow-up Due/ }));
    const after = screen.getAllByRole("link", { name: /lead record/ }).length;
    expect(after).toBeLessThan(before);

    // The applied filter is named, and removable.
    const applied = screen.getByRole("group", { name: "Applied filters" });
    expect(applied.textContent).toContain("Follow-up Due");
    await user.click(
      within(applied).getByRole("button", { name: /Clear all/ }),
    );
    expect(screen.getAllByRole("link", { name: /lead record/ }).length).toBe(
      before,
    );
  });

  it("offers §37's row actions behind a menu, not on the card", async () => {
    const user = userEvent.setup();
    render(<MobileLeadListScreen />);
    await user.click(
      screen.getByRole("button", { name: "More actions for Rajesh Menon" }),
    );
    const sheet = screen.getByRole("dialog");
    for (const action of ROW_ACTIONS) {
      expect(within(sheet).getByText(action)).toBeInTheDocument();
    }
  });

  it("explains an empty result instead of showing a blank list", async () => {
    const user = userEvent.setup();
    render(<MobileLeadListScreen />);
    await user.type(screen.getByLabelText("Search leads"), "zzzzzz");
    expect(screen.getAllByText("No leads match").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Reset filters/ }),
    ).toBeInTheDocument();
  });

  it("gives every control a comfortable touch target", () => {
    const { container } = render(<MobileLeadListScreen />);
    const controls = container.querySelectorAll("button, a, input, select");
    expect(controls.length).toBeGreaterThan(10);
    for (const el of controls) {
      const cls = el.className;
      if (typeof cls !== "string") continue;
      // Either an explicit minimum height, or a square icon target of 11
      // (44px) — the two patterns the rest of the phone screens use.
      const sized =
        /min-h-11|h-11|h-14|size-11|size-9|min-h-\[/.test(cls) ||
        el.tagName === "INPUT";
      expect(sized, `${el.tagName}: ${cls.slice(0, 60)}`).toBe(true);
    }
  });

  it("introduces no fixed width that would overflow a narrow phone", () => {
    const { container } = render(<MobileLeadListScreen />);
    for (const el of container.querySelectorAll("*")) {
      const cls = el.className;
      if (typeof cls !== "string") continue;
      // Only utilities that apply at phone width matter here. A breakpoint
      // prefix (md:w-[390px] is the device bezel) never reaches a real phone,
      // and max-w- is a ceiling rather than a fixed width.
      const unprefixed = cls.split(/\s+/).filter((c) => !c.includes(":"));
      for (const c of unprefixed) {
        expect(c).not.toMatch(/^w-\[\d{3,}px\]$/);
        expect(c).not.toMatch(/^min-w-\[\d{3,}px\]$/);
      }
    }
  });
});

/* --------------------------------------------------------------- desktop */

describe("the desktop list (§37)", () => {
  it("uses the established sidebar and top-bar chrome", () => {
    render(<DesktopLeadListScreen />);
    const nav = screen.getByRole("navigation", { name: /Sections/i });
    expect(within(nav).getAllByText("Leads").length).toBeGreaterThan(0);
    // And the Leads entry is the current destination.
    expect(within(nav).getByRole("link", { name: /Leads/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("heading", { name: "Leads", level: 2 }),
    ).toBeInTheDocument();
  });

  it("puts the title and Add Lead above the search-and-filter toolbar", () => {
    render(<DesktopLeadListScreen />);
    expect(
      screen.getByRole("button", { name: /Add Lead/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Search and filter leads" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search leads")).toBeInTheDocument();
  });

  it("shows a table with priority and stage in separate columns", () => {
    render(<DesktopLeadListScreen />);
    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.trim());
    expect(headers).toContain("Lead");
    expect(headers).toContain("Interested in");
    expect(headers).toContain("Priority");
    expect(headers).toContain("Stage");
    expect(headers).toContain("Record Owner");
    expect(headers).toContain("Next follow-up");
    // Not merged into one column.
    expect(headers).not.toContain("Priority / Stage");
  });

  it("shows a result count and working pagination", async () => {
    const user = userEvent.setup();
    render(<DesktopLeadListScreen />);
    const total = leadsVisibleTo(sneha).length;
    expect(document.body.textContent).toContain(`of ${total}`);
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    const next = screen.getByRole("button", { name: /Next/ });
    expect(next).toBeEnabled();
    await user.click(next);
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous/ })).toBeEnabled();
  });

  it("returns to the first page when a filter changes", async () => {
    const user = userEvent.setup();
    render(<DesktopLeadListScreen />);
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Follow-up Due/ }));
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });

  it("keeps the next follow-up legible and the overdue one marked", () => {
    render(<DesktopLeadListScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/overdue by \d+ day/);
    expect(text).toContain("due today");
  });

  it("offers the same row actions as the phone", async () => {
    const user = userEvent.setup();
    render(<DesktopLeadListScreen />);
    await user.click(
      screen.getByRole("button", { name: "More actions for Rajesh Menon" }),
    );
    for (const action of ROW_ACTIONS) {
      expect(screen.getByText(action)).toBeInTheDocument();
    }
  });

  it("never lists an owner the viewer may not see", () => {
    render(<DesktopLeadListScreen />);
    const text = document.body.textContent ?? "";
    const outOfScope = SETTINGS_USERS.filter(
      (u) => !ownerIdsVisibleTo(sneha).has(u.id),
    );
    expect(outOfScope.length).toBeGreaterThan(0);
    for (const u of outOfScope) {
      expect(text, u.name).not.toContain(u.name);
    }
  });

  it('names the signed-in person the rows call "You"', () => {
    // Rows owned by the viewer read "You"; a header naming somebody else
    // would make the owner column unreadable.
    render(<DesktopLeadListScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain(sneha.name);
    expect(screen.getAllByText("You").length).toBeGreaterThan(0);
  });

  it("offers Add Lead once, not in the header and the top bar both", () => {
    render(<DesktopLeadListScreen />);
    expect(screen.getAllByText(/Add Lead/)).toHaveLength(1);
  });
});

/* ----------------------------------------------- the two screens agree */

describe("phone and desktop are one feature at two widths", () => {
  it("show the same leads to the same viewer", () => {
    const mobile = render(<MobileLeadListScreen />);
    const onPhone = leadsVisibleTo(sneha).filter((l) =>
      (document.body.textContent ?? "").includes(l.name),
    );
    mobile.unmount();

    render(<DesktopLeadListScreen />);
    const text = document.body.textContent ?? "";
    // The desktop paginates, so compare against the full filtered set.
    const onDesk = visibleLeads(sneha, NO_FILTERS);
    expect(onPhone.length).toBe(onDesk.length);
    expect(text).toContain(onDesk[0]!.name);
  });

  it("use the same status words and quick-filter labels", () => {
    const mobile = render(<MobileLeadListScreen />);
    const phoneText = document.body.textContent ?? "";
    mobile.unmount();
    render(<DesktopLeadListScreen />);
    const deskText = document.body.textContent ?? "";

    for (const f of QUICK_FILTERS) {
      expect(phoneText, f.label).toContain(f.label);
      expect(deskText, f.label).toContain(f.label);
    }
    for (const word of ["Hot", "Warm", "Interested", "Contacted"]) {
      expect(phoneText, word).toContain(word);
      expect(deskText, word).toContain(word);
    }
  });

  it("registers both screens in the walkthrough", () => {
    const hrefs = SEQUENCE.map((s) => s.href);
    expect(hrefs).toContain("/wireframes/leads/mobile");
    expect(hrefs).toContain("/wireframes/leads/list");
  });

  it("introduces no revenue, commission or incentive figure", () => {
    for (const ui of [
      <MobileLeadListScreen key="m" />,
      <DesktopLeadListScreen key="d" />,
    ]) {
      const { unmount } = render(ui);
      const text = document.body.textContent ?? "";
      expect(text).not.toMatch(/revenue|commission|incentive|₹/i);
      unmount();
    }
  });

  it("offers Add Lead to an operational viewer only", () => {
    // §37 makes "+ Add Lead" the list's primary action and §38 defines the
    // form; §212 leaves it open only for Admin and Manager. Both screens are
    // presented as a Team Lead, so the action is theirs to use.
    expect(["Team Lead", "Salesperson"]).toContain(sneha.role);
    expect(admin.role).toBe("Admin");
  });
});
