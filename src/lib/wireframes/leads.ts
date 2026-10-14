/**
 * The Leads list (spec §37 Leads — List View, with §38, §2.3, §192, §66).
 *
 * One dataset and one set of pure helpers, shared by the phone list and the
 * desktop table. The two screens are the same workflow at two widths, so the
 * rows, the filter meanings, the status words and the actions all come from
 * here — a phone that quietly filtered differently from the desktop would be a
 * different product, not a smaller one.
 *
 * §37 keeps Priority and Stage as separate columns: "Priority and Stage are
 * separate columns. Neither substitutes for the other, and the list must not
 * merge them." So a lead carries a `priorityId` (§192, by stable id) and a
 * `stage` (§191), and nothing here derives one from the other.
 *
 * Visibility is §2.3's reporting hierarchy, applied here before anything is
 * counted or sorted — so a filter can never widen what a viewer may see.
 */
import {
  PIPELINE_STAGES,
  SETTINGS_USERS,
  type SettingsUser,
} from "@/lib/wireframes/mock-data";
import { categoryById, planLineage } from "@/lib/wireframes/catalogue";
import { comparePriorityIds } from "@/lib/wireframes/lead-priority";
import {
  SALES_TEAMS,
  activeMemberships,
  activeTeamOf,
  teamLeadOf,
  userById,
} from "@/lib/wireframes/sales-teams";

/* ------------------------------------------------------------------ model */

/**
 * What a Lead is interested in (§38 "Interested In — Product Category or
 * Plan/Sub-product").
 *
 * Either level is valid, so the plan is optional. §66 forbids treating a
 * category as something bought, but an *enquiry* legitimately sits at category
 * level before a plan is chosen.
 */
export type LeadInterest = {
  readonly categoryId: string;
  readonly planId?: string;
};

/** A scheduled next follow-up (§37 "Next Follow-up", §49). */
export type LeadFollowUp = {
  /** As the row prints it, e.g. "10 Sep 2026, 3:30 PM". */
  readonly label: string;
  /** Days from PRESENTATION_TODAY. Negative is overdue, 0 is today. */
  readonly inDays: number;
  readonly type: "Call" | "WhatsApp" | "Email" | "Visit";
};

export type Lead = {
  readonly id: string;
  readonly name: string;
  /** §37's own reference shape, as every other screen prints it. */
  readonly reference: string;
  readonly phone: string;
  readonly email: string;
  /** §192, by stable id — never the label, which an Admin may rename. */
  readonly priorityId: string;
  /** §191 pipeline stage name. A separate field from priority. */
  readonly stage: string;
  readonly interest: LeadInterest;
  /** SETTINGS_USERS id. §2.5: only a Team Lead or Salesperson may own. */
  readonly recordOwnerUserId: string;
  readonly nextFollowUp: LeadFollowUp | null;
  readonly lastActivity: string;
  readonly createdOn: string;
  /** §38 "Lead Source". */
  readonly source: string;
  /** Whether a WhatsApp conversation already exists for this person. */
  readonly conversationHref?: string;
};

/* ------------------------------------------------------- illustrative data */

/**
 * Eight sample Leads, every one owned inside the Health Insurance Team.
 *
 * Owned there on purpose: the Team Lead's phone and the desktop table then
 * show the SAME rows under two different legitimate scopes — her own team
 * under §2.3, and everything under an Admin's organization-wide view — so the
 * two screens can be compared without one quietly holding back a record.
 *
 * The follow-up spread is deliberate and is what the list has to make obvious
 * at a glance: one overdue, one due today, four upcoming, two with none.
 */
