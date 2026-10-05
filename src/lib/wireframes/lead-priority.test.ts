import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONVERSATIONS,
  CRM_FIELDS,
  COLUMN_MAPPINGS,
  IMPORT_FILE,
  IMPORT_RESULT,
  LEAD_PRIORITY_COUNTS,
  LEAD_RECORD,
  NEW_LEADS,
  PIPELINE_STAGES,
  PIPELINE_TOTALS,
  PRIORITY_AUDIT,
  RECORD_ACTIVITY,
  SALES_LEADS,
  VALIDATION_ISSUES,
  VALIDATION_TOTALS,
} from "@/lib/wireframes/mock-data";
import {
  LEAD_PRIORITIES,
  SET_DEFAULT_AUTHORITY_PENDING,
  defaultPriorityProblem,
  isDefaultPriority,
  type LeadPriority,
  UNKNOWN_PRIORITY_LABEL,
  addPriority,
  comparePriorityIds,
  deactivatePriority,
  defaultPriority,
  displayPriority,
  isSelectablePriority,
  matchImportedPriority,
  orderedPriorities,
  priorityById,
  priorityLabel,
  reactivatePriority,
  renamePriority,
  reorderPriority,
  resolveDefaultPriority,
  selectablePriorities,
  setDefaultPriority,
} from "@/lib/wireframes/lead-priority";
import * as leadPriority from "@/lib/wireframes/lead-priority";
import {
  SALES_TEAMS,
  USER,
  configFor,
  nextAutomaticRecipients,
  rotationPool,
  teamBySlug,
} from "@/lib/wireframes/sales-teams";

/**
 * Batch 4A — Lead Priority (spec §192, with §40, §191, §37, §38, §149, §153,
 * §207, §208).
 *
 * The whole point of the batch is that Priority is its own field. Most of what
 * follows is therefore about what Priority must NOT touch.
 */

const HOT = "lp-hot";
const WARM = "lp-warm";
const COLD = "lp-cold";

/**
 * A synthetic deactivated value, for the §192 and §207 rules about values that
 * are no longer selectable.
 *
 * Deliberately not in the shipped configuration and deliberately not a
 * plausible business label: the rendered wireframes must show A&S Fincare only
 * the three values §192 confirms, never a fourth they did not approve.
 */
const TEST_RETIRED = "lp-test-retired";
const TEST_RETIRED_LABEL = "Test Retired Value";

/** Hot, Warm (default), Cold, plus the synthetic deactivated value. */
const WITH_RETIRED: readonly LeadPriority[] = [
  ...LEAD_PRIORITIES,
  {
    id: TEST_RETIRED,
    label: TEST_RETIRED_LABEL,
    order: 4,
    active: false,
  },
];

/* ------------------------------------------- 1, 2, 13. one shared model */

