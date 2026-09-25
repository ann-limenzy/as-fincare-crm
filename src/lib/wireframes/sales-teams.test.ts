import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FLOWS } from "@/lib/wireframes/flows";
import {
  SALES_PERSONA,
  SETTINGS_USERS,
  TEAM,
  isOperationalRole,
} from "@/lib/wireframes/mock-data";
import {
  ROUND_ROBIN_LABEL,
  LEAD_ASSIGNMENT_RULES,
  SALES_TEAMS,
  USER,
  activationCheck,
  activeMemberships,
  activeTeamOf,
  addCandidates,
  manualAssignmentPool,
  roundRobinStateOf,
  managerOf,
  previewAssignments,
  rotationPool,
  ruleWarning,
  teamById,
  teamBySlug,
  teamLeadOf,
  teamWarning,
  userById,
} from "@/lib/wireframes/sales-teams";

/**
 * The Teams wireframes present rules from spec §163 as fact, so the
 * sample data must obey those rules. These tests are the audit.
 */

/** Source without comment lines — comments may quote forbidden wording. */
function codeOnly(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
}

const health = teamBySlug("health-insurance");
const motor = teamBySlug("motor-insurance");
const life = teamBySlug("life-investments");

describe("Team membership (§163.2, §163.3)", () => {
  it("never gives a user two active team memberships", () => {
    const seen = new Map<string, string>();
    for (const team of SALES_TEAMS) {
      for (const m of activeMemberships(team)) {
        expect(seen.get(m.userId), `${m.userId} in two teams`).toBeUndefined();
        seen.set(m.userId, team.id);
      }
    }
  });

  it("gives every active team exactly one active Team Lead who is an active member", () => {
    for (const team of SALES_TEAMS.filter((t) => t.status === "Active")) {
      const leads = activeMemberships(team).filter((m) => m.teamLead);
      expect(leads, team.name).toHaveLength(1);
      expect(userById(leads[0]!.userId).status).toBe("Active");
    }
  });

  it("lets only active users hold active Team memberships; ended memberships remain in history", () => {
    for (const team of SALES_TEAMS) {
      for (const m of activeMemberships(team)) {
        expect(userById(m.userId).status, m.userId).toBe("Active");
      }
    }
  });

  it("keeps Joseph Kurian's ended membership as history without making Joseph eligible", () => {
    const joseph = health.memberships.find((m) => m.userId === USER.joseph);
    expect(joseph?.status).toBe("Ended");
    expect(joseph?.ended).toBe("14 Aug 2026");
    expect(userById(USER.joseph).status).toBe("Deactivated");
    expect(activeTeamOf(USER.joseph)).toBeUndefined();
    expect(Object.keys(roundRobinStateOf(health))).not.toContain(USER.joseph);
    expect(rotationPool(health)).not.toContain(USER.joseph);
  });

  it("gives inactive and invited users no active membership anywhere", () => {
    for (const user of SETTINGS_USERS.filter((u) => u.status !== "Active")) {
      expect(activeTeamOf(user.id), user.name).toBeUndefined();
      for (const team of SALES_TEAMS) {
        expect(
          activeMemberships(team).map((m) => m.userId),
          user.name,
        ).not.toContain(user.id);
      }
    }
  });

  it("makes Sneha the Team Lead of her team, by role and by membership", () => {
    expect(SALES_PERSONA.name).toBe("Sneha Thomas");
    expect(SALES_PERSONA.role).toBe("Team Lead");
    expect(userById(USER.sneha).role).toBe("Team Lead");
    expect(teamLeadOf(health)?.userId).toBe(USER.sneha);
  });

  it("makes Team Lead one of the four fixed roles, not a label beside one", () => {
    expect(userById(USER.sneha).role).toBe("Team Lead");
    expect(userById(USER.ajay).role).toBe("Team Lead");
    expect(userById(USER.nisha).role).toBe("Team Lead");
    // The Manager supervises Motor without leading or joining it (§2.4).
    expect(userById(USER.vikram).role).toBe("Manager");
    expect(teamLeadOf(motor)?.userId).toBe(USER.ajay);
    expect(activeTeamOf(USER.vikram)).toBeUndefined();
  });

  it("gives every team exactly one Team Lead, who holds the Team Lead role", () => {
    for (const team of SALES_TEAMS.filter((t) => t.status === "Active")) {
      const leads = activeMemberships(team).filter((m) => m.teamLead);
      expect(leads, team.name).toHaveLength(1);
      expect(userById(leads[0]!.userId).role, team.name).toBe("Team Lead");
    }
  });

  it("gives each team a reporting Manager who is not a member of it", () => {
    for (const team of SALES_TEAMS) {
      const manager = managerOf(team);
      expect(manager.role, team.name).toBe("Manager");
      expect(
        activeMemberships(team).map((m) => m.userId),
        team.name,
      ).not.toContain(manager.id);
    }
  });

  it("offers only active OPERATIONAL users as assignees", () => {
    const expected = SETTINGS_USERS.filter(
      (u) => u.status === "Active" && isOperationalRole(u.role),
    ).map((u) => u.name);
    expect(TEAM.map((t) => t.name).sort()).toEqual([...expected].sort());
    expect(TEAM.map((t) => t.name)).not.toContain("Arun Menon");
    expect(TEAM.map((t) => t.name)).not.toContain("Vikram Shah");
  });
});

