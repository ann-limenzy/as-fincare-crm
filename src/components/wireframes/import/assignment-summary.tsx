"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Note, Panel } from "@/components/wireframes/wf-ui";
import {
  MAPPED_OWNER_ROWS,
  choiceLabel,
  choiceProblem,
  getAssignmentChoice,
  getAssignmentServerChoice,
  isTeamStrategy,
  rowsFollowingStrategy,
  subscribeToAssignmentChoice,
  teamDistribution,
  teamOption,
} from "@/lib/wireframes/import-assignment";
import { VALIDATION_TOTALS } from "@/lib/wireframes/mock-data";

/**
 * The confirmed assignment strategy, repeated identically wherever §152 and
 * §160 require it: review, issue resolution, confirmation, processing and
 * result. Every screen reads the same store, so none of them can describe a
 * different strategy from the one actually chosen.
 */
export function AssignmentSummary({
  title = "Assignment",
  showDistribution = false,
}: {
  title?: string;
  /** Result and confirmation show the per-person split; earlier steps do not. */
  showDistribution?: boolean;
}) {
  const choice = useSyncExternalStore(
    subscribeToAssignmentChoice,
    getAssignmentChoice,
    getAssignmentServerChoice,
  );
  const problem = choiceProblem(choice);
  const team = teamOption(choice.teamId);
  const strategyRows = rowsFollowingStrategy(VALIDATION_TOTALS.ready);
  const distribution =
    showDistribution && isTeamStrategy(choice) && team
      ? teamDistribution(team.id, strategyRows)
      : [];

  return (
    <Panel title={title} bodyClassName="p-4 sm:p-5">
      <p className="text-sm font-medium text-foreground">
        {choiceLabel(choice)}
      </p>

      {problem ? (
        <Note icon={TriangleAlert} tone="warning" className="mt-2.5">
          {problem}
        </Note>
      ) : null}

      {!problem && isTeamStrategy(choice) && team ? (
        <dl className="mt-2.5 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
          <Row label="Round-robin batch size">
            <span className="tabular-nums">{team.batchSize}</span>
          </Row>
          <Row label="Eligible automatic recipients">
            {team.eligible.join(", ")}
          </Row>
          {team.paused.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="inline font-medium text-muted-foreground">
                Excluded from automatic:
              </dt>{" "}
              <dd className="inline text-foreground">
                {team.paused.join(", ")} — Paused from round robin
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {!problem && !isTeamStrategy(choice) && choice.method !== null ? (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          Direct assignment. No batch size applies and no team&rsquo;s rotation
          position moves.
        </p>
      ) : null}

      {MAPPED_OWNER_ROWS.eligible > 0 ? (
        <Note icon={Info} className="mt-2.5">
          {MAPPED_OWNER_ROWS.eligible} rows name an eligible Record Owner and
          use it instead of the strategy above. {strategyRows} rows follow the
          strategy. {MAPPED_OWNER_ROWS.unmatched} rows name an owner that could
          not be matched and are reported for resolution — never reassigned
          silently.
        </Note>
      ) : null}

      {distribution.length > 0 ? (
        <div className="mt-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            Distribution of the {strategyRows} rows following the strategy
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground">
            {distribution.map((d) => (
              <li key={d.name}>
                {d.name}{" "}
                <span className="text-muted-foreground tabular-nums">
                  {d.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="inline font-medium text-muted-foreground">{label}:</dt>{" "}
      <dd className="inline text-foreground">{children}</dd>
    </div>
  );
}
