import { planLineage } from "@/lib/wireframes/catalogue";
import {
  purchaseById,
  purchasesForCustomer,
  type CustomerPurchase,
} from "@/lib/wireframes/customer-purchase";

/**
 * Wireframe mock data.
 *
 * Every value shown in the /wireframes routes comes from this file. Nothing
 * here reaches production code, and no wireframe screen queries Supabase,
 * PostgreSQL or any network service — the screens are presentation artefacts
 * that demonstrate approved workflows to A&S Fincare.
 *
 * Names, products and numbers are illustrative but realistic for a Kerala
 * insurance and financial-services desk. Phone numbers use the reserved
 * Indian test range so none of them can dial a real person.
 */

export const WORKSPACE = {
  name: "A&S Fincare",
  today: "Friday, 11 September 2026",
  todayShort: "Fri, 11 Sep 2026",
} as const;

/**
 * Who the DESKTOP wireframes are presented as.
 *
 * The admin dashboard and the settings screens are an administrator's view,
 * so this persona keeps the administrator role.
 */
export const CURRENT_USER = {
  name: "Arun Menon",
  firstName: "Arun",
  role: "Admin",
  initials: "AM",
} as const;

/**
 * Who the MOBILE wireframes are presented as.
 *
 * The phone screens demonstrate an operational user's day, and the actions
 * they are allowed to take differ from an administrator's — assignment in
 * particular (spec §162). Keeping this separate from `CURRENT_USER` means the
 * mobile screens can show an operational role without the admin wireframes
 * inheriting it.
 *
 * Sneha leads the Health Insurance Team, and §2.4 lets a Team Lead own and
 * personally work Leads, so the same phone screens still show real fieldwork.
 */
export const SALES_PERSONA = {
  name: "Sneha Thomas",
  firstName: "Sneha",
  role: "Team Lead",
  initials: "ST",
} as const;

/* ------------------------------------------------------------------ people */

/**
 * The four fixed application roles (spec §2.1).
 *
 * The CRM provides no custom role creation and no editable role
 * capabilities, so this union is the whole role model. "Owner" and "Staff"
 * are not roles — `Record Owner` is only the name of a record relationship.
 */
export type AppRole = "Admin" | "Manager" | "Team Lead" | "Salesperson";

/** Admin and Manager supervise; Team Lead and Salesperson do the work (§2.4). */
export const OPERATIONAL_ROLES = ["Team Lead", "Salesperson"] as const;

/**
 * Whether a role may hold a Record Owner or operational Assigned To seat.
 *
 * §2.5: only Team Leads and Salespersons may; Admins and Managers must never
 * be selectable as operational owners or assignees.
 */
export function isOperationalRole(role: AppRole): boolean {
  return (OPERATIONAL_ROLES as readonly AppRole[]).includes(role);
}

export type Owner = {
  id: string;
  name: string;
  initials: string;
  role: AppRole;
};

/**
 * Active users who can be assigned work.
 *
 * Operational roles only. Arun Menon (Admin) and Vikram Shah (Manager) are
 * deliberately absent: §2.5 forbids a supervisor from ever being offered as
 * an operational owner or assignee, in pickers as much as anywhere else.
 */
export const TEAM: readonly Owner[] = [
  { id: "u2", name: "Sneha Thomas", initials: "ST", role: "Team Lead" },
  { id: "u4", name: "Neha Thomas", initials: "NT", role: "Salesperson" },
  // Fathima Rasheed (invited, not yet active) is deliberately absent: an
  // invited user cannot be given work. The Customer of the same name is a
  // different person and lives in DIRECTORY_CUSTOMERS.
  // Active salespeople added with the Teams wireframes (see SETTINGS_USERS).
  // Only ever offered as options in assignee pickers.
  { id: "u6", name: "Divya Mohan", initials: "DM", role: "Salesperson" },
  { id: "u7", name: "Ajay Varma", initials: "AV", role: "Team Lead" },
  { id: "u8", name: "Nisha George", initials: "NG", role: "Team Lead" },
  { id: "u9", name: "Kavya Raghavan", initials: "KR", role: "Salesperson" },
];

/* --------------------------------------------------------- Flow A: import */

export const IMPORT_FILE = {
  name: "leads-september.xlsx",
  size: "184 KB",
  rows: 428,
  // 12 columns: the Priority column (§149) is its own, never shared with Stage.
  columns: 12,
  uploadedAt: "11 Sep 2026, 10:04 AM",
} as const;

export type MappingStatus =
  | "suggested"
  | "confirmed"
  | "required-missing"
  | "needs-review"
  | "custom"
  | "ignored";

export type ColumnMapping = {
  id: string;
  uploadedColumn: string;
  sampleValue: string;
  crmField: string;
  status: MappingStatus;
  /** Shown beneath the row when the mapping needs a decision. */
  note?: string;
  required?: boolean;
};

export const COLUMN_MAPPINGS: readonly ColumnMapping[] = [
  {
    id: "c1",
    uploadedColumn: "Name",
    sampleValue: "Ramesh Kumar",
    crmField: "Lead Name",
    status: "suggested",
    required: true,
  },
  {
    id: "c2",
    uploadedColumn: "Mobile",
    sampleValue: "70000 12345",
    crmField: "Phone Number",
    status: "suggested",
    required: true,
  },
  {
    id: "c3",
    uploadedColumn: "Email ID",
    sampleValue: "ramesh.k@example.in",
    crmField: "Email",
    status: "suggested",
  },
  {
    id: "c4",
    uploadedColumn: "Executive",
    sampleValue: "Joseph K",
    crmField: "Record Owner",
    status: "needs-review",
    note: 'Record Owner "Joseph K" could not be matched to an active CRM user. Map it to an existing user, or leave those rows unassigned.',
  },
  {
    id: "c5",
    uploadedColumn: "Status",
    sampleValue: "Follow Up",
    crmField: "Lead Stage",
    status: "needs-review",
    note: '"Follow Up" does not match an active pipeline stage. Map it to an existing stage — import never creates stages.',
  },
  {
    /*
     * §149: "Hot → Hot", "High → No matching priority value". The uploaded
     * value is matched against the ACTIVE configured values and an unmatched
     * one is mapped by the user — import never creates a priority value, and
     * never converts an unknown one.
     *
     * "Lead Temp" is an ILLUSTRATIVE uploaded column name added to demonstrate
     * this mapping. It did not come from A&S Fincare's own spreadsheet; the
     * original sample file had eleven columns and no priority column at all.
     */
    id: "c5b",
    uploadedColumn: "Lead Temp",
    sampleValue: "High",
    crmField: "Lead Priority",
    status: "needs-review",
    note: '"High" does not match an active Lead Priority value. Map it to an existing value — import never creates priority values, and never guesses one.',
  },
  {
    id: "c6",
    uploadedColumn: "Policy",
    sampleValue: "Health Insurance",
    crmField: "Interested In",
    status: "suggested",
  },
  {
    id: "c7",
    uploadedColumn: "Vehicle Number",
    sampleValue: "KL-07-CM-4412",
    crmField: "Vehicle Number — Custom Field",
    status: "custom",
  },
  {
    id: "c8",
    uploadedColumn: "Source",
    sampleValue: "Walk-in",
    crmField: "Lead Source",
    status: "suggested",
  },
  {
    id: "c9",
    uploadedColumn: "Renewal",
    sampleValue: "26-09-2026",
    crmField: "Select CRM field",
    status: "required-missing",
    note: "Not mapped yet. Leave it unmapped to exclude the column, or choose a CRM field.",
  },
  {
    id: "c10",
    uploadedColumn: "Remarks",
    sampleValue: "Called twice, asked to call back",
    crmField: "Notes",
    status: "suggested",
  },
  {
    id: "c11",
    uploadedColumn: "Entry No.",
    sampleValue: "SEP-0417",
    crmField: "Do not import",
    status: "ignored",
  },
];

/** CRM fields offered in the mapping dropdown. Nothing here is created by import. */
export const CRM_FIELDS: readonly string[] = [
  "Lead Name",
  "Phone Number",
  "Email",
  "Record Owner",
  "Lead Stage",
  // §149: its own field. "A single uploaded column cannot populate both.
  // Mapping a column to Stage does not set Priority, and mapping a column to
  // Priority does not set Stage."
  "Lead Priority",
  "Lead Source",
  // §38 calls the Lead field "Interested In"; §150 matches the uploaded value
  // against the catalogue at Product Category, Provider or Plan level.
  "Interested In",
  "Notes",
  "Vehicle Number — Custom Field",
  "Policy Number — Custom Field",
  "Do not import",
];

export const VALIDATION_TOTALS = {
  found: 428,
  ready: 390,
  duplicates: 18,
  attention: 12,
  cannotImport: 8,
} as const;

export type IssueCategory = "attention" | "duplicate" | "cannot-import";

export type ValidationIssue = {
  row: number;
  name: string;
  detail: string;
  problem: string;
  category: IssueCategory;
  /** Actions offered for this row. The first is the suggested one. */
  actions: readonly string[];
};

export const VALIDATION_ISSUES: readonly ValidationIssue[] = [
  {
    row: 14,
    name: "Ramesh Kumar",
    detail: "No phone, no email",
    problem: "Phone and email are both missing",
    category: "cannot-import",
    actions: ["Edit row", "Keep outside import"],
  },
  {
    row: 31,
    name: "Priya Nair",
    detail: "priya.nair@@example",
    problem: "Invalid email format",
    category: "attention",
    actions: ["Edit row", "Import without email", "Keep outside import"],
  },
  {
    row: 47,
    name: "Anitha Desai",
    detail: "Renewal: 31-14-2026",
    problem: "Invalid date format",
    category: "attention",
    actions: ["Edit row", "Import without date", "Keep outside import"],
  },
  {
    row: 89,
    name: "John Thomas",
    detail: "Executive: Joseph K",
    problem: "Unknown Record Owner",
    category: "attention",
    /*
     * The three choices §148 allows for an unmatched owner, and no fourth.
     * The Step 3 fallback is an explicit decision here — it is never applied
     * automatically, because that would silently replace the owner the file
     * named.
     */
    actions: [
      "Map to an eligible Team Lead or Salesperson",
      "Apply the Step 3 assignment strategy",
      "Leave unassigned",
      "Edit row",
    ],
  },
  {
    row: 112,
    name: "Suresh Pillai",
    detail: "Status: Follow Up",
    problem: "Unknown Lead Stage",
    category: "attention",
    actions: ["Map to an existing stage", "Use first active stage", "Edit row"],
  },
  {
    /*
     * §153 lists "unknown Lead Priority value" as its own validation issue,
     * separate from "unknown pipeline stage". Neither resolves the other.
     */
    row: 118,
    name: "Arjun Pillai",
    detail: "Lead Temp: High",
    problem: "Unknown Lead Priority value",
    category: "attention",
    actions: [
      "Map to an active priority value",
      "Use the default priority",
      "Edit row",
    ],
  },
  {
    row: 146,
    name: "Meera Krishnan",
    detail: "70000 33115 — matches Lead #2041",
    problem: "Possible duplicate phone number",
    category: "duplicate",
    actions: ["Skip duplicate", "Import as new", "Open existing record"],
  },
  {
    row: 203,
    name: "Farhan Ali",
    detail: "farhan.ali@example.in — matches Customer #881",
    problem: "Possible duplicate email",
    category: "duplicate",
    actions: ["Skip duplicate", "Import as new", "Open existing record"],
  },
  {
    row: 258,
    name: "(blank)",
    detail: "Row has a phone number only",
    problem: "Lead Name is missing",
    category: "cannot-import",
    actions: ["Edit row", "Keep outside import"],
  },
];

/**
 * The outcome of the presented import, accounting for every source row.
 *
 * §160 requires the result to be verifiable against what was confirmed, so
 * the four outcomes below sum to `sourceRows`. The two exclusion reasons are
 * kept apart deliberately: 12 rows still need attention (§157 lists several
 * reasons — invalid email, invalid date, unknown Lead Stage, unknown Record
 * Owner) and 8 rows could not be imported at all. Reporting them as one
 * "excluded" figure would hide which rows are recoverable.
 */
export const IMPORT_RESULT = {
  /** Rows detected in the file — matches VALIDATION_TOTALS.found. */
  sourceRows: 428,
  imported: 390,
  skippedDuplicates: 18,
  /**
   * Rows held back for a decision. Ties to VALIDATION_TOTALS.attention, and
   * deliberately generic: the reasons vary per row and are not all owner
   * problems.
   */
  needsAttention: 12,
  /** Failed required-field validation and cannot be imported. */
  cannotImport: 8,
  startedAt: "11 Sep 2026, 10:12 AM",
  finishedAt: "11 Sep 2026, 10:13 AM",
} as const;

export type ImportHistoryRow = {
  id: string;
  filename: string;
  recordType: "Leads" | "Customers";
  user: string;
  date: string;
  status: "Completed" | "Completed with errors" | "Cancelled";
  result: string;
};

