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
import { CONVERSATIONS, type Conversation } from "@/lib/wireframes/mock-data";

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
};

const INITIAL: State = {
  conversations: CONVERSATIONS,
  assignments: [],
};

let state: State = INITIAL;
const listeners = new Set<() => void>();

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
