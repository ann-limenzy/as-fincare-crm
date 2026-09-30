/**
 * WhatsApp visibility, reply and assignment authorization (spec §89.1,
 * §93, §93.1, §101, §118).
 *
 * Pure functions over the structured mock data. Every decision derives from
 * the Admin → Manager → Team Lead/Team → Salesperson hierarchy in
 * `sales-teams.ts`; nothing here keeps a WhatsApp-only copy of team
 * membership, and nothing compares display names.
 *
 * Viewing and replying are deliberately separate predicates. §93.1 makes an
 * unassigned conversation readable by Admins and Managers yet repliable by
 * nobody at all, so a single "canAccess" flag could not express it.
 */
import {
  CONVERSATIONS,
  SETTINGS_USERS,
  isOperationalRole,
  type Conversation,
  type SettingsUser,
} from "@/lib/wireframes/mock-data";
import {
  SALES_TEAMS,
  activeMemberships,
  activeTeamOf,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";

/* ------------------------------------------------------------------ scope */

/** Teams a Manager supervises. Empty for every other role. */
function teamsUnder(manager: SettingsUser) {
  return manager.role === "Manager"
    ? SALES_TEAMS.filter((t) => t.managerId === manager.id)
    : [];
}

/** User ids operating anywhere below this Manager. */
function userIdsUnder(manager: SettingsUser): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const team of teamsUnder(manager)) {
    for (const m of activeMemberships(team)) ids.add(m.userId);
  }
  return ids;
}

/** User ids in this Team Lead's own team, including themselves. */
function userIdsInOwnTeam(lead: SettingsUser): ReadonlySet<string> {
  const team = activeTeamOf(lead.id);
  if (!team || teamLeadOf(team)?.userId !== lead.id) return new Set();
  return new Set(activeMemberships(team).map((m) => m.userId));
}

/* ------------------------------------------------------------- predicates */

/** §93.1: only Admins and Managers ever see the unassigned queue. */
export function maySeeUnassignedQueue(user: SettingsUser): boolean {
  return user.role === "Admin" || user.role === "Manager";
}

/**
 * Whether `user` may open and read `conversation` (§89.1).
 *
 * An unassigned conversation is visible to Admins and Managers
 * organization-wide. An assigned one follows the reporting hierarchy.
 */
export function mayViewConversation(
  user: SettingsUser,
  conversation: Conversation,
): boolean {
  if (user.status !== "Active") return false;
  if (conversation.assignedToUserId === null) {
    return maySeeUnassignedQueue(user);
  }
  const assignee = conversation.assignedToUserId;
  switch (user.role) {
    case "Admin":
      return true;
    case "Manager":
      // Only below this Manager. A conversation assigned into another
      // Manager's hierarchy stops being visible, even though it was once
      // readable in the shared unassigned queue (§93.1).
      return userIdsUnder(user).has(assignee);
    case "Team Lead":
      return userIdsInOwnTeam(user).has(assignee);
    case "Salesperson":
      return assignee === user.id;
  }
}

/**
 * Whether `user` may send a reply on `conversation` (§93.1).
 *
 * Nobody may reply while it is unassigned — Admins and Managers included,
 * even though they are the only roles who can see it.
 */
export function mayReplyToConversation(
  user: SettingsUser,
  conversation: Conversation,
): boolean {
  if (conversation.assignedToUserId === null) return false;
  return mayViewConversation(user, conversation);
}

/**
 * Every conversation `user` is permitted to see, in source order.
 *
 * `from` defaults to the original mock data. The screens pass the wireframe
 * store's list instead, so an assignment made during a walkthrough is
 * reflected without the predicate itself knowing the store exists.
 */
export function visibleConversationsFor(
  user: SettingsUser,
  from: readonly Conversation[] = CONVERSATIONS,
): readonly Conversation[] {
  return from.filter((c) => mayViewConversation(user, c));
}

/** The unassigned queue as `user` may see it — empty unless supervisory. */
export function unassignedQueueFor(
  user: SettingsUser,
  from: readonly Conversation[] = CONVERSATIONS,
): readonly Conversation[] {
  return visibleConversationsFor(user, from).filter(
    (c) => c.assignedToUserId === null,
  );
}

/* ------------------------------------------------------------- assignment */

/**
 * Active Team Leads `user` may assign an unassigned conversation to
 * (§93.1, §101).
 *
 * Admin: any active Team Lead in the organization.
 * Manager: only an active Team Lead reporting to that Manager.
 * Everyone else: nobody — they cannot see the conversation at all.
 *
 * Pause status is not consulted. Pausing withholds someone from automatic
 * round robin only, and this is a direct assignment (§101).
 */
