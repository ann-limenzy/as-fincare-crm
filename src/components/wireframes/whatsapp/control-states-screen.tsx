import {
  BellOff,
  CircleAlert,
  FileClock,
  FileText,
  PlugZap,
  UserX,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CrmChrome } from "@/components/wireframes/crm-chrome";
import { Note, Panel, ScreenHeading } from "@/components/wireframes/wf-ui";
import { SETTINGS_USERS } from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import { maySeeUnassignedQueue } from "@/lib/wireframes/whatsapp-access";
import { whatsappNotificationsFor } from "@/lib/wireframes/whatsapp-notifications";
import { cn } from "@/lib/utils";

/**
 * B5 — Control states.
 *
 * The moments where sending is blocked. Each one says what happened, who can
 * fix it, and what to do instead — an error that only says "failed" leaves a
 * salesperson stuck in front of a customer.
 *
 * Nothing on this screen implies WhatsApp is connected or that Meta has
 * approved the business account. Nor does it state a messaging-window rule:
 * the specification defines none, and §96 has the CRM read the messaging
 * state from the integration instead of reasoning about platform rules.
 */

/**
 * Who sees a given state.
 *
 * A fixed role label would be wrong for most of these. The Failed marker, the
 * opt-out notice and the template-required notice all sit inside a
 * conversation, so they are seen by whoever §89.1 permits to open it — which
 * is a different set of people for every conversation. Only two states have a
 * role answer at all, and one of those is derived from the authorization
 * helper rather than written out.
 */
type Audience =
  /** In-conversation: §89.1 decides, per conversation. */
  | "permitted-viewers"
  /** In-conversation, plus the §117 failure notification to the assignee. */
  | "permitted-viewers-and-assignee"
  /** §93.1: derived from `maySeeUnassignedQueue`. */
  | "unassigned-queue"
  /** §115 gives this state an explicit "Admin view" and "Other users" split. */
  | "admin-view";

type State = {
  id: string;
  icon: LucideIcon;
  tone: "warning" | "danger" | "info" | "neutral";
  title: string;
  audience: Audience;
  body: string;
  actions: readonly { label: string; primary?: boolean }[];
  detail?: string;
};

/**
 * The roles §93.1 lets see the unassigned queue, read from the predicate that
 * enforces it rather than typed out here. If the rule changed, this changes.
 */
function queueRoles(): string {
  const roles = [
    ...new Set(SETTINGS_USERS.filter(maySeeUnassignedQueue).map((u) => u.role)),
  ];
  return roles.join(" and ");
}

function audienceLabel(audience: Audience): string {
  switch (audience) {
    case "permitted-viewers":
      return "Visible to anyone permitted to see this conversation";
    case "permitted-viewers-and-assignee":
      return "Visible to anyone permitted to see this conversation · the failure notification goes to the assignee";
    case "unassigned-queue":
      return `Visible to ${queueRoles()} only`;
    case "admin-view":
      return "Admin view";
  }
}

const STATES: readonly State[] = [
  {
    id: "not-connected",
    icon: PlugZap,
    tone: "warning",
    title: "WhatsApp isn't connected yet",
    audience: "admin-view",
    body: "Connect your business WhatsApp account to send and receive customer messages from the CRM. Everything else in the CRM keeps working.",
    actions: [
      { label: "Connect WhatsApp", primary: true },
      { label: "Learn what's involved" },
    ],
    detail:
      "§115 splits this state in two. Other users see only: “WhatsApp is not connected. Contact your administrator.” — the state itself reaches everyone; the Connect action is the Admin’s.",
  },
  {
    id: "opted-out",
    icon: BellOff,
    tone: "neutral",
    title: "Priya Iyer has opted out of WhatsApp",
    audience: "permitted-viewers",
    body: "This customer asked not to receive WhatsApp messages. The composer stays closed and bulk reminders skip them automatically.",
    actions: [
      { label: "Call instead", primary: true },
      { label: "Send an email" },
    ],
    detail:
      "Opt-out is recorded on the customer record and can only be changed there.",
  },
  {
    id: "template-required",
    icon: FileClock,
    tone: "info",
    title: "Only an approved template can be sent",
    audience: "permitted-viewers",
    body: "The WhatsApp integration reports that free text is not currently permitted on this conversation, so the CRM offers the approved templates instead of an unrestricted composer.",
    actions: [{ label: "Choose a template", primary: true }],
    detail:
      "The CRM reads this state from the WhatsApp integration rather than working it out itself, so it stays correct whatever rule the platform applies. A&S Fincare has not yet set out its own rule for when free text is permitted.",
  },
  {
    id: "template-not-approved",
    icon: FileText,
    tone: "warning",
    title: "That template is not approved",
    audience: "permitted-viewers",
    body: "Pending, rejected, unavailable and withdrawn templates stay visible in the list with the reason beside them, and cannot be selected. Nothing is attempted and then refused after the fact.",
    actions: [{ label: "Pick an approved one", primary: true }],
    detail:
      "Creating, editing and submitting templates happens on the WhatsApp platform. The CRM directs the administrator there rather than pretending it happened locally.",
  },
  {
    id: "delivery-failed",
    icon: CircleAlert,
    tone: "danger",
    title: "Message not delivered",
    audience: "permitted-viewers-and-assignee",
    body: "The number was unreachable. The failed attempt keeps its place in the conversation history — retrying creates a new send attempt rather than rewriting this one as successful.",
    actions: [
      { label: "Retry send", primary: true },
      { label: "Check the number" },
    ],
    detail: "Reason shown where WhatsApp provides one.",
  },
  {
    id: "needs-assignment",
    icon: UserX,
    tone: "warning",
    title: "This conversation is unassigned",
    audience: "unassigned-queue",
    body: "Nobody can reply while a conversation is unassigned — Admins and Managers included, even though they are the only roles who can see it. An Admin or Manager must assign it to an active Team Lead first; the composer appears only after that.",
    actions: [
      { label: "Assign to me", primary: true },
      { label: "Assign to someone else" },
    ],
  },
];