export const IMPORT_HISTORY: readonly ImportHistoryRow[] = [
  {
    id: "h1",
    filename: "leads-september.xlsx",
    recordType: "Leads",
    user: "Arun Menon",
    date: "11 Sep 2026",
    status: "Completed with errors",
    result:
      "428 rows · 390 imported · 18 duplicates skipped · 12 not imported — needs attention · 8 cannot import",
  },
  {
    id: "h2",
    filename: "motor-renewals-aug.csv",
    recordType: "Customers",
    user: "Vikram Shah",
    date: "28 Aug 2026",
    status: "Completed",
    result: "212 imported",
  },
  {
    id: "h3",
    filename: "walk-in-leads-aug.xlsx",
    recordType: "Leads",
    user: "Arun Menon",
    date: "14 Aug 2026",
    status: "Completed with errors",
    result: "96 imported · 4 excluded",
  },
  {
    id: "h4",
    filename: "customer-master.csv",
    recordType: "Customers",
    user: "Arun Menon",
    date: "02 Aug 2026",
    status: "Cancelled",
    result: "Cancelled at column mapping",
  },
];

/* ------------------------------------------------------- Flow B: WhatsApp */

export type DeliveryState =
  "sending" | "sent" | "delivered" | "read" | "failed";

/**
 * The messaging state the connected WhatsApp integration reports for this
 * contact (§96, §104, §114).
 *
 * §96 is explicit that "the CRM should use the messaging eligibility/state
 * returned by the WhatsApp integration rather than asking users to understand
 * WhatsApp platform rules themselves", so this is a value the integration
 * supplies — never something the CRM works out from a clock. The
 * specification defines no time window anywhere, and none is invented here:
 * whatever rule the platform applies, the CRM reads the outcome.
 *
 * `free-form`        — §96 "normal reply/free-form messaging is allowed"
 * `template-required`— §96 "an approved/eligible template is required"
 * `unavailable`      — §114 "WhatsApp messaging unavailable"
 * `opted-out`        — §114 "Customer opted out"
 */
export type MessagingEligibility =
  "free-form" | "template-required" | "unavailable" | "opted-out";

/* ------------------------------------------- linked Lead / Customer record */

/**
 * One Customer Purchase, as the §98 template variables need it.
 *
 * Product Category, Provider and Plan / Sub-product are three separate §98
 * variables, so they are three separate fields. A single `product` string
 * cannot serve all three, and collapsing them would make it impossible to say
 * which one a template asked for.
 */
export type LinkedPurchase = {
  readonly id: string;
  /**
   * The canonical `CustomerPurchase` this is a view of.
   *
   * §98's template variables read a purchase's Category, Provider and Plan, and
   * Batch 4B made `CustomerPurchase` the one model that holds them. Rather than
   * keep a second copy of those values here — which is how the Customer profile
   * and the WhatsApp selector came to disagree about Ramesh — each entry is
   * DERIVED from a canonical purchase and keeps its id so it can be traced back.
   */
  readonly customerPurchaseId: string;
  /** §98 "Product Category". */
  readonly productCategory: string;
  /** §98 "Provider". */
  readonly provider: string;
  /** §98 "Plan / Sub-product". */
  readonly planSubProduct: string;
  /** §98 "Policy or Reference Number". Obviously fictional. */
  readonly policyReference: string;
  /** §98 "Renewal Date". */
  readonly renewalDate: string;
};

/**
 * The Lead or Customer a conversation is linked to.
 *
 * §98 requires that "variables resolve only from the recipient's own record"
 * and that "a template must never be able to pull data from a record outside
 * the sending user's permitted scope". That is only enforceable if there is
 * one explicit link per conversation and the owner is an id: a display name
 * would have to be matched against something, and matching names is how the
 * wrong record gets read.
 */
export type LinkedRecord = {
  readonly id: string;
  readonly kind: "Lead" | "Customer";
  /**
   * The person's name on THIS record. §98 keeps Customer Name and Lead Name
   * apart, so which variable this answers depends on `kind`.
   */
  readonly name: string;
  readonly reference: string;
  /**
   * SETTINGS_USERS id of the Record Owner — never a display name, and never
   * the conversation assignee unless they genuinely are the owner.
   */
  readonly recordOwnerUserId: string;
  /**
   * §98 "Product Category" for a Lead, which is an attribute of the enquiry
   * rather than of a purchase. A Customer resolves it from the applicable
   * Customer Purchase instead, so this is absent on Customer records.
   */
  readonly productCategory?: string;
  /**
   * Customer Purchases on this record. Empty for a Lead, which has no policy
   * and therefore no policy reference or renewal date to resolve.
   */
  readonly purchases: readonly LinkedPurchase[];
};

/**
 * Linked records for the WhatsApp conversations.
 *
 * Ramesh deliberately carries TWO purchases, matching his own customer
 * screen, so the "which policy is this about?" case is real rather than
 * hypothetical. His Record Owner is Neha Thomas while his conversation is
 * assigned to Sneha Thomas — the two are different jobs, and a template must
 * name the owner rather than whoever happens to be replying.
 */
/**
 * Build a WhatsApp-facing view of a canonical Customer Purchase.
 *
 * One function, so the two screens cannot drift: the plan, provider, category,
 * policy reference and renewal date all come from the same record the Customer
 * profile renders. An unresolvable id throws at module load rather than
 * rendering a purchase whose insurer is wrong.
 */
function linkedPurchaseFrom(
  purchaseId: string,
  linkedId: string,
): LinkedPurchase {
  const purchase = purchaseById(purchaseId);
  if (!purchase) {
    throw new Error(`Unknown Customer Purchase ${purchaseId}.`);
  }
  const lineage = planLineage(purchase.planId);
  if (!lineage.ok) throw new Error(lineage.reason);
  return {
    id: linkedId,
    customerPurchaseId: purchase.id,
    productCategory: lineage.lineage.category.name,
    provider: lineage.lineage.provider.name,
    planSubProduct: lineage.lineage.plan.name,
    policyReference: purchase.policyReference ?? "",
    renewalDate: purchase.renewalDate ?? "",
  };
}

export const LINKED_RECORDS: readonly LinkedRecord[] = [
  {
    id: "c881",
    kind: "Customer",
    name: "Ramesh Kumar",
    reference: "Customer · #881",
    recordOwnerUserId: "s4", // Neha Thomas — not the assignee
    purchases: [
      linkedPurchaseFrom("cp-881-a", "c881-a"),
      linkedPurchaseFrom("cp-881-b", "c881-b"),
    ],
  },
  {
    id: "c904",
    kind: "Customer",
    name: "Vikram Reddy",
    reference: "Customer · #904",
    // Kavya is in the Motor Insurance Team, so this record sits outside a
    // Health Team Lead's scope even though the conversation does not.
    recordOwnerUserId: "s10", // Kavya Raghavan
    purchases: [linkedPurchaseFrom("cp-904-a", "c904-a")],
  },
  {
    id: "c712",
    kind: "Customer",
    name: "Sneha Nair",
    reference: "Customer · #712",
    recordOwnerUserId: "s3", // Sneha Thomas
    purchases: [linkedPurchaseFrom("cp-712-a", "c712-a")],
  },
  {
    id: "c688",
    kind: "Customer",
    name: "Fathima Rasheed",
    reference: "Customer · #688",
    recordOwnerUserId: "s3", // Sneha Thomas
    purchases: [linkedPurchaseFrom("cp-688-a", "c688-a")],
  },
  {
    id: "c517",
    kind: "Customer",
    name: "Suresh Pillai",
    reference: "Customer · #517",
    recordOwnerUserId: "s4", // Neha Thomas
    purchases: [linkedPurchaseFrom("cp-517-a", "c517-a")],
  },
  {
    id: "c733",
    kind: "Customer",
    name: "Farhan Ali",
    reference: "Customer · #733",
    recordOwnerUserId: "s8", // Ajay Varma
    purchases: [linkedPurchaseFrom("cp-733-a", "c733-a")],
  },
  // Leads. No Customer Purchase exists yet, so §98's policy reference and
  // renewal date genuinely have nothing to resolve from — which is why a
  // renewal template is not offered on a Lead conversation.
  {
    id: "l2088",
    kind: "Lead",
    name: "Priya Iyer",
    reference: "Lead · #2088",
    recordOwnerUserId: "s3", // Sneha Thomas
    productCategory: "Health Insurance",
    purchases: [],
  },
  {
    id: "l2041",
    kind: "Lead",
    name: "Meera Krishnan",
    reference: "Lead · #2041",
    recordOwnerUserId: "s3",
    productCategory: "Health Insurance",
    purchases: [],
  },
  {
    id: "l2107",
    kind: "Lead",
    name: "Rajesh Menon",
    reference: "Lead · #2107",
    recordOwnerUserId: "s3",
    productCategory: "Health Insurance",
    purchases: [],
  },
  {
    id: "l2044",
    kind: "Lead",
    name: "Anitha Desai",
    reference: "Lead · #2044",
    recordOwnerUserId: "s10", // Kavya Raghavan
    productCategory: "Motor Insurance",
    purchases: [],
  },
];

/**
 * The name and reference to show for a Customer that holds purchases.
 *
 * Resolved from the linked records where the Customer also has a WhatsApp
 * conversation, plus the few who do not. One lookup, so a purchase screen never
 * prints whichever customer happened to be hardcoded into it.
 */
export function customerLabelFor(
  customerId: string,
): { readonly name: string; readonly reference: string } | undefined {
  const linked = LINKED_RECORDS.find((r) => r.id === customerId);
  if (linked) return { name: linked.name, reference: linked.reference };
  return CUSTOMERS_WITHOUT_CONVERSATIONS[customerId];
}

/** Customers who hold a purchase but no WhatsApp conversation. */
const CUSTOMERS_WITHOUT_CONVERSATIONS: Readonly<
  Record<string, { readonly name: string; readonly reference: string }>
> = {
  c893: { name: "Anil Varghese", reference: "Customer · #893" },
};

export function linkedRecordById(id: string): LinkedRecord | undefined {
  return LINKED_RECORDS.find((r) => r.id === id);
}

/**
 * A&S Fincare's own details, for §98's business-name and contact variables.
 *
 * A reserved test number and a reserved `.example` domain: neither reaches
 * anybody, and no credential or environment value appears here.
 */
export const BUSINESS = {
  name: WORKSPACE.name,
  contactDetails: "70000 00000 · help@asfincare.example",
} as const;

export type Conversation = {
  id: string;
  person: string;
  phone: string;
  recordType: "Lead" | "Customer" | "Unknown";
  recordLabel: string;
  product: string;
  lastMessage: string;
  time: string;
  /**
   * SETTINGS_USERS id of the Team Lead or Salesperson in Assigned To, or
   * null while the conversation is Unassigned (§93).
   *
   * An id rather than a display name, so authorization is never decided by
   * comparing what happens to be printed on screen. Admins and Managers can
   * never appear here, by any route (§93).
   */
  assignedToUserId: string | null;
  status: "Open" | "Closed";
  unread: number;
  delivery: DeliveryState;
  /**
   * What the integration currently permits on this conversation (§96).
   * Stored per conversation rather than derived, because the CRM is a reader
   * of this state and not its author.
   */
  messagingEligibility: MessagingEligibility;
  /**
   * The one Lead or Customer this conversation resolves template variables
   * from (§98), or null for an unknown number with no record at all.
   */
  linkedRecordId: string | null;
  /**
   * Who spoke last. Together with `unread` it is what separates a
   * conversation still waiting on the customer from one waiting on us —
   * derived in the UI rather than stored as a status the spec does not define.
   */
  lastDirection: "in" | "out";
  /** Set when a follow-up on the related record falls due. */
  followUpDue?: string;
};

