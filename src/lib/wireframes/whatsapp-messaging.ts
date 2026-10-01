/**
 * Composer state, templates, send preconditions and delivery (spec §96, §97,
 * §104, §105, §114).
 *
 * Pure functions, shared by the desktop and phone screens so the two can
 * never disagree about what may be sent. Nothing here reads a clock, a
 * network or a browser API.
 *
 * ON THE MESSAGING WINDOW. The specification never states a time window —
 * no duration appears anywhere in it — and §96 instead requires the CRM to
 * "use the messaging eligibility/state returned by the WhatsApp integration
 * rather than asking users to understand WhatsApp platform rules
 * themselves". So the trigger for "a template is required" is read from
 * `conversation.messagingEligibility`, a value the integration supplies. The
 * CRM does not compute it, does not name a duration, and therefore cannot be
 * wrong about a rule the platform may change.
 */
import {
  CONVERSATIONS,
  TEMPLATES,
  type Conversation,
  type DeliveryState,
  type LinkedPurchase,
  type Message,
  type MessagingEligibility,
  type SettingsUser,
  type Template,
} from "@/lib/wireframes/mock-data";
import { mayReplyToConversation } from "@/lib/wireframes/whatsapp-access";
import {
  fillTemplate,
  resolveTemplateValues,
  templateContractProblem,
} from "@/lib/wireframes/whatsapp-template-variables";

/* ------------------------------------------------------------ integration */

/**
 * §104 requires a connected-integration check before any send.
 *
 * WhatsApp is not connected in these wireframes and no Meta business
 * verification exists; the screens demonstrate the behaviour that applies
 * once it is, and the not-connected state has its own control-states card.
 * Typed as `boolean` so the check below is a real branch rather than a
 * constant the compiler folds away.
 */
export const INTEGRATION_CONNECTED: boolean = true;

/** §105: "Read — where available". Not every account reports read receipts. */
export const READ_RECEIPTS_AVAILABLE: boolean = true;

/* ------------------------------------------------------------- eligibility */

/**
 * The state wording §114 asks for, where it supplies wording.
 *
 * `template-required` deliberately says nothing about why, because the
 * specification does not say why and neither does the CRM.
 */
const ELIGIBILITY_LABEL: Record<MessagingEligibility, string> = {
  "free-form": "Messaging available",
  "template-required": "Approved template required",
  unavailable: "WhatsApp messaging unavailable",
  "opted-out": "Customer opted out",
};

export function eligibilityLabel(state: MessagingEligibility): string {
  return ELIGIBILITY_LABEL[state];
}

/** §114: recipients excluded from bulk or automated outbound messaging. */
export function excludedFromBulkMessaging(
  from: readonly Conversation[] = CONVERSATIONS,
): readonly Conversation[] {
  return from.filter(
    (c) =>
      c.messagingEligibility === "opted-out" ||
      c.messagingEligibility === "unavailable",
  );
}

/* ---------------------------------------------------------------- composer */

export type ComposerMode =
  /** §96: unassigned — no composer and no send action, for any role. */
  | "unassigned"
  /** Outside the viewer's permitted scope (§89.1). */
  | "not-permitted"
  /** §114: messaging must not occur at all. */
  | "messaging-blocked"
  /** §96: "an approved/eligible template is required". */
  | "template-required"
  /** §96: "normal reply/free-form messaging is allowed". */
  | "free-form";

export type ComposerState = {
  readonly mode: ComposerMode;
  /** Short state label for the screen. */
  readonly heading: string;
  readonly explanation: string;
  /** Whether a free-text field may be offered at all. */
  readonly mayType: boolean;
  /** Whether the template picker may be opened. */
  readonly mayChooseTemplate: boolean;
  /** Whether a template is the only permitted way to send. */
  readonly requiresTemplate: boolean;
};

/**
 * What composer, if any, `user` gets on `conversation`.
 *
 * Precedence is assignment first, then scope, then §114, then the
 * integration's messaging state. Assignment comes first because §93.1 makes
 * it unconditional: an Admin looking at an unassigned conversation gets no
 * composer even when messaging is perfectly eligible.
 */
