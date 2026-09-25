"use client";

import { Info, TriangleAlert, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ImportShell } from "@/components/wireframes/import/import-shell";
import { Note, Panel } from "@/components/wireframes/wf-ui";
import {
  MAPPED_ASSIGNMENT_COLUMN,
  MAPPED_ASSIGNMENT_FIELD,
  SALESPERSON_OPTIONS,
  TEAM_LEAD_OPTIONS,
  TEAM_OPTIONS,
  choiceProblem,
  choiceSummary,
  formatNames,
  getAssignmentChoice,
  getAssignmentServerChoice,
  setAssignmentChoice,
  subscribeToAssignmentChoice,
  teamOption,
  type AssignmentChoice,
  type AssignmentMethod,
  type PersonOption,
} from "@/lib/wireframes/import-assignment";
import {
  SALES_TEAMS,
  managerOf,
  nextAutomaticRecipients,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";
import { cn } from "@/lib/utils";

/**
 * A3 — Choose lead assignment.
 *
 * Sits between Map columns and Validate, because assignment is decided from
 * the mapped columns and then CHECKED with everything else before a single
 * Lead is written. Nothing here assigns anybody: the screen records one
 * choice and says what that choice will cause.
 *
 * The one idea the client needs to take away: a Team is never the Record
 * Owner. A Team is how the CRM finds a person — that Team's one round-robin
 * configuration selects an eligible member for each Lead.
 *
 * §152 permits exactly three strategies and states there is no
 * organization-wide default to fall back on, so nothing is preselected and
 * Continue stays unavailable until a valid choice is made.
 */

type Method = {
  readonly id: AssignmentMethod;
  readonly title: string;
  readonly description: string;
};

const METHODS: readonly Method[] = [
  {
    id: "team-lead",
    title: "Assign to a specific Team Lead",
    description:
      "Every imported Lead receives the selected Team Lead as Record Owner. A direct assignment: no batch size applies.",
  },
  {
    id: "salesperson",
    title: "Assign to a specific Salesperson",
    description:
      "Every imported Lead receives the selected Salesperson as Record Owner. A direct assignment: no batch size applies.",
  },
  {
    id: "team",
    title: "Assign to a Team",
    description:
      "Imported Leads are distributed by that Team's one round-robin configuration, among the members currently in round robin.",
  },
];

/**
 * The choice lives in a module store rather than `useState`, so moving to
 * Validation and pressing Back brings it back. The server snapshot is the
 * default, so nothing reads sessionStorage while rendering on the server.
 */
function useAssignmentChoice(): [
  AssignmentChoice,
  (next: Partial<AssignmentChoice>) => void,
] {
  const choice = useSyncExternalStore(
    subscribeToAssignmentChoice,
    getAssignmentChoice,
    getAssignmentServerChoice,
  );
  return [choice, (next) => setAssignmentChoice({ ...choice, ...next })];
}

export function AssignmentScreen() {
  const [choice, update] = useAssignmentChoice();
  const problem = choiceProblem(choice);
  const canContinue = problem === null;
  const blockedId = "import-assignment-blocked";

  return (
    <ImportShell
      current={2}
      title="Choose how imported Leads are assigned"
      description="Select one assignment method for this import. The choice will be checked before any Lead is created."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Assignment method" bodyClassName="p-4 sm:p-5">
            {/*
              Native radios in a real fieldset: arrow keys move between them,
              Space selects, and the group carries one accessible name — none
              of which a div with role="radio" gives for free.
            */}
            <fieldset className="min-w-0">
              <legend className="mb-3 text-xs text-muted-foreground">
                One method applies to every row in this file.
              </legend>
              <div className="flex flex-col gap-2.5">
                {METHODS.map((method) => (
                  <MethodCard
                    key={method.id}
                    method={method}
                    checked={choice.method === method.id}
                    onSelect={() => update({ method: method.id })}
                  >
                    {method.id === "team" ? (
                      <TeamPicker
                        value={choice.teamId}
                        onChange={(teamId) => update({ teamId })}
                      />
                    ) : null}

                    {method.id === "team-lead" ? (
                      <PersonPicker
                        kind="Team Lead"
                        options={TEAM_LEAD_OPTIONS}
                        value={choice.userId}
                        onChange={(userId) => update({ userId })}
                      />
                    ) : null}

                    {method.id === "salesperson" ? (
                      <PersonPicker
                        kind="Salesperson"
                        options={SALESPERSON_OPTIONS}
                        value={choice.userId}
                        onChange={(userId) => update({ userId })}
                      />
                    ) : null}
                  </MethodCard>
                ))}
              </div>
            </fieldset>
          </Panel>

          <Note icon={Info}>
            A Team is never the Record Owner. A Team decides which people are in
            the rotation; round robin selects one of them for each Lead.
          </Note>

          <MappedOwnerNote />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="What will happen" bodyClassName="p-4 sm:p-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {choiceSummary(choice)}
            </p>

            {/* Before a method is chosen the summary above already says so;
                a second warning would only repeat it. */}
            {choice.method !== null && problem ? (
              <p
                id={blockedId}
                role="alert"
                className="mt-3 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2.5 text-xs leading-relaxed text-warning-on-subtle"
              >
                <TriangleAlert
                  className="me-1.5 inline size-3.5 align-[-2px]"
                  aria-hidden="true"
                />
                {problem}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="ghost" asChild>
                <Link href={"/wireframes/import/map" as Route}>Back</Link>
              </Button>
              {canContinue ? (
                <Button asChild className="ms-auto">
                  <Link href={"/wireframes/import/validate" as Route}>
                    Continue to validation
                  </Link>
                </Button>
              ) : (
                <Button
                  className="ms-auto"
                  disabled
                  aria-describedby={problem ? blockedId : undefined}
                >
                  Continue to validation
                </Button>
              )}
            </div>
          </Panel>

          <Note icon={Info}>
            Nothing is assigned yet. The choice is applied while the rows are
            validated, and only the rows you confirm are ever created.
          </Note>
        </div>
      </div>
    </ImportShell>
  );
}

/* ------------------------------------------------------------------ parts */

/**
 * One selectable method.
 *
 * The label wraps ONLY the radio and its text. Anything interactive the
 * choice reveals — a select — sits outside the label, because a label may
 * contain one labelable control and clicking a nested select would otherwise
 * be swallowed by the radio.
 */
function MethodCard({
  method,
  checked,
  onSelect,
  children,
}: {
  method: Method;
  checked: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-3.5 transition-colors sm:p-4",
        // The focus ring belongs to the card, because the input itself is
        // visually hidden. `has-[:focus-visible]` keeps it a real focus
        // style rather than something React has to track.
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
        checked
          ? "surface-glass-strong border-primary/45"
          : "border-border bg-surface/50 hover:border-border-strong/60 hover:bg-accent/40",
      )}
    >
      <label className="flex min-w-0 cursor-pointer gap-3">
        <input
          type="radio"
          name="import-assignment-method"
          value={method.id}
          checked={checked}
          onChange={onSelect}
          className="sr-only"
        />

        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
            checked ? "border-primary bg-primary" : "border-border-strong",
          )}
        >
          {checked ? (
            <span className="size-1.5 rounded-full bg-primary-foreground" />
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {method.title}
          </span>

          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {method.description}
          </span>
        </span>
      </label>

      {checked && children ? (
        <div className="mt-3 min-w-0 ps-7">{children}</div>
      ) : null}
    </div>
  );
}

const SELECT_CLASS =
  "h-9 w-full min-w-0 rounded-md border border-input bg-surface px-2.5 text-sm text-foreground";

function TeamPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const team = teamOption(value);
  const detail = team ? SALES_TEAMS.find((t) => t.id === team.id) : undefined;
  const lead = detail ? teamLeadOf(detail) : undefined;
  const preview = detail ? nextAutomaticRecipients(detail, 6) : [];

  return (
    <div className="min-w-0">
      <label
        htmlFor="import-assignment-team"
        className="mb-1.5 block text-xs font-medium text-foreground"
      >
        Team
      </label>
      <select
        id="import-assignment-team"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">Choose a Team…</option>
        {TEAM_OPTIONS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} —{" "}
            {t.eligible.length === 0
              ? "no members in round robin"
              : `${t.eligible.length} in round robin`}
          </option>
        ))}
      </select>

      {team && detail ? (
        <dl className="mt-2.5 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
          <Row label="Team Lead">
            {lead ? userById(lead.userId).name : "None"}
          </Row>
          <Row label="Reporting Manager">{managerOf(detail).name}</Row>
          <Row label="Round-robin batch size">
            <span className="tabular-nums">{team.batchSize}</span>
          </Row>
          <Row label="In round robin">
            {team.eligible.length === 0 ? "None" : formatNames(team.eligible)}
          </Row>
          {team.paused.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="inline font-medium text-muted-foreground">
                Excluded from automatic:
              </dt>{" "}
              <dd className="inline text-foreground">
                {team.paused.join(", ")} — Paused from round robin. Still
                available for direct assignment.
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {team && team.viable ? (
        <Note icon={Users} className="mt-2.5">
          Distribution preview:{" "}
          {preview.map((id) => userById(id).name.split(" ")[0]).join(" → ")}
        </Note>
      ) : null}

      {team && !team.viable ? (
        <Note icon={TriangleAlert} tone="warning" className="mt-2.5">
          No eligible automatic recipients. Every member is inactive or paused
          from round robin, so this Team cannot be used for this import. Nothing
          falls back to another Team, an Admin or a Manager.
        </Note>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="inline font-medium text-muted-foreground">{label}:</dt>{" "}
      <dd className="inline text-foreground">{children}</dd>
    </div>
  );
}

function PersonPicker({
  kind,
  options,
  value,
  onChange,
}: {
  kind: "Team Lead" | "Salesperson";
  options: readonly PersonOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const id = `import-assignment-${kind.toLowerCase().replace(" ", "-")}`;
  const selected = options.find((p) => p.id === value);
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-foreground"
      >
        {kind}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">Choose a {kind}…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.teamName ? ` — ${p.teamName}` : ""}
            {p.pausedFromRoundRobin ? " (paused from round robin)" : ""}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Only active Team Leads and Salespersons within your scope are listed.
        Inactive users, Admins and Managers are never eligible Record Owners.
      </p>
      {selected?.pausedFromRoundRobin ? (
        <Note icon={Info} className="mt-2.5">
          {selected.name} is paused from round robin. That withholds them from
          automatic distribution only — a direct assignment like this one is
          still permitted.
        </Note>
      ) : null}
    </div>
  );
}

/**
 * §148: an eligible mapped Record Owner takes precedence for its own row.
 * Reported as it actually stands, so it cannot contradict Map columns.
 */
function MappedOwnerNote() {
  if (!MAPPED_ASSIGNMENT_COLUMN) {
    return (
      <Note tone="neutral">
        No Record Owner column is mapped, so every row will follow the strategy
        chosen above.
      </Note>
    );
  }
  return (
    <Note icon={Info}>
      &ldquo;{MAPPED_ASSIGNMENT_COLUMN}&rdquo; is mapped to{" "}
      {MAPPED_ASSIGNMENT_FIELD}. Where a row names an eligible active Team Lead
      or Salesperson, that owner takes precedence over the strategy above for
      that row. Rows whose owner cannot be matched are reported during
      validation — never guessed, and never silently reassigned.
    </Note>
  );
}
