"use client";

import {
  CalendarClock,
  ChevronRight,
  Clock3,
  ListFilter,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CallHandoffSheet } from "@/components/wireframes/mobile-sheet-parts";
import {
  PhoneFrame,
  PhoneScreen,
  PhoneSheet,
} from "@/components/wireframes/phone-frame";
import { PriorityBadge } from "@/components/wireframes/lead-priority-parts";
import { Avatar } from "@/components/wireframes/wf-ui";
import { SALES_PERSONA } from "@/lib/wireframes/mock-data";
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
  type QuickFilterId,
} from "@/lib/wireframes/leads";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import { cn } from "@/lib/utils";

/**
 * L1 — Leads on a phone (spec §37, §210).
 *
 * §210: "Salespersons and Team Leads work primarily from a phone", and Leads is
 * one of the day-to-day areas it names. So this is the primary Leads screen and
 * the desktop table is its wider counterpart, not the other way round.
 *
 * Signed in as Sneha Thomas, a Team Lead who also works her own leads (§2.4).
 * Under §2.3 "All" means her team, so the owner appears on each card; for a
 * Salesperson the same component shows no owner line, because every row would
 * repeat their own name.
 *
 * The card is built around the one question a salesperson opens this screen to
 * answer — who do I owe a call today — so the follow-up line is the loudest
 * thing after the name, and an overdue one says so in words as well as colour.
 *
 * Tapping the name or the body opens the lead; Call and WhatsApp sit in their
 * own row beneath. Keeping them apart is deliberate: a mis-tap that dials
 * somebody is worse than one that opens a record.
 */
