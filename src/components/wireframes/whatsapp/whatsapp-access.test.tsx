import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConversationScreen } from "@/components/wireframes/whatsapp/conversation-screen";
import { InboxScreen } from "@/components/wireframes/whatsapp/inbox-screen";
import { MobileInboxScreen } from "@/components/wireframes/whatsapp/mobile-inbox";
import { CONVERSATIONS } from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import { visibleConversationsFor } from "@/lib/wireframes/whatsapp-access";

/**
 * Batch 3A, rendered: the screens must reach the same authorization
 * outcome as the shared predicates, on desktop and on mobile.
 */

const unassigned = CONVERSATIONS.find((c) => c.assignedToUserId === null)!;
const assigned = CONVERSATIONS.find((c) => c.assignedToUserId !== null)!;

const STALE = [
  "Owner/Admin",
  "Staff/Sales",
  "Sales Executive",
  "workspace user",
  "tenant",
];

describe("Unassigned conversation renders read-only (§93.1)", () => {
  /* 9 */
  it("renders no composer and no send action", () => {
    render(<ConversationScreen conversationId={unassigned.id} />);
    expect(screen.queryByRole("button", { name: /^Send$/ })).toBeNull();
    expect(screen.queryByText("Write a reply…")).toBeNull();
    expect(screen.queryByRole("button", { name: /Templates/ })).toBeNull();
    const text = document.body.textContent ?? "";
    expect(text).toContain("nobody can reply to it yet");
    expect(text).toContain("Assign it to an active Team Lead first");
  });

  it("keeps the message history readable and marks the state", () => {
    render(<ConversationScreen conversationId={unassigned.id} />);
    // Shown in the header badge and again in the context column.
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
    // The thread is still rendered.
    expect(document.querySelectorAll("p").length).toBeGreaterThan(3);
  });

  it("offers the Admin an assignment control listing only Team Leads", () => {
    render(<ConversationScreen conversationId={unassigned.id} />);
    const select = screen.getByLabelText("Assign to an active Team Lead");
    const options = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent ?? "")
      .filter((t) => !t.startsWith("Choose"));
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) {
      expect(o).not.toContain("Arun Menon");
      expect(o).not.toContain("Vikram Shah");
    }
    expect(document.body.textContent).toContain(
      "Assigning does not make you the owner",
    );
    expect(document.body.textContent).toMatch(
      /does not use the team.s round robin or its batch size/i,
    );
  });

  it("renders the composer again for an assigned conversation", () => {
    render(<ConversationScreen conversationId={assigned.id} />);
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeInTheDocument();
    expect(screen.getByText("Write a reply…")).toBeInTheDocument();
    expect(screen.queryByText("Unassigned")).toBeNull();
  });

  it("shows conversation responsibility separately from Record Owner", () => {
    render(<ConversationScreen conversationId={assigned.id} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Record owner");
    expect(text).toContain("Conversation assigned to");
  });
});

describe("Desktop and mobile reach the same outcome (§121)", () => {
  /* 21 */
  it("shows the Admin inbox every permitted conversation and the queue", () => {
    render(<InboxScreen />);
    const admin = userById(USER.arun);
    const permitted = visibleConversationsFor(admin);
    for (const c of permitted) {
      expect(screen.getAllByText(c.person).length).toBeGreaterThan(0);
    }
    expect(
      screen.getAllByRole("button", { name: /Unassigned/ }).length,
    ).toBeGreaterThan(0);
  });

  it("shows the Team Lead's phone only her permitted scope, and no queue", () => {
    render(<MobileInboxScreen />);
    const lead = userById(USER.sneha);
    const permitted = visibleConversationsFor(lead);
    const text = document.body.textContent ?? "";
    // Everything she may see, nothing she may not.
    for (const c of CONVERSATIONS) {
      const maySee = permitted.some((p) => p.id === c.id);
      if (!maySee && c.person !== "Unknown") {
        expect(text, `${c.person} leaked`).not.toContain(c.recordLabel);
      }
    }
    // No unassigned queue on the phone for a Team Lead.
    expect(screen.queryByRole("button", { name: /Unassigned/ })).toBeNull();
    expect(text).not.toContain(unassigned.phone);
  });
});

describe("no stale multi-tenant or retired role wording (§22)", () => {
  it("keeps the WhatsApp screens clean", () => {
    for (const ui of [
      <ConversationScreen key="c" conversationId={assigned.id} />,
      <ConversationScreen key="u" conversationId={unassigned.id} />,
      <InboxScreen key="i" />,
      <MobileInboxScreen key="m" />,
    ]) {
      const { unmount } = render(ui);
      const text = document.body.textContent ?? "";
      for (const s of STALE) expect(text, s).not.toContain(s);
      unmount();
    }
  });
});
