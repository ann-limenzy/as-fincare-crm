import { describe, expect, it } from "vitest";

import {
  CONVERSATIONS,
  SETTINGS_USERS,
  isOperationalRole,
  type Conversation,
} from "@/lib/wireframes/mock-data";
import {
  SALES_TEAMS,
  USER,
  activeMemberships,
  activeTeamOf,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";
import {
  SALESPERSON_REASSIGNMENT_PENDING,
  assignConversation,
  assignmentTargetsFor,
  createLeadFromUnknownNumber,
  mayAssignConversation,
  mayReplyToConversation,
  maySeeUnassignedQueue,
  mayViewConversation,
  reassignmentTargetsFor,
  unassignedQueueFor,
  visibleConversationsFor,
} from "@/lib/wireframes/whatsapp-access";

/**
 * Batch 3A — WhatsApp visibility, unassigned conversations and assignment
 * (§89.1, §93, §93.1, §101).
 */

const admin = userById(USER.arun);
const manager = userById(USER.vikram);
const healthLead = userById(USER.sneha); // Team Lead, Health
const motorLead = userById(USER.ajay); // Team Lead, Motor
const salesperson = userById(USER.neha); // Salesperson, Health
const peer = userById(USER.divya); // Salesperson, Health (paused)

const unassigned = CONVERSATIONS.find((c) => c.assignedToUserId === null)!;
const assignedToHealth = CONVERSATIONS.find(
  (c) => c.assignedToUserId === USER.sneha,
)!;
const assignedToMotor = CONVERSATIONS.find(
  (c) => c.assignedToUserId === USER.ajay,
)!;

describe("visibility (§89.1)", () => {
  /* 1 */
  it("shows an Admin every assigned and unassigned conversation", () => {
    expect(visibleConversationsFor(admin)).toHaveLength(CONVERSATIONS.length);
    expect(unassignedQueueFor(admin)).toHaveLength(1);
  });

  /* 2 */
  it("shows a Manager the whole unassigned queue, and assigned work below them", () => {
    expect(maySeeUnassignedQueue(manager)).toBe(true);
    expect(unassignedQueueFor(manager)).toEqual(unassignedQueueFor(admin));
    for (const c of visibleConversationsFor(manager)) {
      if (c.assignedToUserId === null) continue;
      const team = activeTeamOf(c.assignedToUserId)!;
      expect(team.managerId, c.id).toBe(manager.id);
    }
  });

  /* 3 — cross-hierarchy loss of access */
  it("removes a Manager's access once a conversation sits under another Manager", () => {
    // A second Manager, constructed here because the mock has one real
    // Manager supervising every team. Their scope is empty, so they can
    // neither see nor act on a conversation in the first Manager's branch.
    const otherManager = { ...manager, id: "mgr-other", name: "Other Manager" };
    expect(maySeeUnassignedQueue(otherManager)).toBe(true);
    expect(mayViewConversation(otherManager, unassigned)).toBe(true);
    // ...but once it is assigned into a team they do not supervise:
    const afterAssignment = assignConversation(unassigned, USER.sneha);
    expect(mayViewConversation(otherManager, afterAssignment)).toBe(false);
    expect(mayReplyToConversation(otherManager, afterAssignment)).toBe(false);
    // The Manager who does supervise that team keeps access.
    expect(mayViewConversation(manager, afterAssignment)).toBe(true);
  });

  /* 4 */
  it("shows a Team Lead their own and their team's conversations", () => {
    const own = new Set(
      activeMemberships(activeTeamOf(healthLead.id)!).map((m) => m.userId),
    );
    for (const c of visibleConversationsFor(healthLead)) {
      expect(own, c.id).toContain(c.assignedToUserId);
    }
    expect(mayViewConversation(healthLead, assignedToHealth)).toBe(true);
    expect(mayViewConversation(healthLead, assignedToMotor)).toBe(false);
  });

  /* 5 */
  it("hides the unassigned queue from a Team Lead entirely", () => {
    expect(maySeeUnassignedQueue(healthLead)).toBe(false);
    expect(mayViewConversation(healthLead, unassigned)).toBe(false);
    expect(unassignedQueueFor(healthLead)).toEqual([]);
    // Not discoverable through the list data either.
    expect(visibleConversationsFor(healthLead)).not.toContain(unassigned);
  });

  /* 6 + 7 */
  it("shows a Salesperson only their own, never a peer's", () => {
    for (const c of visibleConversationsFor(salesperson)) {
      expect(c.assignedToUserId).toBe(salesperson.id);
    }
    expect(maySeeUnassignedQueue(salesperson)).toBe(false);
    expect(mayViewConversation(salesperson, assignedToHealth)).toBe(false);
    expect(mayViewConversation(peer, assignedToHealth)).toBe(false);
    // Same team, but peers cannot see one another.
    expect(activeTeamOf(peer.id)!.id).toBe(activeTeamOf(salesperson.id)!.id);
  });
});

describe("no reply while unassigned (§93.1)", () => {
  /* 8 */
  it("refuses a reply to every role, including Admin", () => {
    for (const user of SETTINGS_USERS) {
      expect(mayReplyToConversation(user, unassigned), user.name).toBe(false);
    }
    // Yet the supervisory roles can still read it.
    expect(mayViewConversation(admin, unassigned)).toBe(true);
    expect(mayViewConversation(manager, unassigned)).toBe(true);
  });

  it("restores reply access from the assigned state, not from who assigned it", () => {
    const assigned = assignConversation(unassigned, USER.sneha);
    expect(mayReplyToConversation(admin, assigned)).toBe(true);
    expect(mayReplyToConversation(healthLead, assigned)).toBe(true);
    expect(mayReplyToConversation(salesperson, assigned)).toBe(false);
    expect(mayReplyToConversation(motorLead, assigned)).toBe(false);
  });
});

describe("assignment targets (§93.1, §101)", () => {
  /* 10 */
  it("offers an Admin only active Team Leads", () => {
    const targets = assignmentTargetsFor(admin, unassigned);
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) {
      expect(t.role).toBe("Team Lead");
      expect(t.status).toBe("Active");
    }
  });

  /* 11 */
  it("offers a Manager only Team Leads reporting to that Manager", () => {
    for (const t of assignmentTargetsFor(manager, unassigned)) {
      const team = activeTeamOf(t.id)!;
      expect(team.managerId, t.name).toBe(manager.id);
    }
    // A Manager with no teams gets nobody, and cannot assign at all.
    const otherManager = { ...manager, id: "mgr-other" };
    expect(assignmentTargetsFor(otherManager, unassigned)).toEqual([]);
    const someLead = teamLeadOf(SALES_TEAMS[0]!)!.userId;
    expect(mayAssignConversation(otherManager, unassigned, someLead)).toBe(
      false,
    );
  });

  /* 12 */
  it("keeps a paused Team Lead directly selectable", () => {
    // Nisha leads Life & Investments and is paused from round robin.
    const nisha = userById(USER.nisha);
    const team = activeTeamOf(nisha.id)!;
    expect(
      activeMemberships(team).find((m) => m.userId === nisha.id)
        ?.pausedFromRoundRobin,
    ).toBe(true);
    expect(nisha.status).toBe("Active");
    expect(assignmentTargetsFor(admin, unassigned).map((t) => t.id)).toContain(
      nisha.id,
    );
  });

  /* 13 */
  it("excludes inactive and non-Team-Lead users", () => {
    const targets = assignmentTargetsFor(admin, unassigned);
    const ids = targets.map((t) => t.id);
    for (const u of SETTINGS_USERS) {
      if (u.status !== "Active" || u.role !== "Team Lead") {
        expect(ids, u.name).not.toContain(u.id);
      }
    }
    // No Salesperson, Admin or Manager is ever a target.
    expect(ids).not.toContain(USER.neha);
    expect(ids).not.toContain(admin.id);
    expect(ids).not.toContain(manager.id);
  });

  it("offers no targets to a Team Lead or Salesperson", () => {
    expect(assignmentTargetsFor(healthLead, unassigned)).toEqual([]);
    expect(assignmentTargetsFor(salesperson, unassigned)).toEqual([]);
  });
});

