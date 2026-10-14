"use client";

import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CrmChrome } from "@/components/wireframes/crm-chrome";
import { PriorityBadge } from "@/components/wireframes/lead-priority-parts";
import {
  Panel,
  ScreenHeading,
  TableScroll,
} from "@/components/wireframes/wf-ui";
import { selectablePriorities } from "@/lib/wireframes/lead-priority";
import {
  NO_FILTERS,
  QUICK_FILTERS,
  ROW_ACTIONS,
  activeFilterCount,
  followUpLabel,
  followUpState,
  interestLabel,
  leadsVisibleTo,
  ownerFilterOptions,
  ownerName,
  showsOwnerColumn,
  stageFilterOptions,
  visibleLeads,
  type Lead,
  type LeadFilters,
} from "@/lib/wireframes/leads";
import { SALES_PERSONA } from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import { cn } from "@/lib/utils";

/**
 * L2 — Leads list on the desktop (spec §37).
 *
 * The same workflow as the phone at a width that fits a table. Every status
 * word, filter meaning and row action comes from `leads.ts`, so the two screens
 * cannot drift apart — §37's list and the phone's cards are one feature.
 *
 * Signed in as the same Team Lead the phone uses (§210: "every role uses the
 * same application"), which is what lets both screens show the same rows and
 * the same "+ Add Lead" action. An Admin would see the same table with a wider
 * scope, but §212 leaves it undecided whether an Admin may create a Lead
 * directly, so presenting that action as theirs would answer an open question.
 *
 * Columns are §37's, minus the ones a list does not need to carry: Team is
 * absent because this viewer has exactly one, and Last Activity rides along
 * under the name rather than taking a column of its own. Lead name and Next
 * Follow-up get the room instead.
 */

const PAGE_SIZE = 6;

