"use client";

import {
  ArrowLeft,
  CalendarPlus,
  CircleAlert,
  ExternalLink,
  FileText,
  Lock,
  RotateCcw,
  Send,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CrmChrome } from "@/components/wireframes/crm-chrome";
import {
  ChannelMark,
  DeliveryTag,
} from "@/components/wireframes/whatsapp/parts";
import { Note, Panel } from "@/components/wireframes/wf-ui";
import {
  CONVERSATIONS,
  CUSTOMER_POLICIES,
  CUSTOMER_RECORD,
  TEMPLATES,
  THREAD,
} from "@/lib/wireframes/mock-data";
import {
  TEAMS_TODAY,
  USER,
  activeTeamOf,
  userById,
} from "@/lib/wireframes/sales-teams";
import {
  assignmentTargetsFor,
  createLeadFromUnknownNumber,
  mayAssignConversation,
  mayReplyToConversation,
  mayViewConversation,
} from "@/lib/wireframes/whatsapp-access";
import {
  applyAssignment,
  assignmentsFor,
  conversationById,
  getConversationServerState,
  getConversationState,
  subscribeToConversations,
} from "@/lib/wireframes/whatsapp-store";

/** The thread the route shows when no id is supplied. */
const DEFAULT_CONVERSATION_ID = "w1";
import { cn } from "@/lib/utils";

/**
 * B2 — WhatsApp conversation (desktop).
 *
 * A CRM screen that happens to use WhatsApp, not a copy of the WhatsApp app.
 * The difference shows in the right-hand column: who this person is, what
 * they hold, and the next action to take. The message list is the middle of
 * the screen, not the whole of it.
 */