export const LEADS: readonly Lead[] = [
  {
    id: "l2107",
    name: "Rajesh Menon",
    reference: "Lead · #2107",
    phone: "70000 61204",
    email: "rajesh.menon@mail.example",
    priorityId: "lp-hot",
    stage: "Interested",
    interest: { categoryId: "cat-health", planId: "plan-fho" },
    recordOwnerUserId: "s3",
    // Already late. The one row the salesperson should act on first.
    nextFollowUp: {
      label: "10 Sep 2026, 3:30 PM",
      inDays: -1,
      type: "Call",
    },
    lastActivity: "Call · 08 Sep",
    createdOn: "02 Sep 2026",
    source: "Walk-in",
    conversationHref: "/wireframes/whatsapp/conversation?conversation=w8",
  },
  {
    id: "l2088",
    name: "Priya Iyer",
    reference: "Lead · #2088",
    phone: "70000 41288",
    email: "priya.iyer@example.in",
    priorityId: "lp-warm",
    stage: "Interested",
    interest: { categoryId: "cat-health" },
    recordOwnerUserId: "s3",
    nextFollowUp: { label: "Today, 10:00 AM", inDays: 0, type: "Call" },
    lastActivity: "WhatsApp · Yesterday",
    createdOn: "29 Aug 2026",
    source: "Referral",
    conversationHref: "/wireframes/whatsapp/conversation?conversation=w2",
  },
  {
    id: "l2041",
    name: "Meera Krishnan",
    reference: "Lead · #2041",
    phone: "70000 33115",
    email: "meera.krishnan@mail.example",
    priorityId: "lp-hot",
    stage: "Contacted",
    interest: { categoryId: "cat-health", planId: "plan-fho" },
    recordOwnerUserId: "s3",
    nextFollowUp: {
      label: "14 Sep 2026, 11:30 AM",
      inDays: 3,
      type: "Call",
    },
    lastActivity: "WhatsApp · Today",
    createdOn: "08 Sep 2026",
    source: "Walk-in",
    conversationHref: "/wireframes/whatsapp/conversation?conversation=w7",
  },
  {
    id: "l2140",
    name: "Sajith Kumar",
    reference: "Lead · #2140",
    phone: "70000 58931",
    email: "sajith.kumar@mail.example",
    priorityId: "lp-hot",
    stage: "Contacted",
    interest: { categoryId: "cat-motor", planId: "plan-car-comp" },
    recordOwnerUserId: "s4",
    nextFollowUp: { label: "16 Sep 2026, 2:00 PM", inDays: 5, type: "Visit" },
    lastActivity: "Call · 09 Sep",
    createdOn: "09 Sep 2026",
    source: "Website",
  },
  {
    id: "l2147",
    name: "Vineeth Raj",
    reference: "Lead · #2147",
    phone: "70000 47026",
    email: "vineeth.raj@mail.example",
    priorityId: "lp-warm",
    stage: "New",
    interest: { categoryId: "cat-health" },
    recordOwnerUserId: "s7",
    nextFollowUp: { label: "15 Sep 2026, 9:30 AM", inDays: 4, type: "Call" },
    lastActivity: "Created · 10 Sep",
    createdOn: "10 Sep 2026",
    source: "Website",
  },
  {
    id: "l2119",
    name: "Arjun Pillai",
    reference: "Lead · #2119",
    phone: "70000 52318",
    email: "arjun.pillai@mail.example",
    priorityId: "lp-cold",
    stage: "Quote Sent",
    interest: { categoryId: "cat-motor" },
    recordOwnerUserId: "s7",
    nextFollowUp: { label: "18 Sep 2026, 4:00 PM", inDays: 7, type: "Call" },
    lastActivity: "Email · 07 Sep",
    createdOn: "27 Aug 2026",
    source: "Referral",
  },
  {
    id: "l2133",
    name: "Nithya Menon",
    reference: "Lead · #2133",
    phone: "70000 29184",
    email: "nithya.menon@mail.example",
    priorityId: "lp-warm",
    stage: "New",
    interest: { categoryId: "cat-life" },
    recordOwnerUserId: "s4",
    // No follow-up at all — what the "No follow-up" quick filter is for (§37).
    nextFollowUp: null,
    lastActivity: "Created · 11 Sep",
    createdOn: "11 Sep 2026",
    source: "Walk-in",
  },
  {
    id: "l2151",
    name: "Deepa Suresh",
    reference: "Lead · #2151",
    phone: "70000 73402",
    email: "deepa.suresh@mail.example",
    priorityId: "lp-cold",
    stage: "Contacted",
    interest: { categoryId: "cat-puc" },
    recordOwnerUserId: "s4",
    nextFollowUp: null,
    lastActivity: "Call · 11 Sep",
    createdOn: "11 Sep 2026",
    source: "Walk-in",
  },
];

/* --------------------------------------------------------------- follow-up */

export type FollowUpState = "overdue" | "today" | "upcoming" | "none";

/**
 * How urgent this lead's next follow-up is.
 *
 * One function, so the phone card's red tag and the desktop row's wording can
 * never disagree about whether something is late.
 */
export function followUpState(lead: Lead): FollowUpState {
  if (lead.nextFollowUp === null) return "none";
  if (lead.nextFollowUp.inDays < 0) return "overdue";
  if (lead.nextFollowUp.inDays === 0) return "today";
  return "upcoming";
}

