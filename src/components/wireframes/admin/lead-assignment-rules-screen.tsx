"use client";

import { Info, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";

import { CrmChrome } from "@/components/wireframes/crm-chrome";
import {
  Breadcrumbs,
  StatusChip,
  TeamLeadBadge,
  WarningChip,
  buttonClass,
} from "@/components/wireframes/teams/team-parts";
import {
  Avatar,
  Note,
  Panel,
  ScreenHeading,
} from "@/components/wireframes/wf-ui";
import {
  SALES_TEAMS,
  activeMemberships,
  configFor,
  configStatus,
  initialsOf,
  managerOf,
  nextAutomaticRecipients,
  rotationPool,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";
import { cn } from "@/lib/utils";

/**
 * T3 — Automatic Lead Assignment (Settings → Lead Assignment, spec §189.1).
 *
 * One configuration per team, and no way to create a second. §189.1 selects
 * a destination team first; that team's single configuration then decides
 * which eligible member receives the Lead. Every approved automatic path
 * into a team — manual Lead creation, bulk import, an authorized
 * reassignment — shares this one batch size, pool and rotation position.
 *
 * There is deliberately no rule list, no Add Rule action and no Lead-Source
 * routing: §190 makes Lead Source reporting data, not an assignment input.
 */

const PREVIEW_LENGTH = 6;

export function AutomaticLeadAssignmentScreen() {
  return (
    <CrmChrome active="settings">
      <div className="flex min-w-0 flex-col gap-5">
        <Breadcrumbs
          items={[
            { label: "Settings", href: "/wireframes/admin/settings" },
            { label: "Automatic Lead Assignment" },
          ]}
        />

        <ScreenHeading
          title="Automatic Lead Assignment"
          description="Each team has one round-robin configuration. Once a destination team is chosen, that configuration decides which eligible member receives the Lead."
          actions={
            <Link
              href="/wireframes/admin/teams"
              className={buttonClass("outline")}
            >
              <UsersRound className="size-4" aria-hidden="true" />
              Teams
            </Link>
          }
        />

        <Note icon={Info}>
          <strong className="font-semibold">One configuration per team.</strong>{" "}
          Choosing the destination team and distributing within it are separate
          steps. A team cannot have two batch sizes, two pools or two rotation
          positions, so there is nothing to add and nothing to choose between.
        </Note>

        <Panel
          title="Teams"
          icon={UsersRound}
          count={SALES_TEAMS.length}
          bodyClassName="flex flex-col gap-3 p-4 sm:p-5"
        >
          {SALES_TEAMS.map((team) => {
            const config = configFor(team.id);
            const status = configStatus(team);
            const pool = rotationPool(team);
            const paused = activeMemberships(team).filter(
              (m) => m.pausedFromRoundRobin,
            );
            const lead = teamLeadOf(team);
            const leadUser = lead ? userById(lead.userId) : null;
            const preview = nextAutomaticRecipients(team, PREVIEW_LENGTH);
            return (
              <article
                key={team.id}
                aria-label={team.name}
                className="surface-solid flex flex-col gap-3 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {team.name}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {leadUser ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar
                            initials={initialsOf(leadUser.name)}
                            size="sm"
                          />
                          {leadUser.name}
                          <TeamLeadBadge className="px-2 text-[10px]" />
                        </span>
                      ) : (
                        <span>No active Team Lead</span>
                      )}
                      <span>
                        Reports to {managerOf(team).name} (
                        {managerOf(team).role})
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={team.status} />
                    {status === "Ready" ? (
                      <span className="inline-flex w-fit items-center rounded-full border border-success/30 bg-success-subtle px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-success-on-subtle">
                        Ready
                      </span>
                    ) : (
                      <WarningChip>{status}</WarningChip>
                    )}
                    {team.detailHref ? (
                      <Link
                        href="/wireframes/admin/lead-assignment/health-insurance"
                        className={buttonClass("outline", "px-3")}
                      >
                        Edit
                      </Link>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Edit page not in this walkthrough
                      </span>
                    )}
                  </div>
                </div>

                <dl className="grid gap-3 sm:grid-cols-3">
                  <Fact label="Round-robin batch size">
                    <span className="tabular-nums">{config.batchSize}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {config.batchSize === 1
                        ? "Lead each, in turn"
                        : "consecutive Leads each"}
                    </span>
                  </Fact>
                  <Fact label="In round robin">
                    {pool.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      pool.map((id) => userById(id).name).join(", ")
                    )}
                  </Fact>
                  <Fact label="Paused from round robin">
                    {paused.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      paused.map((m) => userById(m.userId).name).join(", ")
                    )}
                  </Fact>
                </dl>

                <div>
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Next automatic Leads
                  </p>
                  {preview.length === 0 ? (
                    <p className="mt-1 text-xs leading-relaxed text-danger-on-subtle">
                      No eligible members, so automatic assignment waits. New
                      Leads for this team stay unassigned against it. Nothing
                      falls back to another team, an Admin or a Manager.
                    </p>
                  ) : (
                    <ol className="mt-1 flex flex-wrap items-center gap-1.5">
                      {preview.map((id, i) => (
                        <li
                          key={`${id}-${i}`}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className={cn(
                              "rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground",
                            )}
                          >
                            {userById(id).name.split(" ")[0]}
                          </span>
                          {i < preview.length - 1 ? (
                            <span
                              aria-hidden="true"
                              className="text-muted-foreground"
                            >
                              →
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {paused.length > 0 ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {paused.map((m) => userById(m.userId).name).join(", ")}{" "}
                    {paused.length === 1 ? "is" : "are"} skipped by automatic
                    assignment while paused, and may still be given a Lead by an
                    authorized manual assignment.
                  </p>
                ) : null}
              </article>
            );
          })}
        </Panel>

        <Note icon={ShieldCheck}>
          Changing a batch size updates that team&apos;s existing configuration.
          It affects future automatic assignments only, and never rewrites who
          already owns a Lead. Configuring assignment is not a permission: it
          changes no role&apos;s visibility or authorization.
        </Note>
      </div>
    </CrmChrome>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}