export function ConversationScreen({
  conversationId = null,
}: {
  /** Which thread to show. Null or absent shows the built-out one. */
  conversationId?: string | null;
} = {}) {
  const store = useSyncExternalStore(
    subscribeToConversations,
    getConversationState,
    getConversationServerState,
  );
  const [templateOpen, setTemplateOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  // This screen is presented as the Admin. Every decision below comes from
  // the shared predicates, never from the persona's name.
  const viewer = userById(USER.arun);

  // An explicit id is validated against what this viewer may see. An unknown
  // or unauthorized id shows nothing rather than quietly substituting another
  // conversation, which would misreport whose thread is on screen.
  const requested = conversationId ?? DEFAULT_CONVERSATION_ID;
  const found = conversationById(requested, store);
  const conversation =
    found && mayViewConversation(viewer, found) ? found : null;

  if (!conversation) {
    return (
      <CrmChrome active="whatsapp">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={"/wireframes/whatsapp/inbox" as Route}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Inbox
              </Link>
            </Button>
          </div>
          <section
            role="alert"
            className="surface-elevated rounded-xl p-6 text-sm"
          >
            <h2 className="text-base font-semibold text-foreground">
              Conversation not available
            </h2>
            <p className="mt-1.5 leading-relaxed text-muted-foreground">
              No conversation matching{" "}
              <code className="rounded bg-muted px-1">{requested}</code> is
              available to you. Nothing else is shown in its place.
            </p>
          </section>
        </div>
      </CrmChrome>
    );
  }

  const unassigned = conversation.assignedToUserId === null;
  const mayReply = mayReplyToConversation(viewer, conversation);
  const assignTargets = assignmentTargetsFor(viewer, conversation);
  const assignee = conversation.assignedToUserId
    ? userById(conversation.assignedToUserId)
    : null;
  const history = assignmentsFor(conversation.id, store);
  const canAssign =
    target !== "" && mayAssignConversation(viewer, conversation, target);

  /**
   * §101: for an unknown contact the same selection creates the Lead and
   * assigns this conversation. Authorization lives in the helper, not here.
   */
  const assign = () => {
    if (!canAssign) return;
    const outcome = createLeadFromUnknownNumber(viewer, conversation, target);
    if (!outcome.ok) return;
    applyAssignment({
      conversationId: conversation.id,
      byUserId: viewer.id,
      toUserId: outcome.conversationAssignedToUserId,
      ...(conversation.recordType === "Unknown"
        ? { createdLeadOwnerUserId: outcome.leadRecordOwnerUserId }
        : {}),
      at: TEAMS_TODAY,
    });
    setTarget("");
  };

  return (
    <CrmChrome active="whatsapp">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={"/wireframes/whatsapp/inbox" as Route}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Inbox
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            {CONVERSATIONS.length} conversations ·{" "}
            {CONVERSATIONS.filter((c) => c.unread > 0).length} unread
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] xl:items-start">
          <section className="surface-elevated flex flex-col overflow-hidden rounded-xl">
            {/* Conversation header: identity, record link, owner, status. */}
            <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
              <ChannelMark />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-foreground">
                  {conversation.person}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {conversation.phone} ·{" "}
                  <span className="text-primary underline underline-offset-2">
                    {conversation.recordLabel}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-subtle px-2.5 py-0.5 text-xs font-medium text-success-on-subtle">
                  {conversation.status}
                </span>
                {assignee ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    <UserCheck className="size-3.5" aria-hidden="true" />
                    Assigned to {assignee.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-subtle px-2.5 py-0.5 text-xs font-medium text-warning-on-subtle">
                    <UserX className="size-3.5" aria-hidden="true" />
                    Unassigned
                  </span>
                )}
              </div>
            </header>

            {/* Thread */}
            <div className="flex flex-col gap-3.5 bg-muted/40 px-4 py-5 sm:px-5">
              <p className="text-center text-[11px] font-medium text-muted-foreground">
                Today
              </p>
              {THREAD.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>

            {/*
              Composer. §93.1 makes assignment precede any reply, so when the
              conversation is unassigned the composer is not rendered at all —
              a disabled-looking text box would still read as "you could type
              here", which is exactly the impression the rule forbids.
            */}
            {!mayReply ? (
              <div className="border-t border-border p-4 sm:p-5">
                <div
                  role="note"
                  aria-label="Reply unavailable"
                  className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2.5 text-sm leading-relaxed text-warning-on-subtle"
                >
                  <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold">
                      {unassigned
                        ? "This conversation is unassigned, so nobody can reply to it yet."
                        : "You cannot reply to this conversation."}
                    </strong>{" "}
                    {unassigned
                      ? "The history above stays readable. Assign it to an active Team Lead first — that applies to Admins and Managers too, not only to the team."
                      : "It sits outside your permitted scope."}
                  </span>
                </div>

                {assignTargets.length > 0 ? (
                  <div className="mt-3">
                    <label
                      htmlFor="assign-conversation"
                      className="mb-1.5 block text-xs font-medium text-foreground"
                    >
                      Assign to an active Team Lead
                    </label>
                    <div className="flex flex-wrap items-end gap-2">
                      <select
                        id="assign-conversation"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        className="h-11 min-w-56 rounded-md border border-input bg-surface px-2.5 text-sm text-foreground"
                      >
                        <option value="">Choose a Team Lead…</option>
                        {assignTargets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {activeTeamOf(t.id)?.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        className="min-h-11"
                        onClick={assign}
                        disabled={!canAssign}
                        aria-describedby={
                          canAssign ? undefined : "assign-needs-target"
                        }
                      >
                        Assign conversation
                      </Button>
                    </div>
                    {!canAssign ? (
                      <p
                        id="assign-needs-target"
                        className="mt-2 text-[11px] text-muted-foreground"
                      >
                        Choose an active Team Lead to enable Assign.
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      Assigning does not make you the owner, and the first reply
                      after assignment does not change ownership. This is a
                      direct assignment — it does not use the team&rsquo;s round
                      robin or its batch size.
                    </p>
                  </div>
                ) : unassigned ? (
                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    No eligible active Team Lead is available in your scope, so
                    this conversation stays Unassigned and read-only. It is
                    never given to an Admin, a Manager or a Salesperson.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="border-t border-border p-3 sm:p-4">
                {chosen ? (
                  <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
                    <FileText
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        Template: {chosen}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {TEMPLATES.find((t) => t.name === chosen)?.body}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove template"
                      onClick={() => setChosen(null)}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-end gap-2">
                  <div className="surface-solid min-h-11 min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
                    Write a reply…
                  </div>
                  {/**
                   * An anchored popover rather than a block appended under the
                   * composer. The composer sits at the bottom of a long page, so
                   * an inline list opened below the fold — the selector appeared
                   * to do nothing. `side="top"` opens it over the conversation,
                   * and Radix flips it back down if there is no room above.
                   */}
                  <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-h-11">
                        <FileText className="size-4" aria-hidden="true" />
                        Templates
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="end"
                      sideOffset={8}
                      collisionPadding={16}
                      aria-label="Approved message templates"
                      className="w-[min(36rem,calc(100vw-2rem))] p-2"
                    >
                      <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
                        Approved templates
                      </p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {TEMPLATES.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setChosen(t.name);
                                setTemplateOpen(false);
                              }}
                              className="surface-solid w-full rounded-lg p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {t.name}
                                </span>
                                <span className="rounded-full bg-success-subtle px-2 py-0.5 text-[10px] font-medium text-success-on-subtle">
                                  Approved
                                </span>
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                {t.body}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                  <Button className="min-h-11">
                    <Send className="size-4" aria-hidden="true" />
                    Send
                  </Button>
                </div>

                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Outside the 24-hour reply window WhatsApp only permits an
                  approved template. The composer is disabled then, and the
                  template list opens instead.
                </p>
              </div>
            )}
          </section>

          {/* Customer context — enough to act, not the whole profile. */}
          <div className="flex flex-col gap-4">
            <Panel title="Customer context" bodyClassName="p-4 sm:p-5">
              <dl className="flex flex-col gap-3.5 text-sm">
                <ContextRow label="Record" value={conversation.recordLabel} />
                <ContextRow label="Product" value={conversation.product} />
                <ContextRow
                  label="Renewal due"
                  value={CUSTOMER_POLICIES[0]!.renewal}
                />
                <ContextRow
                  label="Record owner"
                  value={CUSTOMER_RECORD.owner}
                />
                <ContextRow
                  label="Conversation assigned to"
                  value={assignee ? assignee.name : "Unassigned"}
                />
                <ContextRow
                  label="Customer since"
                  value={CUSTOMER_RECORD.since}
                />
              </dl>

              <div className="mt-5 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="min-h-11 w-full justify-start"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Open customer record
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11 w-full justify-start"
                >
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Create follow-up
                </Button>
                {/*
                  Reassignment applies to an ALREADY-assigned conversation.
                  While unassigned the real control is the Team Lead picker
                  above; a second "Assign" here would be a dead duplicate.
                */}
                {assignee ? (
                  <Button
                    variant="outline"
                    className="min-h-11 w-full justify-start"
                  >
                    <UserCheck className="size-4" aria-hidden="true" />
                    Reassign conversation
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  className="min-h-11 w-full justify-start"
                >
                  <X className="size-4" aria-hidden="true" />
                  Close conversation
                </Button>
              </div>
            </Panel>

            {history.length > 0 ? (
              <Panel title="Assignment activity" bodyClassName="p-4 sm:p-5">
                <ul className="flex flex-col gap-2.5 text-xs">
                  {history.map((h, i) => (
                    <li key={`${h.conversationId}-${i}`} className="min-w-0">
                      <p className="text-foreground">
                        <strong className="font-semibold">
                          {userById(h.byUserId).name}
                        </strong>{" "}
                        assigned this conversation to{" "}
                        <strong className="font-semibold">
                          {userById(h.toUserId).name}
                        </strong>
                        .
                      </p>
                      {h.createdLeadOwnerUserId ? (
                        <p className="mt-0.5 text-muted-foreground">
                          A Lead was created with{" "}
                          {userById(h.createdLeadOwnerUserId).name} as Record
                          Owner. The conversation history was preserved — no new
                          thread was started.
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-muted-foreground">
                        {userById(h.byUserId).name} did not become the owner ·{" "}
                        {h.at}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <Note icon={CircleAlert} tone="warning">
              One message failed to deliver. A retry sends a new message — the
              failed attempt stays in the history rather than being rewritten as
              successful.
            </Note>
          </div>
        </div>
      </div>
    </CrmChrome>
  );
}

function MessageBubble({ message }: { message: (typeof THREAD)[number] }) {
  const outgoing = message.direction === "out";
  const failed = message.delivery === "failed";

  return (
    <div className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[min(32rem,85%)]", outgoing && "text-right")}>
        {message.template ? (
          <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <FileText className="size-3" aria-hidden="true" />
            {message.template}
          </p>
        ) : null}

        <div
          className={cn(
            "rounded-xl px-3.5 py-2.5 text-left text-sm leading-relaxed",
            outgoing
              ? "bg-primary text-primary-foreground"
              : "surface-solid text-foreground",
            failed &&
              "border border-danger/40 bg-danger-subtle text-danger-on-subtle",
          )}
        >
          {message.body}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-right">
          {outgoing && message.delivery ? (
            <DeliveryTag state={message.delivery} time={message.time} />
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {message.time}
            </span>
          )}
          {failed ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline underline-offset-2"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Retry
            </button>
          ) : null}
        </div>

        {message.failureReason ? (
          <p className="mt-1 text-[11px] text-danger-on-subtle">
            {message.failureReason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}
