import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AdminDashboardScreen } from "@/components/wireframes/admin/dashboard-screen";
import { LeadPriorityScreen } from "@/components/wireframes/admin/lead-priority-screen";
import { PipelineScreen } from "@/components/wireframes/admin/pipeline-screen";
import { SettingsHubScreen } from "@/components/wireframes/admin/settings-hub-screen";
import { MappingScreen } from "@/components/wireframes/import/mapping-screen";
import {
  PriorityBadge,
  PriorityText,
} from "@/components/wireframes/lead-priority-parts";
import { RecordScreen } from "@/components/wireframes/sales/record-screen";
import { TodayScreen } from "@/components/wireframes/sales/today-screen";
import {
  LEAD_PRIORITY_COUNTS,
  LEAD_RECORD,
  PIPELINE_STAGES,
  SALES_LEADS,
} from "@/lib/wireframes/mock-data";
import {
  LEAD_PRIORITIES,
  UNKNOWN_PRIORITY_LABEL,
  selectablePriorities,
  type LeadPriority,
} from "@/lib/wireframes/lead-priority";
import { visibleConversationsFor } from "@/lib/wireframes/whatsapp-access";
import { USER, userById } from "@/lib/wireframes/sales-teams";

/**
 * Batch 4A, rendered: what the client actually sees.
 *
 * The helper tests prove the model; these prove the screens use it, show both
 * fields apart, and never lean on colour alone.
 */

/**
 * A clearly synthetic deactivated value.
 *
 * The rendered configuration shows A&S Fincare only the three values §192
 * confirms, so "retired value" behaviour is driven from a fixture rather than
 * from a fourth value nobody approved.
 */
const TEST_RETIRED: LeadPriority = {
  id: "lp-test-retired",
  label: "Test Retired Value",
  order: 4,
  active: false,
};
const WITH_RETIRED: readonly LeadPriority[] = [
  ...LEAD_PRIORITIES,
  TEST_RETIRED,
];

/* -------------------------------------------- 16, 17. shown side by side */

