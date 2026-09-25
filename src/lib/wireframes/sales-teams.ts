/**
 * Teams and team-scoped Lead round robin — wireframe data (spec §163).
 *
 * Data-only, like the rest of `src/lib/wireframes`: nothing here assigns a
 * Lead, stores a rotation position or reaches a database. The helpers below
 * only DESCRIBE the rules the specification sets, so the five Team
 * screens and their tests read one model rather than five hand-typed copies.
 *
 * Every person is referenced by their `SETTINGS_USERS` id, never by a typed
 * name, so a team roster cannot drift from the Users screen.
 *
 * MEMBERSHIP MODEL (audited against SETTINGS_USERS):
 *
 *   Health Insurance Team    Sneha Thomas (Team Lead), Divya Mohan, Neha
 *                            Thomas; Joseph Kurian — ended, deactivated
 *   Motor Insurance Team     Ajay Varma (Team Lead), Kavya Raghavan
 *   Life & Investments Team  Nisha George (Team Lead)
 *
 *   All three teams report to Vikram Shah (Manager), who supervises them
 *   without being a member of any of them (§2.2, §2.4).
 *
 *   Not in any team          Arun Menon (Admin), Vikram Shah (Manager),
 *                            Fathima Rasheed (invited, so not yet eligible
 *                            to join), Joseph Kurian (deactivated)
 *
 * Nothing here decides a question §163.18 leaves open: there is no routing
 * condition, no insertion rule for new members, no maximum Batch Size and no
 * behaviour for manual assignment or a reactivated team's rotation.
 */

import {
  SETTINGS_USERS,
  isOperationalRole,
  type SettingsUser,
} from "@/lib/wireframes/mock-data";

/* ----------------------------------------------------------------- labels */

/**
 * Whether a member takes part in their team's automatic round robin (§189.1).
 *
 * This is CONFIRMED behaviour, not a proposal: a paused member is skipped by
 * automatic assignment. It is deliberately a state of its own and never
 * overloads the user's Active/Inactive status, their role, their team
 * membership, their workload or their record ownership.
 */
export type RoundRobinState = "In round robin" | "Paused from round robin";

/** The approved wording. Never "Pause user", never "Available". */
export const ROUND_ROBIN_LABEL: Record<RoundRobinState, string> = {
  "In round robin": "In automatic round robin",
  "Paused from round robin": "Paused from round robin",
};

/** The two action names §185.1 defines. */
export const PAUSE_ACTION = "Pause from round robin";
export const RESUME_ACTION = "Resume round robin participation";

/**
 * What a pause does, and just as importantly what it does not do.
 * One sentence, shared, so every screen says the same thing.
 */
export const PAUSE_EFFECT_NOTE =
  "A paused member is skipped by automatic Lead assignment. They stay an active user, keep every record they already hold, and may still be given a Lead by an authorized manual assignment.";

/** Presentation date for every "today" on these screens. */
export const TEAMS_TODAY = "11 Sep 2026";

/* ------------------------------------------------------------------ model */

export type PauseChange = {
  /** SETTINGS_USERS id of whoever made the change, or null for the default. */
  byUserId: string | null;
  /**
   * In what capacity the change was made. §189.1 allows a Team Lead to pause
   * a Salesperson in their own team, and only that Team Lead's reporting
   * Manager or an Admin to pause the Team Lead.
   */
  capacity: "Default on joining" | "Team Lead" | "Reporting Manager" | "Admin";
  at: string;
};

export type Membership = {
  userId: string;
  status: "Active" | "Ended";
  teamLead: boolean;
  /**
   * Paused from AUTOMATIC round robin only (§189.1). Never a substitute for
   * deactivating the user: a paused person remains active, keeps their work,
   * and remains a valid target for an authorized manual assignment.
   */
  pausedFromRoundRobin: boolean;
  joined: string;
  ended?: string;
  endedReason?: string;
  pauseChange: PauseChange;
};