export function composerStateFor(
  user: SettingsUser,
  conversation: Conversation,
): ComposerState {
  if (conversation.assignedToUserId === null) {
    return {
      mode: "unassigned",
      heading: "This conversation is unassigned.",
      explanation:
        "Assign it to a Team Lead before replying. That applies to Admins and Managers too, not only to the team.",
      mayType: false,
      mayChooseTemplate: false,
      requiresTemplate: false,
    };
  }

  if (!mayReplyToConversation(user, conversation)) {
    return {
      mode: "not-permitted",
      heading: "You cannot reply to this conversation.",
      explanation: "It sits outside your permitted scope.",
      mayType: false,
      mayChooseTemplate: false,
      requiresTemplate: false,
    };
  }

  switch (conversation.messagingEligibility) {
    case "opted-out":
      return {
        mode: "messaging-blocked",
        heading: ELIGIBILITY_LABEL["opted-out"],
        explanation:
          "This contact asked not to receive WhatsApp messages. Call or email them instead. The opt-out is held on their record and can only be changed there.",
        mayType: false,
        mayChooseTemplate: false,
        requiresTemplate: false,
      };
    case "unavailable":
      return {
        mode: "messaging-blocked",
        heading: ELIGIBILITY_LABEL.unavailable,
        explanation:
          "The WhatsApp integration reports that outbound messaging is not available for this contact. Nothing can be sent, including an approved template.",
        mayType: false,
        mayChooseTemplate: false,
        requiresTemplate: false,
      };
    case "template-required":
      return {
        mode: "template-required",
        heading: ELIGIBILITY_LABEL["template-required"],
        explanation:
          "The WhatsApp integration reports that only an approved template may be sent on this conversation right now. Choose one and check the preview before sending.",
        mayType: false,
        mayChooseTemplate: true,
        requiresTemplate: true,
      };
    case "free-form":
      return {
        mode: "free-form",
        heading: ELIGIBILITY_LABEL["free-form"],
        explanation:
          "A normal reply can be sent. An approved template is still available if one fits.",
        mayType: true,
        mayChooseTemplate: true,
        requiresTemplate: false,
      };
  }
}

/* --------------------------------------------------------------- templates */

/**
 * §97: "Only templates currently approved and eligible for sending may be
 * selected by normal users. An inactive, pending, rejected or unavailable
 * template must not be selectable."
 */
export function isTemplateSelectable(template: Template): boolean {
  return template.active && template.status === "Approved";
}

/**
 * Why a template cannot be used, or null when it can.
 *
 * §97 requires the interface to explain this "rather than failing after the
 * send attempt", so every screen shows this string beside the row instead of
 * simply hiding it.
 */
export function templateUnavailableReason(template: Template): string | null {
  if (!template.active) {
    return "Taken out of use by your administrator.";
  }
  switch (template.status) {
    case "Approved":
      return null;
    case "Pending":
      return "Awaiting approval from WhatsApp. It cannot be sent yet.";
    case "Rejected":
      return "Rejected by WhatsApp. It has to be changed and resubmitted on the WhatsApp platform.";
    case "Unavailable":
      return "Not available on the connected WhatsApp account.";
  }
}

/**
 * The templates an operational user may choose from when sending.
 *
 * §97 and §197 scope the four-state listing — Approved, Pending, Rejected,
 * Unavailable — to the ADMIN template screen: §197 is "Settings → WhatsApp
 * Templates. Admin can view the templates available to the CRM. Show:
 * Template Name, Language, Status, Purpose/Category". Neither section asks
 * for those states in the operational composer, and §96's composer shows only
 * "Select Template" and a populated preview. So the sending picker lists what
 * can actually be sent; the states live in Admin configuration and on the
 * control-states wireframe that explains them.
 */
export function selectableTemplates(
  from: readonly Template[] = TEMPLATES,
): readonly Template[] {
  return from.filter(isTemplateSelectable);
}

/** §96/§97: shown in the sending picker when nothing can be sent from it. */
export const NO_SELECTABLE_TEMPLATE =
  "No approved template is available on the connected WhatsApp account. An Admin can review the template list in Settings; approval itself happens on the WhatsApp platform.";

/**
 * Shown when a template that was already chosen stops being selectable.
 *
 * The picker only ever offers approved, in-use templates, so this is the case
 * where one was withdrawn or its platform status changed after selection.
 * §97 requires the interface to explain it rather than failing after the send
 * attempt, so the send is blocked and this is said in the composer.
 */
export const TEMPLATE_NO_LONGER_AVAILABLE =
  "This template is no longer available to send. Choose another one.";