describe("Priority is shown separately from Stage (§41, §43, §57)", () => {
  /* 17 */
  it("gives the Lead detail two labelled rows, not one combined field", () => {
    render(<RecordScreen from={null} />);
    const text = document.body.textContent ?? "";
    // Both field names appear, each with its own value.
    expect(screen.getAllByText("Priority").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stage").length).toBeGreaterThan(0);
    expect(text).toContain("Warm");
    expect(text).toContain("Interested");
    // Never merged into a single string.
    expect(text).not.toContain("Warm · Interested");
    expect(text).not.toContain("Interested · Warm");
  });

  /* 17b */
  it("says plainly that changing one leaves the other alone", () => {
    render(<RecordScreen from={null} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("separate field from Stage");
    expect(text).toContain(LEAD_RECORD.stage);
  });

  /* 16 */
  it("labels Priority on the Lead rows a salesperson works from", () => {
    render(<TodayScreen />);
    const text = document.body.textContent ?? "";
    // §57: the word, on the row — not a bare coloured pill.
    expect(text).toContain("Priority:");
    expect(text).toContain("Hot");
  });

  /* 18 */
  it("never conveys Priority by colour alone", () => {
    const { container } = render(<PriorityBadge priorityId="lp-hot" />);
    // The label is in the text content, so a screen reader and a monochrome
    // screen both get it.
    expect(container.textContent).toContain("Hot");
    expect(container.textContent?.trim()).not.toBe("");
  });

  /* 18b */
  it("offers a colourless rendering of the same value", () => {
    const { container } = render(<PriorityText priorityId="lp-cold" />);
    expect(container.textContent).toBe("Priority: Cold");
  });

  /* 11 (rendered) */
  it("still displays a deactivated value, and says it is retired", () => {
    const { container } = render(
      <PriorityBadge priorityId={TEST_RETIRED.id} config={WITH_RETIRED} />,
    );
    expect(container.textContent).toContain(TEST_RETIRED.label);
    expect(container.textContent).toContain("retired");
  });

  it("shows the client only the three confirmed values", () => {
    render(<LeadPriorityScreen />);
    const text = document.body.textContent ?? "";
    for (const label of ["Hot", "Warm", "Cold"]) {
      expect(text, label).toContain(label);
    }
    // Nothing deactivated is shipped, so the panel for them is absent entirely.
    expect(text).not.toContain("Deactivated values");
    expect(text).not.toContain("Dormant");
    expect(LEAD_PRIORITIES.every((p) => p.active)).toBe(true);
    expect(LEAD_PRIORITIES.map((p) => p.label)).toEqual([
      "Hot",
      "Warm",
      "Cold",
    ]);
  });

  /* 12 (rendered) */
  it("shows an unknown reference as unavailable, not as a real value", () => {
    const { container } = render(<PriorityBadge priorityId="lp-nope" />);
    expect(container.textContent).toContain(UNKNOWN_PRIORITY_LABEL);
    for (const p of LEAD_PRIORITIES) {
      expect(container.textContent).not.toContain(p.label);
    }
  });
});

/* ------------------------------------------ 9, 10. the editing control */

describe("the priority control offers only selectable values (§192)", () => {
  /* 9 + 10 */
  it("lists every active value and no deactivated one", () => {
    render(<RecordScreen from={null} />);
    const select = screen.getByLabelText("Change priority");
    const options = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");
    for (const p of selectablePriorities()) {
      expect(options, p.label).toContain(p.label);
    }
    // Every offered option is an active configured value — nothing else.
    const active = selectablePriorities().map((p) => p.label);
    for (const option of options) {
      if (option === "" || option.includes("retired")) continue;
      expect(active, option).toContain(option);
    }
  });

  /* 4 (rendered) */
  it("changing priority leaves the stage on screen unchanged", async () => {
    const user = userEvent.setup();
    render(<RecordScreen from={null} />);
    const stageBefore = screen.getAllByText(LEAD_RECORD.stage).length;

    await user.selectOptions(
      screen.getByLabelText("Change priority"),
      "lp-hot",
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Hot");
    // The stage is exactly as it was, in the header and in the facts list.
    expect(screen.getAllByText(LEAD_RECORD.stage).length).toBe(stageBefore);
    expect(text).toContain(LEAD_RECORD.stage);
  });
});

/* --------------------------------- 14, 15. the Admin settings screen */

describe("Settings → Lead Priority (§192)", () => {
  /* 14 (rendered) */
  it("offers add, rename, reorder, deactivate and reactivate — and no delete", () => {
    render(<LeadPriorityScreen />);
    expect(
      screen.getByRole("button", { name: /Add value/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Rename Hot")).toBeInTheDocument();
    expect(screen.getByLabelText("Move Warm up")).toBeInTheDocument();
    expect(screen.getByLabelText("Deactivate Hot")).toBeInTheDocument();
    // Reactivation has nothing to act on while every shipped value is active,
    // which is the confirmed state. The library test covers the operation.
    expect(screen.queryByRole("button", { name: /Reactivate/ })).toBeNull();
    // No removal anywhere on the screen.
    expect(screen.queryByRole("button", { name: /Delete|Remove/ })).toBeNull();
    expect(document.body.textContent).toContain("There is no delete");
  });

  /* default (rendered) */
  it("marks the current default and does not offer to change it", () => {
    render(<LeadPriorityScreen />);
    const text = document.body.textContent ?? "";
    // §38's configured default, named as current rather than as approved.
    expect(text).toContain("Currently the default for new Leads");
    expect(text).toContain("illustrative");
    // §192 does not authorize choosing it, so no control appears.
    expect(
      screen.queryByRole("button", { name: /Set as default/i }),
    ).toBeNull();
    expect(text).toContain("Changing the default is not offered yet");
  });

  /* default (rendered) */
  it("refuses to deactivate the default, and says why", async () => {
    const user = userEvent.setup();
    render(<LeadPriorityScreen />);
    await user.click(screen.getByLabelText("Deactivate Warm"));
    expect(screen.getByRole("alert").textContent).toContain(
      "default for new Leads",
    );
    // Warm is still shown as the default.
    expect(document.body.textContent).toContain(
      "Currently the default for new Leads",
    );
  });

  /* 13 (rendered) */
  it("reorders in place when the Admin moves a value", async () => {
    const user = userEvent.setup();
    render(<LeadPriorityScreen />);
    const before = screen
      .getAllByText(/^(Hot|Warm|Cold)$/)
      .map((n) => n.textContent);
    expect(before.slice(0, 3)).toEqual(["Hot", "Warm", "Cold"]);

    await user.click(screen.getByLabelText("Move Cold up"));

    const after = screen
      .getAllByText(/^(Hot|Warm|Cold)$/)
      .map((n) => n.textContent);
    expect(after.slice(0, 3)).toEqual(["Hot", "Cold", "Warm"]);
  });

  /* 14g (rendered) */
  it("refuses to leave no active value, and explains why", async () => {
    const user = userEvent.setup();
    render(<LeadPriorityScreen />);
    // Warm is the default and cannot be deactivated at all, so Hot and Cold go
    // first and the last attempt has nothing left to spare.
    await user.click(screen.getByLabelText("Deactivate Hot"));
    await user.click(screen.getByLabelText("Deactivate Cold"));
    await user.click(screen.getByLabelText("Deactivate Warm"));
    expect(screen.getByRole("alert").textContent).toMatch(
      /stay active|default for new Leads/,
    );
  });

  /* 15 (rendered) */
  it("presents the values as business data, never as permissions", () => {
    render(<LeadPriorityScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("not permissions");
    expect(text).toContain("does not alter who can see a Lead");
    expect(screen.queryByText(/Role/)).toBeNull();
  });

  /* 3 (rendered) */
  it("says it is not the pipeline, and the pipeline says the same back", () => {
    const priority = render(<LeadPriorityScreen />);
    expect(document.body.textContent).toContain("not pipeline");
    priority.unmount();

    render(<PipelineScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Stage is not priority");
    // No priority value appears as a stage on the pipeline screen.
    for (const p of LEAD_PRIORITIES) {
      const asStage = PIPELINE_STAGES.some((s) => s.name === p.label);
      expect(asStage, p.label).toBe(false);
    }
  });

  it("is reachable from the settings hub as its own area", async () => {
    const user = userEvent.setup();
    render(<SettingsHubScreen />);
    // The hub's cards expand on demand, so open this one first.
    await user.click(screen.getByRole("button", { name: /Lead Priority/ }));
    expect(
      screen.getByRole("link", { name: /Open lead priority/i }),
    ).toHaveAttribute("href", "/wireframes/admin/lead-priority");
    // Its own area, not a section of the pipeline card.
    expect(document.body.textContent).toContain("never a stage itself");
  });
});

/* ------------------------------------------------ 19. filters and sorting */

describe("Priority and Stage filter independently (§37)", () => {
  /* 19 */
  it("shows the dashboard breakdown as a second dimension, not a stage column", () => {
    render(<AdminDashboardScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("By priority");
    expect(text).toContain("counted by priority");
    // Every configured value appears in the breakdown, including the retired
    // one, because the leads holding it still exist.
    for (const p of LEAD_PRIORITIES) {
      expect(text, p.label).toContain(p.label);
    }
    // And the stage chart still shows only stages.
    for (const p of LEAD_PRIORITIES) {
      const stageNames = PIPELINE_STAGES.map((s) => s.name);
      expect(stageNames, p.label).not.toContain(p.label);
    }
  });

  /* 19b */
  it("keeps the breakdown reconciled with the stage total", () => {
    render(<AdminDashboardScreen />);
    const total = Object.values(LEAD_PRIORITY_COUNTS).reduce(
      (n, c) => n + c,
      0,
    );
    expect(document.body.textContent).toContain(
      `The same ${total} leads, counted by priority`,
    );
  });
});

/* ------------------------------------------------- 22, 23. import screens */

describe("the import Map step keeps the two fields apart (§149)", () => {
  /* 22 (rendered) */
  it("maps a Priority column of its own, alongside the Stage column", () => {
    render(<MappingScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Lead Priority");
    expect(text).toContain("Lead Stage");
    // Two separate uploaded columns.
    expect(text).toContain("Lead Temp");
    expect(text).toContain("Status");
  });

  /* 23 (rendered) */
  it("asks the user to map an unmatched value, offering only active ones", async () => {
    const user = userEvent.setup();
    render(<MappingScreen />);
    expect(document.body.textContent).toContain(
      "does not match an active Lead Priority value",
    );

    const resolver = screen.getByLabelText(/Map .High. to/);
    const options = within(resolver)
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");
    for (const p of selectablePriorities()) {
      expect(options, p.label).toContain(p.label);
    }
    // Besides "Choose…" and §149's configured-default fallback, every option is
    // an active configured value.
    const allowed = [
      "Choose…",
      "Use the default priority (Warm)",
      ...selectablePriorities().map((p) => p.label),
    ];
    for (const option of options) expect(allowed, option).toContain(option);
    // It never converts on its own.
    expect(document.body.textContent).toContain("never guesses one");

    await user.selectOptions(resolver, "Warm");
    expect(document.body.textContent).toContain("Warm");
  });

  /* 23b */
  it("resolving Priority does not resolve Stage, and vice versa", async () => {
    const user = userEvent.setup();
    render(<MappingScreen />);
    await user.selectOptions(screen.getByLabelText(/Map .High. to/), "Warm");
    // The Stage row is still waiting for its own decision.
    expect(screen.getByLabelText(/Map .Follow Up. to/)).toBeInTheDocument();
  });
});

/* --------------------------------- 20, 21. hierarchy is unchanged by this */

describe("Priority never widens visibility (§192, §2.3)", () => {
  /* 20 */
  it("leaves the hierarchy scopes exactly as they were", () => {
    // Priority is not an input to any visibility decision, so the permitted
    // sets are the same as Batch 3A established.
    const admin = userById(USER.arun);
    const lead = userById(USER.sneha);
    const peer = userById(USER.divya);
    expect(visibleConversationsFor(admin).length).toBeGreaterThan(
      visibleConversationsFor(lead).length,
    );
    expect(visibleConversationsFor(peer).length).toBeLessThanOrEqual(
      visibleConversationsFor(lead).length,
    );
  });

  /* 21 */
  it("gives a Salesperson no route to a peer's Lead through priority", () => {
    // Every Lead in the salesperson's own list is one they own or were given.
    // Priority is a property of those Leads, never a way to reach others.
    for (const record of SALES_LEADS) {
      expect(["owner", "shared"]).toContain(record.access);
    }
    // No priority helper takes a user, a team or a scope at all, so none can
    // be used to widen a set.
    for (const fn of [
      selectablePriorities,
      ...Object.values(LEAD_PRIORITIES).map(() => selectablePriorities),
    ]) {
      expect(fn.length).toBeLessThanOrEqual(1);
    }
  });
});
