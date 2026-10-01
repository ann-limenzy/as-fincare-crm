/**
 * Wireframe-only conversation state, so a walkthrough can assign an
 * unassigned conversation and see the inbox update.
 *
 * A plain module store with `useSyncExternalStore`, following
 * `presentation-mode.tsx`. Deliberately NOT sessionStorage: navigating
 * between wireframe routes keeps the module alive, so the demonstration
 * holds, while a full refresh returns the walkthrough to its deterministic
 * starting point — which is what a presenter wants for the next run.
 *
 * Nothing here is production state. There is no backend, no database and no
 * browser API touched during SSR: the server snapshot is always the original
 * mock data.
 */
import {
  CONVERSATIONS,
  THREAD,
  type Conversation,
  type Message,
} from "@/lib/wireframes/mock-data";
import {
  demoTimeAt,
  nextDeliveryState,
  retryAttempt,
} from "@/lib/wireframes/whatsapp-messaging";

/** An assignment the walkthrough has performed, for the activity trail. */
export type AssignmentRecord = {
  readonly conversationId: string;
  /** Who performed it. Never becomes an owner (§93). */
  readonly byUserId: string;
  /** Who received it — a Team Lead. */
  readonly toUserId: string;
  /** Set when an unknown-number conversation also created a Lead (§101). */
  readonly createdLeadOwnerUserId?: string;
  readonly at: string;
};

type State = {
  readonly conversations: readonly Conversation[];
  readonly assignments: readonly AssignmentRecord[];
  /**
   * Threads the walkthrough has changed, keyed by conversation id.
   *
   * Absent means "unchanged", and `messagesFor` falls back to the seeded
   * thread. Storing only what was touched keeps the reset trivial and avoids
   * inventing a separate mock thread for every conversation.
   */
  readonly messages: Readonly<Record<string, readonly Message[]>>;
  /** How many messages the walkthrough has sent, for the demo clock. */
  readonly sent: number;
};

const INITIAL: State = {
  conversations: CONVERSATIONS,
  assignments: [],
  messages: {},
  sent: 0,
};

let state: State = INITIAL;
const listeners = new Set<() => void>();

/**
 * How long each §105 delivery step takes in the walkthrough.
 *
 * A send has to pass visibly through Sending before it settles, or the state
 * the spec lists first would never be seen. Tests drive these with fake
 * timers rather than waiting.
 */
export const DELIVERY_STEP_MS = 900;

const timers = new Set<ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToConversations(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConversationState(): State {
  return state;
}

/** The server renders the original mock data and must not guess otherwise. */
export function getConversationServerState(): State {
  return INITIAL;
}

/** Restores the deterministic starting point. Used by tests and a refresh. */
export function resetConversationStore(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  state = INITIAL;
  emit();
}

/**
 * Record an assignment.
 *
 * Only `assignedToUserId` changes. Every other field — crucially the
 * conversation's identity and its place in the list — is carried over
 * unchanged, so no history is rewritten and no new thread is created (§101).
 */
export function applyAssignment(record: AssignmentRecord): void {
  state = {
    ...state,
    conversations: state.conversations.map((c) =>
      c.id === record.conversationId
        ? { ...c, assignedToUserId: record.toUserId }
        : c,
    ),
    assignments: [...state.assignments, record],
  };
  emit();
}

/** Assignments recorded against one conversation, oldest first. */
export function assignmentsFor(
  conversationId: string,
  s: State = state,
): readonly AssignmentRecord[] {
  return s.assignments.filter((a) => a.conversationId === conversationId);
}

/** One conversation from the current state, or undefined for an unknown id. */
export function conversationById(
  id: string,
  s: State = state,
): Conversation | undefined {
  return s.conversations.find((c) => c.id === id);
}

/* ------------------------------------------------------------- messages */

/**
 * The thread for one conversation.
 *
 * Every conversation starts from the same seeded thread — a wireframe
 * simplification that predates this batch — and diverges as soon as the
 * walkthrough sends something on it.
 */
export function messagesFor(
  conversationId: string,
  s: State = state,
): readonly Message[] {
  return s.messages[conversationId] ?? THREAD;
}

function putMessages(
  conversationId: string,
  messages: readonly Message[],
  sent: number,
): void {
  state = {
    ...state,
    messages: { ...state.messages, [conversationId]: messages },
    sent,
  };
  emit();
}

/**
 * Walk one message through §105's states, a step at a time.
 *
 * Only ever moves forward, and only for the message it was scheduled for, so
 * a second send cannot drag an earlier one backwards.
 */
function scheduleDelivery(conversationId: string, messageId: string): void {
  const timer = setTimeout(() => {
    timers.delete(timer);
    const thread = messagesFor(conversationId);
    const message = thread.find((m) => m.id === messageId);
    if (!message?.delivery) return;
    const next = nextDeliveryState(message.delivery);
    if (next === null) return;
    putMessages(
      conversationId,
      thread.map((m) => (m.id === messageId ? { ...m, delivery: next } : m)),
      state.sent,
    );
    scheduleDelivery(conversationId, messageId);
  }, DELIVERY_STEP_MS);
  timers.add(timer);
}

/**
 * Append one outgoing message and start it at Sending (§105).
 *
 * The caller has already run `checkSend`; this records the outcome it
 * returned. Nothing is sent anywhere — there is no integration behind this.
 */
export function sendMessage(
  conversationId: string,
  outcome: { readonly body: string; readonly templateName?: string },
): Message {
  const thread = messagesFor(conversationId);
  const sent = state.sent + 1;
  const message: Message = {
    id: `sent-${conversationId}-${sent}`,
    direction: "out",
    body: outcome.body,
    time: demoTimeAt(sent - 1),
    delivery: "sending",
    ...(outcome.templateName === undefined
      ? {}
      : { template: outcome.templateName }),
  };
  putMessages(conversationId, [...thread, message], sent);
  scheduleDelivery(conversationId, message.id);
  return message;
}

/**
 * Retry a failed message (§105).
 *
 * Appends a NEW attempt. The failed message keeps its Failed state and its
 * place in the history: it is never rewritten as successful. Returns the new
 * attempt, or null when there is nothing to retry — including a second press
 * while a first retry is already in flight, so no duplicate reaches the
 * customer.
 */
export function retryMessage(
  conversationId: string,
  failedId: string,
): Message | null {
  const thread = messagesFor(conversationId);
  const sent = state.sent + 1;
  const attempt = retryAttempt(
    thread,
    failedId,
    demoTimeAt(sent - 1),
    `retry-${conversationId}-${sent}`,
  );
  if (attempt === null) return null;
  putMessages(conversationId, [...thread, attempt], sent);
  scheduleDelivery(conversationId, attempt.id);
  return attempt;
}
