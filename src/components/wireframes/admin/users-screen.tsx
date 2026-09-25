import { History, Mail, ShieldCheck, UserMinus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CrmChrome } from "@/components/wireframes/crm-chrome";
import {
  Avatar,
  Note,
  Panel,
  ScreenHeading,
  TableScroll,
} from "@/components/wireframes/wf-ui";
import { SETTINGS_USERS, type AppRole } from "@/lib/wireframes/mock-data";
import {
  activeMemberships,
  activeTeamOf,
  managerOf,
  teamLeadOf,
} from "@/lib/wireframes/sales-teams";
import { RoundRobinChip } from "@/components/wireframes/teams/team-parts";
import { cn } from "@/lib/utils";

/**
 * E2 — Users and roles.
 *
 * The important design decision here is what deactivation does NOT do. Joseph
 * Kurian left the business, but his 38 records and his name on every past
 * activity stay exactly where they are. History is not rewritten when someone
 * leaves.
 *
 * Team sits in its own column (§159), with the Manager that team reports to
 * through its Team Lead (§2.2). Team Lead is one of the four fixed roles
 * (§2.1), so it is the Role column that says it.
 */

const STATUS_CLASS = {
  Active: "border-success/30 bg-success-subtle text-success-on-subtle",
  Invited: "border-info/30 bg-info-subtle text-info-on-subtle",
  Deactivated:
    "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle",
} as const;

/** The four fixed roles (§2.1); supervisory roles carry the stronger tone. */
const ROLE_CLASS: Record<AppRole, string> = {
  Admin: "border-primary/30 bg-primary/12 text-primary",
  Manager: "border-info/30 bg-info-subtle text-info-on-subtle",
  "Team Lead": "border-border-strong/40 bg-accent text-accent-foreground",
  Salesperson: "border-border bg-muted text-muted-foreground",
};

export function UsersScreen() {
  return (
    <CrmChrome active="settings">
      <div className="flex min-w-0 flex-col gap-5">
        <ScreenHeading
          title="Users and roles"
          description="Who is on the team, what they can see, and how much work each person is carrying."
          actions={
            <Button>
              <UserPlus className="size-4" aria-hidden="true" />
              Invite user
            </Button>
          }
        />

        <Panel title="Team" icon={ShieldCheck} count={SETTINGS_USERS.length}>
          <TableScroll>
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    User
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Team
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Assigned records
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Last active
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {SETTINGS_USERS.map((user) => {
                  const inactive = user.status === "Deactivated";
                  const team = activeTeamOf(user.id);
                  const leads = team
                    ? teamLeadOf(team)?.userId === user.id
                    : false;
                  // Three distinct states: the account status above, and
                  // whether an operational user takes part in round robin.
                  const paused = team
                    ? (activeMemberships(team).find((m) => m.userId === user.id)
                        ?.pausedFromRoundRobin ?? false)
                    : false;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <Avatar
                            initials={user.name
                              .split(" ")
                              .slice(0, 2)
                              .map((p) => p[0])
                              .join("")}
                            tone={inactive ? "muted" : "primary"}
                          />
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block truncate font-medium",
                                inactive
                                  ? "text-muted-foreground"
                                  : "text-foreground",
                              )}
                            >
                              {user.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            ROLE_CLASS[user.role],
                          )}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {team ? (
                          <span className="flex flex-col items-start gap-1">
                            <span className="text-foreground">{team.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {leads ? "Leads this team · " : ""}Reports to{" "}
                              {managerOf(team).name}
                            </span>
                            <RoundRobinChip
                              value={
                                paused
                                  ? "Paused from round robin"
                                  : "In round robin"
                              }
                              short
                            />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {user.role === "Admin" || user.role === "Manager"
                              ? "Supervisory — not a team member"
                              : "Not in a team"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            STATUS_CLASS[user.status],
                          )}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {user.assignedRecords}
                        {inactive && user.assignedRecords > 0 ? (
                          <span className="ms-1.5 text-xs">(retained)</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {user.lastActive}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {user.status === "Invited" ? (
                            <Button variant="outline" size="sm">
                              <Mail className="size-3.5" aria-hidden="true" />
                              Resend
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              Edit role
                            </Button>
                          )}
                          {user.status === "Active" && user.role !== "Admin" ? (
                            <Button variant="ghost" size="sm">
                              <UserMinus
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Deactivate
                            </Button>
                          ) : null}
                          {inactive ? (
                            <Button variant="ghost" size="sm">
                              Reactivate
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Note icon={History}>
            <strong className="font-semibold">
              Deactivating a user never deletes their history.
            </strong>{" "}
            Joseph Kurian&apos;s 38 records keep his name as the original owner,
            and every activity he logged stays in the timeline. Reassign the
            live records to someone else; the past stays as it happened.
          </Note>

          <Panel title="What each role can do" bodyClassName="p-4 sm:p-5">
            <dl className="flex flex-col gap-3 text-sm">
              <RoleRow
                role="Admin"
                detail="Supervisory. Organization-wide visibility, settings, users and teams. Owns no operational record."
              />
              <RoleRow
                role="Manager"
                detail="Supervisory. Sees only their own reporting hierarchy. Owns no operational record."
              />
              <RoleRow
                role="Team Lead"
                detail="Operational. Leads exactly one team, reports to one Manager, and may own and work records."
              />
              <RoleRow
                role="Salesperson"
                detail="Operational. Belongs to one team and sees only the records assigned to them."
              />
            </dl>
          </Panel>
        </div>
      </div>
    </CrmChrome>
  );
}

function RoleRow({ role, detail }: { role: string; detail: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{role}</dt>
      <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        {detail}
      </dd>
    </div>
  );
}