const TONE_CLASS = {
  warning: "border-warning/30 bg-warning-subtle text-warning-on-subtle",
  danger: "border-danger/30 bg-danger-subtle text-danger-on-subtle",
  info: "border-info/30 bg-info-subtle text-info-on-subtle",
  neutral: "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle",
} as const;

export function ControlStatesScreen() {
  return (
    <CrmChrome active="whatsapp">
      <div className="flex flex-col gap-5">
        <ScreenHeading
          title="When sending is blocked"
          description="The states a salesperson will meet. Each one names the cause, says who can resolve it, and offers something useful to do instead."
        />

        <Note icon={FileText}>
          WhatsApp is <strong className="font-semibold">not connected</strong>{" "}
          in these wireframes, and no Meta business verification has been
          completed. These screens show the intended behaviour, not a working
          integration.
        </Note>

        {/* Cards keep their own height rather than matching the tallest in the
            row, which left a visible gap under the shorter ones. */}
        <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {STATES.map((state) => {
            const Icon = state.icon;
            return (
              <article
                key={state.id}
                className="surface-elevated flex flex-col rounded-xl p-5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-lg border",
                    TONE_CLASS[state.tone],
                  )}
                >
                  <Icon className="size-5" />
                </span>

                <h3 className="mt-3.5 text-base font-semibold text-foreground">
                  {state.title}
                </h3>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {audienceLabel(state.audience)}
                </p>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {state.body}
                </p>

                {state.detail ? (
                  <p className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    {state.detail}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {state.actions.map((a) => (
                    <Button
                      key={a.label}
                      variant={a.primary ? "default" : "outline"}
                      size="sm"
                      className="min-h-11 sm:min-h-9"
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <NotificationScope />
      </div>
    </CrmChrome>
  );
}

/**
 * §117 notification scope, shown rather than asserted.
 *
 * Each row is the notification list the shared helper actually produces for
 * that role, so the client can see that a supervisor is not pinged for a
 * conversation they merely supervise, and that the unassigned queue reaches
 * only Admins and Managers — read-only when opened.
 */
function NotificationScope() {
  const roles = [USER.arun, USER.vikram, USER.sneha, USER.divya] as const;

  return (
    <Panel title="Who gets notified" bodyClassName="p-4 sm:p-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        A notification must never reveal a conversation, message, name, phone
        number or record outside the recipient&rsquo;s scope &mdash; in its
        title, its preview or its unread count. These lists are produced from
        each person&rsquo;s permitted scope, not filtered afterwards.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {roles.map((id) => {
          const user = userById(id);
          const notifications = whatsappNotificationsFor(user);
          return (
            <li key={id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">
                {user.name} · {user.role}
                <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {notifications.length}{" "}
                  {notifications.length === 1
                    ? "notification"
                    : "notifications"}
                </span>
              </p>
              {notifications.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Nothing outstanding for them right now.
                </p>
              ) : (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {notifications.map((n) => (
                    <li key={n.id} className="text-xs text-muted-foreground">
                      {n.title}
                      {n.opensReadOnly ? (
                        <span className="ms-1.5 rounded-full border border-warning/30 bg-warning-subtle px-1.5 py-0.5 text-[10px] font-medium text-warning-on-subtle">
                          opens read-only
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Opening a notification checks access again. If the conversation has
        since moved outside the recipient&rsquo;s scope, the CRM says only that
        it is no longer available &mdash; never where it went, who holds it now
        or what it contained. A successful outgoing message raises no
        notification at all.
      </p>
    </Panel>
  );
}
