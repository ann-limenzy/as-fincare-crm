import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SalesTeamsScreen } from "@/components/wireframes/admin/sales-teams-screen";
import { MyTeamMobileScreen } from "@/components/wireframes/teams/my-team-mobile";
import { UsersScreen } from "@/components/wireframes/admin/users-screen";
import { SETTINGS_USERS, isOperationalRole } from "@/lib/wireframes/mock-data";
import { PAUSE_ACTION, RESUME_ACTION } from "@/lib/wireframes/sales-teams";
import {
  SALES_TEAMS,
  managerOf,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";

/**
 * Batch 1A, rendered (spec §2.1–2.5).
 *
 * These read the DOM the client would see, so a screen that still prints a
 * retired role or hides a team's Manager fails here even when the data is
 * already correct.
 */

const STALE = [
  "Owner/Admin",
  "Staff/Sales",
  "Sales Executive",
  "Sales Team",
  "Paused (proposed)",
  "Paused from Lead assignment",
];

describe("Users screen", () => {
  it("shows every user with one of the four fixed roles", () => {
    render(<UsersScreen />);
    const table = screen
      .getByRole("columnheader", { name: "Role" })
      .closest("table")!;
    for (const user of SETTINGS_USERS) {
      const row = within(table).getByText(user.name).closest("tr")!;
      expect(within(row).getByText(user.role), user.name).toBeInTheDocument();
    }
  });

  it("names the reporting Manager beside every team member", () => {
    render(<UsersScreen />);
    const table = screen
      .getByRole("columnheader", { name: "Role" })
      .closest("table")!;
    for (const team of SALES_TEAMS) {
      const manager = managerOf(team);
      for (const m of team.memberships.filter((x) => x.status === "Active")) {
        const user = userById(m.userId);
        const row = within(table).getByText(user.name).closest("tr")!;
        expect(row.textContent, user.name).toContain(
          `Reports to ${manager.name}`,
        );
      }
    }
  });

  it("marks a supervisor as belonging to no team", () => {
    render(<UsersScreen />);
    const table = screen
      .getByRole("columnheader", { name: "Role" })
      .closest("table")!;
    for (const user of SETTINGS_USERS.filter(
      (u) => !isOperationalRole(u.role),
    )) {
      const row = within(table).getByText(user.name).closest("tr")!;
      expect(row.textContent, user.name).toContain(
        "Supervisory — not a team member",
      );
    }
  });

  it("prints the column header Team, never Sales Team", () => {
    render(<UsersScreen />);
    expect(
      screen.getByRole("columnheader", { name: "Team" }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Sales Team");
  });

  it("shows no retired role label", () => {
    render(<UsersScreen />);
    for (const s of STALE)
      expect(document.body.textContent, s).not.toContain(s);
  });
});

describe("Teams screen", () => {
  it("shows each team's single Team Lead and its reporting Manager", () => {
    render(<SalesTeamsScreen />);
    const table = screen
      .getByRole("columnheader", { name: "Reports to" })
      .closest("table")!;
    for (const team of SALES_TEAMS) {
      const row = within(table).getByText(team.name).closest("tr")!;
      const lead = userById(teamLeadOf(team)!.userId);
      expect(row.textContent, team.name).toContain(lead.name);
      expect(row.textContent, team.name).toContain(managerOf(team).name);
      expect(row.textContent, team.name).toContain("Manager");
    }
  });

  it("labels the paused column without any 'proposed' hedge", () => {
    render(<SalesTeamsScreen />);
    expect(
      screen.getByRole("columnheader", { name: "Paused" }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/proposed|pending/i);
  });

  it("counts the paused Salesperson out of the Health round robin", () => {
    render(<SalesTeamsScreen />);
    const table = screen
      .getByRole("columnheader", { name: "Reports to" })
      .closest("table")!;
    const row = within(table).getByText("Health Insurance Team").closest("tr")!;
    const cells = [...row.querySelectorAll("td")].map((c) => c.textContent);
    // Active members, in round robin, paused -> 3, 2, 1
    expect(cells).toEqual(expect.arrayContaining(["3", "2", "1"]));
  });

  it("shows no retired role label and no Sales Team wording", () => {
    render(<SalesTeamsScreen />);
    for (const s of STALE)
      expect(document.body.textContent, s).not.toContain(s);
  });
});

describe("pause from round robin, rendered (§189.1)", () => {
  const PENDING = /proposed|pending confirmation|Paused from Lead assignment/i;

  it("uses the approved wording and no pending hedge on the Teams screen", () => {
    render(<SalesTeamsScreen />);
    expect(document.body.textContent).not.toMatch(PENDING);
    expect(document.body.textContent).not.toMatch(/\bPause user\b/);
  });

  it("shows the paused Salesperson's state on the Users screen", () => {
    render(<UsersScreen />);
    const table = screen
      .getByRole("columnheader", { name: "Role" })
      .closest("table")!;
    const row = within(table).getByText("Divya Mohan").closest("tr")!;
    expect(row.textContent).toContain("Paused");
    // Her account is still active and she is still in her team.
    expect(row.textContent).toContain("Active");
    expect(row.textContent).toContain("Health Insurance Team");
    expect(document.body.textContent).not.toMatch(PENDING);
  });

  it("marks everyone else as in the round robin", () => {
    render(<UsersScreen />);
    const table = screen
      .getByRole("columnheader", { name: "Role" })
      .closest("table")!;
    for (const name of ["Sneha Thomas", "Neha Thomas", "Ajay Varma"]) {
      const row = within(table).getByText(name).closest("tr")!;
      expect(row.textContent, name).toContain("In round robin");
    }
  });

  it("offers a Team Lead the pause control for their Salespersons only", () => {
    render(<MyTeamMobileScreen />);
    // Divya and Neha are Salespersons in Sneha's team: both actionable.
    expect(
      screen.getByRole("button", {
        name: `${RESUME_ACTION}: Divya Mohan`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `${PAUSE_ACTION}: Neha Thomas` }),
    ).toBeInTheDocument();
    // Sneha cannot pause herself; the screen explains who can.
    expect(
      screen.queryByRole("button", {
        name: new RegExp(`(${PAUSE_ACTION}|${RESUME_ACTION}): Sneha Thomas`),
      }),
    ).toBeNull();
    expect(document.body.textContent).toContain(
      "Only your reporting Manager or an Admin",
    );
  });

  it("states the confirmed effect of a pause, not a proposal", () => {
    render(<MyTeamMobileScreen />);
    expect(document.body.textContent).toContain(
      "skipped by automatic Lead assignment",
    );
    expect(document.body.textContent).toContain("manual assignment");
    expect(document.body.textContent).not.toMatch(PENDING);
  });
});