export type TeamLeadHistory = {
  userId: string;
  from: string;
  /** Absent while the responsibility is current. */
  to?: string;
};

export type SalesTeam = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  /**
   * The Manager this team reports to, through its Team Lead (§2.2).
   *
   * Each Team Lead reports to exactly one Manager, and a Manager supervises
   * the team without being a member of it.
   */
  managerId: string;
  created: string;
  memberships: readonly Membership[];
  /**
   * The team's stable rotation order (§163.8), as user ids of ACTIVE members.
   * Every member here has belonged to the team since it was set up, so the
   * order implies nothing about where a newly added member would go — that
   * is decision 9.
   */
  rotationOrder: readonly string[];
  teamLeadHistory: readonly TeamLeadHistory[];
  /** Leads currently waiting in Assignment Required for this team (§163.9). */
  assignmentRequired: number;
  /** Only teams with a wireframe detail screen carry one. */
  detailHref?: "/wireframes/admin/teams/health-insurance";
};

/**
 * A team's one automatic Lead-assignment configuration (§189.1).
 *
 * There is exactly one of these per team. It is not a "rule" that competes
 * with other rules: §189.1 selects a destination team first, and then that
 * team's single configuration decides which eligible member receives the
 * Lead. Every approved automatic path into a team — manual Lead creation,
 * bulk import, an authorized reassignment — uses this same configuration.
 *
 * Lead Source deliberately plays no part. §190 makes Lead Source
 * configurable business data and a reporting dimension, and states that
 * configuring it changes no ownership or authorization, so there is no
 * source-specific batch size and no source-keyed routing engine.
 */
export type TeamRoundRobinConfig = {
  teamId: string;
  /**
   * Positive whole number.
   *
   * PENDING CLIENT CONFIRMATION (§212): the default and the maximum
   * permitted batch size are open decisions. The values below are
   * illustrative per team and assert neither.
   */
  batchSize: number;
  /**
   * The member the stored rotation position points past (§189.1).
   *
   * Only ever read through `nextAutomaticRecipients`, which derives a safe
   * position when this member has since been paused, deactivated or moved.
   */
  lastAssignedUserId: string | null;
  updated: string;
  updatedByUserId: string;
  detailHref?: "/wireframes/admin/lead-assignment/health-insurance";
};

/* ------------------------------------------------------------------- data */

/**
 * Users who joined for the Teams wireframes.
 *
 * Kept here as ids so the screens can name them; the records themselves live
 * in SETTINGS_USERS with everyone else.
 */
export const USER = {
  arun: "s1",
  vikram: "s2",
  sneha: "s3",
  neha: "s4",
  fathima: "s5",
  joseph: "s6",
  divya: "s7",
  ajay: "s8",
  nisha: "s9",
  kavya: "s10",
} as const;