export const CONVERSATIONS: readonly Conversation[] = [
  {
    id: "w1",
    person: "Ramesh Kumar",
    phone: "70000 12345",
    recordType: "Customer",
    recordLabel: "Customer · #881",
    product: "Health Insurance",
    lastMessage: "Yes, please renew it",
    time: "10:32 AM",
    assignedToUserId: "s3", // Sneha Thomas
    status: "Open",
    unread: 2,
    delivery: "read",
    messagingEligibility: "free-form",
    linkedRecordId: "c881",
    lastDirection: "in",
  },
  {
    id: "w7",
    person: "Meera Krishnan",
    phone: "70000 33115",
    recordType: "Lead",
    recordLabel: "Lead · #2041",
    product: "Health Insurance",
    lastMessage: "Can you send the premium for the family plan?",
    time: "9:58 AM",
    assignedToUserId: "s3", // Sneha Thomas
    status: "Open",
    unread: 1,
    delivery: "read",
    messagingEligibility: "free-form",
    linkedRecordId: "l2041",
    lastDirection: "in",
  },
  {
    id: "w8",
    person: "Rajesh Menon",
    phone: "70000 61204",
    recordType: "Lead",
    recordLabel: "Lead · #2107",
    product: "Health Insurance",
    lastMessage: "Sending the revised quote now",
    time: "9:20 AM",
    assignedToUserId: "s3", // Sneha Thomas
    status: "Open",
    unread: 0,
    delivery: "failed",
    messagingEligibility: "template-required",
    linkedRecordId: "l2107",
    lastDirection: "out",
  },
  {
    id: "w9",
    person: "Vikram Reddy",
    phone: "70000 77410",
    recordType: "Customer",
    recordLabel: "Customer · #904",
    product: "Motor Insurance",
    lastMessage: "Renewal reminder sent for 20 September",
    time: "Yesterday",
    assignedToUserId: "s3", // Sneha Thomas
    status: "Open",
    unread: 0,
    delivery: "delivered",
    messagingEligibility: "template-required",
    linkedRecordId: "c904",
    lastDirection: "out",
    followUpDue: "Follow-up due today, 4:00 PM",
  },
  {
    id: "w2",
    person: "Priya Iyer",
    phone: "70000 41288",
    // Priya is a LEAD in this snapshot, matching LEAD_RECORD and the
    // salesperson lead flow. She was previously labelled "Customer · #642"
    // here, which contradicted her own lead-detail screen — the same person
    // shown as two different record types at the same moment.
    recordType: "Lead",
    recordLabel: "Lead · #2088",
    product: "Health Insurance",
    lastMessage: "Thank you, received the quote comparison",
    time: "9:45 AM",
    assignedToUserId: "s3", // Sneha Thomas
    status: "Open",
    unread: 0,
    delivery: "read",
    messagingEligibility: "opted-out",
    linkedRecordId: "l2088",
    lastDirection: "in",
  },
  {
    id: "w10",
    person: "Sneha Nair",
    phone: "70000 88132",
    recordType: "Customer",
    recordLabel: "Customer · #712",
    product: "PUC Certificate",
    lastMessage: "Shared the checklist of documents to bring",
    time: "Yesterday",
    assignedToUserId: "s3", // Sneha Thomas
    status: "Open",
    unread: 0,
    delivery: "read",
    messagingEligibility: "template-required",
    linkedRecordId: "c712",
    lastDirection: "out",
  },
  {
    id: "w11",
    person: "Fathima Rasheed",
    phone: "70000 24507",
    recordType: "Customer",
    recordLabel: "Customer · #688",
    product: "Motor Insurance",
    lastMessage: "Renewal completed, thank you for the help",
    time: "09 Sep",
    assignedToUserId: "s3", // Sneha Thomas
    status: "Closed",
    unread: 0,
    delivery: "read",
    messagingEligibility: "template-required",
    linkedRecordId: "c688",
    lastDirection: "in",
  },
  {
    id: "w3",
    person: "70000 33220",
    phone: "70000 33220",
    recordType: "Unknown",
    recordLabel: "No matching record",
    product: "—",
    lastMessage: "I need more details about motor insurance",
    time: "9:12 AM",
    assignedToUserId: null,
    status: "Open",
    unread: 1,
    delivery: "delivered",
    messagingEligibility: "free-form",
    linkedRecordId: null,
    lastDirection: "in",
  },
  {
    id: "w4",
    person: "Suresh Pillai",
    phone: "70000 55210",
    recordType: "Customer",
    recordLabel: "Customer · #517",
    product: "PUC Certificate",
    lastMessage: "Document request sent",
    time: "Yesterday",
    assignedToUserId: "s4", // Neha Thomas
    status: "Open",
    unread: 0,
    delivery: "failed",
    messagingEligibility: "unavailable",
    linkedRecordId: "c517",
    lastDirection: "out",
  },
  {
    id: "w5",
    person: "Anitha Desai",
    phone: "70000 77034",
    recordType: "Lead",
    recordLabel: "Lead · #2044",
    product: "Motor Insurance",
    lastMessage: "Can you share the quote again?",
    time: "Yesterday",
    assignedToUserId: "s10", // Kavya Raghavan
    status: "Open",
    unread: 0,
    delivery: "read",
    messagingEligibility: "template-required",
    linkedRecordId: "l2044",
    lastDirection: "in",
  },
  {
    id: "w6",
    person: "Farhan Ali",
    phone: "70000 90876",
    recordType: "Customer",
    recordLabel: "Customer · #733",
    product: "Motor Insurance",
    lastMessage: "Renewal completed. Thanks for your help.",
    time: "09 Sep",
    assignedToUserId: "s8", // Ajay Varma
    status: "Closed",
    unread: 0,
    delivery: "read",
    messagingEligibility: "template-required",
    linkedRecordId: "c733",
    lastDirection: "in",
  },
];

export type Message = {
  id: string;
  direction: "in" | "out";
  body: string;
  time: string;
  delivery?: DeliveryState;
  /** Set when the message was sent from an approved template. */
  template?: string;
  failureReason?: string;
  /**
   * The id of the failed attempt this message retries (§105).
   *
   * Present on the NEW attempt, never on the original: "retrying should
   * create a new send attempt rather than rewriting the historical failed
   * attempt as successful". The failed message keeps its own Failed state
   * and stays in the history.
   */
  retryOf?: string;
};

/**
 * Message history, keyed by conversation id.
 *
 * It used to be one shared `THREAD` that every conversation fell back to, which
 * meant Vikram Reddy's conversation displayed Ramesh Kumar's renewal date and
 * his insurer. §89.1 restricts what a user may see of ANOTHER user's
 * conversations; showing one customer's policy inside a different customer's
 * thread is a worse failure than that, because no permission could ever make it
 * correct. So history is scoped by conversation and nothing falls back.
 *
 * A conversation with no seeded history is absent from this map, and
 * `messagesFor` returns an empty thread for it rather than somebody else's.
 */
export const THREADS_BY_CONVERSATION: Readonly<
  Record<string, readonly Message[]>
> = {
  /* Ramesh Kumar — Health Insurance with Star Health, renewing 26 September. */
  w1: [
    {
      id: "w1-m1",
      direction: "out",
      // His own plan, by name. §66: a customer buys a Plan / Sub-product.
      body: "Hello Ramesh, this is A&S Fincare. Your Family Health Optima policy with Star Health expires on 26 September 2026. Would you like us to assist with the renewal?",
      time: "10:15 AM",
      delivery: "read",
      template: "Policy renewal reminder",
    },
    {
      id: "w1-m2",
      direction: "in",
      body: "Yes, please renew it",
      time: "10:32 AM",
    },
    {
      id: "w1-m3",
      direction: "in",
      body: "Same cover as last year is fine. Can you send the payment link?",
      time: "10:32 AM",
    },
    {
      id: "w1-m4",
      direction: "out",
      body: "Certainly. I will confirm the premium with Star Health and send the payment link before 4 PM today.",
      time: "10:38 AM",
      delivery: "delivered",
    },
    {
      id: "w1-m5",
      direction: "out",
      body: "Could you confirm a convenient time for us to discuss your renewal options?",
      time: "10:41 AM",
      delivery: "failed",
      failureReason:
        "Message not delivered — the customer's number was unreachable.",
    },
  ],

  /*
   * Vikram Reddy — his OWN Motor Insurance policy with Shield General, renewing
   * 20 September. Nothing here mentions another customer, another plan, another
   * insurer or another date.
   */
  w9: [
    {
      id: "w9-m1",
      direction: "out",
      body: "Hello Vikram, this is A&S Fincare. Your Private Car Comprehensive policy with Shield General is due for renewal on 20 September 2026.",
      time: "Yesterday, 4:10 PM",
      delivery: "read",
      template: "Policy renewal reminder",
    },
    {
      id: "w9-m2",
      direction: "in",
      body: "Noted. Please send the renewal quote.",
      time: "Yesterday, 4:26 PM",
    },
    {
      id: "w9-m3",
      direction: "out",
      body: "Renewal reminder sent for 20 September",
      time: "Yesterday, 4:30 PM",
      delivery: "delivered",
    },
  ],

  /* Meera Krishnan — a Lead, so no policy of any kind is referred to. */
  w7: [
    {
      id: "w7-m1",
      direction: "in",
      body: "Can you send the premium for the family plan?",
      time: "9:58 AM",
    },
  ],

  /* An unknown number. No record exists, so no record data is shown. */
  w3: [
    {
      id: "w3-m1",
      direction: "in",
      body: "I need more details about motor insurance",
      time: "9:12 AM",
    },
  ],
};

/**
 * One inbound message echoing a conversation's own last message.
 *
 * Used for the conversations without a written-out history, so each still shows
 * its own words rather than borrowing anybody else's. Derived from the
 * conversation record itself, so it cannot drift from the inbox row.
 */
function seedFromLastMessage(conversation: Conversation): readonly Message[] {
  return [
    {
      id: `${conversation.id}-m1`,
      direction: conversation.lastDirection,
      body: conversation.lastMessage,
      time: conversation.time,
      ...(conversation.lastDirection === "out"
        ? { delivery: conversation.delivery }
        : {}),
    },
  ];
}

/** Every conversation's own history. Keyed by id; nothing is shared. */
export const CONVERSATION_THREADS: Readonly<
  Record<string, readonly Message[]>
> = Object.fromEntries(
  CONVERSATIONS.map((conversation) => [
    conversation.id,
    THREADS_BY_CONVERSATION[conversation.id] ??
      seedFromLastMessage(conversation),
  ]),
);

/**
 * The complete set of template variables §98 permits — nothing else.
 *
 * Each key maps to exactly one entry in §98's "Available variables" list:
 *
 * | key                       | §98 variable                   |
 * | ------------------------- | ------------------------------ |
 * | `customer_name`           | Customer Name                  |
 * | `lead_name`               | Lead Name, where applicable    |
 * | `product_category`        | Product Category               |
 * | `provider`                | Provider                       |
 * | `plan_sub_product`        | Plan / Sub-product             |
 * | `policy_reference_number` | Policy or Reference Number     |
 * | `renewal_date`            | Renewal Date                   |
 * | `record_owner_name`       | Record Owner Name              |
 * | `team_lead_name`          | Team Lead Name, where appropriate |
 * | `business_name`           | A&S Fincare business name      |
 * | `business_contact_details`| A&S Fincare contact details    |
 *
 * §98 also names what must never be a variable: policy document contents,
 * authentication data or credentials, internal identifiers that would expose
 * other records, and Closed Amount or other internal performance figures.
 * A closed union is how that stays true — a template cannot introduce an
 * arbitrary placeholder, because there is no type it could have.
 */
