/**
 * Lead Priority — the configured values, and the only helpers that read them
 * (spec §192, with §40, §191, §207 and §208).
 *
 * §192 makes Priority "a first-class field on every Lead… separate from
 * pipeline stage and must never be merged with it or presented as a stage".
 * This module exists so there is exactly one place the values live: §192 also
 * makes them "configurable data, not fixed constants", so a screen that
 * hardcoded Hot / Warm / Cold would silently stop matching the configuration
 * the moment an administrator renamed one.
 *
 * Priority is business data and nothing more. §192 and §2.6: configuring it
 * "does not change any role's visibility, ownership or authorization, and must
 * never be presented as a permission setting". Accordingly nothing here
 * touches teams, round robin, Record Owner or assignment, and nothing
 * elsewhere may read a priority to decide any of those.
 */

/* ------------------------------------------------------------------ model */

/**
 * Presentation tone, for screens that already use these tokens.
 *
 * Decoration only. Every surface pairs it with the label text, because §57
 * requires priority to be "visibly distinct" and a colour alone is unreadable
 * to anyone who cannot distinguish it. A value an administrator adds later has
 * no tone, which is why this is optional and why no code may branch on it for
 * meaning.
 */
export type PriorityTone = "hot" | "warm" | "cold";

export type LeadPriority = {
  /**
   * Stable id. Never the label.
   *
   * §192 permits renaming a value, and §207 says renaming "should not rewrite
   * the priority recorded in past activity or audit entries". A Lead that
   * referenced the label "Hot" would change meaning the moment it was renamed;
   * one that references `lp-hot` does not.
   */
  readonly id: string;
  readonly label: string;
  /** Configured display order (§192 "Reorder priority values", §37 sorting). */
  readonly order: number;
  readonly active: boolean;
  /**
   * The value new Leads start with (§38) and imports fall back to (§149).
   * Exactly one value carries it.
   */
  readonly isDefault?: boolean;
  readonly tone?: PriorityTone;
};

/**
 * The configured values: §192's three initial active values, and nothing else.
 *
 * Only Hot, Warm and Cold appear. A fourth, deactivated value would be a
 * business value A&S Fincare never approved, presented to them as though they
 * had — so deactivation is demonstrated from test fixtures instead, where a
 * clearly synthetic value cannot be mistaken for a real one.
 *
 * `isDefault` marks the CURRENTLY CONFIGURED default, which is what §38 and
 * §149 both refer to. Warm carries it as illustrative configuration for A&S
 * Fincare to confirm; it is not an approved business decision, and §192 does
 * not say who may change it (see `SET_DEFAULT_AUTHORITY_PENDING`).
 */
export const LEAD_PRIORITIES: readonly LeadPriority[] = [
  { id: "lp-hot", label: "Hot", order: 1, active: true, tone: "hot" },
  {
    id: "lp-warm",
    label: "Warm",
    order: 2,
    active: true,
    isDefault: true,
    tone: "warm",
  },
  { id: "lp-cold", label: "Cold", order: 3, active: true, tone: "cold" },
];

/**
 * §192 lists five Admin operations — add, rename, reorder, deactivate,
 * reactivate — and choosing the default is not among them.
 *
 * §38 and §149 nevertheless both depend on "the configured default priority
 * value", so the setting must exist and must be changeable by somebody. The
 * specification does not say who, so no role is offered the action here and the
 * question is surfaced instead of answered.
 *
 * Note the deliberate contrast §38 draws: Stage "defaults to the first active
 * pipeline stage" — derived, and therefore settable by reordering — whereas
 * Priority "defaults to the configured default priority value". Priority's
 * default is explicitly NOT derived from the order, so reordering cannot set
 * it and nothing else in §192 can either.
 */
export const SET_DEFAULT_AUTHORITY_PENDING =
  "Which role may change the default Lead Priority is pending confirmation with A&S Fincare: §192 lists adding, renaming, reordering, deactivating and reactivating a value, but not choosing the default.";

/** Shown for a reference that resolves to no configured value. */
export const UNKNOWN_PRIORITY_LABEL = "Priority unavailable";

/* ---------------------------------------------------------------- reading */