/** The follow-up in words, never colour alone. */
export function followUpLabel(lead: Lead): string {
  const state = followUpState(lead);
  if (state === "none" || lead.nextFollowUp === null) {
    return "No follow-up scheduled";
  }
  const { label, type, inDays } = lead.nextFollowUp;
  if (state === "overdue") {
    const days = Math.abs(inDays);
    return `${label} · ${type} · overdue by ${days} ${days === 1 ? "day" : "days"}`;
  }
  if (state === "today") return `${label} · ${type} · due today`;
  return `${label} · ${type} · in ${inDays} days`;
}

/* --------------------------------------------------------------- catalogue */

/**
 * What the lead is interested in, as one readable phrase.
 *
 * Category alone where no plan has been chosen yet, category and plan once it
 * has. An unresolvable id is reported rather than silently dropped.
 */
export function interestLabel(lead: Lead): string {
  if (lead.interest.planId) {
    const lineage = planLineage(lead.interest.planId);
    if (lineage.ok) {
      return `${lineage.lineage.category.name} · ${lineage.lineage.plan.name}`;
    }
    return "Interest not available";
  }
  const category = categoryById(lead.interest.categoryId);
  return category ? category.name : "Interest not available";
}

/** The category alone, for a filter chip or a narrow column. */
export function interestCategory(lead: Lead): string {
  if (lead.interest.planId) {
    const lineage = planLineage(lead.interest.planId);
    if (lineage.ok) return lineage.lineage.category.name;
  }
  const category = categoryById(lead.interest.categoryId);
  return category ? category.name : "Not available";
}

/* -------------------------------------------------------------- visibility */

/**
 * The Leads `viewer` may see (§2.3, §37).
 *
 * §37: "For a Salesperson, All and My Leads resolve to the same set, because a
 * Salesperson sees only their own records. For a Team Lead, All means their
 * team; for a Manager, their branch; for an Admin, the organization."
 *
 * Applied before any filter, count or sort, so no later step can widen it.
 */
export function leadsVisibleTo(
  viewer: SettingsUser,
  from: readonly Lead[] = LEADS,
): readonly Lead[] {
  if (viewer.status !== "Active") return [];
  const permitted = ownerIdsVisibleTo(viewer);
  return from.filter((lead) => permitted.has(lead.recordOwnerUserId));
}

/** Whose records this viewer may reach, by role (§2.3). */
export function ownerIdsVisibleTo(viewer: SettingsUser): ReadonlySet<string> {
  switch (viewer.role) {
    case "Admin":
      return new Set(
        SALES_TEAMS.flatMap((t) => activeMemberships(t).map((m) => m.userId)),
      );
    case "Manager": {
      const ids = new Set<string>();
      for (const team of SALES_TEAMS.filter((t) => t.managerId === viewer.id)) {
        for (const m of activeMemberships(team)) ids.add(m.userId);
      }
      return ids;
    }
    case "Team Lead": {
      const team = activeTeamOf(viewer.id);
      if (!team || teamLeadOf(team)?.userId !== viewer.id) return new Set();
      return new Set(activeMemberships(team).map((m) => m.userId));
    }
    case "Salesperson":
      return new Set([viewer.id]);
  }
}

/**
 * Whether this viewer may see an owner column at all.
 *
 * A Salesperson only ever sees their own records, so a column repeating their
 * own name in every row is noise. Everyone else supervises more than one
 * person and needs to know whose lead it is.
 */
export function showsOwnerColumn(viewer: SettingsUser): boolean {
  return viewer.role !== "Salesperson";
}

/** The owners a viewer may filter by — never a name they cannot otherwise see. */
export function ownerFilterOptions(
  viewer: SettingsUser,
): readonly SettingsUser[] {
  const ids = ownerIdsVisibleTo(viewer);
  return SETTINGS_USERS.filter((u) => ids.has(u.id) && u.status === "Active");
}

/* ------------------------------------------------------- search and filters */