export const TEMPLATE_VARIABLES = [
  "customer_name",
  "lead_name",
  "product_category",
  "provider",
  "plan_sub_product",
  "policy_reference_number",
  "renewal_date",
  "record_owner_name",
  "team_lead_name",
  "business_name",
  "business_contact_details",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/**
 * The platform states §97 lists for a template.
 *
 * Deliberately not a boolean. `approved: false` could not say whether a
 * template is awaiting review, was turned down, or is simply not available
 * on the connected account — and §97 requires the interface to explain which.
 */
export type TemplateStatus =
  "Approved" | "Pending" | "Rejected" | "Unavailable";

export type Template = {
  id: string;
  name: string;
  /** §97 "Purpose" column: what the template is used for. */
  purpose: string;
  /** §97 "Language" column. */
  language: string;
  /** The state reported by the connected WhatsApp provider (§97). */
  status: TemplateStatus;
  /**
   * Whether A&S Fincare still keeps this template in use.
   *
   * Separate from `status`, because §97 makes "an inactive, pending, rejected
   * or unavailable template" unselectable — inactive is a CRM-side fact about
   * a template the platform may still report as Approved.
   */
  active: boolean;
  category: "Utility" | "Marketing";
  /**
   * The §98 variables this template declares.
   *
   * Typed as the closed union, so a template cannot declare something §98
   * does not permit. Validation also checks the body agrees with this list in
   * both directions — see `validateTemplate`.
   */
  variables: readonly TemplateVariable[];
  body: string;
};

/**
 * Sample template catalogue (§97, §197).
 *
 * Every placeholder is a §98 variable and every §98 variable used is declared.
 * Nothing here has been submitted to or approved by Meta: these are
 * placeholder rows illustrating the intended interface.
 *
 * The catalogue deliberately splits Lead-addressed from Customer-addressed
 * templates, because §98 keeps Lead Name and Customer Name apart and a Lead
 * has no Customer Purchase to resolve a policy reference or renewal date
 * from.
 */
export const TEMPLATES: readonly Template[] = [
  {
    id: "t1",
    name: "Lead follow-up reminder",
    purpose: "Follow-up",
    language: "English",
    status: "Approved",
    active: true,
    category: "Utility",
    variables: ["lead_name", "product_category", "business_name"],
    body: "Hello {{lead_name}}, following up on your {{product_category}} enquiry with {{business_name}}. Let me know a convenient time to call you.",
  },
  {
    id: "t2",
    name: "Policy renewal reminder",
    purpose: "Renewal",
    language: "English",
    status: "Approved",
    active: true,
    category: "Utility",
    variables: [
      "customer_name",
      "plan_sub_product",
      "provider",
      "renewal_date",
      "business_name",
    ],
    body: "Hello {{customer_name}}, your {{plan_sub_product}} policy with {{provider}} is due for renewal on {{renewal_date}}. Reply here if you would like {{business_name}} to assist.",
  },
  {
    id: "t3",
    name: "Policy document request",
    purpose: "Service",
    language: "English",
    status: "Approved",
    active: true,
    category: "Utility",
    // The document itself is NOT a variable: §98 forbids policy document
    // contents, and there is no §98 variable for a document name. The
    // template asks in general terms and leaves the specifics to the reply.
    variables: [
      "customer_name",
      "product_category",
      "policy_reference_number",
      "record_owner_name",
    ],
    body: "Hello {{customer_name}}, we need one more document to continue with your {{product_category}} policy {{policy_reference_number}}. {{record_owner_name}} will confirm which one and can collect it over WhatsApp.",
  },
  {
    id: "t4",
    name: "Your advisor and escalation contact",
    purpose: "Service",
    language: "English",
    status: "Approved",
    active: true,
    category: "Utility",
    // Replaces the old appointment confirmation, which could only work by
    // parameterising an appointment date and time — neither of which §98
    // permits as a variable.
    variables: [
      "customer_name",
      "product_category",
      "record_owner_name",
      "team_lead_name",
      "business_name",
      "business_contact_details",
    ],
    body: "Hello {{customer_name}}, {{record_owner_name}} is looking after your {{product_category}} policy at {{business_name}}. If you need anything further, {{team_lead_name}} can help. Reach us on {{business_contact_details}}.",
  },
  {
    id: "t5",
    name: "Policy document shared",
    purpose: "Service",
    language: "English",
    status: "Pending",
    active: true,
    category: "Utility",
    variables: ["customer_name", "product_category"],
    body: "Hello {{customer_name}}, your {{product_category}} policy document is ready. Reply here if you would like a printed copy.",
  },
  {
    id: "t6",
    name: "Festive offer",
    purpose: "Marketing",
    language: "English",
    status: "Rejected",
    active: true,
    category: "Marketing",
    variables: ["customer_name", "product_category", "business_name"],
    body: "Hello {{customer_name}}, {{business_name}} has a limited-period offer on {{product_category}}. Reply OFFER to know more.",
  },
  {
    id: "t7",
    name: "Plan confirmation",
    purpose: "Quote",
    language: "Malayalam",
    status: "Unavailable",
    active: true,
    category: "Utility",
    // The old version parameterised a premium amount, which is not a §98
    // variable. It names the plan and provider instead.
    variables: ["customer_name", "plan_sub_product", "provider"],
    body: "Hello {{customer_name}}, we have your {{plan_sub_product}} plan with {{provider}} ready to proceed. Shall we go ahead?",
  },
  {
    id: "t8",
    // Approved on the platform, but A&S Fincare has taken it out of use.
    // §97 still makes it unselectable, which is why `active` exists.
    name: "Welcome message",
    purpose: "Onboarding",
    language: "English",
    status: "Approved",
    active: false,
    category: "Utility",
    variables: ["customer_name", "business_name", "record_owner_name"],
    body: "Hello {{customer_name}}, welcome to {{business_name}}. {{record_owner_name}} will contact you shortly.",
  },
];

/* ------------------------------------------------ Flow C: salesperson day */

export type WorkItem = {
  id: string;
  person: string;
  product: string;
  due: string;
  status: "Due" | "Overdue" | "Scheduled" | "New" | "Unread";
  type: "Call" | "WhatsApp" | "Renewal" | "Lead";
  note?: string;
  /**
   * Lead Priority by stable id (§192), on Lead rows.
   *
   * §57 requires priority to be reachable and legible on the phone, where the
   * salesperson actually works.
   */
  priorityId?: string;
};

export const DUE_TODAY: readonly WorkItem[] = [
  {
    id: "d1",
    person: "Priya Iyer",
    product: "Health Insurance",
    due: "10:00 AM",
    status: "Due",
    type: "Call",
    note: "Renewal decision expected",
  },
  {
    id: "d2",
    person: "Ramesh Kumar",
    product: "Motor Insurance",
    due: "11:30 AM",
    status: "Due",
    type: "Call",
    note: "Send quote after the call",
  },
  {
    id: "d3",
    person: "Sneha Nair",
    product: "PUC Certificate",
    due: "1:00 PM",
    status: "Scheduled",
    type: "WhatsApp",
    note: "Share document checklist",
  },
];

export const OVERDUE: readonly WorkItem[] = [
  {
    id: "o1",
    person: "Rajesh Menon",
    product: "Health Insurance",
    due: "Yesterday, 3:30 PM",
    status: "Overdue",
    type: "Call",
    note: "Second attempt",
  },
  {
    id: "o2",
    person: "Amit Shah",
    product: "Motor Insurance",
    due: "09 Sep, 4:00 PM",
    status: "Overdue",
    type: "Call",
  },
];

export const NEW_LEADS: readonly WorkItem[] = [
  {
    id: "n1",
    person: "Meera Krishnan",
    product: "Health Insurance",
    due: "Assigned 8:50 AM",
    status: "New",
    type: "Lead",
    note: "Walk-in enquiry",
    // Matches her own Lead row in SALES_LEADS. Priority is a property of the
    // Lead, not of the queue it appears in.
    priorityId: "lp-hot",
  },
  {
    id: "n2",
    person: "Fathima Rasheed",
    product: "Motor Insurance",
    due: "Assigned yesterday",
    status: "New",
    type: "Lead",
    priorityId: "lp-cold",
  },
];

export const LEAD_RECORD = {
  name: "Priya Iyer",
  phone: "70000 41288",
  phoneDial: "+917000041288",
  email: "priya.iyer@example.in",
  product: "Health Insurance",
  /**
   * Where the Lead has reached in the sales process (§191).
   *
   * Separate from `priorityId` below, and never substituted for it: §43
   * "Priority and Stage are separate fields and are displayed separately."
   */
  stage: "Interested",
  /**
   * How urgent or promising the Lead is (§192), by stable id.
   *
   * A reference, not a label, so renaming the value does not change what this
   * Lead holds (§207). §57's own example shows Priya as Warm.
   */
  priorityId: "lp-warm",
  recordType: "Lead" as const,
  reference: "Lead · #2088",
  owner: "Sneha Thomas",
  nextFollowUp: "Today, 10:00 AM · Call",
  since: "29 Aug 2026",
};

export type Activity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind:
    | "call"
    | "whatsapp"
    | "note"
    | "stage"
    | "priority"
    | "created"
    | "followup";
};

export const RECORD_ACTIVITY: readonly Activity[] = [
  {
    id: "a1",
    title: "Call — Connected — logged by Sneha",
    detail: "Asked for the premium breakdown before deciding.",
    time: "Yesterday, 4:15 PM",
    kind: "call",
  },
  {
    id: "a2",
    title: "WhatsApp message sent",
    detail: "Policy renewal reminder template",
    time: "Yesterday, 11:02 AM",
    kind: "whatsapp",
  },
  {
    id: "a3",
    title: "Stage changed",
    detail: "Contacted → Interested",
    time: "08 Sep, 3:40 PM",
    kind: "stage",
  },
  {
    /*
     * §45: "Stage changes and priority changes are recorded as separate,
     * clearly distinguishable entries." Two entries, two kinds, and the stage
     * above is unaffected by the priority change below.
     */
    id: "a3b",
    title: "Priority changed by Sneha",
    detail: "Cold → Warm",
    time: "08 Sep, 3:39 PM",
    kind: "priority",
  },
  {
    id: "a4",
    title: "Follow-up scheduled by Sneha",
    detail: "Call · 11 Sep, 10:00 AM",
    time: "08 Sep, 3:38 PM",
    kind: "followup",
  },
  {
    id: "a5",
    title: "Lead created by Sneha",
    detail: "Source: Walk-in",
    time: "29 Aug, 9:15 AM",
    kind: "created",
  },
];

/** Spec §27.3 — the V1 outcome list, in order. */
/**
 * Call outcomes, exactly as spec §27.3 defines them for V1.
 *
 * Stable values, separate display labels: every screen that cares about an
 * outcome ("did they ask to be called back?") compares an identifier rather
 * than a piece of prose, so rewording a label can never quietly break the
 * behaviour attached to it.
 *
 * Two outcomes this list used to carry — "Not interested" and "Converted" —
 * are gone on purpose. They are lead-stage changes, not call results, and
 * §27.3 is explicit that saving an outcome "must not automatically change the
 * Lead stage or the Customer status". They remain valid elsewhere as pipeline
 * stages and conversion events.
 */
/**
 * One append-only audit entry for a Lead Priority change (§208).
 *
 * §208 lists "Lead Priority changes" among the actions that must be audited,
 * and the entries are "written by the application and are never" editable. §45
 * keeps this distinct from the ordinary activity timeline, so this is its own
 * list rather than another `Activity` kind.
 *
 * The labels are SNAPSHOTS taken when the change happened, not lookups: §207
 * requires that "renaming or deactivating a Lead Priority value should not
 * rewrite the priority recorded in past activity or audit entries". Ids are
 * kept alongside so an entry can still be tied to the value it refers to.
 */
export type PriorityAuditEntry = {
  readonly id: string;
  /** Which Lead. */
  readonly leadId: string;
  readonly leadName: string;
  /** SETTINGS_USERS id of whoever performed it (§207: recorded against them). */
  readonly actorUserId: string;
  readonly fromPriorityId: string | null;
  readonly fromLabel: string | null;
  readonly toPriorityId: string;
  readonly toLabel: string;
  readonly at: string;
  /**
   * §208 does not require a reason for a priority change, so none is invented.
   * The field exists only because the Lead screens already let a user add a
   * note alongside the change, and it is optional.
   */
  readonly note?: string;
};

/**
 * Sample audit entries.
 *
 * Deterministic: the wireframes have no persistence, and §208's point is the
 * shape and the scope of the record rather than a live trail.
 */
export const PRIORITY_AUDIT: readonly PriorityAuditEntry[] = [
  {
    id: "pa1",
    leadId: "l2088",
    leadName: "Priya Iyer",
    actorUserId: "s3", // Sneha Thomas — the Record Owner, in this case
    fromPriorityId: "lp-cold",
    fromLabel: "Cold",
    toPriorityId: "lp-warm",
    toLabel: "Warm",
    at: "08 Sep 2026, 3:39 PM",
  },
  {
    id: "pa2",
    leadId: "l2107",
    leadName: "Rajesh Menon",
    // An Admin acted. §207: ownership stays with the operational user and the
    // action is recorded against whoever performed it.
    actorUserId: "s1", // Arun Menon
    fromPriorityId: "lp-warm",
    fromLabel: "Warm",
    toPriorityId: "lp-hot",
    toLabel: "Hot",
    at: "09 Sep 2026, 11:20 AM",
    note: "Customer asked for a quote the same week.",
  },
  {
    id: "pa3",
    leadId: "l2119",
    leadName: "Arjun Pillai",
    actorUserId: "s3",
    fromPriorityId: "lp-warm",
    fromLabel: "Warm",
    /*
     * The labels are snapshots taken at the time, not lookups. §207: "renaming
     * or deactivating a Lead Priority value should not rewrite the priority
     * recorded in past activity or audit entries."
     */
    toPriorityId: "lp-cold",
    toLabel: "Cold",
    at: "02 Sep 2026, 9:05 AM",
  },
];

export type CallOutcomeValue =
  | "connected"
  | "no_answer"
  | "busy_or_unreachable"
  | "callback_requested"
  | "left_voicemail"
  | "wrong_number"
  | "other";