/** Configured order, as §192's reorder operation left it. */
export function orderedPriorities(
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): readonly LeadPriority[] {
  return [...from].sort((a, b) => a.order - b.order);
}

export function priorityById(
  id: string,
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): LeadPriority | undefined {
  return from.find((p) => p.id === id);
}

/**
 * The values a user may choose, in configured order.
 *
 * §192: "deactivating a priority value prevents it from being selected for new
 * Leads and for future priority changes." Both cases are this one list.
 */
export function selectablePriorities(
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): readonly LeadPriority[] {
  return orderedPriorities(from).filter((p) => p.active);
}

/** Whether `id` may be chosen for a new Lead or for a priority change (§192). */
export function isSelectablePriority(
  id: string,
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): boolean {
  return selectablePriorities(from).some((p) => p.id === id);
}

/* -------------------------------------------------- the configured default */

/**
 * Why the configured default cannot be used, or null when it can.
 *
 * §38: "Priority defaults to the configured default priority value." §149: "if
 * no Priority column is supplied, imported Leads receive the configured default
 * priority value." Both depend on ONE explicitly configured active value, so
 * every way that can fail is named rather than papered over.
 *
 * Falling back to another value would silently change the priority given to
 * every new Lead and every import — a business change nobody asked for,
 * invisible at the point it happens.
 */
export function defaultPriorityProblem(
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): string | null {
  if (from.length === 0) {
    return "No Lead Priority values are configured, so a new Lead has no priority to receive.";
  }
  if (from.filter((p) => p.active).length === 0) {
    return "No Lead Priority value is active, so a new Lead has no priority to receive.";
  }
  const flagged = from.filter((p) => p.isDefault);
  if (flagged.length === 0) {
    return "No Lead Priority value is marked as the default, so there is nothing for a new Lead to default to.";
  }
  if (flagged.length > 1) {
    return `More than one Lead Priority value is marked as the default (${flagged
      .map((p) => p.label)
      .join(", ")}). Exactly one has to be.`;
  }
  const only = flagged[0]!;
  if (!only.active) {
    return `${only.label} is the configured default but has been deactivated. Make an active value the default before using it.`;
  }
  return null;
}

export type DefaultPriorityResult =
  | { readonly ok: true; readonly priority: LeadPriority }
  | { readonly ok: false; readonly reason: string };

/**
 * The configured default, or the reason there isn't a usable one.
 *
 * The result form is the point: a caller cannot accidentally receive a
 * different value than the one configured, because on failure it receives no
 * value at all.
 */
export function resolveDefaultPriority(
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): DefaultPriorityResult {
  const problem = defaultPriorityProblem(from);
  if (problem !== null) return { ok: false, reason: problem };
  return { ok: true, priority: from.find((p) => p.isDefault)! };
}

/**
 * The configured default for a new Lead (§38) or an import with no Priority
 * column (§149).
 *
 * Throws rather than substituting. There is no safe silent answer: giving a new
 * Lead a priority nobody configured is worse than refusing, and the screens
 * call `resolveDefaultPriority` so they can say what is wrong instead.
 */
export function defaultPriority(
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): LeadPriority {
  const result = resolveDefaultPriority(from);
  if (!result.ok) throw new Error(result.reason);
  return result.priority;
}

/** Whether `id` is the currently configured default. */
export function isDefaultPriority(
  id: string,
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): boolean {
  const result = resolveDefaultPriority(from);
  return result.ok && result.priority.id === id;
}

/* ------------------------------------------------------------- displaying */

export type PriorityDisplay = {
  readonly label: string;
  /** False when the reference matches no configured value. */
  readonly known: boolean;
  /**
   * True for a value that is no longer selectable but is still held by this
   * Lead (§192, §207). The screens say so rather than hiding it.
   */
  readonly retired: boolean;
  readonly tone?: PriorityTone;
};

/**
 * How to show one Lead's priority.
 *
 * An unrecognised reference is reported as unknown. It is never quietly read
 * as Hot, Warm, Cold or anything else: guessing would put a priority in front
 * of the client that no record actually holds.
 */
