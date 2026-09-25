/**
 * Lead assignment choice for the Bulk Import wireframe (screen A3).
 *
 * Data and presentation state only. Nothing here assigns a Lead, advances a
 * rotation position or reaches a database — it DESCRIBES the four choices an
 * administrator has, so the screen and its summary panel read one model.
 *
 * A fifth choice, "use the CRM assignment rules", is deliberately ABSENT:
 * the automatic routing condition is not confirmed with A&S Fincare yet
 * (§163.18 decision 1), so the demo does not offer a behaviour nobody has
 * agreed. `parse` below treats its stored value as invalid, so a browser left
 * over from an earlier session comes back with nothing selected.
 *
 * Teams and people are read from `sales-teams.ts` rather than typed again, so
 * the import screen can never show a roster the Team wireframes
 * contradict during the same presentation.
 */

import {
  SALES_TEAMS,
  activeMemberships,
  activeTeamOf,
  mayReceiveManualAssignment,
  configFor,
  configIsViable,
  nextAutomaticRecipients,
  rotationPool,
  userById,
  type SalesTeam,
} from "@/lib/wireframes/sales-teams";
import { COLUMN_MAPPINGS } from "@/lib/wireframes/mock-data";

/* ---------------------------------------------------------------- methods */

/**
 * The three strategies §152 permits, and no others.
 *
 * "Use CRM assignment rules" is deliberately absent: §152 states there is no
 * organization-wide default assignment rule to fall back on. Reading each
 * row's mapped Record Owner is not a fourth strategy either — §148 makes an
 * eligible mapped owner take precedence over whichever of these three is
 * chosen, automatically, for that row only.
 */
export type AssignmentMethod = "team-lead" | "salesperson" | "team";

/** Every method the screen offers, and the only values `parse` accepts. */
export const ASSIGNMENT_METHODS: readonly AssignmentMethod[] = [
  "team-lead",
  "salesperson",
  "team",
];

export function isAssignmentMethod(value: unknown): value is AssignmentMethod {
  return (ASSIGNMENT_METHODS as readonly unknown[]).includes(value);
}

export type AssignmentChoice = {
  /**
   * `null` until the admin chooses. §152 requires no default and no implicit
   * strategy, so nothing is preselected and Continue stays unavailable.
   */
  readonly method: AssignmentMethod | null;
  /** Team id, when `method` is `team`. Empty until one is chosen. */
  readonly teamId: string;
  /**
   * SETTINGS_USERS id, when `method` is `team-lead` or `salesperson`.
   * Empty until chosen.
   */
  readonly userId: string;
};

export const DEFAULT_CHOICE: AssignmentChoice = {
  method: null,
  teamId: "",
  userId: "",
};

/* ------------------------------------------------------------------- data */

export type TeamOption = {
  readonly id: string;
  readonly name: string;
  /** Names in this team's rotation order that automatic assignment reaches. */
  readonly eligible: readonly string[];
  /** Active members skipped because they are paused from round robin. */
  readonly paused: readonly string[];
  /**
   * False when no member is eligible. §153 makes a Team strategy invalid
   * then, and the import must fail safely rather than fall back.
   */
  readonly viable: boolean;
  /**
   * The destination team's one round-robin batch size (§189.1). Batch 2B
   * surfaces this on the import screens; it is exposed here so the import
   * flow reads the same single configuration the Team screens read, and can
   * never pick between competing rules for one team.
   */
  readonly batchSize: number;
};

/**
 * The teams offered, each with the members round robin could actually reach.
 *
 * `rotationPool` is the same helper the Team screens use, so a member paused
 * there is absent here without anyone restating the rule, and the batch size
 * comes from that team's single configuration rather than a separate copy.
 */
export const TEAM_OPTIONS: readonly TeamOption[] = SALES_TEAMS.filter(
  (t) => t.status === "Active",
).map((team: SalesTeam) => ({
  id: team.id,
  name: team.name,
  eligible: rotationPool(team).map((id) => userById(id).name),
  paused: activeMemberships(team)
    .filter((m) => m.pausedFromRoundRobin)
    .map((m) => userById(m.userId).name),
  viable: configIsViable(team),
  batchSize: configFor(team.id).batchSize,
}));

export type PersonOption = {
  readonly id: string;
  readonly name: string;
  /** The one team this person belongs to, or null. */
  readonly teamName: string | null;
  /**
   * Shown so the screen can say why this person receives no automatic Lead
   * while still being a valid direct-assignment target.
   */
  readonly pausedFromRoundRobin: boolean;
};

/**
 * Everyone who can be named as a Record Owner by hand.
 *
 * Active operational members of an active team. A direct assignment is not a
 * rotation, so a paused member IS still offered: §189.1 keeps assignment to a
 * specific active Team Lead or Salesperson permitted even while that person
 * is paused from round robin.
 */