describe("unknown-number flow (§101)", () => {
  /* 14 + 15 + 16 + 17 */
  it("creates the Lead and assigns the conversation directly, with no rotation", () => {
    const out = createLeadFromUnknownNumber(admin, unassigned, USER.ajay);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.leadRecordOwnerUserId).toBe(USER.ajay);
    expect(out.conversationAssignedToUserId).toBe(USER.ajay);
    expect(out.teamId).toBe(activeTeamOf(USER.ajay)!.id);
    // §101: a direct assignment, never round robin.
    expect(out.usedRoundRobin).toBe(false);
    // §101: the thread is kept.
    expect(out.historyPreserved).toBe(true);
    // §101: the acting supervisor owns neither.
    expect(out.leadRecordOwnerUserId).not.toBe(admin.id);
    expect(out.conversationAssignedToUserId).not.toBe(admin.id);
  });

  it("keeps the conversation's own identity and history untouched", () => {
    const before: Conversation = unassigned;
    const after = assignConversation(before, USER.ajay);
    expect(after.id).toBe(before.id);
    expect(after.person).toBe(before.person);
    expect(after.phone).toBe(before.phone);
    expect(after.lastMessage).toBe(before.lastMessage);
    expect(after.assignedToUserId).toBe(USER.ajay);
  });

  it("refuses a Team Lead outside the acting user's scope", () => {
    const otherManager = { ...manager, id: "mgr-other" };
    const out = createLeadFromUnknownNumber(
      otherManager,
      unassigned,
      USER.sneha,
    );
    expect(out.ok).toBe(false);
    expect(out.conversationAssignedToUserId).toBeNull();
  });

  /* 18 */
  it("leaves the conversation Unassigned and read-only when no target exists", () => {
    const otherManager = { ...manager, id: "mgr-other" };
    const out = createLeadFromUnknownNumber(
      otherManager,
      unassigned,
      USER.ajay,
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.conversationAssignedToUserId).toBeNull();
    expect(out.reason).toMatch(/stays Unassigned and read-only/i);
    expect(out.reason).toMatch(/never given to an Admin, a Manager/i);
    // Still unrepliable by anyone.
    expect(mayReplyToConversation(otherManager, unassigned)).toBe(false);
  });
});