export const CALL_OUTCOMES: readonly {
  value: CallOutcomeValue;
  label: string;
}[] = [
  { value: "connected", label: "Connected" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy_or_unreachable", label: "Busy or Unreachable" },
  { value: "callback_requested", label: "Call Back Requested" },
  { value: "left_voicemail", label: "Left Voicemail" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "other", label: "Other" },
];

export function callOutcomeLabel(value: CallOutcomeValue): string {
  return CALL_OUTCOMES.find((o) => o.value === value)?.label ?? value;
}

export const FOLLOW_UP_TYPES: readonly string[] = [
  "Call",
  "WhatsApp",
  "Email",
  "Visit",
  "Other",
];

/* ------------------------------------------- Flow: customer record (mobile) */

/**
 * Ramesh Kumar's customer record — the single source for his identity.
 *
 * The WhatsApp conversation, the desktop conversation context panel and the
 * mobile customer record all read from here, so the reference, contact
 * details, owner and renewal date cannot drift apart between screens.
 *
 * Two roles are deliberately different and must stay that way (spec §87):
 * the CONVERSATION is assigned to Sneha Thomas, while the customer RECORD is
 * still owned by Neha Thomas. Reassigning a conversation does not change the
 * record owner. Both are operational users in the same team, as §2.5
 * requires — a supervisor could hold neither seat.
 */
export const CUSTOMER_RECORD = {
  name: "Ramesh Kumar",
  reference: "Customer · #881",
  status: "Active" as const,
  since: "14 Mar 2024",
  sinceLabel: "Customer since 2024",
  // Reserved Indian test range, and a reserved `.example` domain: neither can
  // reach a real person.
  phone: "70000 12345",
  email: "ramesh.kumar@mail.example",
  preferredChannel: "WhatsApp",
  /** Record owner — NOT the conversation assignee, NOT the permitted user. */
  owner: "Neha Thomas",
  /**
   * Salespeople the record has been explicitly shared with.
   *
   * This is what grants access to the customer record, and it is deliberately
   * its own field. Access is NOT derived from `conversationAssignee`: holding
   * a WhatsApp conversation is a messaging assignment, not a grant of the
   * whole customer file. Presentation-only — the real mechanism (a sharing
   * table, a team, a manager-configured rule) is still to be decided.
   */
  permittedUsers: ["Sneha Thomas"] as readonly string[],
  /** Who holds the WhatsApp conversation. Grants no record access by itself. */
  conversationAssignee: "Sneha Thomas",
  tags: ["Health Insurance", "Motor Insurance", "Renewal due"],
} as const;

export type UpcomingAction = {
  id: string;
  date: string;
  kind: "Follow-up" | "Renewal";
  detail: string;
  assignedTo: string;
  /** Spec §75: overdue actions appear before future ones. */
  overdue?: boolean;
};

export const CUSTOMER_UPCOMING: readonly UpcomingAction[] = [
  {
    id: "ua1",
    date: "14 Sep 2026, 10:00 AM",
    kind: "Follow-up",
    detail: "Call to confirm the renewal premium",
    assignedTo: "Sneha Thomas",
  },
  {
    id: "ua2",
    date: "26 Sep 2026",
    kind: "Renewal",
    detail: "Health Insurance renewal falls due",
    assignedTo: "Neha Thomas",
  },
];

/*
 * `CustomerPolicy` / `CUSTOMER_POLICIES` is gone. It modelled the purchased
 * thing as a Product CATEGORY with a provider string, carried no Plan /
 * Sub-product at all, mixed renewal states ("Due soon") into a purchase status,
 * and held the premium as a formatted string. §66 and §68 replace all of that
 * with `CustomerPurchase` in `customer-purchase.ts`, which is now the only
 * customer-specific insurance purchase model.
 */

/**
 * Ramesh Kumar's health purchase, as the renewal and directory views need it.
 *
 * Read from the canonical record rather than copied, so a plan or provider
 * rename cannot leave these screens describing a different policy. The display
 * dates below stay as their own short-form strings: those views have always
 * shown "26 Sep 2026" and reformatting them is not this batch's business.
 */
const RAMESH_HEALTH = purchaseById("cp-881-a")!;
const RAMESH_HEALTH_LINEAGE = planLineage(RAMESH_HEALTH.planId);
const RAMESH_MOTOR = purchaseById("cp-881-b")!;
const RAMESH_MOTOR_LINEAGE = planLineage(RAMESH_MOTOR.planId);

/** The category, provider and policy number of one canonical purchase. */
function purchaseFacts(
  purchase: CustomerPurchase,
  lineage: ReturnType<typeof planLineage>,
) {
  if (!lineage.ok) throw new Error(lineage.reason);
  return {
    category: lineage.lineage.category.name,
    provider: lineage.lineage.provider.name,
    plan: lineage.lineage.plan.name,
    policyRef: purchase.policyReference ?? "",
  };
}

const RAMESH_HEALTH_FACTS = purchaseFacts(RAMESH_HEALTH, RAMESH_HEALTH_LINEAGE);
const RAMESH_MOTOR_FACTS = purchaseFacts(RAMESH_MOTOR, RAMESH_MOTOR_LINEAGE);

export type CustomerActivity = {
  id: string;
  kind: "whatsapp" | "call" | "followup" | "note" | "renewal" | "created";
  title: string;
  detail: string;
  by: string;
  time: string;
};

/**
 * One chronological history for the customer (spec §76), newest first.
 *
 * WhatsApp messages, calls and follow-ups all land here rather than in
 * separate per-channel timelines. The oldest entry keeps the lead history
 * alive after conversion, which §76 illustrates directly.
 */
export const CUSTOMER_ACTIVITY: readonly CustomerActivity[] = [
  {
    id: "ca1",
    kind: "whatsapp",
    title: "WhatsApp message failed",
    detail: "Renewal options message could not be delivered",
    by: "Sneha Thomas",
    time: "Today, 10:41 AM",
  },
  {
    id: "ca2",
    kind: "whatsapp",
    title: "WhatsApp reply received",
    detail: "“Yes, please renew it”",
    by: "From Ramesh Kumar",
    time: "Today, 10:32 AM",
  },
  {
    id: "ca3",
    kind: "whatsapp",
    title: "WhatsApp reminder sent",
    detail: "Health Insurance renewal, policy renewal reminder template",
    by: "Sneha Thomas",
    time: "Today, 10:15 AM",
  },
  {
    id: "ca4",
    kind: "call",
    title: "Call — Connected",
    detail: "Confirmed he wants to renew on the same cover",
    by: "Sneha Thomas",
    time: "09 Sep, 4:15 PM",
  },
  {
    id: "ca5",
    kind: "followup",
    title: "Follow-up scheduled",
    detail: "Call · 14 Sep 2026, 10:00 AM",
    by: "Sneha Thomas",
    time: "08 Sep, 3:38 PM",
  },
  {
    id: "ca6",
    kind: "note",
    title: "Note added",
    detail: "Prefers WhatsApp over calls during working hours",
    by: "Arun Menon",
    time: "02 Sep, 11:10 AM",
  },
  {
    id: "ca7",
    kind: "renewal",
    title: "Renewal reminder generated",
    detail: "Health Insurance · due 26 Sep 2026",
    by: "Reminder rule",
    time: "01 Sep, 9:00 AM",
  },
  {
    id: "ca8",
    kind: "created",
    title: "Customer created from lead",
    detail: "Converted after the first Health Insurance enquiry",
    by: "Arun Menon",
    time: "14 Mar 2024",
  },
];

/* --------------------------------------- Flow: customer directory (mobile) */

/**
 * The date the whole presentation is anchored to.
 *
 * Every relative phrase on the directory ("in 15 days", "Due today") is
 * derived from a day offset against this, so the cards can never disagree
 * with the customer record's own "Renews in 15 days".
 */
export const PRESENTATION_TODAY = "11 Sep 2026";

/**
 * The same day in the format a native date input needs.
 *
 * Kept beside PRESENTATION_TODAY rather than parsed at runtime so the two can
 * never disagree, and so no screen has to invent a second "today".
 */
export const PRESENTATION_TODAY_ISO = "2026-09-11";

export type DirectoryCustomer = {
  id: string;
  name: string;
  /** "Customer · #881" — the same shape the WhatsApp rows use. */
  reference: string;
  phone: string;
  email: string;
  /** Nearest upcoming renewal on one of their purchases (spec §53). */
  product: string;
  /** Spec §53 allows a count where a customer holds several. */
  serviceCount?: number;
  /** Obviously fictional — never a real policy or government identifier. */
  policyRef: string;
  /** Record owner, which is not necessarily the signed-in user. */
  owner: string;
  /** Next due/renewal date and its offset in days from PRESENTATION_TODAY. */
  renewal: string;
  renewalInDays: number;
  /** Spec §66 statuses. */
  renewalStatus: "Upcoming" | "Due Today" | "Overdue" | "Renewed";
  /** Next follow-up, where one is scheduled. Negative days = overdue. */
  followUp?: { label: string; inDays: number };
  /** Spec §53 "Last Activity". */
  lastActivity: string;
  lastActivityDaysAgo: number;
  /**
   * Salespeople the record is explicitly shared with, beyond its owner.
   *
   * Together with `owner` this is the ONLY thing that decides whether a
   * customer appears in someone's directory. `conversationAssignee` does not
   * enter into it.
   */
  permittedUsers: readonly string[];
  /**
   * Who holds the WhatsApp conversation, where there is one. Shown so the
   * three roles stay visibly distinct; it grants no access on its own.
   */
  conversationAssignee?: string;
  /** Set ONLY where a record wireframe exists for this person. */
  hasRecord?: boolean;
  /** Set ONLY where a conversation wireframe exists for this person. */
  hasConversation?: boolean;
};

/**
 * Customers Sneha Thomas is permitted to work with.
 *
 * Ramesh is spread from CUSTOMER_RECORD and his canonical purchase rather than
 * retyped, so his phone, email, owner, policy reference and renewal date
 * cannot drift away from the record screen and the WhatsApp flow.
 *
 * Everyone else here is fictional. Where a person also appears in
 * CONVERSATIONS, the reference, phone, product and last message agree with
 * that entry — a directory that contradicted the inbox would be worse than no
 * directory at all. Leads (Meera Krishnan, Rajesh Menon, Anitha Desai) are
 * deliberately absent: this is the customer directory.
 */
export const DIRECTORY_CUSTOMERS: readonly DirectoryCustomer[] = [
  {
    id: "d881",
    name: CUSTOMER_RECORD.name,
    reference: CUSTOMER_RECORD.reference,
    phone: CUSTOMER_RECORD.phone,
    email: CUSTOMER_RECORD.email,
    product: RAMESH_HEALTH_FACTS.category,
    serviceCount: purchasesForCustomer("c881").length,
    policyRef: RAMESH_HEALTH_FACTS.policyRef,
    owner: CUSTOMER_RECORD.owner,
    renewal: "26 Sep 2026",
    renewalInDays: 15, // 26 Sep 2026, from PRESENTATION_TODAY
    renewalStatus: "Upcoming",
    followUp: { label: "14 Sep 2026, 10:00 AM", inDays: 3 },
    lastActivity: "WhatsApp · Today, 10:41 AM",
    lastActivityDaysAgo: 0,
    // Three separate facts: Arun owns it, Sneha is permitted on it, Sneha
    // holds the conversation. All three come from the shared record.
    permittedUsers: CUSTOMER_RECORD.permittedUsers,
    conversationAssignee: CUSTOMER_RECORD.conversationAssignee,
    hasRecord: true,
    hasConversation: true,
  },
  {
    id: "d904",
    name: "Vikram Reddy",
    reference: "Customer · #904",
    phone: "70000 77410",
    email: "vikram.reddy@mail.example",
    product: "Motor Insurance",
    policyRef: "POL-TEST-904-A",
    owner: "Sneha Thomas",
    renewal: "20 Sep 2026",
    renewalInDays: 9,
    renewalStatus: "Upcoming",
    followUp: { label: "09 Sep 2026, 2:30 PM", inDays: -2 },
    lastActivity: "WhatsApp · Yesterday",
    lastActivityDaysAgo: 1,
    permittedUsers: [],
  },
  {
    id: "d712",
    name: "Sneha Nair",
    reference: "Customer · #712",
    phone: "70000 88132",
    email: "sneha.nair@mail.example",
    product: "PUC Certificate",
    policyRef: "PUC-TEST-712",
    owner: "Sneha Thomas",
    renewal: PRESENTATION_TODAY,
    renewalInDays: 0,
    renewalStatus: "Due Today",
    followUp: { label: "Today, 3:00 PM", inDays: 0 },
    lastActivity: "WhatsApp · Yesterday",
    lastActivityDaysAgo: 1,
    permittedUsers: [],
  },
  {
    id: "d859",
    name: "Joseph Thomas",
    reference: "Customer · #859",
    phone: "70000 51904",
    email: "joseph.thomas@mail.example",
    product: "Motor Insurance",
    policyRef: "POL-TEST-859-A",
    owner: "Sneha Thomas",
    renewal: "03 Sep 2026",
    renewalInDays: -8,
    renewalStatus: "Overdue",
    followUp: { label: "08 Sep 2026, 11:00 AM", inDays: -3 },
    lastActivity: "Call · 08 Sep",
    lastActivityDaysAgo: 3,
    permittedUsers: [],
  },
  {
    id: "d893",
    name: "Anil Varghese",
    reference: "Customer · #893",
    phone: "70000 63118",
    email: "anil.varghese@mail.example",
    product: "Travel Insurance",
    policyRef: "POL-TEST-893-A",
    owner: "Sneha Thomas",
    renewal: "24 Sep 2026",
    renewalInDays: 13,
    renewalStatus: "Upcoming",
    lastActivity: "Call · 05 Sep",
    lastActivityDaysAgo: 6,
    permittedUsers: [],
  },
  {
    id: "d921",
    name: "Lakshmi Nair",
    reference: "Customer · #921",
    phone: "70000 30276",
    email: "lakshmi.nair@mail.example",
    product: "Health Insurance",
    policyRef: "POL-TEST-921-A",
    owner: "Sneha Thomas",
    renewal: "05 Nov 2026",
    renewalInDays: 55,
    renewalStatus: "Upcoming",
    followUp: { label: "12 Sep 2026, 11:30 AM", inDays: 1 },
    lastActivity: "Note · 02 Sep",
    lastActivityDaysAgo: 9,
    permittedUsers: [],
  },
  {
    id: "d688",
    name: "Fathima Rasheed",
    reference: "Customer · #688",
    phone: "70000 24507",
    email: "fathima.rasheed@mail.example",
    product: "Motor Insurance",
    serviceCount: 3,
    policyRef: "POL-TEST-688-A",
    owner: "Sneha Thomas",
    // Renewed on 09 Sep, so the next cycle is a year out (spec §71).
    renewal: "20 Aug 2027",
    renewalInDays: 343,
    renewalStatus: "Renewed",
    lastActivity: "WhatsApp · 09 Sep",
    lastActivityDaysAgo: 2,
    permittedUsers: [],
  },
  {
    id: "d877",
    name: "Deepa Menon",
    reference: "Customer · #877",
    phone: "70000 45890",
    email: "deepa.menon@mail.example",
    product: "Health Insurance",
    serviceCount: 3,
    policyRef: "POL-TEST-877-A",
    owner: "Sneha Thomas",
    renewal: "22 Jan 2027",
    renewalInDays: 133,
    renewalStatus: "Upcoming",
    lastActivity: "Email · 21 Aug",
    lastActivityDaysAgo: 21,
    permittedUsers: [],
  },
];

/** Spec §64 uses "Next 30 Days" as the near-term renewal window. */
export const RENEWAL_WINDOW_DAYS = 30;

/* ------------------------------------------ Flow: follow-ups (mobile) */

/** Spec §40 lists exactly these Follow-up Types for V1. */
export type FollowUpType = "Call" | "WhatsApp" | "Email" | "Visit" | "Other";

export type MobileFollowUp = {
  id: string;
  person: string;
  /** Spec §43 "Record Type" — which module the follow-up belongs to. */
  recordType: "Lead" | "Customer";
  reference: string;
  /** Spec §43 "Related To". */
  product: string;
  type: FollowUpType;
  date: string;
  time: string;
  /**
   * Offset in days from PRESENTATION_TODAY. Negative is in the past.
   *
   * Every bucket, count and "3 days overdue" phrase is computed from this, so
   * there is no hard-coded total anywhere that can go stale.
   */
  dueInDays: number;
  assignedTo: string;
  note: string;
  phone: string;
  /** Set only where a record wireframe actually exists for this person. */
  record?: "lead" | "customer";
  /** Set only where a mobile conversation wireframe exists. */
  hasConversation?: boolean;
  /**
   * Present on already-completed items (spec §41 outcome/note). Holds the
   * stable §27.3 value, never the display label.
   */
  outcome?: CallOutcomeValue;
  completedOn?: string;
};

/**
 * Sneha Thomas's follow-up workload.
 *
 * VISIBILITY: spec §43 says operational users should primarily see follow-ups
 * assigned to them unless broader permissions are granted, and §2.3 gives a
 * Salesperson no right to view all Leads/Customers. So every item here is
 * assigned to Sneha — the list is not filtered down from a wider set, because
 * a wider set is not hers to hold.
 *
 * Note that assignment of a follow-up is its own fact. Anitha Desai's WhatsApp
 * conversation belongs to Kavya Raghavan and she is absent here; Ramesh's
 * record is owned by Neha yet his follow-up is Sneha's. Neither implies the
 * other.
 *
 * Identities agree with the rest of the presentation: references, phones and
 * products match CONVERSATIONS, LEAD_RECORD and DIRECTORY_CUSTOMERS, and the
 * dates match the follow-ups those screens already show.
 */
export const MOBILE_FOLLOW_UPS: readonly MobileFollowUp[] = [
  {
    id: "mf1",
    person: "Joseph Thomas",
    recordType: "Customer",
    reference: "Customer · #859",
    product: "Motor Insurance",
    type: "Call",
    date: "08 Sep 2026",
    time: "11:00 AM",
    dueInDays: -3,
    assignedTo: SALES_PERSONA.name,
    note: "Renewal lapsed — confirm whether he wants to continue the cover.",
    phone: "70000 51904",
  },
  {
    id: "mf2",
    person: "Vikram Reddy",
    recordType: "Customer",
    reference: "Customer · #904",
    product: "Motor Insurance",
    type: "WhatsApp",
    date: "09 Sep 2026",
    time: "2:30 PM",
    dueInDays: -2,
    assignedTo: SALES_PERSONA.name,
    note: "Send the renewal quote he asked for on the call.",
    phone: "70000 77410",
  },
  {
    id: "mf3",
    person: "Priya Iyer",
    recordType: "Lead",
    reference: "Lead · #2088",
    product: "Health Insurance",
    type: "Call",
    date: PRESENTATION_TODAY,
    time: "10:00 AM",
    dueInDays: 0,
    assignedTo: SALES_PERSONA.name,
    note: "Renewal decision expected — she was comparing two quotes.",
    phone: "70000 41288",
    record: "lead",
  },
  {
    id: "mf4",
    person: "Sneha Nair",
    recordType: "Customer",
    reference: "Customer · #712",
    product: "PUC Certificate",
    type: "WhatsApp",
    date: PRESENTATION_TODAY,
    time: "3:00 PM",
    dueInDays: 0,
    assignedTo: SALES_PERSONA.name,
    note: "Check she has the documents from the checklist.",
    phone: "70000 88132",
  },
  {
    id: "mf5",
    person: "Meera Krishnan",
    recordType: "Lead",
    reference: "Lead · #2041",
    product: "Health Insurance",
    type: "Call",
    date: PRESENTATION_TODAY,
    time: "4:30 PM",
    dueInDays: 0,
    assignedTo: SALES_PERSONA.name,
    note: "First call after she asked for a family floater quote.",
    phone: "70000 33115",
  },
  {
    id: "mf6",
    person: "Lakshmi Nair",
    recordType: "Customer",
    reference: "Customer · #921",
    product: "Health Insurance",
    type: "Email",
    date: "12 Sep 2026",
    time: "11:30 AM",
    dueInDays: 1,
    assignedTo: SALES_PERSONA.name,
    note: "Email the revised cover summary she asked for in writing.",
    phone: "70000 30276",
  },
  {
    id: "mf7",
    person: CUSTOMER_RECORD.name,
    recordType: "Customer",
    reference: CUSTOMER_RECORD.reference,
    product: RAMESH_HEALTH_FACTS.category,
    type: "Call",
    date: "14 Sep 2026",
    time: "10:00 AM",
    dueInDays: 3,
    assignedTo: SALES_PERSONA.name,
    note: "Confirm the renewal premium before the 26 Sep due date.",
    phone: CUSTOMER_RECORD.phone,
    record: "customer",
    hasConversation: true,
  },
  {
    id: "mf8",
    person: "Arjun Pillai",
    recordType: "Lead",
    reference: "Lead · #2119",
    product: "Motor Insurance",
    type: "Visit",
    date: "17 Sep 2026",
    time: "11:00 AM",
    dueInDays: 6,
    assignedTo: SALES_PERSONA.name,
    note: "Visit the showroom to collect the vehicle papers.",
    phone: "70000 58203",
  },
  {
    id: "mf9",
    person: "Rajesh Menon",
    recordType: "Lead",
    reference: "Lead · #2107",
    product: "Health Insurance",
    type: "Call",
    date: "10 Sep 2026",
    time: "3:30 PM",
    dueInDays: -1,
    assignedTo: SALES_PERSONA.name,
    note: "Second attempt after no answer.",
    phone: "70000 61204",
    outcome: "connected",
    completedOn: "10 Sep 2026, 3:42 PM",
  },
  {
    id: "mf10",
    person: "Fathima Rasheed",
    recordType: "Customer",
    reference: "Customer · #688",
    product: "Motor Insurance",
    type: "WhatsApp",
    date: "09 Sep 2026",
    time: "12:00 PM",
    dueInDays: -2,
    assignedTo: SALES_PERSONA.name,
    note: "Confirm the renewal went through.",
    phone: "70000 24507",
    outcome: "connected",
    completedOn: "09 Sep 2026, 12:18 PM",
  },
];

/* ------------------------------------- Records a salesperson may work with */

export type PermittedRecord = {
  id: string;
  name: string;
  recordType: "Lead" | "Customer";
  reference: string;
  product: string;
  /** Who owns the record. Shown where it is not the signed-in user. */
  owner: string;
  /** How this user reaches it: they own it, or it is explicitly shared. */
  access: "owner" | "shared";
  /**
   * Lead Priority by stable id (§192). Present on Leads only — a Customer has
   * no Lead Priority.
   */
  priorityId?: string;
};

/**
 * Leads owned by the signed-in salesperson.
 *
 * Priya is spread from LEAD_RECORD so her reference and product cannot drift
 * from her own detail screen. The others are hers by ownership, stated here
 * rather than inferred from anything else.
 *
 * Anitha Desai (Lead · #2044) is deliberately absent. Her WhatsApp
 * conversation is assigned to Kavya Raghavan, and a conversation assignment
 * is not record access — the same rule the customer directory follows.
 */
export const SALES_LEADS: readonly PermittedRecord[] = [
  {
    id: "l2088",
    name: LEAD_RECORD.name,
    recordType: "Lead",
    reference: LEAD_RECORD.reference,
    product: LEAD_RECORD.product,
    owner: LEAD_RECORD.owner,
    access: "owner",
    priorityId: "lp-warm",
  },
  {
    id: "l2041",
    name: "Meera Krishnan",
    recordType: "Lead",
    reference: "Lead · #2041",
    product: "Health Insurance",
    owner: SALES_PERSONA.name,
    access: "owner",
    priorityId: "lp-hot",
  },
  {
    id: "l2107",
    name: "Rajesh Menon",
    recordType: "Lead",
    reference: "Lead · #2107",
    product: "Health Insurance",
    owner: SALES_PERSONA.name,
    access: "owner",
    priorityId: "lp-hot",
  },
  {
    id: "l2119",
    name: "Arjun Pillai",
    recordType: "Lead",
    reference: "Lead · #2119",
    product: "Motor Insurance",
    owner: SALES_PERSONA.name,
    access: "owner",
    priorityId: "lp-cold",
  },
];

/**
 * Every Lead and Customer the signed-in salesperson may work with.
 *
 * Customers come from DIRECTORY_CUSTOMERS through the SAME rule the directory
 * itself applies — owned, or explicitly shared via `permittedUsers`. Nothing
 * is added because a WhatsApp conversation happens to be assigned to her, so
 * this list and the directory can never disagree about who she may reach.
 */
export function permittedRecordsFor(user: string): readonly PermittedRecord[] {
  const customers = DIRECTORY_CUSTOMERS.filter(
    (c) => c.owner === user || c.permittedUsers.includes(user),
  ).map<PermittedRecord>((c) => ({
    id: c.id,
    name: c.name,
    recordType: "Customer",
    reference: c.reference,
    product: c.product,
    owner: c.owner,
    access: c.owner === user ? "owner" : "shared",
  }));

  return [...SALES_LEADS.filter((l) => l.owner === user), ...customers];
}

/**
 * Stable key for a record, used when one screen asks another to preselect it.
 *
 * A key, never a name and never a URL: the receiving screen looks it up among
 * the records the user may actually reach, so an unknown or tampered value
 * simply matches nothing and preselects nothing.
 */
export function recordKeyOf(r: PermittedRecord): string {
  const digits = r.reference.replace(/\D/g, "");
  return `${r.recordType.toLowerCase()}-${digits}`;
}

/* ------------------------------------ Flow: renewals & reminders (mobile) */

/** Spec §68's reminder statuses, verbatim. */
export type ReminderStatus =
  "Not Scheduled" | "Scheduled" | "Sent" | "Failed" | "Cancelled";

/** Spec §67 configures reminders at 30, 7 and 1 days before the due date. */
export type ReminderStage = {
  /** "30 days before", "7 days before", "1 day before" (§67). */
  offsetDays: 30 | 7 | 1;
  /** §67 channels: In-app, WhatsApp, Email. */
  channel: "In-app" | "WhatsApp" | "Email";
  status: ReminderStatus;
  /** When it went, or is due to go. */
  date: string;
  /** §67: a channel that cannot be used must not fail silently. */
  failureReason?: string;
};

/** Spec §66 statuses. "Not Renewing" (§73) leaves the active work views. */
export type RenewalStatus =
  "Upcoming" | "Due Today" | "Overdue" | "Renewed / Completed";

export type MobileRenewal = {
  id: string;
  customer: string;
  /** "Customer · #881" — the same shape every other screen uses. */
  reference: string;
  product: string;
  provider: string;
  /** Obviously fictional test reference. */
  policyRef: string;
  /** Due/Renewal date and its offset from PRESENTATION_TODAY. */
  due: string;
  dueInDays: number;
  status: RenewalStatus;
  /**
   * Record owner of the CUSTOMER — not the renewal's assignee (§65).
   */
  recordOwner: string;
  /**
   * Who the RENEWAL ACTION is assigned to. §65: "A Renewal action uses
   * Assigned To, not Record Owner", defaulting to the Record Owner and
   * reassignable by authorised users. Changing it does not change ownership.
   */
  assignedTo: string;
  reminders: readonly ReminderStage[];
  /** Last recorded contact about this renewal, where there has been one. */
  lastContact?: string;
  /** Set only where that customer's record wireframe exists. */
  hasRecord?: boolean;
  /** Set only where that customer's conversation wireframe exists. */
  hasConversation?: boolean;
  /** Allow-listed key for preselecting this customer elsewhere. */
  recordKey: string;
  /** Present once renewed (§71): the cycle that closed, kept in history. */
  renewedOn?: string;
  previousDue?: string;
};

/**
 * Renewals Sneha Thomas is permitted to work on.
 *
 * Visibility is the customer rule already in force — owned by her, or
 * explicitly shared with her — combined with §65's separate question of who
 * the renewal ACTION is assigned to. A WhatsApp conversation assignment gives
 * neither.
 *
 * Ramesh's health renewal is spread from CUSTOMER_RECORD and
 * his canonical purchase, and its reminder schedule is §68's own worked example
 * (30 days before Sent 27 Aug · 7 days before Scheduled 19 Sep · 1 day before
 * Scheduled 25 Sep) — which is that renewal, because §68 was written around
 * a 26 Sep due date.
 *
 * Every other row reuses a customer and policy reference that already exists
 * in DIRECTORY_CUSTOMERS. Deepa Menon and Fathima Rasheed each hold three
 * services there, so their extra policies are already implied rather than
 * invented.
 */
export const MOBILE_RENEWALS: readonly MobileRenewal[] = [
  {
    id: "r859a",
    customer: "Joseph Thomas",
    reference: "Customer · #859",
    product: "Motor Insurance",
    provider: "Shield General (sample provider)",
    policyRef: "POL-TEST-859-A",
    due: "03 Sep 2026",
    dueInDays: -8,
    status: "Overdue",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "WhatsApp",
        status: "Sent",
        date: "04 Aug 2026",
      },
      {
        offsetDays: 7,
        channel: "WhatsApp",
        status: "Sent",
        date: "27 Aug 2026",
      },
      {
        offsetDays: 1,
        channel: "WhatsApp",
        status: "Failed",
        date: "02 Sep 2026",
        failureReason:
          "The reminder template was not approved at the time of sending.",
      },
    ],
    lastContact: "Call · 08 Sep",
    recordKey: "customer-859",
  },
  {
    id: "r877b",
    customer: "Deepa Menon",
    reference: "Customer · #877",
    product: "Motor Insurance",
    provider: "Shield General (sample provider)",
    policyRef: "POL-TEST-877-B",
    due: "05 Sep 2026",
    dueInDays: -6,
    status: "Overdue",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      { offsetDays: 30, channel: "Email", status: "Sent", date: "06 Aug 2026" },
      { offsetDays: 7, channel: "Email", status: "Sent", date: "29 Aug 2026" },
      { offsetDays: 1, channel: "In-app", status: "Sent", date: "04 Sep 2026" },
    ],
    lastContact: "Email · 21 Aug",
    recordKey: "customer-877",
  },
  {
    id: "r712",
    customer: "Sneha Nair",
    reference: "Customer · #712",
    product: "PUC Certificate",
    provider: "Regional testing centre",
    policyRef: "PUC-TEST-712",
    due: PRESENTATION_TODAY,
    dueInDays: 0,
    status: "Due Today",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "WhatsApp",
        status: "Sent",
        date: "12 Aug 2026",
      },
      {
        offsetDays: 7,
        channel: "WhatsApp",
        status: "Sent",
        date: "04 Sep 2026",
      },
      { offsetDays: 1, channel: "In-app", status: "Sent", date: "10 Sep 2026" },
    ],
    lastContact: "WhatsApp · Yesterday",
    recordKey: "customer-712",
  },
  {
    id: "r904",
    customer: "Vikram Reddy",
    reference: "Customer · #904",
    product: "Motor Insurance",
    provider: "Shield General (sample provider)",
    policyRef: "POL-TEST-904-A",
    due: "20 Sep 2026",
    dueInDays: 9,
    status: "Upcoming",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "WhatsApp",
        status: "Sent",
        date: "21 Aug 2026",
      },
      {
        offsetDays: 7,
        channel: "WhatsApp",
        status: "Scheduled",
        date: "13 Sep 2026",
      },
      {
        offsetDays: 1,
        channel: "In-app",
        status: "Scheduled",
        date: "19 Sep 2026",
      },
    ],
    lastContact: "WhatsApp · Yesterday",
    recordKey: "customer-904",
  },
  {
    id: "r893",
    customer: "Anil Varghese",
    reference: "Customer · #893",
    product: "Travel Insurance",
    provider: "Shield General (sample provider)",
    policyRef: "POL-TEST-893-A",
    due: "24 Sep 2026",
    dueInDays: 13,
    status: "Upcoming",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      { offsetDays: 30, channel: "Email", status: "Sent", date: "25 Aug 2026" },
      {
        offsetDays: 7,
        channel: "Email",
        status: "Scheduled",
        date: "17 Sep 2026",
      },
      {
        offsetDays: 1,
        channel: "In-app",
        status: "Scheduled",
        date: "23 Sep 2026",
      },
    ],
    lastContact: "Call · 05 Sep",
    recordKey: "customer-893",
  },
  {
    // Spread from the shared record: reference, product, provider, policy
    // reference and due date all come from Ramesh's own policy.
    id: "r881a",
    customer: CUSTOMER_RECORD.name,
    reference: CUSTOMER_RECORD.reference,
    product: RAMESH_HEALTH_FACTS.category,
    provider: RAMESH_HEALTH_FACTS.provider,
    policyRef: RAMESH_HEALTH_FACTS.policyRef,
    due: "26 Sep 2026",
    dueInDays: 15, // 26 Sep 2026, from PRESENTATION_TODAY
    status: "Upcoming",
    // §65's own example: Record Owner Arun, renewal Assigned To Sneha.
    recordOwner: CUSTOMER_RECORD.owner,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "WhatsApp",
        status: "Sent",
        date: "27 Aug 2026",
      },
      {
        offsetDays: 7,
        channel: "WhatsApp",
        status: "Scheduled",
        date: "19 Sep 2026",
      },
      {
        offsetDays: 1,
        channel: "In-app",
        status: "Scheduled",
        date: "25 Sep 2026",
      },
    ],
    lastContact: "WhatsApp · Today, 10:41 AM",
    hasRecord: true,
    hasConversation: true,
    recordKey: "customer-881",
  },
  {
    id: "r921",
    customer: "Lakshmi Nair",
    reference: "Customer · #921",
    product: "Health Insurance",
    provider: "Star Health",
    policyRef: "POL-TEST-921-A",
    due: "05 Nov 2026",
    dueInDays: 55,
    status: "Upcoming",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "Email",
        status: "Scheduled",
        date: "06 Oct 2026",
      },
      {
        offsetDays: 7,
        channel: "Email",
        status: "Scheduled",
        date: "29 Oct 2026",
      },
      {
        offsetDays: 1,
        channel: "In-app",
        status: "Scheduled",
        date: "04 Nov 2026",
      },
    ],
    lastContact: "Note · 02 Sep",
    recordKey: "customer-921",
  },
  {
    id: "r881b",
    customer: CUSTOMER_RECORD.name,
    reference: CUSTOMER_RECORD.reference,
    product: RAMESH_MOTOR_FACTS.category,
    provider: RAMESH_MOTOR_FACTS.provider,
    policyRef: RAMESH_MOTOR_FACTS.policyRef,
    due: "11 Jan 2027",
    dueInDays: 122,
    status: "Upcoming",
    recordOwner: CUSTOMER_RECORD.owner,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "WhatsApp",
        status: "Not Scheduled",
        date: "12 Dec 2026",
      },
      {
        offsetDays: 7,
        channel: "WhatsApp",
        status: "Not Scheduled",
        date: "04 Jan 2027",
      },
      {
        offsetDays: 1,
        channel: "In-app",
        status: "Not Scheduled",
        date: "10 Jan 2027",
      },
    ],
    hasRecord: true,
    hasConversation: true,
    recordKey: "customer-881",
  },
  {
    id: "r877a",
    customer: "Deepa Menon",
    reference: "Customer · #877",
    product: "Health Insurance",
    provider: "Star Health",
    policyRef: "POL-TEST-877-A",
    due: "22 Jan 2027",
    dueInDays: 133,
    status: "Upcoming",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "Email",
        status: "Not Scheduled",
        date: "23 Dec 2026",
      },
      {
        offsetDays: 7,
        channel: "Email",
        status: "Not Scheduled",
        date: "15 Jan 2027",
      },
      {
        offsetDays: 1,
        channel: "In-app",
        status: "Not Scheduled",
        date: "21 Jan 2027",
      },
    ],
    lastContact: "Email · 21 Aug",
    recordKey: "customer-877",
  },
  {
    id: "r688",
    customer: "Fathima Rasheed",
    reference: "Customer · #688",
    product: "Motor Insurance",
    provider: "Shield General (sample provider)",
    policyRef: "POL-TEST-688-A",
    // §71: the new cycle's date. The closed cycle stays in history below.
    due: "20 Aug 2027",
    dueInDays: 343,
    status: "Renewed / Completed",
    recordOwner: SALES_PERSONA.name,
    assignedTo: SALES_PERSONA.name,
    reminders: [
      {
        offsetDays: 30,
        channel: "WhatsApp",
        status: "Sent",
        date: "21 Jul 2026",
      },
      {
        offsetDays: 7,
        channel: "WhatsApp",
        status: "Sent",
        date: "13 Aug 2026",
      },
      {
        offsetDays: 1,
        channel: "In-app",
        status: "Cancelled",
        date: "19 Aug 2026",
      },
    ],
    lastContact: "WhatsApp · 09 Sep",
    renewedOn: "09 Sep 2026",
    previousDue: "20 Aug 2026",
    recordKey: "customer-688",
  },
];