export const SALES_TEAMS: readonly SalesTeam[] = [
  {
    id: "team-health",
    slug: "health-insurance",
    name: "Health Insurance Team",
    description: "Health insurance enquiries and new policies.",
    status: "Active",
    managerId: USER.vikram,
    created: "01 Jul 2026",
    memberships: [
      {
        userId: USER.sneha,
        status: "Active",
        teamLead: true,
        pausedFromRoundRobin: false,
        joined: "01 Jul 2026",
        pauseChange: {
          byUserId: null,
          capacity: "Default on joining",
          at: "01 Jul 2026",
        },
      },
      {
        userId: USER.divya,
        status: "Active",
        teamLead: false,
        pausedFromRoundRobin: true,
        joined: "01 Jul 2026",
        pauseChange: {
          byUserId: USER.sneha,
          capacity: "Team Lead",
          at: "10 Sep 2026",
        },
      },
      {
        userId: USER.neha,
        status: "Active",
        teamLead: false,
        pausedFromRoundRobin: false,
        joined: "01 Jul 2026",
        pauseChange: {
          byUserId: null,
          capacity: "Default on joining",
          at: "01 Jul 2026",
        },
      },
      {
        // Historical only. Deactivating Joseph as a user ended this
        // membership; those Leads kept Joseph as their Record Owner.
        userId: USER.joseph,
        status: "Ended",
        teamLead: false,
        // Not paused: Joseph is excluded because the membership ended and the
        // user is deactivated. Deactivation and a round-robin pause are
        // different states and must not be conflated (§189.1).
        pausedFromRoundRobin: false,
        joined: "01 Jul 2026",
        ended: "14 Aug 2026",
        endedReason: "User deactivated",
        pauseChange: {
          byUserId: null,
          capacity: "Default on joining",
          at: "14 Aug 2026",
        },
      },
    ],
    rotationOrder: [USER.sneha, USER.divya, USER.neha],
    teamLeadHistory: [{ userId: USER.sneha, from: "01 Jul 2026" }],
    assignmentRequired: 0,
    detailHref: "/wireframes/admin/teams/health-insurance",
  },
  {
    id: "team-motor",
    slug: "motor-insurance",
    name: "Motor Insurance Team",
    description: "Motor insurance and vehicle policy enquiries.",
    status: "Active",
    managerId: USER.vikram,
    created: "01 Jul 2026",
    memberships: [
      {
        // Vikram Shah supervises this team as its Manager and is NOT a
        // member: §2.4 makes Manager supervisory, so he can neither lead the
        // team nor sit in its rotation. Ajay, already an active member,
        // holds the Team Lead role instead.
        userId: USER.ajay,
        status: "Active",
        teamLead: true,
        pausedFromRoundRobin: false,
        joined: "01 Jul 2026",
        pauseChange: {
          byUserId: null,
          capacity: "Default on joining",
          at: "01 Jul 2026",
        },
      },
      {
        // §2.2 gives every Salesperson exactly one team. Kavya is an active
        // Salesperson, so she belongs to one rather than to none.
        userId: USER.kavya,
        status: "Active",
        teamLead: false,
        pausedFromRoundRobin: false,
        joined: "01 Jul 2026",
        pauseChange: {
          byUserId: null,
          capacity: "Default on joining",
          at: "01 Jul 2026",
        },
      },
    ],
    rotationOrder: [USER.ajay, USER.kavya],
    teamLeadHistory: [{ userId: USER.ajay, from: "01 Jul 2026" }],
    assignmentRequired: 0,
  },
  {
    id: "team-life",
    slug: "life-investments",
    name: "Life & Investments Team",
    description: "Term life cover and mutual fund SIP enquiries.",
    status: "Active",
    managerId: USER.vikram,
    created: "15 Jul 2026",
    memberships: [
      {
        userId: USER.nisha,
        status: "Active",
        teamLead: true,
        pausedFromRoundRobin: true,
        joined: "15 Jul 2026",
        pauseChange: {
          byUserId: USER.arun,
          capacity: "Admin",
          at: "08 Sep 2026",
        },
      },
    ],
    rotationOrder: [USER.nisha],
    teamLeadHistory: [{ userId: USER.nisha, from: "15 Jul 2026" }],
    // Nisha is this team's only member and is paused from round robin, so the
    // automatic pool is empty and new Leads wait in Assignment Required. This
    // is the empty-pool fail-safe of §189.1, not a fallback.
    assignmentRequired: 3,
  },
];

/**
 * Keyed by team id, so a second configuration for the same team cannot be
 * written down: TypeScript rejects a duplicate key in this object literal.
 * That makes the one-per-team rule structural rather than a check someone
 * has to remember to run.
 *
 * The retired "Motor Walk-in" rule is deliberately absent. It was a second
 * configuration for the Motor team, keyed on a Lead Source and carrying its
 * own batch size, which §190 does not permit.
 */
