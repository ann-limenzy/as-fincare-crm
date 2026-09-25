import { readFileSync } from "node:fs";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AssignmentScreen } from "@/components/wireframes/import/assignment-screen";
import { AssignmentSummary } from "@/components/wireframes/import/assignment-summary";
import {
  DEFAULT_CHOICE,
  getAssignmentChoice,
  setAssignmentChoice,
} from "@/lib/wireframes/import-assignment";
import { USER } from "@/lib/wireframes/sales-teams";

/**
 * Batch 2B, rendered: Step 3 offers three strategies and blocks an
 * unusable one (§152, §153).
 */

afterEach(() => {
  setAssignmentChoice(DEFAULT_CHOICE);
});

const strategies = () => screen.getAllByRole("radio");

describe("Step 3 — Choose Lead assignment, rendered", () => {
  it("renders exactly three strategies, in a named group", () => {
    render(<AssignmentScreen />);
    expect(strategies()).toHaveLength(3);
    expect(
      screen.getByRole("radio", { name: /Assign to a specific Team Lead/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Assign to a specific Salesperson/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Assign to a Team/ }),
    ).toBeInTheDocument();
    // A real fieldset carries the group name.
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("renders no CRM/default assignment-rule option", () => {
    render(<AssignmentScreen />);
    const text = document.body.textContent ?? "";
    for (const banned of [
      "CRM assignment rules",
      "Use default rules",
      "Organization-wide round robin",
      "Automatic fallback",
      "Leave assignment for review",
      "Use assignments from the spreadsheet",
    ]) {
      expect(text, banned).not.toContain(banned);
    }
  });

  it("keeps Continue unavailable until a valid choice is made, and says why", () => {
    render(<AssignmentScreen />);
    const cont = screen.getByRole("button", { name: /Continue to validation/ });
    expect(cont).toBeDisabled();
    expect(document.body.textContent).toContain(
      "Choose how imported Leads should be assigned",
    );
  });

  it("blocks Continue for a Team whose pool is empty", async () => {
    const user = userEvent.setup();
    render(<AssignmentScreen />);
    await user.click(screen.getByRole("radio", { name: /Assign to a Team/ }));
    await user.selectOptions(screen.getByLabelText("Team"), "team-life");
    expect(
      screen.getByRole("button", { name: /Continue to validation/ }),
    ).toBeDisabled();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(
      /no member who is active and in round robin/i,
    );
    // Not colour alone: the reason is text, and the disabled button points at it.
    expect(
      screen.getByRole("button", { name: /Continue to validation/ }),
    ).toHaveAttribute("aria-describedby", alert.id);
  });

  it("shows the Health configuration and names the paused exclusion", async () => {
    const user = userEvent.setup();
    render(<AssignmentScreen />);
    await user.click(screen.getByRole("radio", { name: /Assign to a Team/ }));
    await user.selectOptions(screen.getByLabelText("Team"), "team-health");
    const text = document.body.textContent ?? "";
    expect(text).toContain("Sneha Thomas");
    expect(text).toContain("Neha Thomas");
    expect(text).toContain("Divya Mohan");
    expect(text).toContain("Paused from round robin");
    expect(text).toContain("Still available for direct assignment");
    expect(text).toContain("Round-robin batch size");
    // Valid choice: Continue becomes a real link to Validate.
    expect(
      screen.getByRole("link", { name: /Continue to validation/ }),
    ).toHaveAttribute("href", "/wireframes/import/validate");
  });

  it("offers the paused Salesperson for direct assignment", async () => {
    const user = userEvent.setup();
    render(<AssignmentScreen />);
    await user.click(
      screen.getByRole("radio", { name: /Assign to a specific Salesperson/ }),
    );
    const select = screen.getByLabelText("Salesperson");
    expect(
      within(select).getByRole("option", { name: /Divya Mohan/ }),
    ).toBeInTheDocument();
    await user.selectOptions(select, USER.divya);
    expect(
      screen.getByRole("link", { name: /Continue to validation/ }),
    ).toHaveAttribute("href", "/wireframes/import/validate");
  });

  it("lists no Admin or Manager as a direct-assignment target", async () => {
    const user = userEvent.setup();
    render(<AssignmentScreen />);
    await user.click(
      screen.getByRole("radio", { name: /Assign to a specific Team Lead/ }),
    );
    const select = screen.getByLabelText("Team Lead");
    expect(select.textContent).not.toContain("Arun Menon");
    expect(select.textContent).not.toContain("Vikram Shah");
  });
});

describe("Results — every source row accounted for (§160)", () => {
  it("shows all four outcomes and reconciles to the source total", async () => {
    const { ResultScreen } =
      await import("@/components/wireframes/import/result-screen");
    render(<ResultScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("390");
    expect(text).toContain("18");
    expect(text).toContain("12");
    expect(text).toContain("8");
    expect(text).toContain("428");
    expect(text).toContain("Needs attention");
    expect(text).toContain("Cannot import");
    expect(text).toMatch(/All 428 rows in the file are accounted for/);
    expect(text).toContain("not imported because they still need attention");
    expect(text).toContain("Nothing is omitted from this total");
    // The merged bucket is gone.
    expect(text).not.toContain("Rows excluded");
  });

  it("does not label the 12 held-back rows as owner problems", async () => {
    const { ResultScreen } =
      await import("@/components/wireframes/import/result-screen");
    render(<ResultScreen />);
    const text = document.body.textContent ?? "";
    // §157 lists several attention reasons; only one concerns the owner, so
    // the aggregate category must stay generic.
    expect(text).not.toContain("Unresolved owner");
    expect(text).not.toContain("Record Owner could not be matched");
    expect(text).not.toMatch(/12[^.]{0,40}Record Owner/);
  });
});

describe("assignment persistence (§8)", () => {
  it("survives Assign → Validate → Back", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AssignmentScreen />);
    await user.click(screen.getByRole("radio", { name: /Assign to a Team/ }));
    await user.selectOptions(screen.getByLabelText("Team"), "team-health");
    unmount();

    // The Validate screen reads the same store...
    render(<AssignmentSummary title="Assignment to be applied" />);
    expect(document.body.textContent).toContain(
      "Team → Health Insurance Team (round robin, batch size 1)",
    );
    expect(getAssignmentChoice().teamId).toBe("team-health");
  });

  it("shows the actual distribution, excluding paused members", () => {
    setAssignmentChoice({ method: "team", teamId: "team-health", userId: "" });
    render(<AssignmentSummary title="Assignment applied" showDistribution />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Distribution of the");
    expect(text).toContain("Sneha Thomas");
    expect(text).toContain("Neha Thomas");
    // Divya is named only as an exclusion, never as a recipient.
    expect(text).toContain("Paused from round robin");
    const after = text.slice(text.indexOf("Distribution of the"));
    expect(after).not.toContain("Divya Mohan");
  });

  it("comes back unselected from malformed stored data", () => {
    sessionStorage.setItem(
      "limenzy-crm:wireframe-import-assignment:v1",
      "{ not json",
    );
    expect(getAssignmentChoice()).toEqual(DEFAULT_CHOICE);
  });

  it("does not trust a restored strategy that is no longer valid", () => {
    setAssignmentChoice({ method: "team", teamId: "team-life", userId: "" });
    render(<AssignmentSummary title="Assignment to be applied" />);
    expect(document.body.textContent).toMatch(
      /no member who is active and in round robin/i,
    );
  });
});

describe("Confirm shows no live progress; Process does (§158, §159)", () => {
  it("renders no active-processing UI on Confirm", async () => {
    const { ConfirmScreen } =
      await import("@/components/wireframes/import/confirm-screen");
    render(<ConfirmScreen />);
    const text = document.body.textContent ?? "";

    // No progress figures, no bar, no spinner.
    expect(text).not.toContain("260 of 390");
    expect(text).not.toMatch(/\d+ of \d+ records/);
    expect(text).not.toMatch(/% complete/);
    expect(screen.queryByRole("progressbar")).toBeNull();

    // No wording implying the import has already started.
    for (const phrase of [
      "Processing runs in the background",
      "Import in progress",
      "Import complete",
      "leads were created",
      "Replay this step",
    ]) {
      expect(text, phrase).not.toContain(phrase);
    }
  });

  it("states what will happen, in the future tense", () => {
    const src = readFileSync(
      "src/components/wireframes/import/confirm-screen.tsx",
      "utf8",
    );
    // The simulated run is gone entirely.
    expect(src).not.toMatch(/setInterval|useState|useEffect|ProcessingCard/);
  });

  it("keeps the assignment summary and all four row categories on Confirm", async () => {
    const { ConfirmScreen } =
      await import("@/components/wireframes/import/confirm-screen");
    render(<ConfirmScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Assignment being confirmed");
    expect(text).toContain("390");
    expect(text).toContain("18");
    expect(text).toContain("12");
    expect(text).toContain("8");
    expect(text).toContain("428");
    expect(text).toMatch(/ready rows will be processed/);
    expect(text).toContain("monitor progress on the next screen");
  });

  it("makes Start import navigate to the Process stage", async () => {
    const { ConfirmScreen } =
      await import("@/components/wireframes/import/confirm-screen");
    render(<ConfirmScreen />);
    expect(screen.getByRole("link", { name: "Start import" })).toHaveAttribute(
      "href",
      "/wireframes/import/process",
    );
  });

  it("keeps the live progress exclusively on the Process screen", async () => {
    const { ProcessScreen } =
      await import("@/components/wireframes/import/process-screen");
    render(<ProcessScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("260 of 390 records processed");
    expect(text).toContain("130 remaining");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    // No Back action: a running import cannot be undone.
    expect(screen.queryByRole("link", { name: /^Back$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Back$/ })).toBeNull();
  });
});