/**
 * That customer's phone number, from the directory that already holds it.
 *
 * Returns null rather than a placeholder when the customer is not in the
 * directory: a screen that cannot find a number must say so, because a
 * plausible-looking invented number is the one failure mode worth designing
 * against here.
 */
export function customerPhoneByReference(reference: string): string | null {
  return (
    DIRECTORY_CUSTOMERS.find((c) => c.reference === reference)?.phone ?? null
  );
}

/**
 * Renewals due within the near-term window (§64's "Next 30 Days"), excluding
 * anything already overdue or completed. Shared so the Today screen, the More
 * badge and the Renewals workspace cannot disagree about what "due soon" is.
 */
export function renewalsDueSoon(): readonly MobileRenewal[] {
  return MOBILE_RENEWALS.filter(
    (r) =>
      r.status !== "Overdue" &&
      r.status !== "Renewed / Completed" &&
      r.dueInDays <= RENEWAL_DUE_SOON_DAYS,
  );
}

/** Renewals whose due date has passed without completion (§74). */
export function renewalsOverdue(): readonly MobileRenewal[] {
  return MOBILE_RENEWALS.filter((r) => r.status === "Overdue");
}

/** Handles on individual shared renewals, for the views that reuse them. */
const RENEWAL_VIKRAM = MOBILE_RENEWALS.find((r) => r.id === "r904")!;
const RENEWAL_LAKSHMI = MOBILE_RENEWALS.find((r) => r.id === "r921")!;