export const TEAM_ROUND_ROBIN_CONFIG: Readonly<
  Record<string, TeamRoundRobinConfig>
> = {
  "team-health": {
    teamId: "team-health",
    batchSize: 1,
    lastAssignedUserId: USER.neha,
    updated: "02 Sep 2026",
    updatedByUserId: USER.arun,
    detailHref: "/wireframes/admin/lead-assignment/health-insurance",
  },
  "team-motor": {
    teamId: "team-motor",
    batchSize: 5,
    lastAssignedUserId: USER.ajay,
    updated: "28 Aug 2026",
    updatedByUserId: USER.arun,
  },
  "team-life": {
    teamId: "team-life",
    batchSize: 1,
    lastAssignedUserId: USER.nisha,
    updated: "15 Jul 2026",
    updatedByUserId: USER.arun,
  },
};

/** Every configuration, in the same order as SALES_TEAMS. */
export const TEAM_CONFIGS: readonly TeamRoundRobinConfig[] = SALES_TEAMS.map(
  (t) => TEAM_ROUND_ROBIN_CONFIG[t.id]!,
);

/* ---------------------------------------------------------------- lookups */

export function userById(id: string): SettingsUser {
  const user = SETTINGS_USERS.find((u) => u.id === id);
  if (!user) throw new Error(`Unknown wireframe user: ${id}`);
  return user;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function teamById(id: string): SalesTeam {
  const team = SALES_TEAMS.find((t) => t.id === id);
  if (!team) throw new Error(`Unknown wireframe team: ${id}`);
  return team;
}

export function teamBySlug(slug: string): SalesTeam {
  const team = SALES_TEAMS.find((t) => t.slug === slug);
  if (!team) throw new Error(`Unknown wireframe team: ${slug}`);
  return team;
}

/** The one configuration for a team. Throws rather than inventing a default. */
export function configFor(teamId: string): TeamRoundRobinConfig {
  const config = TEAM_ROUND_ROBIN_CONFIG[teamId];
  if (!config) throw new Error(`No round-robin configuration: ${teamId}`);
  return config;
}

export function activeMemberships(team: SalesTeam): readonly Membership[] {
  return team.memberships.filter((m) => m.status === "Active");
}

export function teamLeadOf(team: SalesTeam): Membership | undefined {
  return activeMemberships(team).find((m) => m.teamLead);
}

/** The Manager a team reports to through its Team Lead (§2.2). */
export function managerOf(team: SalesTeam): SettingsUser {
  return userById(team.managerId);
}

/** The one active team a user belongs to, if any (§163.2). */
export function activeTeamOf(userId: string): SalesTeam | undefined {
  return SALES_TEAMS.find(
    (t) =>
      t.status === "Active" &&
      activeMemberships(t).some((m) => m.userId === userId),
  );
}

/** The round-robin state of each active member, keyed by user id. */
export type RoundRobinMap = Readonly<Record<string, RoundRobinState>>;

export function roundRobinStateOf(team: SalesTeam): RoundRobinMap {
  return Object.fromEntries(
    activeMemberships(team).map((m) => [
      m.userId,
      m.pausedFromRoundRobin
        ? ("Paused from round robin" as const)
        : ("In round robin" as const),
    ]),
  );
}

/**
 * Whether a member may receive an AUTOMATIC round-robin Lead (§189.1).
 *
 * Requires all four of: an active user, an operational role, active
 * membership of this team, and not paused from round robin. Admin, Manager,
 * inactive users and another team's users are excluded by the first three
 * conditions, settled by role and state rather than by name anywhere.
 */
export function mayReceiveAutomaticLeads(member: Membership): boolean {
  if (member.status !== "Active") return false;
  if (member.pausedFromRoundRobin) return false;
  const user = userById(member.userId);
  return user.status === "Active" && isOperationalRole(user.role);
}

/**
 * Whether a member may receive an authorized MANUAL/direct assignment.
 *
 * Identical to the automatic test except that a pause does not disqualify
 * anyone: §189.1 keeps direct assignment to a specific active Team Lead or
 * Salesperson permitted even while that person is paused from round robin.
 */
export function mayReceiveManualAssignment(member: Membership): boolean {
  if (member.status !== "Active") return false;
  const user = userById(member.userId);
  return user.status === "Active" && isOperationalRole(user.role);
}

/**
 * The automatic rotation pool for a team, in its stable rotation order.
 *
 * Only this team's members are considered — there is no path by which a
 * member of another team, or the organization at large, enters the pool.
 *
 * Paused members are excluded structurally, inside this function. There is
 * deliberately no optional filter argument a caller could forget to pass.
 */
export function rotationPool(team: SalesTeam): readonly string[] {
  if (team.status !== "Active") return [];
  const members = activeMemberships(team);
  return team.rotationOrder.filter((userId) => {
    const member = members.find((m) => m.userId === userId);
    return member ? mayReceiveAutomaticLeads(member) : false;
  });
}

/**
 * The pool this team WOULD have if `pausedUserIds` were the paused set.
 *
 * Deliberately a separate, explicitly named function rather than an optional
 * argument on `rotationPool`, so the real path can never be called with a
 * filter someone forgot to pass. Only the two screens that demonstrate
 * pausing interactively use it.
 */
export function hypotheticalPool(
  team: SalesTeam,
  pausedUserIds: ReadonlySet<string>,
): readonly string[] {
  if (team.status !== "Active") return [];
  const members = activeMemberships(team);
  return team.rotationOrder.filter((userId) => {
    const member = members.find((m) => m.userId === userId);
    if (!member) return false;
    return (
      mayReceiveAutomaticLeads({ ...member, pausedFromRoundRobin: false }) &&
      !pausedUserIds.has(userId)
    );
  });
}

/** The user ids currently paused from round robin in this team. */
export function pausedUserIdsOf(team: SalesTeam): ReadonlySet<string> {
  return new Set(
    activeMemberships(team)
      .filter((m) => m.pausedFromRoundRobin)
      .map((m) => m.userId),
  );
}

/**
 * Members of this team who may be chosen for a manual/direct assignment,
 * in roster order. A paused member appears here and not in `rotationPool`.
 */
export function manualAssignmentPool(team: SalesTeam): readonly string[] {
  return activeMemberships(team)
    .filter(mayReceiveManualAssignment)
    .map((m) => m.userId);
}

/**
 * Who the next `count` automatically assigned Leads would go to.
 *
 * Reads the destination team's one configuration, so the batch size and the
 * pool can never disagree with what the screens show. Batch size N gives the
 * same eligible member N consecutive Leads before rotating.
 *
 * The stored `lastAssignedUserId` is only a hint. If that member has since
 * been paused, deactivated or moved to another team, the walk starts from
 * the next eligible member after their old place in the rotation order
 * rather than naming an ineligible recipient.
 */
export function nextAutomaticRecipients(
  team: SalesTeam,
  count: number,
): readonly string[] {
  const pool = rotationPool(team);
  if (pool.length === 0 || count <= 0) return [];
  const { batchSize, lastAssignedUserId } = configFor(team.id);
  const size = Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 1;

  // Start after the stored position, walking the team's own stable order and
  // skipping anyone no longer eligible.
  const order = team.rotationOrder;
  const inPool = new Set(pool);
  const from =
    lastAssignedUserId !== null ? order.indexOf(lastAssignedUserId) : -1;
  let idx = 0;
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(from + step + order.length) % order.length];
    if (candidate && inPool.has(candidate)) {
      idx = pool.indexOf(candidate);
      break;
    }
  }

  return previewRotation(pool, size, idx, count);
}