export function displayPriority(
  id: string | null | undefined,
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): PriorityDisplay {
  if (id === null || id === undefined || id === "") {
    return { label: UNKNOWN_PRIORITY_LABEL, known: false, retired: false };
  }
  const priority = priorityById(id, from);
  if (!priority) {
    return { label: UNKNOWN_PRIORITY_LABEL, known: false, retired: false };
  }
  return {
    label: priority.label,
    known: true,
    retired: !priority.active,
    ...(priority.tone === undefined ? {} : { tone: priority.tone }),
  };
}

/** The label alone, for a text-only surface. Never a guess. */
export function priorityLabel(
  id: string | null | undefined,
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): string {
  return displayPriority(id, from).label;
}

/**
 * Sort Leads by configured priority order (§37 "sorting by Priority, using the
 * order Admin configured in Section 192").
 *
 * An unknown reference sorts last rather than being treated as any real value.
 */
export function comparePriorityIds(
  a: string | null | undefined,
  b: string | null | undefined,
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): number {
  const rank = (id: string | null | undefined) => {
    const found = id ? priorityById(id, from) : undefined;
    return found ? found.order : Number.MAX_SAFE_INTEGER;
  };
  return rank(a) - rank(b);
}

/* ---------------------------------------------------------- import matching */

export type PriorityMatch =
  | { readonly matched: true; readonly priority: LeadPriority }
  | { readonly matched: false; readonly raw: string };

/**
 * Match an uploaded Priority cell against the configured values (§149).
 *
 * Case and surrounding space are forgiven; nothing else is. §149: "the import
 * must not create new priority values automatically", and an unmatched value
 * is handed to the user to map rather than converted. Only an ACTIVE value can
 * be matched into, so an import cannot revive a deactivated one.
 */
export function matchImportedPriority(
  raw: string,
  from: readonly LeadPriority[] = LEAD_PRIORITIES,
): PriorityMatch {
  const needle = raw.trim().toLocaleLowerCase();
  if (needle === "") return { matched: false, raw };
  const found = selectablePriorities(from).find(
    (p) => p.label.toLocaleLowerCase() === needle,
  );
  return found ? { matched: true, priority: found } : { matched: false, raw };
}

/* --------------------------------------------------- Admin configuration */

/**
 * The operations §192 permits, and only those: add, rename, reorder,
 * deactivate, reactivate.
 *
 * Deletion is deliberately absent. §192 requires a deactivated value to remain
 * on the Leads holding it, and §207 forbids rewriting history, so there is no
 * safe meaning for removing a value outright.
 *
 * Each function is pure: it returns a new configuration or a reason, and never
 * mutates. Nothing here touches a role, a team or an assignment.
 */
export type ConfigResult =
  | { readonly ok: true; readonly config: readonly LeadPriority[] }
  | { readonly ok: false; readonly reason: string };

function duplicateLabel(
  config: readonly LeadPriority[],
  label: string,
  exceptId?: string,
): boolean {
  const needle = label.trim().toLocaleLowerCase();
  return config.some(
    (p) => p.id !== exceptId && p.label.toLocaleLowerCase() === needle,
  );
}

/** Add a new active value at the end of the configured order (§192). */
export function addPriority(
  config: readonly LeadPriority[],
  label: string,
  id: string,
): ConfigResult {
  const trimmed = label.trim();
  if (trimmed === "") {
    return { ok: false, reason: "Give the priority value a name." };
  }
  if (duplicateLabel(config, trimmed)) {
    return {
      ok: false,
      reason: `There is already a priority value called ${trimmed}.`,
    };
  }
  if (config.some((p) => p.id === id)) {
    return { ok: false, reason: "That priority id is already in use." };
  }
  const order = Math.max(0, ...config.map((p) => p.order)) + 1;
  return {
    ok: true,
    // A new value is active but never the default — §38's default is an
    // explicit choice, not a side effect of adding something.
    config: [
      ...config,
      { id, label: trimmed, order, active: true, isDefault: false },
    ],
  };
}

/**
 * Rename a value (§192).
 *
 * The id is untouched, which is what keeps §207 true: Leads and history go on
 * referencing the same value, and past entries keep the label they recorded.
 */