/** §64 uses "Next 30 Days" as the near-term renewal window. */
export const RENEWAL_DUE_SOON_DAYS = 30;

/* ------------------------------------------------- Flow D: admin dashboard */

export const DASHBOARD_METRICS = [
  { id: "new-leads", label: "New Leads", value: 18, caption: "this week" },
  {
    id: "followups",
    label: "Follow-ups Today",
    value: 12,
    caption: "across 5 users",
  },
  {
    id: "renewals",
    label: "Renewals Due Soon",
    value: 24,
    caption: "next 30 days",
  },
  {
    id: "overdue",
    label: "Overdue Actions",
    value: 5,
    caption: "needs attention",
  },
] as const;

export type FollowUpRow = {
  id: string;
  time: string;
  person: string;
  product: string;
  type: string;
  assignedTo: string;
  status: "Due" | "Scheduled" | "Overdue";
};

export const TODAY_FOLLOW_UPS: readonly FollowUpRow[] = [
  {
    id: "f1",
    time: "10:00 AM",
    person: "Priya Iyer",
    product: "Health Insurance",
    type: "Call",
    assignedTo: "Sneha Thomas",
    status: "Due",
  },
  {
    id: "f2",
    time: "11:30 AM",
    person: "Ramesh Kumar",
    product: "Motor Insurance",
    type: "Call",
    assignedTo: "Neha Thomas",
    status: "Due",
  },
  {
    id: "f3",
    time: "1:00 PM",
    person: "Sneha Nair",
    product: "PUC Certificate",
    type: "WhatsApp",
    assignedTo: "Divya Mohan",
    status: "Due",
  },
  {
    id: "f4",
    time: "3:30 PM",
    person: "Rajesh Menon",
    product: "Health Insurance",
    type: "Call",
    assignedTo: "Sneha Thomas",
    status: "Scheduled",
  },
  {
    id: "f5",
    time: "4:00 PM",
    person: "Amit Shah",
    product: "Motor Insurance",
    type: "Call",
    assignedTo: "Neha Thomas",
    status: "Scheduled",
  },
  {
    id: "f6",
    time: "5:30 PM",
    person: "Neha Pillai",
    product: "Health Insurance",
    type: "Email",
    assignedTo: "Divya Mohan",
    status: "Overdue",
  },
];

export type RenewalRow = {
  id: string;
  customer: string;
  service: string;
  dueDate: string;
  daysLeft: number;
  status: "Due Soon" | "Upcoming";
};