describe("team activation (§163.1–163.3)", () => {
  const members = activeMemberships(health);

  it("allows the Health Insurance Team as it stands", () => {
    expect(activationCheck(health.id, members).blockers).toEqual([]);
  });

  it("refuses activation without exactly one active Team Lead", () => {
    const none = members.map((m) => ({ ...m, teamLead: false }));
    expect(activationCheck(health.id, none).blockers[0]).toMatch(
      /exactly one active Team Lead.*has 0/,
    );
    const two = members.map((m) => ({
      ...m,
      teamLead: m.userId !== USER.divya,
    }));
    expect(activationCheck(health.id, two).blockers[0]).toMatch(/has 2/);
  });

  it("refuses a Team Lead or member who is not an active user", () => {
    const withJoseph = [
      ...members.map((m) => ({ ...m, teamLead: false })),
      { ...members[0]!, userId: USER.joseph, teamLead: true },
    ];
    expect(activationCheck(health.id, withJoseph).blockers.join()).toMatch(
      /Joseph Kurian is not an active user and cannot remain Team Lead/,
    );
  });

  it("refuses a member who already has another active team", () => {
    const withAjay = [...members, { ...members[2]!, userId: USER.ajay }];
    expect(activationCheck(health.id, withAjay).blockers).toEqual([
      "Ajay Varma already has an active membership of Motor Insurance Team.",
    ]);
  });

  it("counts no paused member as eligible (§189.1)", () => {
    const allPaused = members.map((m) => ({
      ...m,
      pausedFromRoundRobin: true,
    }));
    const check = activationCheck(health.id, allPaused);
    // Zero eligible does not block activation; it is reported instead.
    expect(check.blockers).toEqual([]);
    expect(check.eligibleCount).toBe(0);
    expect(activationCheck(health.id, members).eligibleCount).toBeGreaterThan(
      0,
    );
  });

  it("refuses a Team Lead who does not hold the Team Lead role", () => {
    const divyaLeads = members.map((m) => ({
      ...m,
      teamLead: m.userId === USER.divya,
    }));
    expect(activationCheck(health.id, divyaLeads).blockers.join()).toMatch(
      /Divya Mohan is a Salesperson\. Only a user with the Team Lead role/,
    );
  });

  it("never selects a Team Lead or changes a pause state", () => {
    const before = JSON.stringify(members);
    activationCheck(health.id, members);
    expect(JSON.stringify(members)).toBe(before);
  });
});

