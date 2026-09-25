**A&S Fincare CRM**

**Product & Wireframe Specification — V1**


**1. Product Definition**

**Product purpose**

A&S Fincare CRM is a CRM application built exclusively for A&S Fincare.
It is not a generic CRM product and is not configured, licensed or
resold for use by any other business.

The application supports A&S Fincare's insurance distribution work:

> • manage leads and customers
>
> • organize sales work across the A&S Fincare reporting hierarchy
>
> • assign leads to teams and to individual users
>
> • schedule and track follow-ups
>
> • maintain customer history
>
> • record the insurance products a customer has purchased
>
> • track renewal, expiry and other important due dates
>
> • initiate customer calls from the CRM with one tap, then record the
> outcome and next follow-up
>
> • send WhatsApp messages and reminders
>
> • receive and manage customer WhatsApp replies through a shared inbox
>
> • send business emails and email reminders to leads and customers
>
> • measure sales performance across the reporting hierarchy
>
> • view operational and business reports

**Product principle**

The application serves one organization. There is no tenant, workspace
or customer-account concept, no industry or business-type selection, and
no option to choose which core parts of the CRM are in use.

Leads, Customers, Customer Purchases, Follow-ups, Renewals & Reminders,
WhatsApp, Email and Reports are all part of V1 and are always available,
subject to the role and visibility rules in Section 2.

The operating flow is:

Lead → Assign → Follow-up → Customer → Customer Purchase → Renewal

The application should remain simple enough to be used by Salespersons
and Team Leads without CRM expertise.

**Technical direction**

V1 is delivered as a single responsive web application:

> • Next.js using the App Router
>
> • TypeScript
>
> • Tailwind CSS
>
> • installable Progressive Web App behaviour, defined in Section 210.1
>
> • Supabase / PostgreSQL
>
> • Drizzle ORM
>
> • Supabase Auth
>
> • Supabase Storage
>
> • Meta WhatsApp Cloud API
>
> • the full Email module in V1

Salespersons and Team Leads work primarily from a phone. Admins and
Managers use both desktop and mobile. Calling uses the phone's normal
dialer through click-to-call as defined in Sections 29–33; in-app
VoIP is not part of the product.

This is the approved technical direction for V1. It should not be
extended without approval.


**2. User Roles, Hierarchy and Visibility**

This section is the authoritative definition of the A&S Fincare role
model, reporting hierarchy, record ownership and data visibility. Later
sections apply these rules and refer back to them. Where another section
appears to describe the model differently, this section governs.

## 2.1 Predefined Roles

The application has exactly four predefined roles:

> • Admin
>
> • Manager
>
> • Team Lead
>
> • Salesperson

These four roles are fixed by the application. The CRM does not provide
custom role creation or editable role capabilities. See Section 2.6.

## 2.2 Organizational Hierarchy

```text
Admin
└── Manager
    └── Team Lead / Team
        └── Salesperson
```

Cardinality rules:

> • Admin sits above all Managers.
>
> • A Manager may supervise multiple Team Leads, and therefore multiple
> teams.
>
> • Each Team Lead reports to exactly one Manager.
>
> • Each Team Lead leads exactly one team.
>
> • Each team has exactly one Team Lead.
>
> • Each Salesperson belongs to exactly one team, and therefore to
> exactly one Team Lead.
>
> • A Team Lead's group is the team. There is no additional team layer
> beneath the Team Lead.

A **team** is a first-class record consisting of its Team Lead and the
Salespersons assigned to that Team Lead. Teams are part of the
application, not an optional structure.

Admin maintains roles, reporting relationships and team membership.
Administration of users and teams is defined in Sections 185, 185.1 and
186.

## 2.3 Visibility Model

Visibility follows the reporting hierarchy:

> • **Admin** — organization-wide visibility.
>
> • **Manager** — restricted to that Manager's own reporting hierarchy:
> their Team Leads, those Team Leads' teams, and the records belonging
> to them.
>
> • **Team Lead** — restricted to their own team: their own records and
> the records of the Salespersons in their team.
>
> • **Salesperson** — restricted to the records assigned to them,
> together with any narrow shared reference data explicitly defined
> elsewhere in this specification.

**Peer isolation**

> • A Manager must not see another Manager's restricted operational
> branch.
>
> • A Team Lead must not see another Team Lead's team or restricted
> operational records.
>
> • A Salesperson does not receive organization-wide or peer visibility,
> including of other Salespersons in the same team.

**Where these restrictions apply**

Dashboards, record lists and detail screens, activity views, reports,
search, notifications and exports.

A restriction that holds on a list screen must hold everywhere the same
data can be reached: totals, counts, drill-downs, filter option lists,
autocomplete suggestions, report breakdowns, exported files and
notification text. A user must not be able to infer the existence, size
or activity of a branch they cannot see.

**Enforcement**

The hierarchy must be enforced on the server for every read and every
write. Hiding navigation items, buttons, columns or widgets is
presentation, not authorization. A request for a record outside the
user's permitted scope must be refused by the server even when the
interface would never offer it.

## 2.4 Supervisory and Operational Roles

Admin and Manager are **supervisory** roles. Team Lead and Salesperson
are **operational** roles. A Team Lead is additionally a supervisor
within their own team.

**Admin**

Admin is supervisory and does not own operational records.

Admin may:

> • view organization-wide information
>
> • assign the predefined roles
>
> • maintain the reporting hierarchy
>
> • maintain teams
>
> • configure approved business settings
>
> • configure Lead Priority values
>
> • supervise assignment and reassignment across the organization
>
> • pause or resume any Team Lead from automatic Lead round-robin
> assignment, anywhere in the organization
>
> • access organization-wide dashboards and reports

Admin must not be the Record Owner or operational Assigned To user of:

> • Leads
>
> • Customers
>
> • Customer Purchases
>
> • follow-ups
>
> • renewals
>
> • WhatsApp conversations

Admin cannot create custom roles or change the capabilities attached to
a role.

**Manager**

Manager is supervisory and does not own operational records.

Manager may:

> • view information below them in their own reporting hierarchy
>
> • supervise their Team Leads and teams
>
> • assign and reassign records within their hierarchy where the
> relevant workflow permits
>
> • pause or resume a Team Lead who reports to that Manager from
> automatic Lead round-robin assignment
>
> • view dashboards and reports for their own branch
>
> • reply to WhatsApp conversations within their hierarchy without
> becoming the conversation owner

Manager must not be the Record Owner or operational Assigned To user of:

> • Leads
>
> • Customers
>
> • Customer Purchases
>
> • follow-ups
>
> • renewals
>
> • WhatsApp conversations

A Manager must not see another Manager's restricted operational branch.

**Team Lead**

Team Lead is both a supervisor and an operational user.

Team Lead:

> • leads exactly one team
>
> • reports to exactly one Manager
>
> • may own and work Leads
>
> • may own related Customers and operational records
>
> • may personally close sales
>
> • sees their own work and the work of the Salespersons in their team
>
> • may supervise and reassign work within their team where the relevant
> workflow permits
>
> • may pause or resume a Salesperson in their own team from automatic
> Lead round-robin assignment
>
> • must not see another Team Lead's team

**Salesperson**

Salesperson is an operational user.

Salesperson:

> • belongs to exactly one Team Lead's team
>
> • may own and work Leads
>
> • may own related Customers and operational records
>
> • may close sales
>
> • sees their own assigned operational records
>
> • does not receive organization-wide or peer visibility

**Pause from round robin**

A Team Lead or Salesperson may be paused from automatic Lead round-robin
assignment. A Team Lead may pause or resume a Salesperson in their own
team; a Team Lead may be paused or resumed only by the Manager to whom
that Team Lead reports, or by an Admin. No other role holds this
authority.

This control governs automatic Lead distribution only. It does not
deactivate the user, does not change record visibility, ownership or any
other permission, and does not prevent an authorized manual or direct
assignment. The full behaviour is defined in Section 189.1.

## 2.5 Ownership Model

**Record Owner** is the Team Lead or Salesperson primarily responsible
for a Lead or Customer relationship. **Assigned To** is the Team Lead or
Salesperson responsible for completing a specific Follow-up, Renewal
action or WhatsApp conversation.

The following rules apply throughout the specification:

> • Only Team Leads and Salespersons may be a Record Owner or an
> operational Assigned To user.
>
> • Admins and Managers must never be selectable as operational owners
> or assignees. This applies to creation, editing, import mapping,
> automatic assignment and reassignment alike.
>
> • Supervision, viewing, replying, assignment or reassignment by an
> Admin or Manager does not transfer ownership to that supervisor.
>
> • Dashboard and report totals shown to a Manager or an Admin are
> hierarchical roll-ups. They do not imply personal ownership of the
> underlying records.
>
> • Ownership and visibility are different concepts. A user may have
> visibility over a record without owning it, and ownership is never
> inferred from the ability to see or act on a record.
>
> • Ownership, assignment and reassignment must be authorized according
> to the reporting hierarchy in Section 2.3, and enforced on the server.

Assignment, reassignment and ownership changes are auditable actions.
Detailed audit-history requirements are defined in Section 208.

## 2.6 Fixed Roles and Permissions

Role capabilities are defined by the application and are not
configurable inside the CRM.

The CRM does not provide:

> • custom role creation
>
> • a permission builder
>
> • capability toggles for a role
>
> • an editable permission matrix
>
> • a configurable "All Records / Own Records" security scope
>
> • per-user permission overrides that bypass the reporting hierarchy

Admin may assign one of the four predefined roles, maintain reporting
relationships and maintain team membership. Admin may not redefine what
a role is permitted to do.

The detailed action-by-action permission matrix has not been finalized.
It will be finalized with the client during development and approved
before security implementation and UAT. Outstanding action-level
decisions are listed in Section 188 and are marked *Pending client
confirmation before security implementation and UAT*. No answer should
be assumed for them, and they must not be presented as settings an Admin
can configure.

Changing what a role can do is an application change. It requires a
reviewed change/change-control process and a new release.

**Configurable business data is not a configurable permission**

Admin configures some business data — for example Lead Priority values,
and other business configuration defined elsewhere in this
specification. Configuring business data does not change any role's
security scope and must never be presented as a permission setting.

## 2.7 WhatsApp Visibility Exception

WhatsApp conversations follow the hierarchy in Section 2.3, with one
deliberate exception for conversations that have no assignee:

> • All Admins and Managers can see unassigned WhatsApp conversations.
>
> • Admin may assign an unassigned conversation to any active Team
> Lead.
>
> • Manager may assign an unassigned conversation to an active Team
> Lead reporting to that Manager.
>
> • Admin and Manager may reply only to **assigned** conversations
> within their permitted scope, and do not become the conversation owner
> by replying.
>
> • **No user, including an Admin or a Manager, may reply while a
> conversation is unassigned.** It must first be assigned to a Team
> Lead.

This is stated here because it qualifies the core visibility model. The
complete WhatsApp inbox, assignment and reassignment rules are defined
in the WhatsApp module sections.


**3. Overall Application Navigation**

**Desktop sidebar**

> **A&S Fincare**
>
> **Dashboard**
>
> **Leads**
>
> **Customers**
>
> **Follow-ups**
>
> **Renewals & Reminders**
>
> **WhatsApp**
>
> **Reports**
>
> **─────────────**
>
> **Settings**

**Navigation principles**

Navigation is the same for every role. What differs is the scope of the
data behind each item, and whether an item is available to that role at
all. Hiding an item is presentation only; access is enforced on the
server as required by Section 2.3.

**Leads**

Always available. Lead visibility follows the reporting hierarchy.

**Customers**

Always available.

**Follow-ups**

Central work/task area for both leads and customers.

**Renewals & Reminders**

Central area for expiry dates, renewals and recurring customer actions.

**WhatsApp**

Communication module containing the shared inbox, message history and
templates, scoped by role.

**Email**

Email does not require a separate primary navigation item in V1. Email actions are available from permitted Lead, Customer and Renewal records. Email configuration and templates are available under Settings.

**Reports**

Operational and performance reporting, scoped by role.

**Settings**

Visible to Admin. A small number of subsections are available to other
roles where this specification states so explicitly.


**4. Global Top Bar**

Every authenticated desktop screen should use a consistent top bar.

**Page Title Global Search Notifications User/Profile**

Global Search and Notifications return only results within the
signed-in user's permitted scope, as defined in Section 2.3.

Optional primary action depending on screen:

**+ Add Lead**

or:

**+ Add Customer**

The primary action is shown only where the signed-in user's role can
complete it. Any Lead or Customer created must be given a Record Owner
who is a Team Lead or Salesperson, in accordance with Section 2.5.


**5. Global Search**

Search should be quick to use and should not require the user to choose a
record type first.

Search should support:

> • customer name
>
> • lead name
>
> • phone number
>
> • email
>
> • policy or reference number

Examples:

**"Ramesh"**

**"98470"**

**"STAR/FH/44120"**

Search result grouping:

**LEADS**

**Rajesh Menon**

**98765...**

**CUSTOMERS**

**Ramesh Kumar**

**98470...**

**CUSTOMER PURCHASES**

**Family Health Optima · Star Health**

**STAR/FH/44120**

Selecting a result opens the corresponding record.

**Scope**

Search returns only records within the user's authorized scope under
Section 2.3. A Salesperson finds their own records; a Team Lead their
team's; a Manager their branch's; an Admin the organization's.

Search must not disclose the existence of an out-of-scope record — not
through a result row, a result count, an autocomplete suggestion, or a
message stating that a matching record exists elsewhere. Where a
supervisor needs to locate a record held in another branch, that is an
escalation, not a search result.

Search is enforced server-side. Filtering results after retrieval is not
sufficient.
**6. Notification Centre**

Examples:

> • follow-up due
>
> • follow-up overdue
>
> • lead assigned to you
>
> • customer assigned to you
>
> • Customer Purchase assigned to you
>
> • required policy documents outstanding on a Customer Purchase
>
> • renewal approaching
>
> • overdue renewal
>
> • WhatsApp conversation assigned to you
>
> • new WhatsApp reply
>
> • unassigned WhatsApp conversation awaiting assignment — Admins and
> Managers only
>
> • import completed
>
> • import failed
>
> • WhatsApp message failed
>
> • Email message or scheduled Email reminder failed
>
> • Email bounced
>
> • Email sender requires administrator attention
>
> • role, team or reporting-line change affecting you

Each notification should:

> • show what happened
>
> • identify the related record
>
> • show when
>
> • open the relevant screen/record

**Scope**

Notification content and delivery follow the reporting hierarchy in
Section 2.3. A notification must never reveal a record, customer name,
message content or figure outside the recipient's authorized scope,
including in its title, preview text or badge count. Unread counts are
scoped the same way.

Opening a notification reauthorizes access on the server. Full
notification behaviour is defined in Section 204.
**7. Initial Application Setup**

The application is deployed for A&S Fincare and is already configured as
that organization. There is no sign-up, no organization creation, no
tenant or workspace creation and no industry selection.

Initial setup is performed by an Admin after first sign-in. It should be
short.

**Screen 1 — Organization Details**

**Purpose**

Confirm the operating details the application needs in order to schedule
work correctly.

**Fields**

> • Organization Name — prefilled as A&S Fincare
>
> • Business Phone
>
> • Business Email
>
> • Address
>
> • Country
>
> • Timezone — used for scheduled follow-ups and automated reminders
>
> • Currency

These are operating details. They do not change the application's
identity, its feature set or any role's scope.

**Setup steps**

> 1. Organization details
>
> 2. Users, teams and reporting hierarchy — Section 11
>
> 3. Insurance catalogue — Section 9
>
> 4. Renewal and reminder defaults — Section 10
>
> 5. Import existing data — Section 12
>
> 6. Connect WhatsApp — Section 13
>
> 7. Configure Email sender — Section 14

Step 2 must be completed before normal CRM use, because assignment and
visibility depend on a valid hierarchy. The remaining steps may be
completed later without blocking the application.

**Actions**

Primary:

**Continue**

Secondary:

**Sign out**


**8. A&S Fincare V1 Functional Scope**

The application is built for A&S Fincare only. There is no step in which
a business chooses which parts of the CRM it will use, and there are no
optional core modules.

The following are part of V1 and are always available, subject to the
role and visibility rules in Section 2:

> • Leads
>
> • Customers
>
> • Customer Purchases
>
> • Follow-ups
>
> • Renewals & Reminders
>
> • WhatsApp
>
> • Email
>
> • Reports
>
> • Data Import & Export
>
> • Settings & Administration

What a given user sees of each area is determined by their role and
their position in the reporting hierarchy, never by a module switch.

Some areas depend on configuration rather than on being enabled. WhatsApp
sending requires a connected WhatsApp account; Email sending requires a
verified sender. When that configuration is missing the affected actions
are unavailable and explain why, as defined in the relevant sections.
This is a configuration state, not an optional module.

This section is a temporary placement to preserve existing section
numbering. Final placement and renumbering belong to the
document-structure pass.


**9. Setup — Build the Product Catalogue**

**Purpose**

Enter the insurance products A&S Fincare distributes, so that Leads and
Customer Purchases can reference them.

The catalogue has three levels, defined in Section 66:

> **Product Category** → **Provider** → **Plan / Sub-product**

Setup collects them in that order, because each level depends on the one
above.

Example of the shape of the data:

> **Health Insurance** (Product Category)
>
> **\[ Star Health \]** (Provider)
>
> **\[ Family Health Optima \]** (Plan / Sub-product)
>
> **\[ + Add another \]**

These names are examples only. They are not seeded values, and A&S
Fincare's actual catalogue is entered here by Admin.

Fields per item:

> • Name — required
>
> • Optional description

Do not request complex pricing, tax configuration or provider
integration during setup.

A Customer purchases a **Plan/Sub-product**, never a Product Category or
a Provider on its own.

**Actions**

**Add another**

**Continue**

**Skip for now**

The catalogue may be completed later from Settings → Product Catalogue,
as defined in Section 193. Required policy documents per plan are
configured there.


**10. Setup — Renewal and Reminder Defaults**

**Purpose**

Confirm the default reminder schedule that new Customer Purchase
reminder schedules will start from.

Renewal tracking and automatic renewal reminders are part of V1. This
step sets defaults; it does not decide whether the capability exists.

Default reminder schedule

☑ **30 days before**

☑ **7 days before**

☑ **1 day before**

Channels:

☑ **In-app reminder**

☐ **WhatsApp**

☐ **Email**

If WhatsApp is not connected, choosing WhatsApp should explain:

> **You can configure WhatsApp after setup.**

If the Email sender is not configured and verified, choosing Email
should explain:

> **You can configure Email after setup.**

Selecting a channel during setup records a preference only. It does not
enable sending until the relevant channel is configured.

No technical API setup should happen inside this setup step.

The schedule shown above is illustrative. The reminder schedules,
channel preference and template content A&S Fincare will use are
*pending client confirmation*.

The full renewal automation requirements are defined in Section 195.1.


**11. Setup — Create Users, Teams and Reporting Hierarchy**

This step establishes the A&S Fincare structure defined in Section 2.2.
It is the only setup step that must be completed before the CRM can be
used normally, because assignment and visibility depend on it.

**Fields per user**

> • Name
>
> • Email
>
> • Role
>
> • Reporting Manager — required for a Team Lead
>
> • Team — required for a Team Lead and for a Salesperson

Role options:

> • Admin
>
> • Manager
>
> • Team Lead
>
> • Salesperson

The signed-in user performing setup is already an Admin.

**Order**

Because of the cardinality rules in Section 2.2, users are created top
down:

> 1. Managers
>
> 2. Teams, each with exactly one Team Lead, and each Team Lead linked
> to exactly one Manager
>
> 3. Salespersons, each linked to exactly one team

**Validation**

Setup must not complete with an invalid hierarchy. The application must
reject a structure in which:

> • a Team Lead has no Manager
>
> • a Team Lead has no team, or leads more than one team
>
> • a team has no Team Lead, or more than one
>
> • a Salesperson has no team, or belongs to more than one

**Actions**

**+ Add another**

**Send invitations & continue**

Ongoing user, team and hierarchy administration is defined in Sections
185, 185.1 and 186.


**12. Setup — Import Existing Data**

Options:

**\[ Import Customers \]**

**\[ Import Leads \]**

**\[ Start Fresh \]**

Choosing Import should take users to the full import workflow later
defined in the specification.

The setup wizard should not attempt to embed the complete mapping
interface into this step.

Imported Leads and Customers must be assigned to a Team Lead or
Salesperson in accordance with Section 2.5. Import assignment is defined
in the Data Import & Export sections.


**13. Setup — Connect WhatsApp**

Because WhatsApp is a core part of how A&S Fincare communicates with
customers, setup should cover it clearly.

**Content**

**Connect WhatsApp**

**Send reminders and communicate with customers directly from the CRM.**

**\[ Connect WhatsApp \]**

**Set up later**

The detailed integration workflow is defined under the WhatsApp module.

**Important state**

If the connection cannot be completed:

> • setup must continue
>
> • WhatsApp features display **Not connected**
>
> • no core CRM functionality should be blocked


**14. Setup — Configure Email**

Email requires a verified sender before the application can send
anything, so setup should introduce it clearly rather than leaving it to
be discovered later.

**Content**

**Set up Email**

**Send renewal reminders and business emails to your customers from the
CRM.**

**\[ Configure Email Sender \]**

**Set up later**

The detailed configuration and verification workflow is defined under
Email Settings and the Email Communications module.

**Important state**

If the sender cannot be configured or verified during setup:

> • setup must continue
>
> • Email features display **Not configured**
>
> • no core CRM functionality should be blocked
>
> • automated Email reminders remain inactive until a sender is verified

No email provider credentials or secrets are entered into the browser
during this step.


**15. Setup Complete**

The completion summary should display only the setup steps actually
completed. Skipped steps should not be shown as completed.

Screen:

**You're ready to go.**

✓ Organization details saved

✓ Managers, Team Leads, teams and Salespersons created

✓ Insurance catalogue started

✓ Reminder defaults saved

✓ WhatsApp connected

✓ Email sender configured

**\[ Go to Dashboard \]**

Setup is complete once the hierarchy is valid. Catalogue, WhatsApp and
Email steps may be finished later without blocking normal CRM use.

Avoid lengthy tutorials.


**16. Dashboard — Purpose**

The dashboard should answer:

> **What needs my attention today?**

and, for supervisory roles:

> **How is the part of the organization I am responsible for
> performing?**

What "the part of the organization I am responsible for" means depends
on the role: the whole organization for an Admin, one reporting branch
for a Manager, one team for a Team Lead, and the user's own work for a
Salesperson.

It should **not** attempt to display every possible CRM metric.


**17. Dashboard — Role Versions**

There is one dashboard design with four role-scoped versions: Admin,
Manager, Team Lead and Salesperson.

Every figure, widget, list and activity row on every version is limited
to the viewer's permitted scope under Section 2.3. Supervisory totals
are hierarchical roll-ups and do not imply that the supervisor owns the
underlying records.

Admin and Manager versions are defined below. Team Lead and Salesperson
versions are defined in Section 23.

## 17.1 Admin Dashboard — Organization-Wide

The Admin dashboard covers the whole organization.

**Dashboard**

**\[ Date range / Today \]**

**───────────────────────────────────────────────────────**

**New Leads Follow-ups Today Renewals Due Soon Overdue Actions**

**18 12 24 2 Follow-ups · 3 Renewals**

**───────────────────────────────────────────────────────**

**Today's Follow-ups**

**───────────────────────────────────────────────────────**

**Upcoming Renewals & Reminders**

**───────────────────────────────────────────────────────**

**Lead Pipeline**

**───────────────────────────────────────────────────────**

**Performance by Manager**

**───────────────────────────────────────────────────────**

**Recent Activity**

An Admin may narrow the dashboard by Manager, team, Team Lead or
Salesperson. Narrowing is a filter over data the Admin can already see.
It is not a permission change.

## 17.2 Manager Dashboard — Reporting Branch

The Manager dashboard covers only that Manager's own reporting
hierarchy: their Team Leads, those Team Leads' teams, and the records
belonging to them.

**Dashboard**

**\[ Date range / Today \]**

**───────────────────────────────────────────────────────**

**New Leads Follow-ups Today Renewals Due Soon Overdue Actions**

**───────────────────────────────────────────────────────**

**Today's Follow-ups**

**───────────────────────────────────────────────────────**

**Upcoming Renewals & Reminders**

**───────────────────────────────────────────────────────**

**Lead Pipeline**

**───────────────────────────────────────────────────────**

**Performance by Team**

**───────────────────────────────────────────────────────**

**Recent Activity**

A Manager may narrow the dashboard by team, Team Lead or Salesperson
within their own hierarchy.

A Manager must not see another Manager's branch, and must not be offered
a filter, comparison, benchmark or total that would reveal it. An
organization-wide figure must not be shown to a Manager, including as a
denominator, percentage or ranking position.

A Manager's totals are roll-ups across their branch. A Manager does not
own any of the underlying records.


**18. Dashboard Summary Cards**

Every card counts only records within the viewer's permitted scope, as
defined in Section 2.3. The same card shows a different number to an
Admin, a Manager, a Team Lead and a Salesperson, and that is correct
behaviour rather than an inconsistency.

**Card 1 — New Leads**

Shows:

> • number of new leads
>
> • selected time period

Click → Leads filtered to relevant records.

**Card 2 — Follow-ups Today**

Shows today's incomplete follow-ups.

Click → Follow-ups → Today.

**Card 3 — Renewals Due Soon**

Shows Customer Purchases with an upcoming Renewal Date.

Due Soon represents a Renewal Date within the next 30 days.

Click → Renewals & Reminders → Due Soon.

**Card 4 — Overdue Actions**

**Overdue Actions** shows the total number of incomplete Follow-ups and
Renewal actions whose due date/time has passed.

clicking 2 Follow-ups → Follow-ups → Overdue

clicking 3 Renewals → Renewals → Overdue

Drill-down from a card must apply the same scope as the card itself. A
user must never reach a record through a card that they could not reach
through the corresponding list screen.


**19. Today's Follow-ups Widget**

Display approximately 5–8 upcoming items.

Fields:

**Field**

**Example**

Time

10:30 AM

Person

Priya Iyer

Related To

Family Health Optima

Follow-up Type

Call

Assigned To

Arun

Status

Due

**Related To** identifies the Plan/Sub-product or Product Category the
follow-up concerns, where one applies.

The widget shows only follow-ups within the viewer's authorized scope
under Section 2.3. A Salesperson sees their own; a Team Lead their own
and their team's; a Manager their branch; an Admin the organization.

Actions:

**Call** — shown for Call-type follow-ups, subject to Sections 29–33

**Mark Complete**

**Reschedule**

Selecting **Call** opens the phone's native calling interface. It does
not mark the Follow-up complete; completion remains an explicit action.

Selecting the person opens the related Lead or Customer.

**View All** — opens the main Follow-ups screen, showing the follow-ups
within that user's authorized scope.
**20. Upcoming Renewals & Reminders Widget**

Display the closest upcoming Customer Purchase renewals.

Example:

**Customer**

**Plan / Sub-product**

**Provider**

**Renewal Date**

**Reminder**

Ramesh Kumar

Family Health Optima

Star Health

in 4 days

Sent

John Mathew

Two-Wheeler Package

Acme General

in 7 days

Scheduled

Priya Nair

Secure Shield

Star Health

in 11 days

Not Scheduled

Renewals shown are those for Customer Purchases within the viewer's
authorized scope under Section 2.3, so the widget legitimately shows
different rows to an Admin, a Manager, a Team Lead and a Salesperson.

A reminder shown as **Sent** means the send succeeded. A failed or
skipped reminder must never be displayed as Sent. See Sections 108 and
134.

Actions:

**Open Customer**

**Open Customer Purchase**

**View All**
**21. Lead Pipeline Widget**

Simplified visual:

**New Contacted Interested Won**

**18 12 7 4**

**Lost** leads are excluded from the primary dashboard pipeline widget
and remain accessible through the Leads module and reports.

Clicking a stage opens Leads filtered by that stage.

The widget counts only Leads within the viewer's permitted scope under
Section 2.3, so the same widget legitimately shows different numbers to
an Admin, a Manager, a Team Lead and a Salesperson.

**Priority**

The widget should also convey Lead Priority, for example as a breakdown
of the Leads in each stage:

**Interested · 7**

**Hot 3 · Warm 3 · Cold 1**

Priority is a separate dimension from stage. It must not be shown as an
additional pipeline column, and selecting a priority must not move a
Lead between stages.

Pipeline stages are configurable by Admin, as are Lead Priority values.
Advanced forecasting and weighted pipeline values are outside V1.


**22. Recent Activity Widget**

Purpose:

Show important recent CRM actions within the viewer's permitted scope.

**Scope**

The activity feed is scoped by the reporting hierarchy defined in
Section 2.3:

> • Admin sees activity from across the organization.
>
> • A Manager sees activity from their own reporting hierarchy only.
>
> • A Team Lead sees their own activity and that of the Salespersons in
> their team.
>
> • A Salesperson sees their own activity only.

A peer Manager's branch and a peer Team Lead's team must never appear in
the feed, including indirectly through a counted total, a truncated
preview or a "and 4 others" summary.

Examples:

**10:32 AM**

**Arun completed a follow-up with Ramesh Kumar.**

**10:10 AM**

**WhatsApp renewal reminder sent to Priya Nair.**

**09:54 AM**

**Sneha converted Rajesh Menon to Customer.**

**Yesterday**

**124 customers imported.**

Each row should identify the user who performed the action, so that a
supervisor can see who did what. Showing a supervisor an activity row
does not make them the owner of the related record.

Do not show every field edit.

Only meaningful activity.


**23. Operational Dashboards**

Team Lead and Salesperson dashboards prioritise the user's own work.
Both follow the scope rules in Section 2.3.

## 23.1 Team Lead Dashboard

A Team Lead is both an operational user and the supervisor of one team.
The dashboard must serve both, and must keep them visually distinct so
the Team Lead can tell their own work from their team's.

**Dashboard**

**Good morning, Arun**

**MY WORK**

**Follow-ups Today Overdue My Leads Renewals Due**

**────────────────────────────────**

**MY TEAM**

**Team Follow-ups Due Team Overdue Unassigned in Team**

**────────────────────────────────**

**Today's Follow-ups**

**────────────────────────────────**

**Team Activity**

**────────────────────────────────**

**My Upcoming Renewals**

Scope:

> • **MY WORK** covers records the Team Lead personally owns or is
> assigned.
>
> • **MY TEAM** covers the Team Lead's own records together with those
> of the Salespersons in their team.
>
> • No data from another Team Lead's team appears, in any widget, total
> or activity row.

Team totals are a roll-up across the team. They do not imply that the
Team Lead personally owns the underlying records.

## 23.2 Salesperson Dashboard

A Salesperson sees only their own operational work.

**Dashboard**

**Good morning, Sneha**

**MY WORK**

**Follow-ups Today Overdue Renewals Due**

**6 2 8**

**────────────────────────────────**

**Today's Follow-ups**

**────────────────────────────────**

**My Upcoming Renewals**

**────────────────────────────────**

**My Leads**

**────────────────────────────────**

**My Recent Customer Activity**

Scope:

> • Only records assigned to that Salesperson appear.
>
> • No team, branch or organization-wide totals are shown.
>
> • No peer Salesperson's records or activity are shown, including
> Salespersons in the same team.

A Salesperson's own performance figures may be shown to that Salesperson.
Comparative team or organization figures are not shown at this level.


**24. Dashboard Empty States**

**New installation**

Instead of blank charts:

**Welcome to the A&S Fincare CRM**

**Start by adding your first customer or importing**

**your existing customer list.**

**\[ Add Customer \]**

**\[ Import Customers \]**

**\[ Add Lead \]**

The actions offered must be ones the signed-in user's role can actually
perform.

**No follow-ups today**

**You're all caught up.**

**No follow-ups scheduled for today.**

**\[ Schedule Follow-up \]**

**No upcoming renewals**

**No renewals or reminders coming up.**

Renewal dates will appear here once they are added to customer
purchases.

**Nothing visible at this level**

A supervisory dashboard may be legitimately empty because no team below
the viewer has activity yet. In that case explain the scope rather than
implying the organization has no data:

**No activity in your teams yet.**

An empty state must never reveal the existence, size or activity of
records outside the viewer's permitted scope.

**WhatsApp not connected**

When WhatsApp is not connected, WhatsApp-related areas should show:

**WhatsApp isn't connected yet.**

**Connect the A&S Fincare WhatsApp account to**

**send customer reminders.**

**\[ Connect WhatsApp \]**

Visible to Admin only.


**25. Dashboard Loading / Error States**

**Loading**

Use skeleton cards/rows rather than a full-page spinner.

**Partial failure**

Example:

If reports fail but follow-ups load:

**Unable to load pipeline data.**

**\[ Try Again \]**

Do not block the entire dashboard.

**Permission restricted**

Do not display widgets a user does not have permission to view rather
than showing numerous "access denied" panels.

**26. Dashboard Responsive Behaviour**

**Desktop**

Full sidebar.

2–4 column metric cards.

Multiple dashboard sections.

**Tablet**

Collapsible sidebar.

Cards wrap into 2 columns.

Tables can become condensed lists.

