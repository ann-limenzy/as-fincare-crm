import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfigurationScreen } from "@/components/wireframes/admin/configuration-screen";
import { ControlStatesScreen } from "@/components/wireframes/whatsapp/control-states-screen";
import { ConversationScreen } from "@/components/wireframes/whatsapp/conversation-screen";
import { InboxScreen } from "@/components/wireframes/whatsapp/inbox-screen";
import { MobileConversationScreen } from "@/components/wireframes/whatsapp/mobile-conversation";
import { MobileTemplatesScreen } from "@/components/wireframes/whatsapp/mobile-templates";
import { CONVERSATIONS, TEMPLATES } from "@/lib/wireframes/mock-data";
import {
  composerStateFor,
  isTemplateSelectable,
} from "@/lib/wireframes/whatsapp-messaging";
import { SETTINGS_USERS, linkedRecordById } from "@/lib/wireframes/mock-data";
import {
  DELIVERY_STEP_MS,
  getConversationState,
  messagesFor,
  resetConversationStore,
} from "@/lib/wireframes/whatsapp-store";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import { reassignmentTargetsFor } from "@/lib/wireframes/whatsapp-access";

/**
 * Batch 3B, rendered: the composer, the template picker, sending, delivery and
 * retry, on desktop and on the phone.
 *
 * Fake timers throughout, because §105's progression is time-based in the
 * walkthrough and a test should not wait for it.
 */

/** One conversation of each messaging state, taken from the mock data. */
const freeForm = CONVERSATIONS.find(
  (c) => c.messagingEligibility === "free-form" && c.assignedToUserId !== null,
)!;
const templateOnly = CONVERSATIONS.find(
  (c) => c.messagingEligibility === "template-required",
)!;
const optedOut = CONVERSATIONS.find(
  (c) => c.messagingEligibility === "opted-out",
)!;
const unavailable = CONVERSATIONS.find(
  (c) => c.messagingEligibility === "unavailable",
)!;

const APPROVED = TEMPLATES.find(isTemplateSelectable)!;
const REJECTED = TEMPLATES.find((t) => t.status === "Rejected")!;
const PENDING = TEMPLATES.find((t) => t.status === "Pending")!;
const LEAD_TEMPLATE = TEMPLATES.find(
  (t) => isTemplateSelectable(t) && t.variables.includes("lead_name"),
)!;
const CUSTOMER_TEMPLATE = TEMPLATES.find(
  (t) => isTemplateSelectable(t) && t.variables.includes("customer_name"),
)!;
const OWNERSHIP_TEMPLATE = TEMPLATES.find(
  (t) => isTemplateSelectable(t) && t.variables.includes("team_lead_name"),
)!;
const WITHDRAWN = TEMPLATES.find((t) => t.status === "Approved" && !t.active)!;
/** An account whose templates are all unusable, for the empty state. */
const NO_APPROVED = TEMPLATES.filter((t) => !isTemplateSelectable(t));

beforeEach(() => {
  // `shouldAdvanceTime` keeps the real clock ticking underneath, which
  // user-event needs for its own internal waits, while still allowing the
  // §105 delivery steps to be jumped over deliberately.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetConversationStore();
});

afterEach(() => {
  resetConversationStore();
  vi.useRealTimers();
});

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

/** Let every scheduled §105 delivery step run. */
function settleDelivery() {
  vi.advanceTimersByTime(DELIVERY_STEP_MS * 5);
}

/* -------------------------------------------------------- free-form send */