/**
 * The manager's view of renewals falling due across the whole team.
 *
 * Every row must be a CUSTOMER. A renewal belongs to a Customer Purchase
 * (§65, §69), so an active Lead cannot hold one — this list
 * previously carried Anitha Desai and Meera Krishnan, who are Leads #2044 and
 * #2041, and one of them was even shown against a product she had not
 * enquired about.
 *
 * Rows that also exist in the mobile renewal data are spread from it rather
 * than retyped, so the two views of the same renewal cannot drift apart.
 * Suresh Pillai and Farhan Ali are customers owned by other salespeople, which
 * is exactly why they appear on a manager's dashboard and not on Sneha's
 * phone.
 */
export const UPCOMING_RENEWALS: readonly RenewalRow[] = [
  {
    id: "rn1",
    customer: RENEWAL_VIKRAM.customer,
    service: RENEWAL_VIKRAM.product,
    dueDate: RENEWAL_VIKRAM.due,
    daysLeft: RENEWAL_VIKRAM.dueInDays,
    status: "Due Soon",
  },
  {
    // Was Anitha Desai (Lead · #2044), shown against Health Insurance she had
    // never enquired about. Replaced by Ramesh Kumar's health policy, which
    // the shared customer record already defines.
    id: "rn2",
    customer: CUSTOMER_RECORD.name,
    service: RAMESH_HEALTH_FACTS.category,
    dueDate: "26 Sep 2026",
    daysLeft: 15, // 26 Sep 2026, from PRESENTATION_TODAY
    status: "Due Soon",
  },
  {
    id: "rn3",
    customer: "Suresh Pillai",
    service: "PUC Certificate",
    dueDate: "02 Oct 2026",
    daysLeft: 21,
    status: "Upcoming",
  },
  {
    id: "rn4",
    customer: "Farhan Ali",
    service: "Motor Insurance",
    dueDate: "05 Oct 2026",
    daysLeft: 24,
    status: "Upcoming",
  },
  {
    // Was Meera Krishnan (Lead · #2041). Replaced by Lakshmi Nair's health
    // policy, spread from the same renewal the mobile workspace shows.
    id: "rn5",
    customer: RENEWAL_LAKSHMI.customer,
    service: RENEWAL_LAKSHMI.product,
    dueDate: RENEWAL_LAKSHMI.due,
    daysLeft: RENEWAL_LAKSHMI.dueInDays,
    status: "Upcoming",
  },
];

export const PIPELINE = [
  { stage: "New", count: 18, share: 44 },
  { stage: "Contacted", count: 12, share: 29 },
  { stage: "Interested", count: 7, share: 17 },
  { stage: "Won", count: 4, share: 10 },
] as const;

/**
 * Pipeline totals. Won is a terminal stage: its Leads are shown historically
 * and never counted as active or open.
 */
export const PIPELINE_TOTALS = {
  total: PIPELINE.reduce((n, p) => n + p.count, 0),
  active: PIPELINE.filter((p) => p.stage !== "Won").reduce(
    (n, p) => n + p.count,
    0,
  ),
  won: PIPELINE.filter((p) => p.stage === "Won").reduce(
    (n, p) => n + p.count,
    0,
  ),
};

/**
 * Leads by priority, for the §21 pipeline widget's priority breakdown.
 *
 * §21: "the widget should also convey Lead Priority, for example as a
 * breakdown… Priority is a separate dimension from stage. It must not be shown
 * as an additional pipeline column."
 *
 * Keyed by stable id, and it includes the deactivated value because the Leads
 * holding it still exist (§192, §207). The counts reconcile with
 * PIPELINE_TOTALS.total: the same Leads, counted along the other axis.
 */
export const LEAD_PRIORITY_COUNTS: Readonly<Record<string, number>> = {
  "lp-hot": 11,
  "lp-warm": 19,
  "lp-cold": 11,
};

export const RECENT_ACTIVITY: readonly Activity[] = [
  {
    id: "ra0",
    title: "Priority changed by Arun",
    detail: "Rajesh Menon · Warm → Hot",
    time: "11:20 AM",
    kind: "priority",
  },
  {
    id: "ra1",
    title: "Follow-up completed",
    detail: "Priya Iyer · Health Insurance",
    time: "10:24 AM",
    kind: "followup",
  },
  {
    id: "ra2",
    title: "WhatsApp message sent",
    detail: "Ramesh Kumar · Motor Insurance",
    time: "9:41 AM",
    kind: "whatsapp",
  },
  {
    id: "ra3",
    title: "New lead added",
    detail: "Amit Shah · Motor Insurance",
    time: "9:15 AM",
    kind: "created",
  },
  {
    id: "ra4",
    title: "Call — Connected",
    detail: "Rajesh Menon · Health Insurance",
    time: "Yesterday",
    kind: "call",
  },
  {
    id: "ra5",
    title: "Policy renewed",
    detail: "Sneha Nair · PUC Certificate",
    time: "Yesterday",
    kind: "stage",
  },
];

export type WorkloadRow = {
  id: string;
  user: string;
  initials: string;
  assignedLeads: number;
  followUpsToday: number;
  overdue: number;
  renewals: number;
};

/**
 * Assigned work per person, keyed by workspace user name.
 *
 * `assignedLeads` counts Lead records currently assigned to the user, which
 * can include Leads that are no longer active (Won, for example) — it is not
 * an "open Leads" figure. Only people who hold assigned work are listed;
 * every other active user shows zeros in TEAM_WORKLOAD, and nothing is
 * invented for them.
 * Invited and deactivated users hold no work and never appear (§159, §160).
 */
const OPEN_WORK: Readonly<
  Record<string, Omit<WorkloadRow, "id" | "user" | "initials">>
> = {
  "Sneha Thomas": {
    assignedLeads: 11,
    followUpsToday: 3,
    overdue: 0,
    renewals: 5,
  },
  "Neha Thomas": {
    assignedLeads: 7,
    followUpsToday: 3,
    overdue: 2,
    renewals: 4,
  },
};

/* -------------------------------------------------- Flow E: admin settings */

export type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: "Active" | "Invited" | "Deactivated";
  /**
   * Operational records this user owns. Always 0 for Admin and Manager:
   * §2.5 forbids a supervisor from being a Record Owner at all.
   */
  assignedRecords: number;
  lastActive: string;
};

export const SETTINGS_USERS: readonly SettingsUser[] = [
  {
    id: "s1",
    name: "Arun Menon",
    email: "arun@asfincare.example",
    role: "Admin",
    status: "Active",
    assignedRecords: 0,
    lastActive: "Today, 10:04 AM",
  },
  {
    id: "s2",
    name: "Vikram Shah",
    email: "vikram@asfincare.example",
    role: "Manager",
    status: "Active",
    assignedRecords: 0,
    lastActive: "Today, 9:12 AM",
  },
  {
    id: "s3",
    name: "Sneha Thomas",
    email: "sneha@asfincare.example",
    role: "Team Lead",
    status: "Active",
    assignedRecords: 74,
    lastActive: "Today, 8:47 AM",
  },
  {
    id: "s4",
    name: "Neha Thomas",
    email: "neha@asfincare.example",
    role: "Salesperson",
    status: "Active",
    assignedRecords: 61,
    lastActive: "Yesterday",
  },
  {
    id: "s5",
    name: "Fathima Rasheed",
    email: "fathima@asfincare.example",
    role: "Salesperson",
    status: "Invited",
    assignedRecords: 0,
    lastActive: "Invitation sent 09 Sep",
  },
  {
    id: "s6",
    name: "Joseph Kurian",
    email: "joseph@asfincare.example",
    role: "Salesperson",
    status: "Deactivated",
    assignedRecords: 38,
    lastActive: "14 Aug 2026",
  },
  /*
   * Added for the Sales Teams wireframes (§163). Two active salespeople were
   * not enough for three teams that each need their own active Team Lead, a
   * paused member and a warning example — and Fathima (invited) and Joseph
   * (deactivated) cannot join an active rotation. Kavya belongs to no team,
   * so "add an existing active user" has someone to add.
   */
  {
    id: "s7",
    name: "Divya Mohan",
    email: "divya@asfincare.example",
    role: "Salesperson",
    status: "Active",
    assignedRecords: 29,
    lastActive: "Today, 9:26 AM",
  },
  {
    id: "s8",
    name: "Ajay Varma",
    email: "ajay@asfincare.example",
    role: "Team Lead",
    status: "Active",
    assignedRecords: 47,
    lastActive: "Today, 8:58 AM",
  },
  {
    id: "s9",
    name: "Nisha George",
    email: "nisha@asfincare.example",
    role: "Team Lead",
    status: "Active",
    assignedRecords: 22,
    lastActive: "07 Sep",
  },
  {
    id: "s10",
    name: "Kavya Raghavan",
    email: "kavya@asfincare.example",
    role: "Salesperson",
    status: "Active",
    assignedRecords: 0,
    lastActive: "Today, 8:15 AM",
  },
];

/**
 * The admin dashboard's Team workload: every ACTIVE user who can hold work,
 * derived from SETTINGS_USERS so a new active user can never be silently
 * left out. Ordered by assigned Leads, most first.
 *
 * Admins and Managers are excluded by role, not by name: §2.5 means a
 * supervisor holds no operational work, so they have no row to show.
 */
export const TEAM_WORKLOAD: readonly WorkloadRow[] = SETTINGS_USERS.filter(
  (u) => u.status === "Active" && isOperationalRole(u.role),
)
  .map((u) => ({
    id: `wl-${u.id}`,
    user: u.name,
    initials: u.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join(""),
    ...(OPEN_WORK[u.name] ?? {
      assignedLeads: 0,
      followUpsToday: 0,
      overdue: 0,
      renewals: 0,
    }),
  }))
  .sort((a, b) => b.assignedLeads - a.assignedLeads);

/** Dashboard headline figures, summed from the same rows the table shows. */
export const WORKLOAD_TOTALS = {
  followUpsToday: TEAM_WORKLOAD.reduce((n, r) => n + r.followUpsToday, 0),
  usersWithFollowUpsToday: TEAM_WORKLOAD.filter((r) => r.followUpsToday > 0)
    .length,
  renewals: TEAM_WORKLOAD.reduce((n, r) => n + r.renewals, 0),
  overdue: TEAM_WORKLOAD.reduce((n, r) => n + r.overdue, 0),
};

export type PipelineStage = {
  id: string;
  name: string;
  active: boolean;
  leads: number;
  isDefault?: boolean;
};

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  { id: "p1", name: "New", active: true, leads: 18, isDefault: true },
  { id: "p2", name: "Contacted", active: true, leads: 12 },
  { id: "p3", name: "Interested", active: true, leads: 7 },
  { id: "p4", name: "Quote Sent", active: true, leads: 5 },
  { id: "p5", name: "Won", active: true, leads: 4 },
  { id: "p6", name: "Lost", active: true, leads: 9 },
  /*
   * "Cold Call" is a pipeline STAGE — a lead-generation activity — and stays
   * named as A&S Fincare named it. §40 forbids the priority VALUES Hot, Warm
   * and Cold from being pipeline stages; it does not forbid a stage whose name
   * happens to contain one of those words. The screens keep the two apart by
   * labelling the field ("Stage: Cold Call", "Priority: Cold"), not by avoiding
   * similar wording.
   */
  { id: "p7", name: "Cold Call", active: false, leads: 23 },
];

/*
 * The flat `ProductRow` / `PRODUCTS` model is gone. §66 and §193 define three
 * separate levels — Product Category, Provider and Plan / Sub-product — and a
 * single "product with a category column" could not express which provider a
 * plan belongs to, nor stop a purchase being recorded against a category. The
 * catalogue now lives in `catalogue.ts`.
 */

export const REMINDER_RULES = [
  {
    id: "rr1",
    product: "Health Insurance",
    offsets: "30, 15, 7 and 1 day before",
    channel: "WhatsApp + Email",
  },
  {
    id: "rr2",
    product: "Motor Insurance",
    offsets: "30, 7 and 1 day before",
    channel: "WhatsApp",
  },
  {
    id: "rr3",
    product: "PUC Certificate",
    offsets: "15 and 3 days before",
    channel: "WhatsApp",
  },
  {
    id: "rr4",
    product: "Term Life Insurance",
    offsets: "30 and 7 days before",
    channel: "Email",
  },
] as const;

export const FOLLOW_UP_DEFAULTS = [
  { id: "fd1", label: "Default follow-up type", value: "Call" },
  { id: "fd2", label: "Default follow-up time", value: "10:00 AM" },
  { id: "fd3", label: "Overdue after", value: "Scheduled time passes" },
  { id: "fd4", label: "Assign new leads by", value: "Round robin" },
] as const;

export const EMAIL_TEMPLATES = [
  {
    id: "et1",
    name: "Renewal reminder",
    subject: "Your {{product_category}} renewal is due on {{renewal_date}}",
    status: "Active",
  },
  {
    id: "et2",
    name: "Policy document",
    subject: "Your {{product_category}} policy documents",
    status: "Active",
  },
  {
    id: "et3",
    name: "Welcome",
    subject: "Welcome to A&S Fincare",
    status: "Draft",
  },
] as const;