**Mobile**

The mobile dashboard should prioritise immediate work rather than
analytics.

Display compact, tappable summary cards for:

> • Follow-ups Today
>
> • Overdue Actions
>
> • Renewals Due Soon
>
> • Unread WhatsApp

Below the summary, show **Today's Follow-ups** and **Upcoming Renewals**
as touch-friendly cards/lists with the most relevant information and
quick actions.

Every figure and list on the mobile dashboard is scoped by the viewer's
position in the hierarchy, exactly as on desktop. A smaller screen never
widens what a user can see.

Use bottom navigation for frequently used modules:

**Home \| Leads \| Customers \| WhatsApp \| More**

**More** provides access to Renewals & Reminders, Reports and other
screens available to that role.

Desktop tables should not simply be compressed on mobile. Where
necessary, convert them into readable cards or list rows containing the
most important fields and actions.

Large pipeline charts and detailed reports should not occupy the primary
mobile dashboard.

The same mobile layouts and bottom navigation apply when the CRM is
running as an installed application in standalone display mode. Because
standalone display removes the browser's own interface, the layout must
respect device safe areas so that navigation and content are not
obscured by a notch, rounded corner or home indicator.


**27. Global Record Ownership**

**Record Owner** = the Team Lead or Salesperson primarily responsible
for the overall Lead or Customer relationship.

**Assigned To** = the Team Lead or Salesperson responsible for
completing a specific Follow-up, Renewal action or WhatsApp
conversation.

Lead and Customer records use **Record Owner**.  
Follow-ups, Renewal actions and WhatsApp conversations use **Assigned
To**.

Only Team Leads and Salespersons may be a Record Owner or an operational
Assigned To user. Admins and Managers must never be selectable in either
field. The full ownership model, including the distinction between
ownership and visibility, is defined in Section 2.5.

By default, operational actions may inherit the related Lead/Customer's
Record Owner, but they can be reassigned by an authorized user within
the limits of the reporting hierarchy defined in Section 2.3.

Reassignment does not transfer ownership to the supervisor who performed
it.


**28. Global Activity Timeline**

Lead, Customer and Customer Purchase screens should use a common activity
pattern.

Activity types:

> • record created
>
> • note
>
> • call — a user-confirmed call outcome, defined in Section 32
>
> • visit
>
> • WhatsApp message
>
> • WhatsApp conversation assigned or reassigned
>
> • Email sent / failed
>
> • follow-up scheduled
>
> • follow-up completed
>
> • stage changed
>
> • priority changed
>
> • assignment or reassignment, naming who performed it and who received
> the record
>
> • Record Owner changed
>
> • customer converted
>
> • Customer Purchase created
>
> • required policy document uploaded, replaced or removed
>
> • Customer Purchase marked `Closed/Active`
>
> • Closed Amount recorded or changed
>
> • renewal reminder sent, failed or skipped
>
> • renewal completed

Stage changes and priority changes are separate, clearly distinguishable
events. Neither is described as the other.

Example:

**Today · 11:22 AM**

**WhatsApp renewal reminder sent**

**Family Health Optima · Star Health**

**Yesterday · 4:15 PM**

**Follow-up completed by Arun**

**Customer confirmed renewal.**

**28 Aug · 10:14 AM**

**Renewal reminder scheduled.**

**Visibility**

The timeline shows only activity within the viewer's authorized scope
under Section 2.3. A supervisor seeing an activity row does not become
the owner of the related record; the row identifies who performed the
action.

**Relationship to audit history**

The activity timeline is the user-facing, readable history of a record.
It is not the audit trail. Sensitive actions are additionally recorded in
the append-only audit history defined in Section 208, which retains
actor, timestamp, previous value and new value. The timeline may present
a friendlier summary of the same event.
**29. One-Tap Click-to-Call**

An authorized user with access to a Lead or Customer may initiate a
telephone call from the relevant CRM screen.

The V1 implementation is click-to-call. Selecting **Call** on a
supported phone invokes the device's native calling interface using the
valid normalized telephone number through a `tel:` link. The cellular
conversation itself takes place in the phone's native call interface,
which temporarily takes over from the CRM. A true in-app VoIP system is
outside V1 and is excluded in Section 33.

**Where Call must be available**

- Lead Detail
- Customer Detail
- Call-type Follow-up cards and Follow-up details
- Today's Follow-ups
- overdue and upcoming Call follow-ups
- other mobile quick-action areas already defined by this specification

**Initiation rules**

- The user must always initiate the call explicitly. The CRM must never
  start a call automatically.
- If only one valid callable number exists, use it.
- If the existing data model permits multiple callable numbers, allow
  the user to select the required number before opening the native
  calling interface.
- If the phone number is missing or invalid, **Call** is disabled and
  the interface explains why.
- On desktop or an unsupported device, the system may invoke an
  available calling handler or provide a **Copy Number** action. It must
  not pretend that a call was made.

**Tapping Call alone must not**

- mark a Follow-up complete
- create a successful-call activity
- change a Lead stage
- change a Customer status
- claim that the call connected

Phone numbers used for calling should be normalized for the `tel:` link
while retaining user-friendly formatting when displayed in the CRM.

**30. Mobile Call and Return Flow**

The flow is:

> Open Lead, Customer or Call Follow-up
>
> → Select Call
>
> → Native phone calling interface opens with the number
>
> → User makes or cancels the call
>
> → User returns to the CRM
>
> → CRM restores the originating record or Follow-up context
>
> → User records the outcome or dismisses the prompt

**Context and return**

- The originating Lead, Customer or Follow-up context is preserved
  before the native calling interface is invoked.
- When the user returns, **Record Call Outcome** is readily available
  for the originating record.
- Where technically reliable, the interface may display the outcome
  prompt when the PWA becomes active again.
- The prompt must also remain accessible from the originating record or
  Follow-up if the operating system closes or suspends the PWA.
- The user may dismiss the prompt when the call was cancelled or did not
  take place. Dismissing the prompt must not create a completed-call
  activity.

**What the system must not claim**

- The PWA must not claim that it can automatically determine whether a
  normal cellular call connected, was answered, failed or ended.
- The PWA must not claim to know the call duration unless a future
  approved telephony integration provides reliable information.

**31. Record Call Outcome**

**Record Call Outcome** is a small form used to log what actually
happened on a call.

**Field**

**Requirement**

Related Lead or Customer

Automatically selected and read-only

Related Follow-up

Automatically selected when initiated from a Follow-up

Outcome

Required

Note

Optional

Call date and time

Defaults to the call initiation time; correction permitted only where
appropriate

Next action

Optional

**Outcome options in V1**

- Connected
- No Answer
- Busy or Unreachable
- Call Back Requested
- Left Voicemail
- Wrong Number
- Other

**Actions**

- **Save Outcome**
- **Complete Follow-up** — when initiated from an incomplete Follow-up
- **Complete and Schedule Next** — when initiated from an incomplete
  Follow-up
- **Cancel**

**Saving an outcome must**

- create a Call activity in the related Lead or Customer timeline
- record the user who submitted it
- record the call date and time
- record the selected outcome
- preserve the optional note
- reference the originating Follow-up when applicable
- enforce the hierarchy-based access control defined in Section 2.3

Saving a call outcome must not automatically change the Lead stage or
the Customer status.

When the user selects **Complete Follow-up** or **Complete and Schedule
Next**, the existing Follow-up completion and scheduling rules defined
in Section 47 are reused. A separate completion workflow must not be
introduced.

If the selected outcome is **Call Back Requested**, the interface should
make **Schedule Next Follow-up** prominent but must not silently
schedule one.

**32. Call Activity Rules**

A Call activity represents a user-confirmed call outcome, not merely a
tap on the **Call** button.

The activity timeline should show:

- call outcome
- related Lead or Customer
- the user who logged the outcome
- date and time
- note, when provided
- originating Follow-up, when applicable

Historical Call activities must remain available even if the related
user, phone number, team or configuration is later changed.

**Permissions**

- Call activities are subject to the same hierarchy-based access
  control, ownership visibility and fixed role behaviour as the related
  Lead or Customer. See Sections 2.3 and 2.5.
- A Team Lead or Salesperson may call and log outcomes only for records
  they are permitted to access.
- Admin and Manager visibility of Call activities follows the reporting
  hierarchy. Viewing a Call activity does not make a supervisor the
  owner of the related record.
- Hiding a **Call** button is not sufficient authorization. Access must
  also be enforced server-side where call outcomes are saved.


**33. V1 Call Limitations**

V1 does not include:

- in-app VoIP calling
- WebRTC calling
- telephone-number provisioning
- call recording
- call transcription
- automatic call-duration detection
- automatic detection of answered, missed or failed calls
- access to the phone's operating-system call history
- automatic synchronization with cellular call logs
- call-centre integration
- PBX integration
- telephony-provider integration
- automatic outbound calling
- predictive or power dialling

These capabilities may only be evaluated as a separately approved future
integration.

**34. Global Confirmation Rules**

Not every action needs a confirmation modal.

**Require confirmation for:**

> • archive record
>
> • bulk archive
>
> • convert lead
>
> • mark a Customer Purchase `Closed/Active`
>
> • remove or replace a required policy document
>
> • deactivate user
>
> • change a user's role
>
> • change a team's Team Lead or reporting Manager
>
> • assign an unassigned WhatsApp conversation
>
> • bulk send WhatsApp
>
> • controlled bulk Email reminders
>
> • cancel scheduled bulk messages
>
> • change or remove the verified Email sender
>
> • change incentive rules or slabs
>
> • major data import
>
> • destructive configuration changes

**Do not require confirmation for:**

> • add note
>
> • change filter
>
> • change Lead Priority
>
> • change Record Owner / Assigned To within the user's permitted scope
>
> • mark normal follow-up complete
>
> • send an individual Email from a permitted record
>
> • upload a policy document
>
> • save standard field edits

Where possible, provide **Undo** after lightweight actions instead of
confirmation dialogs.

A confirmation must explain the consequence rather than showing a
generic **Are you sure?**. Where an action changes who can see existing
records — for example moving a team to another Manager — the
confirmation must say so.
**35. Global Record Deletion**

V1 uses Archive rather than permanent Delete for core CRM records.

Users can:

> **Archive Lead**
>
> **Archive Customer**

Archived records:

> • disappear from normal lists
>
> • remain searchable under archived filter
>
> • retain history
>
> • can be restored by authorized users

This reduces accidental data loss.

**36. Lead Management**

Lead Management handles enquiries and prospects before they become
customers. It is part of V1 and is always available.

The basic flow is:

Lead → Assign → Follow-up → Update Stage → Won → Convert to Customer →
Customer Purchase

or

Lead → Assign → Follow-up → Update Stage → Lost → Closed.

Two independent attributes describe a Lead at all times:

> • **Stage** — where the Lead has reached in the sales process.
>
> • **Priority** — how urgent or promising the Lead is, initially Hot,
> Warm or Cold.

They are separate fields. Changing one never changes the other, and
neither is a substitute for the other. See Sections 40 and 192.

Leads are owned by a Team Lead or Salesperson and are visible according
to the reporting hierarchy in Section 2.3.


**37. Leads — List View**

**Purpose**

Provide a searchable and filterable view of the Leads the user is
permitted to access under Section 2.3.

**Header**

**Leads**

Primary action:

**+ Add Lead**

Secondary actions:

**Import Leads**

**Lead Table**

**Field**

**Example**

Lead Name

Rajesh Menon

Phone

98765 43210

Priority

Hot

Interested In

Health Insurance

Stage

Interested

Record Owner

Arun

Team

Kochi Health Team

Next Follow-up

05 Sep, 10:30 AM

Last Activity

02 Sep

Actions

⋯

**Priority** and **Stage** are separate columns. Neither substitutes for
the other, and the list must not merge them.

Phone and email information should be shown only according to the user's
permitted scope.

Selecting a Lead Name opens the Lead Detail screen.

**Filters**

Keep filtering simple.

Available filters:

> • Priority
>
> • Stage
>
> • Record Owner
>
> • Team
>
> • Product Category / Plan
>
> • Follow-up Status
>
> • Created Date

Record Owner and Team filter options are limited to those within the
viewer's permitted scope. A filter list must never disclose users or
teams the viewer cannot otherwise see.

**Sorting**

The list must support sorting by Priority, using the order Admin
configured in Section 192, as well as by the usual date columns.

Quick filters:

**All \| My Leads \| Follow-up Due \| No Follow-up**

For a Salesperson, **All** and **My Leads** resolve to the same set,
because a Salesperson sees only their own records. For a Team Lead,
**All** means their team; for a Manager, their branch; for an Admin, the
organization.

**Search**

Search by:

> • Lead name
>
> • Phone number
>
> • Email

Search results are limited to the viewer's permitted scope.

**Row Actions**

The ⋯ menu may contain:

> • View Lead
>
> • Change Priority
>
> • Assign / Reassign
>
> • Schedule Follow-up
>
> • Mark as Won
>
> • Mark as Lost
>
> • Archive

**Assign / Reassign** offers only Team Leads and Salespersons within the
acting user's permitted scope, as defined in Section 55.

Actions must follow the fixed role behaviour in Section 2. Action-level
decisions that remain open are listed in Section 188.


**38. Add Lead**

Selecting **+ Add Lead** opens an Add Lead form.

This may be displayed as a modal, drawer or dedicated screen depending
on the final UI design, but the fields and behaviour remain the same.

**Fields**

**Basic Information**

> • Lead Name — required
>
> • Phone Number
>
> • Email
>
> • Priority — required
>
> • Interested In — Product Category or Plan/Sub-product
>
> • Lead Source
>
> • Stage
>
> • Team
>
> • Record Owner
>
> • Notes

At least one contact method — **Phone Number or Email** — must be
provided.

**Default Values**

> • **Priority** defaults to the configured default priority value. In
> the initial configuration the active values are Hot, Warm and Cold.
> Priority is a separate field from Stage and is never derived from it.
>
> • **Stage** defaults to the first active pipeline stage. In the
> default configuration this is **New.**
>
> • **Team** determines which team's round robin will assign the Lead.
> The selectable teams are limited to those the acting user is permitted
> to assign to under Section 2.3.
>
> • **Record Owner** is assigned by the selected team's round robin, as
> defined in Section 189.1. The owner is always a Team Lead or
> Salesperson from that team.
>
> • Where the acting user is permitted to choose the owner directly,
> the selectable users are limited to the Team Leads and Salespersons
> within their permitted scope. Admins and Managers are never
> selectable.
>
> • If no eligible automatic recipient exists in the selected team —
> every otherwise eligible member being inactive or paused from round
> robin — assignment fails safely and the Lead may remain Unassigned
> against that team. It is never given to an Admin, a Manager or a user from
> another team.

Custom Lead fields appear below the standard fields. See Section 194.

**Actions**

**Save Lead**

**Save & Add Follow-up**

**Cancel**

**Save Lead**

Creates the Lead and opens the Lead Detail screen.

**Save & Add Follow-up**

Creates the Lead and immediately opens the Schedule Follow-up form.

**Duplicate Warning**

Before saving, the system should check for an existing Lead or Customer
with the same phone number or email.

If a possible duplicate exists:

> A Lead or Customer with this contact information already exists.

Show the matching record(s) and allow the user to:

**View Existing Record**

or, where the acting user is permitted:

**Create Anyway**

The system should warn about duplicates rather than silently creating
them.

Duplicate matching runs across the organization so that genuine
duplicates are caught, but the matched record's details are disclosed
only where the acting user is permitted to see that record under
Section 2.3. Where they are not, the warning states that a matching
record exists and offers to route the matter to an authorized
supervisor, without revealing the record, its owner or its team.


**39. Lead Pipeline View**

Users should be able to switch between:

**List \| Pipeline**

The Pipeline view presents leads grouped by stage, within the viewer's
permitted scope under Section 2.3.

Example:

**New Contacted Interested Won**

**────────────────────────────────────────────────────────**

**Rajesh Meera Priya John**

**Anil Joseph Ramesh**

**Deepa**

Each Lead card should show only useful summary information:

> • Lead name
>
> • Priority
>
> • product interest
>
> • Record Owner
>
> • next follow-up, if scheduled
>
> • overdue indicator, if applicable

Priority is shown on the card as its own indicator, separate from the
column the card sits in. The column is the stage; the indicator is the
priority.

The board may be filtered or sorted by priority within each stage.
Priority must not be used as a column, and a Lead must never be moved
between stages in order to change its priority.

**Stage Movement**

Authorized users may move a Lead from one stage to another using
drag-and-drop or an equivalent stage-change action.

When a stage changes:

> • save the new stage
>
> • record the change in Activity History
>
> • retain the previous stage in history
>
> • leave the Lead's priority unchanged

Moving a Lead to **Won** should prompt the user to convert the Lead into
a Customer.

**Won** may be selected as a pipeline outcome. **Lost** is selected
through the Lead actions/menu rather than displayed as an active
pipeline column.

Example:

**Reason for Lost Lead**

> • Not Interested
>
> • Premium / Cost
>
> • Chose Another Provider
>
> • Unable to Contact
>
> • Other

If **Other** is selected, allow a short note.


**40. Pipeline Configuration**

Pipeline stages are configurable by Admin.

Default stages:

New → Contacted → Interested → Won

**Lost** is treated as a closed outcome rather than an active pipeline
column.

An administrator may:

> • rename active stages
>
> • add an active stage
>
> • reorder active stages
>
> • deactivate an unused stage
>
> • A stage containing active Leads cannot be deactivated until those
> Leads are moved to another active stage.

The system must always retain:

> • a **Won** outcome
>
> • a **Lost** outcome

Changing pipeline configuration must not remove historical stage
information from existing Leads.

Complex stage automation is not part of V1.

**Stage is not priority**

Pipeline stages and Lead Priority are configured separately and stored
separately. Hot, Warm and Cold are **priority values, not pipeline
stages**, and must never be added to the pipeline. Lead Priority
configuration is defined in Section 192.

Configuring pipeline stages and priority values is configurable business
data. It does not change any role's visibility, ownership or
authorization. See Section 2.6.


**41. Lead Detail Screen**

The Lead Detail screen is the central working screen for an individual
Lead.

Recommended structure:

**Rajesh Menon Hot Interested**

**98765 43210**

**rajesh@email.com**

**Record Owner: Arun · Kochi Health Team**

**\[ WhatsApp \] \[ Email \] \[ Add Follow-up \] \[ Edit \] \[ More \]**

**────────────────────────────────────────**

**Lead Information**

**────────────────────────────────────────**

**Upcoming Follow-up**

**────────────────────────────────────────**

**Activity & Notes**

The header shows **Priority** and **Stage** as two separate indicators.

Authorized users may change priority directly from this screen. A
priority change is recorded in the activity timeline and does not affect
the Lead's stage.


**42. Lead Header**

Display:

> • Lead Name
>
> • Priority
>
> • Stage
>
> • Phone
>
> • Email
>
> • Record Owner

Priority and Stage are shown as distinct indicators. They must be
visually separable and must never be combined into a single badge.

Primary actions:

**Call**

**WhatsApp**

**Email**

**Add Follow-up**

**Edit**

**More**

**Call** is enabled only when:

> • the user can access the Lead
>
> • a valid phone number exists
>
> • the device or environment can handle the telephone link

Selecting **Call** follows the click-to-call behaviour defined in
Sections 29–33. Initiating a call does not by itself create a Call
activity or change the Lead stage or priority.

WhatsAp**p** is enabled only when:

> • a valid phone number exists
>
> • an active WhatsApp connection exists
>
> • the user has messaging permission

If WhatsApp is unavailable, the action should show the relevant
disabled/not-connected state rather than failing after selection.

**Email** is enabled only when:

> • a valid email address exists
>
> • a verified sender is configured
>
> • the user has permission to send email
>
> • the Lead is not marked **Email Opted Out**

If Email is unavailable, the action should show the relevant
disabled/not-configured state rather than failing after selection.


**43. Lead Information**

Display the Lead's primary information.

Example:

**Field**

**Value**

Priority

Hot

Interested In

Health Insurance

Lead Source

Referral

Stage

Interested

Record Owner

Arun

Team

Kochi Health Team

Created

29 Aug 2026

**Priority** and **Stage** are separate fields and are displayed
separately. Priority describes how urgent or promising the Lead is;
Stage describes where it has reached in the sales process. Changing one
never changes the other.

**Interested In** may reference a Product Category or a specific
Plan/Sub-product from the catalogue defined in Section 66. It is an
expression of interest, not a purchase. A purchase is recorded only
after conversion, as a Customer Purchase.

Configured custom Lead fields also appear here. See Section 194.

Authorized users can edit the information using **Edit Lead**.

Changing the Record Owner offers only Team Leads and Salespersons within
the acting user's permitted scope under Section 2.3.


**44. Upcoming Follow-up**

If an incomplete overdue Follow-up exists, show the earliest overdue
item first. Otherwise show the nearest upcoming Follow-up.

Example:

**Next Follow-up**

**05 Sep 2026 · 10:30 AM**

**Call**

**Discuss premium options.**

**\[ Mark Complete \] \[ Reschedule \]**

If no follow-up exists:

**No follow-up scheduled.**

**\[ Schedule Follow-up \]**

Only the nearest upcoming incomplete follow-up needs to be highlighted
here. Full follow-up history remains available in the activity timeline
and Follow-ups module.

**45. Lead Activity & Notes**

Use the common activity timeline defined earlier.

Example:

**Today · 11:20 AM**

**Arun changed stage**

Contacted → Interested

**Today · 11:05 AM**

**Arun changed priority**

Warm → Hot

**Today · 10:45 AM**

**Call — Connected — logged by Arun**

**Customer requested policy details.**

**Yesterday · 4:30 PM**

**WhatsApp message sent.**

**29 Aug · 9:15 AM**

**Lead created by Sneha and assigned to Arun.**

Stage changes and priority changes are recorded as separate, clearly
distinguishable events. One must never be described as the other.

The timeline should also record:

> • assignment and reassignment, naming who performed it and who
> received the Lead
>
> • priority changes
>
> • stage changes
>
> • conversion to Customer

Users may add a manual note using:

**+ Add Note**

Notes should record:

> • note content
>
> • author
>
> • date/time

Notes form part of the Lead's permanent activity history.

These events are auditable. Detailed audit-history requirements are
defined in Section 208.


**46. Schedule Follow-up**

A Follow-up may be created from:

> • Lead Detail
>
> • Customer Detail
>
> • main Follow-ups screen - When **+ Add Follow-up** is opened from the
> main Follow-ups screen, the user must first select whether the
> Follow-up relates to a Lead or Customer and then select the
> corresponding record.
>
> • WhatsApp conversation, where applicable

For a Lead, the form contains:

**Field**

**Requirement**

Related To

Lead — automatically selected when opened from Lead Detail

Follow-up Type

Required

Date

Required

Time

Required

Assigned To

Required

Note

Optional

Follow-up Type options in V1:

> • Call
>
> • WhatsApp
>
> • Email
>
> • Visit
>
> • Other

A **Call Follow-up** is a task reminding the assigned user to telephone
the Lead/Customer. Selecting **Call** from a Call Follow-up invokes the
click-to-call flow defined in Sections 29–33. Scheduling the
Follow-up does not automatically place a call, and initiating a call
does not automatically complete the Follow-up.

A **WhatsApp Follow-up** is a task reminding the assigned user to
contact the Lead/Customer through WhatsApp. Scheduling the Follow-up
does not automatically send a message.

An **Email Follow-up** is a task reminding the assigned user to contact
the Lead/Customer by email. Scheduling the Follow-up does not
automatically send an email.

**Actions**

**Schedule**

**Cancel**

After scheduling:

> • the Follow-up appears under the Lead
>
> • it appears in the main Follow-ups screen
>
> • it appears on the appropriate user's Dashboard when due
>
> • an activity entry is created

**47. Completing a Follow-up**

Selecting **Mark Complete** opens a small completion form.

Display:

**Outcome / Note** — optional

Example:

> Customer is interested. Asked to call again next Monday.

Actions:

**Complete**

**Complete & Schedule Next**

**Complete**

Marks the current follow-up as completed and records it in Activity
History.

**Complete & Schedule Next**

Marks the current follow-up complete and immediately opens a new
Follow-up form.

This supports repeated sales follow-ups without introducing workflow
automation.

**Call follow-ups**

Completion of a Call Follow-up remains an explicit user action.
Initiating a call from the Follow-up does not complete it.

A completed Call Follow-up may store the call outcome selected in
**Record Call Outcome** (Section 31). Where the user completes the
Follow-up from that form, the actions above are the same completion and
scheduling rules — **Complete and Schedule Next** continues to use this
workflow. A second completion process must not be introduced.

**48. Reschedule Follow-up**

Selecting **Reschedule** allows the user to change:

> • Date
>
> • Time
>
> • Assigned To, where permitted

Optional:

> • Reason / Note

After saving:

> • the same Follow-up remains active with the new schedule
>
> • the reschedule action is recorded in the activity history

If an overdue Follow-up is rescheduled to a future date/time, it returns
to Upcoming status.

The system should not create a duplicate Follow-up merely because an
existing one was rescheduled.

**49. Main Follow-ups Screen**

The Follow-ups module combines follow-ups related to both Leads and
Customers.

Recommended tabs:

**Today \| Upcoming \| Overdue \| Completed**

**Table**

**Field**

**Example**

Date / Time

05 Sep, 10:30 AM

Person

Priya Iyer

Record Type

Lead

Follow-up Type

Call

Related To

Health Insurance

Assigned To

Arun

Status

Due

Actions

⋯

**Record Type** identifies whether the follow-up belongs to a:

> • Lead
>
> • Customer

For a Customer follow-up relating to a specific purchase, **Related To**
should identify the Plan/Sub-product rather than only the category.

Selecting the Person opens the related record.

**Filters**

> • Assigned To
>
> • Team
>
> • Follow-up Type
>
> • Lead / Customer
>
> • Date Range

**Visibility**

The screen shows only follow-ups within the viewer's permitted scope
under Section 2.3:

> • a Salesperson sees follow-ups assigned to them
>
> • a Team Lead sees their own and those of the Salespersons in their
> team
>
> • a Manager sees those in their own reporting hierarchy
>
> • an Admin sees the organization

Assigned To and Team filter options are limited to users and teams
within the viewer's permitted scope.

**Actions**

From the Follow-ups screen:

> • Call — shown for Call-type follow-ups, subject to Sections 29–33
>
> • Mark Complete
>
> • Reschedule
>
> • Open Record

Call is available from the Today, Upcoming and Overdue tabs for
Call-type follow-ups. Initiating a call does not complete the Follow-up.

Primary action:

**+ Add Follow-up**


**50. Overdue Follow-ups**

A Follow-up becomes **Overdue** when its scheduled date/time passes
without being completed.

Overdue Follow-ups should:

> • appear under the Overdue tab
>
> • be visually distinguishable
>
> • contribute to Dashboard overdue counts
>
> • remain actionable using Mark Complete or Reschedule
>
> • for Call-type follow-ups, remain callable using Call, subject to
> Sections 29–33

The system should not automatically mark an overdue Follow-up as
completed or cancelled. Initiating a call from an overdue Call
Follow-up does not complete it.

**51. Mark Lead as Won**

When a Lead is marked **Won**, show:

**Lead marked as Won.**

**Convert this Lead into a Customer?**

**\[ Convert to Customer \]**

**\[ Not Now \]**

Choosing **Not Now** retains the Lead as Won and allows conversion
later.

A **Convert to Customer** action should remain available from the Lead
Detail screen until conversion is completed.

Marking a Lead Won does not by itself record a sale, a Closed Amount or
a Customer Purchase. Those are recorded against a Customer Purchase
after conversion, as defined in Sections 67 and 68.3.

Marking a Lead Won does not change its priority, and does not require
any document.


**52. Convert Lead to Customer**

Before conversion, display a confirmation screen/modal summarising the
information that will be carried forward.

Example:

**Convert Lead to Customer**

**Rajesh Menon**

**98765 43210**

**rajesh@email.com**

**The following will be retained:**

✓ Contact information

✓ Record Owner

✓ Notes

✓ Activity history

✓ Follow-up history

**\[ Convert \]**

**\[ Cancel \]**

**No documents are required to convert a Lead**

A Lead may be converted into a Customer **without any policy
documents**. Conversion is not gated on documents, on a Customer
Purchase existing, or on any amount being recorded.

Policy documents belong to a Customer Purchase and are required only to
mark that purchase `Closed/Active`, as defined in Section 68.1. Nothing
in the conversion flow may block on them.

**After Conversion**

The system should:

> • Create a Customer using the Lead's information.
>
> • Retain the Lead's historical activity, including its priority
> history.
>
> • Link the original Lead and resulting Customer.
>
> • Carry forward incomplete future follow-ups.
>
> • Retain the Record Owner unless deliberately changed. The Record
> Owner remains a Team Lead or Salesperson.
>
> • Mark the Lead as **Converted**.
>
> • Converted Leads are removed from active Pipeline/List views and
> remain accessible through a Converted filter/history.
>
> • Prevent the same Lead from being converted a second time.
>
> • Open the newly created Customer Profile.

The original Lead should **not be deleted**.

**Recording what was sold**

Conversion creates the Customer relationship only. What the Customer
bought is recorded separately as a Customer Purchase.

After conversion the system should offer, without requiring:

**\[ Add Customer Purchase \]**

A Customer may be created and left with no purchase. The Customer record
is fully usable in that state.


**53. Existing Customer During Conversion**

If a Customer with the same phone number or email already exists, do not
automatically create another Customer.

Show:

**A matching Customer already exists.**

**Ramesh Kumar**

**98765 43210**

**\[ View Customer \]**

**\[ Link Lead to Existing Customer \]**

**\[ Cancel \]**

Authorized users may link the Lead to the existing Customer.

The Lead is then marked **Converted** and its history remains available.

Incomplete Follow-ups belonging to the Lead are transferred to the
existing Customer, while historical Lead activities remain associated
with the original Lead and accessible through the linked Customer
history.

**An existing Customer buying again**

Linking a Lead to an existing Customer is the normal path when an
existing Customer buys an additional product. The Customer record is not
duplicated. Instead, the new sale is recorded as a **new Customer
Purchase** against the existing Customer, as defined in Section 67.

Each purchase is tracked independently, with its own Plan, policy
number, documents, Closed Amount, status and renewal cycles. Adding one
never alters an existing purchase.

Linking does not change the existing Customer's Record Owner. If the new
purchase should be owned by the user who worked the Lead, that is set on
the Customer Purchase itself, which may have a different Record Owner
from the Customer. Both must be a Team Lead or Salesperson.


**54. Mark Lead as Lost**

When marking a Lead as Lost:

> • request a Lost Reason
>
> • optionally accept a note
>
> • mark the Lead as Lost
>
> • remove it from the active pipeline
>
> • retain the complete history
>
> • When a Lead is marked Lost, any incomplete Follow-ups for that Lead
> are cancelled and retained in history. Reopening the Lead does not
> automatically restore cancelled Follow-ups; a new Follow-up may be
> scheduled.

A Lost Lead may later be reopened by an authorized user.

Reopening returns the Lead to an active pipeline stage selected by the
user.

**55. Lead Assignment**

Every Lead has a **Record Owner**, who is always a **Team Lead or
Salesperson**. Admins and Managers can never be a Lead's Record Owner.
See Section 2.5.

A Lead receives its Record Owner either by automatic team round robin or
by manual assignment. Both are defined in Sections 189 and 189.1.

**Automatic assignment**

Automatic assignment is scoped to a single destination team. The
eligible pool is that team's active Team Lead and active Salespersons
who are not paused from round robin. Admins, Managers, inactive users,
users paused from round robin and users from other teams are never
eligible recipients.

If the destination team has no eligible automatic recipient, assignment
fails safely: the Lead is not given to an Admin, a Manager or a user
from another team, and the condition is surfaced rather than ignored.
See Section 189.1.

**Manual assignment and reassignment**

Authorized supervisors may assign or reassign a Lead, but only within
their permitted hierarchy under Section 2.3:

> • a Team Lead may assign or reassign within their own team
>
> • a Manager may assign or reassign within their own reporting
> hierarchy
>
> • an Admin may assign or reassign anywhere in the organization

A supervisor who performs an assignment does **not** become the Lead's
owner. Assignment is a supervisory action; ownership stays with the
Team Lead or Salesperson selected.

Whether a Salesperson may reassign a Lead is *pending client
confirmation before security implementation and UAT* and is listed in
Section 188. It must not be assumed.

If assignment cannot be completed, the Lead may remain **Unassigned**
against its destination team until an authorized user assigns it.

Every assignment and reassignment appears in Activity History and is an
auditable action. Detailed audit-history requirements are defined in
Section 208.


**56. Lead Archive**

Authorized users may archive a Lead.

Archived Leads:

> • disappear from normal Leads views
>
> • do not appear in the active Pipeline
>
> • retain activity and follow-up history
>
> • can be viewed using an Archived filter
>
> • can be restored

Archive always requires confirmation. If incomplete Follow-ups exist,
the confirmation additionally warns that they will be removed from
active work views and retained in history.

The user must confirm before proceeding.

**57. Lead Management — Mobile Behaviour**