/**
 * The pure rotation walk: `batchSize` consecutive Leads per pool member.
 *
 * Shared so an interactive control can preview a candidate batch size
 * without reaching past `nextAutomaticRecipients`, which is the only path
 * that reads a team's stored configuration.
 */
export function previewRotation(
  pool: readonly string[],
  batchSize: number,
  startIndex: number,
  count: number,
): readonly string[] {
  if (pool.length === 0 || count <= 0) return [];
  const size = Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 1;
  const out: string[] = [];
  let idx = ((startIndex % pool.length) + pool.length) % pool.length;
  let taken = 0;
  while (out.length < count) {
    out.push(pool[idx]!);
    taken += 1;
    if (taken === size) {
      taken = 0;
      idx = (idx + 1) % pool.length;
    }
  }
  return out;
}

/** True when this configuration is usable for automatic assignment. */
export function configIsViable(team: SalesTeam): boolean {
  return configStatus(team) === "Ready";
}

/**
 * Structural checks on the configuration set, for the tests to assert.
 *
 * Duplicate team ids are already impossible (the store is keyed by team id
 * and TypeScript rejects a repeated key), so this covers the rest.
 */
export function configProblems(): readonly string[] {
  const out: string[] = [];
  for (const team of SALES_TEAMS) {
    const config = TEAM_ROUND_ROBIN_CONFIG[team.id];
    if (!config) {
      out.push(`${team.name} has no round-robin configuration`);
      continue;
    }
    if (config.teamId !== team.id) {
      out.push(`${team.name} configuration names another team`);
    }
    if (!Number.isInteger(config.batchSize) || config.batchSize < 1) {
      out.push(`${team.name} batch size must be a positive whole number`);
    }
    const last = config.lastAssignedUserId;
    if (last !== null) {
      const members = activeMemberships(team).map((m) => m.userId);
      if (!members.includes(last)) {
        out.push(`${team.name} rotation state names a non-member`);
      }
    }
  }
  for (const id of Object.keys(TEAM_ROUND_ROBIN_CONFIG)) {
    if (!SALES_TEAMS.some((t) => t.id === id)) {
      out.push(`configuration ${id} has no team`);
    }
  }
  return out;
}