describe("free-form messaging (§96, §104)", () => {
  /* 1 */
  it("offers a reply field and the templates, with Send withheld until there is something to send", () => {
    render(<ConversationScreen conversationId={freeForm.id} />);
    expect(screen.getByLabelText("Write a reply")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Templates/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();
    expect(document.body.textContent).toContain(
      "Type a message before sending",
    );
  });

  /* 2 */
  it("appends exactly one outgoing message and clears the field", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    const before = messagesFor(freeForm.id).length;

    await user.type(
      screen.getByLabelText("Write a reply"),
      "Sending the payment link now",
    );
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /^Send$/ }));

    const after = messagesFor(freeForm.id);
    expect(after.length).toBe(before + 1);
    expect(after.at(-1)!.body).toBe("Sending the payment link now");
    expect(after.at(-1)!.direction).toBe("out");
    expect(screen.getByLabelText("Write a reply")).toHaveValue("");
  });

  /* 3 */
  it("starts the message at Sending and settles it through §105's states", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    await user.type(screen.getByLabelText("Write a reply"), "On its way");
    await user.click(screen.getByRole("button", { name: /^Send$/ }));

    const id = messagesFor(freeForm.id).at(-1)!.id;
    expect(messagesFor(freeForm.id).at(-1)!.delivery).toBe("sending");

    vi.advanceTimersByTime(DELIVERY_STEP_MS);
    expect(messagesFor(freeForm.id).find((m) => m.id === id)!.delivery).toBe(
      "sent",
    );
    vi.advanceTimersByTime(DELIVERY_STEP_MS);
    expect(messagesFor(freeForm.id).find((m) => m.id === id)!.delivery).toBe(
      "delivered",
    );
    settleDelivery();
    expect(messagesFor(freeForm.id).find((m) => m.id === id)!.delivery).toBe(
      "read",
    );
  });

  /* 4 */
  it("refuses whitespace and appends nothing", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    const before = messagesFor(freeForm.id).length;
    await user.type(screen.getByLabelText("Write a reply"), "    ");
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();
    expect(messagesFor(freeForm.id).length).toBe(before);
  });

  /* 5 */
  it("sends one message per click, not one per render", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    const before = messagesFor(freeForm.id).length;
    await user.type(screen.getByLabelText("Write a reply"), "First");
    await user.click(screen.getByRole("button", { name: /^Send$/ }));
    settleDelivery();
    expect(messagesFor(freeForm.id).length).toBe(before + 1);
    await user.type(screen.getByLabelText("Write a reply"), "Second");
    await user.click(screen.getByRole("button", { name: /^Send$/ }));
    settleDelivery();
    expect(messagesFor(freeForm.id).length).toBe(before + 2);
  });
});

/* ----------------------------------------------------- template required */

describe("template-only messaging (§96, §97)", () => {
  /* 6 */
  it("renders no free-text field at all, and says a template is required", () => {
    render(<ConversationScreen conversationId={templateOnly.id} />);
    expect(screen.queryByLabelText("Write a reply")).toBeNull();
    expect(
      screen.getByRole("note", { name: "Approved template required" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Templates/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();
  });

  /* 7 */
  it("offers only approved, in-use templates and no approval-state clutter", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={templateOnly.id} />);
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    const list = screen.getByRole("dialog", { name: "Message templates" });

    expect(
      within(list).getByRole("button", { name: new RegExp(APPROVED.name) }),
    ).toBeInTheDocument();
    // §197 keeps the four-state listing on the Admin template screen. None of
    // it belongs in front of a salesperson mid-conversation.
    for (const unusable of [REJECTED, PENDING, WITHDRAWN]) {
      expect(within(list).queryByText(unusable.name), unusable.name).toBeNull();
    }
    for (const word of [
      "Pending",
      "Rejected",
      "Unavailable",
      "Not in use",
      "Rejected by WhatsApp",
      "Awaiting approval",
    ]) {
      expect(list.textContent, word).not.toContain(word);
    }
  });

  /* 7b */
  it("shows a clear empty state when the account has no approved template", async () => {
    const user = setup();
    render(
      <ConversationScreen
        conversationId={templateOnly.id}
        templates={NO_APPROVED}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    const list = screen.getByRole("dialog", { name: "Message templates" });
    expect(within(list).getByRole("status").textContent).toContain(
      "No approved template is available",
    );
    // Nothing selectable, so nothing can be sent either.
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();
  });

  /* 7c */
  it("blocks sending and explains when a chosen template stops being available", async () => {
    const user = setup();
    // The template is offered, then the catalogue reports it withdrawn.
    const { unmount } = render(
      <ConversationScreen conversationId={templateOnly.id} />,
    );
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Message templates" }),
      ).getByRole("button", { name: new RegExp(APPROVED.name) }),
    );
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeEnabled();
    unmount();

    const withdrawn = TEMPLATES.map((t) =>
      t.id === APPROVED.id ? { ...t, active: false } : t,
    );
    render(
      <ConversationScreen
        conversationId={templateOnly.id}
        templates={withdrawn}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    // It is no longer offered at all.
    expect(
      within(
        screen.getByRole("dialog", { name: "Message templates" }),
      ).queryByText(APPROVED.name),
    ).toBeNull();
  });

  /* 8 */
  it("previews the populated message with no variable left showing", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={templateOnly.id} />);
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Message templates" }),
      ).getByRole("button", { name: new RegExp(APPROVED.name) }),
    );
    const preview = screen.getByTestId("template-preview");
    expect(preview.textContent).not.toContain("{{");
    expect(preview.textContent).toContain(templateOnly.person);
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeEnabled();
  });

  /* 9 */
  it("sends the template as one message, tagged with its name", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={templateOnly.id} />);
    const before = messagesFor(templateOnly.id).length;
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Message templates" }),
      ).getByRole("button", { name: new RegExp(APPROVED.name) }),
    );
    await user.click(screen.getByRole("button", { name: /^Send$/ }));

    const after = messagesFor(templateOnly.id);
    expect(after.length).toBe(before + 1);
    expect(after.at(-1)!.template).toBe(APPROVED.name);
    expect(after.at(-1)!.body).not.toContain("{{");
    // The selection is cleared, so the same template cannot go twice by accident.
    expect(screen.queryByTestId("template-preview")).toBeNull();
  });
});