The mobile Lead experience should prioritise quick customer contact and
follow-up actions.

**Leads List**

Use card/list rows rather than the full desktop table.

Each item should show:

**Rajesh Menon · Hot**

**Health Insurance**

**Interested**

**Next follow-up: Today · 4:30 PM**

**\[ Call \] \[ WhatsApp \]**

Priority and stage are both shown and are visibly distinct. Priority is
not a stage and must not be rendered as one.

**Call** follows the click-to-call behaviour defined in Sections
29–33. It opens the phone's native calling interface and does
not by itself complete a Follow-up or create a Call activity.

Selecting the card opens Lead Detail.

**Lead Detail**

Keep primary actions easily accessible:

**Call \| WhatsApp \| Email \| Follow-up \| More**

**Call** follows the click-to-call behaviour defined in Sections
29–33. It opens the phone's native calling interface and does
not by itself complete a Follow-up or create a Call activity.

Where the row or header cannot comfortably show every channel, Email may
be placed under **More**. It must not be removed from mobile entirely.

Changing Lead Priority must be possible from mobile, since Salespersons
and Team Leads work primarily from a phone.

Information and Activity sections should stack vertically.

**Pipeline**

A complex multi-column desktop board should not be squeezed onto mobile.

On mobile, the Pipeline should use

> • horizontal stage tabs, followed by
>
> • a vertical list of Leads in the selected stage

Example:

**New \| Contacted \| Interested \| Won**

**Interested · 7**

**Rajesh Menon · Hot**

**Health Insurance**

**Follow-up tomorrow**

**Priya Iyer · Warm**

**Motor Insurance**

**No follow-up**

Priority may also be used to sort or filter within the selected stage.

Every mobile Lead view is scoped by the reporting hierarchy in
Section 2.3, exactly as on desktop.


**58. Customer Management**

Customer Management is the central part of the CRM.

Customers may enter the system in two ways:

Lead Conversion → Customer

or

**Add Customer Directly**

A Customer records the relationship. What the Customer has actually
bought is recorded separately, as one or more **Customer Purchases**.

Basic customer lifecycle:

Customer → Add Customer Purchase → Upload Required Policy Documents →
Mark `Closed/Active` → Renewal Reminder → Renewal / Completion → New
Renewal Date

A Customer may exist without any Customer Purchase, and may hold many
purchases at once. Neither the Customer record nor the conversion that
created it requires any document.

Customers are owned by a Team Lead or Salesperson and are visible
according to the reporting hierarchy in Section 2.3.


**59. Customers — List View**

**Purpose**

Provide a searchable and filterable view of the Customers the user is
permitted to access under Section 2.3.

**Header**

**Customers**

Primary action:

**+ Add Customer**

Secondary action:

**Import Customers**

**Customer Table**

**Field**

**Example**

Customer Name

Ramesh Kumar

Phone

98470 12345

Purchases

3

Record Owner

Arun

Team

Kochi Health Team

Next Renewal Date

26 Aug 2027

Last Activity

02 Sep

Actions

⋯

The **Purchases** column shows how many Customer Purchases the Customer
holds within the viewer's permitted scope. Where a Customer has one
purchase, the Plan name may be shown instead of a count.

Selecting the Customer Name opens the Customer Profile.

**Filters**

> • Record Owner
>
> • Team
>
> • Product Category
>
> • Provider
>
> • Plan / Sub-product
>
> • Purchase Status
>
> • Renewal / Due Status
>
> • Created Date

Record Owner and Team filter options are limited to those within the
viewer's permitted scope. A filter list must never disclose users or
teams the viewer cannot otherwise see.

Quick filters:

**All \| My Customers \| Due Soon \| Overdue \| No Upcoming Renewal**

For a Salesperson, **All** and **My Customers** resolve to the same set,
because a Salesperson sees only their own records. For a Team Lead,
**All** means their team.

**Search**

Search by:

> • Customer name
>
> • Phone number
>
> • Email
>
> • policy or reference number

**Row Actions**

The ⋯ menu may contain:

> • View Customer
>
> • Edit
>
> • Change Record Owner
>
> • Add Follow-up
>
> • Add Customer Purchase
>
> • WhatsApp
>
> • Email
>
> • Archive

**Change Record Owner** offers only Team Leads and Salespersons within
the acting user's permitted scope.

Actions must follow the fixed role behaviour in Section 2. Action-level
decisions that remain open are listed in Section 188.


**60. Add Customer**

Selecting **+ Add Customer** opens the Customer form.

**Basic Information**

> • Customer Name — required
>
> • Phone Number
>
> • Email
>
> • Record Owner — required
>
> • Address — optional
>
> • Notes — optional

At least one contact method — **Phone Number or Email** — must be
provided.

Configured Customer custom fields appear below the standard fields. See
Section 194.

**Record Owner** must be a Team Lead or Salesperson. Admins and Managers
are never selectable. The selectable users are limited to those the
acting user is permitted to assign to under Section 2.3. See
Section 2.5.

For Customers added directly by a Team Lead or Salesperson, Record Owner
defaults to the current user.

Imported Customers may remain **Unassigned** when no valid Record Owner
is mapped.

**No documents are required to create a Customer.** Policy documents
belong to a Customer Purchase and are required only to mark that
purchase `Closed/Active`. See Section 68.1.

A Customer may be created with no Customer Purchase.

**Actions**

**Save Customer**

**Save & Add Customer Purchase**

**Cancel**

**Save Customer**

Creates the Customer and opens the Customer Profile.

**Save & Add Customer Purchase**

Creates the Customer and immediately opens the Add Customer Purchase
form.


**61. Customer Duplicate Warning**

Before creating a Customer, check for an existing Lead or Customer with
the same phone number or email.

If a possible duplicate exists:

> **A Lead or Customer with this contact information already exists.**

Show the matching record(s).

Actions:

**View Existing Record**

**Create Anyway** — where permitted

If the match is an existing Lead, the system should allow the user to
open that Lead and decide whether it should be converted instead of
creating a separate Customer.

The system should warn about possible duplicates but should not
automatically merge records.

**62. Customer Profile**

The Customer Profile is the central working screen for an existing
Customer.

Recommended structure:

**Ramesh Kumar**

**98470 12345 · ramesh@email.com**

**Record Owner: Arun · Kochi Health Team**

**\[ WhatsApp \] \[ Email \] \[ Add Follow-up \] \[ Add Customer Purchase \]
\[ Edit \] \[ More \]**

**────────────────────────────────**

**Customer Information**

**────────────────────────────────**

**Customer Purchases**

**────────────────────────────────**

**Upcoming Actions**

**────────────────────────────────**

**Activity & Notes**

**────────────────────────────────**

**Policy Documents**

A Customer may exist with no Customer Purchase at all. In that case the
Customer Purchases section shows its empty state and invites the owner
to add one. Nothing about the Customer record is blocked by the absence
of a purchase or of documents.


**63. Customer Header**

Display:

> • Customer Name
>
> • Phone
>
> • Email
>
> • Record Owner
>
> • Team

Primary actions:

**Call**

**WhatsApp**

**Email**

**Add Follow-up**

**Add Customer Purchase**

**Edit**

**More**

**Call** is enabled only when:

> • the user can access the Customer
>
> • a valid phone number exists
>
> • the device or environment can handle the telephone link

Selecting **Call** follows the click-to-call behaviour defined in
Sections 29–33. Initiating a call does not by itself create a Call
activity or change the Customer status.

The WhatsApp action follows the same availability rules defined for
Leads.

If the Customer has no valid phone number, WhatsApp should be
unavailable.

The Email action follows the same availability rules defined for Leads.

If the Customer has no valid email address, is marked **Email Opted
Out**, or no verified sender is configured, Email should be unavailable.


**64. Customer Information**

Display standard Customer information and configured Customer custom
fields.

Example:

**Field**

**Value**

Phone

98470 12345

Email

ramesh@email.com

Record Owner

Arun

Team

Kochi Health Team

Address

Kochi

Customer Since

29 Aug 2026

Authorized users may edit this information using **Edit Customer**.

The Record Owner may be changed only to another Team Lead or
Salesperson the acting user is permitted to assign to under
Section 2.3. Admins and Managers are never selectable.

Changes to Record Owner are recorded in Activity History and are
auditable. Changing the Customer's Record Owner does not automatically
change the Record Owner of that Customer's existing purchases; those are
changed individually, as described in Section 68.

Configured Customer custom fields appear here. Custom fields are
configurable business data and never affect who can see or own the
record. See Section 194.


**65. Customer Purchases on Customer Profile**

This section lists the Customer Purchases belonging to the Customer. A
Customer may have zero, one or many.

Example:

**Plan / Sub-product**

**Provider**

**Policy No.**

**Status**

**Documents**

**Renewal Date**

Family Health Optima

Star Health

STAR/FH/44120

Closed/Active

3 of 3

26 Aug 2027

Secure Shield

Star Health

STAR/SS/91204

Not closed

1 of 2

—

Two-Wheeler Package

Acme General

AG/TW/83912

Closed/Active

2 of 2

11 Jan 2027

Actions:

**+ Add Customer Purchase**

Selecting a row opens the Customer Purchase Detail.

The **Documents** column shows required-document completeness. A
purchase whose documents are incomplete cannot be marked `Closed/Active`
and should make that visible at a glance.

Each Customer Purchase is independent: it carries its own Provider,
Plan, policy number, Closed Amount, documents, status, Record Owner and
renewal cycles. A Customer who buys a further Plan gets a further
Customer Purchase; existing purchases are not modified.

The purchases shown are those the viewer is permitted to see under
Section 2.3. Where a Customer's purchases are owned by different users,
a viewer may see some and not others; the screen must not reveal the
existence of purchases outside their scope.


**66. Insurance Product Catalogue**

The catalogue describes what A&S Fincare distributes. It has three
levels, and a fourth concept that records an actual sale:

> **1. Product Category** — the class of product.
> Example: Health Insurance.
>
> **2. Provider** — the insurer whose product it is.
> Example: Star Health.
>
> **3. Plan / Sub-product** — the specific named product a customer can
> buy. Example: Family Health Optima.
>
> **4. Customer Purchase** — one specific Plan acquired by one Customer.
> Example: Rajesh Menon's Family Health Optima policy.

The names above are examples showing the shape of the data. They are not
fixed or seeded values.

**Relationships**

> • A Product Category may contain Plans from multiple Providers.
>
> • A Provider may offer multiple Plans, across more than one Product
> Category.
>
> • Each Plan belongs to exactly one Product Category and exactly one
> Provider.
>
> • A Customer purchases a **Plan/Sub-product**, never a Product
> Category and never a Provider on its own.

Illustration:

**Catalogue**

**Health Insurance** (Product Category)

↓

**Star Health** (Provider)

↓

**Family Health Optima** (Plan / Sub-product)

↓

**Customer Purchase**

**Rajesh Menon**

**Family Health Optima · Star Health**

**Policy No: STAR/FH/44120**

**Renewal Date: 26 Aug 2027**

**Closed Amount recorded · Status: Closed/Active**

**Catalogue rules**

> • The catalogue is shared reference data maintained for A&S Fincare
> and is administered by Admin. See Section 193.
>
> • Catalogue records are never the Record Owner or assignee of an
> operational record.
>
> • Deactivating a catalogue record prevents future selection but must
> not delete, alter or invalidate existing Customer Purchases, their
> Closed Amount, their documents or their history.
>
> • Admin-defined custom fields are not available on catalogue records.
> They apply only to Leads, Customers and Customer Purchases. See
> Section 194.
>
> • The catalogue does not define provider integrations. V1 does not
> connect to any provider system.


**67. Add Customer Purchase**

Selecting **Add Customer Purchase** creates a Customer Purchase: one
specific Plan/Sub-product acquired by this Customer.

**Fields**

> • Product Category — required
>
> • Provider — required
>
> • Plan / Sub-product — required
>
> • Policy / Reference Number — optional at creation
>
> • Start / Effective Date — optional
>
> • Renewal Date — optional
>
> • Closed Amount — recorded for a qualifying purchase
>
> • Status — required
>
> • Record Owner — required
>
> • Notes — optional

Category, Provider and Plan are selected from the catalogue defined in
Section 193. Selecting a Category narrows the Providers offered, and
selecting a Provider narrows the Plans offered. Only active catalogue
entries are selectable.

The Customer purchases a **Plan/Sub-product**. It is not possible to
record a purchase against a Product Category or a Provider alone.

**Record Owner** defaults to the Customer's Record Owner and may be
changed to another Team Lead or Salesperson the acting user is permitted
to assign to. Admins and Managers are never selectable. See
Section 2.5.

Configured Customer Purchase custom fields appear below the standard
fields. See Section 194.

**Status at creation**

A new purchase is created in a not-closed state. It cannot be created
directly as `Closed/Active` unless its required policy documents are
already complete. See Section 68.1.

**Actions**

**Save**

**Save & Upload Documents**

**Save & Add Reminder**

**Cancel**

**Save**

Creates the Customer Purchase and returns to the Customer Profile.

**Save & Upload Documents**

Creates the purchase and opens its required-document checklist, so the
owner can complete the prerequisite for `Closed/Active`.

**Save & Add Reminder**

Creates the purchase and opens the reminder configuration for its
renewal date. If no renewal date has been entered, the user must enter
one before creating a date-based reminder.

**Repeat purchases**

An existing Customer may purchase an additional Plan/Sub-product at any
time. Each one is created as its own Customer Purchase and is tracked
independently, with its own documents, Closed Amount, status and renewal
cycles. Adding a purchase never modifies an existing one.


**68. Customer Purchase Detail**

The detail view should show:

> • Customer
>
> • Product Category
>
> • Provider
>
> • Plan / Sub-product
>
> • Policy / Reference Number
>
> • Start / Effective Date
>
> • Renewal Date
>
> • Status
>
> • Closed Amount
>
> • Record Owner
>
> • Team
>
> • required policy documents and their completeness
>
> • notes
>
> • configured Customer Purchase custom fields
>
> • created and last-updated history

Actions:

**Edit**

**Upload Documents**

**Mark Closed/Active**

**Add / Edit Reminder**

**Mark Renewed / Completed**

**Add Follow-up**

**Change Record Owner**

**Archive**

The Customer name links back to the Customer Profile.

**Mark Closed/Active** is disabled while any required policy document is
missing, and the interface explains which documents are outstanding. See
Section 68.1.

**Change Record Owner** offers only Team Leads and Salespersons the
acting user is permitted to assign to under Section 2.3. Changing
ownership is an auditable action and does not make the supervisor who
performed it an owner.

Archiving a Customer Purchase removes it from active purchase and
renewal work views, cancels its future scheduled reminders, and retains
its details, documents, Closed Amount, renewal history and activity.
Authorized users may restore it.

## 68.1 Customer Purchase Status and `Closed/Active`

**Statuses**

> • **Draft / Not Closed** — the purchase has been recorded but is not
> yet confirmed as closed. Required policy documents may still be
> missing.
>
> • **`Closed/Active`** — the sale is closed and the policy is in force.
> All required policy documents have been uploaded.
>
> • **Completed** — the purchase ran its course and was not renewed.
>
> • **Expired** — the renewal date passed without renewal or completion.
>
> • **Cancelled** — the purchase was cancelled.

Existing status meanings are retained where they do not conflict with
this model. `Closed/Active` is the status introduced by this
specification and is the one that gates performance and incentive
eligibility.

**The document prerequisite**

A Customer Purchase **cannot be marked `Closed/Active` until all of its
required policy documents have been uploaded.**

> • The system must show which required documents are present and which
> are missing.
>
> • The **Mark Closed/Active** action must be unavailable while any
> required document is missing, and must explain why rather than failing
> silently or without reason.
>
> • The transition must be validated on the server. Hiding or disabling
> the button in the interface is not sufficient.
>
> • No approval, review or sign-off follows the upload. Uploading the
> required documents is by itself sufficient to satisfy the document
> prerequisite.

**What the document prerequisite does not mean**

> • It does not apply to converting a Lead into a Customer. A Lead may
> be converted with no documents at all. See Section 52.
>
> • It does not apply to creating a Customer. See Section 60.
>
> • It does not apply to creating a Customer Purchase. A purchase may be
> created and worked on while its documents are incomplete.
>
> • Uploading documents does not imply that payment was received, that
> the policy was issued by the provider, or that any other business
> event occurred. Those are separate facts and must not be inferred.

**Effect of `Closed/Active`**

Once a purchase is `Closed/Active`, its Closed Amount becomes eligible
for performance and incentive totals. See Section 68.3.

**Pending client confirmation**

These questions are collected in the consolidated register in
Section 212.

> • Whether a distinct intermediate status is required between creation
> and `Closed/Active` is *pending client confirmation*. The names used
> above should not be treated as final.
>
> • Cancellation, lapse, refund and reversal behaviour after a purchase
> has reached `Closed/Active`, and the effect on already-counted Closed
> Amount, is *pending client confirmation*.

## 68.2 Required Policy Documents

Each Customer Purchase carries a checklist of the policy documents
required for it.

The screen must show:

> • each required document type
>
> • whether it is present or missing
>
> • the uploaded file, uploader and upload date where present
>
> • overall completeness, for example **2 of 3 uploaded**

Example:

**Required Documents — 2 of 3**

✓ Policy schedule — uploaded by Arun, 01 Sep 2026

✓ Proposal form — uploaded by Arun, 01 Sep 2026

✗ Policy certificate — missing

**\[ Upload \]**

**Rules**

> • Documents are uploaded against the Customer Purchase, not against
> the Customer.
>
> • V1 covers **policy-related documents only**. Personal identity and
> KYC documents are not part of this requirement.
>
> • Uploaded documents are retained for future reference and survive
> archiving of the purchase or the Customer.
>
> • There is no approval or review queue.
>
> • Additional, non-required policy documents may also be uploaded. They
> do not affect the completeness calculation.
>
> • Document access follows the reporting hierarchy in Section 2.3 and
> is enforced server-side.
>
> • Uploads, replacements and removals are auditable actions.
>
> • Removing a required document returns the purchase to an incomplete
> state. Whether this can occur after the purchase is already
> `Closed/Active`, and what happens if it does, is *pending client
> confirmation*.

The administrative level at which the required-document list is defined
is *pending client confirmation*, as described in Section 193.4. What is
fixed is that each purchase resolves to a definite list and reports its
completeness.

## 68.3 Closed Amount

**Closed Amount** is the value recorded against an individual Customer
Purchase for a qualifying transaction.

**Rules**

> • Closed Amount belongs to the **Customer Purchase**. It is not stored
> only at Customer level, and a Customer's total is derived from their
> purchases rather than entered directly.
>
> • A Customer Purchase existing, or a Customer existing, does not by
> itself make any amount eligible.
>
> • A Closed Amount becomes **eligible** for performance and incentive
> totals only when both conditions hold:
>
> > 1. the required policy documents for that purchase are complete; and
> >
> > 2. the purchase is `Closed/Active`.
>
> • Each renewal cycle keeps its own Closed Amount. A new cycle's amount
> does not overwrite the previous cycle's.
>
> • Changing a Closed Amount is an auditable action.

**Roll-ups**

Eligible Closed Amount aggregates upward through the hierarchy:

> • a Salesperson's own total
>
> • a Team Lead's own personal total
>
> • the team total — the Team Lead's personal total plus the team's
> Salespersons
>
> • a Manager's branch total
>
> • the organization total, visible to Admin

A roll-up shown to a Team Lead, Manager or Admin does **not** mean that
supervisor owns the underlying purchases. Managers and Admins never own
purchases at all. See Section 2.5.

**Terminology**

Closed Amount is the transaction value recorded on a purchase. It is not
itself revenue, commission or an incentive. Where this specification
needs to refer to a calculated incentive, it says so explicitly. The
incentive engine is defined in Section 206.

**Pending client confirmation**

These questions are collected in the consolidated register in
Section 212.

> • which Customer Purchases qualify for a Closed Amount
>
> • the effect on already-counted totals if a purchase is later
> cancelled, lapses, is refunded or is reversed


**69. Important Dates**

Important dates are dates associated with a Customer Purchase that
require future action.

Examples:

> • policy renewal date
>
> • policy expiry date
>
> • premium instalment due date
>
> • free-look or cooling-off period end date

For V1, the primary important date used by the Renewals & Reminders
module is the Customer Purchase's **Renewal Date**.

Additional date fields, including Customer Purchase custom date fields,
may be stored but do not automatically create reminders unless
specifically configured as reminder dates.


**70. Renewals & Reminders — Main Screen**

**Purpose**

Provide a central work view of Customer Purchases approaching or past
their renewal date.

The list is scoped by the reporting hierarchy in Section 2.3: a
Salesperson sees their own, a Team Lead their team's, a Manager their
branch's, and an Admin the organization's.

Recommended tabs:

**Overdue \| Today \| Next 7 Days \| Next 30 Days \| Later**

**Table**

**Field**

**Example**

Customer

Ramesh Kumar

Plan / Sub-product

Family Health Optima

Provider

Star Health

Reference

STAR/FH/44120

Renewal Date

26 Sep 2026

Assigned To

Arun

Team

Kochi Health Team

Reminder Status

Scheduled

Status

Upcoming

Actions

⋯

Selecting the Customer opens the Customer Profile.

Selecting the Plan/Sub-product opens the Customer Purchase Detail.

Filters may include renewal window, Product Category, Provider, Plan,
Assigned To and Team. The Assigned To and Team options are limited to
those within the viewer's permitted scope.


**71. Renewal / Reminder Assignment**

A Renewal action uses **Assigned To**, not Record Owner.

By default, the Renewal action inherits the Record Owner of the related
Customer Purchase.

The Assigned To user must be a **Team Lead or Salesperson**. Admins and
Managers can never be the assignee of a Renewal action. See Section 2.5.

Authorized users may reassign it, within the limits of the reporting
hierarchy in Section 2.3:

> • a Team Lead may reassign within their own team
>
> • a Manager may reassign within their own reporting hierarchy
>
> • an Admin may reassign anywhere in the organization

Example:

**Customer Purchase**

**Record Owner: Arun**

**Family Health Optima Renewal**

**Assigned To: Sneha**

Changing the Renewal action's Assigned To does not change the Customer
Purchase's Record Owner, and does not make the supervisor who performed
the reassignment an owner of anything.

Reassignment is an auditable action. Detailed audit-history requirements
are defined in Section 208.


**72. Renewal Status**

Recommended V1 statuses:

> • Upcoming
>
> • Due Today
>
> • Overdue
>
> • Renewed / Completed
>
> • Not Renewing

Status is derived from the Renewal Date and user action.

**Upcoming**

Renewal Date is in the future.

**Due Today**

Renewal Date is today.

**Overdue**

Renewal Date has passed and the item has not been marked Renewed/Completed
or Not Renewing.

**Renewed / Completed**

A&S Fincare has completed the renewal action for this Customer
Purchase.

**Not Renewing**

The Customer will not continue this Customer Purchase for the current
cycle.

**73. Reminder Configuration**

A reminder schedule is configured for a **Customer Purchase** that has a
renewal date.

Example:

**Reminder Schedule**

☑ **30 days before**

☑ **7 days before**

☑ **1 day before**

**Channels**

☑ **In-app**

☑ **WhatsApp**

☑ **Email**

Default reminder settings configured by Admin are preselected. See
Section 195.

Authorized users may adjust the reminder schedule for an individual
Customer Purchase.

Renewal reminders are part of V1 and operate automatically once a
renewal date and schedule exist. They are not an optional module. The
automation rules are defined in Section 195.1.

A WhatsApp reminder requires:

> • a valid Customer phone number
>
> • an active WhatsApp connection
>
> • an eligible/approved message template where required
>
> • the Customer not being marked WhatsApp Opted Out

If WhatsApp cannot be used, the reminder must not silently fail.

An Email reminder requires:

> • a valid Customer email address
>
> • a verified sender
>
> • an active Email template
>
> • the Customer not being marked Email Opted Out

If Email cannot be used, the reminder must not silently fail.

The schedules and channels shown above are illustrative. The schedules,
channel preference and template content A&S Fincare will use are
*pending client confirmation*.


**74. Reminder Status**

Where applicable, show a simple reminder status such as:

> • Not Scheduled
>
> • Scheduled
>
> • Sent
>
> • Failed
>
> • Cancelled

For multiple reminders, the Customer Purchase Detail may show the
individual reminder history.

Example:

**30 days before Sent 27 Aug**

**7 days before Scheduled 19 Sep**

**1 day before Scheduled 25 Sep**

**75. Send Reminder Manually**

From Renewals & Reminders, an authorized user may send a reminder
manually for a Customer Purchase within their permitted scope.

A manual reminder is an immediate send. It is separate from the
automatic renewal reminders defined in Section 195.1, and sending one
does not cancel or replace a scheduled reminder.

Actions:

**Send WhatsApp Reminder**

or

**Send Email Reminder**

or

**Create Follow-up**

Sending a manual WhatsApp or Email reminder should use the applicable communication flow defined in the WhatsApp and Email sections, including their eligibility, template, consent and opt-out rules.

A manual reminder should be recorded in:

> • Message History
>
> • Customer Activity
>
> • the Customer Purchase's reminder history

A failed manual send must be shown as failed, with the available reason.
It must never be presented as successful.


**76. Bulk Renewal Reminder**

Authorized users may select multiple eligible Customer Purchases from
the Renewals & Reminders screen.

Selection is limited to the records within the acting user's permitted
scope under Section 2.3. A user can never select, or send to, a record
they cannot see.

Available bulk action:

**Send WhatsApp Reminder**

or

**Send Email Reminder**

Before sending, show:

> • number of selected Customers
>
> • selected template
>
> • Customers excluded because the required phone number or email address is missing or invalid
>
> • Customers excluded because of channel restrictions, opt-out status, missing variables or unavailable configuration
>
> • confirmation before sending

Example:

**Send Reminder**

**Selected: 24**

**Eligible: 21**

**Cannot send: 3**

**Template:**

**Renewal Reminder ▼**

**\[ Send to 21 Customers \]**

**\[ Cancel \]**

Bulk messaging must not imply unrestricted WhatsApp broadcasting. Only
eligible messages should be sent, and Meta template, consent and opt-out
rules continue to apply.

Controlled bulk Email reminders follow the validation, review and result rules defined in the Email Communications section.

Which roles may send controlled bulk reminders is *pending client
confirmation before security implementation and UAT* and is listed in
Section 188.


**77. Mark Renewed / Completed**

Selecting **Mark Renewed / Completed** on a Customer Purchase opens a
small form.

Fields:

> • Completion / Renewal Date — default today
>
> • New Renewal Date — optional
>
> • Policy / Reference Number — prefilled, editable
>
> • Closed Amount for the new cycle — where the renewal represents a new
> qualifying transaction
>
> • Note — optional

Actions:

**Save**

**Cancel**

**If a New Renewal Date is entered**

The current cycle is marked completed and the Customer Purchase remains
active with the new renewal date.

Future reminders are generated from the new renewal date according to
the reminder configuration.

Example:

**Old Renewal Date**

**26 Aug 2026**

↓

**Renewed**

**02 Sep 2026**

↓

**New Renewal Date**

**26 Aug 2027**

The previous renewal date and the renewal event remain in the purchase's
history.

**Renewal, documents and Closed Amount**

> • Whether a renewal cycle requires its own policy documents before its
> Closed Amount becomes eligible follows the same rule as the original
> purchase: a cycle's Closed Amount becomes eligible for performance and
> incentive totals only once the required documents for that cycle are
> complete and the purchase is `Closed/Active`. See Sections 68.1–68.3.
>
> • Each renewal cycle keeps its own Closed Amount. Recording a new
> cycle's Closed Amount must not overwrite or erase the previous cycle's
> recorded amount or its contribution to a closed reporting period.
>
> • Whether a renewal counts as a qualifying transaction for incentive
> purposes is *pending client confirmation*, as listed in Section 206.


**78. Complete Without Another Renewal Date**

Some Customer Purchases are completed once and do not require another
renewal.

If **Mark Renewed / Completed** is selected without a New Renewal Date:

> • mark the current action completed
>
> • retain the completion in history
>
> • do not create another renewal cycle
>
> • no new reminders are scheduled

If completed without a New Renewal Date, set the Customer Purchase
status to **Completed**.

**79. Mark as Not Renewing**

If the Customer will not renew:

**Mark as Not Renewing**

Optional fields:

> • Reason
>
> • Note

Example reasons:

> • Customer declined
>
> • Switched provider
>
> • No longer required
>
> • Unable to contact
>
> • Other

After saving:

> • remove the item from active renewal work views
>
> • cancel future reminders for the current cycle
>
> • retain the full history

The Customer Purchase remains visible on the Customer Profile.

**80. Overdue Renewal Behaviour**

A Customer Purchase becomes **Overdue** when its Renewal Date passes
without being completed or marked Not Renewing.

Overdue items:

> • appear under the Overdue tab
>
> • contribute to Dashboard Overdue Actions
>
> • remain actionable
>
> • continue to show their original Renewal Date
>
> • do not automatically renew or close

Available actions include:

> • Send Reminder
>
> • Add Follow-up
>
> • Mark Renewed / Completed
>
> • Mark Not Renewing

**81. Upcoming Actions on Customer Profile**

The Customer Profile should show the nearest outstanding actions.

Example:

**Upcoming Actions**

**05 Sep · Follow-up**

**Call regarding renewal.**

**Assigned To: Arun**

**26 Sep · Renewal**

**Health Insurance**

**Assigned To: Sneha**

If overdue actions exist, they should appear before future actions.

Actions may include:

**Complete**

**Reschedule**

**View**

**WhatsApp**

**Email**

depending on the item type.

**82. Customer Activity & Notes**

The Customer timeline combines important activity from across the
Customer relationship, including activity on each of the Customer's
purchases.

Examples:

**Today · 10:30 AM**

**WhatsApp renewal reminder sent**

**Family Health Optima renewal**

**Yesterday · 4:15 PM**

**Follow-up completed by Arun**

**02 Sep · 11:10 AM**

**Family Health Optima renewed**

**New renewal date: 26 Aug 2027**

**01 Sep · 3:20 PM**

**Purchase marked Closed/Active by Arun**

**Closed Amount recorded**

**01 Sep · 3:05 PM**

**Policy schedule uploaded by Arun**

**Family Health Optima**

**29 Aug · 9:15 AM**

**Customer created from Lead Rajesh Menon**

The timeline should include relevant:

> • follow-ups
>
> • notes
>
> • WhatsApp messages
>
> • Emails
>
> • Customer Purchase created
>
> • required policy document uploaded, replaced or removed
>
> • purchase marked `Closed/Active`
>
> • Closed Amount recorded or changed
>
> • renewal/completion events
>
> • Record Owner changes on the Customer or on a purchase
>
> • custom field changes, where meaningful

Users may add a manual note using: **+ Add Note**

Timeline visibility follows the reporting hierarchy in Section 2.3. A
supervisor seeing an activity row does not become the owner of the
related record.


**83. Policy Documents on the Customer Profile**

The Customer Profile summarises the policy documents held against that
Customer's purchases. Documents themselves belong to a **Customer
Purchase**, not to the Customer record, and are managed from the
Customer Purchase Detail screen defined in Section 68.2.

V1 covers **policy-related documents only**. Personal identity and KYC
documents are outside this requirement. The full document model is
defined in Section 205.

The summary should show, per Customer Purchase:

> • the Plan/Sub-product and Provider
>
> • required-document completeness, for example **2 of 3 uploaded**
>
> • which required documents are still missing
>
> • whether the purchase is blocked from `Closed/Active` as a result

Each listed document should show:

> • Document Type, where it satisfies a required document
>
> • file name
>
> • uploaded by
>
> • uploaded date
>
> • the related Customer Purchase

Actions:

**Upload**

**View / Download**

**Replace**

**Delete / Archive**

No approval or review follows an upload. Uploading a required document
immediately satisfies that requirement.

Uploaded policy documents are retained for future reference and remain
available when the Customer or the purchase is archived.

Document visibility and actions follow the reporting hierarchy in
Section 2.3 and are enforced server-side.

Which roles may upload, replace or remove policy documents is *pending
client confirmation before security implementation and UAT*.


**84. Customer Archive**

Authorized users may archive a Customer.

Archived Customers:

> • disappear from normal Customer views
>
> • remain accessible through an Archived filter
>
> • retain Customer Purchases, activities and documents
>
> • can be restored

Archive always requires confirmation.

If the Customer has:

> • incomplete Follow-ups
>
> • active Renewal actions
>
> • scheduled reminders

the confirmation must warn that these active actions will be removed
from normal work views/cancelled where applicable while their history is
retained.

**85. Customer Management — Mobile Behaviour**

The mobile Customer experience should prioritise contact and immediate
actions.

**Customer List**

Use card/list rows.

Selecting the card opens Customer Profile.

**Customer Profile**

Primary actions should remain easily accessible:

**Call \| WhatsApp \| Email \| Follow-up \| More**

**Call** follows the click-to-call behaviour defined in Sections
29–33. It opens the phone's native calling interface and does
not by itself complete a Follow-up or create a Call activity.

Where the header cannot comfortably show every channel, Email may be
placed under **More**. It must not be removed from mobile entirely.

The profile should stack:

> • Customer information
>
> • Upcoming Actions
>
> • Customer Purchases
>
> • Activity
>
> • Documents

**Add Customer Purchase** should remain accessible from the More menu or
as a prominent profile action.

**Customer Purchase on mobile**

A purchase card should show the Plan, Provider, status, renewal date and
document completeness, for example:

**Family Health Optima**

**Star Health · Health Insurance**

**Documents: 1 of 3 uploaded**

**Renewal: 26 Aug 2027**

Uploading a required policy document must work from the phone, using the
device's normal file and camera selection. This is a primary mobile
task for Salespersons and Team Leads, not a desktop-only action.

Marking a purchase `Closed/Active` is available on mobile once the
required documents are complete, and is disabled with an explanation
while any are missing.

**Renewals & Reminders**

Use a vertical work list rather than a desktop table.

Example:

**Ramesh Kumar**

**Family Health Optima · Star Health**

**STAR/FH/44120**

**Due in 4 days**

**Reminder: Scheduled**

**Assigned To: Arun**

**\[ WhatsApp \] \[ Email \] \[ View \]**

Tabs such as:

**Overdue \| Today \| 7 Days \| 30 Days**

may scroll horizontally on mobile.

Every mobile list is scoped by the reporting hierarchy in Section 2.3,
exactly as on desktop.


**86. Customer / Purchase / Renewal Flow Summary**

The Customer workflow supports both customers converted from Leads and
customers added directly.

**Customer**

↓

**Add Customer Purchase**

**Category → Provider → Plan/Sub-product**

↓

**Enter Closed Amount and Renewal Date**

↓

**Upload Required Policy Documents**

**│**

**├── Incomplete → purchase stays not closed**

**│ Closed/Active unavailable, missing documents listed**

**│**

**└── Complete**

↓

**Mark Closed/Active**

↓

**Closed Amount becomes eligible for performance and incentive totals**

↓

**Configure Reminder**

↓

**Renewal Date Approaches**

↓

**Automatic In-app / WhatsApp / Email Reminder**

↓

**Customer Responds / Owner Follows Up**

↓

**Renewed / Completed?**

**│**

**├── Yes**

│ ↓

**│ New Renewal Date?**

**│ │**

│ ├── Yes → Start Next Cycle

│ └── No → Complete

**│**

**└── No**

↓

**Not Renewing**

↓

**Close Current Cycle**

A Customer may repeat this flow independently for each Plan/Sub-product
they purchase. Each Customer Purchase carries its own documents, Closed
Amount, status and renewal cycles.

Conversion from a Lead does not require any document. Documents are
required only to move a Customer Purchase to `Closed/Active`.


**87. WhatsApp Module**

The WhatsApp module allows authorized users to communicate with Leads
and Customers from the CRM and manage incoming customer replies.

V1 supports:

> • individual WhatsApp messaging
>
> • template-based messages where required by the WhatsApp platform
>
> • renewal/reminder messages for Customer Purchases
>
> • controlled bulk messaging to eligible recipients
>
> • incoming customer replies
>
> • a shared conversation inbox scoped by the reporting hierarchy
>
> • conversation assignment
>
> • conversation status
>
> • message delivery status and history

The WhatsApp module is **not** a full customer-support or omnichannel
inbox.

The WhatsApp module does not include:

> • SMS channels
>
> • social-media channels
>
> • chatbot builder
>
> • ticketing
>
> • SLA management
>
> • complex routing
>
> • advanced messaging automation
>
> • marketing campaign analytics

Email is a separate outbound communication channel in V1 and is defined
under Email Communications. It is not part of the WhatsApp module and
does not share the WhatsApp conversation inbox.

A&S Fincare uses **one connected WhatsApp business messaging
connection/number** for the whole organization. Support for multiple
WhatsApp numbers is outside V1.

All WhatsApp behaviour is subject to the visibility model in
Section 89.1 and the fixed role behaviour in Section 2. A conversation
may be owned only by a Team Lead or Salesperson, and a supervisory reply
or assignment never transfers ownership.

Outbound messaging is always subject to Meta platform rules, including
template requirements, messaging eligibility, consent and opt-out. The
CRM must never attempt to bypass them.


**88. WhatsApp Navigation**

Selecting **WhatsApp** from the main navigation opens the shared
WhatsApp Inbox.

Recommended structure:

**WhatsApp**

**All \| Mine \| Unassigned**

**\[ Search conversations \]**

Each conversation row should show:

> • Lead/Customer name, or phone number for an unknown contact
>
> • latest message preview
>
> • latest message time
>
> • unread indicator
>
> • Assigned To
>
> • Open/Closed status where useful

Selecting a conversation opens the Conversation screen.

The **Unassigned** tab is shown only to Admins and Managers. Team Leads
and Salespersons see **All** and **Mine** only.

What each tab contains is determined by the visibility model in
Section 89.1.


**89. WhatsApp Inbox**

The Inbox provides a shared view of incoming and outgoing WhatsApp
conversations, scoped by role.

**Tabs**

**All**

Conversations the user is permitted to access.

**Mine**

Conversations currently **Assigned To** the logged-in user. For a
Salesperson this is the same set as **All**.

**Unassigned**

Conversations that do not currently have an Assigned To user.

**The Unassigned tab is shown only to Admins and Managers.** Team Leads
and Salespersons do not see it, because they have no unassigned
visibility.

## 89.1 WhatsApp Role Visibility

This is the authoritative WhatsApp visibility model. It applies to the
inbox, conversation lists, search, counts, unread badges, previews,
notifications and exports alike.

| Role | Assigned conversation visibility | Unassigned visibility | Reply scope | Reassignment scope |
|---|---|---|---|---|
| Admin | All assigned conversations in the organization | All unassigned conversations | Assigned conversations organization-wide. **No reply while unassigned** | Organization-wide |
| Manager | Conversations assigned anywhere below that Manager | All unassigned conversations across the organization | Assigned conversations below that Manager. **No reply while unassigned** | Only within that Manager's reporting hierarchy |
| Team Lead | Their own conversations and those assigned to Salespersons in their team | None | Their own and their team's assigned conversations | Only within their own team |
| Salesperson | Conversations assigned to them | None | Conversations assigned to them | Pending client confirmation |

**Rules**

> • **An unassigned conversation cannot be replied to by anyone.**
> Viewing it and answering it are different things: Admins and
> Managers can see the unassigned queue, but the reply composer and
> send actions are unavailable until the conversation has been
> assigned to a Team Lead. See Section 93.1.
>
> • All Admins and all Managers can see the unassigned queue.
>
> • Team Leads and Salespersons cannot see the unassigned queue.
>
> • A Manager's organization-wide visibility of **unassigned**
> conversations is a deliberate exception to their normal branch-only
> visibility. It does not extend to assigned conversations.
>
> • Once an unassigned conversation is assigned into a hierarchy, a
> Manager must not retain visibility merely because they saw it in the
> unassigned queue, unless it now belongs below that Manager.
>
> • Admin retains organization-wide visibility at all times.
>
> • Peer Managers cannot see one another's assigned conversations.
>
> • Peer Team Leads cannot see one another's assigned conversations.
>
> • A Salesperson cannot see a peer's conversations, including peers in
> the same team.

**Enforcement**

Conversation counts, filters, search results, notifications, unread
counts, previews and exports must all obey these rules.

Every read, reply, link, assign and reassign action must be authorized
on the server. A hidden tab, a hidden button or an omitted row is
presentation, not authorization.


**90. Conversation List**

Example:

**Person**

**Latest Message**

**Assigned To**

**Time**

**Status**

Ramesh Kumar

Yes, please renew it

Arun

10:32 AM

Open

Priya Iyer

Thank you

Sneha

9:45 AM

Open

98765 43210

I need more details

Unassigned

Yesterday

Open

The list shows only conversations within the viewer's permitted scope
under Section 89.1. The Unassigned row above appears for Admins and
Managers only.

Unread conversations should be visually distinguishable.

Search supports:

> • Lead/Customer name
>
> • phone number

**Scoped results**

Search results, conversation counts, unread counts, filter options and
message previews are all computed only over conversations the viewer is
permitted to see. A preview must never surface message content from a
peer Manager's branch or a peer Team Lead's team, and a count must never
include conversations the viewer cannot open.

Exports of conversation data follow the same scope.

V1 does not require complex support-inbox filters, labels or queues.


**91. Conversation Identity**

A WhatsApp conversation is primarily identified by:

**A&S Fincare WhatsApp Number + Contact Phone Number**

A&S Fincare uses one organization WhatsApp number, as defined in
Section 196. The system should maintain a single continuous conversation
history for each contact rather than creating a separate conversation
every time a message is sent.

Where the same phone number is linked to a Lead that is later converted
into a Customer, the existing WhatsApp conversation continues and
becomes associated with the resulting Customer.

The conversion should **not create a second conversation**.

Closed conversations are also part of the same history and are reopened
rather than duplicated when new messages arrive.

A single continuous conversation does not mean a single audience.
Reassignment changes who can see the conversation going forward, and a
user who loses access loses access to the whole thread, including its
earlier messages.


**92. WhatsApp Conversation Screen**

Recommended desktop structure:

**Ramesh Kumar**

**Customer**

**98470 12345**

**Open**

**Assigned To: Sneha**

**────────────────────────────────────**

**Conversation**

**10:15 AM**

**Business:**

**Your Family Health Optima policy with Star**

**Health is due for renewal on 26 September.**

**Would you like us to assist with renewal?**

**10:32 AM**

**Ramesh:**

**Yes, please renew it.**

**────────────────────────────────────**

**\[ Message composer / Template selector \]**

**────────────────────────────────────**

**Customer Context**

**Family Health Optima · Star Health**

**Renewal Date: 26 Sep 2026**

**Record Owner: Arun**

**\[ Open Customer \]**

**\[ Add Follow-up \]**

The Conversation screen should provide enough CRM context to understand
who the customer is and take the next action.

It should not reproduce the entire Customer Profile.

**Context follows scope**

The CRM context panel shows only information the viewer is permitted to
see under Section 2.3. **Open Customer** is offered only where the
viewer may open that record.

Where a supervisory user is replying to a conversation they can see but
whose linked record they may not open, the panel must say so plainly
rather than exposing the record's details.

The screen should make clear whether the viewer is the conversation
owner or is acting in a supervisory capacity, so that replying is never
mistaken for taking ownership.

Where the conversation is unassigned, the screen is read-only: no
composer and no send action are shown, and the screen states that the
conversation must be assigned to a Team Lead before it can be answered.
See Sections 93.1 and 96.


**93. Conversation Assignment**

A WhatsApp conversation uses **Assigned To**.

It does not use Record Owner.

**A conversation may be assigned only to a Team Lead or a Salesperson.**
Admins and Managers can never be the assignee of a conversation, by any
route — automatic inheritance, manual assignment, reassignment or reply.

When the first conversation is created for an existing Lead or Customer:

> • if the record has a Record Owner, the conversation initially
> inherits that user as **Assigned To**
>
> • if no suitable user can be assigned, the conversation remains
> **Unassigned**

Example:

**Customer Record Owner: Arun**

↓

**New WhatsApp Conversation Assigned To: Arun**

**Reassignment scope**

An authorized user may reassign a conversation only within their
permitted scope:

> • a **Team Lead** may reassign only within their own team
>
> • a **Manager** may reassign only within their own reporting
> hierarchy, and may not move a conversation into another Manager's
> hierarchy
>
> • an **Admin** may reassign anywhere in the organization
>
> • whether a **Salesperson** may reassign a conversation is *pending
> client confirmation before security implementation and UAT*

Example:

**Conversation Assigned To: Sneha**

This does **not** change:

**Customer Record Owner: Arun**

**Separate facts**

The following are distinct and must be recorded and displayed
separately:

> • **conversation owner** — the Team Lead or Salesperson in Assigned To
>
> • **replied by** — the user who sent a particular message
>
> • **assigned by** — the user who performed an assignment
>
> • **reassigned by** — the user who performed a reassignment

**Assignment must precede any reply**

A conversation that is unassigned cannot be replied to by anyone. An
Admin or Manager must assign it to a Team Lead first. See Section 93.1.

An Admin or Manager may assign or reassign a conversation, and may reply
to an **assigned** conversation within their permitted scope,
**without becoming its owner**. Replying never claims a conversation,
and the first reply after an assignment does not change ownership.

A supervisory action on a conversation does not change the Record Owner
of the linked Lead or Customer. Changing that ownership is a separate,
separately authorized action.

Every conversation assignment and reassignment is recorded in
activity/history, identifying who performed it, and is auditable.

## 93.1 Unassigned Conversation Workflow

A conversation is **Unassigned** when no Team Lead or Salesperson holds
it — typically because the sender could not be confidently matched to a
permitted CRM record.

**Assignment precedes any reply**

An unassigned conversation **cannot be replied to by anyone**. The reply
composer and every send action are unavailable while the conversation is
unassigned. This applies to Admins and Managers as well, even though
they are the only roles who can see it.

To respond, the conversation must first be assigned to a Team Lead. Only
then does reply access follow the ordinary hierarchy in Section 89.1.

**Admin**

> • can open and read any unassigned conversation
>
> • cannot reply while it remains unassigned
>
> • can assign it to **any active Team Lead** in the organization
>
> • does not become its owner by assigning it

**Manager**

> • can open and read any unassigned conversation, organization-wide
>
> • cannot reply while it remains unassigned
>
> • can assign it **only to an active Team Lead who reports to that**
> **Manager**
>
> • cannot assign it into another Manager's hierarchy
>
> • does not become its owner by assigning it

**Team Lead and Salesperson**

> • cannot see or act on an unassigned conversation
>
> • gain access only once it has been assigned into their permitted team
> scope

**After assignment**

Once assigned, ordinary visibility and reply access resume:

> • **Admin** may reply organization-wide.
>
> • **Manager** may reply only if the assigned conversation is within
> that Manager's reporting hierarchy.
>
> • **Team Lead** may reply to their own and their team's conversations.
>
> • **Salesperson** may reply to conversations assigned to them.

A Manager who could previously see the conversation only because it sat
in the shared unassigned queue must **not** retain visibility once it
belongs below a different Manager, and gains no reply access to it.
Because a Manager can only ever assign to a Team Lead reporting to them,
a Manager cannot route a conversation outside their own hierarchy and
then continue to act on it. Admin retains organization-wide visibility.

Where the conversation could not be matched to any CRM record, the Admin
or Manager assigns it by creating a Lead and selecting an active Team
Lead, as defined in Section 101. That selection assigns both the new Lead
and this conversation directly to the selected Team Lead.

Assignment does not make the assigning Admin or Manager the owner, and
the first reply after assignment does not change ownership. The owner
remains the assigned Team Lead or Salesperson.

**Not decided**

These questions are collected in the consolidated register in
Section 212.

> • Who is operationally responsible for the unassigned queue, and the
> expected response time. *Pending client confirmation.*
>
> • V1 does not automatically assign unassigned conversations. Automatic
> assignment of the unassigned queue is not approved and must not be
> introduced.

**94. Conversation Status**

V1 uses:

> **• Open**
>
> **• Closed**

**Open**

The conversation is active or may require attention.

**Closed**

No immediate messaging action is required.

Available actions:

**Close Conversation**

**Reopen Conversation**

A new incoming message to a Closed conversation automatically:

> • reopens the same conversation
>
> • marks it unread
>
> • retains its previous message history

Closing a conversation does not:

> • change Lead stage
>
> • change Customer status
>
> • complete a Follow-up
>
> • complete a Renewal
>
> • change Record Owner

WhatsApp conversations are **not permanently deleted through normal V1
CRM actions**.

**95. Starting an Individual WhatsApp Message**

Authorized users may initiate WhatsApp messaging from:

> • Lead Detail
>
> • Customer Profile
>
> • WhatsApp Inbox
>
> • Customer Purchase Detail
>
> • Renewals & Reminders where applicable

A user may start or reply to a message only where **both** conditions
hold:

> 1. their fixed role permits the action; and
>
> 2. the Lead, Customer, Customer Purchase or conversation falls within
> their hierarchy scope under Section 89.1.

Selecting **WhatsApp** should:

> • identify the CRM record's phone number
>
> • open the existing WhatsApp conversation for that number if one
> exists and the user is permitted to see it
>
> • otherwise create/open the messaging conversation for that number

The system should not create duplicate conversations for the same
contact phone number.

Where a conversation already exists but is outside the user's permitted
scope, the interface must not open it, and must not disclose its
existence, its assignee or its team. It explains that the contact is
handled elsewhere and allows escalation to an authorized supervisor.

If the record has no valid phone number:

**WhatsApp unavailable — no valid phone number**

Starting a conversation does not change the Record Owner of the related
record.


**96. Message Composer**

The available composer depends on whether the conversation is assigned
and on the messaging state allowed by the connected WhatsApp platform.

**When the conversation is unassigned**

No composer is shown and no send action is available, for any role. The
screen is read-only and explains what is required:

**This conversation is unassigned.**

**Assign it to a Team Lead before replying.**

Admins and Managers see the relevant assign action alongside this
message; Team Leads and Salespersons never see an unassigned
conversation at all. See Section 93.1.

Hiding the composer is not sufficient on its own. The send endpoint must
also reject a message on an unassigned conversation, as required by
Section 104.

**When normal reply/free-form messaging is allowed**

Display:

**\[ Type a message... \]**

**\[ Send \]**

**When an approved/eligible template is required**

Do not display an unrestricted composer as though a normal message can
be sent.

Display:

**Select Template**

Example:

**Renewal Reminder ▼**

Preview the populated message.

**\[ Send \]**

The CRM should use the messaging eligibility/state returned by the
WhatsApp integration rather than asking users to understand WhatsApp
platform rules themselves.

**97. WhatsApp Templates**

Admin manages the CRM's available WhatsApp templates and their use
within the CRM.

The template screen should display the relevant templates available
through the connected WhatsApp integration.

Example:

**Template**

**Purpose**

**Language**

**Status**

Renewal Reminder

Renewal

English

Approved

Follow-up Reminder

Follow-up

English

Approved

Policy Document Shared

Service

English

Pending

Offer Message

Marketing

English

Rejected

Relevant states may include:

> • Approved
>
> • Pending
>
> • Rejected
>
> • Unavailable

Only templates currently approved and eligible for sending may be
selected by normal users. An inactive, pending, rejected or unavailable
template must not be selectable, and the interface must explain why
rather than failing after the send attempt.

The CRM should not recreate the entire WhatsApp platform administration
interface.

Where template creation, approval or platform-level editing must occur
through the connected WhatsApp provider/platform, the CRM should direct
the administrator appropriately rather than pretending the action
occurred locally.

Template management is configurable business data. Managing templates
does not change any role's visibility, ownership or authorization, and
must never be presented as a permission setting. See Section 2.6.


**98. Template Variables**

Templates may use supported CRM values.

Example:

**Hello {{customer_name}},**

**Your {{plan_name}} policy with {{provider_name}} is due for renewal on
{{renewal_date}}.**

**Please reply if you would like assistance.**

Before sending:

**Hello Ramesh,**

**Your Family Health Optima policy with Star Health is due for renewal
on 26 September 2026.**

**Please reply if you would like assistance.**

**Available variables**

> • Customer Name
>
> • Lead Name, where applicable
>
> • Product Category
>
> • Provider
>
> • Plan / Sub-product
>
> • Policy or Reference Number
>
> • Renewal Date
>
> • Record Owner Name
>
> • Team Lead Name, where appropriate
>
> • A&S Fincare business name
>
> • A&S Fincare contact details

Variables resolve only from the recipient's own record. A template must
never be able to pull data from a record outside the sending user's
permitted scope.

**Not permitted as variables**

> • the contents of a policy document
>
> • authentication data, tokens or credentials
>
> • internal identifiers that would expose other records
>
> • Closed Amount, incentive figures or other internal performance data

Before manual or bulk sending, the system should resolve required
variables.

If a required value is missing:

> • identify the missing value
>
> • prevent that recipient's message from being sent until resolved

A preview should show the final populated message.


**99. Incoming WhatsApp Message**

When an incoming message is received:

> • identify the sender's phone number
>
> • find the existing conversation for that number
>
> • attempt to associate it with an existing Customer or Lead using
> server-side logic
>
> • add the message to the conversation
>
> • mark the conversation unread
>
> • reopen it if previously Closed
>
> • notify the Assigned To user where applicable

**Determining Assigned To**

Matching and assignment are performed by authorized server-side logic
over all CRM records, independently of who happens to be viewing. This
is what allows a message to reach its correct owner.

If the conversation has no Assigned To user but is confidently
associated with a CRM record that has a Record Owner, the conversation
inherits that Record Owner as **Assigned To**. That owner is always a
Team Lead or Salesperson.

If no assignment can be determined, the conversation remains
**Unassigned** and enters the unassigned queue visible to all Admins and
Managers. While it is unassigned it can be read but **not replied to**
by anyone, including an Admin or Manager. See Section 93.1.

A conversation may never be assigned to an Admin or a Manager, including
automatically. See Section 93.


**100. Matching Incoming Numbers to CRM Records**

Incoming phone numbers should be matched against Leads and Customers.

Matching priority:

> • an already-linked CRM record
>
> • a Customer created through conversion from a linked Lead
>
> • a unique Customer match
>
> • a unique active Lead match

A converted Lead and its resulting linked Customer should **not be
treated as two conflicting matches**.

The Customer becomes the primary active CRM record while the Lead
remains historical.

**101. Message From Unknown Number**

If no matching Lead or Customer can be confidently resolved, the
conversation remains **Unassigned** and appears in the unassigned queue.

The unassigned queue is visible to **all Admins and all Managers**. Team
Leads and Salespersons cannot see it. See Sections 89.1 and 93.1.

Example:

**Unknown Contact**

**98765 43210**

> Hi, I would like to know about your services.

An Admin or Manager may open and read the conversation, but **cannot
reply to it while it is unassigned**. The reply composer and send
actions are unavailable. To respond, the conversation must first be
assigned to a Team Lead, which for an unknown contact is done by
creating a Lead as described below.

Actions:

**Create Lead**

**Link to Existing Record**

**Creating a Lead from an unknown conversation**

The acting user must first select an active **Team Lead**:

> • an **Admin** may select any active Team Lead in the organization
>
> • a **Manager** may select only an active Team Lead who reports to
> that Manager

Selecting the Team Lead identifies both the destination team and the
initial operational owner.

The flow is then:

> 1. The Lead is created with the phone number prefilled.
>
> 2. **The selected Team Lead becomes the Lead's Record Owner.**
>
> 3. **The existing WhatsApp conversation is assigned to that same
> selected Team Lead.**
>
> 4. The complete conversation history is preserved. Creating the Lead
> must **not** start a new conversation thread.
>
> 5. Only after this direct assignment may authorized users reply,
> following Section 89.1.

**A deliberate exception to automatic Lead round robin**

A Lead created from an unknown WhatsApp conversation is assigned
**directly** to the selected Team Lead. It does **not** enter that team's
round-robin pool at this point.

Round robin continues to apply to the ordinary Lead-assignment paths
defined elsewhere in this specification, including authorized manual Lead
creation and bulk import. Those paths remain team-scoped, with a pool
containing the team's active Team Lead and active Salespersons who are
not paused from round robin. See Sections 189 and 189.1.

Because this is a direct assignment rather than a rotation, round-robin
pause status does not affect it: the selected Team Lead must be active,
but may be paused from round robin.

The selected Team Lead may subsequently reassign the Lead or the
conversation within their own team, subject to the fixed permission rules
in Section 2.

The Admin or Manager who performed the action does **not** become the
owner of the Lead or of the conversation. The activity history records
who created the Lead and who selected the Team Lead. The direct
assignment and any later reassignment are auditable. See Section 208.

**If no eligible active Team Lead is available**

If the acting user's permitted scope contains no eligible active Team
Lead, assignment must fail safely:

> • the Lead must not be assigned to an Admin or a Manager
>
> • the conversation remains Unassigned and is preserved with its
> history
>
> • because the conversation is still unassigned, **it still cannot be
> replied to by anyone**, including the Admin or Manager who is looking
> at it
>
> • the problem is surfaced to an authorized supervisor rather than
> silently ignored

The final escalation behaviour in this case is *pending client
confirmation*.

**Operational responsibility**

Who is operationally responsible for working the unassigned queue, and
within what response expectation, is *pending client confirmation*. This
specification does not claim that Admin personally handles every
unassigned conversation, and V1 does not automatically assign unassigned
conversations.


**102. Multiple CRM Record Match**

If a phone number genuinely matches multiple unrelated active CRM
records, the system must not silently select one.

Show:

**Multiple CRM records use this phone number.**

Display matching records.

Authorized user action:

**Link Conversation**

Until resolved:

> • retain the conversation
>
> • keep the messages accessible
>
> • do not incorrectly add message activity to one of the possible CRM
> records

**103. Link / Correct Conversation Association**

An authorized user may link an unknown or unresolved conversation to an
existing:

> • Lead
>
> • Customer

Action:

**Link to CRM Record**

Search by:

> • name
>
> • phone
>
> • email

**Scope of the search**

The search returns only records within the acting user's permitted scope
under Section 2.3. A Manager or Team Lead must not be offered, and must
not be able to discover, a record belonging to a peer hierarchy — not
through search results, counts, autocomplete or an error message
stating that a record exists elsewhere.

Where a conversation genuinely belongs to a record outside the acting
user's scope, the interface says that it cannot be resolved at this
level and allows escalation to an authorized supervisor, without
revealing the record, its owner or its team.

If a conversation is associated with the wrong CRM record, an authorized
user may correct the association within the same scope rules.

Correcting the CRM association:

> • does not delete the WhatsApp messages
>
> • does not create a new conversation
>
> • updates where future conversation activity is displayed

**Linking is not ownership**

Linking or relinking a conversation does not make the acting user the
conversation owner or the record's Record Owner. After linking, the
conversation's Assigned To follows the linked record's Record Owner, as
described in Section 99.

The change is recorded in history and is auditable, identifying who
performed it.


**104. Sending a Message**

Before sending any outgoing message, the system should verify:

> • the conversation is assigned to a Team Lead or Salesperson
>
> • WhatsApp is connected
>
> • the user has messaging permission
>
> • the contact has a valid phone number
>
> • messaging is currently eligible
>
> • an eligible template is selected where required
>
> • required template variables are available

An unassigned conversation fails the first check. No user may send a
message on it, including an Admin or a Manager. The conversation must
first be assigned to a Team Lead, as defined in Section 93.1.

If a condition fails, display the reason before or after the send
attempt as appropriate.

The system must not show an unsuccessful message as successfully sent.

**105. Message Status**

Outgoing messages should display the delivery status available from the
WhatsApp integration.

Possible states:

> • Sending
>
> • Sent
>
> • Delivered
>
> • Read — where available
>
> • Failed

Example:

**10:15 AM · Delivered**

If a message fails:

> • mark it Failed
>
> • display a useful reason where available
>
> • allow retry where appropriate
>
> • retain the failed attempt in message history

Retrying should create a new send attempt rather than rewriting the
historical failed attempt as successful.

**106. WhatsApp Message History in CRM Records**

Messages associated with a Lead or Customer should contribute to its
Activity Timeline.

The CRM timeline does not need to reproduce every message bubble.

Example:

**Today · 10:15 AM**

**WhatsApp renewal reminder sent**

Family Health Optima · Star Health

Selecting the activity may open the corresponding WhatsApp conversation,
subject to the viewer's permitted scope under Section 89.1.

The complete message thread remains available in the WhatsApp module.

Incoming messages that represent meaningful CRM activity may also appear
in the Customer/Lead timeline without duplicating the full conversation.

Message history follows the visibility of the related record. A
timeline entry showing that a supervisor replied identifies who replied;
it does not make that supervisor the owner of the record or the
conversation.


**107. Create Follow-up From Conversation**

From a linked WhatsApp conversation:

**+ Add Follow-up**

The related Lead or Customer is automatically selected.

The normal Follow-up form opens with:

> • Related To
>
> • Follow-up Type
>
> • Date
>
> • Time
>
> • Assigned To
>
> • Note

The Follow-up's **Assigned To** may differ from the conversation's
Assigned To, but must be a Team Lead or Salesperson within the acting
user's permitted scope under Section 2.3.

Creating a Follow-up does not:

> • automatically close the conversation
>
> • automatically send a WhatsApp message
>
> • change the CRM Record Owner
>
> • change the conversation's Assigned To
>
> • make the acting user the owner of the conversation or record


**108. Scheduled WhatsApp Renewal Reminder**

A scheduled WhatsApp renewal reminder relates to a **Customer Purchase**
with a Renewal Date. It is different from a normal WhatsApp Follow-up.
Automatic renewal reminders are required in V1, as defined in
Section 195.1.

When a configured renewal reminder reaches its scheduled send time, the
system attempts to send the relevant WhatsApp message automatically.

Before sending, verify:

> • the Customer and Customer Purchase still exist and are eligible
>
> • the Customer has a valid phone number
>
> • the WhatsApp connection is active
>
> • the message is eligible to be sent under Meta rules
>
> • an eligible approved template exists where required
>
> • the Customer is not marked WhatsApp Opted Out
>
> • required variables can be populated, including Provider,
> Plan/Sub-product, Policy Number and Renewal Date
>
> • the reminder instance has not already been sent

If successful:

> • send the message
>
> • add it to the existing WhatsApp conversation
>
> • mark that reminder instance **Sent**
>
> • record it in Customer Activity
>
> • retain it in the Customer Purchase's reminder history

If unsuccessful:

> • do not silently skip it
>
> • mark that reminder instance **Failed**
>
> • record the available reason
>
> • surface the failure to the responsible owner

A reminder that cannot be attempted at all — for example because the
Customer has opted out, or no approved template is available — is
recorded as **Skipped** with a safe reason. It is never recorded as
sent.

A failed reminder does not automatically become Sent later unless a
successful retry/send occurs. Retries and repeated background jobs must
not produce a duplicate successful send for the same reminder instance.

Exact schedules, template content, escalation rules and channel
precedence between WhatsApp and Email remain *pending client
confirmation*.


**109. Manual Renewal Reminder**

From Renewals & Reminders, an authorized user may select:

**Send WhatsApp Reminder**

This is an immediate manual send action.

It uses the same eligibility, template and validation rules as other
WhatsApp messages.

It is different from scheduling a future reminder.

Successful manual reminders should be recorded in:

> • WhatsApp Conversation
>
> • Customer Activity
>
> • the Customer Purchase's reminder history

**110. Controlled Bulk WhatsApp Messaging**

Authorized users may send the same eligible template message to multiple
selected CRM records.

Bulk messaging may be initiated from permitted views such as:

> • Leads
>
> • Customers
>
> • Renewals & Reminders

The action is:

**Send WhatsApp Message**

**Selection scope**

Selection is limited to records within the sender's hierarchy scope
under Section 2.3. A user can never select, count, preview or message a
record outside that scope.

Selected totals, eligibility counts, exclusion counts and exclusion
reasons must be computed only over records in scope, so that no figure,
filter or validation result lets a user infer the existence, size or
activity of a peer branch or team.

**Meta rules continue to apply**

Bulk messaging is selection-based messaging, not a marketing campaign
builder. Approved templates are required wherever Meta rules require
them, and messaging eligibility, consent and opt-out are enforced per
recipient. The CRM must never attempt to bypass WhatsApp platform
restrictions.

**Outcomes**

Each recipient's outcome is recorded individually. A retry must
reattempt only the recipients that failed; recipients already sent
successfully must never be sent again by a retry. A failed or excluded
recipient must never be reported as sent.

Bulk activity is auditable, including who initiated it, the template
used, the recipients attempted and each outcome.

It does not include:

> • audience campaign management
>
> • automated journeys
>
> • A/B testing
>
> • campaign analytics
>
> • complex segmentation

**Pending**

These questions are collected in the consolidated register in
Section 212.

Which roles may initiate controlled bulk WhatsApp messaging is *pending
client confirmation before security implementation and UAT*. It must not
be assumed for any supervisory or operational role.


**111. Bulk Recipient Validation**

Before bulk sending, each selected record should be checked
individually.

Possible exclusions include:

> • missing phone number
>
> • invalid phone number
>
> • duplicate phone number within the selected batch
>
> • messaging unavailable
>
> • opt-out/restriction
>
> • missing required template variable
>
> • insufficient user permission

Where multiple selected records use the same destination phone number,
V1 should send only one copy of that bulk message to that number unless
the records intentionally represent distinct eligible messages such as
separate renewal items.

**112. Bulk Message Review**

Before sending:

**Send WhatsApp Message**

**Selected Records: 42**

**Eligible: 37**

**Excluded: 5**

**Template**

**Renewal Reminder ▼**

**\[ Preview \]**

**\[ Review Excluded \]**

**\[ Send to 37 \]**

**\[ Cancel \]**

The review should show:

> • number selected
>
> • number eligible
>
> • number excluded
>
> • selected template
>
> • message preview
>
> • reason for excluded records

Bulk send requires explicit confirmation.

Excluded recipients do not prevent eligible recipients from being
processed.

**113. Bulk Message Result**

After processing:

**Bulk Message Complete**

**Selected: 42**

**Sent: 35**

**Failed: 2**

