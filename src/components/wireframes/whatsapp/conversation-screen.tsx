"use client";

import {
  ArrowLeft,
  Ban,
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
  type Message,
  type Template,
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
  NO_SELECTABLE_TEMPLATE,
  TEMPLATE_NO_LONGER_AVAILABLE,
  checkSend,
  composerStateFor,
  eligibleTemplatesFor,
  isTemplateSelectable,
  mayRetry,
  previewTemplate,
  retryInFlight,
  templateById,
} from "@/lib/wireframes/whatsapp-messaging";
import {
  resolveTemplateValues,
  templateNeedsPurchase,
} from "@/lib/wireframes/whatsapp-template-variables";
import {
  applyAssignment,
  assignmentsFor,
  conversationById,
  getConversationServerState,
  getConversationState,
  messagesFor,
  retryMessage,
  sendMessage,
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
  templates = TEMPLATES,
  viewerId = USER.arun,
}: {
  /** Which thread to show. Null or absent shows the built-out one. */
  conversationId?: string | null;
  /**
   * The template catalogue. Only overridden to demonstrate an account with
   * no approved template; the routes always use the real one.
   */
  templates?: readonly Template[];
  /**
   * Who is looking. The route never passes this — the desktop wireframe is
   * presented as the Admin, as it always has been.
   *
   * It exists so the same screen can be exercised as an operational user,
   * which is the only way to show that a Salesperson reaches their own
   * records. It is NOT a persona switcher: there is no control for it, and
   * nothing in the UI reads it.
   */
  viewerId?: string;
} = {}) {
  const store = useSyncExternalStore(
    subscribeToConversations,
    getConversationState,
    getConversationServerState,
  );
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  /** §98: which policy the message is about. Never defaulted silently. */
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  /** The §104 reason a send attempt was refused, shown until the next try. */
  const [refusal, setRefusal] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  // Presented as the Admin by default. Every decision below comes from the
  // shared predicates, never from the persona's name.
  const viewer = userById(viewerId);

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
  // What §96 permits here, read from the integration's messaging state rather
  // than worked out from a clock. The same helper drives the phone screen.
  const composer = composerStateFor(viewer, conversation);
  const thread = messagesFor(conversation.id, store);
  // §97/§197 plus §98: approved and in use, addressing this kind of record,
  // and resolvable for this viewer.
  const offered = eligibleTemplatesFor(viewer, conversation, templates);
  const selectedTemplate =
    templateId === null ? null : (templateById(templateId, templates) ?? null);
  // A template can only reach this state by ceasing to be selectable after it
  // was chosen, since the picker never offers an unusable one.
  const selectedWithdrawn =
    selectedTemplate !== null && !isTemplateSelectable(selectedTemplate);
  const preview =
    selectedTemplate === null
      ? null
      : previewTemplate(viewer, conversation, selectedTemplate, purchaseId);
  // The purchases to choose between, when that is what is holding the send up.
  /**
   * What each offered template would actually say, for the picker.
   *
   * §96 asks for the populated message, so the list shows resolved text rather
   * than the raw body — a row reading "{{customer_name}}" tells a salesperson
   * nothing and leaks the variable names into the sending path.
   */
  const sampleFor = (template: Template): string | null => {
    const preview = previewTemplate(viewer, conversation, template, purchaseId);
    return preview.ok ? preview.text : null;
  };
  const purchaseChoices =
    selectedTemplate === null || !templateNeedsPurchase(selectedTemplate)
      ? []
      : (() => {
          const resolved = resolveTemplateValues(
            viewer,
            conversation,
            selectedTemplate,
          );
          return resolved.ok ? [] : resolved.choices;
        })();
  // Run before the click as well as on it, so Send is never offered for
  // something §104 would refuse.
  const sendCheck = checkSend(
    viewer,
    conversation,
    { text: draft, templateId, purchaseId },
    templates,
  );
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

  /**
   * §104: check every precondition, then record the outcome.
   *
   * A refused attempt appends nothing and shows its reason — "the system must
   * not show an unsuccessful message as successfully sent". Send is already
   * disabled in that case; this is the second gate, so a stale render can
   * never let something through.
   */
  const send = () => {
    const check = checkSend(
      viewer,
      conversation,
      { text: draft, templateId, purchaseId },
      templates,
    );
    if (!check.ok) {
      setRefusal(check.reason);
      return;
    }
    sendMessage(conversation.id, check);
    setDraft("");
    setTemplateId(null);
    setPurchaseId(null);
    setRefusal(null);
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
              {thread.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onRetry={
                    mayRetry(thread, m.id)
                      ? () => retryMessage(conversation.id, m.id)
                      : undefined
                  }
                  retrying={retryInFlight(thread, m.id)}
                />
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
            ) : composer.mode === "messaging-blocked" ? (
              /*
                §114. Neither free text nor a template may be sent, so the
                template picker is withheld as well — offering it would imply
                there is a way round the restriction.
              */
              <div className="border-t border-border p-4 sm:p-5">
                <div
                  role="note"
                  aria-label="Messaging unavailable"
                  className="flex items-start gap-2.5 rounded-lg border border-border-strong/40 bg-neutral-subtle px-3 py-2.5 text-sm leading-relaxed text-neutral-on-subtle"
                >
                  <Ban className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold">
                      {composer.heading}
                    </strong>{" "}
                    {composer.explanation}
                  </span>
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  This contact is also left out of bulk and automated WhatsApp
                  sends, rather than being attempted and failing.
                </p>
              </div>
            ) : (
              <div className="border-t border-border p-3 sm:p-4">
                {composer.requiresTemplate ? (
                  <div
                    role="note"
                    aria-label="Approved template required"
                    className="mb-3 flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-subtle px-3 py-2.5 text-sm leading-relaxed text-info-on-subtle"
                  >
                    <FileText
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-semibold">
                        {composer.heading}
                      </strong>{" "}
                      {composer.explanation}
                    </span>
                  </div>
                ) : null}

                {selectedTemplate && preview ? (
                  <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
                    <FileText
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        Template: {selectedTemplate.name} ·{" "}
                        {selectedTemplate.language}
                      </p>

                      {/*
                        §98: more than one Customer Purchase and the CRM will
                        not choose. The applicable policy is asked for, and
                        nothing is populated or sent until it is given.
                      */}
                      {purchaseChoices.length > 0 ? (
                        <div className="mt-2">
                          <label
                            htmlFor="applicable-purchase"
                            className="mb-1 block text-xs font-medium text-foreground"
                          >
                            Which policy is this about?
                          </label>
                          <select
                            id="applicable-purchase"
                            value={purchaseId ?? ""}
                            onChange={(e) => {
                              setPurchaseId(
                                e.target.value === "" ? null : e.target.value,
                              );
                              setRefusal(null);
                            }}
                            className="h-11 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-foreground"
                          >
                            <option value="">Choose a policy…</option>
                            {purchaseChoices.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.planSubProduct} · {p.provider} ·{" "}
                                {p.policyReference}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {/* §96: "preview the populated message" — the exact text
                          that would go out, variables already substituted. */}
                      {preview.ok ? (
                        <p
                          data-testid="template-preview"
                          className="mt-1 text-xs leading-relaxed text-muted-foreground"
                        >
                          {preview.text}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-medium text-danger-on-subtle">
                          {preview.reason}
                        </p>
                      )}
                      {selectedWithdrawn ? (
                        <p className="mt-1 text-xs font-medium text-danger-on-subtle">
                          {TEMPLATE_NO_LONGER_AVAILABLE}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove template"
                      onClick={() => {
                        setTemplateId(null);
                        setPurchaseId(null);
                        setRefusal(null);
                      }}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-end gap-2">
                  {composer.mayType ? (
                    <textarea
                      rows={1}
                      aria-label="Write a reply"
                      placeholder="Write a reply…"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setRefusal(null);
                      }}
                      className="surface-solid min-h-11 min-w-0 flex-1 resize-none rounded-lg px-3 py-2.5 text-sm text-foreground"
                    />
                  ) : (
                    /*
                      §96: "do not display an unrestricted composer as though a
                      normal message can be sent". There is no text field here
                      at all, not a disabled one.
                    */
                    <p className="surface-solid min-h-11 min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
                      Free text is not available here. Choose an approved
                      template instead.
                    </p>
                  )}
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
                      aria-label="Message templates"
                      className="w-[min(36rem,calc(100vw-2rem))] p-2"
                    >
                      {/*
                        Only what can actually be sent. §97 and §197 put the
                        Approved/Pending/Rejected/Unavailable listing on the
                        Admin template screen, not in front of a salesperson
                        mid-conversation.
                      */}
                      <p className="px-2 pt-1 pb-2 text-xs leading-relaxed text-muted-foreground">
                        Approved templates available on the A&amp;S Fincare
                        WhatsApp account.
                      </p>
                      {offered.length === 0 ? (
                        <p
                          role="status"
                          className="px-2 pb-2 text-xs leading-relaxed text-muted-foreground"
                        >
                          {NO_SELECTABLE_TEMPLATE}
                        </p>
                      ) : (
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {offered.map((t) => (
                            <li key={t.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTemplateId(t.id);
                                  setPurchaseId(null);
                                  setTemplateOpen(false);
                                  setRefusal(null);
                                }}
                                className="surface-solid w-full rounded-lg p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent"
                              >
                                <TemplateSummary
                                  template={t}
                                  sample={sampleFor(t)}
                                />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </PopoverContent>
                  </Popover>
                  <Button
                    className="min-h-11"
                    onClick={send}
                    disabled={!sendCheck.ok}
                    aria-describedby={sendCheck.ok ? undefined : "send-blocked"}
                  >
                    <Send className="size-4" aria-hidden="true" />
                    Send
                  </Button>
                </div>

                {(refusal ?? (sendCheck.ok ? null : sendCheck.reason)) ? (
                  <p
                    id="send-blocked"
                    className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    {refusal ?? (sendCheck.ok ? null : sendCheck.reason)}
                  </p>
                ) : null}
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

            {thread.some((m) => m.delivery === "failed") ? (
              <Note icon={CircleAlert} tone="warning">
                {thread.filter((m) => m.delivery === "failed").length} message
                failed to deliver. Retrying sends a new attempt — the failed one
                keeps its place in the history rather than being rewritten as
                successful.
              </Note>
            ) : null}
          </div>
        </div>
      </div>
    </CrmChrome>
  );
}

function MessageBubble({
  message,
  onRetry,
  retrying = false,
}: {
  message: Message;
  /** Present only where §105 permits a retry of this exact attempt. */
  onRetry?: () => void;
  /** A retry of this attempt is already under way. */
  retrying?: boolean;
}) {
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
          {failed && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary underline underline-offset-2"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Retry
            </button>
          ) : failed && retrying ? (
            /* One retry at a time: the control is withdrawn, not left live. */
            <span className="text-[11px] text-muted-foreground">
              Retry in progress
            </span>
          ) : null}
        </div>

        {failed ? (
          <p className="mt-1 text-[11px] font-medium text-danger-on-subtle">
            Not delivered
            {message.failureReason ? ` — ${message.failureReason}` : ""}
          </p>
        ) : null}

        {/* §105: a retry is its own attempt, and says which one it repeats. */}
        {message.retryOf ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Retry of the earlier failed message
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

/**
 * One row of the sending picker: what the template is for, in which language,
 * and the text it will send.
 *
 * No platform status, because every template offered here is already approved
 * and in use — a badge reading "Approved" on every row is noise, and the
 * states belong on the Admin template screen (§197).
 */
function TemplateSummary({
  template,
  sample,
}: {
  template: Template;
  /**
   * The populated text, where it already resolves. Null when a choice is
   * still outstanding — the raw body is never shown, because §98's variable
   * names are not something a salesperson should have to read.
   */
  sample: string | null;
}) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {template.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {template.purpose} · {template.language}
        </span>
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
        {sample ??
          "Select it to choose which policy this message is about, then preview the exact text."}
      </span>
    </>
  );
}