export function MobileLeadListScreen() {
  // Presented as the Team Lead the other phone screens use.
  const viewer = userById(USER.sneha);

  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const [sheet, setSheet] = useState<"filters" | null>(null);
  const [calling, setCalling] = useState<Lead | null>(null);
  const [menuFor, setMenuFor] = useState<Lead | null>(null);

  const permitted = useMemo(() => leadsVisibleTo(viewer), [viewer]);
  const rows = useMemo(() => visibleLeads(viewer, filters), [viewer, filters]);
  const applied = activeFilterCount(filters);

  const counts = useMemo(
    () => ({
      all: permitted.length,
      due: permitted.filter((l) => {
        const s = followUpState(l);
        return s === "overdue" || s === "today";
      }).length,
      overdue: permitted.filter((l) => followUpState(l) === "overdue").length,
    }),
    [permitted],
  );

  const set = (patch: Partial<LeadFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="app-ambient min-h-dvh">
      <div className="mx-auto w-full max-w-[1100px] px-0 py-0 md:px-6 md:py-8">
        <PhoneFrame caption="390 × 844 · the leads you owe a call">
          <PhoneScreen
            activeNav="leads"
            sheet={
              calling ? (
                <PhoneSheet
                  label="Call hand-off"
                  onClose={() => setCalling(null)}
                >
                  <CallHandoffSheet
                    person={calling.name}
                    phone={calling.phone}
                    returnsTo="the leads list"
                    onClose={() => setCalling(null)}
                  />
                </PhoneSheet>
              ) : menuFor ? (
                <PhoneSheet
                  label={`Actions for ${menuFor.name}`}
                  onClose={() => setMenuFor(null)}
                >
                  <RowActionSheet
                    lead={menuFor}
                    onClose={() => setMenuFor(null)}
                  />
                </PhoneSheet>
              ) : sheet === "filters" ? (
                <PhoneSheet label="Filter leads" onClose={() => setSheet(null)}>
                  <FilterSheet
                    filters={filters}
                    viewer={viewer}
                    resultCount={rows.length}
                    onChange={set}
                    onReset={() => setFilters(NO_FILTERS)}
                    onClose={() => setSheet(null)}
                  />
                </PhoneSheet>
              ) : null
            }
            header={
              /*
                Compact header: identity, the page title and the primary action
                on one line, then search. Three rows at most, because every row
                here is a row the list does not get.
              */
              <header className="surface-glass rounded-none border-x-0 border-t-0 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
                <div className="flex items-center justify-between gap-2">
                  <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground">
                    Leads
                  </h1>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {/*
                      §37 names "+ Add Lead" the primary action of this screen,
                      and §38 defines the form. Offered here because the viewer
                      is operational: §212 leaves it pending only for Admins
                      and Managers.
                    */}
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground"
                    >
                      <Plus className="size-4 shrink-0" aria-hidden="true" />
                      Add Lead
                    </button>
                    <Avatar initials={SALES_PERSONA.initials} size="sm" />
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <label className="surface-solid flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3">
                    <Search
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Search leads</span>
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => set({ search: e.target.value })}
                      placeholder="Name, phone or email"
                      className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
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

                  <button
                    type="button"
                    onClick={() => setSheet("filters")}
                    aria-haspopup="dialog"
                    aria-label={
                      applied > 0
                        ? `Filters, ${applied} applied`
                        : "Filter leads"
                    }
                    className={cn(
                      "relative grid size-11 shrink-0 place-items-center rounded-lg border",
                      applied > 0
                        ? "border-primary/40 bg-primary/12 text-primary"
                        : "border-border bg-surface text-muted-foreground",
                    )}
                  >
                    <ListFilter className="size-4" aria-hidden="true" />
                    {applied > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                        {applied}
                      </span>
                    ) : null}
                  </button>
                </div>
              </header>
            }
          >
            {/*
              `pb-4` plus the bottom nav's own height is what keeps the last
              card clear of the fixed navigation — the body scrolls inside the
              frame, so padding here is the only thing between them.
            */}
            <div className="flex flex-col gap-3 px-3 py-3 pb-4">
              {/* Operational counts only. No conversion or revenue figures. */}
              <dl className="grid grid-cols-3 gap-2">
                <Summary label="Leads" value={counts.all} tone="primary" />
                <Summary
                  label="Follow-up due"
                  value={counts.due}
                  tone="warning"
                />
                <Summary label="Overdue" value={counts.overdue} tone="danger" />
              </dl>

              {/* §37's quick filters, in its own order and words. */}
              <div
                role="group"
                aria-label="Quick filters"
                className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
              >
                {QUICK_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filters.quick === f.id}
                    onClick={() => set({ quick: f.id })}
                    className={cn(
                      "min-h-11 shrink-0 rounded-full border px-3 text-[12px] font-medium whitespace-nowrap transition-colors",
                      filters.quick === f.id
                        ? "border-primary/40 bg-primary/12 text-primary"
                        : "border-border bg-surface text-muted-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Applied filters, named and individually removable (§37). */}
              {applied > 0 ? (
                <AppliedFilters
                  filters={filters}
                  onChange={set}
                  onReset={() => setFilters(NO_FILTERS)}
                />
              ) : null}

              <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                {QUICK_FILTERS.find((f) => f.id === filters.quick)!.hint}
              </p>

              <p role="status" aria-live="polite" className="sr-only">
                {rows.length === 0
                  ? "No leads match"
                  : `Showing ${rows.length} of ${counts.all} leads`}
              </p>

              {rows.length === 0 ? (
                <EmptyState onReset={() => setFilters(NO_FILTERS)} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {rows.map((lead) => (
                    <li key={lead.id}>
                      <LeadCard
                        lead={lead}
                        showOwner={showsOwnerColumn(viewer)}
                        isMine={lead.recordOwnerUserId === viewer.id}
                        onCall={() => setCalling(lead)}
                        onMenu={() => setMenuFor(lead)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                You see your own leads and your team&rsquo;s. Peer teams are not
                shown, and no count here includes them.
              </p>
            </div>
          </PhoneScreen>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- card */

function LeadCard({
  lead,
  showOwner,
  isMine,
  onCall,
  onMenu,
}: {
  lead: Lead;
  showOwner: boolean;
  isMine: boolean;
  onCall: () => void;
  onMenu: () => void;
}) {
  const state = followUpState(lead);
  const attention = state === "overdue" || state === "today";

  return (
    <div
      className={cn(
        "surface-solid rounded-xl p-3",
        // A left edge rather than a full tint: it marks the row without
        // making the text sit on a colour.
        state === "overdue" && "border-s-2 border-s-danger",
        state === "today" && "border-s-2 border-s-warning",
      )}
    >
      {/* The whole identity block opens the lead. One large target. */}
      <Link
        href={"/wireframes/sales/record?from=leads" as Route}
        aria-label={`Open ${lead.name}'s lead record`}
        className="-m-1 flex min-h-11 items-start gap-3 rounded-lg p-1 transition-colors hover:bg-accent/60"
      >
        <Avatar
          initials={initialsOf(lead.name)}
          tone={attention ? "primary" : "muted"}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {lead.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {lead.reference} · {interestLabel(lead)}
          </span>
        </span>
        <ChevronRight
          className="mt-2 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>

      {/* Priority and Stage, side by side and separately labelled (§37). */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priorityId={lead.priorityId} withLabel />
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Stage: {lead.stage}
        </span>
      </div>

      {/* The line the screen exists for. */}
      <p
        className={cn(
          "mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-relaxed",
          state === "overdue" && "bg-danger-subtle text-danger-on-subtle",
          state === "today" && "bg-warning-subtle text-warning-on-subtle",
          state === "upcoming" && "bg-muted text-muted-foreground",
          state === "none" && "bg-muted text-muted-foreground",
        )}
      >
        {state === "overdue" ? (
          <Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <CalendarClock
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
        )}
        <span className="min-w-0">
          <span className="font-medium">Next follow-up:</span>{" "}
          {followUpLabel(lead)}
        </span>
      </p>

      {showOwner ? (
        <p className="mt-1.5 px-0.5 text-[11px] text-muted-foreground">
          Owner: {isMine ? "You" : ownerName(lead)} · Last activity{" "}
          {lead.lastActivity}
        </p>
      ) : null}

      {/*
        Contact actions, kept in their own row away from the navigation target
        above. Call hands off to the dialler (§29–33); nothing dials here.
      */}
      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          onClick={onCall}
          aria-haspopup="dialog"
          aria-label={`Call ${lead.name}`}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          Call
        </button>

        {lead.conversationHref ? (
          <Link
            href={lead.conversationHref as Route}
            aria-label={`Open ${lead.name}'s WhatsApp conversation`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
            WhatsApp
          </Link>
        ) : (
          <span
            title="No WhatsApp conversation yet"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/70 text-[12px] font-medium text-muted-foreground"
          >
            <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
            WhatsApp
          </span>
        )}

        {/* Everything §37 lists but a thumb rarely needs. */}
        <button
          type="button"
          onClick={onMenu}
          aria-haspopup="dialog"
          aria-label={`More actions for ${lead.name}`}
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- sheets */

function FilterSheet({
  filters,
  viewer,
  resultCount,
  onChange,
  onReset,
  onClose,
}: {
  filters: LeadFilters;
  viewer: ReturnType<typeof userById>;
  resultCount: number;
  onChange: (patch: Partial<LeadFilters>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <SlidersHorizontal
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="text-sm font-semibold text-foreground">Filter leads</h2>
        <button
          type="button"
          onClick={onReset}
          className="ms-auto min-h-11 rounded-lg px-2 text-[12px] font-medium text-primary"
        >
          Reset all
        </button>
      </div>

      <div className="flex flex-col gap-3 pt-3">
        <FilterGroup label="Priority">
          <Chip
            selected={filters.priorityId === null}
            onClick={() => onChange({ priorityId: null })}
          >
            Any
          </Chip>
          {selectablePriorities().map((p) => (
            <Chip
              key={p.id}
              selected={filters.priorityId === p.id}
              onClick={() => onChange({ priorityId: p.id })}
            >
              {p.label}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Stage">
          <Chip
            selected={filters.stage === null}
            onClick={() => onChange({ stage: null })}
          >
            Any
          </Chip>
          {stageFilterOptions().map((stage) => (
            <Chip
              key={stage}
              selected={filters.stage === stage}
              onClick={() => onChange({ stage })}
            >
              {stage}
            </Chip>
          ))}
        </FilterGroup>

        {/*
          §37: "Record Owner and Team filter options are limited to those
          within the viewer's permitted scope. A filter list must never
          disclose users or teams the viewer cannot otherwise see."
        */}
        {showsOwnerColumn(viewer) ? (
          <FilterGroup label="Record Owner">
            <Chip
              selected={filters.ownerUserId === null}
              onClick={() => onChange({ ownerUserId: null })}
            >
              Anyone
            </Chip>
            {ownerFilterOptions(viewer).map((u) => (
              <Chip
                key={u.id}
                selected={filters.ownerUserId === u.id}
                onClick={() => onChange({ ownerUserId: u.id })}
              >
                {u.id === viewer.id ? "You" : u.name}
              </Chip>
            ))}
          </FilterGroup>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 flex-1 rounded-lg border border-border text-sm font-medium text-foreground"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 flex-[2] rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
        >
          Show {resultCount} {resultCount === 1 ? "lead" : "leads"}
        </button>
      </div>
    </>
  );
}

function RowActionSheet({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  return (
    <>
      <div className="border-b border-border pb-3">
        <h2 className="text-sm font-semibold text-foreground">{lead.name}</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {lead.reference} · {interestLabel(lead)}
        </p>
      </div>
      {/* §37's row actions, the same set the desktop row menu offers. */}
      <ul className="flex flex-col gap-0.5 pt-2">
        {ROW_ACTIONS.map((action) => (
          <li key={action}>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 w-full items-center rounded-lg px-2 text-left text-[13px] text-foreground transition-colors hover:bg-accent"
            >
              {action}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        What appears here follows your role. Which roles may archive a Lead is
        still pending confirmation, so nothing is carried out in these
        wireframes.
      </p>
    </>
  );
}

/* ----------------------------------------------------------------- pieces */

function AppliedFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: LeadFilters;
  onChange: (patch: Partial<LeadFilters>) => void;
  onReset: () => void;
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.quick !== "all") {
    chips.push({
      key: "quick",
      label: QUICK_FILTERS.find((f) => f.id === filters.quick)!.label,
      clear: () => onChange({ quick: "all" as QuickFilterId }),
    });
  }
  if (filters.search.trim() !== "") {
    chips.push({
      key: "search",
      label: `“${filters.search.trim()}”`,
      clear: () => onChange({ search: "" }),
    });
  }
  if (filters.priorityId) {
    const p = selectablePriorities().find((x) => x.id === filters.priorityId);
    chips.push({
      key: "priority",
      label: `Priority: ${p?.label ?? "—"}`,
      clear: () => onChange({ priorityId: null }),
    });
  }
  if (filters.stage) {
    chips.push({
      key: "stage",
      label: `Stage: ${filters.stage}`,
      clear: () => onChange({ stage: null }),
    });
  }
  if (filters.ownerUserId) {
    chips.push({
      key: "owner",
      label: `Owner: ${userById(filters.ownerUserId).name}`,
      clear: () => onChange({ ownerUserId: null }),
    });
  }

  return (
    <div
      role="group"
      aria-label="Applied filters"
      className="flex flex-wrap items-center gap-1.5"
    >
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/12 py-0.5 ps-2.5 pe-0.5 text-[11px] font-medium text-primary"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            aria-label={`Remove filter ${chip.label}`}
            className="grid size-7 place-items-center rounded-full"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="min-h-11 rounded-lg px-2 text-[11px] font-medium text-primary underline underline-offset-2"
      >
        Clear all
      </button>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3 text-[12px] font-medium transition-colors",
        selected
          ? "border-primary/40 bg-primary/12 text-primary"
          : "border-border bg-surface text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "text-primary",
    warning: "text-warning-on-subtle",
    danger: "text-danger-on-subtle",
  }[tone];
  return (
    <div className="surface-glass rounded-lg px-2.5 py-2">
      {/* Wraps rather than truncating: all three tiles grow together, so the
          labels stay readable down to 320px. */}
      <dt className="text-[10px] leading-tight font-medium text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn("mt-0.5 text-lg leading-none font-semibold", toneClass)}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="surface-solid rounded-xl px-4 py-8 text-center">
      <Search
        className="mx-auto size-6 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="mt-3 text-sm font-medium text-foreground">No leads match</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        Nothing in your scope matches the filters you have applied.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-[13px] font-medium text-foreground"
      >
        Reset filters
      </button>
    </div>
  );
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
