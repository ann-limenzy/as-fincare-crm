import { readFileSync, existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { FLOWS } from "@/lib/wireframes/flows";
import { IMPORT_STEPS } from "@/components/wireframes/import/import-shell";
import {
  ASSIGNMENT_METHODS,
  MAPPED_OWNER_ROWS,
  SALESPERSON_OPTIONS,
  TEAM_LEAD_OPTIONS,
  TEAM_OPTIONS,
  choiceLabel,
  choiceProblem,
  isChoiceComplete,
  rowsFollowingStrategy,
  teamDistribution,
  teamOption,
  type AssignmentChoice,
} from "@/lib/wireframes/import-assignment";
import {
  IMPORT_HISTORY,
  IMPORT_RESULT,
  SETTINGS_USERS,
  VALIDATION_ISSUES,
  VALIDATION_TOTALS,
  isOperationalRole,
} from "@/lib/wireframes/mock-data";
import {
  USER,
  activeMemberships,
  configFor,
  rotationPool,
  teamBySlug,
  userById,
} from "@/lib/wireframes/sales-teams";

/**
 * Batch 2B — the eight-stage bulk import (§144–§161).
 */

const ROUTES = [
  "upload",
  "map",
  "assign",
  "validate",
  "resolve",
  "confirm",
  "process",
  "result",
];

const choice = (over: Partial<AssignmentChoice> = {}): AssignmentChoice => ({
  method: null,
  teamId: "",
  userId: "",
  ...over,
});

describe("eight-stage workflow (§144)", () => {
  /* 1 */
  it("declares exactly eight stages in order", () => {
    expect(IMPORT_STEPS).toEqual([
      "Upload",
      "Map columns",
      "Assign Leads",
      "Validate",
      "Resolve issues",
      "Confirm",
      "Process",
      "Results",
    ]);
    expect(IMPORT_STEPS).toHaveLength(8);
  });

  /* 1 + 2 */
  it("gives every stage its own route", () => {
    for (const r of ROUTES) {
      expect(existsSync(`src/app/wireframes/import/${r}/page.tsx`), r).toBe(
        true,
      );
    }
  });

  /* 2 + 6 */
  it("highlights the correct stage on each screen, with Results as stage 8", () => {
    const stageOf = (file: string) => {
      const src = readFileSync(
        `src/components/wireframes/import/${file}`,
        "utf8",
      );
      return Number(/current=\{(\d+)\}/.exec(src)?.[1]);
    };
    expect(stageOf("upload-screen.tsx")).toBe(0);
    expect(stageOf("mapping-screen.tsx")).toBe(1);
    expect(stageOf("assignment-screen.tsx")).toBe(2);
    expect(stageOf("validation-screen.tsx")).toBe(3);
    expect(stageOf("resolve-screen.tsx")).toBe(4);
    expect(stageOf("confirm-screen.tsx")).toBe(5);
    expect(stageOf("process-screen.tsx")).toBe(6);
    // Stage 8 of 8, zero-indexed.
    expect(stageOf("result-screen.tsx")).toBe(7);
  });

  const links = (file: string) => {
    const src = readFileSync(
      `src/components/wireframes/import/${file}`,
      "utf8",
    );
    return [...src.matchAll(/\/wireframes\/import\/(\w+)/g)].map((m) => m[1]);
  };

  /* 3 */
  it("continues Map → Assign, never straight to Validate", () => {
    expect(links("mapping-screen.tsx")).toContain("assign");
    expect(links("mapping-screen.tsx")).not.toContain("validate");
  });

  /* 4 */
  it("returns Validate → Assign and offers Resolve", () => {
    expect(links("validation-screen.tsx")).toContain("assign");
    expect(links("validation-screen.tsx")).toContain("resolve");
  });

  /* 5 */
  it("sends Confirm through Process before Results", () => {
    expect(links("confirm-screen.tsx")).toContain("process");
    expect(links("confirm-screen.tsx")).not.toContain("result");
    expect(links("process-screen.tsx")).toContain("result");
  });

  it("offers no Back from Processing that could imply an undo", () => {
    const src = readFileSync(
      "src/components/wireframes/import/process-screen.tsx",
      "utf8",
    );
    expect(src).not.toMatch(/>\s*Back\s*</);
    expect(links("process-screen.tsx")).not.toContain("confirm");
  });

  it("registers all eight steps in the presentation flow", () => {
    const flow = FLOWS.find((f) => f.id === "import");
    expect(flow?.steps.map((s) => s.href)).toEqual(
      ROUTES.map((r) => `/wireframes/import/${r}`),
    );
  });
});

describe("Step 3 assignment strategies (§152)", () => {
  /* 7 + 8 */
  it("offers exactly the three permitted strategies", () => {
    expect([...ASSIGNMENT_METHODS].sort()).toEqual([
      "salesperson",
      "team",
      "team-lead",
    ]);
    expect(ASSIGNMENT_METHODS).toHaveLength(3);
  });

  /* 8 */
  it("offers no CRM/default assignment-rule strategy anywhere", () => {
    const src = readFileSync(
      "src/components/wireframes/import/assignment-screen.tsx",
      "utf8",
    );
    for (const banned of [
      "CRM assignment rules",
      "Use default rules",
      "Organization-wide round robin",
      "Automatic fallback",
    ]) {
      expect(src, banned).not.toContain(banned);
    }
    expect(ASSIGNMENT_METHODS).not.toContain("spreadsheet" as never);
    expect(ASSIGNMENT_METHODS).not.toContain("review" as never);
  });

  /* 9 + 10 */
  it("reads each Team's one configuration and defines no batch size of its own", () => {
    for (const option of TEAM_OPTIONS) {
      expect(option.batchSize).toBe(configFor(option.id).batchSize);
    }
    const src = readFileSync("src/lib/wireframes/import-assignment.ts", "utf8");
    // No import-local batch size is declared anywhere in the module.
    expect(src).not.toMatch(/batchSize\s*[:=]\s*\d/);
  });

  /* 11 */
  it("excludes the paused Salesperson from the Health automatic pool", () => {
    const health = teamOption("team-health")!;
    expect(health.eligible).toEqual(["Sneha Thomas", "Neha Thomas"]);
    expect(health.eligible).not.toContain("Divya Mohan");
    expect(health.paused).toContain("Divya Mohan");
  });

  /* 12 */
  it("keeps the paused Salesperson selectable for direct assignment", () => {
    const divya = SALESPERSON_OPTIONS.find((p) => p.id === USER.divya);
    expect(divya).toBeDefined();
    expect(divya!.pausedFromRoundRobin).toBe(true);
    expect(
      isChoiceComplete(choice({ method: "salesperson", userId: USER.divya })),
    ).toBe(true);
  });

  /* 13 */
  it("makes the Life Team strategy invalid because its pool is empty", () => {
    const life = teamOption("team-life")!;
    expect(life.viable).toBe(false);
    const c = choice({ method: "team", teamId: "team-life" });
    expect(isChoiceComplete(c)).toBe(false);
    expect(choiceProblem(c)).toMatch(
      /no member who is active and in round robin/i,
    );
  });

  /* 14 */
  it("offers no inactive user, Admin or Manager for direct assignment", () => {
    const offered = [...TEAM_LEAD_OPTIONS, ...SALESPERSON_OPTIONS].map(
      (p) => p.id,
    );
    for (const u of SETTINGS_USERS) {
      if (u.status !== "Active" || !isOperationalRole(u.role)) {
        expect(offered, u.name).not.toContain(u.id);
      }
    }
    expect(
      TEAM_LEAD_OPTIONS.every((p) => userById(p.id).role === "Team Lead"),
    ).toBe(true);
    expect(
      SALESPERSON_OPTIONS.every((p) => userById(p.id).role === "Salesperson"),
    ).toBe(true);
  });

  /* 15 */
  it("keeps automatic distribution inside the destination Team", () => {
    for (const option of TEAM_OPTIONS) {
      const team = teamBySlug(
        option.id.replace("team-", "") === "health"
          ? "health-insurance"
          : option.id.replace("team-", "") === "motor"
            ? "motor-insurance"
            : "life-investments",
      );
      const members = activeMemberships(team).map(
        (m) => userById(m.userId).name,
      );
      for (const d of teamDistribution(option.id, 50)) {
        expect(members, team.name).toContain(d.name);
      }
    }
  });

  /* 21 */
  it("excludes paused members from the distribution totals", () => {
    const dist = teamDistribution("team-health", 390);
    expect(dist.map((d) => d.name)).toEqual(["Sneha Thomas", "Neha Thomas"]);
    expect(dist.reduce((n, d) => n + d.count, 0)).toBe(390);
    expect(rotationPool(teamBySlug("health-insurance"))).toHaveLength(2);
  });
});

describe("mapped Record Owner precedence (§148)", () => {
  /* 16 */
  it("lets an eligible mapped owner take precedence over the strategy", () => {
    expect(MAPPED_OWNER_ROWS.eligible).toBeGreaterThan(0);
    expect(rowsFollowingStrategy(390)).toBe(390 - MAPPED_OWNER_ROWS.eligible);
  });

  /* 17 */
  it("surfaces an unmatched owner rather than reassigning it silently", () => {
    expect(MAPPED_OWNER_ROWS.unmatched).toBeGreaterThan(0);
    const src = readFileSync(
      "src/components/wireframes/import/assignment-screen.tsx",
      "utf8",
    );
    expect(src).toMatch(/never guessed, and never silently reassigned/i);
  });
});

describe("assignment validity and wording", () => {
  /* 19 */
  it("revalidates a restored choice against current data", () => {
    // Stored while viable, but Life's pool is empty now.
    expect(
      isChoiceComplete(choice({ method: "team", teamId: "team-life" })),
    ).toBe(false);
    // A person who does not exist any more.
    expect(
      isChoiceComplete(choice({ method: "salesperson", userId: "ghost" })),
    ).toBe(false);
    // Right person, wrong strategy: a Team Lead is not a Salesperson.
    expect(
      isChoiceComplete(choice({ method: "salesperson", userId: USER.sneha })),
    ).toBe(false);
    expect(
      isChoiceComplete(choice({ method: "team-lead", userId: USER.sneha })),
    ).toBe(true);
  });

  /* 20 */
  it("labels the strategy identically wherever it is repeated", () => {
    expect(choiceLabel(choice({ method: "team", teamId: "team-health" }))).toBe(
      "Team → Health Insurance Team (round robin, batch size 1)",
    );
    expect(
      choiceLabel(choice({ method: "team-lead", userId: USER.sneha })),
    ).toBe("Team Lead → Sneha Thomas (direct assignment)");
    expect(
      choiceLabel(choice({ method: "salesperson", userId: USER.divya })),
    ).toBe("Salesperson → Divya Mohan (direct assignment)");
  });

  /* 22 */
  it("says Team, not Sales Team, across the import surface", () => {
    for (const f of [
      "assignment-screen.tsx",
      "validation-screen.tsx",
      "confirm-screen.tsx",
      "result-screen.tsx",
      "process-screen.tsx",
      "assignment-summary.tsx",
    ]) {
      const src = readFileSync(`src/components/wireframes/import/${f}`, "utf8");
      expect(src, f).not.toMatch(/Sales Teams?\b/);
    }
    const lib = readFileSync("src/lib/wireframes/import-assignment.ts", "utf8");
    // "Sales Team" is not a CRM destination field and must not be listed.
    expect(lib).not.toMatch(/ASSIGNMENT_FIELDS[\s\S]{0,80}Sales Team/);
  });
});

describe("row-count reconciliation (§153, §157, §160)", () => {
  it("splits the 428 source rows into exactly four validation outcomes", () => {
    expect(VALIDATION_TOTALS.found).toBe(428);
    expect(VALIDATION_TOTALS.ready).toBe(390);
    expect(VALIDATION_TOTALS.duplicates).toBe(18);
    expect(VALIDATION_TOTALS.attention).toBe(12);
    expect(VALIDATION_TOTALS.cannotImport).toBe(8);
    expect(
      VALIDATION_TOTALS.ready +
        VALIDATION_TOTALS.duplicates +
        VALIDATION_TOTALS.attention +
        VALIDATION_TOTALS.cannotImport,
    ).toBe(VALIDATION_TOTALS.found);
  });

  it("splits the 390 ready rows into mapped-owner and strategy rows", () => {
    expect(MAPPED_OWNER_ROWS.eligible).toBe(118);
    expect(rowsFollowingStrategy(VALIDATION_TOTALS.ready)).toBe(272);
    expect(
      MAPPED_OWNER_ROWS.eligible +
        rowsFollowingStrategy(VALIDATION_TOTALS.ready),
    ).toBe(VALIDATION_TOTALS.ready);
  });

  it("ties the result's Needs attention figure to the validation total", () => {
    expect(IMPORT_RESULT.needsAttention).toBe(VALIDATION_TOTALS.attention);
    expect(IMPORT_RESULT.cannotImport).toBe(VALIDATION_TOTALS.cannotImport);
  });

  it("never claims every Need Attention row is an owner problem", () => {
    // §157 lists several reasons; an unmatched owner is only one of them.
    const attention = VALIDATION_ISSUES.filter(
      (i) => i.category === "attention",
    );
    const ownerRows = attention.filter(
      (i) => i.problem === "Unknown Record Owner",
    );
    expect(attention.length).toBeGreaterThan(ownerRows.length);
    expect(new Set(attention.map((i) => i.problem)).size).toBeGreaterThan(1);
    // The aggregate category stays generic, never owner-specific.
    expect(IMPORT_RESULT).not.toHaveProperty("unresolved");
    expect(IMPORT_RESULT).not.toHaveProperty("unresolvedOwner");
  });

  it("accounts for every source row in the result, omitting neither bucket", () => {
    expect(IMPORT_RESULT.sourceRows).toBe(VALIDATION_TOTALS.found);
    expect(
      IMPORT_RESULT.imported +
        IMPORT_RESULT.skippedDuplicates +
        IMPORT_RESULT.needsAttention +
        IMPORT_RESULT.cannotImport,
    ).toBe(IMPORT_RESULT.sourceRows);
    // The two exclusion reasons stay distinct: no merged "excluded" figure.
    expect(IMPORT_RESULT).not.toHaveProperty("excluded");
  });

  it("processes only the ready rows", () => {
    const src = readFileSync(
      "src/components/wireframes/import/process-screen.tsx",
      "utf8",
    );
    expect(src).toMatch(/VALIDATION_TOTALS\.ready/);
    const processed = Number(/const PROCESSED = (\d+)/.exec(src)?.[1]);
    expect(processed).toBeLessThanOrEqual(VALIDATION_TOTALS.ready);
  });

  it("reports the same four outcomes in import history", () => {
    const row = IMPORT_HISTORY.find(
      (h) => h.filename === "leads-september.xlsx",
    )!;
    for (const n of [
      IMPORT_RESULT.sourceRows,
      IMPORT_RESULT.imported,
      IMPORT_RESULT.skippedDuplicates,
      IMPORT_RESULT.needsAttention,
      IMPORT_RESULT.cannotImport,
    ]) {
      expect(row.result, String(n)).toContain(String(n));
    }
  });
});

describe("unmatched mapped owner — §148 choices", () => {
  const owner = VALIDATION_ISSUES.find(
    (i) => i.problem === "Unknown Record Owner",
  )!;

  it("surfaces the row rather than importing it", () => {
    expect(owner).toBeDefined();
    expect(owner.category).toBe("attention");
    expect(owner.detail).toContain("Joseph K");
  });

  it("offers all three choices §148 allows", () => {
    expect(owner.actions).toContain(
      "Map to an eligible Team Lead or Salesperson",
    );
    expect(owner.actions).toContain("Apply the Step 3 assignment strategy");
    expect(owner.actions).toContain("Leave unassigned");
  });

  it("makes the Step 3 fallback an explicit decision, never automatic", () => {
    const src = readFileSync(
      "src/components/wireframes/import/resolve-screen.tsx",
      "utf8",
    );
    // Every action is a button the user must press; nothing is preselected.
    expect(src).toMatch(/issue\.actions\.map/);
    expect(src).toMatch(/never guessed at/i);
  });
});