export const PERSON_OPTIONS: readonly PersonOption[] = SALES_TEAMS.filter(
  (t) => t.status === "Active",
).flatMap((team) =>
  activeMemberships(team)
    .filter(mayReceiveManualAssignment)
    .map((m) => ({
      id: m.userId,
      name: userById(m.userId).name,
      teamName: activeTeamOf(m.userId)?.name ?? null,
      pausedFromRoundRobin: m.pausedFromRoundRobin,
    })),
);

/** Team Leads a direct assignment may name (§152). */
export const TEAM_LEAD_OPTIONS: readonly PersonOption[] = PERSON_OPTIONS.filter(
  (p) => userById(p.id).role === "Team Lead",
);

/** Salespersons a direct assignment may name (§152). */
export const SALESPERSON_OPTIONS: readonly PersonOption[] =
  PERSON_OPTIONS.filter((p) => userById(p.id).role === "Salesperson");

/* --------------------------------------------------- mapped column lookup */

/**
 * The CRM destination field that decides who owns an imported Lead.
 *
 * Only "Record Owner". An earlier draft also listed "Sales Team" here, but
 * that is not a CRM destination field at all — it appears in neither
 * `CRM_FIELDS` nor any row of `COLUMN_MAPPINGS`, so it could never match.
 */
const ASSIGNMENT_FIELDS = ["Record Owner"] as const;

/**
 * The spreadsheet column currently mapped to an assignment field, if any.
 *
 * Derived from the mapping mock rather than asserted, so option 4 tells the
 * truth about whatever the Map columns screen is showing.
 */
export const MAPPED_ASSIGNMENT_COLUMN: string | null =
  COLUMN_MAPPINGS.find((m) =>
    (ASSIGNMENT_FIELDS as readonly string[]).includes(m.crmField),
  )?.uploadedColumn ?? null;

/** The CRM field that column is mapped to, for naming it precisely. */
export const MAPPED_ASSIGNMENT_FIELD: string | null =
  COLUMN_MAPPINGS.find((m) =>
    (ASSIGNMENT_FIELDS as readonly string[]).includes(m.crmField),
  )?.crmField ?? null;

/* ------------------------------------------------------------- validation */

export function teamOption(id: string): TeamOption | undefined {
  return TEAM_OPTIONS.find((t) => t.id === id);
}

export function personOption(id: string): PersonOption | undefined {
  return PERSON_OPTIONS.find((p) => p.id === id);
}

/**
 * Why the current choice cannot be used, or null when it can.
 *
 * Always evaluated against the CURRENT mock data, so a choice restored from
 * a previous session is revalidated rather than trusted: a team whose pool
 * has since emptied, or a person who has since been deactivated, comes back
 * invalid however it was stored.
 *
 * §153 makes an empty-pool Team an INVALID strategy, not merely a warned-about
 * one — the import cannot proceed on it, and must not fall back.
 */
export function choiceProblem(choice: AssignmentChoice): string | null {
  switch (choice.method) {
    case null:
      return "Choose how imported Leads should be assigned.";
    case "team": {
      const team = teamOption(choice.teamId);
      if (!team) return "Choose a Team to continue.";
      if (!team.viable) {
        return `${team.name} has no member who is active and in round robin, so this strategy cannot be used. Choose another Team, or assign to a specific person.`;
      }
      return null;
    }
    case "team-lead": {
      const person = personOption(choice.userId);
      if (!person || userById(person.id).role !== "Team Lead") {
        return "Choose a Team Lead to continue.";
      }
      return null;
    }
    case "salesperson": {
      const person = personOption(choice.userId);
      if (!person || userById(person.id).role !== "Salesperson") {
        return "Choose a Salesperson to continue.";
      }
      return null;
    }
  }
}

/** Whether the choice is valid and complete enough to continue. */
export function isChoiceComplete(choice: AssignmentChoice): boolean {
  return choiceProblem(choice) === null;
}

/** One sentence describing what the current choice will do. */
export function choiceSummary(choice: AssignmentChoice): string {
  const problem = choiceProblem(choice);
  if (problem) return problem;
  switch (choice.method) {
    case null:
      return "Choose how imported Leads should be assigned.";
    case "team": {
      const team = teamOption(choice.teamId)!;
      return `Imported Leads rotate between ${formatNames(team.eligible)} using ${team.name}'s one round-robin configuration, batch size ${team.batchSize}. The Team is never the Record Owner — round robin selects one of these people for each Lead.`;
    }
    case "team-lead":
    case "salesperson": {
      const person = personOption(choice.userId)!;
      return `Every imported Lead receives ${person.name} as Record Owner. This is a direct assignment: no batch size applies and no team's rotation position moves.`;
    }
  }
}

/**
 * A short label naming the strategy, for the review, confirmation,
 * processing and result screens to repeat identically.
 */