/* ------------------------------------------------------- §114 restrictions */

describe("messaging restrictions (§114)", () => {
  /* 10 */
  it("offers neither a composer nor a template for an opted-out contact", () => {
    render(<ConversationScreen conversationId={optedOut.id} />);
    expect(screen.queryByLabelText("Write a reply")).toBeNull();
    expect(screen.queryByRole("button", { name: /Templates/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Send$/ })).toBeNull();
    expect(
      screen.getByRole("note", { name: "Messaging unavailable" }).textContent,
    ).toContain("Customer opted out");
  });

  /* 11 */
  it("says so plainly when the integration reports messaging unavailable", () => {
    render(<ConversationScreen conversationId={unavailable.id} />);
    expect(screen.queryByRole("button", { name: /^Send$/ })).toBeNull();
    expect(
      screen.getByRole("note", { name: "Messaging unavailable" }).textContent,
    ).toContain("WhatsApp messaging unavailable");
  });

  /* 12 */
  it("shows the messaging state in the inbox before a reply is attempted", () => {
    render(<InboxScreen />);
    expect(document.body.textContent).toContain("Messaging");
  });
});

/* -------------------------------------------------------------- retry */

describe("retry keeps the failed attempt (§105)", () => {
  /* 13 */
  it("appends a new attempt and leaves the failed message Failed", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    const failed = messagesFor(freeForm.id).find(
      (m) => m.delivery === "failed",
    )!;
    const before = messagesFor(freeForm.id).length;

    await user.click(screen.getByRole("button", { name: /Retry/ }));
    settleDelivery();

    const after = messagesFor(freeForm.id);
    expect(after.length).toBe(before + 1);
    // The original is untouched — same id, still Failed, still in place.
    expect(after.find((m) => m.id === failed.id)!.delivery).toBe("failed");
    expect(after.at(-1)!.retryOf).toBe(failed.id);
    expect(after.at(-1)!.delivery).not.toBe("failed");
    expect(document.body.textContent).toContain(
      "Retry of the earlier failed message",
    );
  });

  /* 14 */
  it("withdraws Retry while an attempt is in flight, so one click is one retry", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    const before = messagesFor(freeForm.id).length;

    const buttons = screen.getAllByRole("button", { name: /Retry/ });
    expect(buttons.length).toBe(1);
    await user.click(buttons[0]!);

    // The control is gone, not merely inert, and says what is happening.
    expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
    expect(document.body.textContent).toContain("Retry in progress");

    settleDelivery();
    expect(messagesFor(freeForm.id).length).toBe(before + 1);
    // Still no second Retry once it has succeeded.
    expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
  });

  /* 14b */
  it("keeps the failed attempt visibly undelivered next to the retry", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    await user.click(screen.getByRole("button", { name: /Retry/ }));
    settleDelivery();
    const text = document.body.textContent ?? "";
    // One is plainly a failure, the other plainly a repeat — not two
    // successful-looking duplicates.
    expect(text).toContain("Not delivered");
    expect(text).toContain("Failed");
    expect(text).toContain("Retry of the earlier failed message");
  });

  /* 14c */
  it("leaves ownership and assignment untouched by a retry", async () => {
    const user = setup();
    const before = CONVERSATIONS.find((c) => c.id === freeForm.id)!;
    render(<ConversationScreen conversationId={freeForm.id} />);
    await user.click(screen.getByRole("button", { name: /Retry/ }));
    settleDelivery();
    const after = getConversationState().conversations.find(
      (c) => c.id === freeForm.id,
    )!;
    expect(after).toEqual(before);
    expect(getConversationState().assignments).toEqual([]);
  });
});