export function templateById(
  id: string,
  from: readonly Template[] = TEMPLATES,
): Template | undefined {
  return from.find((t) => t.id === id);
}

/* --------------------------------------------------- §98 variable filling */

/**
 * The populated preview §96 asks for, or the reason there isn't one.
 *
 * Resolution and substitution both live in `whatsapp-template-variables.ts`,
 * which owns the §98 contract. This is only the composer's view of it.
 */
export type TemplatePreview =
  | {
      readonly ok: true;
      readonly text: string;
      readonly purchase: LinkedPurchase | null;
    }
  | { readonly ok: false; readonly reason: string };

export function previewTemplate(
  actor: SettingsUser,
  conversation: Conversation,
  template: Template,
  purchaseId: string | null = null,
): TemplatePreview {
  const resolved = resolveTemplateValues(
    actor,
    conversation,
    template,
    purchaseId,
  );
  if (!resolved.ok) return { ok: false, reason: resolved.reason };

  const filled = fillTemplate(template.body, resolved.values);
  if (filled.unresolved.length > 0) {
    // Belt and braces: resolution already names what is missing, so reaching
    // here would mean the two disagreed. §98 forbids sending either way.
    return {
      ok: false,
      reason: `This message still contains ${filled.unresolved
        .map((n) => `{{${n}}}`)
        .join(", ")}. It cannot be sent.`,
    };
  }
  return { ok: true, text: filled.text, purchase: resolved.purchase };
}

/**
 * Templates that can actually be used on this conversation.
 *
 * Approved and in use (§97, §197), addressing the right kind of record, and
 * resolvable for this actor (§98). A template held back because the customer
 * holds several policies is still offered: choosing between them is the user's
 * job, and the composer asks.
 */
export function eligibleTemplatesFor(
  actor: SettingsUser,
  conversation: Conversation,
  from: readonly Template[] = TEMPLATES,
): readonly Template[] {
  return selectableTemplates(from).filter((template) => {
    const resolved = resolveTemplateValues(actor, conversation, template);
    return resolved.ok || resolved.block === "purchase-not-chosen";
  });
}

/* ------------------------------------------------------------------- send */

export type Draft = {
  /** Free text the user typed. Ignored when a template is required. */
  readonly text: string;
  readonly templateId: string | null;
  /**
   * Which Customer Purchase the message is about, where the record holds more
   * than one (§98). Null means "not chosen yet", never "pick any".
   */
  readonly purchaseId?: string | null;
};