export type TeamCounts = {
  active: number;
  /** In the automatic rotation pool (§189.1). Excludes paused members. */
  eligible: number;
  /** Paused from round robin, and therefore skipped by automatic assignment. */
  paused: number;
};

export function teamCounts(team: SalesTeam): TeamCounts {
  const members = activeMemberships(team);
  return {
    active: members.length,
    eligible: rotationPool(team).length,
    paused: members.filter((m) => m.pausedFromRoundRobin).length,
  };
}

/** The assignment warning §163.5 and §163.7 require, or null. */
export function teamWarning(team: SalesTeam): string | null {
  if (team.status !== "Active") return "Team is inactive";
  if (!teamLeadOf(team)) return "No active Team Lead";
  if (rotationPool(team).length === 0) return "No eligible members";
  return null;
}

/** Configuration status shown on the Automatic Lead Assignment screens. */
export type ConfigStatus = "Ready" | "No eligible members" | "Team inactive";

export function configStatus(team: SalesTeam): ConfigStatus {
  if (team.status !== "Active") return "Team inactive";
  if (rotationPool(team).length === 0) return "No eligible members";
  return "Ready";
}

/**
 * Whether an inactive team may be activated (§163.1, §163.2, §163.3).
 *
 * Blocked unless the team has exactly one active Team Lead who is an active
 * user and an active member, every active member is an active user, and no
 * active member already holds an active membership of another team.
 * Activation never picks a Team Lead or changes anyone's eligibility.
 *
 * Zero eligible members does NOT block activation. It is reported instead:
 * the team would have no rotation pool, so its Leads would wait in
 * Assignment Required with no fallback.
 */
export type ActivationCheck = {
  blockers: readonly string[];
  eligibleCount: number;
};