describe("one shared configuration (§192)", () => {
  /* 1 */
  it("holds Hot, Warm and Cold as §192's initial active values", () => {
    expect(selectablePriorities().map((p) => p.label)).toEqual([
      "Hot",
      "Warm",
      "Cold",
    ]);
  });

  /* 1b */
  it("defines them in exactly one place", () => {
    // A screen with its own ["Hot","Warm","Cold"] array would stop matching the
    // configuration the moment an administrator renamed one (§192: these are
    // "configurable data, not fixed constants").
    const offenders: string[] = [];
    for (const file of walk("src/components").concat(
      walk("src/app"),
      walk("src/lib").filter(
        (f) => !f.endsWith(join("wireframes", "lead-priority.ts")),
      ),
    )) {
      const source = codeOnly(readFileSync(file, "utf8"));
      // A literal list of the three values, in any order, is the giveaway.
      if (
        /["']Hot["']\s*,\s*["']Warm["']|["']Warm["']\s*,\s*["']Cold["']/.test(
          source,
        )
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  /* 2 */
  it("identifies values by stable id, never by label", () => {
    for (const p of LEAD_PRIORITIES) {
      expect(p.id, p.label).toMatch(/^lp-[a-z-]+$/);
      expect(p.id, p.label).not.toBe(p.label);
    }
    expect(new Set(LEAD_PRIORITIES.map((p) => p.id)).size).toBe(
      LEAD_PRIORITIES.length,
    );
    // Every Lead reference is an id from the configuration.
    const ids = new Set(LEAD_PRIORITIES.map((p) => p.id));
    expect(ids.has(LEAD_RECORD.priorityId)).toBe(true);
    for (const lead of SALES_LEADS) {
      if (lead.priorityId)
        expect(ids.has(lead.priorityId), lead.name).toBe(true);
    }
  });

  /* 2b */
  it("survives a rename, because Leads reference the id", () => {
    const renamed = renamePriority(LEAD_PRIORITIES, HOT, "Urgent");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    // Same id, new label — a Lead holding `lp-hot` now reads "Urgent".
    expect(priorityById(HOT, renamed.config)!.label).toBe("Urgent");
    expect(displayPriority(HOT, renamed.config).label).toBe("Urgent");
  });

  /* 13 */
  it("orders values by configuration, not alphabetically", () => {
    expect(orderedPriorities().map((p) => p.label)).toEqual([
      "Hot",
      "Warm",
      "Cold",
    ]);
    // Alphabetical would be Cold, Hot, Warm — so this is a real order.
    expect(orderedPriorities().map((p) => p.label)).not.toEqual(
      [...orderedPriorities().map((p) => p.label)].sort(),
    );
    expect(comparePriorityIds(HOT, COLD)).toBeLessThan(0);
    expect(comparePriorityIds(COLD, HOT)).toBeGreaterThan(0);
  });

  /* 13b */
  it("sorts an unknown reference last rather than as a real value", () => {
    expect(comparePriorityIds("lp-nope", COLD)).toBeGreaterThan(0);
    expect(
      comparePriorityIds("lp-nope", TEST_RETIRED, WITH_RETIRED),
    ).toBeGreaterThan(0);
  });
});

/* --------------------------------------- 3, 4, 5. Stage versus Priority */

describe("Stage and Priority are separate fields (§40, §43, §191, §192)", () => {
  /* 3 */
  it("keeps them as two distinct fields on a Lead", () => {
    expect(LEAD_RECORD.stage).toBe("Interested");
    expect(LEAD_RECORD.priorityId).toBe(WARM);
    expect(LEAD_RECORD.stage).not.toBe(LEAD_RECORD.priorityId);
  });

  /* 3b */
  it("never offers a priority value as a pipeline stage", () => {
    // §40: Hot, Warm and Cold "are priority values, not pipeline stages, and
    // must never be added to the pipeline".
    const labels = new Set(LEAD_PRIORITIES.map((p) => p.label));
    for (const stage of PIPELINE_STAGES) {
      expect(labels.has(stage.name), stage.name).toBe(false);
    }
  });

  /* 3c */
  it("never offers a pipeline stage as a priority value", () => {
    const stages = new Set(PIPELINE_STAGES.map((s) => s.name));
    for (const p of LEAD_PRIORITIES) {
      expect(stages.has(p.label), p.label).toBe(false);
    }
  });

  /* 4 */
  it("changing priority leaves the stage untouched", () => {
    const lead = { ...LEAD_RECORD };
    const changed = { ...lead, priorityId: HOT };
    expect(changed.priorityId).toBe(HOT);
    expect(changed.stage).toBe(lead.stage);
    // No helper in the priority module can reach a stage at all.
    const source = readFileSync("src/lib/wireframes/lead-priority.ts", "utf8");
    expect(codeOnly(source)).not.toMatch(/stage/i);
  });

  /* 5 */
  it("changing stage leaves the priority untouched", () => {
    const lead = { ...LEAD_RECORD };
    const moved = { ...lead, stage: "Won" };
    expect(moved.stage).toBe("Won");
    expect(moved.priorityId).toBe(lead.priorityId);
  });
});

/* ------------------------------ 6, 7, 8. priority changes nothing else */

describe("priority is business data and nothing more (§192, §2.6)", () => {
  /* 6 */
  it("does not touch Record Owner", () => {
    const lead = SALES_LEADS.find((l) => l.priorityId)!;
    const changed = { ...lead, priorityId: HOT };
    expect(changed.owner).toBe(lead.owner);
    expect(changed.access).toBe(lead.access);
  });

  /* 7 */
  it("does not touch conversation assignment", () => {
    // A WhatsApp conversation has an assignee; no priority field reaches it.
    for (const c of CONVERSATIONS) {
      expect(c, c.id).not.toHaveProperty("priorityId");
    }
    const source = readFileSync("src/lib/wireframes/lead-priority.ts", "utf8");
    expect(codeOnly(source)).not.toMatch(
      /assign|conversation|owner|round.?robin|team/i,
    );
  });

  /* 8 */
  it("does not touch round robin, batch size or team selection", () => {
    const motor = teamBySlug("motor-insurance");
    const poolBefore = [...rotationPool(motor)];
    const nextBefore = [...nextAutomaticRecipients(motor, 2)];
    const batchBefore = configFor(motor.id).batchSize;

    // Every change the configuration permits, applied in turn.
    const changes = [
      addPriority(LEAD_PRIORITIES, "Urgent", "lp-urgent"),
      renamePriority(LEAD_PRIORITIES, HOT, "Blazing"),
      reorderPriority(LEAD_PRIORITIES, COLD, "up"),
      deactivatePriority(LEAD_PRIORITIES, COLD),
      reactivatePriority(WITH_RETIRED, TEST_RETIRED),
    ];
    for (const change of changes) expect(change.ok).toBe(true);

    expect(rotationPool(motor)).toEqual(poolBefore);
    expect(nextAutomaticRecipients(motor, 2)).toEqual(nextBefore);
    expect(configFor(motor.id).batchSize).toBe(batchBefore);
    // One configuration per team, untouched.
    expect(SALES_TEAMS.length).toBe(3);
  });

  /* 8b */
  it("gives a Hot Lead no special routing", () => {
    // No module may branch on a priority to decide a destination. There is no
    // such rule in the specification, so there must be no such code.
    for (const file of walk("src/lib/wireframes").concat(
      walk("src/components/wireframes"),
    )) {
      const source = codeOnly(readFileSync(file, "utf8"));
      expect(source, file).not.toMatch(
        /lp-hot['"]?\s*(?:\?|&&|===.*(?:team|owner|assign))/i,
      );
    }
    // And the assignment helpers accept no priority argument.
    expect(nextAutomaticRecipients.length).toBeLessThanOrEqual(2);
  });
});

/* ----------------------- 9, 10, 11, 12. selectable versus historical */

describe("deactivated values (§192, §207)", () => {
  /* 9 */
  it("offers every active value for selection", () => {
    for (const id of [HOT, WARM, COLD]) {
      expect(isSelectablePriority(id), id).toBe(true);
    }
  });

  /* 10 */
  it("never offers a deactivated value for a new selection", () => {
    expect(isSelectablePriority(TEST_RETIRED, WITH_RETIRED)).toBe(false);
    expect(selectablePriorities(WITH_RETIRED).map((p) => p.id)).not.toContain(
      TEST_RETIRED,
    );
    // The shipped configuration has nothing deactivated at all.
    expect(LEAD_PRIORITIES.every((p) => p.active)).toBe(true);
  });

  /* 11 */
  it("keeps a deactivated value on the Lead that holds it, and displays it", () => {
    // A Lead created while the value was still active goes on holding it.
    const existingLead = { ...SALES_LEADS[0]!, priorityId: TEST_RETIRED };
    const shown = displayPriority(existingLead.priorityId, WITH_RETIRED);
    expect(shown.known).toBe(true);
    expect(shown.retired).toBe(true);
    expect(shown.label).toBe(TEST_RETIRED_LABEL);
    // §192: not erased from the configuration, so it can still be resolved.
    expect(priorityById(TEST_RETIRED, WITH_RETIRED)).toBeDefined();
  });

  /* 12 */
  it("does not fall back to any real value for an unknown reference", () => {
    for (const bad of ["lp-nope", "Hot", "", null, undefined]) {
      const shown = displayPriority(bad);
      expect(shown.known, String(bad)).toBe(false);
      expect(shown.label, String(bad)).toBe(UNKNOWN_PRIORITY_LABEL);
      expect(shown.tone, String(bad)).toBeUndefined();
    }
    expect(priorityLabel("lp-nope")).toBe(UNKNOWN_PRIORITY_LABEL);
    // Emphatically not one of the configured labels.
    for (const p of LEAD_PRIORITIES) {
      expect(priorityLabel("lp-nope")).not.toBe(p.label);
    }
  });
});

/* --------------------------- 14, 15. the Admin operations §192 permits */

describe("Admin configuration offers exactly §192's operations", () => {
  /* 14 */
  it("supports add, rename, reorder, deactivate and reactivate", () => {
    expect(addPriority(LEAD_PRIORITIES, "Urgent", "lp-urgent").ok).toBe(true);
    expect(renamePriority(LEAD_PRIORITIES, HOT, "Blazing").ok).toBe(true);
    expect(reorderPriority(LEAD_PRIORITIES, COLD, "up").ok).toBe(true);
    expect(deactivatePriority(LEAD_PRIORITIES, COLD).ok).toBe(true);
    expect(reactivatePriority(WITH_RETIRED, TEST_RETIRED).ok).toBe(true);
  });

  /* 14b */
  it("offers no deletion at all", () => {
    // §192 lists five operations and no removal; §207 forbids rewriting
    // history. A delete would have no safe meaning.
    for (const name of Object.keys(leadPriority as Record<string, unknown>)) {
      expect(name.toLowerCase(), name).not.toMatch(/delete|remove|destroy/);
    }
  });

  /* 14c */
  it("adds a value as active, at the end of the order", () => {
    const added = addPriority(LEAD_PRIORITIES, "Urgent", "lp-urgent");
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const last = orderedPriorities(added.config).at(-1)!;
    expect(last.id).toBe("lp-urgent");
    expect(last.active).toBe(true);
    // Adding never claims the default (§38: an explicit choice).
    expect(last.isDefault).toBe(false);
    // Nothing else moved.
    expect(
      orderedPriorities(added.config)
        .slice(0, 3)
        .map((p) => p.id),
    ).toEqual(orderedPriorities().map((p) => p.id));
  });

  /* 14d */
  it("refuses an empty or duplicate label", () => {
    expect(addPriority(LEAD_PRIORITIES, "   ", "lp-x").ok).toBe(false);
    expect(addPriority(LEAD_PRIORITIES, "hot", "lp-x").ok).toBe(false);
    expect(renamePriority(LEAD_PRIORITIES, WARM, "Cold").ok).toBe(false);
    expect(renamePriority(LEAD_PRIORITIES, WARM, "").ok).toBe(false);
    // Renaming to its own current label is not a duplicate.
    expect(renamePriority(LEAD_PRIORITIES, WARM, "Warm").ok).toBe(true);
  });

  /* 14e */
  it("reorders without needing the Leads to be moved first", () => {
    const moved = reorderPriority(LEAD_PRIORITIES, COLD, "up");
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(orderedPriorities(moved.config).map((p) => p.label)).toEqual([
      "Hot",
      "Cold",
      "Warm",
    ]);
    // Order is renumbered contiguously, so the list always reflects it.
    expect(orderedPriorities(moved.config).map((p) => p.order)).toEqual([
      1, 2, 3,
    ]);
    expect(reorderPriority(LEAD_PRIORITIES, HOT, "up").ok).toBe(false);
  });

  /* 14f */
  it("deactivates without moving Leads, unlike a pipeline stage", () => {
    // §192 has no "move the Leads first" rule — unlike §40 for stages — because
    // the value stays on them.
    const result = deactivatePriority(LEAD_PRIORITIES, COLD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(priorityById(COLD, result.config)!.active).toBe(false);
    expect(LEAD_PRIORITY_COUNTS[COLD]).toBeGreaterThan(0);
  });

  /* 14g */
  it("refuses to deactivate the last active value", () => {
    // §192 also requires every Lead to have exactly one priority, so something
    // must stay available. Warm is the default, so it has to be handed over
    // before it can be deactivated at all.
    let config: readonly LeadPriority[] = LEAD_PRIORITIES;
    const handOver = setDefaultPriority(config, COLD);
    expect(handOver.ok).toBe(true);
    if (handOver.ok) config = handOver.config;

    for (const id of [HOT, WARM]) {
      const step = deactivatePriority(config, id);
      expect(step.ok, id).toBe(true);
      if (step.ok) config = step.config;
    }
    const last = deactivatePriority(config, COLD);
    expect(last.ok).toBe(false);
    expect(last.ok === false && last.reason).toContain("stay active");
  });

  /* 14h */
  it("refuses to reactivate something already active, and vice versa", () => {
    expect(reactivatePriority(LEAD_PRIORITIES, HOT).ok).toBe(false);
    expect(reactivatePriority(WITH_RETIRED, TEST_RETIRED).ok).toBe(true);
    expect(deactivatePriority(WITH_RETIRED, TEST_RETIRED).ok).toBe(false);
    expect(renamePriority(LEAD_PRIORITIES, "lp-nope", "X").ok).toBe(false);
    expect(reorderPriority(LEAD_PRIORITIES, "lp-nope", "up").ok).toBe(false);
  });

  /* 14i */
  it("never mutates the configuration it was given", () => {
    const before = JSON.stringify(LEAD_PRIORITIES);
    addPriority(LEAD_PRIORITIES, "Urgent", "lp-urgent");
    renamePriority(LEAD_PRIORITIES, HOT, "Blazing");
    reorderPriority(LEAD_PRIORITIES, COLD, "up");
    deactivatePriority(LEAD_PRIORITIES, COLD);
    setDefaultPriority(LEAD_PRIORITIES, HOT);
    expect(JSON.stringify(LEAD_PRIORITIES)).toBe(before);
  });

  /* 15 */
  it("introduces no configurable role-permission editor", () => {
    // §192 and §2.6: configuring priority "must never be presented as a
    // permission setting". So no permission machinery of any kind — and the
    // screen says so in as many words, which is the second assertion below.
    const screen = readFileSync(
      "src/components/wireframes/admin/lead-priority-screen.tsx",
      "utf8",
    );
    const source = codeOnly(
      readFileSync("src/lib/wireframes/lead-priority.ts", "utf8") + screen,
    );
    expect(source).not.toMatch(
      /canEdit|allowRole|grantRole|setPermission|permissionFor|rolePermission|editableRole/i,
    );
    // No role appears as a configurable knob here.
    expect(source).not.toMatch(/role:\s*["']/);
    // And the screen tells the reader outright that these are not permissions.
    expect(screen).toContain("not permissions");
  });

  /* 15b */
  it("resolves the configured default, and the §192 gap is recorded", () => {
    expect(defaultPriority().label).toBe("Warm");
    expect(SET_DEFAULT_AUTHORITY_PENDING).toContain("pending confirmation");
    // §192's five Admin operations do not include choosing the default, so the
    // settings screen offers no such action.
    const screen = readFileSync(
      "src/components/wireframes/admin/lead-priority-screen.tsx",
      "utf8",
    );
    // No such control exists. The comments say why it is absent, so they are
    // stripped before scanning for it.
    expect(codeOnly(screen)).not.toMatch(/Set as default/i);
    expect(screen).toContain("Changing the default is not offered yet");
  });
});

/* ------------------------------ the configured default (§38, §149, §192) */

describe("the configured default is explicit and never substituted", () => {
  /* default 1 */
  it("has exactly one active default", () => {
    const flagged = LEAD_PRIORITIES.filter((p) => p.isDefault);
    expect(flagged.length).toBe(1);
    expect(flagged[0]!.active).toBe(true);
    expect(defaultPriorityProblem()).toBeNull();
    expect(resolveDefaultPriority().ok).toBe(true);
  });

  /* default 2 */
  it("refuses to deactivate the current default", () => {
    const result = deactivatePriority(LEAD_PRIORITIES, WARM);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("default for new Leads");
    expect(result.reason).toContain("before this one can be deactivated");
    // Still active, still the default.
    expect(isDefaultPriority(WARM)).toBe(true);
  });

  /* default 3 */
  it("allows it only once another active value has been made the default", () => {
    const handedOver = setDefaultPriority(LEAD_PRIORITIES, COLD);
    expect(handedOver.ok).toBe(true);
    if (!handedOver.ok) return;
    expect(isDefaultPriority(COLD, handedOver.config)).toBe(true);
    expect(isDefaultPriority(WARM, handedOver.config)).toBe(false);
    // Only now can the old default be deactivated.
    const now = deactivatePriority(handedOver.config, WARM);
    expect(now.ok).toBe(true);
    if (!now.ok) return;
    // And the default is still the one that was explicitly chosen.
    expect(resolveDefaultPriority(now.config).ok).toBe(true);
    expect(defaultPriority(now.config).id).toBe(COLD);
  });

  /* default 4 */
  it("changes the default only explicitly, never as a side effect", () => {
    // Reordering does not move it — §38 reserves order-derived defaults for
    // Stage ("the first active pipeline stage"), not for Priority.
    const reordered = reorderPriority(LEAD_PRIORITIES, COLD, "up");
    expect(reordered.ok).toBe(true);
    if (!reordered.ok) return;
    expect(orderedPriorities(reordered.config)[0]!.id).toBe(HOT);
    expect(defaultPriority(reordered.config).id).toBe(WARM);

    // Renaming does not move it either.
    const renamed = renamePriority(LEAD_PRIORITIES, HOT, "Blazing");
    expect(renamed.ok && defaultPriority(renamed.config).id).toBe(WARM);

    // Adding does not claim it.
    const added = addPriority(LEAD_PRIORITIES, "Urgent", "lp-urgent");
    expect(added.ok && defaultPriority(added.config).id).toBe(WARM);

    // Reactivating does not reclaim it.
    const back = reactivatePriority(WITH_RETIRED, TEST_RETIRED);
    expect(back.ok && defaultPriority(back.config).id).toBe(WARM);

    // Exactly one flag survives every one of those.
    for (const result of [reordered, renamed, added, back]) {
      if (!result.ok) continue;
      expect(result.config.filter((p) => p.isDefault).length).toBe(1);
    }
  });

  /* default 5 */
  it("refuses to make a deactivated or unknown value the default", () => {
    const inactive = setDefaultPriority(WITH_RETIRED, TEST_RETIRED);
    expect(inactive.ok).toBe(false);
    expect(inactive.ok === false && inactive.reason).toContain("deactivated");
    expect(setDefaultPriority(LEAD_PRIORITIES, "lp-nope").ok).toBe(false);
  });

  /* default 6 */
  it("reports a broken default configuration instead of choosing for you", () => {
    const cases: readonly [string, readonly LeadPriority[], RegExp][] = [
      ["no values at all", [], /No Lead Priority values are configured/],
      [
        "nothing active",
        LEAD_PRIORITIES.map((p) => ({ ...p, active: false })),
        /No Lead Priority value is active/,
      ],
      [
        "no default marked",
        LEAD_PRIORITIES.map((p) => ({ ...p, isDefault: false })),
        /No Lead Priority value is marked as the default/,
      ],
      [
        "two defaults",
        LEAD_PRIORITIES.map((p) => ({ ...p, isDefault: true })),
        /More than one Lead Priority value is marked as the default/,
      ],
      [
        "default deactivated behind our back",
        LEAD_PRIORITIES.map((p) =>
          p.id === WARM ? { ...p, active: false } : p,
        ),
        /configured default but has been deactivated/,
      ],
    ];
    for (const [name, config, pattern] of cases) {
      expect(defaultPriorityProblem(config), name).toMatch(pattern);
      const resolved = resolveDefaultPriority(config);
      expect(resolved.ok, name).toBe(false);
      // No value at all is handed back — there is nothing to pick up by mistake.
      expect("priority" in resolved, name).toBe(false);
      // And the throwing form refuses rather than substituting.
      expect(() => defaultPriority(config), name).toThrow();
    }
  });

  /* default 6b */
  it("never silently returns the first active value", () => {
    const noDefault = LEAD_PRIORITIES.map((p) => ({ ...p, isDefault: false }));
    // Hot is first and active; it must NOT be produced.
    expect(orderedPriorities(noDefault)[0]!.id).toBe(HOT);
    expect(resolveDefaultPriority(noDefault).ok).toBe(false);
    expect(() => defaultPriority(noDefault)).toThrow(/marked as the default/);
  });

  /* default 7 */
  it("gives import only the explicitly configured default (§149)", () => {
    const screen = readFileSync(
      "src/components/wireframes/import/mapping-screen.tsx",
      "utf8",
    );
    // The fallback action reads the resolved default, and is withheld entirely
    // when the configuration cannot supply one.
    expect(screen).toContain("resolveDefaultPriority");
    expect(screen).toContain("configuredDefault.ok");
    expect(codeOnly(screen)).not.toMatch(/selectablePriorities\(\)\[0\]/);
    // And a value an import could not match is never converted.
    expect(matchImportedPriority("High").matched).toBe(false);
  });

  /* default 8 */
  it("leaves Stage, ownership, teams and round robin untouched", () => {
    const motor = teamBySlug("motor-insurance");
    const poolBefore = [...rotationPool(motor)];
    const nextBefore = [...nextAutomaticRecipients(motor, 2)];
    const batchBefore = configFor(motor.id).batchSize;
    const ownerBefore = SALES_LEADS.map((l) => l.owner);
    const stageBefore = LEAD_RECORD.stage;

    const moved = setDefaultPriority(LEAD_PRIORITIES, COLD);
    expect(moved.ok).toBe(true);

    expect(rotationPool(motor)).toEqual(poolBefore);
    expect(nextAutomaticRecipients(motor, 2)).toEqual(nextBefore);
    expect(configFor(motor.id).batchSize).toBe(batchBefore);
    expect(SALES_LEADS.map((l) => l.owner)).toEqual(ownerBefore);
    expect(LEAD_RECORD.stage).toBe(stageBefore);
    expect(SALES_TEAMS.length).toBe(3);
  });
});

/* ------------------- Cold Call is a Stage; Cold is a Priority (§40, §191) */

describe("similar wording does not merge the two fields", () => {
  it("lets Cold Call exist as a Stage and Cold as a Priority", () => {
    const stage = PIPELINE_STAGES.find((s) => s.name === "Cold Call");
    const priority = priorityById(COLD);
    expect(stage, "Cold Call stage").toBeDefined();
    expect(priority!.label).toBe("Cold");

    // Different stable ids, in different fields, from different modules.
    expect(stage!.id).not.toBe(priority!.id);
    expect(stage!.id).toBe("p7");
    expect(priority!.id).toBe("lp-cold");
    // Neither name is the other.
    expect(stage!.name).not.toBe(priority!.label);
  });

  it("changing one never changes the other", () => {
    const lead = { ...LEAD_RECORD, stage: "Cold Call", priorityId: COLD };
    const repriced = { ...lead, priorityId: HOT };
    expect(repriced.stage).toBe("Cold Call");
    const restaged = { ...lead, stage: "Won" };
    expect(restaged.priorityId).toBe(COLD);
  });

  it("does not render Cold as an extra pipeline stage", () => {
    // §40: the priority VALUES are never pipeline stages. "Cold Call" is a
    // lead-generation activity and is a legitimate stage name.
    expect(PIPELINE_STAGES.map((s) => s.name)).not.toContain("Cold");
    expect(PIPELINE_STAGES.map((s) => s.name)).toContain("Cold Call");
    for (const p of LEAD_PRIORITIES) {
      expect(
        PIPELINE_STAGES.map((s) => s.name),
        p.label,
      ).not.toContain(p.label);
    }
  });
});

/* ----------------------------- 22, 23, 24. bulk import (§149, §153) */

describe("import keeps Stage and Priority apart (§149, §153)", () => {
  /* 22 */
  it("offers Lead Priority as its own mappable field", () => {
    expect(CRM_FIELDS).toContain("Lead Priority");
    expect(CRM_FIELDS).toContain("Lead Stage");
    const priorityColumns = COLUMN_MAPPINGS.filter(
      (m) => m.crmField === "Lead Priority",
    );
    const stageColumns = COLUMN_MAPPINGS.filter(
      (m) => m.crmField === "Lead Stage",
    );
    expect(priorityColumns.length).toBe(1);
    expect(stageColumns.length).toBe(1);
    // Two different uploaded columns: one cannot populate both (§149).
    expect(priorityColumns[0]!.uploadedColumn).not.toBe(
      stageColumns[0]!.uploadedColumn,
    );
    expect(priorityColumns[0]!.id).not.toBe(stageColumns[0]!.id);
  });

  /* 23 */
  it("matches a known value and refuses to guess an unknown one", () => {
    expect(matchImportedPriority("Hot")).toEqual({
      matched: true,
      priority: priorityById(HOT)!,
    });
    // Case and padding are forgiven; meaning is not invented.
    expect(matchImportedPriority("  warm ").matched).toBe(true);
    for (const raw of ["High", "P1", "Urgent", "", "   "]) {
      expect(matchImportedPriority(raw).matched, raw).toBe(false);
    }
    // A deactivated value cannot be matched into, so import cannot revive one.
    expect(
      matchImportedPriority(TEST_RETIRED_LABEL, WITH_RETIRED).matched,
    ).toBe(false);
  });

  /* 23b */
  it("routes an unknown value into validation as its own issue", () => {
    const issue = VALIDATION_ISSUES.find(
      (i) => i.problem === "Unknown Lead Priority value",
    );
    expect(issue).toBeDefined();
    expect(issue!.category).toBe("attention");
    // §153 lists it separately from "unknown pipeline stage"; both exist.
    expect(
      VALIDATION_ISSUES.some((i) => i.problem === "Unknown Lead Stage"),
    ).toBe(true);
    // The offered actions map or default — never convert.
    expect(issue!.actions.join(" ")).toMatch(/Map to an active priority value/);
    expect(issue!.actions.join(" ")).not.toMatch(/Hot|Warm|Cold/);
  });

  /* 24 */
  it("keeps every import total reconciled", () => {
    expect(
      VALIDATION_TOTALS.ready +
        VALIDATION_TOTALS.duplicates +
        VALIDATION_TOTALS.attention +
        VALIDATION_TOTALS.cannotImport,
    ).toBe(VALIDATION_TOTALS.found);
    expect(IMPORT_RESULT.sourceRows).toBe(VALIDATION_TOTALS.found);
    expect(IMPORT_RESULT.needsAttention).toBe(VALIDATION_TOTALS.attention);
    // The mapping table and the file header agree on the column count.
    expect(IMPORT_FILE.columns).toBe(COLUMN_MAPPINGS.length);
  });
});

/* ----------------------------------- 25. activity and audit (§45, §208) */

describe("priority changes are recorded (§45, §208)", () => {
  /* 25 */
  it("records a priority change as its own activity entry", () => {
    const priorityEntries = RECORD_ACTIVITY.filter(
      (a) => a.kind === "priority",
    );
    const stageEntries = RECORD_ACTIVITY.filter((a) => a.kind === "stage");
    expect(priorityEntries.length).toBeGreaterThan(0);
    expect(stageEntries.length).toBeGreaterThan(0);
    // §45: separate, clearly distinguishable entries.
    for (const entry of priorityEntries) {
      expect(entry.title.toLowerCase()).toContain("priority");
      expect(entry.title.toLowerCase()).not.toContain("stage");
    }
  });

  /* 25b */
  it("audits the actor, the Lead, both values and the time (§208)", () => {
    expect(PRIORITY_AUDIT.length).toBeGreaterThan(0);
    for (const entry of PRIORITY_AUDIT) {
      expect(entry.actorUserId, entry.id).toMatch(/^s\d+$/);
      expect(entry.leadId, entry.id).toBeTruthy();
      expect(entry.toPriorityId, entry.id).toBeTruthy();
      expect(entry.toLabel, entry.id).toBeTruthy();
      expect(entry.at, entry.id).toBeTruthy();
    }
  });

  /* 25c */
  it("snapshots the labels so a rename cannot rewrite history (§207)", () => {
    const entry = PRIORITY_AUDIT.find((e) => e.toPriorityId === COLD)!;
    expect(entry.toLabel).toBe("Cold");
    const renamed = renamePriority(LEAD_PRIORITIES, COLD, "Low");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    // The configuration now reads "Low"; the recorded entry still reads "Cold".
    expect(priorityById(COLD, renamed.config)!.label).toBe("Low");
    expect(entry.toLabel).toBe("Cold");
  });

  /* 25d */
  it("does not imply the actor became the Lead owner (§207)", () => {
    const adminEntry = PRIORITY_AUDIT.find((e) => e.actorUserId === USER.arun)!;
    expect(adminEntry).toBeDefined();
    // An Admin acted; the record's owner is unchanged and is never an Admin.
    const lead = SALES_LEADS.find((l) => l.id === adminEntry.leadId);
    if (lead) expect(lead.owner).not.toBe("Arun Menon");
    expect(adminEntry).not.toHaveProperty("ownerUserId");
  });
});

/* ------------------------------------------- 27. no stale terminology */

describe("no stale priority terminology (§192)", () => {
  /* 27 */
  it("uses none of the retired words for the field", () => {
    const offenders: string[] = [];
    for (const file of walk("src/components/wireframes").concat(
      walk("src/lib/wireframes"),
      walk("src/app/wireframes"),
    )) {
      const source = codeOnly(readFileSync(file, "utf8"));
      // "Lead Temp" survives only as an UPLOADED spreadsheet column name,
      // which is what a customer's own file looks like — not CRM wording.
      if (/temperature|leadRating|\brating\b/i.test(source))
        offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  /* 27b */
  it("keeps the counts and the configuration in step", () => {
    for (const id of Object.keys(LEAD_PRIORITY_COUNTS)) {
      expect(priorityById(id), id).toBeDefined();
    }
    const counted = Object.values(LEAD_PRIORITY_COUNTS).reduce(
      (n, c) => n + c,
      0,
    );
    // §21: the same Leads, counted along the other axis.
    expect(counted).toBe(PIPELINE_TOTALS.total);
  });

  /* 27c */
  it("gives every Lead row on the phone a resolvable priority", () => {
    const leadRows = NEW_LEADS.filter((w) => w.type === "Lead");
    expect(leadRows.length).toBeGreaterThan(0);
    for (const row of leadRows) {
      expect(displayPriority(row.priorityId).known, row.person).toBe(true);
    }
  });
});

/* --------------------------------------------------------------- helpers */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(entry) && !entry.includes(".test.")) out.push(path);
  }
  return out;
}

/** Source without comment lines, so documentation examples are not scanned. */
function codeOnly(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
}