describe("reassignment scope (§93)", () => {
  /* 19 */
  it("keeps a Team Lead's targets inside their own team", () => {
    const team = activeTeamOf(healthLead.id)!;
    const members = new Set(activeMemberships(team).map((m) => m.userId));
    const targets = reassignmentTargetsFor(healthLead, assignedToHealth);
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) expect(members, t.name).toContain(t.id);
    expect(targets.map((t) => t.id)).not.toContain(USER.ajay);
  });

  /* 20 */
  it("assumes no reassignment permission for a Salesperson", () => {
    const own = CONVERSATIONS.find(
      (c) => c.assignedToUserId === salesperson.id,
    )!;
    expect(reassignmentTargetsFor(salesperson, own)).toEqual([]);
    expect(SALESPERSON_REASSIGNMENT_PENDING).toMatch(/pending confirmation/i);
  });

  it("never offers an Admin or Manager as a reassignment target", () => {
    for (const user of [admin, manager, healthLead]) {
      for (const t of reassignmentTargetsFor(user, assignedToHealth)) {
        expect(isOperationalRole(t.role), t.name).toBe(true);
        expect(t.status).toBe("Active");
      }
    }
  });

  it("keeps a Manager's reassignment inside their own hierarchy", () => {
    const otherManager = { ...manager, id: "mgr-other" };
    expect(reassignmentTargetsFor(otherManager, assignedToHealth)).toEqual([]);
  });
});

describe("supervisors never become owners (§93)", () => {
  /* 16 */
  it("assigns to the chosen operational user, never the actor", () => {
    for (const actor of [admin, manager]) {
      const out = createLeadFromUnknownNumber(actor, unassigned, USER.sneha);
      expect(out.ok).toBe(true);
      if (!out.ok) continue;
      expect(out.conversationAssignedToUserId).toBe(USER.sneha);
      expect(out.conversationAssignedToUserId).not.toBe(actor.id);
    }
  });

  it("holds no supervisor in any conversation's Assigned To", () => {
    for (const c of CONVERSATIONS) {
      if (c.assignedToUserId === null) continue;
      expect(isOperationalRole(userById(c.assignedToUserId).role), c.id).toBe(
        true,
      );
    }
  });
});