**Excluded: 5**

**\[ View Failed \]**

**\[ View Excluded \]**

**\[ Done \]**

Definitions:

**Sent  
** The send request succeeded.

**Failed  
** The CRM attempted to send, but the message was unsuccessful.

**Excluded  
** The CRM did not attempt to send because validation/eligibility failed
before sending.

The user should be able to identify the affected records.

V1 does not require campaign analytics beyond operational send results.

**114. Messaging Eligibility / Opt-Out**

The CRM must respect messaging eligibility or customer communication
restrictions available through the WhatsApp integration and CRM
configuration.

Where outbound messaging should not occur, clearly show an applicable
state such as:

**WhatsApp messaging unavailable**

or

**Customer opted out**

Such recipients must be excluded from applicable bulk or automated
outbound messaging.

Authorized users can mark a Lead or Customer as **WhatsApp Opted Out**
from the relevant record/contact communication settings. The state may
also be updated from the WhatsApp integration where supported.

The CRM should never attempt to bypass WhatsApp platform restrictions.

**115. WhatsApp Not Connected**

If A&S Fincare has not connected WhatsApp:

**Admin view**

**WhatsApp isn't connected yet.**

Connect the A&S Fincare WhatsApp account to send and receive customer
messages from the CRM.

**\[ Connect WhatsApp \]**

**Other users**

**WhatsApp is not connected. Contact your administrator.**

WhatsApp actions elsewhere in the CRM should display a
disabled/not-connected state.

A missing connection is a configuration state. It must not block normal
CRM functionality, and it must never cause an unsent message or reminder
to be recorded as sent.


**116. WhatsApp Connection Problem**

If an existing WhatsApp connection becomes unavailable or requires
administrator attention:

**WhatsApp connection needs attention.**

Messages cannot currently be sent or received through the CRM.

Authorized users:

**\[ Review Connection \]**

Existing conversation history remains accessible.

Unrelated CRM functionality remains available.

The CRM should clearly distinguish:

> • never connected
>
> • temporarily disconnected/connection problem

**117. WhatsApp Notifications**

Relevant notifications may include:

> • new WhatsApp reply on a conversation you are assigned
>
> • conversation assigned to you
>
> • WhatsApp message failed
>
> • scheduled reminder failed
>
> • bulk send completed
>
> • bulk send partially failed

Selecting the notification opens the relevant:

> • conversation
>
> • Customer/Lead
>
> • renewal/reminder
>
> • bulk-send result

**Scope**

Notifications follow the visibility rules in Section 89.1. A
notification must never reveal a conversation, message content, customer
name, phone number or record outside the recipient's permitted scope —
including in its title, preview text or badge count. Unread counts are
scoped the same way.

Unassigned-queue notifications, where used, go only to Admins and
Managers. Opening one leads to a view-only conversation with no reply
composer, because a conversation cannot be replied to until it has been
assigned to a Team Lead. See Section 93.1.

**Reauthorization on open**

Opening a notification must reauthorize access on the server. If the
user's access changed after the notification was created — for example
the conversation was reassigned into another team, or the user's role or
team changed — the destination must deny access safely and explain that
the item is no longer available, without disclosing where it went, who
now holds it or what it contained.

Do not generate a user notification for every successful outgoing
message.


**118. WhatsApp Permission Behaviour**

WhatsApp actions follow the fixed role behaviour defined in Section 2
and the visibility matrix in Section 89.1. Role capabilities are not
configurable in the CRM.

Two conditions must both hold before any WhatsApp action:

> 1. the user's fixed role permits the action; and
>
> 2. the conversation, Lead or Customer falls within the user's
> hierarchy scope.

Confirmed behaviour:

> • Viewing and replying follow the matrix in Section 89.1.
>
> • Assignment and reassignment follow Sections 93 and 93.1.
>
> • A conversation may be assigned only to a Team Lead or Salesperson.
>
> • **No user may reply to a conversation while it is unassigned.** The
> reply composer and send actions are unavailable until the conversation
> has been assigned to a Team Lead. This applies to Admin and Manager
> too, even though they can see the unassigned queue.
>
> • Admin and Manager may assign and reassign, and may reply to an
> **assigned** conversation within their permitted scope, without
> becoming the conversation owner.

Permissions also distinguish between:

> • closing/reopening conversations
>
> • sending bulk messages
>
> • configuring WhatsApp
>
> • viewing/managing templates

Users should not be shown actions they cannot perform, but hiding a tab,
button or conversation is presentation only. Every read, reply, link,
assign and reassign action must be authorized on the server.

**Pending**

> • Whether a Salesperson may reassign a conversation. *Pending client
> confirmation before security implementation and UAT.*
>
> • Which roles may initiate controlled bulk WhatsApp messaging.
> *Pending client confirmation before security implementation and UAT.*
>
> • Who is operationally responsible for the unassigned queue, and
> within what response expectation. *Pending client confirmation.*

These are listed in Sections 188 and 212. They must not be assumed, and
they are not settings an Admin can configure.


**119. WhatsApp Inbox — Empty States**

**No conversations**

**No WhatsApp conversations yet.**

Messages will appear here once you start communicating with customers or
receive a reply.

**Mine — no assigned conversations**

**No conversations assigned to you.**

**Unassigned — none**

**No unassigned conversations.**

Avoid displaying an empty table without explanation.

**120. WhatsApp Inbox — Loading / Error States**

**Loading**

Use conversation/message skeleton states.

**Conversation loading failure**

**Unable to load this conversation.**

**\[ Try Again \]**

**Inbox failure**

**Unable to load WhatsApp conversations.**

**\[ Try Again \]**

**Send failure**

Keep the typed message/content available where possible and clearly show
that sending failed.

Do not discard the user's unsent text solely because the send failed.

**121. WhatsApp Inbox — Mobile Behaviour**

WhatsApp is a primary operational mobile area for Team Leads and
Salespersons.

**Inbox**

Use a vertical conversation list showing:

> • name/phone
>
> • latest message
>
> • time
>
> • unread state
>
> • Assigned To

The mobile inbox shows exactly the conversations the user's role and
hierarchy scope permit under Section 89.1. A Team Lead or Salesperson
has no Unassigned tab on mobile, because they have no unassigned
visibility at all. Unread counts and the conversation list are scoped
identically to desktop.

**Conversation**

The message thread occupies the main screen.

Lead/Customer context should be available through a compact header or
secondary panel/action rather than permanently taking excessive space.

Useful actions:

**Call \| Open Record \| Follow-up \| More**

**Call** follows the click-to-call behaviour defined in Sections
29–33. It opens the phone's native calling interface and does
not by itself complete a Follow-up or create a Call activity.

The message composer should remain easily accessible near the bottom of
the screen.

Conversation assignment/status controls may be available through
**More**.

**What mobile must not hide**

A narrow screen may condense these, but must never omit them:

> • who the conversation is assigned to
>
> • whether the conversation is unassigned
>
> • message delivery status, including Failed
>
> • the reason a message could not be sent
>
> • opt-out state
>
> • whether a template is required because the reply window has closed

Mobile enforces the same server-side authorization as desktop.
Installing the CRM as a PWA does not widen access and does not cache
conversation content beyond the rules in Section 210.1.


**122. WhatsApp Flow Summary**

**Incoming Message**

**Incoming WhatsApp Message**

↓

**Find Existing Conversation**

↓

**Match CRM Record — server-side**

**│**

**├── Confident Single Match**

│ ↓

**│ Link / Retain Link**

│ ↓

**│ Assigned To = record's Record Owner**

**│ (Team Lead or Salesperson)**

│ ↓

**│ Mark Unread**

│ ↓

**│ Notify the Assigned owner**

│ ↓

**│ Reply / Follow-up / CRM Action**

**│**

**└── No Confident Match**

↓

**Unassigned Conversation**

↓

**Visible to all Admins and all Managers**

**Not visible to Team Leads or Salespersons**

↓

**Admin or Manager reviews — view only**

**No reply is possible while the conversation is unassigned**

↓

**Create Lead**

**│**

**├── Admin selects any active Team Lead**

**└── Manager selects an active Team Lead reporting to them**

↓

**Eligible active Team Lead available in scope?**

**│**

**├── No**

│ ↓

**│ Conversation stays Unassigned**

**│ Still no reply possible**

**│ Surface to an authorized supervisor**

**│**

**└── Yes**

↓

**Selected Team Lead identifies the destination team**

**and becomes the initial operational owner**

↓

**Lead created — Record Owner = selected Team Lead**

↓

**Conversation assigned to the same Team Lead**

**(full history preserved, no new thread)**

↓

**Reply now permitted, per Section 89.1**

**(direct assignment, not round robin;**

**the assigning Admin or Manager does not become owner)**

**Scheduled Renewal Reminder**

**Reminder Send Time Reached**

↓

**Validate Customer Purchase + WhatsApp**

↓

**Validate Template / Variables / Opt-Out**

↓

**Eligible?**

**│**

**├── No**

│ ↓

**│ Failed or Skipped, with reason**

│ ↓

**│ Surface to the responsible owner**

**│**

**└── Yes**

↓

**Send**

↓

**Sent Successfully?**

**│**

**├── Yes**

│ ↓

**│ Reminder = Sent**

**│ Conversation History**

**│ Customer Activity**

**│ Customer Purchase reminder history**

**│**

**└── No**

↓

**Failed**

↓

**Surface / Retry — no duplicate successful send**

**Responsibility Rule**

**Lead / Customer**

**Record Owner: Arun (Team Lead or Salesperson)**

↓

**WhatsApp Conversation**

**Assigned To: Sneha (Team Lead or Salesperson)**

Changing Assigned To on the WhatsApp conversation does not change the
Lead or Customer Record Owner.

An Admin or Manager who replies to, assigns or reassigns a conversation
never becomes its owner, and never becomes the Record Owner of the
linked Lead or Customer.


**123. Email Communications**

The Email module allows authorized users to send business emails from
A&S Fincare Lead, Customer, Customer Purchase and Renewal records.

Email is an outbound communication channel and is a **required
functional area of V1**. It is not an optional module and cannot be
switched off. Whether email can currently be *sent* depends on
configuration — a verified sender and a working provider — which is a
configuration state, not a module toggle.

V1 supports:

- sending an individual email from a Lead
- sending an individual email from a Customer
- sending an individual email relating to a Customer Purchase
- sending a renewal reminder email
- scheduled renewal reminder emails
- controlled bulk renewal reminder emails
- reusable email templates
- template variables populated from CRM data
- policy-document and file attachments
- email activity history on the related CRM record
- delivery and failure status where available
- email communication preferences and opt-out handling

V1 does not include:

- a shared inbound email inbox
- Gmail or Outlook mailbox synchronization
- email thread synchronization from external mailboxes
- reading incoming replies inside the CRM
- automatic association of incoming emails
- email conversation assignment
- marketing campaign management or a marketing automation platform
- unrestricted mass email campaigns
- automated sales sequences
- audience segmentation
- A/B testing
- email open or click tracking
- a complex drag-and-drop email designer

Replies are delivered to the configured Reply-To address outside the
CRM. They are not synchronized back into the CRM in V1.

All Email behaviour is subject to the reporting hierarchy in Section 2.3
and the fixed role behaviour in Section 2. Sending an email never
changes who owns a record.


**124. Email Entry Points**

Authorized users may initiate an individual email from:

- Lead Header
- Lead Detail
- Customer Header
- Customer Profile
- Customer Activity
- Customer Purchase Detail
- Renewals & Reminders

Available actions may include:

**Send Email**

**Send Email Reminder**

Email actions should appear only when:

- the related record is within the user's hierarchy scope under
  Section 2.3
- the user's fixed role permits the action
- a verified A&S Fincare sender is configured
- the related record contains a valid email address
- the recipient is eligible to receive email

Selecting an email address from a Lead or Customer record should open the
CRM email composer rather than exposing configuration details.

Hiding an entry point is presentation only. The server must authorize the
action when it is attempted.


**125. A&S Fincare Email Sender**

V1 uses one active email sender identity for A&S Fincare. There is no
per-team, per-Manager or per-user sender.

The sender configuration contains:

- Sender Name
- Sender Email Address
- Sending Domain
- Reply-To Address
- Verification Status

Possible verification states:

- Not Configured
- Verification Required
- Verified
- Configuration Problem

Outbound email must be sent through the server-side email service. Email
provider credentials and secrets must never be exposed to the browser,
displayed in the interface, written to client-side storage or included
in exported data.

If the sender is not verified, normal email actions are disabled and the
user sees a clear explanation.

Admin:

**Email sending is not configured. Configure and verify a sender before
sending email.**

Other users:

**Email is not available yet. Contact your administrator.**

An unverified sender, or a temporarily unavailable provider, is a
**configuration state**, not a disabled module. Email remains part of
V1. Such a state must not block unrelated CRM functionality, and must
never cause an unsent email to be recorded as sent.

A single shared sender does not widen visibility. Who may send, and
which records they may send about, is determined by Section 2.3 and the
fixed role behaviour in Section 2.


**126. Email Composer**

Selecting **Send Email** opens the email composer.

Show:

- From — the configured A&S Fincare sender, read-only
- Reply-To — the configured Reply-To address, read-only
- To — prefilled from the Lead or Customer
- Template — optional
- Subject — required
- Message — required
- Attachments — optional
- Related Record — read-only, identifying the Lead, Customer or Customer
  Purchase
- Send
- Cancel

The recipient may be changed only to another permitted email address
stored on the same CRM record. V1 does not require arbitrary recipient
entry, CC or BCC.

The message editor may support basic formatting:

- paragraphs
- bold
- italic
- lists
- links

V1 does not require arbitrary HTML editing or a visual email-page
builder.

Before sending, the user should be able to review the recipient, subject,
message and attachments.

If the composer is closed with unsent changes, warn the user before
discarding the content.


**127. Email Templates**

Admin can create reusable Email templates.

Template fields:

- Template Name
- Purpose
- Subject
- Message
- Available Variables
- Status

Example purposes:

- Lead Follow-up
- Customer Follow-up
- Plan or Policy Information
- Policy Document Sharing
- Renewal Reminder
- General Communication

Template statuses:

- Active
- Inactive

Actions:

- Add
- Edit
- Preview
- Duplicate
- Deactivate
- Reactivate

Deactivating a template prevents future selection but does not remove it
from historical email activity.

Templates belong to A&S Fincare and are shared across the organization.
A template does not carry hierarchy scope of its own: what a user may
send, and to whom, is determined by their role and the record's scope,
not by the template.

Email templates are configurable business data. Managing them does not
change any role's visibility, ownership or authorization. See
Section 2.6.

V1 does not require template approval by the email provider.


**128. Email Template Variables**

Email templates may use approved CRM variables.

Available variables:

- Customer Full Name
- Customer First Name
- Lead Full Name, where applicable
- Lead First Name, where applicable
- Product Category
- Provider
- Plan / Sub-product
- Policy or Reference Number
- Renewal Date
- Record Owner Name
- Team Lead Name, where appropriate
- A&S Fincare business name
- A&S Fincare contact details

Variables must resolve only from data the recipient's own record
provides. A template must never be able to pull data from a record
outside the sending user's permitted scope.

**Not permitted as variables**

- the contents of a policy document
- authentication data, tokens or credentials
- internal identifiers that would expose other records
- Closed Amount, incentive figures or other internal performance data

Before sending, the CRM should replace each variable with data from the
related record.

If a required variable cannot be populated:

- do not silently send incomplete template text
- identify the missing variable
- allow the user to correct the record or edit the message
- block automated sending until the required value is available

The preview must show the final resolved subject and message.


**129. Email Attachments**

Authorized users may attach permitted files to an individual email.

Attachments may be:

- uploaded from the user's device
- selected from the policy documents of a Customer Purchase the user is
  permitted to view

**Access rules**

A user may attach a stored policy document only when they are authorized
to view that document under Section 2.3. The attachment picker must list
only documents within the user's permitted scope; it must never reveal
the name, type or existence of a document belonging to a record outside
that scope.

Storage of a document does not by itself make it sendable. Each
attachment selection is authorized server-side at the moment of sending,
not only when the picker is rendered.

V1 covers **policy-related documents**. Personal identity and KYC
documents are outside the V1 policy-document requirement and are not
part of this attachment flow. See Section 205.

Validate attachments before sending. Validation should include:

- permitted file type
- configured file-size limit and provider limits
- safe file name
- successful upload
- file availability
- the sending user's access to the related document

Executable or otherwise prohibited file types must not be accepted.

**Effects**

When an attachment is selected from a Customer Purchase's policy
documents, the original document remains part of that purchase. Emailing
a required policy document does **not** change the purchase's
document-completeness status and does not move it toward or away from
`Closed/Active`. See Section 68.1.

An attachment uploaded while emailing a Lead may be retained with the
email activity entry but does not create a general Lead Documents
module.

Email activity should retain attachment names and references. It must
not expose provider credentials, signed private storage URLs or any
value that would let an unauthorized reader retrieve the file.

Final action-level rules for which roles may attach stored policy
documents are *pending client confirmation before security
implementation and UAT*.


**130. Recipient Validation and Email Preference**

Before sending, validate:

- the related record exists
- the user can access the record under the reporting hierarchy
- the user's fixed role permits the Email action
- the A&S Fincare sender is verified
- the recipient email address is present
- the recipient email address has a valid format
- the recipient is not marked Email Opted Out
- required template variables are available
- attachments are valid, accessible and permitted for that user

Lead and Customer records should support:

**Email Opted Out**

When Email Opted Out is enabled:

- automated email reminders must not be sent
- bulk email must exclude the record
- individual email actions should be disabled
- existing email history must remain visible

An authorized user may update the preference. The change should be
recorded in CRM Activity with the user and date, and is auditable.

The system must not automatically remove an opt-out without an
authorized user action.


**131. Sending an Individual Email**

When the user selects **Send**:

1. Revalidate authentication, hierarchy scope for the related record and
   fixed role behaviour on the server.
2. Revalidate the recipient, opt-out state, template variables and
   attachment access.
3. Create an Email send record linked to the Lead, Customer or Customer
   Purchase.
4. Submit the email through the configured server-side provider.
5. Record the result.
6. Add the activity to the related CRM timeline.

The Send button should prevent accidental repeated submissions while
processing.

A successful send should show:

**Email sent successfully.**

A failed send should show:

**Email could not be sent. Review the error and try again.**

If sending fails:

- retain the composed subject and message where possible
- do not record the email as successfully sent
- store the available failure reason
- allow a permitted user to retry
- do not create duplicate successful sends during retry

Sending an email does not change the Record Owner of the related record.


**132. Email Status**

Possible Email statuses:

- Queued
- Sent
- Delivered
- Failed
- Bounced

Definitions:

**Queued**

The CRM accepted the request and is waiting to submit it to the email
provider.

**Sent**

The email provider accepted the message for delivery.

**Delivered**

The provider confirmed delivery where such confirmation is available.

**Failed**

The CRM or provider could not send the email.

**Bounced**

The provider reported that the recipient address did not accept the
email.

The CRM must not describe an email as Delivered unless the provider has
confirmed delivery.

A Failed or Bounced email must never be displayed, counted or reported
as Sent or Delivered, in any list, total, activity row, notification or
export.

Sent or Delivered does not mean that the recipient opened or read the
email.

V1 does not include open tracking or click tracking.


**133. Email History in CRM Records**

Sent and attempted emails should appear in the related Lead, Customer or
Customer Purchase Activity timeline.

Show:

- Date and Time
- Email Status
- Recipient
- Subject
- Message
- Attachment Names
- Sent By
- Related Customer Purchase, where applicable
- Failure Reason, where applicable

Example:

**Today · 11:30 AM**

**Email sent by Meera**

**Subject: Family Health Optima Renewal**

**To: anjali@example.com**

Selecting the activity opens the permitted email details.

**Visibility**

Email history follows the hierarchy visibility of the related record
under Section 2.3:

- a Salesperson sees Email history for the records assigned to them
- a Team Lead sees their own and their team's permitted records
- a Manager sees records below them in their reporting hierarchy
- Admin sees the organization

Peer Managers and peer Team Leads must not see one another's Email
history. Search results, counts, previews, notifications and exports
obey the same scope. Users must not access email content for records
they are not permitted to view, and this must be enforced server-side.

**Sent By is not ownership**

The **Sent By** user is the person who sent the email. It is a separate
fact from the record's Record Owner. An Admin or Manager appearing as
Sent By does not own the record.

Email activity is historical data and must not be deleted when:

- a template is deactivated
- a user is deactivated
- a Lead, Customer or Customer Purchase is archived


**134. Scheduled Email Renewal Reminder**

Email is a reminder channel for a **Customer Purchase** with a Renewal
Date. Automatic renewal reminders are required in V1, as defined in
Section 195.1.

When the scheduled reminder time is reached, validate:

- the Customer and Customer Purchase still exist and are eligible
- the Customer has a valid email address
- Email Opted Out is not enabled
- the A&S Fincare sender remains verified
- an active Email template is available
- required variables can be populated, including Provider,
  Plan/Sub-product, Policy Number and Renewal Date
- the reminder instance has not already been sent

If successful:

- send the email
- mark the reminder instance Sent
- record the email in Customer Activity
- retain it in the Customer Purchase's reminder history

If unsuccessful:

- do not silently skip the reminder
- mark the reminder instance Failed
- store the available failure reason
- notify the responsible owner
- allow an authorized user to retry or use another permitted action

A reminder that cannot be attempted at all — for example because the
recipient has opted out — is recorded as skipped with a safe reason. It
is never recorded as sent.

The system must prevent the same reminder instance from being sent twice
because of a retry, refresh or repeated background-job execution.

Exact schedules, template content, escalation rules, retry timing and
channel precedence between WhatsApp and Email remain *pending client
confirmation*.


**135. Manual Email Renewal Reminder**

From Renewals & Reminders, an authorized user may select:

**Send Email Reminder**

This is an immediate send action for a Customer Purchase within the
user's permitted scope. It is different from scheduling a future
reminder, and sending one does not cancel or replace a scheduled
reminder.

The recipient, template, variables and attachments should be reviewed
before sending.

A successful manual email reminder should be recorded in:

- Email History
- Customer Activity
- the Customer Purchase's reminder history

A manual email reminder follows the same eligibility, hierarchy scope,
role behaviour and validation rules as other outbound emails. A failed
manual send is recorded as failed with the available reason and is never
presented as successful.


**136. Controlled Bulk Email Reminder**

Authorized users may send the same Email template to multiple selected
renewal records.

Bulk Email in V1 is available only from Renewals & Reminders. It is not
a general marketing campaign feature and does not support unrestricted
mass Email.

**Selection scope**

Selection is limited to Customer Purchases within the sender's hierarchy
scope under Section 2.3. A user can never select, count, preview or send
to a record they cannot otherwise see. Selection totals, eligibility
counts and exclusion reasons must be computed only over records in
scope, so that no figure reveals activity in a peer branch or team.

Before sending, validate each selected record separately.

Possible exclusions include:

- missing email address
- invalid email address
- Email Opted Out
- duplicate recipient for the same renewal
- missing template variable
- inactive template
- unavailable sender configuration
- insufficient user permission

Review screen:

**Send Email Reminder**

**Selected: 24**

**Eligible: 21**

**Excluded: 3**

**Template:**

**Renewal Reminder**

**[Preview]**

**[Review Excluded]**

**[Send to 21 Customers]**

**[Cancel]**

Bulk Email requires explicit confirmation.

Excluded records do not prevent eligible records from being processed.

After processing, show:

**Bulk Email Complete**

**Selected: 24**

**Sent: 19**

**Failed: 2**

**Excluded: 3**

**[View Failed]**

**[View Excluded]**

**[Done]**

The user should be able to identify affected records and the reason for
each failure or exclusion.

**Per-recipient outcome and retry**

Each recipient's outcome is recorded individually. A retry must reattempt
only the recipients that failed; recipients already sent successfully
must never be sent again by a retry. A failed or excluded recipient must
never be reported as sent.

Bulk Email activity is auditable, including who initiated it, the
template used, the recipients attempted and each outcome.

V1 does not include campaign analytics beyond operational send results.

Which roles may initiate controlled bulk Email is *pending client
confirmation before security implementation and UAT*.


**137. Email Permission Behaviour**

Email actions follow the fixed role behaviour defined in Section 2. Role
capabilities are not configurable in the CRM.

Two conditions must both hold before any Email action:

> 1. the user's fixed role permits the action; and
>
> 2. the related Lead, Customer or Customer Purchase falls within the
> user's hierarchy scope under Section 2.3.

Permissions distinguish between:

- sending individual emails
- sending manual renewal emails
- sending controlled bulk renewal emails
- creating and managing Email templates
- configuring the A&S Fincare Email sender

Every server-side email operation must independently enforce:

- authenticated user
- related-record access under the reporting hierarchy
- fixed role behaviour
- recipient eligibility and opt-out state
- attachment access

Hiding an Email button in the user interface is not sufficient
authorization. Composing, previewing an attachment, sending, resending
and viewing Email history must each be authorized on the server.

Sending an Email never transfers ownership of the Lead, Customer or
Customer Purchase. An Admin or Manager who sends an Email within their
permitted scope does not become the record's owner.

**Pending**

Which roles may send individual Email, manual Email renewal reminders
and controlled bulk Email reminders is *pending client confirmation
before security implementation and UAT*, and is listed in Sections 188
and 212. These are fixed application behaviours once confirmed, not
settings an Admin can configure.


**138. Email Empty, Loading and Error States**

**Email sender not configured**

**Email sending is not configured yet.**

This is a configuration state, not a disabled module. The rest of the
CRM remains fully usable.

**Recipient missing**

**This record does not have an email address.**

**Invalid recipient**

**Enter a valid email address before sending.**

**Email opted out**

**Email communication is disabled for this recipient.**

**No active template**

**No active template is available for this reminder.**

**Provider temporarily unavailable**

**Email cannot be sent right now. The message has not been sent.**

**\[ Try Again \]**

A provider outage must never be presented as a successful send, and must
not block unrelated CRM functionality.

**Loading**

Use a clear composer or email-history loading state.

**Send failure**

Keep the user's subject, message and attachment selection where possible
and explain that the email was not sent.

**History failure**

**Unable to load Email history.**

**\[ Try Again \]**

Do not display an empty table without an explanation.

An empty or restricted state must never disclose the existence of Email
activity on records outside the viewer's permitted scope. "No Email
history" means none within that user's scope.


**139. Email Mobile Behaviour**

Mobile users may:

- send an individual email from a permitted Lead, Customer or Customer
  Purchase
- use an Email template
- attach a permitted policy document
- send a manual renewal reminder
- view Email activity on a permitted CRM record

The mobile composer should:

- use a full-width layout
- keep the recipient and subject easy to review
- provide a large Send action
- support the phone's file-selection interface
- retain unsent content when a recoverable error occurs

Mobile enforces exactly the same hierarchy scope and role behaviour as
desktop. A narrower screen never widens what a user can see or send.

A small screen must not hide:

- the recipient address actually being used
- opt-out state
- delivery status, including Failed and Bounced
- the reason an Email could not be sent
- which attachments are included

These may be condensed, but never omitted.

Email sender configuration, template administration and controlled bulk
Email sending remain web-first.


**140. Email Flow Summary**

**Individual Email**

**Lead / Customer / Customer Purchase**

↓

**Select Send Email**

↓

**Validate User + Hierarchy Scope + Role**

↓

**Validate Sender + Recipient + Opt-Out**

↓

**Select Template / Compose Message**

↓

**Resolve Variables + Validate Attachments**

↓

**Review**

↓

**Send**

↓

**Record Status + CRM Activity**

**Scheduled Renewal Email**

**Reminder Send Time Reached**

↓

**Validate Customer Purchase + Email Eligibility**

↓

**Validate Sender + Template + Variables**

↓

**Already Sent?**

- **Yes:** Stop and retain the existing result
- **No:** Submit Email

↓

**Sent Successfully?**

- **Yes:** Reminder = Sent, Email History and Customer Activity updated
- **No:** Reminder = Failed, reason stored and the responsible owner
  notified

Sending an Email never changes the Record Owner of the Lead, Customer or
Customer Purchase, and never makes a supervisory sender an owner.


**141. Data Import & Export**

Authorized users may import existing Lead and Customer data, and export
permitted CRM data.

V1 supports:

> • Lead import
>
> • Customer import
>
> • field mapping
>
> • an explicit Lead assignment step
>
> • validation before import
>
> • duplicate detection
>
> • partial import where valid rows can continue
>
> • import result summary
>
> • downloadable error report
>
> • export of Leads, Customers and Customer Purchases

V1 does not include:

> • scheduled imports
>
> • automatic synchronization with external systems
>
> • ETL/data-pipeline tools
>
> • complex data transformation
>
> • API-based bulk data migration tools

Import and export are bounded by the reporting hierarchy in
Section 2.3. An import can only place records where the importing user
is permitted to assign them, and an export can only return records the
requesting user is permitted to see.
**142. Import Entry Points**

Import may be started from:

> • Leads → Import Leads
>
> • Customers → Import Customers
>
> • Settings → Data Import / Export

The setup import step opens the same import workflow.

Import is available only to roles whose fixed capabilities permit it, and
an importing user can only assign records within their own permitted
scope. See Sections 152 and 166.
**143. Supported Import File**

V1 should support:

> • CSV
>
> • XLSX / Excel

The upload screen should clearly state the accepted formats.

Example:

**Import Customers**

Upload a CSV or Excel file containing your customer data.

**\[ Choose File \]**

**\[ Download Sample File \]**

The sample file should contain the standard CRM fields expected for that
record type.

**144. Import Workflow**

The import flow is:

> 1. **Upload file**
>
> 2. **Map columns**
>
> 3. **Choose Lead assignment**
>
> 4. **Validate**
>
> 5. **Resolve issues**
>
> 6. **Confirm**
>
> 7. **Process**
>
> 8. **Results**

The system must not import records immediately after file upload.

The user must be able to review how columns will be interpreted, and
must choose how the records will be assigned, before any record is
created.

The assignment step sits after column mapping and before validation, so
that validation can check the chosen assignment is actually usable. It is
defined in Section 152.

An import can never bypass duplicate detection, row validation,
hierarchy-safe assignment, the policy-document requirements in
Section 68.1, or the Closed Amount eligibility rules in Section 68.3.
**145. Step 1 — Upload File**

Example:

**Import Customers**

**\[ Upload CSV / Excel \]**

Once uploaded, show:

> • file name
>
> • number of detected rows
>
> • number of detected columns

Example:

**customers-september.xlsx**

**428 rows detected**

Actions:

**Continue**

**Replace File**

**Cancel**

If the file cannot be read:

> **Unable to read this file. Please upload a valid CSV or Excel file.**

**146. Step 2 — Column Mapping**

The CRM should attempt to automatically match obvious column names.

Example uploaded file:

**Uploaded Column**

**CRM Field**

Customer Name

Customer Name

Mobile

Phone Number

Email ID

Email

Executive

Record Owner

Policy

—

Renewal

—

Each uploaded column should allow the user to select a CRM field.

Example:

Mobile → Phone Number

Renewal Date → \[Select CRM Field\]

Options should include:

> • relevant standard fields
>
> • configured custom fields
>
> • Do Not Import

A CRM field should not normally be mapped from multiple file columns
unless explicitly supported.

**147. Required Field Mapping**

The mapping screen must clearly indicate mandatory fields.

For Customer import:

> • Customer Name
>
> • at least one contact method: Phone Number or Email

For Lead import:

> • Lead Name
>
> • at least one contact method: Phone Number or Email

If a required field is not mapped, the user cannot continue.

Example:

> Customer Name has not been mapped.

**148. Record Owner Mapping**

Imported data may contain an owner column naming the person who handles
each record.

Example:

Sales Executive → Record Owner

The CRM should attempt to match imported owner values to existing active
users.

Example:

Arun → Arun Mathew

**Eligibility of a matched owner**

A matched owner is accepted only if all of the following hold:

> • the user is active
>
> • the user is a **Team Lead or Salesperson** — an Admin or Manager is
> never an acceptable Record Owner
>
> • the user is within the importing user's permitted scope under
> Section 2.3

If the value cannot be matched, or the matched user is not eligible:

> **Record Owner "Joseph K" could not be matched to an eligible active
> user.**

The user should be able to choose:

> • map it to an eligible user within their permitted scope
>
> • leave those records Unassigned, where permitted
>
> • fall back to the assignment strategy chosen in Step 3

The import process must not automatically create new users from
spreadsheet values, and must not reveal users outside the importing
user's scope in its matching suggestions.

Where a row's mapped owner is eligible, it takes precedence over the
Step 3 assignment strategy for that row. Rows without an eligible mapped
owner follow the Step 3 strategy.

**149. Lead Stage and Lead Priority Mapping**

**Lead Stage**

For Lead imports, an uploaded Stage column may be mapped to the CRM Lead
Stage field.

Imported values are matched against currently active pipeline stages.

Example:

New → New

Interested → Interested

Follow Up → No matching stage

For unmatched values, allow the user to map them to an existing active
stage.

The import process must not create new pipeline stages automatically.

If no Stage column is supplied, imported Leads use the first active
pipeline stage.

**Lead Priority**