export function renamePriority(
  config: readonly LeadPriority[],
  id: string,
  label: string,
): ConfigResult {
  const trimmed = label.trim();
  if (!config.some((p) => p.id === id)) {
    return { ok: false, reason: "That priority value no longer exists." };
  }
  if (trimmed === "") {
    return { ok: false, reason: "Give the priority value a name." };
  }
  if (duplicateLabel(config, trimmed, id)) {
    return {
      ok: false,
      reason: `There is already a priority value called ${trimmed}.`,
    };
  }
  return {
    ok: true,
    config: config.map((p) => (p.id === id ? { ...p, label: trimmed } : p)),
  };
}

/** Move a value one place up or down the configured order (§192). */
export function reorderPriority(
  config: readonly LeadPriority[],
  id: string,
  direction: "up" | "down",
): ConfigResult {
  const ordered = orderedPriorities(config);
  const index = ordered.findIndex((p) => p.id === id);
  if (index === -1) {
    return { ok: false, reason: "That priority value no longer exists." };
  }
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ordered.length) {
    return { ok: false, reason: "It is already at the end of the order." };
  }
  const moved = [...ordered];
  const a = moved[index]!;
  const b = moved[swapWith]!;
  moved[index] = b;
  moved[swapWith] = a;
  // Re-number from the new positions, so `order` always reflects the list.
  return {
    ok: true,
    config: moved.map((p, i) => ({ ...p, order: i + 1 })),
  };
}

/**
 * Deactivate a value (§192).
 *
 * §192 does NOT require the Leads holding it to be moved first — unlike a
 * pipeline stage under §40 — because the value stays on them and keeps
 * displaying. The one thing that cannot happen is deactivating the last active
 * value, since §192 also requires every Lead to have exactly one priority and
 * there would be nothing left to give a new one.
 */
export function deactivatePriority(
  config: readonly LeadPriority[],
  id: string,
): ConfigResult {
  const target = config.find((p) => p.id === id);
  if (!target) {
    return { ok: false, reason: "That priority value no longer exists." };
  }
  if (!target.active) {
    return { ok: false, reason: `${target.label} is already deactivated.` };
  }
  if (config.filter((p) => p.active).length === 1) {
    return {
      ok: false,
      reason:
        "At least one priority value has to stay active, because every Lead must have one.",
    };
  }
  if (target.isDefault) {
    // §38 and §149 both read the configured default. Deactivating it while it
    // is still the default would silently change the priority every new Lead
    // and every import receives.
    return {
      ok: false,
      reason: `${target.label} is the default for new Leads. Another active value has to be made the default before this one can be deactivated.`,
    };
  }
  return {
    ok: true,
    config: config.map((p) => (p.id === id ? { ...p, active: false } : p)),
  };
}

/**
 * Make `id` the configured default (§38, §149).
 *
 * Exactly one value carries the flag afterwards, and it is always an active
 * one. Pure, explicit, and never inferred from the order — §38 reserves
 * order-derived defaults for Stage, not Priority.
 *
 * Which ROLE may do this is not settled: §192's list of Admin operations does
 * not include it. See `SET_DEFAULT_AUTHORITY_PENDING`. The function exists
 * because §38 and §149 presuppose the setting; no screen offers it as an
 * action until A&S Fincare confirm who owns it.
 */
export function setDefaultPriority(
  config: readonly LeadPriority[],
  id: string,
): ConfigResult {
  const target = config.find((p) => p.id === id);
  if (!target) {
    return { ok: false, reason: "That priority value no longer exists." };
  }
  if (!target.active) {
    return {
      ok: false,
      reason: `${target.label} is deactivated, so it cannot be the default for new Leads.`,
    };
  }
  return {
    ok: true,
    config: config.map((p) =>
      p.id === id ? { ...p, isDefault: true } : { ...p, isDefault: false },
    ),
  };
}

/** Reactivate a previously deactivated value (§192). */
export function reactivatePriority(
  config: readonly LeadPriority[],
  id: string,
): ConfigResult {
  const target = config.find((p) => p.id === id);
  if (!target) {
    return { ok: false, reason: "That priority value no longer exists." };
  }
  if (target.active) {
    return { ok: false, reason: `${target.label} is already active.` };
  }
  return {
    ok: true,
    // Reactivating never makes something the default again: the flag is cleared
    // so the configured default stays the one that is actually configured.
    config: config.map((p) =>
      p.id === id ? { ...p, active: true, isDefault: false } : p,
    ),
  };
}