export function activationCheck(
  teamId: string,
  members: readonly Membership[],
): ActivationCheck {
  const active = members.filter((m) => m.status === "Active");
  const blockers: string[] = [];

  const leads = active.filter((m) => m.teamLead);
  if (leads.length !== 1) {
    blockers.push(
      `A team needs exactly one active Team Lead to be activated. This team has ${leads.length}.`,
    );
  }
  for (const m of leads) {
    const user = userById(m.userId);
    if (user.role !== "Team Lead") {
      blockers.push(
        `${user.name} is a ${user.role}. Only a user with the Team Lead role may lead a team.`,
      );
    }
  }

  for (const m of active) {
    const user = userById(m.userId);
    if (user.status !== "Active") {
      blockers.push(
        `${user.name} is not an active user${m.teamLead ? " and cannot remain Team Lead" : ""}. Only active users may hold active memberships.`,
      );
      continue;
    }
    const other = SALES_TEAMS.find(
      (t) =>
        t.id !== teamId &&
        t.status === "Active" &&
        activeMemberships(t).some((o) => o.userId === m.userId),
    );
    if (other) {
      blockers.push(
        `${user.name} already has an active membership of ${other.name}.`,
      );
    }
  }

  // Automatic eligibility only: a paused member is not counted, because a
  // paused member receives no automatically assigned Lead (§189.1).
  const eligibleCount = active.filter(mayReceiveAutomaticLeads).length;

  return { blockers, eligibleCount };
}

/**
 * Users who could be added to a team, with the reason when they cannot.
 *
 * Adding never creates a user, never reactivates one, and never gives
 * anyone a second active team (§163.2, §163.12).
 */
/**
 * Who may pause or resume `target`'s round-robin participation (§189.1).
 *
 * A Team Lead may act on a Salesperson in their own team. A Team Lead may be
 * acted on only by the Manager that team reports to, or by an Admin. Nobody
 * else holds this authority, and a Salesperson never holds it at all.
 */
export function mayTogglePause(
  actorUserId: string,
  targetUserId: string,
): boolean {
  const actor = userById(actorUserId);
  const team = activeTeamOf(targetUserId);
  if (!team) return false;
  const membership = activeMemberships(team).find(
    (m) => m.userId === targetUserId,
  );
  if (!membership || !isOperationalRole(userById(targetUserId).role)) {
    return false;
  }
  if (actor.role === "Admin") return true;
  if (actor.role === "Manager") return team.managerId === actor.id;
  if (actor.role === "Team Lead") {
    // Only over a Salesperson in the team this Team Lead actually leads.
    return teamLeadOf(team)?.userId === actor.id && !membership.teamLead;
  }
  return false; // a Salesperson never pauses anyone
}

export type Candidate = {
  user: SettingsUser;
  /** Null when the user can be added directly. */
  blocked: string | null;
  /** Set when the user is in another team and would need a transfer. */
  currentTeam?: SalesTeam;
};

export function addCandidates(teamId: string): readonly Candidate[] {
  return SETTINGS_USERS.map((user): Candidate | null => {
    const current = activeTeamOf(user.id);
    if (current?.id === teamId) return null;
    if (!isOperationalRole(user.role)) {
      return {
        user,
        blocked: `${user.role} is a supervisory role. Only Team Leads and Salespersons belong to a team.`,
      };
    }
    if (user.status === "Invited") {
      return {
        user,
        blocked:
          "Invitation not yet accepted. Only active users can join a team.",
      };
    }
    if (user.status === "Deactivated") {
      return {
        user,
        blocked:
          "Deactivated user. Reactivate them in Users first — joining a team never does it.",
      };
    }
    if (current) {
      return {
        user,
        currentTeam: current,
        blocked: `Already in ${current.name}. Use Transfer instead — one active team per person.`,
      };
    }
    return { user, blocked: null };
  }).filter((c): c is Candidate => c !== null);
}