export function DesktopLeadListScreen() {
  const viewer = userById(USER.sneha);

  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const permitted = useMemo(() => leadsVisibleTo(viewer), [viewer]);
  const rows = useMemo(() => visibleLeads(viewer, filters), [viewer, filters]);
  const applied = activeFilterCount(filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  /** Any filter change returns to the first page; page 3 of 1 result is a dead end. */
  const set = (patch: Partial<LeadFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const showOwner = showsOwnerColumn(viewer);

  return (
    <CrmChrome
      active="leads"
      viewer={SALES_PERSONA}
      // The page heading already carries "Add Lead"; the top bar's copy of it
      // would only repeat the same action a few pixels away.
      showQuickAdd={false}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <ScreenHeading
          title="Leads"
          description="Every lead you and your team are working, with the next follow-up on each. Priority and stage are separate: a lead can be Hot at any stage."
          actions={
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              Add Lead
            </Button>
          }
        />

        {/* One compact toolbar: search, quick filters, the named filters. */}
        <section
          aria-label="Search and filter leads"
          className="surface-elevated flex min-w-0 flex-col gap-3 rounded-xl p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="surface-solid flex min-h-11 min-w-0 flex-1 basis-56 items-center gap-2.5 rounded-lg px-3">
              <Search
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="sr-only">Search leads</span>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
                placeholder="Search by name, phone or email"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => set({ search: "" })}
                  aria-label="Clear search"
                  className="-me-1 grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <Select
              label="Priority"
              value={filters.priorityId ?? ""}
              onChange={(v) => set({ priorityId: v === "" ? null : v })}
              options={[
                { value: "", label: "Priority: Any" },
                ...selectablePriorities().map((p) => ({
                  value: p.id,
                  label: `Priority: ${p.label}`,
                })),
              ]}
            />

            <Select
              label="Stage"
              value={filters.stage ?? ""}
              onChange={(v) => set({ stage: v === "" ? null : v })}
              options={[
                { value: "", label: "Stage: Any" },
                ...stageFilterOptions().map((s) => ({
                  value: s,
                  label: `Stage: ${s}`,
                })),
              ]}
            />

            {/* §37: owner options never exceed the viewer's permitted scope. */}
            {showOwner ? (
              <Select
                label="Record Owner"
                value={filters.ownerUserId ?? ""}
                onChange={(v) => set({ ownerUserId: v === "" ? null : v })}
                options={[
                  { value: "", label: "Owner: Anyone" },
                  ...ownerFilterOptions(viewer).map((u) => ({
                    value: u.id,
                    label: `Owner: ${u.id === viewer.id ? "You" : u.name}`,
                  })),
                ]}
              />
            ) : null}

            {applied > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setFilters(NO_FILTERS);
                  setPage(1);
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-primary"
              >
                <X className="size-4" aria-hidden="true" />
                Reset {applied} {applied === 1 ? "filter" : "filters"}
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListFilter className="size-3.5" aria-hidden="true" />
              Quick filters
            </span>
            <div
              role="group"
              aria-label="Quick filters"
              className="flex flex-wrap gap-1.5"
            >
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filters.quick === f.id}
                  onClick={() => set({ quick: f.id })}
                  className={cn(
                    "min-h-11 rounded-full border px-3 text-xs font-medium transition-colors sm:min-h-9",
                    filters.quick === f.id
                      ? "border-primary/40 bg-primary/12 text-primary"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {QUICK_FILTERS.find((f) => f.id === filters.quick)!.hint}
            </p>
          </div>
        </section>

        <Panel
          title="Your team's leads"
          count={`${rows.length} of ${permitted.length}`}
          bodyClassName="min-w-0"
        >
          <p role="status" aria-live="polite" className="sr-only">
            {rows.length === 0
              ? "No leads match"
              : `Showing ${start + 1} to ${start + pageRows.length} of ${rows.length} leads`}
          </p>

          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Search
                className="mx-auto size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-foreground">
                No leads match
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nothing in your scope matches the filters you have applied.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setFilters(NO_FILTERS);
                  setPage(1);
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <>
              <TableScroll>
                <table className="w-full min-w-[60rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Lead
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Interested in
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Priority
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Stage
                      </th>
                      {showOwner ? (
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Record Owner
                        </th>
                      ) : null}
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Next follow-up
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((lead) => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        showOwner={showOwner}
                        isMine={lead.recordOwnerUserId === viewer.id}
                        menuOpen={menuFor === lead.id}
                        onToggleMenu={() =>
                          setMenuFor((id) => (id === lead.id ? null : lead.id))
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </TableScroll>

              {/* Result count and pagination, both reading the same numbers. */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {start + 1}&ndash;{start + pageRows.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {rows.length}
                  </span>{" "}
                  {rows.length === 1 ? "lead" : "leads"}
                  {applied > 0 ? ` · filtered from ${permitted.length}` : ""}
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={current === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <span className="px-1 text-xs text-muted-foreground">
                    Page {current} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={current === pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Panel>

        <p className="text-xs leading-relaxed text-muted-foreground">
          You see your own leads and your team&rsquo;s. Record Owner options,
          search results and every count on this screen stay inside that scope —
          a filter never widens it.
        </p>
      </div>
    </CrmChrome>
  );
}

/* -------------------------------------------------------------------- row */

function LeadRow({
  lead,
  showOwner,
  isMine,
  menuOpen,
  onToggleMenu,
}: {
  lead: Lead;
  showOwner: boolean;
  isMine: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const state = followUpState(lead);

  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      {/* Name and contact together: §37's Lead Name and Phone in one cell, so
          the name keeps the emphasis and the row keeps its width. */}
      <td className="px-4 py-3">
        <Link
          href={"/wireframes/sales/record?from=leads" as Route}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {lead.name}
        </Link>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {lead.phone} · {lead.reference}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Last activity {lead.lastActivity}
        </span>
      </td>

      <td className="px-4 py-3 text-muted-foreground">
        {interestLabel(lead)}
        <span className="mt-0.5 block text-xs">Source: {lead.source}</span>
      </td>

      {/* Two columns, never merged (§37). */}
      <td className="px-4 py-3">
        <PriorityBadge priorityId={lead.priorityId} />
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
          {lead.stage}
        </span>
      </td>

      {showOwner ? (
        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
          {isMine ? "You" : ownerName(lead)}
        </td>
      ) : null}

      {/* Kept prominent: this is the column the day is planned from. */}
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-1 text-xs leading-relaxed",
            state === "overdue" &&
              "bg-danger-subtle font-medium text-danger-on-subtle",
            state === "today" &&
              "bg-warning-subtle font-medium text-warning-on-subtle",
            (state === "upcoming" || state === "none") && "text-foreground",
          )}
        >
          {followUpLabel(lead)}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <IconAction label={`Call ${lead.name}`}>
            <Phone className="size-4" aria-hidden="true" />
          </IconAction>
          {lead.conversationHref ? (
            <Link
              href={lead.conversationHref as Route}
              aria-label={`Open ${lead.name}'s WhatsApp conversation`}
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span
              title="No WhatsApp conversation yet"
              aria-label={`No WhatsApp conversation for ${lead.name}`}
              className="grid size-9 place-items-center rounded-lg border border-border/70 text-muted-foreground/60"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
            </span>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              aria-expanded={menuOpen}
              aria-label={`More actions for ${lead.name}`}
              className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
            {menuOpen ? (
              /* The same §37 action set the phone's sheet offers. */
              <ul className="surface-solid absolute end-0 z-20 mt-1 w-48 rounded-lg border border-border p-1 shadow-lg">
                {ROW_ACTIONS.map((action) => (
                  <li key={action}>
                    <button
                      type="button"
                      onClick={onToggleMenu}
                      className="flex min-h-9 w-full items-center rounded-md px-2 text-left text-xs text-foreground transition-colors hover:bg-accent"
                    >
                      {action}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

function IconAction({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground sm:h-9"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