/** §37: "Search by Lead name, Phone number, Email." */
export function matchesSearch(lead: Lead, term: string): boolean {
  const needle = term.trim().toLocaleLowerCase();
  if (needle === "") return true;
  return [
    lead.name,
    lead.phone,
    // So "7000061204" finds a number written "70000 61204".
    lead.phone.replace(/\s/g, ""),
    lead.email,
    lead.reference,
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(needle);
}

/** §37's quick filters, in the specification's own order and words. */
export type QuickFilterId = "all" | "mine" | "follow-up-due" | "no-follow-up";

export const QUICK_FILTERS: readonly {
  id: QuickFilterId;
  label: string;
  hint: string;
}[] = [
  { id: "all", label: "All", hint: "Every lead you are permitted to see." },
  { id: "mine", label: "My Leads", hint: "Leads you are the Record Owner of." },
  {
    id: "follow-up-due",
    label: "Follow-up Due",
    hint: "A follow-up that is overdue or due today.",
  },
  {
    id: "no-follow-up",
    label: "No Follow-up",
    hint: "No next follow-up has been scheduled yet.",
  },
];

/** The filters §37 lists, as the screens apply them. */
export type LeadFilters = {
  readonly quick: QuickFilterId;
  readonly search: string;
  readonly priorityId: string | null;
  readonly stage: string | null;
  readonly ownerUserId: string | null;
};

export const NO_FILTERS: LeadFilters = {
  quick: "all",
  search: "",
  priorityId: null,
  stage: null,
  ownerUserId: null,
};

/** How many of §37's filters are currently narrowing the list. */
export function activeFilterCount(filters: LeadFilters): number {
  return (
    (filters.quick !== "all" ? 1 : 0) +
    (filters.search.trim() !== "" ? 1 : 0) +
    (filters.priorityId !== null ? 1 : 0) +
    (filters.stage !== null ? 1 : 0) +
    (filters.ownerUserId !== null ? 1 : 0)
  );
}

export type SortId = "priority" | "follow-up" | "created";

/**
 * Apply visibility, then the filters, then the sort.
 *
 * In that order, always. Sorting a set the viewer may not see, or filtering
 * before scoping, is how a count ends up describing records that are not on
 * the screen.
 */
export function visibleLeads(
  viewer: SettingsUser,
  filters: LeadFilters,
  sort: SortId = "priority",
  from: readonly Lead[] = LEADS,
): readonly Lead[] {
  const scoped = leadsVisibleTo(viewer, from);

  const filtered = scoped.filter((lead) => {
    if (filters.quick === "mine" && lead.recordOwnerUserId !== viewer.id) {
      return false;
    }
    if (filters.quick === "follow-up-due") {
      const state = followUpState(lead);
      if (state !== "overdue" && state !== "today") return false;
    }
    if (filters.quick === "no-follow-up" && lead.nextFollowUp !== null) {
      return false;
    }
    if (filters.priorityId && lead.priorityId !== filters.priorityId) {
      return false;
    }
    if (filters.stage && lead.stage !== filters.stage) return false;
    if (filters.ownerUserId && lead.recordOwnerUserId !== filters.ownerUserId) {
      return false;
    }
    return matchesSearch(lead, filters.search);
  });

  return [...filtered].sort((a, b) => {
    if (sort === "created") return a.createdOn < b.createdOn ? 1 : -1;
    if (sort === "follow-up") return followUpRank(a) - followUpRank(b);
    // §37: "sorting by Priority, using the order Admin configured in §192".
    const byPriority = comparePriorityIds(a.priorityId, b.priorityId);
    if (byPriority !== 0) return byPriority;
    return followUpRank(a) - followUpRank(b);
  });
}

/** Overdue first, then today, then soonest; unscheduled last. */
function followUpRank(lead: Lead): number {
  return lead.nextFollowUp === null
    ? Number.MAX_SAFE_INTEGER
    : lead.nextFollowUp.inDays;
}

/* ------------------------------------------------------------------ stages */

/** The stages offered as a filter: the active pipeline, in configured order. */
export function stageFilterOptions(): readonly string[] {
  return PIPELINE_STAGES.filter((s) => s.active).map((s) => s.name);
}

/* ------------------------------------------------------------------ people */

/** The owner's display name, resolved from the id the lead stores. */
export function ownerName(lead: Lead): string {
  return userById(lead.recordOwnerUserId).name;
}

/**
 * §37's row actions, in the specification's own words and order.
 *
 * Listed as data so the phone's overflow menu and the desktop's row menu offer
 * exactly the same set. Nothing here is wired to a destination: these are
 * wireframes, and §188 still leaves archive permissions pending.
 */
export const ROW_ACTIONS: readonly string[] = [
  "View Lead",
  "Change Priority",
  "Assign / Reassign",
  "Schedule Follow-up",
  "Mark as Won",
  "Mark as Lost",
  "Archive",
];
