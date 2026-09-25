import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { FLOWS } from "@/lib/wireframes/flows";
import {
  CONVERSATIONS,
  CUSTOMER_RECORD,
  CUSTOMER_UPCOMING,
  DIRECTORY_CUSTOMERS,
  LEAD_RECORD,
  MOBILE_FOLLOW_UPS,
  OPERATIONAL_ROLES,
  SALES_LEADS,
  SETTINGS_USERS,
  TEAM,
  TEAM_WORKLOAD,
  TODAY_FOLLOW_UPS,
  isOperationalRole,
  type AppRole,
} from "@/lib/wireframes/mock-data";
import {
  SALES_TEAMS,
  USER,
  activeMemberships,
  activeTeamOf,
  hypotheticalPool,
  managerOf,
  manualAssignmentPool,
  mayReceiveAutomaticLeads,
  mayReceiveManualAssignment,
  mayTogglePause,
  previewRotation,
  rotationPool,
  teamBySlug,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";

/**
 * Batch 1A — the fixed role model, the reporting hierarchy and operational
 * ownership (spec §2.1–2.5, §189.1).
 *
 * These assertions read the structured mock data rather than source text, so
 * they fail on a wrong value, not on a wrong comment.
 */

const ROLES: readonly AppRole[] = [
  "Admin",
  "Manager",
  "Team Lead",
  "Salesperson",
];

/** Every name that appears anywhere as an owner or an operational assignee. */
function operationalSeats(): readonly { where: string; who: string }[] {
  const seats: { where: string; who: string }[] = [];
  for (const c of CONVERSATIONS) {
    if (c.assignedTo)
      seats.push({ where: `conversation ${c.id}`, who: c.assignedTo });
  }
  for (const f of TODAY_FOLLOW_UPS) {
    seats.push({ where: `follow-up ${f.id}`, who: f.assignedTo });
  }
  for (const f of MOBILE_FOLLOW_UPS) {
    seats.push({ where: `mobile follow-up ${f.id}`, who: f.assignedTo });
  }
  for (const u of CUSTOMER_UPCOMING) {
    seats.push({ where: `upcoming ${u.id}`, who: u.assignedTo });
  }
  for (const d of DIRECTORY_CUSTOMERS) {
    seats.push({ where: `customer ${d.id}`, who: d.owner });
  }
  for (const r of SALES_LEADS) {
    seats.push({ where: `permitted record ${r.id}`, who: r.owner });
  }
  seats.push({ where: "CUSTOMER_RECORD", who: CUSTOMER_RECORD.owner });
  seats.push({ where: "LEAD_RECORD", who: LEAD_RECORD.owner });
  return seats;
}

describe("the four fixed roles (§2.1)", () => {
  it("uses exactly Admin, Manager, Team Lead and Salesperson", () => {
    expect([...new Set(SETTINGS_USERS.map((u) => u.role))].sort()).toEqual(
      [...ROLES].sort(),
    );
    expect([...OPERATIONAL_ROLES].sort()).toEqual(["Salesperson", "Team Lead"]);
    expect(isOperationalRole("Admin")).toBe(false);
    expect(isOperationalRole("Manager")).toBe(false);
    expect(isOperationalRole("Team Lead")).toBe(true);
    expect(isOperationalRole("Salesperson")).toBe(true);
  });

  it("lets no old application role survive in structured mock data", () => {
    const stale = [
      "Owner",
      "Staff",
      "Staff/Sales",
      "Owner/Admin",
      "Sales Executive",
    ];
    for (const user of SETTINGS_USERS) {
      expect(stale, user.name).not.toContain(user.role);
      expect(ROLES, user.name).toContain(user.role);
    }
    for (const member of TEAM) {
      expect(stale, member.name).not.toContain(member.role);
      expect(ROLES, member.name).toContain(member.role);
    }
  });

  it("offers no configurable role control in the Users screen", () => {
    const source = readFileSync(
      "src/components/wireframes/admin/users-screen.tsx",
      "utf8",
    );
    expect(source).not.toMatch(/custom role|permission editor|role builder/i);
  });
});

describe("the reporting hierarchy (§2.2)", () => {
  it("gives every team exactly one Team Lead holding the Team Lead role", () => {
    for (const team of SALES_TEAMS) {
      const leads = activeMemberships(team).filter((m) => m.teamLead);
      expect(leads, team.name).toHaveLength(1);
      expect(userById(leads[0]!.userId).role, team.name).toBe("Team Lead");
    }
  });

  it("gives every Team Lead exactly one team and exactly one Manager", () => {
    const leadRoleUsers = SETTINGS_USERS.filter(
      (u) => u.role === "Team Lead" && u.status === "Active",
    );
    for (const user of leadRoleUsers) {
      const led = SALES_TEAMS.filter((t) => teamLeadOf(t)?.userId === user.id);
      expect(led, user.name).toHaveLength(1);
      expect(managerOf(led[0]!).role, user.name).toBe("Manager");
    }
  });

  it("gives every active Salesperson exactly one team", () => {
    for (const user of SETTINGS_USERS.filter(
      (u) => u.role === "Salesperson" && u.status === "Active",
    )) {
      const teams = SALES_TEAMS.filter((t) =>
        activeMemberships(t).some((m) => m.userId === user.id),
      );
      expect(teams, user.name).toHaveLength(1);
    }
  });

  it("keeps Managers supervising teams without belonging to them", () => {
    for (const team of SALES_TEAMS) {
      const manager = managerOf(team);
      expect(manager.role, team.name).toBe("Manager");
      expect(
        activeMemberships(team).map((m) => m.userId),
        team.name,
      ).not.toContain(manager.id);
    }
    for (const user of SETTINGS_USERS.filter(
      (u) => !isOperationalRole(u.role),
    )) {
      expect(activeTeamOf(user.id), user.name).toBeUndefined();
    }
  });
});

describe("operational ownership (§2.5)", () => {
  const byName = new Map(SETTINGS_USERS.map((u) => [u.name, u]));

  it("resolves every owner and assignee to a Team Lead or Salesperson", () => {
    for (const seat of operationalSeats()) {
      const user = byName.get(seat.who);
      expect(user, `${seat.where}: unknown user ${seat.who}`).toBeDefined();
      expect(isOperationalRole(user!.role), `${seat.where} → ${seat.who}`).toBe(
        true,
      );
    }
  });

  it("gives no Admin or Manager any owned or assigned record", () => {
    const supervisors = SETTINGS_USERS.filter(
      (u) => !isOperationalRole(u.role),
    );
    expect(supervisors.map((u) => u.name).sort()).toEqual([
      "Arun Menon",
      "Vikram Shah",
    ]);
    const held = new Set(operationalSeats().map((s) => s.who));
    for (const s of supervisors) {
      expect(held, s.name).not.toContain(s.name);
      expect(s.assignedRecords, s.name).toBe(0);
      expect(
        TEAM_WORKLOAD.map((r) => r.user),
        s.name,
      ).not.toContain(s.name);
    }
  });

  it("never offers a supervisor in an assignee picker", () => {
    for (const member of TEAM)
      expect(isOperationalRole(member.role)).toBe(true);
  });
});

describe("automatic-assignment pools (§189.1)", () => {
  it("admits only the team's own active Team Lead and Salespersons", () => {
    for (const team of SALES_TEAMS) {
      const members = activeMemberships(team).map((m) => m.userId);
      for (const id of rotationPool(team)) {
        expect(members, `${id} outside ${team.name}`).toContain(id);
        const user = userById(id);
        expect(user.status, user.name).toBe("Active");
        expect(isOperationalRole(user.role), user.name).toBe(true);
      }
    }
  });

  it("puts no Admin or Manager in any pool", () => {
    const supervisors = SETTINGS_USERS.filter(
      (u) => !isOperationalRole(u.role),
    ).map((u) => u.id);
    for (const team of SALES_TEAMS) {
      for (const id of supervisors) {
        expect(rotationPool(team), `${id} in ${team.name}`).not.toContain(id);
      }
    }
  });

  it("keeps every pool inside one team", () => {
    const seen = new Map<string, string>();
    for (const team of SALES_TEAMS) {
      for (const id of rotationPool(team)) {
        expect(seen.get(id), `${id} pooled twice`).toBeUndefined();
        seen.set(id, team.id);
      }
    }
  });

  it("excludes every paused member from every automatic pool (§189.1)", () => {
    let paused = 0;
    for (const team of SALES_TEAMS) {
      for (const m of activeMemberships(team)) {
        if (!m.pausedFromRoundRobin) continue;
        paused += 1;
        expect(
          rotationPool(team),
          `${userById(m.userId).name} is paused but still pooled`,
        ).not.toContain(m.userId);
      }
    }
    // At least one paused member exists, so the assertion above has teeth.
    expect(paused).toBeGreaterThan(0);
  });
});

describe("pause from round robin (§189.1)", () => {
  const health = teamBySlug("health-insurance");
  const motor = teamBySlug("motor-insurance");
  const life = teamBySlug("life-investments");

  /* 1 — a paused person is still an active member of their team */
  it("keeps a paused Salesperson active and in their team", () => {
    const divya = userById(USER.divya);
    expect(divya.role).toBe("Salesperson");
    expect(divya.status).toBe("Active");
    expect(activeTeamOf(USER.divya)?.id).toBe(health.id);
    expect(
      activeMemberships(health).find((m) => m.userId === USER.divya)
        ?.pausedFromRoundRobin,
    ).toBe(true);
  });

  /* 2 + 13 — excluded from automatic, and the Health pool is exactly two */
  it("skips the paused Salesperson in the Health automatic pool", () => {
    expect(rotationPool(health)).toEqual([USER.sneha, USER.neha]);
    expect(rotationPool(health)).not.toContain(USER.divya);
  });

  /* 3 + 13 — still available for an authorized manual assignment */
  it("keeps the paused Salesperson available for manual assignment", () => {
    expect(manualAssignmentPool(health)).toContain(USER.divya);
    const membership = activeMemberships(health).find(
      (m) => m.userId === USER.divya,
    )!;
    expect(mayReceiveManualAssignment(membership)).toBe(true);
    expect(mayReceiveAutomaticLeads(membership)).toBe(false);
  });

  /* 4 + 5 — a paused Team Lead: out of automatic, in for direct */
  it("skips a paused Team Lead automatically but keeps them directly assignable", () => {
    const nisha = activeMemberships(life).find((m) => m.userId === USER.nisha)!;
    expect(nisha.teamLead).toBe(true);
    expect(nisha.pausedFromRoundRobin).toBe(true);
    expect(userById(USER.nisha).status).toBe("Active");
    expect(rotationPool(life)).not.toContain(USER.nisha);
    expect(manualAssignmentPool(life)).toContain(USER.nisha);
  });

  /* 6 — resuming restores future automatic eligibility */
  it("restores automatic eligibility when resumed", () => {
    const resumed = activeMemberships(health).map((m) =>
      m.userId === USER.divya ? { ...m, pausedFromRoundRobin: false } : m,
    );
    expect(hypotheticalPool(health, new Set())).toEqual([
      USER.sneha,
      USER.divya,
      USER.neha,
    ]);
    expect(
      resumed.filter(mayReceiveAutomaticLeads).map((m) => m.userId),
    ).toContain(USER.divya);
  });

  /* 7 — pausing changes no ownership or assigned work */
  it("leaves a paused person's records and workload untouched", () => {
    // Divya owns follow-ups in the mock; a pause must not move them.
    const owned = TODAY_FOLLOW_UPS.filter(
      (f) => f.assignedTo === userById(USER.divya).name,
    );
    expect(owned.length).toBeGreaterThan(0);
    expect(
      SETTINGS_USERS.find((u) => u.id === USER.divya)?.assignedRecords,
    ).toBeGreaterThan(0);
  });

  /* 8 + 9 — all paused: empty pool, and no fallback anywhere */
  it("produces an empty pool when every member is paused, with no fallback", () => {
    const everyone = new Set(activeMemberships(health).map((m) => m.userId));
    const pool = hypotheticalPool(health, everyone);
    expect(pool).toEqual([]);
    expect(previewRotation(pool, 1, 0, 4)).toEqual([]);
    // Nothing from another team, and no supervisor, may stand in.
    const outsiders = SETTINGS_USERS.filter(
      (u) => !activeMemberships(health).some((m) => m.userId === u.id),
    ).map((u) => u.id);
    for (const id of outsiders) expect(pool).not.toContain(id);
  });

  /* 10 — supervisors are never in an automatic pool, paused or not */
  it("never admits an Admin or Manager to an automatic pool", () => {
    const supervisors = SETTINGS_USERS.filter(
      (u) => !isOperationalRole(u.role),
    ).map((u) => u.id);
    for (const team of [health, motor, life]) {
      for (const id of supervisors) {
        expect(rotationPool(team)).not.toContain(id);
        expect(manualAssignmentPool(team)).not.toContain(id);
      }
    }
  });

  /* 11 — an inactive user is excluded from BOTH paths */
  it("excludes an inactive user from automatic and manual assignment alike", () => {
    expect(userById(USER.joseph).status).toBe("Deactivated");
    for (const team of SALES_TEAMS) {
      expect(rotationPool(team)).not.toContain(USER.joseph);
      expect(manualAssignmentPool(team)).not.toContain(USER.joseph);
    }
  });

  /* 14 — automatic and manual eligibility are genuinely separate */
  it("treats automatic and manual eligibility as separate concepts", () => {
    const divya = activeMemberships(health).find(
      (m) => m.userId === USER.divya,
    )!;
    expect(mayReceiveAutomaticLeads(divya)).toBe(false);
    expect(mayReceiveManualAssignment(divya)).toBe(true);
    // The two pools differ by exactly the paused member.
    const auto = new Set(rotationPool(health));
    const manual = new Set(manualAssignmentPool(health));
    expect([...manual].filter((id) => !auto.has(id))).toEqual([USER.divya]);
  });

  /* authority — §189.1 */
  it("lets a Team Lead pause a Salesperson in their own team only", () => {
    expect(mayTogglePause(USER.sneha, USER.divya)).toBe(true);
    expect(mayTogglePause(USER.sneha, USER.neha)).toBe(true);
    // not another team's Salesperson
    expect(mayTogglePause(USER.sneha, USER.kavya)).toBe(false);
    // and not the Team Lead themselves
    expect(mayTogglePause(USER.sneha, USER.sneha)).toBe(false);
  });

  it("lets only the reporting Manager or an Admin pause a Team Lead", () => {
    expect(mayTogglePause(USER.vikram, USER.sneha)).toBe(true);
    expect(mayTogglePause(USER.arun, USER.sneha)).toBe(true);
    expect(mayTogglePause(USER.arun, USER.nisha)).toBe(true);
  });

  it("never lets a Salesperson pause anyone, including themselves", () => {
    for (const target of [USER.divya, USER.neha, USER.sneha]) {
      expect(mayTogglePause(USER.divya, target)).toBe(false);
    }
  });
});

describe("generic UI wording (§6)", () => {
  const SCREENS = [
    "src/components/wireframes/admin/users-screen.tsx",
    "src/components/wireframes/admin/sales-teams-screen.tsx",
    "src/components/wireframes/admin/sales-team-detail-screen.tsx",
    "src/components/wireframes/admin/settings-hub-screen.tsx",
    "src/components/wireframes/teams/my-team-mobile.tsx",
    "src/components/wireframes/teams/team-parts.tsx",
    "src/components/wireframes/more/mobile-menu.tsx",
  ];

  it("says Team or Teams, never Sales Team", () => {
    for (const file of SCREENS) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/Sales Teams?\b/);
    }
  });

  it("shows no stale role label anywhere on screen", () => {
    for (const file of SCREENS) {
      const source = readFileSync(file, "utf8");
      for (const stale of ["Owner/Admin", "Staff/Sales", "Sales Executive"]) {
        expect(source, `${file} → ${stale}`).not.toContain(stale);
      }
    }
  });
});

describe("routes and flow sequence stay intact (§8.12)", () => {
  it("keeps every wireframe flow step pointing at a real route", () => {
    for (const flow of FLOWS) {
      for (const step of flow.steps) {
        const path = step.href.split(/[?#]/)[0]!;
        expect(
          readFileSync(`src/app${path}/page.tsx`, "utf8").length,
          step.href,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the five Team screens in their published order", () => {
    const flow = FLOWS.find((f) => f.id === "sales-teams");
    expect(flow?.steps.map((s) => s.href)).toEqual([
      "/wireframes/admin/teams",
      "/wireframes/admin/teams/health-insurance",
      "/wireframes/admin/lead-assignment",
      "/wireframes/admin/lead-assignment/health-insurance",
      "/wireframes/teams/my-team",
    ]);
  });
});