describe("rotation pool (§189.1)", () => {
  /** A team whose only member is a supervisor — impossible via the UI. */
  const supervisorOnly = {
    ...health,
    memberships: [{ ...activeMemberships(health)[0]!, userId: USER.vikram }],
    rotationOrder: [USER.vikram],
  };

  it("empties a one-member team's pool when that member is paused", () => {
    expect(life.status).toBe("Active");
    expect(teamLeadOf(life)?.userId).toBe(USER.nisha);
    expect(
      activeMemberships(life).find((m) => m.userId === USER.nisha)
        ?.pausedFromRoundRobin,
    ).toBe(true);
    expect(rotationPool(life)).toEqual([]);
    // The fail-safe: Leads wait rather than spilling anywhere.
    expect(life.assignmentRequired).toBeGreaterThan(0);
    expect(teamWarning(life)).toBe("No eligible members");
  });

  it("excludes a Manager from the pool even as the team's only member", () => {
    expect(rotationPool(supervisorOnly)).toEqual([]);
    expect(teamWarning(supervisorOnly)).toBe("No eligible members");
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

  it("stops the pool of an inactive team", () => {
    expect(rotationPool({ ...health, status: "Inactive" })).toEqual([]);
    expect(teamWarning({ ...health, status: "Inactive" })).toBe(
      "Team is inactive",
    );
  });

  it("includes the Team Lead on the same basis as a Salesperson", () => {
    expect(rotationPool(health)).toContain(USER.sneha);
    expect(rotationPool(motor)).toContain(USER.ajay);
  });

  it("excludes a paused member from the automatic pool (§189.1)", () => {
    expect(
      activeMemberships(health).find((m) => m.userId === USER.divya)
        ?.pausedFromRoundRobin,
    ).toBe(true);
    expect(rotationPool(health)).not.toContain(USER.divya);
    expect(rotationPool(health)).toEqual([USER.sneha, USER.neha]);
  });

  it("keeps a paused member active, in their team, and manually assignable", () => {
    expect(userById(USER.divya).status).toBe("Active");
    expect(activeTeamOf(USER.divya)?.id).toBe(health.id);
    expect(manualAssignmentPool(health)).toContain(USER.divya);
  });

  it("draws only on the team's own members", () => {
    for (const team of SALES_TEAMS) {
      const members = activeMemberships(team).map((m) => m.userId);
      for (const id of rotationPool(team)) expect(members).toContain(id);
    }
  });

  it("previews the next Leads from the stored position, inside the team", () => {
    const rule = LEAD_ASSIGNMENT_RULES.find((r) => r.teamId === health.id)!;
    expect(rule.lastAssignedUserId).toBe(USER.neha);
    expect(
      previewAssignments(
        health.rotationOrder,
        rotationPool(health),
        rule.lastAssignedUserId,
        4,
      ),
    ).toEqual([USER.sneha, USER.neha, USER.sneha, USER.neha]);
  });

  it("walks the team's own order and never leaves the team", () => {
    const members = activeMemberships(motor).map((m) => m.userId);
    const preview = previewAssignments(
      motor.rotationOrder,
      rotationPool(motor),
      null,
      6,
    );
    expect(preview).toHaveLength(6);
    for (const id of preview) expect(members).toContain(id);
  });

  it("assigns nobody — no fallback — when the pool is empty", () => {
    expect(previewAssignments(health.rotationOrder, [], USER.neha, 4)).toEqual(
      [],
    );
  });
});

describe("Lead assignment rules (§163.7)", () => {
  it("targets exactly one existing team with round robin and a positive whole Batch Size", () => {
    for (const rule of LEAD_ASSIGNMENT_RULES) {
      expect(() => teamById(rule.teamId)).not.toThrow();
      expect(rule.method).toBe("Round Robin");
      expect(Number.isInteger(rule.batchSize)).toBe(true);
      expect(rule.batchSize).toBeGreaterThanOrEqual(1);
    }
  });

  it("asserts no default Batch Size — §212 leaves it open", () => {
    // Illustrative per-team values only. Nothing here claims a V1 default.
    const sizes = LEAD_ASSIGNMENT_RULES.map((r) => r.batchSize);
    expect(new Set(sizes).size).toBeGreaterThan(1);
    expect(
      readFileSync("src/lib/wireframes/sales-teams.ts", "utf8"),
    ).not.toMatch(/V1 default is 1/);
  });

  it("warns only where the pause leaves a team with no eligible member", () => {
    expect(teamWarning(health)).toBeNull();
    expect(teamWarning(motor)).toBeNull();
    // Life's only member is paused, so its active rule warns too.
    expect(teamWarning(life)).toBe("No eligible members");
    const lifeRule = LEAD_ASSIGNMENT_RULES.find((r) => r.teamId === life.id)!;
    expect(ruleWarning(lifeRule)).toBe("No eligible members");
    for (const rule of LEAD_ASSIGNMENT_RULES.filter(
      (r) => r.status === "Active" && r.teamId !== life.id,
    )) {
      expect(ruleWarning(rule), rule.name).toBeNull();
    }
  });

  it("never warns about an inactive rule", () => {
    for (const rule of LEAD_ASSIGNMENT_RULES.filter(
      (r) => r.status === "Inactive",
    )) {
      expect(ruleWarning(rule)).toBeNull();
    }
  });
});

describe("adding members (§163.2, §163.12)", () => {
  const candidates = addCandidates(health.id);
  const reason = (id: string) =>
    candidates.find((c) => c.user.id === id)?.blocked;

  it("refuses invited, deactivated and already-assigned users", () => {
    expect(reason(USER.fathima)).toMatch(/not yet accepted/);
    expect(reason(USER.joseph)).toMatch(/Deactivated/);
    expect(reason(USER.ajay)).toMatch(/Already in Motor Insurance Team/);
    expect(reason(USER.kavya)).toMatch(/Already in Motor Insurance Team/);
  });

  it("never offers a supervisor as a team member", () => {
    expect(reason(USER.arun)).toMatch(/Admin is a supervisory role/);
    expect(reason(USER.vikram)).toMatch(/Manager is a supervisory role/);
  });

  it("does not offer the team's own members", () => {
    expect(candidates.map((c) => c.user.id)).not.toContain(USER.sneha);
  });
});

describe("wording (§163.5)", () => {
  it("uses the two approved round-robin labels", () => {
    expect(ROUND_ROBIN_LABEL).toEqual({
      "In round robin": "In automatic round robin",
      "Paused from round robin": "Paused from round robin",
    });
  });

  it("never labels round-robin state as Available", () => {
    for (const file of [
      "src/components/wireframes/admin/sales-teams-screen.tsx",
      "src/components/wireframes/admin/sales-team-detail-screen.tsx",
      "src/components/wireframes/admin/lead-assignment-rules-screen.tsx",
      "src/components/wireframes/admin/lead-assignment-rule-screen.tsx",
      "src/components/wireframes/teams/my-team-mobile.tsx",
      "src/components/wireframes/teams/team-parts.tsx",
    ]) {
      expect(codeOnly(readFileSync(file, "utf8")), file).not.toMatch(
        /\bAvailable\b/,
      );
    }
  });
});

describe("flow registry", () => {
  it("registers the five Team screens as one flow", () => {
    const flow = FLOWS.find((f) => f.id === "sales-teams");
    expect(flow?.name).toBe("Teams and Lead Assignment");
    expect(flow?.steps.map((s) => s.href)).toEqual([
      "/wireframes/admin/teams",
      "/wireframes/admin/teams/health-insurance",
      "/wireframes/admin/lead-assignment",
      "/wireframes/admin/lead-assignment/health-insurance",
      "/wireframes/teams/my-team",
    ]);
  });
});
