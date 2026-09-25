"use client";

import {
  ArrowRightLeft,
  CircleAlert,
  Crown,
  History,
  Info,
  Power,
  Route as RouteIcon,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { CrmChrome } from "@/components/wireframes/crm-chrome";
import {
  Breadcrumbs,
  ConceptDialog,
  Consequences,
  RoundRobinChip,
  NothingSaved,
  RoleChip,
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
  TableScroll,
} from "@/components/wireframes/wf-ui";
import {
  PAUSE_ACTION,
  PAUSE_EFFECT_NOTE,
  RESUME_ACTION,
  ROUND_ROBIN_LABEL,
  SALES_TEAMS,
  TEAMS_TODAY,
  USER,
  addCandidates,
  activationCheck,
  activeMemberships,
  initialsOf,
  managerOf,
  mayReceiveAutomaticLeads,
  configFor,
  teamBySlug,
  teamLeadOf,
  userById,
  type PauseChange,
  type Membership,
  type SalesTeam,
} from "@/lib/wireframes/sales-teams";
import { cn } from "@/lib/utils";

/**
 * T2 — Team detail and membership (Admin, spec §163.2–163.5).
 *
 * Presented as Arun Menon, Admin. Every change here is an
 * administrative action: adding an existing active user, a transfer, a Team
 * Lead replacement, an audited eligibility OVERRIDE, or deactivating the
 * team. None of it is offered to a Manager or an ordinary member, and the
 * Team Lead's own controls live on My Team, not here.
 *
 * All state is local. Reloading restores the sample team.
 */

const TEAM = teamBySlug("health-insurance");

type Row = Membership & {
  /** How this member arrived during the demonstration, if they did. */
  origin?: { kind: "added" } | { kind: "transferred"; from: string };
};

type DialogState =
  | { kind: "add" }
  | { kind: "transfer"; preselect?: string }
  | { kind: "lead" }
  | { kind: "override"; userId: string; pause: boolean }
  | { kind: "status" };

export function SalesTeamDetailScreen() {
  const [rows, setRows] = useState<readonly Row[]>(() =>
    activeMemberships(TEAM),
  );
  const [active, setActive] = useState(TEAM.status === "Active");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [leadHistory, setLeadHistory] = useState(TEAM.teamLeadHistory);

  const lead = rows.find((r) => r.teamLead);
  const leadUser = lead ? userById(lead.userId) : null;
  // Automatic eligibility excludes paused members (§189.1).
  const eligible = rows.filter((r) => mayReceiveAutomaticLeads(r));
  const paused = rows.filter((r) => r.pausedFromRoundRobin);
  const warning = !active
    ? "Team is inactive"
    : eligible.length === 0
      ? "No eligible members"
      : null;
  const config = configFor(TEAM.id);
  const ended = TEAM.memberships.filter((m) => m.status === "Ended");

  const close = () => setDialog(null);

  return (
    <CrmChrome active="settings">
      <div className="flex min-w-0 flex-col gap-5">
        <Breadcrumbs
          items={[
            { label: "Settings", href: "/wireframes/admin/settings" },
            { label: "Teams", href: "/wireframes/admin/teams" },
            { label: TEAM.name },
          ]}
        />

        <ScreenHeading
          title={TEAM.name}
          description={`${TEAM.description} Created ${TEAM.created}. Changes on this page are Admin actions and each one is audited.`}
          actions={
            <>
              <button
                type="button"
                disabled={!active}
                onClick={() => setDialog({ kind: "add" })}
                aria-haspopup="dialog"
                className={buttonClass("primary")}
              >
                <UserPlus className="size-4" aria-hidden="true" />
                Add member
              </button>
              {/* Transfer in — withheld from the header for now. The
                  transfer flow itself is untouched and still reachable from
                  the "Transfer instead" action inside Add member.
              <button
                type="button"
                disabled={!active}
                onClick={() => setDialog({ kind: "transfer" })}
                aria-haspopup="dialog"
                className={buttonClass("outline")}
              >
                <ArrowRightLeft className="size-4" aria-hidden="true" />
                Transfer in
              </button>
              */}
              <button
                type="button"
                disabled={!active}
                onClick={() => setDialog({ kind: "lead" })}
                aria-haspopup="dialog"
                className={buttonClass("outline")}
              >
                <Crown className="size-4" aria-hidden="true" />
                Replace Team Lead
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "status" })}
                aria-haspopup="dialog"
                className={buttonClass(active ? "ghost" : "outline")}
              >
                <Power className="size-4" aria-hidden="true" />
                {active ? "Deactivate team" : "Activate team"}
              </button>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard title="Status, Team Lead and Manager">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={active ? "Active" : "Inactive"} />
            </div>
            {leadUser ? (
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar initials={initialsOf(leadUser.name)} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {leadUser.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-1">
                    <RoleChip label={leadUser.role} />
                    <TeamLeadBadge />
                  </p>
                </div>
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Reports to{" "}
              <span className="font-medium text-foreground">
                {managerOf(TEAM).name}
              </span>{" "}
              ({managerOf(TEAM).role}), who supervises this team without being a
              member of it.
            </p>
          </SummaryCard>

          <SummaryCard title="Automatic Lead assignment">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Count label="Active members" value={rows.length} />
              <Count label="In round robin" value={eligible.length} />
              <Count label="Paused" value={paused.length} />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The Team Lead shares the rotation like any Salesperson. Admin and
              Manager are never eligible recipients.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {PAUSE_EFFECT_NOTE}
            </p>
          </SummaryCard>

          <SummaryCard title="Assignment warning">
            {warning ? (
              <div className="flex flex-col gap-2">
                <WarningChip>{warning}</WarningChip>
                <p className="text-xs leading-relaxed text-danger-on-subtle">
                  New Leads routed to this team are kept, Unassigned, in
                  Assignment Required. The Team Lead and Admin are alerted.
                  Nothing falls back to another team.
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 text-sm text-foreground">
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-success-on-subtle"
                  aria-hidden="true"
                />
                None.{" "}
                {eligible.length === 1
                  ? "1 member can"
                  : `${eligible.length} members can`}{" "}
                receive the next automatic Lead.
              </p>
            )}
          </SummaryCard>
        </div>

        <Panel title="Members" icon={UsersRound} count={rows.length}>
          <TableScroll>
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Member
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Workspace role
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Team responsibility
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Membership
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Lead-assignment eligibility
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Admin override
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const user = userById(row.userId);
                  const pauseNext = !row.pausedFromRoundRobin;
                  return (
                    <tr
                      key={row.userId}
                      className="border-b border-border/70 align-top last:border-0"
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar initials={initialsOf(user.name)} size="sm" />
                          <span className="min-w-0">
                            <span className="block font-medium text-foreground">
                              {user.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RoleChip label={user.role} />
                      </td>
                      <td className="px-4 py-3">
                        {row.teamLead ? (
                          <TeamLeadBadge />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Member
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status="Active" />
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {row.origin?.kind === "transferred"
                            ? `Transferred from ${row.origin.from} · ${row.joined}`
                            : `Since ${row.joined}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RoundRobinChip
                          value={
                            row.pausedFromRoundRobin
                              ? "Paused from round robin"
                              : "In round robin"
                          }
                        />
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {changeText(row.pauseChange)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!active}
                          onClick={() =>
                            setDialog({
                              kind: "override",
                              userId: row.userId,
                              pause: pauseNext,
                            })
                          }
                          aria-haspopup="dialog"
                          aria-label={`${pauseNext ? PAUSE_ACTION : RESUME_ACTION}: ${user.name}`}
                          className={buttonClass("outline", "px-3")}
                        >
                          {pauseNext ? "Pause" : "Resume"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Automatic Lead Assignment" icon={RouteIcon}>
            <div className="flex flex-col gap-2 px-4 py-3 sm:px-5">
              <p className="text-sm text-foreground">
                Round-robin batch size{" "}
                <strong className="font-semibold tabular-nums">
                  {config.batchSize}
                </strong>
                <span className="text-xs text-muted-foreground">
                  {" "}
                  · one configuration for this team
                </span>
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Every approved automatic path into {TEAM.name} uses this same
                batch size, pool and rotation position. There is no second
                configuration and no Lead-Source variant.
              </p>
              {warning ? <WarningChip>{warning}</WarningChip> : null}
              {config.detailHref ? (
                <Link
                  href={config.detailHref}
                  className="inline-flex min-h-11 w-fit items-center font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Edit configuration
                </Link>
              ) : null}
            </div>
          </Panel>

          <Panel title="History" icon={History}>
            <div className="flex flex-col gap-4 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Team Lead
                </h3>
                <ul className="mt-1.5 flex flex-col gap-1 text-sm">
                  {leadHistory.map((h) => (
                    <li
                      key={`${h.userId}-${h.from}`}
                      className="text-foreground"
                    >
                      {userById(h.userId).name}{" "}
                      <span className="text-muted-foreground">
                        · {h.from} – {h.to ?? "present"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground">
                  Ended memberships
                </h3>
                <ul className="mt-1.5 flex flex-col gap-1 text-sm">
                  {ended.map((m) => (
                    <li key={m.userId} className="text-foreground">
                      {userById(m.userId).name}{" "}
                      <span className="text-muted-foreground">
                        · {m.joined} – {m.ended} · {m.endedReason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Note icon={Info} tone="neutral">
                History is kept, never rewritten. Joseph Kurian is still the
                Record Owner of the Leads assigned before deactivation, and is
                still named on everything logged at the time.
              </Note>
            </div>
          </Panel>
        </div>
      </div>

      {dialog?.kind === "add" ? (
        <AddMemberDialog
          team={TEAM}
          existing={rows.map((r) => r.userId)}
          onClose={close}
          onTransferInstead={(userId) =>
            setDialog({ kind: "transfer", preselect: userId })
          }
          onAdd={(userId) =>
            setRows((prev) => [...prev, newRow(userId, { kind: "added" })])
          }
        />
      ) : null}

      {dialog?.kind === "transfer" ? (
        <TransferDialog
          existing={rows.map((r) => r.userId)}
          preselect={dialog.preselect}
          onClose={close}
          onTransfer={(userId, from) =>
            setRows((prev) => [
              ...prev,
              newRow(userId, { kind: "transferred", from }),
            ])
          }
        />
      ) : null}

      {dialog?.kind === "lead" && lead ? (
        <ReplaceLeadDialog
          currentLeadId={lead.userId}
          members={rows}
          onClose={close}
          onReplace={(userId) => {
            setRows((prev) =>
              prev.map((r) => ({ ...r, teamLead: r.userId === userId })),
            );
            setLeadHistory((prev) => [
              ...prev.map((h) => (h.to ? h : { ...h, to: TEAMS_TODAY })),
              { userId, from: TEAMS_TODAY },
            ]);
          }}
        />
      ) : null}

      {dialog?.kind === "override" ? (
        <OverrideDialog
          userId={dialog.userId}
          pause={dialog.pause}
          leavesNoneEligible={
            dialog.pause &&
            eligible.length === 1 &&
            eligible[0]!.userId === dialog.userId
          }
          isTeamLead={rows.some(
            (r) => r.userId === dialog.userId && r.teamLead,
          )}
          onClose={close}
          onConfirm={() =>
            setRows((prev) =>
              prev.map((r) =>
                r.userId === dialog.userId
                  ? {
                      ...r,
                      pausedFromRoundRobin: dialog.pause,
                      pauseChange: {
                        byUserId: USER.arun,
                        capacity: "Admin",
                        at: TEAMS_TODAY,
                      },
                    }
                  : r,
              ),
            )
          }
        />
      ) : null}

      {dialog?.kind === "status" ? (
        <TeamStatusDialog
          active={active}
          members={rows}
          onClose={close}
          onConfirm={() => setActive((a) => !a)}
        />
      ) : null}
    </CrmChrome>
  );
}

function newRow(userId: string, origin: NonNullable<Row["origin"]>): Row {
  return {
    userId,
    status: "Active",
    teamLead: false,
    // Every member joins in the round robin; a pause is always deliberate.
    pausedFromRoundRobin: false,
    joined: TEAMS_TODAY,
    pauseChange: {
      byUserId: null,
      capacity: "Default on joining",
      at: TEAMS_TODAY,
    },
    origin,
  };
}

function changeText(change: PauseChange): string {
  if (change.capacity === "Default on joining") {
    return `Default on joining · ${change.at}`;
  }
  const by = change.byUserId ? userById(change.byUserId).name : "System";
  return `By ${change.capacity} ${by} · ${change.at}`;
}

function SummaryCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-glass min-w-0 rounded-xl p-4">
      <h2 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-2">
      <dt className="text-[11px] leading-tight text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/* ---------------------------------------------------------------- dialogs */

function DoneFooter({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} className={buttonClass("primary")}>
      Back to {TEAM.name}
    </button>
  );
}

function CancelConfirm({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  tone = "primary",
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
  tone?: "primary" | "danger";
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className={buttonClass("outline")}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className={buttonClass(tone)}
      >
        {confirmLabel}
      </button>
    </>
  );
}

function AddMemberDialog({
  team,
  existing,
  onClose,
  onAdd,
  onTransferInstead,
}: {
  team: SalesTeam;
  existing: readonly string[];
  onClose: () => void;
  onAdd: (userId: string) => void;
  onTransferInstead: (userId: string) => void;
}) {
  const name = useId();
  const [choice, setChoice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const candidates = addCandidates(team.id).filter(
    (c) => !existing.includes(c.user.id),
  );

  if (done && choice) {
    return (
      <ConceptDialog
        open
        onClose={onClose}
        title="Member added — concept"
        footer={<DoneFooter onClose={onClose} />}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            {userById(choice).name} is now shown as a member of {team.name}.
          </p>
          <Consequences
            items={[
              "Joined as Eligible for Lead assignment, the default for every member.",
              "Their existing Leads, Customers, Follow-ups, Renewals and WhatsApp conversations are unchanged.",
              "Where they are placed in the team's rotation order is to be confirmed.",
              "The addition is recorded in the team's audit history.",
            ]}
          />
          <NothingSaved />
        </div>
      </ConceptDialog>
    );
  }

  return (
    <ConceptDialog
      open
      onClose={onClose}
      title={`Add a member to ${team.name}`}
      description="Only existing, active users with no other active team can be added. Adding never creates or reactivates a user."
      footer={
        <CancelConfirm
          onCancel={onClose}
          confirmLabel="Add member"
          disabled={!choice}
          onConfirm={() => {
            if (!choice) return;
            onAdd(choice);
            setDone(true);
          }}
        />
      }
    >
      <fieldset>
        <legend className="sr-only">Workspace users</legend>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {candidates.map(({ user, blocked, currentTeam }) => {
            // A current Team Lead cannot be transferred until replaced.
            const transferable =
              !!currentTeam && teamLeadOf(currentTeam)?.userId !== user.id;
            return (
              <li
                key={user.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2"
              >
                <label
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 items-start gap-3",
                    blocked ? "opacity-70" : "cursor-pointer",
                  )}
                >
                  <input
                    type="radio"
                    name={name}
                    disabled={!!blocked}
                    checked={choice === user.id}
                    onChange={() => setChoice(user.id)}
                    className="mt-1 size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                      {user.name}
                      <RoleChip label={user.role} />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {blocked ?? "Active · not in a team"}
                    </span>
                  </span>
                </label>
                {transferable ? (
                  <button
                    type="button"
                    onClick={() => onTransferInstead(user.id)}
                    className={buttonClass("ghost", "px-2.5 text-xs")}
                  >
                    Transfer instead
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>
    </ConceptDialog>
  );
}

/** Members of OTHER teams, and whether each can be transferred now. */
function transferOptions(existing: readonly string[]) {
  return SALES_TEAMS.filter((t) => t.id !== TEAM.id).flatMap((team) =>
    activeMemberships(team)
      .filter((m) => !existing.includes(m.userId))
      .map((m) => ({
        userId: m.userId,
        team,
        blocked: m.teamLead
          ? `Current Team Lead of ${team.name}. Choose a replacement Team Lead for that team, or deactivate it, before this transfer can complete.`
          : null,
      })),
  );
}

function TransferDialog({
  existing,
  preselect,
  onClose,
  onTransfer,
}: {
  existing: readonly string[];
  preselect?: string;
  onClose: () => void;
  onTransfer: (userId: string, fromTeam: string) => void;
}) {
  const name = useId();
  // Fixed when the dialog opens: once the transfer is shown, the person is
  // an existing member and would otherwise drop out of this list.
  const [options] = useState(() => transferOptions(existing));
  const [choice, setChoice] = useState<string | null>(
    options.find((o) => o.userId === preselect && !o.blocked)?.userId ?? null,
  );
  const [done, setDone] = useState(false);
  const chosen = options.find((o) => o.userId === choice);

  if (done && chosen) {
    return (
      <ConceptDialog
        open
        onClose={onClose}
        title="Transfer complete — concept"
        footer={<DoneFooter onClose={onClose} />}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            {userById(chosen.userId).name} is now shown in {TEAM.name}, joining
            as Eligible for Lead assignment.
          </p>
          <NothingSaved />
        </div>
      </ConceptDialog>
    );
  }

  return (
    <ConceptDialog
      open
      onClose={onClose}
      title={`Transfer a member into ${TEAM.name}`}
      description="A transfer moves one person between teams in a single step. It never gives anyone two active teams, or none."
      footer={
        <CancelConfirm
          onCancel={onClose}
          confirmLabel="Confirm transfer"
          disabled={!chosen}
          onConfirm={() => {
            if (!chosen) return;
            onTransfer(chosen.userId, chosen.team.name);
            setDone(true);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            Members of other teams
          </legend>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {options.map((o) => {
              const user = userById(o.userId);
              return (
                <li key={o.userId}>
                  <label
                    className={cn(
                      "flex min-h-11 items-start gap-3 px-3 py-2",
                      o.blocked ? "opacity-70" : "cursor-pointer",
                    )}
                  >
                    <input
                      type="radio"
                      name={name}
                      disabled={!!o.blocked}
                      checked={choice === o.userId}
                      onChange={() => setChoice(o.userId)}
                      className="mt-1 size-4 shrink-0 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                        {user.name}
                        <RoleChip label={user.role} />
                        <span className="text-xs font-normal text-muted-foreground">
                          · {o.team.name}
                        </span>
                      </span>
                      {o.blocked ? (
                        <span className="mt-0.5 block text-xs text-warning-on-subtle">
                          {o.blocked}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {chosen ? (
          <div className="rounded-lg border border-border bg-muted/60 p-3">
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              What happens when {userById(chosen.userId).name} is transferred
            </h3>
            <Consequences
              icon={ArrowRightLeft}
              items={[
                <>
                  Their membership of <strong>{chosen.team.name}</strong> ends,
                  and they stop receiving that team&apos;s automatic Leads.
                </>,
                <>
                  Their membership of <strong>{TEAM.name}</strong> begins in the
                  same atomic change — never two teams, never none.
                </>,
                "The former membership stays in history.",
                "Existing Leads stay with their current Record Owners. Nothing is reassigned.",
                "Customers, Follow-ups, Renewals and WhatsApp assignments do not change.",
                "The transfer is audited with both teams, the person, who made it and when.",
              ]}
            />
          </div>
        ) : null}

        <Note icon={TriangleAlert} tone="warning">
          A current Team Lead cannot be transferred until their team has a
          replacement Team Lead or is deactivated.
        </Note>
      </div>
    </ConceptDialog>
  );
}

function ReplaceLeadDialog({
  currentLeadId,
  members,
  onClose,
  onReplace,
}: {
  currentLeadId: string;
  members: readonly Row[];
  onClose: () => void;
  onReplace: (userId: string) => void;
}) {
  const name = useId();
  const [choice, setChoice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const current = userById(currentLeadId);
  const options = members.filter((m) => m.userId !== currentLeadId);

  if (done && choice) {
    return (
      <ConceptDialog
        open
        onClose={onClose}
        title="Team Lead replaced — concept"
        footer={<DoneFooter onClose={onClose} />}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            {userById(choice).name} is now shown as Team Lead of {TEAM.name}.
          </p>
          <NothingSaved />
        </div>
      </ConceptDialog>
    );
  }

  return (
    <ConceptDialog
      open
      onClose={onClose}
      title="Replace Team Lead"
      description={`Choose an active member of ${TEAM.name}. A team always has exactly one Team Lead.`}
      footer={
        <CancelConfirm
          onCancel={onClose}
          confirmLabel="Replace Team Lead"
          disabled={!choice}
          onConfirm={() => {
            if (!choice) return;
            onReplace(choice);
            setDone(true);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
            New Team Lead
          </legend>
          <div className="flex flex-col gap-1">
            {options.map((m) => {
              const user = userById(m.userId);
              return (
                <label
                  key={m.userId}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3"
                >
                  <input
                    type="radio"
                    name={name}
                    checked={choice === m.userId}
                    onChange={() => setChoice(m.userId)}
                    className="size-4 accent-primary"
                  />
                  <span className="flex flex-wrap items-center gap-1.5 text-sm text-foreground">
                    {user.name}
                    <RoleChip label={user.role} />
                    <RoundRobinChip
                      value={
                        m.pausedFromRoundRobin
                          ? "Paused from round robin"
                          : "In round robin"
                      }
                      short
                    />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Consequences
          items={[
            `${current.name} stays in the team as a member, keeps the ${current.role} role and keeps their current eligibility.`,
            "The new Team Lead keeps their own workspace role. Team Lead is a responsibility, not a role.",
            "Former Team Lead responsibility stays visible in history.",
            "No Lead, Customer, Follow-up, Renewal or WhatsApp conversation is reassigned.",
          ]}
        />
      </div>
    </ConceptDialog>
  );
}

function OverrideDialog({
  userId,
  pause,
  leavesNoneEligible,
  isTeamLead,
  onClose,
  onConfirm,
}: {
  userId: string;
  pause: boolean;
  leavesNoneEligible: boolean;
  isTeamLead: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const reasonId = useId();
  const [done, setDone] = useState(false);
  const user = userById(userId);
  const state = pause ? "Paused from round robin" : "In round robin";
  const verb = pause ? PAUSE_ACTION : RESUME_ACTION;

  if (done) {
    return (
      <ConceptDialog
        open
        onClose={onClose}
        title="Override applied — concept"
        footer={<DoneFooter onClose={onClose} />}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            {user.name} is now <strong>{ROUND_ROBIN_LABEL[state]}</strong>,
            recorded as an Admin action by Arun Menon.
          </p>
          <NothingSaved />
        </div>
      </ConceptDialog>
    );
  }

  return (
    <ConceptDialog
      open
      onClose={onClose}
      title={`${verb}: ${user.name}`}
      description={`Sets ${user.name} to "${ROUND_ROBIN_LABEL[state]}". ${PAUSE_EFFECT_NOTE}`}
      footer={
        <CancelConfirm
          onCancel={onClose}
          confirmLabel={leavesNoneEligible ? "Pause anyway" : verb}
          tone={leavesNoneEligible ? "danger" : "primary"}
          onConfirm={() => {
            onConfirm();
            setDone(true);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {leavesNoneEligible ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5 text-[13px] leading-relaxed text-danger-on-subtle"
          >
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold">
                This leaves {TEAM.name} with no eligible members.
              </strong>{" "}
              New Leads routed to the team will be kept in Assignment Required,
              and the Team Lead and Admin will be alerted. You can still
              continue if it is operationally necessary.
            </span>
          </div>
        ) : null}

        <Consequences
          items={[
            "Affects future automatic Leads only, from the next assignment.",
            `${user.name}'s existing Leads, Customers, Follow-ups, Renewals and WhatsApp conversations are unchanged.`,
            ...(isTeamLead
              ? [
                  `${user.name} remains Team Lead and an active member either way.`,
                ]
              : []),
            ...(pause
              ? [
                  `${user.name} may still be given a Lead by an authorized manual assignment.`,
                ]
              : [
                  "No backlog, compensation or priority: they are reached when the rotation next comes to them.",
                ]),
            "This override is audited: who made it, when, the old and new value, and any reason given.",
          ]}
        />

        <div>
          <label
            htmlFor={reasonId}
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Reason
          </label>
          <textarea
            id={reasonId}
            rows={2}
            aria-describedby={`${reasonId}-hint`}
            className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground"
          />
          <p
            id={`${reasonId}-hint`}
            className="mt-1 text-xs text-muted-foreground"
          >
            Whether a reason is required for an override is to be confirmed.
          </p>
        </div>
      </div>
    </ConceptDialog>
  );
}

function TeamStatusDialog({
  active,
  members,
  onClose,
  onConfirm,
}: {
  active: boolean;
  members: readonly Membership[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [done, setDone] = useState(false);
  // Checked when the dialog opens; activation itself changes nothing else.
  const [check] = useState(() => activationCheck(TEAM.id, members));
  const blocked = !active && check.blockers.length > 0;
  const noPool = !active && check.eligibleCount === 0;

  if (done) {
    return (
      <ConceptDialog
        open
        onClose={onClose}
        title={
          active ? "Team reactivated — concept" : "Team deactivated — concept"
        }
        footer={<DoneFooter onClose={onClose} />}
      >
        <NothingSaved />
      </ConceptDialog>
    );
  }

  return (
    <ConceptDialog
      open
      onClose={onClose}
      title={active ? `Deactivate ${TEAM.name}?` : `Activate ${TEAM.name}?`}
      footer={
        <CancelConfirm
          onCancel={onClose}
          confirmLabel={active ? "Deactivate team" : "Activate team"}
          tone={active ? "danger" : "primary"}
          disabled={blocked}
          onConfirm={() => {
            if (blocked) return;
            onConfirm();
            setDone(true);
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {blocked ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5 text-[13px] leading-relaxed text-danger-on-subtle"
          >
            <p className="flex items-center gap-2 font-semibold">
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              This team cannot be activated yet
            </p>
            <ul className="mt-1 list-disc ps-6">
              {check.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {noPool && !blocked ? (
          <div
            role="alert"
            className="rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2.5 text-[13px] leading-relaxed text-warning-on-subtle"
          >
            <p className="flex items-center gap-2 font-semibold">
              <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
              No eligible members — this team has no rotation pool
            </p>
            <p className="mt-1">
              The team can still be activated. New Leads routed to it will be
              kept Unassigned, in Assignment Required, until a member is made
              eligible. There is no fallback to another team or to a
              workspace-wide pool.
            </p>
          </div>
        ) : null}

        <Consequences
          items={
            active
              ? [
                  "Future automatic assignment through this team stops while it is inactive. Leads routed to it are kept in Assignment Required and never go to another team.",
                  `${TEAM.name}'s rules show an assignment warning. The rules and their rotation history are kept for audit.`,
                  "Historical memberships, Team Lead history and prior assignment history are preserved.",
                  "Existing Lead ownership is unchanged. No record is reassigned.",
                ]
              : [
                  "Activation keeps the current Team Lead and every member's eligibility exactly as they are. Nothing is selected or changed for you.",
                  "The team can receive automatic Leads again through its active rules, from eligible members only.",
                  "Where its rotation resumes after reactivation is to be confirmed.",
                ]
          }
        />
      </div>
    </ConceptDialog>
  );
}