An uploaded Priority column may be mapped to the Lead Priority field.

Imported values are matched against the active Lead Priority values
configured in Section 192. In the initial configuration these are Hot,
Warm and Cold.

Example:

Hot → Hot

High → No matching priority value

For unmatched values, allow the user to map them to an existing active
value. The import must not create new priority values automatically.

If no Priority column is supplied, imported Leads receive the configured
default priority value.

**Stage and Priority are separate fields**

A single uploaded column cannot populate both. Mapping a column to Stage
does not set Priority, and mapping a column to Priority does not set
Stage.
**150. Product Interest Mapping**

If an imported Lead contains an "Interested In" value, the CRM should
attempt to match it against the catalogue defined in Section 66, at
whichever level the value corresponds to:

> • Product Category — for example Health Insurance
>
> • Provider — for example Star Health
>
> • Plan / Sub-product — for example Family Health Optima

Only active catalogue entries are matched. Unmatched values are flagged
for the user to map or leave empty. The import must not create new
Product Categories, Providers or Plans automatically.

**A Lead import never creates a Customer Purchase**

An imported Lead records an expression of interest only. A Lead import
must not create a Customer, a Customer Purchase, a policy record or a
Closed Amount, and must not produce anything in a `Closed/Active` state.

For Customer import, basic Customer information is imported
independently of Customer Purchases.

V1 does **not** attempt to interpret arbitrary product, policy, premium
and renewal columns into Customer Purchases during a basic Customer
import unless the import specifically supports that structure.

Where Customer Purchases are imported by a structure that does support
them, the import cannot bypass the rules that govern them:

> • required policy documents are still required before a purchase can
> become `Closed/Active`
>
> • an imported purchase cannot arrive already `Closed/Active` on the
> strength of a spreadsheet column
>
> • Closed Amount eligibility still depends on `Closed/Active`
>
> • purchase ownership is still restricted to a Team Lead or
> Salesperson

This keeps the import predictable and prevents it from becoming a route
around the closure and eligibility rules in Sections 68.1 and 68.3.
**151. Custom Field Mapping**

Configured custom Lead, Customer and Customer Purchase fields appear in
the mapping options for the matching record type, as defined in
Section 194.

Example:

**Uploaded:**

**Existing Policy Number**

**CRM:**

**Existing Policy Number — Custom Field**

Field values are validated according to the custom field type:

> • Number must contain a valid numeric value
>
> • Date must contain a recognizable date
>
> • Dropdown must match an allowed option or be flagged for review

Only custom fields defined for the record type being imported are
offered. A Lead import cannot map to a Customer or Customer Purchase
custom field.
**152. Step 3 — Choose Lead Assignment**

Before validation, the importing user must choose how the imported
records will be assigned. There is no default and no implicit strategy.

**Options**

> • **Assign to a specific Team Lead** — every imported record is owned
> by that Team Lead.
>
> • **Assign to a specific Salesperson** — every imported record is
> owned by that Salesperson.
>
> • **Assign to a Team** — records are distributed using that team's
> configured round robin.

The Team Leads, Salespersons and teams offered are limited to those the
importing user is permitted to assign to under Section 2.3: a Team Lead
may assign within their own team, a Manager within their own reporting
hierarchy, and an Admin anywhere in the organization. The option list
must not disclose a user or team the importing user cannot otherwise see.

**When a Team is selected**

> • the team's configured round robin is used, as defined in
> Section 189.1
>
> • the eligible pool is that team's **active Team Lead and active
> Salespersons who are not paused from round robin**
>
> • members paused from round robin are excluded from the displayed
> eligible-recipient list and from the automatic distribution
>
> • the team's configured **batch size** applies
>
> • Admin and Manager are never included in the pool
>
> • records never spill into another team
>
> • if the team has no eligible automatic recipient, the strategy is
> invalid and the import cannot proceed on it

**Direct assignment**

Assigning to a specific Team Lead or Salesperson must respect hierarchy
and role eligibility. The selected user must be active, must be a Team
Lead or Salesperson, and must be within the importing user's permitted
scope.

Direct assignment does not use round-robin pause status. An active
person who is paused from round robin remains selectable, and remains a
valid destination, whenever the importing user is authorized to assign
to them. Pausing withholds someone from automatic distribution only; it
never blocks an explicit choice. See Section 189.1.

**No generic fallback**

There is no "use CRM assignment rules" option. Assignment during import
is always an explicit choice of a team or an individual, because there is
no organization-wide default assignment rule to fall back on.

**Interaction with a mapped owner column**

Where the file contains an owner column and a row's owner matches an
eligible user, that row uses its mapped owner. All other rows follow the
strategy chosen here. See Section 148.

**Visibility of the choice**

The selected strategy must be shown again:

> • on the review summary — Section 154
>
> • on the confirmation screen — Section 158
>
> • in the import result and its audit summary — Sections 160 and 161

Import execution and the assignment strategy used are auditable. See
Section 208.
**153. Step 4 — Validation**

Before import, validate each row.

Possible validation issues include:

> • required field missing
>
> • invalid phone number
>
> • invalid email format
>
> • invalid date
>
> • unknown or ineligible Record Owner
>
> • Record Owner outside the importing user's permitted scope
>
> • Record Owner who is an Admin or Manager
>
> • unknown pipeline stage
>
> • unknown Lead Priority value
>
> • unmatched Product Category, Provider or Plan/Sub-product
>
> • invalid custom field value
>
> • possible duplicate

**Assignment validation**

Validation also checks the assignment strategy chosen in Step 3:

> • the selected Team Lead or Salesperson is still active and still
> within the importing user's permitted scope, whether or not they are
> paused from round robin
>
> • a Team-based strategy still has at least one recipient who is active
> and not paused from round robin
>
> • no row would be assigned to an Admin or a Manager
>
> • no row would be assigned outside the selected team

If the assignment strategy itself is invalid — for example every active
member of the selected team is paused from round robin, leaving no
eligible automatic recipient — the import cannot proceed on that
strategy. The user must choose a different one. The import must not fall
back to a different team, to the importing user, or to any Admin or
Manager.

Validation should classify rows as:

> **• Ready**
>
> **• Needs Attention**
>
> **• Duplicate**
>
> **• Cannot Import**
**154. Step 5 — Import Review Summary**

Before confirming the import, show a summary of both the rows and the
chosen assignment.

Example:

**428 rows found**

**390 Ready**

**18 Possible Duplicates**

**12 Need Attention**

**8 Cannot Import**

**Assignment: Team → Kochi Health Team (round robin, batch size 1)**

**Eligible recipients: Arun (Team Lead), Sneha, Joseph**

Where individual rows carry an eligible mapped owner, the summary should
also show how many rows will use their mapped owner and how many will
follow the chosen strategy.

Actions:

**Review Issues**

**Change Assignment**

**Import Valid Rows**

**Cancel**

The system should not force the user to fix every invalid row before
importing valid records.

If the chosen assignment strategy is itself invalid, **Import Valid
Rows** is unavailable until a usable strategy is selected. See
Section 153.

**155. Duplicate Detection During Import**

Duplicate detection should use the same basic rules used when manually
creating Leads or Customers.

Check for matching:

> • phone number
>
> • email

Where a possible duplicate exists, classify the row as:

**Possible Duplicate**

The CRM should not silently overwrite the existing record.

**156. Duplicate Handling Options**

Before import, authorized users may choose how possible duplicates are
handled.

V1 options:

**Skip Duplicates**

or

**Import as New Records**

where permitted.

V1 should **not automatically merge or update existing CRM records
during a normal import**.

Automatic update/merge significantly increases the risk of overwriting
good CRM data and is outside the simple V1 import flow.

The user can review existing records separately.

**157. Invalid Rows**

Rows that cannot be imported should not prevent valid rows from being
processed.

Example:

**420 records imported successfully**

**8 records could not be imported**

Actions:

**Download Error Report**

**View Errors**

The error report should include:

> • original row number
>
> • relevant identifying information
>
> • reason the row failed

Example:

**Row**

**Name**

**Error**

14

Ramesh Kumar

Phone and Email both missing

89

Priya Nair

Invalid date format

146

John Thomas

Unknown Record Owner

**158. Step 6 — Import Confirmation**

Before the actual import begins, show a confirmation that restates both
the record count and the assignment strategy.

Example:

**Import 390 Leads?**

This will create new Lead records.

**Assignment: Team → Kochi Health Team (round robin, batch size 1)**

**Eligible recipients: Arun (Team Lead), Sneha, Joseph**

**18 possible duplicates will be skipped.**

**\[ Start Import \]**

**\[ Cancel \]**

The assignment strategy chosen in Step 3 must be shown again here. A
user must never confirm a large import without seeing where the records
will go.

Import is considered a major data action and requires confirmation.
**159. Step 7 — Import Processing**

After the import starts, the system should process the data without
requiring the user to keep the page open.

For small files, completion may happen quickly.

For larger imports, show:

**Import in progress**

**390 records are being processed.**

The user may continue using the CRM.

A notification should be created when the import completes or fails.

The system should not create duplicate records if the user refreshes or
accidentally revisits the import result while the same import job is
already processing.

**160. Step 8 — Import Result**

On completion:

**Import Complete**

Example:

**390 Imported**

**18 Skipped as Duplicates**

**12 Failed**

**Assignment: Team → Kochi Health Team (round robin, batch size 1)**

**Distributed to: Arun 130 · Sneha 130 · Joseph 130**

Actions:

**View Imported Records**

**Download Error Report**

**Done**

The result must state the assignment strategy that was applied and how
the records were distributed, so the outcome can be verified against
what was confirmed.

The result should remain available long enough for the user to review
the outcome.

Import execution, including the assignment strategy used, is auditable.
See Section 208.

**161. Import History**

Authorized users should be able to view recent imports under:

Settings → Data Import / Export

Example:

**Import**

**Type**

**User**

**Assignment**

**Date**

**Result**

september-leads.xlsx

Leads

Admin

Team → Kochi Health Team

03 Sep

390 Imported

august-leads.csv

Leads

Arun

Salesperson → Sneha

29 Aug

118 Imported

Each entry records the **assignment strategy used**, so it is always
possible to see how an import distributed its records.

Selecting an entry shows the import summary, including the assignment
outcome and any failures.

Import history is visible within the viewer's authorized scope. Import
execution and its assignment strategy are auditable. See Section 208.

V1 does not require detailed audit analytics for every imported cell.
**162. Export**

Authorized users may export permitted Lead, Customer or Customer
Purchase data.

Export may be available from:

> • Leads
>
> • Customers
>
> • Settings → Data Import / Export

Actions:

**Export**

**Scope of an export**

An export returns only the records within the requesting user's
authorized scope under Section 2.3:

> • **Admin** — organization-wide, where their role permits export
>
> • **Manager** — their own reporting hierarchy only
>
> • **Team Lead** — their own team and their own records
>
> • **Salesperson** — their own permitted records

An export must never expose a peer Manager's branch, a peer Team Lead's
team, or any record the user could not open in the interface. Scope is
applied server-side when the file is generated. It is not achieved by
producing a wider dataset and filtering it afterwards.

The export also respects:

> • active filters where applicable
>
> • the fields the user is permitted to see

For example, if the Customers list is filtered to:

**Record Owner = Arun**

the user may export those filtered results, provided Arun is within
their scope.

Every export is recorded, identifying the requesting user, the dataset,
the filters and the scope applied. See Section 208.

Which roles may export is *pending client confirmation*. See
Section 166.
**163. Export Fields**

V1 exports include relevant standard fields and permitted configured
custom fields, limited to the requesting user's authorized scope.

**Lead export**

> • Lead Name
>
> • Phone
>
> • Email
>
> • Lead Priority
>
> • Stage
>
> • Lead Source
>
> • Interested In — Product Category, Provider or Plan/Sub-product
>
> • Record Owner
>
> • Team
>
> • Created Date
>
> • permitted custom Lead fields

**Customer export**

> • Customer Name
>
> • Phone
>
> • Email
>
> • Record Owner
>
> • Team
>
> • Created Date
>
> • number of Customer Purchases
>
> • permitted custom Customer fields

**Customer Purchase export**

Customer Purchase data must not be flattened into the basic Customer
export in an ambiguous way. Where purchase-level data is required it is
treated as a **separate dataset**, with one row per purchase:

> • Customer Name
>
> • Product Category
>
> • Provider
>
> • Plan / Sub-product
>
> • Policy / Reference Number
>
> • Status, including `Closed/Active`
>
> • required-document completeness — present or missing counts only
>
> • Closed Amount
>
> • whether that Closed Amount is eligible
>
> • Renewal Date
>
> • Record Owner
>
> • Team
>
> • permitted custom Customer Purchase fields

No export includes policy document files or their contents. See
Section 165.

Every exported dataset is bounded by the requesting user's scope. A
Customer who holds purchases owned by users outside that scope appears
with only the purchases the requester may see.
**164. Export Format**

**V1 export format: CSV**

The exported file should use clear column headings corresponding to CRM
field names.
**165. Export Confirmation / Sensitive Data**

Normal exports do not need repeated confirmation dialogs unless they
contain a large volume of sensitive or restricted data.

However:

> • only roles whose fixed capabilities permit export may export
>
> • users may export only records and fields within their authorized
> scope under Section 2.3

**Policy documents**

Exports in V1 contain **record data only**. A CSV export does not
include policy document files, their contents, or any link that would
let an unauthorized reader retrieve them. An export may indicate that a
required document is present or missing, because that is a status of the
Customer Purchase, but it does not carry the document itself.

Whether any bulk export of policy documents should exist at all, and
under what authorization, is *pending client confirmation*. It must not
be implemented on assumption. See Section 212.

**Closed Amount and incentive data**

Where an export includes Closed Amount or incentive figures, it is
subject to the same scope rules as the corresponding report. An export
must never reveal a peer branch's or peer team's figures.

The export permission itself is part of the fixed role model. See
Section 166.
**166. Import / Export Permission Behaviour**

Import and export follow the fixed role model in Section 2 and the
hierarchy scope in Section 2.3. Role capabilities are not configurable in
the CRM.

Two conditions must both hold for any import or export:

> 1. the user's fixed role permits the action; and
>
> 2. the records involved fall within the user's authorized scope.

**Confirmed behaviour**

> • An export returns only records within the requesting user's
> authorized scope, as defined in Section 162. This holds for every
> role, including Admin, whose scope happens to be the organization.
>
> • An import may assign only to Team Leads and Salespersons the
> importing user is permitted to assign to, as defined in Section 152.
>
> • No import or export may produce or reveal a record owned by an
> Admin or a Manager, or belonging to a team the user cannot see.
>
> • Import and export controls are hidden where the user's role does not
> permit them, but hiding is presentation only. The server must enforce
> both the role check and the scope check.
>
> • Every import and every export is recorded, identifying the user, the
> action, the scope applied and — for imports — the assignment strategy
> chosen. See Section 208.

**Pending client confirmation**

Which roles may import data, and which roles may export data, is
*pending client confirmation before security implementation and UAT*.
Whether policy documents may be included in any export is also pending.
See Section 212.

These will be agreed with A&S Fincare during development and encoded as
fixed application rules. They are not settings an Admin can configure.
**167. Import — Mobile Behaviour**

Large data imports are primarily a desktop/web administrative workflow.

V1 does not need to reproduce the full spreadsheet mapping and
assignment experience on mobile.

On mobile, authorized users may see:

**Data Import is available on the web application.**

Export may also remain web-first.

This is consistent with the product principle that mobile focuses on
operational CRM work rather than administration.
**168. Import Flow Summary**

**Upload CSV / Excel**

↓

**Read Columns**

↓

**Map to CRM Fields**

↓

**Choose Lead Assignment**

**│**

**├── Specific Team Lead**

**├── Specific Salesperson**

**└── Team → that team's round robin**

**(active Team Lead + active Salespersons, batch size applies)**

↓

**Validate Rows**

**(including assignment eligibility)**

↓

**Check Duplicates**

↓

**Review Summary**

**(shows the chosen assignment strategy)**

↓

**Confirm Import**

**(restates the assignment strategy)**

↓

**Process Import**

↓

**Results**

**│**

**├── Imported**

**├── Duplicate / Skipped**

**└── Failed**

↓

**Error Report + Assignment Summary**

The important V1 rules are:

**Import must bring existing data into the CRM safely, without silently
overwriting existing records and without bypassing duplicate checks,
validation or hierarchy-safe assignment.**

**Every imported record must end up owned by a Team Lead or a
Salesperson, or remain explicitly Unassigned. An import can never
produce a record owned by an Admin or a Manager, and can never place a
record in a team the importing user is not permitted to assign to.**
**169. Reports**

The Reports module gives every role visibility of the work and results
within their authorized scope, and gives supervisory roles roll-ups
across the hierarchy below them.

V1 reporting covers:

> • Leads, including assignment, priority and conversion
>
> • Follow-ups and overdue activity
>
> • Renewals
>
> • Customers and Customer Purchases
>
> • Closed Amount
>
> • incentive calculations and incentive status
>
> • team and individual performance
>
> • WhatsApp and Email activity, where already supported by those
> modules
>
> • import results and failures

Every figure in every report is calculated from the viewer's authorized
scope under Section 2.3. See Section 170.

V1 does not include:

> • custom report builders
>
> • advanced forecasting
>
> • financial, accounting or payroll reports
>
> • configurable dashboards
>
> • complex business intelligence

Incentive reporting is operational reporting of the engine's results. It
is not a payroll or accounting function. See Section 206.
**170. Reports — Main Screen**

Navigation:

Sidebar → Reports

The Reports screen should contain:

**Date Range**

> • Today
>
> • This Week
>
> • This Month
>
> • Custom Date Range
>
> • reporting period, where the report uses one

**Scope is derived, not chosen**

Every report is calculated from the viewer's authorized scope under
Section 2.3. Scope is applied before any figure is computed; it is not a
filter the user selects and cannot be widened:

> • **Admin** — organization-wide.
>
> • **Manager** — that Manager's own reporting hierarchy only: their
> Team Leads, those teams, and the records belonging to them.
>
> • **Team Lead** — their own team, including their own operational
> results.
>
> • **Salesperson** — their own assigned records and their own personal
> results.

A Manager must not see another Manager's branch, and a Team Lead must not
see another Team Lead's team — not as a row, a total, a comparison, a
benchmark, a ranking position, a percentage or a denominator. An
organization-wide figure must not be shown to a Manager.

Within their scope, a user may narrow the view by Manager, team, Team
Lead or Salesperson. Narrowing is a filter over data already visible. It
is never a permission change, and the options offered never include a
branch or user the viewer cannot otherwise see. See Section 177.

**Levels of result**

Where relevant, reports distinguish:

> • **personal performance** — the viewer's own owned or assigned
> records
>
> • **direct-team performance** — a Team Lead's team, including that
> Team Lead's own results shown separately
>
> • **Manager hierarchy roll-up** — all teams below a Manager
>
> • **organization-wide totals** — visible to Admin

A roll-up is a supervisory figure. It does not make the supervisor the
owner of the underlying records. See Section 2.5.

Reports are enforced server-side. Hiding a report, a row or a column is
presentation only.

Which roles may access which reports, and which may export report data,
is *pending client confirmation* where not already fixed by the scope
rules above. See Section 212.
**171. Lead Report**

The Lead Report summarises Lead activity and outcomes for the selected
period, within the viewer's authorized scope.

Show:

> • Leads Created
>
> • Leads Assigned
>
> • Leads Won
>
> • Leads Lost
>
> • Leads Converted to Customers
>
> • Open Leads

**Leads by Stage**

**Stage**

**Leads**

New

42

Contacted

28

Interested

17

Won

9

**Leads by Priority**

**Priority**

**Leads**

Hot

18

Warm

44

Cold

34

Lead Priority is a separate dimension from Lead Stage. A Lead appears
once in each breakdown, and the two breakdowns must not be combined into
a single axis. Priority values are those configured in Section 192;
a deactivated value still appears in historical breakdowns for periods in
which it was in use.

**Leads by Source**

**Source**

**Leads**

Website

24

Referral

18

Walk-in

12

Other

8

**Leads by Team**

**Team**

**Team Lead**

**Leads**

**Converted**

Kochi Health Team

Arun

38

12

Ernakulam Motor Team

Meera

31

10

The team breakdown is available to Admin and to Managers within their
branch. A Team Lead sees their own team; a Salesperson sees only their
own Leads and no team breakdown.

**Lead Outcomes**

Show:

> • Won
>
> • Lost
>
> • Converted
>
> • Still Open

**Assignment reporting**

The report also covers how Leads reached their owners:

> • Leads assigned by team round robin
>
> • Leads assigned or reassigned manually
>
> • Leads currently Unassigned, with the destination team where one was
> selected

Selecting a stage, priority, source, outcome or team should open the
Leads list with the corresponding filter applied, within the same scope.
**172. Follow-up Report**

The Follow-up Report helps supervisory users understand whether Lead and
Customer follow-ups are being completed on time, and helps operational
users see their own outstanding work.

Show:

> • Follow-ups Created
>
> • Completed
>
> • Pending
>
> • Overdue

Breakdown by user, within the viewer's authorized scope:

**Team**

**User**

**Completed**

**Pending**

**Overdue**

Kochi Health Team

Arun

32

8

2

Kochi Health Team

Sneha

27

5

4

The breakdown level follows the viewer's role: a Salesperson sees only
their own row, a Team Lead their team, a Manager their teams, and Admin
the organization.

The report includes both Lead and Customer follow-ups.

Follow-ups are counted by **Assigned To**, not by Record Owner. A
follow-up assigned to one user on a record owned by another is counted
against the assignee.

Where useful, selecting a count should open the corresponding filtered
Follow-ups list, within the same scope.
**173. Renewal Report**

The Renewal Report provides visibility of recurring and renewal business
within the viewer's authorized scope.

Show, matching the renewal statuses defined in Section 72:

> • Upcoming
>
> • Due Today
>
> • Overdue
>
> • Renewed / Completed
>
> • Not Renewing

The selected date range applies primarily to the Customer Purchase's
**Renewal Date**.

Breakdown by catalogue:

**Product Category**

**Provider**

**Plan / Sub-product**

**Upcoming**

**Due Today**

**Overdue**

**Renewed / Completed**

**Not Renewing**

Health Insurance

Star Health

Family Health Optima

28

1

5

20

3

Motor Insurance

Acme General

Two-Wheeler Package

17

0

3

13

1

Breakdown by team, Team Lead or Assigned To is also available, bounded by
the viewer's scope.

Where useful, selecting a count should open the Renewals list with the
corresponding filter applied.

Renewal reminder outcomes may also be reported, including reminders sent,
failed and skipped, as defined in Sections 108 and 134. A failed or
skipped reminder must never be counted as sent.
**174. Customer and Customer Purchase Report**

This report provides an overview of the customer base and what has been
sold, within the viewer's authorized scope.

Show:

> • Total Customers
>
> • New Customers
>
> • Customers with Upcoming Renewals
>
> • Customers with Overdue Items
>
> • Total Customer Purchases
>
> • Purchases `Closed/Active`
>
> • Purchases awaiting required policy documents
>
> • Customers holding more than one Customer Purchase

**Total Customers** represents the current active Customer count within
scope.

**New Customers** represents Customers created during the selected
period.

Upcoming and overdue counts are based on active Customer Purchases and
their Renewal Dates.

**Breakdown by catalogue**

**Product Category**

**Provider**

**Plan / Sub-product**

**Purchases**

**Closed/Active**

**Awaiting Documents**

Health Insurance

Star Health

Family Health Optima

28

24

4

Motor Insurance

Acme General

Two-Wheeler Package

17

15

2

**Purchases awaiting required policy documents** is an operational
figure, not a sales figure. It identifies work outstanding before those
purchases can become `Closed/Active` and before their Closed Amount
becomes eligible.

A Customer with several purchases is counted once as a Customer and once
per purchase in the purchase figures. The two must not be added together.

This report is a high-level overview rather than detailed analytics.
**175. Team and Individual Performance Report**

This report gives supervisory users operational visibility of activity
and results below them, and gives operational users visibility of their
own work.

**Scope and structure**

The report presents figures at the levels the viewer is authorized to
see:

> • **Salesperson** — own activity and own results only.
>
> • **Team Lead** — own personal results, and a breakdown for each
> Salesperson in their team, plus the team total. Own results and team
> total are shown as distinct figures.
>
> • **Manager** — a breakdown by team within their reporting hierarchy,
> and the branch total.
>
> • **Admin** — a breakdown by Manager, and the organization total.

Example, as seen by a Manager:

**Team**

**Team Lead**

**Leads Owned**

**Converted**

**Purchases Closed/Active**

**Eligible Closed Amount**

**Follow-ups Completed**

**Follow-ups Overdue**

**Renewals Completed**

Kochi Health Team

Arun

38

12

9

—

32

2

14

Ernakulam Motor Team

Meera

31

10

7

—

27

4

11

Definitions:

> **• Leads Owned** = active Leads where the user is the current Record
> Owner
>
> **• Converted** = Leads converted to Customers during the period
>
> **• Purchases Closed/Active** = Customer Purchases that reached
> `Closed/Active` during the period
>
> **• Eligible Closed Amount** = as defined in Section 176
>
> **• Follow-ups Completed** = Follow-ups assigned to and completed by
> the user during the period
>
> **• Follow-ups Overdue** = incomplete Follow-ups currently overdue and
> assigned to the user
>
> **• Renewals Completed** = Renewal actions completed by the user
> during the period

**Record Owner and Assigned To are different concepts**

Leads Owned counts ownership. Follow-ups and Renewals count assignment.
A user may be assigned work on a record they do not own, and this report
must not conflate the two.

**Personal production versus roll-up**

A Team Lead may personally own Leads and Customer Purchases and close
sales, so a Team Lead has both personal results and a team roll-up.
These must always be separately identifiable, and the team total must
not be presented as the Team Lead's own production.

Managers and Admins have no personal production. Their figures are
supervisory roll-ups only. This report must never present a Manager or
Admin as the owner of an underlying record. See Section 2.5.

**Peer isolation**

A Manager sees only their own branch, and a Team Lead only their own
team. No comparison, ranking, benchmark, percentage or denominator may
reveal a peer branch or a peer team, or the organization total, to a user
not authorized to see it.

**Purpose**

The report provides operational visibility and supports the performance
and incentive measurement defined in Sections 176 and 206.

**176. Closed Amount and Incentive Report**

This report covers recorded transaction value and the results of the
incentive engine defined in Section 206.

**Eligible Closed Amount**

A Customer Purchase contributes to **eligible Closed Amount** only when
both conditions hold:

> 1. its required policy documents are complete; and
>
> 2. it is marked `Closed/Active`.

Where a report shows both, it must clearly distinguish:

> • **Recorded Closed Amount** — the amount entered on purchases,
> including those not yet `Closed/Active`
>
> • **Eligible Closed Amount** — the amount that counts toward
> performance and incentive totals

A figure labelled only "Closed Amount" is ambiguous and must not be used
where both concepts appear.

**Aggregation levels**

> • Salesperson
>
> • Team Lead personal
>
> • Team total
>
> • Manager branch total
>
> • Organization total

**No double counting**

Each Customer Purchase contributes its eligible Closed Amount exactly
once at each level of a roll-up. A purchase owned by a Salesperson is
counted once in that Salesperson's figure, once in their team's total,
once in the Manager's branch total, and once in the organization total —
never twice at the same level. A Team Lead's personal purchases are
included in the team total once, in addition to being shown separately as
their personal production; the team total is not the sum of the team
figure and the Team Lead figure.

Where a purchase has renewal cycles, each cycle's eligible Closed Amount
is attributed to the period in which that cycle became `Closed/Active`.
A renewal does not re-count the original cycle.

**Incentive reporting**

The report presents calculated incentive results and the information
needed to understand them:

> • the reporting period
>
> • the participant
>
> • the eligible Closed Amount used
>
> • the Customer Purchases counted
>
> • the slab and rule applied
>
> • the rule version in force when the calculation ran
>
> • the calculation date
>
> • the current status of the result

Statements may be produced at Salesperson, Team Lead, Manager and
organization level, for whichever levels are confirmed as incentive
participants.

**Traceability**

A historical incentive result must remain traceable to the rule version
used to produce it. A later change to slabs or rules must not silently
restate a past result. Where a result is recalculated, adjusted or
reversed, the previous result and the reason remain visible, and the
change is auditable under Section 208.

**Visibility**

Incentive figures follow Section 2.3. A Salesperson sees their own
result; a Team Lead their own and their team's; a Manager their branch;
Admin the organization. No ranking, benchmark or percentage may reveal a
peer's figures to a user not authorized to see them.

**Pending client confirmation**

The engine's capability is committed. Its business values are not. Slab
thresholds, rates, formulas, eligibility conditions, eligibility dates,
reporting periods, which roles participate, how Team Lead incentives
treat personal versus team production, adjustments, reversals, approval
and payout rules are all *pending client confirmation*. See
Section 212.

Supervising a team does not by itself establish that a Manager is an
incentive participant. Participant eligibility must be confirmed.

No slab, rate, percentage or formula appears in this specification, and
none may be assumed.
**177. Report Filters**

Reports should support only the filters relevant to that report.

Available filters may include:

> • Date Range / reporting period
>
> • Manager
>
> • Team
>
> • Team Lead
>
> • Salesperson
>
> • Lead Stage
>
> • Lead Priority
>
> • Lead Source
>
> • Product Category
>
> • Provider
>
> • Plan / Sub-product
>
> • Customer Purchase status
>
> • Renewal status

Do not show every filter on every report.

For example:

**Renewal Report**

> • Date Range
>
> • Product Category / Provider / Plan
>
> • Renewal status
>
> • Team / Assigned To

**Lead Report**

> • Date Range
>
> • Lead Stage
>
> • Lead Priority
>
> • Lead Source
>
> • Team / Record Owner

**Scope-bounded filter options**

Hierarchy filters narrow within the viewer's authorized scope; they never
widen it. The options offered are limited to what the viewer can already
see:

> • Admin may filter by any Manager, team, Team Lead or Salesperson
>
> • a Manager may filter only within their own reporting hierarchy
>
> • a Team Lead may filter only within their own team
>
> • a Salesperson has no hierarchy filters, because their scope is a
> single user

A filter option list must never disclose a Manager, team or user the
viewer cannot otherwise see.

Changing filters refreshes the report.

A **Clear Filters** action restores the default report view, which is the
viewer's full authorized scope — not an organization-wide view.
**178. Report Drill-down**

Where a report metric corresponds directly to CRM records, selecting the
metric should open the appropriate filtered list.

For example:

**5 Overdue Renewals**

opens:

Renewals → Overdue

Similarly:

**12 Leads — Interested**

opens the Leads list filtered to:

**Stage = Interested**

This allows reports to act as an entry point into actual CRM work rather
than displaying numbers with no action behind them.

Drill-down applies the same scope as the metric it came from. A user must
never reach a record through a report that they could not reach through
the corresponding list screen. A roll-up figure drilled into by a Manager
opens the underlying records within that Manager's branch only.
**179. Report Export**

Authorized users may export report data.

Action:

**Export**

V1 report export format is CSV.

The export must respect:

> • selected report
>
> • active filters
>
> • selected date range
>
> • the requesting user's authorized scope under Section 2.3

An exported file must contain exactly the rows the user could see on
screen. It must never include a peer Manager's branch, a peer Team
Lead's team, or any record outside the viewer's scope. Scope is applied
server-side when the file is generated, not by filtering a wider result
afterwards.

The exported data should contain the underlying report data relevant to
the selected report rather than a screenshot of the report UI.

Report exports do not include policy documents or their contents. See
Section 165.

Every report export is recorded, identifying the requesting user, the
report, the filters and the scope applied.

Which roles may export report data is *pending client confirmation*. See
Section 212.
**180. Empty, Loading and Error States**

**Empty State**

If no data exists for the selected filters:

> **No report data available  
> ** There is no data matching the selected period and filters.

An empty report means there is nothing **within the viewer's authorized
scope** matching the filters. It must never imply that the organization
as a whole has no data, and must never disclose that data exists
elsewhere.

**Loading State**

Use loading placeholders while report data is being retrieved.

**Error State**

> **Unable to load report  
> **Please try again.

**\[ Retry \]**

Existing filters should remain selected after a temporary loading error.
A failed load must not fall back to a wider scope.
**181. Reports — Mobile Behaviour**

Reports are primarily a web feature, but authorized users may access a
simplified report view on mobile.

On mobile:

> • summary metrics appear as stacked cards
>
> • filters open in a compact filter panel
>
> • tables may be shown as stacked rows/cards
>
> • detailed analysis and report export remain web-first

Mobile applies exactly the same scope as desktop. A narrower screen
never widens what a user can see, and a condensed figure is still
calculated from the viewer's authorized scope only.

A Salesperson's mobile reports show their own work and their own
performance. A Team Lead's show their own results and their team's, kept
visually distinct as described in Section 175.

Mobile reporting should prioritize quick visibility rather than
reproducing the full desktop reporting layout.
**182. Reports Flow Summary**

**Reports**

↓

**Select Report**

**│**

**├── Leads**

**├── Follow-ups**

**├── Renewals**

**├── Customers and Customer Purchases**