/* -------------------------------------------------------------- phone */

describe("the phone reaches the same decisions (§121)", () => {
  /* 15 */
  it("uses the shared composer helper, not its own rule", () => {
    render(<MobileConversationScreen />);
    const conversation = CONVERSATIONS[0]!;
    const expected = composerStateFor(userById(USER.sneha), conversation);
    expect(expected.mode).toBe("free-form");
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  /* 16 */
  it("sends from the phone and appends one message", async () => {
    const user = setup();
    render(<MobileConversationScreen />);
    const id = CONVERSATIONS[0]!.id;
    const before = messagesFor(id).length;
    await user.type(screen.getByLabelText("Message"), "Calling you at 4");
    await user.click(screen.getByLabelText("Send message"));
    settleDelivery();
    expect(messagesFor(id).length).toBe(before + 1);
    expect(messagesFor(id).at(-1)!.body).toBe("Calling you at 4");
  });

  /* 17 */
  it("lists only approved templates applicable to this record type", () => {
    render(<MobileTemplatesScreen />);
    for (const unusable of [REJECTED, PENDING, WITHDRAWN]) {
      expect(screen.queryByText(unusable.name), unusable.name).toBeNull();
    }
    // The phone conversation is linked to a Customer, so a Lead-addressed
    // template is not offered either (§98).
    expect(screen.queryByText(LEAD_TEMPLATE.name)).toBeNull();
    expect(
      screen.getByRole("button", { name: new RegExp(CUSTOMER_TEMPLATE.name) }),
    ).toBeInTheDocument();
  });

  /* 17b */
  it("shows the empty state on the phone when nothing is approved", () => {
    render(<MobileTemplatesScreen templates={NO_APPROVED} />);
    expect(screen.getByRole("status").textContent).toContain(
      "No approved template is available",
    );
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();
  });

  /* 17c */
  it("withdraws Retry on the phone while an attempt is in flight", async () => {
    const user = setup();
    render(<MobileConversationScreen />);
    const id = CONVERSATIONS[0]!.id;
    const before = messagesFor(id).length;
    await user.click(screen.getByRole("button", { name: /Retry/ }));
    expect(screen.queryByRole("button", { name: /Retry/ })).toBeNull();
    expect(document.body.textContent).toContain("Retry in progress");
    settleDelivery();
    expect(messagesFor(id).length).toBe(before + 1);
  });

  /* 18 */
  it("asks which policy before previewing, then populates it", async () => {
    const user = setup();
    render(<MobileTemplatesScreen />);
    await user.click(
      screen.getByRole("button", { name: new RegExp(CUSTOMER_TEMPLATE.name) }),
    );
    // Ramesh holds two policies, so §98 forbids guessing: no preview yet.
    expect(screen.queryByTestId("template-preview")).toBeNull();
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();

    await user.selectOptions(
      screen.getByLabelText("Which policy is this about?"),
      "c881-a",
    );
    const preview = screen.getByTestId("template-preview").textContent ?? "";
    expect(preview).not.toContain("{{");
    expect(preview).toContain("Family Health Optima");
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeEnabled();
  });
});

/* ---------------------------------------------- §98 purchase selection (UI) */

describe("the composer will not choose a policy for you (§98)", () => {
  /* 23 */
  it("asks which policy, blocks Send, then populates the preview", async () => {
    const user = setup();
    // Ramesh holds two policies and is the free-form conversation.
    render(<ConversationScreen conversationId={freeForm.id} />);
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Message templates" }),
      ).getByRole("button", { name: new RegExp(CUSTOMER_TEMPLATE.name) }),
    );

    // No preview and no send until the applicable policy is named.
    expect(screen.queryByTestId("template-preview")).toBeNull();
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();
    expect(document.body.textContent).toContain("more than one policy");

    const select = screen.getByLabelText("Which policy is this about?");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent ?? "")
        .filter((t) => !t.startsWith("Choose")).length,
    ).toBe(2);

    await user.selectOptions(select, "c881-b");
    const preview = screen.getByTestId("template-preview").textContent ?? "";
    // The MOTOR policy, because that is the one chosen — not the first.
    expect(preview).toContain("Private Car Comprehensive");
    expect(preview).toContain("11 January 2027");
    expect(preview).not.toContain("Family Health Optima");
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeEnabled();
  });

  /* 24 */
  it("sends the chosen policy's text and nothing from the other one", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    const before = messagesFor(freeForm.id).length;
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Message templates" }),
      ).getByRole("button", { name: new RegExp(CUSTOMER_TEMPLATE.name) }),
    );
    await user.selectOptions(
      screen.getByLabelText("Which policy is this about?"),
      "c881-a",
    );
    await user.click(screen.getByRole("button", { name: /^Send$/ }));

    const sent = messagesFor(freeForm.id).at(-1)!;
    expect(messagesFor(freeForm.id).length).toBe(before + 1);
    expect(sent.body).toContain("Family Health Optima");
    expect(sent.body).not.toContain("Private Car Comprehensive");
    expect(sent.body).not.toContain("{{");
    // Record Owner is Neha, not the acting Admin and not the assignee.
    expect(sent.template).toBe(CUSTOMER_TEMPLATE.name);
  });

  /* 25 */
  it("names the record owner rather than whoever is replying", async () => {
    const user = setup();
    render(<ConversationScreen conversationId={freeForm.id} />);
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Message templates" }),
      ).getByRole("button", { name: new RegExp(OWNERSHIP_TEMPLATE.name) }),
    );
    await user.selectOptions(
      screen.getByLabelText("Which policy is this about?"),
      "c881-a",
    );
    const preview = screen.getByTestId("template-preview").textContent ?? "";
    const owner = userById(linkedRecordById("c881")!.recordOwnerUserId).name;
    expect(preview).toContain(owner);
    // Arun is the acting Admin and must not appear as the owner.
    expect(preview).not.toContain("Arun Menon");
  });
});

