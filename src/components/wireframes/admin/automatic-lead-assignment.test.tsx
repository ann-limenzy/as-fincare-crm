import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AutomaticLeadAssignmentScreen } from "@/components/wireframes/admin/lead-assignment-rules-screen";
import { SalesTeamDetailScreen } from "@/components/wireframes/admin/sales-team-detail-screen";
import { SettingsHubScreen } from "@/components/wireframes/admin/settings-hub-screen";
import {
  SALES_TEAMS,
  configFor,
  managerOf,
  rotationPool,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";

/**
 * Batch 2A, rendered: one automatic configuration per team (§189.1).
 *
 * The screens must offer no way to create a second configuration and must
 * carry none of the retired multi-rule language.
 */

const STALE_MULTI_RULE = [
  "Lead Assignment Rules",
  "Assignment rules",
  "Add Rule",
  "Add another",
  "Create rule",
  "Create Lead assignment rule",
  "Rule name",
  "Target Team — exactly one",
  "Active rules",
  "CRM assignment rules",
  "Walk-in Lead Assignment",
  "Routing condition",
];

const STALE_ROLE = [
  "Sales Team",
  "Owner/Admin",
  "Staff/Sales",
  "Sales Executive",
];

describe("Automatic Lead Assignment screen", () => {
  it("renders exactly one configuration card per team", () => {
    render(<AutomaticLeadAssignmentScreen />);
    for (const team of SALES_TEAMS) {
      const cards = screen.getAllByRole("article", { name: team.name });
      expect(cards, team.name).toHaveLength(1);
    }
    expect(screen.getAllByRole("article")).toHaveLength(SALES_TEAMS.length);
  });

  it("offers no control that could create a second configuration", () => {
    render(<AutomaticLeadAssignmentScreen />);
    for (const name of [
      /add rule/i,
      /create rule/i,
      /add another/i,
      /new rule/i,
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
      expect(screen.queryByRole("link", { name })).toBeNull();
    }
  });

  it("shows each team's single batch size, pool and paused members", () => {
    render(<AutomaticLeadAssignmentScreen />);
    for (const team of SALES_TEAMS) {
      const card = screen.getByRole("article", { name: team.name });
      const text = card.textContent ?? "";
      expect(text, team.name).toContain(String(configFor(team.id).batchSize));
      expect(text, team.name).toContain("Round-robin batch size");
      expect(text, team.name).toContain("In round robin");
      expect(text, team.name).toContain("Paused from round robin");
      const lead = teamLeadOf(team);
      if (lead) expect(text).toContain(userById(lead.userId).name);
      expect(text).toContain(managerOf(team).name);
    }
  });

  it("names the Health pool as Sneha then Neha, without Divya", () => {
    render(<AutomaticLeadAssignmentScreen />);
    const card = screen.getByRole("article", {
      name: "Health Insurance Team",
    });
    const pool = within(card).getByText("In round robin").parentElement!;
    expect(pool.textContent).toContain("Sneha Thomas");
    expect(pool.textContent).toContain("Neha Thomas");
    expect(pool.textContent).not.toContain("Divya Mohan");
    // Divya is still named on the card, as paused rather than removed.
    expect(card.textContent).toContain("Divya Mohan");
  });

  it("shows the empty-pool fail-safe for Life & Investments", () => {
    render(<AutomaticLeadAssignmentScreen />);
    const card = screen.getByRole("article", {
      name: "Life & Investments Team",
    });
    expect(rotationPool(SALES_TEAMS[2]!)).toEqual([]);
    expect(card.textContent).toContain("No eligible members");
    expect(card.textContent).toContain("automatic assignment waits");
    expect(card.textContent).toMatch(
      /falls back to another team, an Admin or a Manager/i,
    );
  });

  it("carries no retired multi-rule or role wording", () => {
    render(<AutomaticLeadAssignmentScreen />);
    const text = document.body.textContent ?? "";
    for (const s of [...STALE_MULTI_RULE, ...STALE_ROLE]) {
      expect(text, s).not.toContain(s);
    }
  });
});

describe("Settings hub", () => {
  it("links Automatic Lead Assignment without counting rules", () => {
    render(<SettingsHubScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Automatic Lead Assignment");
    expect(text).toContain("one configuration each");
    for (const s of STALE_MULTI_RULE) expect(text, s).not.toContain(s);
  });
});

describe("Team detail", () => {
  it("shows one configuration, not a list of rules targeting the team", () => {
    render(<SalesTeamDetailScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Automatic Lead Assignment");
    expect(text).toContain("one configuration for this team");
    expect(text).toMatch(/no second\s+configuration/i);
    for (const s of STALE_MULTI_RULE) expect(text, s).not.toContain(s);
  });
});