export function assignmentTargetsFor(
  user: SettingsUser,
  conversation: Conversation,
): readonly SettingsUser[] {
  if (conversation.assignedToUserId !== null) return [];
  if (!mayViewConversation(user, conversation)) return [];
  const teams =
    user.role === "Admin"
      ? SALES_TEAMS
      : user.role === "Manager"
        ? teamsUnder(user)
        : [];
  const out: SettingsUser[] = [];
  for (const team of teams) {
    const lead = teamLeadOf(team);
    if (!lead) continue;
    const candidate = userById(lead.userId);
    // Active and holding the Team Lead role. Inactive is disqualifying;
    // paused from round robin is not.
    if (candidate.status === "Active" && candidate.role === "Team Lead") {
      out.push(candidate);
    }
  }
  return out;
}

/** Whether `user` may assign `conversation` to `targetUserId`. */
export function mayAssignConversation(
  user: SettingsUser,
  conversation: Conversation,
  targetUserId: string,
): boolean {
  return assignmentTargetsFor(user, conversation).some(
    (t) => t.id === targetUserId,
  );
}

/**
 * Who `user` may reassign an ALREADY-ASSIGNED conversation to (§93).
 *
 * Admin: anywhere. Manager: within their own hierarchy only, never into
 * another Manager's. Team Lead: within their own team only. Salesperson:
 * pending client confirmation (§93, §212), so no targets are offered —
 * the screens must not assume the permission exists.
 */
export function reassignmentTargetsFor(
  user: SettingsUser,
  conversation: Conversation,
): readonly SettingsUser[] {
  if (conversation.assignedToUserId === null) return [];
  if (!mayViewConversation(user, conversation)) return [];
  const ids =
    user.role === "Admin"
      ? new Set(
          SALES_TEAMS.flatMap((t) => activeMemberships(t).map((m) => m.userId)),
        )
      : user.role === "Manager"
        ? userIdsUnder(user)
        : user.role === "Team Lead"
          ? userIdsInOwnTeam(user)
          : new Set<string>(); // Salesperson — pending confirmation
  return SETTINGS_USERS.filter(
    (u) => ids.has(u.id) && u.status === "Active" && isOperationalRole(u.role),
  );
}

/** §93: a Salesperson's reassignment permission is not settled. */
export const SALESPERSON_REASSIGNMENT_PENDING =
  "Whether a Salesperson may reassign a conversation is pending confirmation with A&S Fincare, so no reassignment control is offered here.";

/* ---------------------------------------------------- unknown-number flow */

export type UnknownNumberOutcome =
  | {
      readonly ok: true;
      /** The Team Lead who becomes BOTH Lead Record Owner and assignee. */
      readonly teamLeadUserId: string;
      readonly teamId: string;
      /** Never the acting Admin or Manager (§101). */
      readonly leadRecordOwnerUserId: string;
      readonly conversationAssignedToUserId: string;
      /** §101: the history is kept; no new thread is started. */
      readonly historyPreserved: true;
      /** §101: a direct assignment, never a rotation. */
      readonly usedRoundRobin: false;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      /** Stays unassigned, and therefore still unrepliable. */
      readonly conversationAssignedToUserId: null;
    };

/**
 * Creating a Lead from an unknown-number conversation (§101).
 *
 * Selecting the Team Lead identifies both the destination team and the
 * initial operational owner in one action. The Lead is assigned directly:
 * it does not enter the team's round-robin pool, and the team's batch size
 * plays no part.
 */
export function createLeadFromUnknownNumber(
  actor: SettingsUser,
  conversation: Conversation,
  selectedTeamLeadUserId: string,
): UnknownNumberOutcome {
  const targets = assignmentTargetsFor(actor, conversation);
  if (targets.length === 0) {
    return {
      ok: false,
      reason:
        "No eligible active Team Lead is available in your scope. The conversation stays Unassigned and read-only, and is surfaced to an authorized supervisor. It is never given to an Admin, a Manager, a Salesperson or another team.",
      conversationAssignedToUserId: null,
    };
  }
  if (!targets.some((t) => t.id === selectedTeamLeadUserId)) {
    return {
      ok: false,
      reason:
        "That Team Lead is outside your permitted scope. The conversation stays Unassigned and read-only.",
      conversationAssignedToUserId: null,
    };
  }
  const team = activeTeamOf(selectedTeamLeadUserId)!;
  return {
    ok: true,
    teamLeadUserId: selectedTeamLeadUserId,
    teamId: team.id,
    leadRecordOwnerUserId: selectedTeamLeadUserId,
    conversationAssignedToUserId: selectedTeamLeadUserId,
    historyPreserved: true,
    usedRoundRobin: false,
  };
}

/** Apply an assignment to a conversation, returning the updated copy. */
export function assignConversation(
  conversation: Conversation,
  targetUserId: string,
): Conversation {
  // The acting supervisor is deliberately absent: assigning never transfers
  // ownership to them (§93, §101).
  return { ...conversation, assignedToUserId: targetUserId };
}