/* -------------------------------------- a Salesperson's own records (§89.1) */

describe("the operational picker as a Salesperson", () => {
  /** Kavya holds this conversation and personally owns its Lead record. */
  const KAVYA_CONV = CONVERSATIONS.find((c) => c.id === "w5")!;

  /* 26 */
  it("offers her own record's template, populated, and lets her send it", async () => {
    const user = setup();
    const kavya = userById(USER.kavya);
    expect(kavya.role).toBe("Salesperson");
    expect(KAVYA_CONV.assignedToUserId).toBe(kavya.id);
    expect(
      linkedRecordById(KAVYA_CONV.linkedRecordId!)!.recordOwnerUserId,
    ).toBe(kavya.id);

    render(
      <ConversationScreen
        conversationId={KAVYA_CONV.id}
        viewerId={USER.kavya}
      />,
    );

    // A template is required on this conversation, and hers is offered.
    expect(
      screen.getByRole("note", { name: "Approved template required" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    const list = screen.getByRole("dialog", { name: "Message templates" });
    // Her Lead's name already appears in the row's populated sample text.
    expect(list.textContent).toContain("Anitha Desai");
    expect(list.textContent).not.toContain("{{");

    await user.click(
      within(list).getByRole("button", {
        name: new RegExp(LEAD_TEMPLATE.name),
      }),
    );
    const preview = screen.getByTestId("template-preview").textContent ?? "";
    expect(preview).toContain("Anitha Desai");
    expect(preview).not.toContain("{{");

    const before = messagesFor(KAVYA_CONV.id).length;
    await user.click(screen.getByRole("button", { name: /^Send$/ }));
    settleDelivery();
    expect(messagesFor(KAVYA_CONV.id).length).toBe(before + 1);
    expect(messagesFor(KAVYA_CONV.id).at(-1)!.template).toBe(
      LEAD_TEMPLATE.name,
    );
  });

  /* 27 */
  it("offers her no reassignment control, though she may send", () => {
    const kavya = userById(USER.kavya);
    // §93 leaves her reassignment permission pending, and §89.1 still gives
    // her her own records — the screen reflects both at once.
    expect(reassignmentTargetsFor(kavya, KAVYA_CONV)).toEqual([]);
    render(
      <ConversationScreen
        conversationId={KAVYA_CONV.id}
        viewerId={USER.kavya}
      />,
    );
    expect(screen.getByRole("button", { name: /Templates/ })).toBeEnabled();
    expect(screen.queryByLabelText("Assign to an active Team Lead")).toBeNull();
  });

  /* 28 */
  it("shows her nothing for a conversation that is not hers", () => {
    // Ramesh belongs to Sneha's team, not to Kavya.
    render(
      <ConversationScreen conversationId={freeForm.id} viewerId={USER.kavya} />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Conversation not available",
    );
  });
});

/* ------------------------------------------------- no invented rule on screen */

describe("no unconfirmed product rule reaches the client", () => {
  /* 19 */
  it("states no messaging-window duration on any WhatsApp screen", () => {
    for (const ui of [
      <ConversationScreen key="a" conversationId={freeForm.id} />,
      <ConversationScreen key="b" conversationId={templateOnly.id} />,
      <ConversationScreen key="c" conversationId={optedOut.id} />,
      <InboxScreen key="d" />,
      <MobileConversationScreen key="e" />,
      <MobileTemplatesScreen key="f" />,
      <ControlStatesScreen key="g" />,
    ]) {
      const { unmount } = render(ui);
      const text = document.body.textContent ?? "";
      expect(text).not.toMatch(/24[\s-]?hours?/i);
      expect(text).not.toMatch(/messaging window|service window/i);
      unmount();
    }
  });

  /* 20 */
  it("keeps the four-state listing on the Admin template screen", async () => {
    // The distinction the specification draws: §197 is the Admin catalogue,
    // §96 is the operational picker. Both exist; only one shows statuses.
    const user = setup();
    render(<ConfigurationScreen />);
    await user.click(screen.getByRole("tab", { name: "WhatsApp templates" }));
    const text = document.body.textContent ?? "";
    for (const t of TEMPLATES) expect(text, t.name).toContain(t.name);
    for (const status of ["Approved", "Pending", "Rejected", "Unavailable"]) {
      expect(text, status).toContain(status);
    }
    expect(text).toContain("Not in use");
  });

  /* 20b */
  it("shows the §98 variables each template uses, on the Admin screen only", async () => {
    const user = setup();
    const { unmount } = render(<ConfigurationScreen />);
    await user.click(screen.getByRole("tab", { name: "WhatsApp templates" }));
    const adminText = document.body.textContent ?? "";
    expect(adminText).toContain("{{customer_name}}");
    expect(adminText).toContain("{{renewal_date}}");
    unmount();

    // The operational composer shows substituted text, never the variables.
    render(<ConversationScreen conversationId={templateOnly.id} />);
    await user.click(screen.getByRole("button", { name: /Templates/ }));
    const list = screen.getByRole("dialog", { name: "Message templates" });
    expect(list.textContent).not.toContain("{{");
  });

  /* 21 */
  it("labels each control state by scope rather than a fixed role", () => {
    render(<ControlStatesScreen />);
    const text = document.body.textContent ?? "";
    // "Owner" is not a role in this hierarchy, and "Seen by everyone" is not
    // true of anything that lives inside a single conversation.
    expect(text).not.toMatch(/Seen by/);
    expect(text).not.toMatch(/\bOwner and Admin\b/);
    expect(text).toContain(
      "Visible to anyone permitted to see this conversation",
    );
    // §93.1's roles, derived from the predicate that enforces them.
    const queueRoles = [
      ...new Set(
        SETTINGS_USERS.filter(
          (u) => u.role === "Admin" || u.role === "Manager",
        ).map((u) => u.role),
      ),
    ].join(" and ");
    expect(text).toContain(`Visible to ${queueRoles} only`);
    // §115 gives this one state an explicit Admin view.
    expect(text).toContain("Admin view");
  });

  /* 22 */
  it("shows the §117 notification scope rather than asserting it", () => {
    render(<ControlStatesScreen />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Who gets notified");
    expect(text).toContain("opens read-only");
    expect(text).toContain("no longer available");
  });
});