**├── Team and Individual Performance**

**├── Closed Amount and Incentives**

**└── Import Results**

↓

**Scope applied automatically from the viewer's role**

**(Admin · Manager branch · Team · Own records)**

↓

**Select Date Range / Filters**

↓

**View Summary + Breakdown**

↓

**Select Metric**

↓

**Open Relevant Filtered CRM Records**

Scope is never a filter the user chooses. It is derived from the
viewer's position in the hierarchy and applied before any figure is
calculated.
**183. Settings & Administration**

Settings & Administration allows Admin to configure A&S Fincare business
data.

Navigation:

Sidebar → Settings

Settings should include:

> • Organization Settings
>
> • Users
>
> • Teams
>
> • Roles & Permissions — reference only; role capabilities are fixed
>
> • Lead Assignment
>
> • Lead Priority
>
> • Lead Sources
>
> • Pipeline
>
> • Product Catalogue
>
> • Custom Fields
>
> • Reminder Settings
>
> • Incentive Rules
>
> • WhatsApp Settings
>
> • WhatsApp Templates
>
> • Email Settings
>
> • Email Templates
>
> • Data Import / Export

**What Settings does and does not control**

Settings configures **business data**. It does not configure application
scope or access control.

> • There is no Modules & Features screen. Core functionality cannot be
> enabled or disabled by an administrator. See Section 200.
>
> • **Roles & Permissions** is a reference screen describing the fixed
> role model. It is not an editor. There is no custom-role builder, no
> editable role definition, no administrator-facing permission matrix
> and no per-user override. See Sections 187 and 188.
>
> • No setting can grant a user visibility that bypasses the reporting
> hierarchy in Section 2.3.

Settings visibility follows the fixed role model. Settings is available
to Admin; a small number of subsections are available to other roles only
where this specification states so explicitly. Hiding a settings screen
is presentation only — the server must enforce access.

Settings are primarily a web/desktop administrative experience.

Significant configuration changes are auditable. See Section 208.

**184. Organization Settings**

Navigation:

Settings → Organization Settings

Admin can manage the operating details of the A&S Fincare organization:

> • Organization Name — A&S Fincare
>
> • Business Phone
>
> • Business Email
>
> • Address
>
> • Time Zone
>
> • Country
>
> • Currency

These are operating details only. There is no business-type or industry
selection, and these settings do not change the application's identity,
its feature set or any role's scope.

The organization Time Zone is used for scheduled activities such as
Follow-ups and automated renewal reminders.

Changing the Time Zone does not change date-only values such as Renewal
Dates, and does not silently reschedule existing scheduled actions.

Action:

**Save Changes**

Changes here are significant configuration changes and are auditable. See
Section 208.
**185. Users**

Navigation:

Settings → Users

Show:

> • User Name
>
> • Email
>
> • Role
>
> • Team
>
> • Reports To
>
> • Status
>
> • Actions

Roles:

> • Admin
>
> • Manager
>
> • Team Lead
>
> • Salesperson

Statuses:

> • Active
>
> • Inactive

Actions:

> • Add User
>
> • Edit User
>
> • Change Role
>
> • Change Team
>
> • Change Reporting Manager
>
> • Deactivate
>
> • Reactivate

**Required hierarchy linkage**

When a user is created or edited, the application must enforce the
cardinality rules defined in Section 2.2:

**Role**

**Reports To**

**Team**

Admin

Not applicable

Not applicable

Manager

Admin level

Not applicable; a Manager supervises teams through their Team Leads

Team Lead

Exactly one Manager — required

Exactly one team, which that Team Lead leads — required

Salesperson

The Team Lead of their team

Exactly one team — required

The application must reject a save that would:

> • leave a Team Lead without a Manager
>
> • leave a Team Lead without a team
>
> • give a team more than one active Team Lead
>
> • leave a Salesperson without a team
>
> • place a Salesperson in more than one team
>
> • assign a team or reporting relationship the acting Admin is not
> permitted to maintain

Admin assigns one of the four predefined roles and maintains reporting
relationships and team membership. Admin cannot create a new role or
change what a role is permitted to do. See Section 187.

Users with CRM history must be deactivated rather than permanently
deleted.

At least one active Admin must remain.

Changes to a user's role, team or reporting Manager are auditable
actions. Detailed audit-history requirements are defined in Section 208.

## 185.1 Teams

Navigation:

Settings → Teams

A team is a first-class record consisting of exactly one active Team
Lead and the Salespersons assigned to that Team Lead, as defined in
Section 2.2.

Show:

> • Team Name
>
> • Team Lead
>
> • Reporting Manager
>
> • Number of active Salespersons
>
> • Status
>
> • Whether each Team Lead and Salesperson is currently included in the
> team's automatic round-robin pool

Actions:

> • Add Team
>
> • Rename Team
>
> • Change Team Lead
>
> • Move Team to another Manager
>
> • Deactivate Team
>
> • Reactivate Team
>
> • **Pause from round robin**
>
> • **Resume round robin participation**

**Rules**

> • A team must have exactly one active Team Lead at all times.
>
> • A Team Lead leads exactly one team.
>
> • A team reports to exactly one Manager, through its Team Lead.
>
> • Moving a team to another Manager changes the reporting Manager of
> that team's Team Lead and therefore changes which Manager can see the
> team's records.
>
> • Changing the Team Lead, moving a team between Managers and
> deactivating a team are auditable actions.
>
> • A team cannot be deactivated while it has active Salespersons or
> active operational records. These must be moved or reassigned first.
>
> • A Team Lead may apply **Pause from round robin** and **Resume round
> robin participation** to a Salesperson in their own team. A Team Lead
> may be paused or resumed only by the Manager to whom that Team Lead
> reports, or by an Admin.
>
> • These two actions control automatic Lead distribution only. They do
> not deactivate the user and do not change existing ownership of any
> record. The behaviour is defined in Section 189.1.
>
> • The screen must show clearly, for every Team Lead and Salesperson,
> whether that person is currently included in the team's automatic
> round-robin pool.
>
> • Pausing and resuming round-robin participation are auditable
> actions. See Section 208.

Changing a team's Team Lead or reporting Manager changes future
visibility. It must not rewrite historical activity, and it must not
remove a past user's name from records they previously worked.

**186. User Deactivation**

Before deactivating a user, check whether they currently own or are
assigned active work.

This includes:

> • Leads
>
> • Customers
>
> • Customer Purchases
>
> • incomplete Follow-ups
>
> • Renewal actions
>
> • open WhatsApp conversations

If active responsibilities exist, they must be reassigned to an active
Team Lead or Salesperson before deactivation is completed. Reassignment
targets are limited to users the acting supervisor is permitted to
assign to under Section 2.3.

**Effect on future assignment**

Deactivating a Team Lead or Salesperson removes that user from future
Lead assignment, including their team's automatic assignment pool. Team
assignment behaviour is defined in Section 189.

Admins and Managers are never part of an assignment pool, so deactivating
them has no effect on assignment.

**Protecting the hierarchy**

Deactivation and hierarchy changes must not silently leave the structure
invalid. The application must block the change and explain what is
required when an action would:

> • leave a team without an active Team Lead
>
> • leave a Team Lead without an active Manager
>
> • leave a Salesperson without an active team
>
> • remove the last active Admin

To deactivate a Team Lead, an authorized Admin must first assign a
replacement Team Lead to that team, or move the team's Salespersons and
records to another team.

Historical activity should continue to show the original user's name.

Reactivating the user does not automatically restore previously
reassigned work, and does not automatically restore their previous role,
team or reporting relationship. These must be set explicitly.

**187. Roles & Permissions**

Navigation:

Settings → Roles & Permissions

V1 uses four predefined roles, defined in full in Section 2:

**Admin**

Supervisory. Organization-wide visibility. Maintains roles, the
reporting hierarchy, teams and approved business configuration. Does not
own operational records.

**Manager**

Supervisory. Visibility restricted to their own reporting hierarchy.
Supervises their Team Leads and teams. Does not own operational records.

**Team Lead**

Supervisory within their own team and operational. Leads exactly one
team, reports to exactly one Manager, and may own and work operational
records.

**Salesperson**

Operational. Belongs to exactly one team and may own and work the
records assigned to them.

**Roles are fixed by the application**

Role capabilities are defined by the application and are not
configurable inside the CRM.

The CRM does not provide:

> • custom role creation
>
> • a permission builder
>
> • capability toggles for a role
>
> • an editable permission matrix
>
> • a configurable "All Records / Own Records" security scope
>
> • per-user permission overrides that bypass the reporting hierarchy

Admin may:

> • assign one of the four predefined roles to a user
>
> • maintain reporting relationships
>
> • maintain team membership

Admin may not redefine what a role is permitted to do.

Changing what a role can do is an application change. It requires a
reviewed change/change-control process and a new release. It is not a
setting.

**Configurable business data is not a configurable permission**

Some business data is deliberately configurable by Admin — for example
Lead Priority values, and other business configuration defined elsewhere
in this specification. Configuring business data does not change any
role's security scope, and must never be presented as a permission
setting.

**188. Role and Scope Summary**

This section summarises the confirmed role behaviour. It is a summary of
Section 2 and must not contradict it.

**Confirmed scope by role**

| Area | Admin | Manager | Team Lead | Salesperson |
|---|---|---|---|---|
| Record visibility | Organization-wide | Own reporting hierarchy only | Own team only | Own assigned records only |
| Peer visibility | Not applicable | Cannot see another Manager's branch | Cannot see another Team Lead's team | None |
| May be Record Owner | No | No | Yes | Yes |
| May be operational Assigned To | No | No | Yes | Yes |
| Dashboards and reports | Organization-wide roll-up | Roll-up for own branch | Own team, including own work | Own work only |
| Assign and reassign operational records | Within the organization | Within own reporting hierarchy | Within own team | No |
| Participates in automatic Lead assignment | No | No | Yes, within own team, while active and not paused from round robin | Yes, within own team, while active and not paused from round robin |
| Assign roles, hierarchy and teams | Yes | No | No | No |
| Configure approved business data | Yes | No | No | No |
| Create custom roles or edit role capabilities | No | No | No | No |
| WhatsApp: see unassigned conversations | Yes | Yes | No | No |
| WhatsApp: reply within permitted scope | Assigned conversations organization-wide, without becoming owner. **No reply while unassigned** | Assigned conversations within own reporting hierarchy, without becoming owner. **No reply while unassigned** | Their own and their team's assigned conversations | Conversations assigned to them |
| WhatsApp: reassign conversations | Organization-wide | Within own reporting hierarchy | Within own team | No |

Manager visibility is fixed to the Manager's own reporting hierarchy. It
is not configurable.

Teams are part of the application, as defined in Sections 2.2 and 185.1.

A Team Lead or Salesperson participates in automatic Lead assignment only
while they are active and not paused from round robin. Pausing is
confirmed behaviour: a Team Lead may pause or resume a Salesperson in
their own team, and a Team Lead may be paused or resumed only by their
reporting Manager or by an Admin. It withholds a person from automatic
distribution only, and never from an authorized manual or direct
assignment. See Sections 2.4 and 189.1.

**Pending action-level decisions**

V1 uses a **fixed, development-defined permission model.** The detailed
action-by-action permission matrix has not been finalized. It will be
agreed with A&S Fincare during development, approved before security
implementation and UAT, and then encoded as fixed application rules.

It is not, and will never become, an administrator-facing screen. The
CRM provides no custom-role builder, no editable role definition, no
permission matrix editor and no per-user override.

The following action-level decisions are outstanding. They are recorded
here so they are visible to implementers. They are not settings that an
Admin can configure in the CRM, and no answer should be assumed until it
is confirmed.

> • Whether Admin and Manager may create a Lead or Customer directly,
> and if so, which Team Lead or Salesperson the new record must be
> assigned to at creation. *Pending client confirmation before security
> implementation and UAT.*
>
> • Which roles may import data, and which roles may export data.
> *Pending client confirmation before security implementation and UAT.*
>
> • Which roles may send controlled bulk WhatsApp and bulk Email
> messages. *Pending client confirmation before security implementation
> and UAT.*
>
> • Which roles may archive and restore Leads, Customers and related
> operational records. *Pending client confirmation before security
> implementation and UAT.*
>
> • Which roles may upload, replace or remove policy documents. *Pending
> client confirmation before security implementation and UAT.*
>
> • Which roles may export report data. *Pending client confirmation
> before security implementation and UAT.*
>
> • Which supervisory role is responsible for unassigned WhatsApp
> conversations, and within what response expectation. *Pending client
> confirmation before security implementation and UAT.*

Once confirmed, each decision is implemented as fixed application
behaviour for the relevant role. Later changes require a reviewed
application change/change-control process.

These items are also listed in the consolidated register in
Section 212, together with every other decision still pending.


**189. Lead Assignment**

Navigation:

Settings → Lead Assignment

Controls how a new Lead receives a Record Owner.

A Lead's Record Owner is always a **Team Lead or Salesperson**. Admins
and Managers can never be a Lead's Record Owner, whether by manual
selection, automatic assignment, import or reassignment. See Section 2.5.

**Supported V1 modes**

**Manual**

An authorized user selects the Record Owner.

The selectable users are limited to the Team Leads and Salespersons the
acting user is permitted to assign to:

> • a Team Lead may assign within their own team
>
> • a Manager may assign within their own reporting hierarchy
>
> • an Admin may assign anywhere in the organization

A supervisor who performs an assignment does not become the owner.

**Automatic — team round robin**

Automatic assignment is always scoped to one team. It never selects a
user outside the destination team.

## 189.1 Team Round Robin

**Team selection comes first**

Automatic assignment begins only after a destination team has been
selected. There is no organization-wide rotation and no rotation that
spans teams.

A destination team may be selected through:

> • authorized manual Lead creation
>
> • bulk import
>
> • an authorized reassignment flow
>
> • another approved Lead-ingestion flow

The WhatsApp unknown-contact flow is **not** one of these. A Lead created
from an unknown WhatsApp conversation is assigned **directly** to the
active Team Lead selected by the acting Admin or Manager, and does not
enter the team's round-robin pool. See Section 101.

**Eligible pool**

For the selected team, the eligible automatic recipients are:

> • the team's active Team Lead, when not paused from round robin
>
> • the team's active Salespersons who are not paused from round robin

Automatic eligibility therefore requires a user to be **active and not
paused from round robin**.

The active Team Lead participates in the rotation on the same basis as
the active Salespersons, because a Team Lead may personally work Leads
and close sales.

The following are never eligible recipients:

> • Admin
>
> • Manager
>
> • inactive users
>
> • users paused from round robin
>
> • any user belonging to another team

**Pause from round robin**

A Team Lead or Salesperson may be paused from automatic round-robin
assignment, and later resumed.

Authority to pause and resume:

> • A Team Lead may pause or resume a Salesperson belonging to their own
> team.
>
> • A Team Lead may be paused or resumed only by the Manager to whom that
> Team Lead reports, or by an Admin.

Effect of a pause:

> • Pausing affects only automatic team round-robin Lead assignment.
>
> • A paused person remains an active CRM user.
>
> • A paused person retains every Lead, Customer, Customer Purchase,
> WhatsApp conversation, follow-up, renewal and other assigned record
> they already hold.
>
> • Existing records must never be reassigned merely because their owner
> has been paused.
>
> • A paused person may still receive a Lead through an authorized manual
> assignment. Direct assignment to a specific active Team Lead or
> Salesperson remains permitted even when that person is paused from
> round robin.
>
> • New automatic round-robin assignments skip every paused member.

Resuming:

> • When resumed, the person becomes eligible for future round-robin
> assignments again.
>
> • Resuming does not retroactively allocate Leads that were skipped
> while the person was paused.

Safety:

> • If every otherwise eligible member of a team is paused, that team has
> no eligible automatic round-robin recipient, and the empty-pool
> behaviour defined below applies unchanged.
>
> • Pausing must never cause assignment to spill into another team, and
> must never cause a fallback to an Admin or a Manager.
>
> • Pause and resume must be authorized on the server, and each action is
> recorded in audit history. See Section 208.

The interface term is **Pause from round robin**, never the ambiguous
"Pause user".

The distinction from deactivation is exact:

> • An **inactive** user cannot receive automatic or manual operational
> assignments at all.
>
> • A user who is **active but paused from round robin** is skipped by
> automatic round robin, and may still receive an authorized manual or
> direct assignment.

**Batch size**

Admin configures a round-robin **batch size for each team**. The batch
size determines how many consecutive Leads one eligible team member
receives before assignment rotates to the next eligible member of the
same team.

Example, for one team with batch size 1:

> Team: Kochi Health Team
>
> Eligible: Arun (Team Lead), Sneha (Salesperson), Joseph (Salesperson)
>
> Lead 1 → Arun
>
> Lead 2 → Sneha
>
> Lead 3 → Joseph
>
> Lead 4 → Arun

The same team with batch size 10:

> Leads 1–10 → Arun
>
> Leads 11–20 → Sneha
>
> Leads 21–30 → Joseph
>
> Leads 31–40 → Arun

Rules:

> • Rotation stays entirely inside the selected team.
>
> • Each team has its own batch size and its own rotation position.
>
> • A member paused from round robin is skipped, and rotation moves to
> the next member who is active and not paused.
>
> • Admin and Manager never enter the rotation.
>
> • A batch size of zero or a negative value must not be accepted.
>
> • Changing the batch size or the eligible members affects future
> automatic assignments only. Existing Lead ownership is never
> rewritten.
>
> • Batch configuration is an assignment rule, not a security
> permission. Configuring it does not change any role's visibility or
> authorization.

The default batch size and the maximum permitted batch size are *pending
client confirmation*.

**Empty or unavailable team pool**

If the selected team has no eligible automatic recipient — because every
otherwise eligible member is inactive or paused from round robin —
automatic assignment must fail safely and visibly.

> • The Lead must not be assigned to an Admin or a Manager.
>
> • The Lead must not be assigned to a user from another team.
>
> • The system must not invent a fallback owner.
>
> • The condition must be surfaced to an authorized supervisor rather
> than being silently ignored.

Whether the Lead remains Unassigned against the destination team, or
triggers another escalation flow, is *pending client confirmation*.

**Unassigned Leads**

Unassigned Leads remain visible to the Admins and Managers whose scope
covers the destination team, and to that team's Team Lead, under
Section 2.3.

**Auditability**

Automatic assignment, manual assignment and every reassignment are
auditable actions. Detailed audit-history requirements are defined in
Section 208.

Action-level questions about which roles may perform which assignment
operations remain governed by the pending fixed permission matrix in
Section 188.


**190. Lead Sources**

Navigation:

Settings → Lead Sources

Admin can manage the Lead Source options used across A&S Fincare.

Example options:

> • Website
>
> • Referral
>
> • Walk-in
>
> • Campaign
>
> • Existing Customer
>
> • Other

These are examples. A&S Fincare's actual sources are entered by Admin.

Actions:

> • Add
>
> • Rename
>
> • Reorder
>
> • Deactivate
>
> • Reactivate

Deactivating a source prevents future selection but retains existing
Lead history, and Leads that already hold the value continue to display
it correctly.

Lead Source is configurable business data. Configuring it does not change
any role's visibility, ownership or authorization. See Section 2.6.

Lead Source is available as a reporting dimension, as defined in
Section 171.
**191. Pipeline**

Navigation:

Settings → Pipeline

Admin can:

> • Add Stage
>
> • Rename Stage
>
> • Reorder Stages
>
> • Deactivate Stage

Won and Lost remain outcome states.

If active Leads are currently using a stage, those Leads must be moved
before the stage can be deactivated.

Historical stage information must be retained.

Pipeline stage describes **where a Lead is in the sales process**. It is
a different field from Lead Priority, which describes **how urgent or
promising the Lead is**. The two are configured separately, stored
separately and never substituted for one another. See Section 192.

**192. Lead Priority**

Navigation:

Settings → Lead Priority

Lead Priority is a first-class field on every Lead. It is separate from
pipeline stage and must never be merged with it or presented as a stage.

**Initial values**

> • Hot
>
> • Warm
>
> • Cold

These are the initial active values. They are configurable data, not
fixed constants.

**Admin configuration**

Admin can:

> • Add a priority value
>
> • Rename a priority value
>
> • Reorder priority values
>
> • Deactivate a priority value
>
> • Reactivate a priority value

Configuring Lead Priority values is **configurable business data**. It
does not change any role's visibility, ownership or authorization, and
must never be presented as a permission setting. See Section 2.6.

**Rules**

> • Every Lead has exactly one current priority.
>
> • Priority is independent of pipeline stage. A Lead may be Hot at any
> stage, and moving stage does not change priority.
>
> • Deactivating a priority value prevents it from being selected for
> new Leads and for future priority changes. It must not be silently
> erased from Leads that already hold it, and it must continue to
> display correctly on those Leads and in history.
>
> • Priority changes are recorded in the Lead's activity history and are
> auditable actions. Detailed audit-history requirements are defined in
> Section 208.
>
> • Priority visibility follows the reporting hierarchy in Section 2.3,
> exactly as for the Lead itself. Priority never widens who can see a
> Lead.

**Where priority must be available**

> • Add Lead — Section 38
>
> • Edit Lead
>
> • Lead Detail and Lead Information — Sections 41 and 43
>
> • Leads list column, filter and sort — Section 37
>
> • Lead Pipeline cards — Section 39
>
> • Lead Pipeline dashboard widget — Section 21
>
> • Dashboards
>
> • Reports
>
> • Lead import mapping
>
> • Lead export

Reporting, import and export detail for Lead Priority is defined in
Sections 171, 149 and 163. This section defines the field itself.


**193. Product Catalogue**

Navigation:

Settings → Product Catalogue

The catalogue is the shared reference data describing what A&S Fincare
distributes. It has three levels, defined in Section 66:

> • Product Category
>
> • Provider
>
> • Plan / Sub-product

A Customer Purchase records that a Customer acquired one specific
Plan/Sub-product. The catalogue itself holds no customer data.

**General rules**

> • Catalogue records are reference data. They are never the Record
> Owner or assignee of an operational record.
>
> • Catalogue visibility is not restricted by the reporting hierarchy;
> every role needs to read the catalogue to do their work. The
> operational records that reference it remain restricted under
> Section 2.3.
>
> • Deactivating a catalogue record prevents future selection. It must
> not delete, alter or invalidate existing Customer Purchases, their
> Closed Amount, their documents or their history.
>
> • Admin-defined custom fields are **not** available on catalogue
> records. Custom fields apply only to Leads, Customers and Customer
> Purchases. See Section 194.
>
> • The catalogue does not define provider integrations. V1 does not
> connect to any provider system.

## 193.1 Product Categories

A Product Category is the broad class of insurance product, for example
Health Insurance or Motor Insurance.

Fields:

> • Category Name — required
>
> • Description — optional
>
> • Status — Active / Inactive

Actions:

> • Add
>
> • Rename
>
> • Reorder
>
> • Deactivate
>
> • Reactivate

A Product Category may contain Plans from multiple Providers.

A Category cannot be deactivated while it has active Providers or Plans
still available for selection. Those must be deactivated first.

## 193.2 Providers

A Provider is the insurer or issuing company whose products A&S Fincare
distributes, for example Star Health.

Fields:

> • Provider Name — required
>
> • Product Categories the Provider operates in
>
> • Reference / code, where A&S Fincare uses one — optional
>
> • Description — optional
>
> • Status — Active / Inactive

Actions:

> • Add
>
> • Edit
>
> • Deactivate
>
> • Reactivate

A Provider may offer multiple Plans, across more than one Product
Category.

Deactivating a Provider prevents its Plans from being selected for new
Customer Purchases. Existing purchases are unaffected.

## 193.3 Plans / Sub-products

A Plan is the specific named product a Customer can buy, for example
Family Health Optima.

Fields:

> • Plan Name — required
>
> • Product Category — required
>
> • Provider — required
>
> • Description — optional
>
> • Required policy documents — see Section 193.4
>
> • Status — Active / Inactive

Actions:

> • Add
>
> • Edit
>
> • Deactivate
>
> • Reactivate

Each Plan belongs to exactly one Product Category and exactly one
Provider.

A Customer Purchase always references a Plan. A Customer never purchases
a Product Category or a Provider directly.

Deactivating a Plan prevents it from being selected for new Customer
Purchases. Existing purchases keep their Plan reference, their history
and their renewal cycles.

The names used above are examples of the shape of the data. They are not
a fixed or seeded catalogue. A&S Fincare's actual categories, providers
and plans are entered by Admin.

## 193.4 Required Policy Document Definitions

Each Customer Purchase has a checklist of required policy documents,
used to gate the `Closed/Active` status as defined in Section 68.1.

The requirement at purchase level is fixed:

> • a Customer Purchase must know which policy documents are required
> for it
>
> • it must know which of those are present and which are missing
>
> • it cannot be marked `Closed/Active` while any required document is
> missing

**Pending client confirmation**

These questions are collected in the consolidated register in
Section 212.

The administrative level at which the required-document list is
maintained is not yet decided. It may be defined per Product Category,
per Provider, per Plan, per individual purchase, or as a combination.
This is *pending client confirmation*.

Until it is confirmed, the specification requires only that each
Customer Purchase resolves to a definite list of required documents and
reports its completeness. Implementation must not assume a particular
administration level.


**194. Custom Fields**

Navigation:

Settings → Custom Fields

Admin can create additional fields for exactly three record types:

> • Lead
>
> • Customer
>
> • Customer Purchase

**Scope of custom fields**

Custom fields are supported for these three record types only. They are
not available on Product Categories, Providers, Plans/Sub-products,
teams, users, follow-ups, renewals, conversations or any other record
type, and they are never used to define roles or permissions.

Each definition belongs to exactly one supported record type, and its
values are stored on individual records of that type.

Custom fields are configurable business data. A custom field cannot
change a record's visibility, ownership or authorization. See
Section 2.6.

Supported V1 types:

> • Text
>
> • Number
>
> • Date
>
> • Dropdown
>
> • Checkbox

Fields:

> • Field Name
>
> • Applies To — Lead, Customer or Customer Purchase
>
> • Field Type
>
> • Required
>
> • Dropdown Options, where applicable

Actions:

> • Add
>
> • Edit
>
> • Reorder
>
> • Deactivate
>
> • Reactivate

**Validation**

Values are validated according to the field type: a Number field must
contain a valid numeric value, a Date field a recognizable date, and a
Dropdown field an allowed option or a value flagged for review. The same
validation applies whether the value is entered in the interface or
supplied by an import.

**Visibility and authorization**

A custom field value is part of the record that holds it. It follows that
record's visibility under Section 2.3 and is never visible to a user who
cannot see the record. A user who can see a record but whose fixed role
does not permit editing it cannot edit its custom fields either.

**Import and export**

Configured custom fields appear on relevant Add/Edit screens and in
import column mapping, as defined in Section 151. Custom field values are
included in exports only within the requesting user's authorized scope,
as defined in Sections 162 and 163.

**Reporting**

Custom fields are available as reporting dimensions only where this
specification explicitly supports it. They are not automatically added to
every report, filter or breakdown.

**Historical safety**

> • Deactivating a field must retain existing stored values, and those
> values must remain readable on the records that hold them.
>
> • Removing a used Dropdown option prevents future selection but
> retains existing values.
>
> • Making an existing custom field Required does not invalidate
> existing records that do not yet contain a value.
>
> • Renaming a field must not rewrite historical activity or audit
> entries that recorded the previous name.

Changes to custom-field definitions are significant configuration
changes and are auditable. See Section 208.
**195. Reminder Settings**

Navigation:

Settings → Reminder Settings

Admin configures the default renewal reminder schedule used when a new
reminder schedule is created for a Customer Purchase.

Example schedule:

> • 30 days before
>
> • 7 days before
>
> • 1 day before

For each reminder, select:

> • In-app
>
> • WhatsApp
>
> • Email

These defaults apply when new reminder schedules are created.

Authorized users may override them for an individual Customer Purchase.

Changing the default must not silently modify reminder schedules already
created for existing records.

WhatsApp can be selected as a reminder channel only when an active
WhatsApp connection and an eligible message template are available. If
the connection or required template is unavailable, the configuration
must clearly show that automated WhatsApp sending cannot operate until
the issue is resolved. Existing configuration must not be silently
replaced or changed.

Email may be selected only when a verified sender and an active reminder
template are available.

If the sender or required template is unavailable, the configuration should clearly show that automated Email sending cannot operate until the issue is resolved. Existing configuration must not be silently replaced or changed.

The example schedule above is illustrative. The reminder schedules A&S
Fincare will actually use are *pending client confirmation*.

## 195.1 Renewal Automation

Renewal tracking and automatic renewal reminders are part of V1. They
are not an optional feature and cannot be switched off as a module.

**Required behaviour**

> • Renewal information is held against the relevant Customer Purchase,
> not against the Customer as a whole.
>
> • The system identifies upcoming and overdue renewals and presents
> them in the due and overdue work views defined in Section 70.
>
> • The system sends renewal reminders automatically through the
> configured communication channels when a scheduled reminder time is
> reached.
>
> • Internal in-app alerts and notifications are raised for the
> responsible user.
>
> • Authorized users may still send a manual reminder, as defined in
> Section 75.
>
> • Every reminder attempt and its outcome is recorded against the
> Customer Purchase and the Customer activity timeline.

**Delivery integrity**

These rules are mandatory and must not be relaxed:

> • A failed send must never be shown as successful.
>
> • A failed reminder must be recorded as failed, with the available
> reason, and surfaced to the appropriate user.
>
> • A reminder instance must not be sent twice because of a retry, a
> page refresh or a repeated background-job execution.
>
> • A failed reminder does not silently become sent later; only a
> successful retry or send changes its outcome.

The existing retry and idempotency protections defined in the WhatsApp
and Email chapters are preserved unchanged.

**Platform rules**

> • Automatic WhatsApp reminders must respect Meta platform rules,
> including template eligibility, messaging eligibility, consent and
> opt-out.
>
> • Automatic Email reminders must respect sender verification, active
> template requirements and opt-out.
>
> • A recipient who has opted out of a channel must be excluded from
> automated sending on that channel.

**Access**

Renewal views, alerts and reminder history follow the reporting
hierarchy in Section 2.3. A user sees renewals for Customer Purchases
within their permitted scope only.

**Pending client confirmation**

These questions are collected in the consolidated register in
Section 212.

> • exact reminder schedules
>
> • channel order or preference when more than one channel is configured
>
> • reminder template content
>
> • escalation rules when a renewal becomes overdue with no response
>
> • retry timing and the number of retries
>
> • consent handling details
>
> • opt-out handling details
>
> • who is operationally responsible for overdue renewals

The detailed WhatsApp and Email delivery workflows are defined in their
own chapters and are not restated here.


**196. WhatsApp Settings**

Navigation:

Settings → WhatsApp

V1 supports:

**One WhatsApp business messaging connection/number for A&S Fincare.**

The connection belongs to the organization. Every team uses the same
number; there is no per-team, per-Manager or per-user number.

Show:

> • Connection Status
>
> • Connected Number
>
> • available account/business information
>
> • available templates

Connection states:

> • Not Connected
>
> • Connected
>
> • Connection Problem

Actions:

> • Connect WhatsApp
>
> • Manage / Reconnect
>
> • Disconnect

Disconnecting WhatsApp requires confirmation and does not delete
existing conversation history.

A shared organization number does not widen who can read a conversation.
Conversation visibility always follows Section 89.1, regardless of the
fact that all messages arrive on one number.


**197. WhatsApp Templates**

Navigation:

Settings → WhatsApp Templates

Admin can view the templates available to the CRM.

Show:

> • Template Name
>
> • Language
>
> • Status
>
> • Purpose/Category where available

Statuses may include:

> • Approved
>
> • Pending
>
> • Rejected
>
> • Unavailable

Only templates that are currently approved and eligible under Meta rules
may be selected for sending.

V1 template management means **viewing/syncing available templates and
using them inside the CRM**. It does not reproduce the complete WhatsApp
template creation and approval system. Where creation, approval or
platform-level editing must occur in the connected WhatsApp platform,
the CRM directs the administrator there rather than implying the action
completed locally.

Template administration is configurable business data. It does not
change any role's visibility, ownership or authorization, and must never
be presented as a permission setting. See Section 2.6.

Available variables are listed in Section 98.


**198. Email Settings**

Navigation:

Settings → Email

Admin configures the single A&S Fincare Email sender identity.

Show:

> • Sender Name
>
> • Sender Email Address
>
> • Sending Domain
>
> • Reply-To Address
>
> • Verification Status
>
> • Provider Configuration Status

Actions:

> • Configure
>
> • Send Verification
>
> • Recheck Verification
>
> • Update

Changing or replacing a verified sender requires confirmation and does
not delete existing Email activity or template history.

Email service credentials and secrets must never be exposed to
client-side code, and must never be displayed in this screen, in logs or
in exported data. The screen shows configuration *state* only, never
secret values.

**Email is not an optional module**

Email is a required functional area of V1 and cannot be switched off.
This screen configures how Email sends; it does not decide whether the
Email module exists. A missing or unverified sender is a configuration
state that makes Email actions unavailable with an explanation. It does
not disable the module and must not block unrelated CRM functionality.


**199. Email Templates**

Navigation:

Settings → Email Templates

Admin can:

> • Add
>
> • Edit
>
> • Preview
>
> • Duplicate
>
> • Deactivate
>
> • Reactivate

Templates contain:

> • Template Name
>
> • Purpose
>
> • Subject
>
> • Message
>
> • Available Variables
>
> • Status

Only active templates may be selected for new messages or reminders.

Deactivating a template must not change previously sent Email history.

Email templates are configurable business data. Creating or editing a
template does not change any role's visibility, ownership or
authorization, and must never be presented as a permission setting. See
Section 2.6.

Available variables are listed in Section 128.


**200. Application Scope Is Fixed**

A&S Fincare V1 has a single defined product scope, listed in
Section 211. There is no Modules & Features screen, and no
administrator-facing switch that enables or disables a part of the
application.

The following are always present and cannot be turned off:

> • Leads
>
> • Customers
>
> • Customer Purchases
>
> • Follow-ups
>
> • Renewals & Reminders
>
> • WhatsApp
>
> • Email
>
> • Reports
>
> • Data Import & Export
>
> • Settings & Administration

What a given user sees of each area is determined by their fixed role and
their position in the reporting hierarchy, never by a module switch. See
Section 2.3.

**Configuration is not the same as scope**

Admin configures **business data** where this specification approves it —
teams and reporting lines, Lead Priority values, pipeline stages, the
product catalogue, required policy-document definitions, reminder
defaults, incentive rules, templates and the Email sender.

Admin does not configure **application scope** or **access control**.
Role capabilities, visibility rules and the presence of core
functionality are fixed by the application and changed only by a
reviewed application change and a new release.

Where a capability appears unavailable, it is because its configuration
is incomplete or the user's role does not permit it — not because a
module was switched off. Configuration dependencies are defined in
Section 201.
**201. Configuration Dependencies and Implementation Constraints**

Some capabilities depend on configuration being complete, or on an
external platform being available. These are **implementation
constraints**, not administrator-facing toggles. An Admin cannot switch
a capability off; they can only leave its configuration incomplete, and
the application must then explain what is missing.

**Configuration-state dependencies**

> • **Automatic WhatsApp renewal reminders** require an active WhatsApp
> connection and an eligible approved message template.
>
> • **WhatsApp sending** requires an active WhatsApp connection.
>
> • **Email sending** requires a verified A&S Fincare Email sender.
>
> • **Automatic Email renewal reminders** require a verified sender and
> an active Email template.
>
> • **Controlled bulk Email reminders** require a verified sender and an
> active Email template.
>
> • **Renewal reminders for a Customer Purchase** require a Renewal Date
> and a reminder schedule.
>
> • **A Customer Purchase** requires an active Plan/Sub-product in the
> catalogue, which in turn requires its Provider and Product Category.
>
> • **Marking a Customer Purchase `Closed/Active`** requires its
> required policy documents to be complete.
>
> • **Automatic Lead assignment** requires a destination team with at
> least one recipient who is active and not paused from round robin.
>
> • **Incentive calculation** requires configured slabs and rules, and
> eligible Closed Amount from `Closed/Active` purchases.

**Required behaviour when configuration is incomplete**

> • The affected action is unavailable and the interface explains
> precisely what is missing and who can resolve it.
>
> • Unrelated CRM functionality continues to work normally.
>
> • Nothing is silently skipped. An action that could not be performed
> is never recorded as performed.
>
> • Existing data and history are never deleted or altered because
> configuration became incomplete.
>
> • Restoring the configuration restores the capability. It does not
> retroactively perform actions that were missed while it was
> incomplete.

**Deactivating configuration data**

Deactivating a catalogue entry, Lead Priority value, pipeline stage or
custom field prevents future selection. It never removes, rewrites or
invalidates existing records, their history or their audit entries. See
Section 207.
**202. Data Import / Export**

Navigation:

Settings → Data Import / Export

Provides access to the import/export functionality defined in the Data
Import & Export chapter.

Show:

> • Import Leads
>
> • Import Customers
>
> • Import History, including the assignment strategy used for each
> import
>
> • permitted Export actions

This screen should reuse the existing import/export workflow rather than
duplicate it, and is subject to the same hierarchy scope and role rules
defined in Sections 162 and 166.
**203. Important Settings Behaviour**

Significant administrative actions require confirmation, including:

> • deactivate user
>
> • change user role
>
> • change a team's Team Lead
>
> • move a team to another Manager
>
> • change a user's team
>
> • change a team's round-robin batch size
>
> • deactivate pipeline stage
>
> • deactivate or rename a Lead Priority value
>
> • deactivate a Product Category, Provider or Plan/Sub-product
>
> • change required policy-document definitions
>
> • change incentive rules or slabs
>
> • disconnect WhatsApp
>
> • change or remove the verified Email sender

Configuration changes should stop or affect **future use without
deleting historical CRM data** unless explicitly stated otherwise.

Confirmation must explain the consequence. Where a change affects who
can see existing records — for example moving a team to another Manager
— the confirmation must say so.

Users should only see settings and actions their fixed role permits.
Hiding a setting is not authorization; the server must enforce it.

Significant configuration changes are auditable. See Section 208.
**204. Notifications**

Notifications alert users about CRM activity that requires attention.

Navigation:

Top Bar → Notifications

Show:

> • Notification
>
> • Related Lead / Customer / Customer Purchase / Activity
>
> • Date / Time
>
> • Read / Unread status

Newest notifications appear first.

**V1 Notification Triggers**

> • Lead / Customer assigned to you
>
> • Customer Purchase assigned to you
>
> • Follow-up due / overdue
>
> • Renewal due / overdue
>
> • new WhatsApp reply
>
> • WhatsApp conversation assigned
>
> • unassigned WhatsApp conversation awaiting assignment — Admins and
> Managers only
>
> • WhatsApp message / scheduled reminder failed
>
> • bulk WhatsApp send completed / partially failed
>
> • Email message or scheduled Email reminder failed
>
> • Email bounced
>
> • controlled bulk Email reminder completed or partially failed
>
> • Email sender requires administrator attention
>
> • required policy documents outstanding on a Customer Purchase
>
> • import completed / failed
>
> • role, team or reporting-line change affecting you

Notifications should be sent only to the relevant user, such as the
assigned operational owner or the user who initiated the action.

**Scope**

Notification content and delivery follow the reporting hierarchy in
Section 2.3. A notification must never reveal a record, customer name,
message content or figure outside the recipient's permitted scope,
including in its title, preview text or badge count. Unread counts are
scoped the same way.

Opening a notification must reauthorize access on the server. If the
user's access changed after the notification was created, the
destination must deny access safely and explain that the item is no
longer available, without disclosing where it went or what it contained.

Selecting a notification should open the relevant CRM record, activity
or result where possible.

New notifications are **Unread**. Opening them marks them as **Read**.

Actions:

> • Mark as Read
>
> • Mark All as Read

The CRM should avoid duplicate notifications for the same event and
should not notify users for routine successful actions that do not
require attention.

Mobile should support the same notification list, with links opening the
relevant mobile screen where available. Mobile enforces the same scope
as desktop.

V1 notifications are in-app only. Installing the CRM as an application
does not enable operating-system push notifications. Web Push and
scheduled background notifications are outside V1.
**205. Policy Documents**

Documents in V1 are **policy-related documents** belonging to a Customer
Purchase.

Documents are available from the Customer Purchase Detail screen and are
summarised on the Customer Profile.

**Scope of V1**

V1 covers documents relating to the policy or product purchased, for
example the policy schedule, the policy certificate, the proposal or
application form, and endorsement or renewal documents. The exact
required set per plan is configured as described in Section 193.4.

V1 does **not** require:

> • personal identity documents
>
> • KYC documents
>
> • general personal documents unrelated to the policy
>
> • document approval
>
> • document review or approval queues

Personal and KYC document handling is outside this requirement. If A&S
Fincare later needs it, it is a separate approved change.

Show:

> • Document Type — the required document this file satisfies, where
> applicable
>
> • File Name
>
> • File Type
>
> • Uploaded By
>
> • Uploaded Date
>
> • Related Customer Purchase
>
> • Actions

Actions:

> • Upload
>
> • View
>
> • Download
>
> • Replace
>
> • Delete / Archive

Documents must remain available when a Customer or Customer Purchase is
archived. Uploaded policy documents are retained for future reference.

V1 does not include:

> • document versioning
>
> • approval workflows
>
> • e-signature
>
> • document collaboration
>
> • complex folder structures

**Documents are not required for a Lead**

Documents are not collected while a person is still a Lead, and no
document is required in order to convert a Lead into a Customer or to
create a Customer. See Sections 52 and 60.

**Relationship to purchase closure**

A Customer Purchase cannot be marked `Closed/Active` until every
required policy document for that purchase has been uploaded. Uploading
the required documents is sufficient; no approval step follows. This is
defined in Sections 68.1 and 68.2.

**Access**

Document visibility and actions follow the reporting hierarchy in
Section 2.3. A user who cannot see the Customer Purchase cannot see,
download or act on its documents. Access must be enforced server-side;
hiding an upload or download control is not authorization.

Document uploads, replacements and removals are auditable actions.
Detailed audit-history requirements are defined in Section 208.

Which roles may upload, replace or remove policy documents is *pending
client confirmation before security implementation and UAT* and is
listed in Section 188.

**206. Performance and Incentive Engine**

V1 includes a configurable incentive engine. It calculates incentives
from the Closed Amount of qualifying Customer Purchases, using
configurable achievement slabs and rules.

This section defines what the engine must do. The business values it
operates on are not yet confirmed and are listed at the end of this
section.

**Inputs**

The engine records and uses the eligible **Closed Amount** of qualifying
Customer Purchases, as defined in Section 68.3. A purchase contributes
only once it is `Closed/Active`, which in turn requires its required
policy documents to be complete.

**Aggregation**

The engine must aggregate eligible Closed Amount by:

> • Salesperson
>
> • Team Lead
>
> • team
>
> • Manager
>
> • reporting period

**Personal production and hierarchical roll-ups are different figures**

The specification must keep these distinct everywhere they appear:

> • **Salesperson production** — eligible Closed Amount from purchases
> that Salesperson owns.
>
> • **Team Lead personal production** — eligible Closed Amount from
> purchases the Team Lead personally owns. A Team Lead may personally
> work Leads and close sales.
>
> • **Team total** — the team's combined eligible Closed Amount: the
> Team Lead's personal production plus that of the Salespersons in the
> team.
>
> • **Manager branch total** — the combined eligible Closed Amount of
> all teams in that Manager's reporting hierarchy.
>
> • **Organization total** — the combined eligible Closed Amount across
> the organization, visible to Admin.

A Team Lead's personal production must never be presented as, or merged
into, their team total without being separately identifiable. A Manager
or Admin total is a supervisory roll-up: Managers and Admins do not own
Customer Purchases and have no personal production. See Section 2.5.

**Configuration**

The engine must support:

> • configurable achievement slabs
>
> • configurable incentive rules
>
> • configurable reporting periods

Incentive rules and slabs are **configurable business data**. Configuring
them does not change any role's visibility, ownership or authorization,
and must never be presented as a permission setting. See Section 2.6.

**Calculation and traceability**

The engine must calculate an incentive result and retain enough
information to explain it. For any result, an authorized user must be
able to see:

> • which Customer Purchases were counted as eligible
>
> • the eligible Closed Amount contributed by each
>
> • the reporting period used
>
> • the slab and rule that produced the result
>
> • the rule version in force when the result was calculated
>
> • when the calculation ran

A result whose inputs later change must be recalculable, and a
recalculation must not silently overwrite the record of the previous
result.

**Visibility**

Incentive figures follow the reporting hierarchy in Section 2.3:

> • A Salesperson sees their own production and their own incentive
> result.
>
> • A Team Lead sees their own production and result, and their team's.
>
> • A Manager sees their own reporting branch.
>
> • Admin sees the organization.

A Manager must not see another Manager's branch, and a Team Lead must
not see another Team Lead's team, including through a comparison,
ranking, benchmark, percentage or denominator.

**Reporting**

Incentive and performance figures must be available through the Reports
module. Report layouts, filters and exports are defined in Sections
176 and 177.

**Not in scope**

The engine is not a payroll or accounting module. V1 does not include
salary processing, tax handling, statutory deductions or ledger
integration.

**Pending client confirmation**

These questions are collected in the consolidated register in
Section 212.

The following are *pending client confirmation before security
implementation and UAT*. No value, formula or rule should be assumed or
illustrated until confirmed:

> • incentive formulas
>
> • incentive percentages
>
> • slab thresholds and the number of slabs
>
> • which Customer Purchases qualify
>
> • eligibility dates and how they are determined
>
> • reporting periods and period cut-offs
>
> • how Team Lead incentives are calculated, including the treatment of
> personal production versus team total
>
> • how Manager incentives, if any, are calculated
>
> • cancellation, lapse, refund and reversal handling, and its effect on
> a previously calculated result
>
> • approval of calculated incentives
>
> • payment timing and payment status workflow
>
> • whether a rule change applies retrospectively
>
> • which role may configure incentive rules and slabs

Until these are confirmed, the specification defines the engine's
required capability only. It does not define its arithmetic.


**207. System-Wide Behaviour**

The following rules apply across the CRM and should be interpreted
consistently in all modules.

**Record Responsibility**

> • Leads and Customers use **Record Owner**.
>
> • Follow-ups, Renewal actions and WhatsApp conversations use
> **Assigned To**.
>
> • A Customer Purchase belongs to a Customer and has its own
> responsible operational user, which may differ from the Customer's
> Record Owner.
>
> • **Record Owner and Assigned To may only ever be a Team Lead or a
> Salesperson.** Admins and Managers are supervisory and are never
> operational owners or assignees. See Section 2.5.
>
> • Operational actions may initially inherit the related
> Lead/Customer's Record Owner. Follow-up and renewal work defaults to
> that permitted operational owner unless it is reassigned under the
> rules in Sections 55 and 71.
>
> • Changing **Assigned To** does not change the Lead/Customer's
> **Record Owner**.

**Visibility, supervision, authorization and ownership are four
different things**

These must not be conflated anywhere in the specification:

> • **Visibility** — whether a user can see a record. Determined by the
> reporting hierarchy in Section 2.3.
>
> • **Supervision** — a supervisory role's legitimate interest in work
> below them. Carries visibility and reporting roll-up, nothing more.
>
> • **Authorization to act** — whether a user's fixed role permits a
> specific action on a record they can see. Visibility alone does not
> grant it.
>
> • **Operational ownership** — who is responsible for the record.
> Restricted to Team Leads and Salespersons.

A supervisory action never silently transfers ownership. When an Admin
or Manager assigns, reassigns, replies, uploads, sends or edits within
their permitted scope, ownership remains with the operational user, and
the action is recorded against the person who performed it.

**Deactivation / Disabling**

When a User, Pipeline Stage, Lead Priority value, catalogue entry or
Custom Field is deactivated:

> • future use is restricted as defined in the relevant section
>
> • existing data is retained
>
> • historical activity is not deleted or rewritten
>
> • historical records that reference the deactivated item remain
> readable and continue to display it correctly

Core application areas are not administrator-disableable. See
Section 200.

**Permissions**

Users should only see records and actions they are permitted to access.

Role capabilities are fixed by the application and are not configurable
in the CRM. See Sections 2.6 and 187.

Permissions must be enforced on the server for every read and every
write, not only by hiding UI controls.

**Significant Actions**

Actions with meaningful consequences should require confirmation.

Examples include:

> • archiving records
>
> • deactivating users
>
> • changing a user's role
>
> • changing a team's Team Lead or reporting Manager
>
> • disconnecting WhatsApp
>
> • changing the verified Email sender
>
> • marking a Customer Purchase `Closed/Active`
>
> • changing incentive rules
>
> • controlled bulk Email reminders
>
> • bulk messaging
>
> • major data import

Confirmation should explain what will happen rather than displaying only
a generic **Are you sure?**

**Historical Data**

Changes to current configuration should not rewrite past CRM history.

For example:

> • changing Record Owner should not remove previous ownership history
>
> • deactivating a user should not remove their name from past activity
>
> • changing reminder defaults should not alter completed reminders
>
> • deactivating a catalogue entry should not remove or invalidate
> existing Customer Purchases
>
> • renaming or deactivating a Lead Priority value should not rewrite
> the priority recorded in past activity or audit entries

**208. Audit History**

Sensitive business actions must be recorded in an **append-only** audit
history. Audit entries are written by the application and are never
edited or deleted through ordinary CRM use. No user role, including
Admin, is given an interface to alter or remove an audit entry.

**Actions that must be audited**

> • Lead assignment and reassignment, including automatic round-robin
> assignment and direct assignment of a Lead created from an unknown
> WhatsApp conversation
>
> • Customer ownership changes
>
> • Customer Purchase ownership changes
>
> • WhatsApp conversation assignment and reassignment
>
> • team membership changes
>
> • reporting-line changes, including moving a team to another Manager
> or changing a team's Team Lead
>
> • role changes
>
> • user activation and deactivation
>
> • pausing a person from automatic Lead round-robin assignment, and
> resuming their round-robin participation. Each entry retains the
> acting user, the target user, the timestamp, the previous state, the
> new state and the relevant team and reporting scope
>
> • Lead Stage changes
>
> • Lead Priority changes
>
> • Customer Purchase status changes, including the transition to
> `Closed/Active`
>
> • required policy-document upload, replacement and removal
>
> • Closed Amount entry and changes
>
> • incentive-rule and slab changes, including their effective dates
>
> • incentive calculations, adjustments and reversals
>
> • renewal status changes and reminder schedule changes
>
> • import execution, including the assignment strategy used
>
> • significant configuration changes, including catalogue,
> Lead Priority, reminder defaults and Email sender changes

**What each entry retains**

As appropriate to the action:

> • actor — the user who performed it
>
> • timestamp
>
> • affected record
>
> • action performed
>
> • previous value
>
> • new value
>
> • reason or note, where the action requires one

Where an action was performed by a supervisory role on a subordinate
record, the entry records the acting user. It does not record them as
the record's owner.

**Visibility**

Audit history follows the fixed role model and the reporting hierarchy in
Section 2.3. A user may review audit entries only for records within
their permitted scope. Organization-wide audit review is not available to
every user.

Audit entries must not disclose data the viewer could not otherwise see.
An entry concerning a peer Manager's branch or a peer Team Lead's team
must not appear, and a previous-value or new-value field must not reveal
an out-of-scope user, team or record.

**Pending**

Which roles may review which audit scopes, and audit retention periods,
are *pending client confirmation*. See Section 212.
**209. Common UI States**

Where relevant, wireframes should account for:

> • Empty
>
> • Loading
>
> • Validation Error
>
> • Save / Processing Error
>
> • Permission Restricted
>
> • Disabled / Unavailable Action
>
> • Archived / Inactive Record
>
> • Integration Not Connected
>
> • Offline
>
> • Update Available

These states may appear as inline messages, banners, dialogs or disabled
controls depending on the screen.

**210. Desktop and Mobile Principle**

The **web application** is the complete CRM and administration
experience.

Salespersons and Team Leads work primarily from a phone. Admins and
Managers work from both desktop and mobile. Every role uses the same
application; the hierarchy and visibility rules in Section 2.3 apply
identically on both.

Mobile focuses on day-to-day operational work such as:

> • Dashboard
>
> • Leads
>
> • Customers
>
> • Follow-ups
>
> • initiating calls
>
> • recording call outcomes
>
> • completing Call follow-ups
>
> • scheduling the next follow-up
>
> • Renewals
>
> • WhatsApp
>
> • individual Email communication
>
> • Notifications

Configuration-heavy functions such as Users, Teams and reporting
hierarchy, Pipeline configuration, Custom Fields, Import/Export and
integration setup remain web-first.

Mobile layouts should simplify desktop tables into mobile-friendly cards
or lists rather than reproducing desktop layouts directly.

Email sender configuration, Email template administration and controlled bulk Email sending remain web-first.

The same web application may also be installed on a phone or tablet home
screen as a Progressive Web App. Installation changes how the CRM is
launched and presented. It does not change functionality, roles,
permissions or data access, and it does not relax the hierarchy-based
access control defined in Section 2.3. Progressive Web App behaviour is
defined in the following section.


## 210.1 Progressive Web App Behaviour

The CRM is delivered as a single web application that can also be
installed on a phone or tablet home screen as a Progressive Web App.

Installation changes only how the application is launched and presented.
It does not change functionality, roles, permissions, data access or the
hierarchy-based access control defined in Section 2.3.

The application must continue to work as a normal website when it has
not been installed. Installation is optional and must never be required
to use the CRM.

**V1 supports**

- installing the CRM on a supported phone or tablet home screen
- launching the CRM from an application icon
- standalone display without normal browser chrome
- the A&S Fincare application name, short name and application icons
- light and dark theme colours matching the application themes
- correct safe-area behaviour on devices with rounded corners, notches
  or home indicators
- guidance explaining how to install on Android and on iPhone
- a branded offline message when the device has no connection
- a controlled update path when a new application version is deployed

**V1 does not include**

- offline creation or editing of CRM records
- offline queuing of changes
- background synchronization
- conflict resolution
- offline access to customer, lead, renewal, document, email or report
  data
- Web Push notifications
- scheduled background notifications
- distribution through an application store
- a separate mobile application codebase

**Installed presentation**

An installed CRM uses the same responsive layouts, the same mobile
bottom navigation and the same drawer navigation defined elsewhere in
this specification. No separate installed-only screens are introduced.

Where the application is running in standalone display mode, the
interface may account for the absence of browser chrome, for example by
respecting device safe areas. It must not present different navigation,
different roles, different permissions or different functionality.

**Start URL and scope**

The application start URL and scope are origin-relative:

- start_url: "/"
- scope: "/"

The root route directs the user through the normal server-side
authentication flow and then to the dashboard for that user's role. The
installed application must not start at a role-specific or
permission-specific address, because no session exists at the time of
installation.

**Authentication in an installed application**

An installed CRM follows the same authentication and session policy as
the browser application. Users sign in normally and remain signed in
according to that policy.

Depending on the browser, operating-system version and installation
flow, the installed application may inherit the existing cookie session
or may require the user to sign in. Both paths must be tested and
handled correctly. Being asked to sign in once after installing is
expected platform behaviour and must be explained rather than treated as
an error.

**Offline behaviour**

When the device has no connection, the CRM shows a clear branded offline
message stating that a connection is required and offering to retry.

The offline experience must not display customer data, lead data,
renewal data, email content, reports, documents or any other operational
content. It must not imply that work performed offline will be saved.

**Calling from an installed application**

An installed PWA may initiate a normal cellular call through the native
phone interface, using the click-to-call behaviour defined in Sections
29–33.

- The PWA should preserve CRM context so the salesperson can return and
  record the outcome.
- Standalone PWA display does not mean that the cellular conversation
  itself remains inside the PWA. The phone's native call interface
  temporarily takes over.
- Click-to-call requires network access to load or update CRM data. The
  cellular call itself is handled by the device and the mobile carrier.
- V1 does not include offline call-outcome synchronization unless
  already explicitly approved elsewhere in this specification.

**Data and caching restrictions**

The CRM contains sensitive customer and financial information.

Authentication responses, tokens, cookies and session values must never
be written to Cache Storage or intentionally cached by the service
worker. Normal secure browser cookie storage may be used according to
the approved authentication and session policy.

The following must never be retained for offline use:

- authenticated application responses
- Lead, Customer, Customer Purchase, catalogue and renewal records
- email content, templates or recipient data
- documents and attachments
- reports and report exports
- any operational content belonging to a Lead, Customer, team or user

Only non-sensitive static application assets may be retained, to support
launching the application and displaying the offline message.

Cached static assets must never be used to reconstruct or infer data
that the signed-in user is not permitted to see under Section 2.3.

**Installation requirements**

Installation depends on the application being served over HTTPS, a valid
application manifest and valid application icons. These must be
validated independently of one another.

A service worker is not treated as a universal installation requirement.
In this product a service worker exists only to provide the restricted
offline fallback described above.

Automated tooling may be used as a supporting check, but the acceptance
test is actual installation and launch on supported Android and iPhone
devices.

**Application updates**

When a new application version is deployed, an installed CRM must be
able to obtain it. A user must not be left on an outdated version
indefinitely, and an update must never be applied in a way that loses
work in progress.

**Application identity and icons**

V1 installs the CRM under the A&S Fincare product identity. The
application name, short name, icons and offline message identify the
application as the A&S Fincare CRM.

- the approved A&S Fincare brand assets are used as supplied and must
  not be edited or redrawn
- a full wordmark must not be placed inside a square application icon
- separate normal and maskable icons are provided
- maskable icons respect the platform safe-zone padding so the symbol is
  not cropped on rounded or circular launcher shapes

Final icon artwork is produced from the approved A&S Fincare brand
assets during implementation. This specification does not define the
visual brand.


**211. V1 Scope Boundary**

Wireframes and implementation should include only the V1 functionality
defined in this specification.

**Confirmed V1 scope**

The following are committed V1 capabilities. They must not be treated as
deferred, optional or future work:

> • the four-role organizational hierarchy — Admin, Manager, Team Lead,
> Salesperson — with teams and reporting lines (Sections 2, 185, 185.1)
>
> • hierarchy-scoped visibility across dashboards, records, activity,
> reports, search, notifications and exports (Section 2.3)
>
> • fixed, development-defined role permissions (Sections 2.6, 187, 188)
>
> • Lead Priority as a field separate from Lead Stage (Section 192)
>
> • team-scoped round-robin Lead assignment with a per-team batch size
> (Sections 189, 189.1)
>
> • the insurance product catalogue — Product Category, Provider,
> Plan/Sub-product (Sections 66, 193)
>
> • Customer Purchases, including multiple purchases per Customer
> (Sections 65, 67, 68)
>
> • required policy documents as a prerequisite for `Closed/Active`
> (Sections 68.1, 68.2, 205)
>
> • Closed Amount recorded per Customer Purchase, with eligibility
> gated on `Closed/Active` (Section 68.3)
>
> • the configurable incentive engine (Section 206)
>
> • automatic renewal reminders (Sections 73, 195.1)
>
> • the hierarchy-aware WhatsApp shared inbox, including the rule that
> an unassigned conversation must be assigned to a Team Lead before it
> can be answered (Sections 89.1, 93, 93.1)
>
> • the outbound Email module (Sections 123–140)
>
> • bulk-import assignment, including assignment to a Team using that
> team's round robin (Sections 144, 152)
>
> • audit history for sensitive business actions (Section 208)

**Details pending client confirmation**

Certain values and rules inside the confirmed scope above are not yet
settled. The capability is committed; the specific values are not. These
are consolidated in Section 212 and must not be guessed at during
implementation.

**Explicitly excluded from V1**

Do not introduce:

> • complex workflow builders
>
> • advanced automation sequences
>
> • custom report builders
>
> • omnichannel inbox
>
> • ticketing/helpdesk
>
> • chatbot
>
> • multiple WhatsApp numbers
>
> • marketing campaign management
>
> • advanced analytics
>
> • subscription/billing management
>
> • multi-tenant or multi-organization operation
>
> • custom role builders, editable role definitions or an
> administrator-facing permission matrix
>
> • per-user permission overrides
>
> • administrator-configurable enabling or disabling of core modules
>
> • configurable visibility rules that bypass the reporting hierarchy
>
> • generic cross-industry product or service records
>
> • personal identity or KYC document management
>
> • document approval or review workflows
>
> • payroll, accounting or incentive payout processing
>
> • shared Email inbox
>
> • Gmail or Outlook mailbox synchronization
>
> • incoming Email synchronization
>
> • automated Email sales sequences
>
> • general Email marketing campaigns
>
> • Email open and click tracking
>
> • drag-and-drop Email template builder
>
> • offline creation or editing of CRM records
>
> • offline mutation queues
>
> • background synchronization
>
> • offline conflict resolution
>
> • Web Push notifications
>
> • scheduled background notifications
>
> • application-store distribution
>
> • a separate mobile application codebase

Note that **Teams are part of V1** and are no longer excluded. What
remains excluded is a separate Departments structure above or beside the
team hierarchy defined in Section 2.2.

The V1 call exclusions defined in Section 33 also apply. In summary,
do not introduce in-app VoIP or WebRTC calling, telephone-number
provisioning, call recording or transcription, automatic call-duration
detection, automatic detection of answered, missed or failed calls,
access to the phone's operating-system call history, automatic
synchronization with cellular call logs, call-centre, PBX or
telephony-provider integration, automatic outbound calling, or
predictive or power dialling. Section 33 is the authoritative list.

**Possible future enhancements**

The following are neither committed nor designed. They are recorded only
so that V1 is not built in a way that forecloses them, and none may be
assumed to exist:

> • a Departments layer above teams
>
> • inbound Email handling
>
> • additional communication channels
>
> • incentive payout processing integrated with payroll
>
> • provider system integrations

If a feature is not defined in this specification, it should not be
assumed to exist.

**212. Outstanding Decisions Pending Client Confirmation**

This is the consolidated register of business decisions that remain open.
Each is marked *pending client confirmation* where it appears elsewhere
in the specification; this section is the single place to review them.

Nothing here may be guessed at, defaulted, or implemented on assumption.
Where a decision affects security behaviour it must be confirmed and
approved before security implementation and UAT.

**Roles and permissions**

> • The final detailed action-by-action permission matrix. To be agreed
> with A&S Fincare during development and encoded as fixed application
> rules. See Sections 187 and 188.
>
> • Whether Admin and Manager may create a Lead or Customer directly,
> and which operational user such a record must be assigned to at
> creation.
>
> • Which roles may import data, and which roles may export data.
>
> • Which roles may export report data.
>
> • Which roles may initiate controlled bulk WhatsApp messaging.
>
> • Which roles may initiate controlled bulk Email.
>
> • Which roles may send individual Email and manual Email renewal
> reminders.
>
> • Which roles may archive and restore Leads, Customers and Customer
> Purchases.
>
> • Which roles may upload, replace or remove policy documents.
>
> • Which roles may attach a stored policy document to an Email.
>
> • Whether policy documents may be included in any bulk export, and
> under what authorization.
>
> • Which roles may configure incentive rules and slabs.
>
> • Whether a Salesperson may reassign a Lead.
>
> • Whether a Salesperson may reassign a WhatsApp conversation, and to
> whom.
>
> • Whether a Team Lead or Salesperson may transfer a record outside
> their own team.

**Assignment and hierarchy**

> • The default and maximum permitted round-robin batch size.
>
> • Escalation behaviour when a destination team has no eligible active
> recipient, and when an acting Admin or Manager has no eligible active
> Team Lead available for an unknown WhatsApp conversation. What is
> already fixed: assignment fails safely, is never given to an Admin, a
> Manager or another team's user, an unassigned conversation stays
> unassigned and unanswerable, and the condition is surfaced.
>
> • What happens to existing Leads, Customers, Customer Purchases,
> follow-ups, renewals and conversations when a user is deactivated,
> moved to another team, or has their role changed — beyond the already
> fixed rule that active work must be reassigned to an active Team Lead
> or Salesperson first and that the hierarchy must not be left invalid.

**WhatsApp and Email**

> • Who is operationally responsible for the unassigned WhatsApp queue,
> and the expected response time. What is already fixed: all Admins and
> Managers can see it, nobody can reply while a conversation is
> unassigned, and V1 does not assign it automatically.
>
> • Reminder schedules, template content, escalation rules, retry timing
> and channel precedence between WhatsApp and Email.

**Customer Purchases, documents and renewals**

> • Whether a distinct intermediate purchase status is required between
> creation and `Closed/Active`.
>
> • The administrative level at which the required-document list is
> defined — per Product Category, Provider, Plan or individual purchase.
>
> • Whether a required policy document may be removed after a purchase
> has reached `Closed/Active`, and the effect if it is.
>
> • Cancellation, lapse, refund and reversal behaviour after a purchase
> has reached `Closed/Active`.
>
> • Which Customer Purchases qualify for a Closed Amount.
>
> • Retention periods for policy documents and for audit history.

**Incentives**

> • Achievement slab thresholds and the number of slabs.
>
> • Rates, percentages and calculation formulas.
>
> • Eligibility conditions and eligibility dates.
>
> • Reporting periods and period cut-offs.
>
> • Which roles participate in incentives at all. Supervising a team
> does not by itself establish that a Manager is an incentive
> participant; this must be confirmed.
>
> • How Team Lead incentives treat personal production versus team
> total.
>
> • Adjustments, reversals and their effect on an already-calculated
> result.
>
> • Approval of calculated incentives.
>
> • Payment timing and payment status workflow.
>
> • Whether a rule change applies retrospectively.

**Reporting**

> • Final reporting and export access by role, where not already
> confirmed by the hierarchy scope in Section 170.

**Audit history**

> • Which roles may review audit history, and over what scope. What is
> already fixed: audit history is append-only, is never editable or
> deletable through ordinary CRM use, follows the reporting hierarchy,
> and must not disclose data the viewer could not otherwise see. See
> Section 208.
>
> • Retention periods for audit history, and for the policy documents
> referenced by audit entries.

Where another section raises one of these questions, it should state the
question briefly and refer here rather than repeating the full context.
