"use client";

import {
  ArrowDown,
  BellRing,
  CircleAlert,
  FlaskConical,
  Inbox,
  Info,
  RotateCcw,
  Route as RouteIcon,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { CrmChrome } from "@/components/wireframes/crm-chrome";
import {
  Breadcrumbs,
  Consequences,
  RoundRobinChip,
  NothingSaved,
  RoleChip,
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
  activeMemberships,
  hypotheticalPool,
  pausedUserIdsOf,
  initialsOf,
  configFor,
  configStatus,
  managerOf,
  previewRotation,
  teamBySlug,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";
import { cn } from "@/lib/utils";

/**
 * T4 — Round-robin rule detail and pool preview (spec §163.7–163.9).
 *
 * Shows what the rule WOULD do next, computed from the team's own order and
 * each member's round-robin state — never a saved assignment. The demonstration
 * switches change only this preview, so the client can watch the pool
 * shrink to nothing and see Assignment Required take over, then restore a
 * member and see that nobody is compensated.
 *
 * The batch-size control and the pause toggles are demonstration controls:
 * they move this preview and nothing else. Nothing here simulates what §212
 * still leaves open — the default and maximum batch size, or where a newly
 * added member joins the rotation order.
 */

const TEAM = teamBySlug("health-insurance");
const CONFIG = configFor(TEAM.id);
const PREVIEW_LENGTH = 6;

type LastChange = { name: string; to: "Paused" | "Eligible" } | null;

export function LeadAssignmentRuleScreen() {
  const [pausedIds, setPausedIds] = useState<ReadonlySet<string>>(() =>
    pausedUserIdsOf(TEAM),
  );
  const [lastChange, setLastChange] = useState<LastChange>(null);
  const [batchSize, setBatchSize] = useState(CONFIG.batchSize);

  // The preview honours the demonstration controls; the saved configuration
  // is what `nextAutomaticRecipients(TEAM, n)` would return.
  const pool = hypotheticalPool(TEAM, pausedIds);
  const startIndex = Math.max(
    0,
    pool.indexOf(
      pool.find((id) => id !== CONFIG.lastAssignedUserId) ?? pool[0] ?? "",
    ),
  );
  const preview = previewRotation(pool, batchSize, startIndex, PREVIEW_LENGTH);
  const lead = teamLeadOf(TEAM);
  const lastAssigned = CONFIG.lastAssignedUserId
    ? userById(CONFIG.lastAssignedUserId)
    : null;
  const empty = pool.length === 0;
  const saved = pausedUserIdsOf(TEAM);
  const changed =
    pausedIds.size !== saved.size ||
    [...pausedIds].some((id) => !saved.has(id));

  const set = (userId: string, pause: boolean) => {
    setPausedIds((prev) => {
      const next = new Set(prev);
      if (pause) next.add(userId);
      else next.delete(userId);
      return next;
    });
    setLastChange({
      name: userById(userId).name,
      to: pause ? "Paused" : "Eligible",
    });
  };

  const pauseAll = () => {
    setPausedIds(new Set(activeMemberships(TEAM).map((m) => m.userId)));
    setLastChange({ name: "Every member", to: "Paused" });
  };

  const reset = () => {
    setPausedIds(pausedUserIdsOf(TEAM));
    setLastChange(null);
  };

  return (
    <CrmChrome active="settings">
      <div className="flex min-w-0 flex-col gap-5">
        <Breadcrumbs
          items={[
            { label: "Settings", href: "/wireframes/admin/settings" },
            {
              label: "Lead Assignment",
              href: "/wireframes/admin/lead-assignment",
            },
            { label: `Automatic Lead Assignment — ${TEAM.name}` },
          ]}
        />

        <ScreenHeading
          title={`Automatic Lead Assignment — ${TEAM.name}`}
          description="This team's one round-robin configuration. Whenever an approved flow selects this team, the batch size and pool below decide which eligible member receives the Lead."
          actions={
            TEAM.detailHref ? (
              <Link href={TEAM.detailHref} className={buttonClass("outline")}>
                <UsersRound className="size-4" aria-hidden="true" />
                Open {TEAM.name}
              </Link>
            ) : null
          }
        />

        <Panel title="Configuration" icon={RouteIcon}>
          <dl className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
            <Item label="Team">
              {TEAM.detailHref ? (
                <Link
                  href={TEAM.detailHref}
                  className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {TEAM.name}
                </Link>
              ) : (
                TEAM.name
              )}
              <span className="block text-xs text-muted-foreground">
                One configuration per team
              </span>
            </Item>
            <Item label="Reporting Manager">
              <span className="font-semibold">{managerOf(TEAM).name}</span>
              <span className="block text-xs text-muted-foreground">
                {managerOf(TEAM).role} · supervises without being a member
              </span>
            </Item>
            <Item label="Round-robin batch size">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease round-robin batch size"
                  disabled={batchSize <= 1}
                  onClick={() => setBatchSize((n) => Math.max(1, n - 1))}
                  className={buttonClass("outline", "size-11 px-0")}
                >
                  −
                </button>
                <output
                  aria-live="polite"
                  className="min-w-10 text-center text-base font-semibold text-foreground tabular-nums"
                >
                  {batchSize}
                </output>
                <button
                  type="button"
                  aria-label="Increase round-robin batch size"
                  onClick={() => setBatchSize((n) => n + 1)}
                  className={buttonClass("outline", "size-11 px-0")}
                >
                  +
                </button>
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Positive whole number.{" "}
                {batchSize === 1
                  ? "One Lead each, in turn."
                  : `${batchSize} consecutive Leads each before rotating.`}
              </span>
            </Item>
            <Item label="Configuration status">
              {configStatus(TEAM) === "Ready" ? (
                <span className="inline-flex w-fit items-center rounded-full border border-success/30 bg-success-subtle px-2.5 py-0.5 text-xs font-medium text-success-on-subtle">
                  Ready
                </span>
              ) : (
                <WarningChip>{configStatus(TEAM)}</WarningChip>
              )}
              <span className="mt-1 block text-xs text-muted-foreground">
                Updated {CONFIG.updated} by{" "}
                {userById(CONFIG.updatedByUserId).name}
              </span>
            </Item>
            <div className="sm:col-span-2 xl:col-span-4">
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                The default and maximum permitted batch size are still to be
                confirmed with A&amp;S Fincare, so the value above is
                illustrative. Changing it affects future automatic assignments
                only and never rewrites who already owns a Lead.
              </p>
            </div>
          </dl>
        </Panel>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Panel
            title={`Rotation pool — ${TEAM.name}`}
            icon={UsersRound}
            count={`${pool.length} eligible`}
            action={
              changed ? (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Reset demonstration"
                  className={buttonClass("ghost", "px-3")}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Reset
                </button>
              ) : null
            }
          >
            <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
              <p className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                <FlaskConical
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <strong className="font-semibold text-foreground">
                    Demonstration controls.
                  </strong>{" "}
                  They change this preview only. A real pause is applied by the
                  Team Lead in My Team, or by the reporting Manager or an Admin
                  for a Team Lead.
                </span>
              </p>

              <ol className="flex flex-col gap-2">
                {TEAM.rotationOrder.map((userId, i) => {
                  const user = userById(userId);
                  const paused = pausedIds.has(userId);
                  const inPool = pool.includes(userId);
                  const isLead = lead?.userId === userId;
                  return (
                    <li
                      key={userId}
                      className={cn(
                        "surface-solid flex flex-wrap items-center gap-3 rounded-lg p-3",
                        !inPool && "opacity-80",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
                      >
                        {i + 1}
                      </span>
                      <Avatar
                        initials={initialsOf(user.name)}
                        size="sm"
                        tone={inPool ? "primary" : "muted"}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-foreground">
                            {user.name}
                          </span>
                          <RoleChip label={user.role} />
                          {isLead ? <TeamLeadBadge /> : null}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <RoundRobinChip
                            value={
                              paused
                                ? "Paused from round robin"
                                : "In round robin"
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            {inPool
                              ? "Receives automatic Leads"
                              : "Skipped by automatic Leads"}
                          </span>
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => set(userId, !paused)}
                        aria-label={`Demonstration: ${paused ? "resume" : "pause"} ${user.name}`}
                        className={buttonClass("outline", "px-3")}
                      >
                        {paused ? "Resume" : "Pause"}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {pool.length > 0 ? (
                <button
                  type="button"
                  onClick={pauseAll}
                  className={buttonClass("ghost", "self-start px-3")}
                >
                  Pause every eligible member
                </button>
              ) : null}

              <div className="rounded-lg border border-border px-3 py-2.5">
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Current rotation position
                </h3>
                <p className="mt-1 text-sm text-foreground">
                  Last automatic assignment went to{" "}
                  <strong className="font-semibold">
                    {lastAssigned?.name ?? "nobody yet"}
                  </strong>
                  . The next Lead goes to the next eligible member after them in
                  the order above.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pausing or restoring someone never moves this position.
                </p>
              </div>
            </div>
          </Panel>

          <div className="flex min-w-0 flex-col gap-4">
            {empty ? (
              <AssignmentRequiredPanel
                leadName={lead ? userById(lead.userId).name : null}
              />
            ) : (
              <Panel title="Next assignments — preview" icon={ArrowDown}>
                <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
                  <ol className="flex flex-col gap-2">
                    {preview.map((userId, i) => {
                      const user = userById(userId);
                      return (
                        <li
                          key={`${userId}-${i}`}
                          className="flex items-center gap-3 rounded-lg bg-muted/70 px-3 py-2.5"
                        >
                          <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">
                            {PREVIEW_LABELS[i]}
                          </span>
                          <ArrowDown
                            className="size-3.5 shrink-0 -rotate-90 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {user.name}
                            </span>
                            {lead?.userId === userId ? <TeamLeadBadge /> : null}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <Consequences
                    icon={ShieldCheck}
                    items={[
                      `The rotation stays inside ${TEAM.name}. No other team, and no workspace-wide pool, is ever used.`,
                      lead && pool.includes(lead.userId)
                        ? "The Team Lead takes a turn like every other eligible member."
                        : "The Team Lead is paused, so is skipped like any other paused member.",
                      "Paused members are skipped until they are made eligible again.",
                    ]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Preview only — no Lead is assigned.
                  </p>
                </div>
              </Panel>
            )}

            {lastChange ? <ChangeExplanation change={lastChange} /> : null}

            <Note icon={Info} tone="neutral">
              Not shown in this preview, because they are still to be confirmed:
              whether manual assignment moves the rotation, where a newly added
              member joins the order, and any maximum Batch Size.
            </Note>
          </div>
        </div>
      </div>
    </CrmChrome>
  );
}

const PREVIEW_LABELS = ["Next Lead", "Following Lead", "Then", "Then"] as const;

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function AssignmentRequiredPanel({ leadName }: { leadName: string | null }) {
  return (
    <section
      role="alert"
      className="min-w-0 overflow-hidden rounded-xl border border-danger/30 bg-danger-subtle"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-danger/20 px-4 py-3 sm:px-5">
        <CircleAlert
          className="size-4 shrink-0 text-danger-on-subtle"
          aria-hidden="true"
        />
        <h2 className="text-sm font-semibold text-danger-on-subtle">
          No eligible members
        </h2>
        <WarningChip>Assignment warning</WarningChip>
      </header>
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
        <p className="text-[13px] leading-relaxed text-danger-on-subtle">
          This rule cannot choose anyone in {TEAM.name}. New Leads that use it
          are not rejected and not sent elsewhere.
        </p>

        <div className="surface-solid rounded-lg p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Inbox className="size-3.5" aria-hidden="true" />
            What a new Lead looks like now
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Record Owner</dt>
            <dd className="font-medium text-foreground">Unassigned</dd>
            <dt className="text-muted-foreground">State</dt>
            <dd>
              <WarningChip>Assignment Required</WarningChip>
            </dd>
            <dt className="text-muted-foreground">Destination team</dt>
            <dd className="text-foreground">{TEAM.name}</dd>
            <dt className="text-muted-foreground">Reason recorded</dt>
            <dd className="text-foreground">
              No eligible member in the destination team
            </dd>
          </dl>
        </div>

        <Consequences
          icon={CircleAlert}
          items={[
            "The Lead is kept, with no Record Owner, in Assignment Required.",
            <>
              <BellRing
                className="me-1 inline size-3.5 align-[-2px]"
                aria-hidden="true"
              />
              {leadName ? `${leadName} (Team Lead)` : "The Team Lead"} and the
              Admin receive an in-app alert.
            </>,
            "An authorized user can assign it manually.",
            "No fallback: it is never given to another team or to the workspace at large.",
          ]}
        />
      </div>
    </section>
  );
}

function ChangeExplanation({ change }: { change: NonNullable<LastChange> }) {
  return (
    <section
      aria-live="polite"
      className="surface-elevated min-w-0 rounded-xl px-4 py-3 sm:px-5"
    >
      {change.to === "Eligible" ? (
        <>
          <h2 className="text-sm font-semibold text-foreground">
            {change.name} is eligible again
          </h2>
          <div className="mt-2">
            <Consequences
              items={[
                "Eligible immediately, from the next assignment.",
                "No backlog of Leads they would otherwise have received.",
                "No compensation or priority — they are reached when the rotation next comes to their place.",
                "With a Batch Size above 1, an unfinished former batch would not be resumed.",
              ]}
            />
          </div>
        </>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-foreground">
            {change.name === "Every member"
              ? "Every member is paused"
              : `${change.name} is paused`}
          </h2>
          <div className="mt-2">
            <Consequences
              items={[
                "Excluded from the next automatic Lead onwards.",
                "Existing Leads, Customers, Follow-ups, Renewals and WhatsApp conversations stay as they are.",
                "The stored rotation position does not move.",
              ]}
            />
          </div>
        </>
      )}
      <NothingSaved className="mt-3" />
    </section>
  );
}