export function choiceLabel(choice: AssignmentChoice): string {
  switch (choice.method) {
    case null:
      return "Not chosen";
    case "team": {
      const team = teamOption(choice.teamId);
      return team
        ? `Team → ${team.name} (round robin, batch size ${team.batchSize})`
        : "Team → not chosen";
    }
    case "team-lead": {
      const person = personOption(choice.userId);
      return person
        ? `Team Lead → ${person.name} (direct assignment)`
        : "Team Lead → not chosen";
    }
    case "salesperson": {
      const person = personOption(choice.userId);
      return person
        ? `Salesperson → ${person.name} (direct assignment)`
        : "Salesperson → not chosen";
    }
  }
}

/** True when this strategy distributes by round robin rather than directly. */
export function isTeamStrategy(choice: AssignmentChoice): boolean {
  return choice.method === "team";
}

/** "A and B", "A, B and C" — never a trailing comma before "and". */
export function formatNames(names: readonly string[]): string {
  if (names.length === 0) return "nobody";
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
}

/* ------------------------------------------- mapped Record Owner rows */

/**
 * How many rows carry an eligible mapped Record Owner, and how many fall
 * through to the Step 3 strategy.
 *
 * §148: where a row's mapped owner is eligible it takes precedence over the
 * Step 3 strategy for that row; rows without an eligible mapped owner follow
 * the strategy. Nothing is silently substituted — a mapped owner that cannot
 * be matched to an eligible active user is surfaced as a Need Attention row
 * (the "Unknown Record Owner" issue), never quietly replaced.
 */
export const MAPPED_OWNER_ROWS = {
  /** Rows whose mapped owner matched an eligible active user. */
  eligible: 118,
  /**
   * Rows whose mapped owner could not be matched, surfaced for resolution.
   *
   * Illustrative mapping detail only. It does not redefine the overall
   * validation category: Need Attention covers several problems, of which an
   * unmatched owner is one.
   */
  unmatched: 12,
} as const;

/** Rows that will follow the Step 3 strategy rather than a mapped owner. */
export function rowsFollowingStrategy(readyRows: number): number {
  return Math.max(0, readyRows - MAPPED_OWNER_ROWS.eligible);
}

/**
 * The distribution a Team strategy actually produces for `rows` records.
 *
 * Walks the destination team's one configuration, so the batch size and the
 * pool are the same ones every other screen shows. Paused and inactive
 * members never appear, because they are not in the pool.
 */
export function teamDistribution(
  teamId: string,
  rows: number,
): readonly { name: string; count: number }[] {
  const team = SALES_TEAMS.find((t) => t.id === teamId);
  if (!team || rows <= 0) return [];
  const pool = rotationPool(team);
  if (pool.length === 0) return [];
  const counts = new Map<string, number>(pool.map((id) => [id, 0]));
  for (const id of nextAutomaticRecipients(team, rows)) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts].map(([id, count]) => ({
    name: userById(id).name,
    count,
  }));
}

/* ------------------------------------------------------------------ store */

/**
 * The choice survives a move to Validation and back.
 *
 * sessionStorage and a module store, exactly as `presentation-mode.tsx` does
 * it: the server snapshot is the default, so `useSyncExternalStore` reconciles
 * at hydration without a state write in an effect and without a flash. It is
 * presentation state for one demo, so it is deliberately not durable.
 */
const STORAGE_KEY = "limenzy-crm:wireframe-import-assignment:v1";

const listeners = new Set<() => void>();

/**
 * Cached so the snapshot is referentially stable. `useSyncExternalStore` calls
 * this on every render and compares by identity, so parsing afresh each time
 * would loop forever.
 */
let cachedRaw: string | null = null;
let cached: AssignmentChoice = DEFAULT_CHOICE;

function parse(raw: string | null): AssignmentChoice {
  if (!raw) return DEFAULT_CHOICE;
  try {
    const value = JSON.parse(raw) as Partial<AssignmentChoice>;
    const method = value.method;
    // Anything that is not one of the four current methods — `null`, a typo,
    // or the withdrawn "rules" value from an earlier session — comes back
    // unselected rather than selected-but-invisible.
    if (!isAssignmentMethod(method)) return DEFAULT_CHOICE;
    return {
      method,
      teamId: typeof value.teamId === "string" ? value.teamId : "",
      userId: typeof value.userId === "string" ? value.userId : "",
    };
  } catch {
    return DEFAULT_CHOICE;
  }
}

export function subscribeToAssignmentChoice(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function getAssignmentChoice(): AssignmentChoice {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Blocked storage — the default is correct and the screen still works.
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

/** The server cannot know the choice, and must not guess. */
export function getAssignmentServerChoice(): AssignmentChoice {
  return DEFAULT_CHOICE;
}

export function setAssignmentChoice(choice: AssignmentChoice): void {
  cachedRaw = JSON.stringify(choice);
  cached = choice;
  try {
    sessionStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Non-fatal: the choice simply will not survive a move to Validation.
  }
  for (const listener of listeners) listener();
}