export type SendCheck =
  | {
      readonly ok: true;
      /** Exactly what would go out, with variables already substituted. */
      readonly body: string;
      /** Set when the message came from a template (§105 shows it in-thread). */
      readonly templateName?: string;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * §104's preconditions, in the order the specification lists them.
 *
 * The screens call this before enabling Send and again on click, so a
 * message can never be shown as sent when a check would have refused it —
 * §104: "the system must not show an unsuccessful message as successfully
 * sent."
 */
export function checkSend(
  user: SettingsUser,
  conversation: Conversation,
  draft: Draft,
  templates: readonly Template[] = TEMPLATES,
): SendCheck {
  const composer = composerStateFor(user, conversation);

  if (composer.mode === "unassigned") {
    return {
      ok: false,
      reason:
        "This conversation is unassigned, so no user may send on it — an Admin or a Manager included. Assign it to an active Team Lead first.",
    };
  }
  if (composer.mode === "not-permitted") {
    return { ok: false, reason: composer.explanation };
  }
  if (!INTEGRATION_CONNECTED) {
    return {
      ok: false,
      reason:
        "WhatsApp is not connected for A&S Fincare. An Admin has to connect the business account before anything can be sent.",
    };
  }
  if (conversation.phone.trim() === "") {
    return {
      ok: false,
      reason:
        "This contact has no usable phone number, so WhatsApp has nowhere to deliver the message.",
    };
  }
  if (composer.mode === "messaging-blocked") {
    return { ok: false, reason: composer.explanation };
  }

  const template =
    draft.templateId === null
      ? null
      : (templateById(draft.templateId, templates) ?? null);

  if (draft.templateId !== null && template === null) {
    return {
      ok: false,
      reason: "That template is no longer available. Choose another one.",
    };
  }

  if (composer.requiresTemplate && template === null) {
    return {
      ok: false,
      reason:
        "An approved template is required on this conversation. Choose one before sending.",
    };
  }

  if (template !== null) {
    const reason = templateUnavailableReason(template);
    if (reason !== null) {
      return {
        ok: false,
        reason: `${template.name} cannot be sent. ${reason}`,
      };
    }
    const contract = templateContractProblem(template);
    if (contract !== null) return { ok: false, reason: contract };

    // §104's last two preconditions — "an eligible template is selected where
    // required" and "required template variables are available" — are §98's
    // rules, so they are answered by the contract module rather than
    // re-implemented here.
    const preview = previewTemplate(
      user,
      conversation,
      template,
      draft.purchaseId ?? null,
    );
    if (!preview.ok) return { ok: false, reason: preview.reason };
    return { ok: true, body: preview.text, templateName: template.name };
  }

  const body = draft.text.trim();
  if (body === "") {
    return { ok: false, reason: "Type a message before sending." };
  }
  return { ok: true, body };
}

/* -------------------------------------------------------------- delivery */

/**
 * §105's progression. A send starts at Sending; every later state is what
 * the integration reports, so this only says what may come next.
 */
export function nextDeliveryState(
  current: DeliveryState,
  readReceipts: boolean = READ_RECEIPTS_AVAILABLE,
): DeliveryState | null {
  switch (current) {
    case "sending":
      return "sent";
    case "sent":
      return "delivered";
    case "delivered":
      return readReceipts ? "read" : null;
    case "read":
    case "failed":
      return null;
  }
}

/* ----------------------------------------------------------------- retry */

/** Whether an attempt at retrying `messageId` already exists in the thread. */
export function retryExistsFor(
  thread: readonly Message[],
  messageId: string,
): boolean {
  return thread.some((m) => m.retryOf === messageId);
}

/**
 * Whether a retry of `messageId` is still settling (§105).
 *
 * True from the moment the new attempt is appended until it reports Failed.
 * While this holds, Retry must not be offered again — a second press would
 * put the same words in front of the customer twice.
 */
export function retryInFlight(
  thread: readonly Message[],
  messageId: string,
): boolean {
  return thread.some((m) => m.retryOf === messageId && m.delivery !== "failed");
}

/**
 * Whether Retry should be offered for `messageId`.
 *
 * Exactly one Retry per attempt. A failed message that has already been
 * retried is no longer the tip of the chain: if the retry itself failed, the
 * retry carries the next Retry, so the same content never shows two buttons.
 */
export function mayRetry(
  thread: readonly Message[],
  messageId: string,
): boolean {
  const message = thread.find((m) => m.id === messageId);
  if (!message || message.direction !== "out") return false;
  if (message.delivery !== "failed") return false;
  return !retryExistsFor(thread, messageId);
}

/**
 * The new attempt a retry creates (§105), or null when there is nothing to
 * retry.
 *
 * §105: "retrying should create a new send attempt rather than rewriting the
 * historical failed attempt as successful", and the failed attempt is
 * retained in message history. So this returns a message to APPEND; the
 * original is never touched.
 *
 * Returns null whenever `mayRetry` is false: the id is not a failed outgoing
 * message, or it has already been retried. Pressing Retry twice must not put
 * two copies of the same message in front of the customer.
 */
export function retryAttempt(
  thread: readonly Message[],
  failedId: string,
  time: string,
  nextId: string,
): Message | null {
  if (!mayRetry(thread, failedId)) return null;
  const failed = thread.find((m) => m.id === failedId)!;

  return {
    id: nextId,
    direction: "out",
    body: failed.body,
    time,
    delivery: "sending",
    retryOf: failedId,
    ...(failed.template === undefined ? {} : { template: failed.template }),
  };
}

/* ------------------------------------------------------------ demo clock */

/** 10:44 AM — one minute after the last message in the seeded thread. */
const DEMO_BASE_MINUTES = 10 * 60 + 44;

/**
 * A deterministic wall clock for the walkthrough.
 *
 * `new Date()` would make the server and client render different times and
 * every screenshot different from the last. Step 0 is 10:44 AM, and each
 * further send advances a minute.
 */
export function demoTimeAt(step: number): string {
  const total = DEMO_BASE_MINUTES + step;
  const hour24 = Math.floor(total / 60) % 24;
  const minute = total % 60;
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}
