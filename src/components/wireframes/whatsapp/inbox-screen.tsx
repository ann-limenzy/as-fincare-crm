"use client";

import { ArrowRight, Inbox, Search, UserX } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { CrmChrome } from "@/components/wireframes/crm-chrome";
import { ChannelMark } from "@/components/wireframes/whatsapp/parts";
import { DeliveryTag } from "@/components/wireframes/whatsapp/parts";
import { Avatar, ScreenHeading } from "@/components/wireframes/wf-ui";
import { Button } from "@/components/ui/button";
import { CONVERSATIONS } from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import {
  maySeeUnassignedQueue,
  visibleConversationsFor,
} from "@/lib/wireframes/whatsapp-access";
import {
  getConversationServerState,
  getConversationState,
  subscribeToConversations,
} from "@/lib/wireframes/whatsapp-store";
import { cn } from "@/lib/utils";

/**
 * B1 — Shared WhatsApp inbox (desktop).
 *
 * A team inbox, not a personal one: every conversation shows who owns it and
 * whether it is still open. Unassigned conversations are the ones that go
 * unanswered, so they get their own filter and a visible marker.
 */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "mine", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
  { id: "unread", label: "Unread" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function InboxScreen() {
  const [filter, setFilter] = useState<FilterId>("all");

  // Presented as the Admin. The list is what the shared predicate permits,
  // never the raw mock array — a Team Lead or Salesperson opening this same
  // component sees only their own scope and no unassigned queue at all.
  const viewer = userById(USER.arun);
  const store = useSyncExternalStore(
    subscribeToConversations,
    getConversationState,
    getConversationServerState,
  );
  // Derived from store state, so the Unassigned count falls by itself once a
  // conversation has been assigned — nothing about it is hardcoded.
  const permitted = visibleConversationsFor(viewer, store.conversations);
  const showUnassigned = maySeeUnassignedQueue(viewer);
  const [selected, setSelected] = useState(permitted[0]?.id ?? "");

  const visible = permitted.filter((c) => {
    switch (filter) {
      case "mine":
        // §93 forbids a supervisor from ever being an assignee, so an Admin
        // correctly has none of their own.
        return c.assignedToUserId === viewer.id;
      case "unassigned":
        return c.assignedToUserId === null;
      case "unread":
        return c.unread > 0;
      case "open":
        return c.status === "Open";
      case "closed":
        return c.status === "Closed";
      default:
        return true;
    }
  });

  // The detail pane must show a row that is actually in the filtered list.
  // Otherwise selecting Unassigned would keep the previous conversation on
  // screen, and Open conversation would link to the wrong thread.
  const active = visible.find((c) => c.id === selected) ?? visible[0] ?? null;

  return (
    <CrmChrome active="whatsapp">
      <div className="flex flex-col gap-5">
        <ScreenHeading
          title="WhatsApp"
          description="Every customer conversation the business has on WhatsApp, in one shared inbox. Each one has an owner, so nothing sits unanswered."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <section className="surface-elevated overflow-hidden rounded-xl">
            <div className="border-b border-border p-3">
              <div className="surface-solid flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Search className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Search name or phone number</span>
              </div>

              <div
                role="group"
                aria-label="Filter conversations"
                className="mt-2.5 flex flex-wrap gap-1.5"
              >
                {FILTERS.filter(
                  // §89.1: Team Leads and Salespersons never see the queue,
                  // so the tab is absent rather than empty for them.
                  (f) => f.id !== "unassigned" || showUnassigned,
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filter === f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      filter === f.id
                        ? "border-primary/40 bg-primary/12 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="max-h-[34rem] divide-y divide-border/70 overflow-y-auto">
              {visible.map((c) => {
                const isSelected = c.id === active?.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors",
                        isSelected ? "bg-accent" : "hover:bg-accent/60",
                      )}
                    >
                      <Avatar
                        initials={initialsOf(c.person)}
                        tone={c.unread > 0 ? "whatsapp" : "muted"}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-sm",
                              c.unread > 0
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground",
                            )}
                          >
                            {c.person}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {c.time}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {c.lastMessage}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {c.assignedToUserId ? (
                            <span className="truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {userById(c.assignedToUserId).name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning-subtle px-2 py-0.5 text-[11px] font-medium text-warning-on-subtle">
                              <UserX className="size-3" aria-hidden="true" />
                              Unassigned
                            </span>
                          )}
                          {c.status === "Closed" ? (
                            <span className="rounded-full border border-border-strong/40 bg-neutral-subtle px-2 py-0.5 text-[11px] text-neutral-on-subtle">
                              Closed
                            </span>
                          ) : null}
                          {c.unread > 0 ? (
                            <span className="ms-auto grid size-5 shrink-0 place-items-center rounded-full bg-channel-whatsapp text-[10px] font-semibold text-channel-whatsapp-foreground">
                              {c.unread}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}

              {visible.length === 0 ? (
                <li className="px-4 py-12 text-center">
                  <Inbox
                    className="mx-auto size-7 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Nothing here right now
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try another filter.
                  </p>
                </li>
              ) : null}
            </ul>
          </section>

          {active ? (
            <section className="surface-elevated rounded-xl p-5">
              <div className="flex flex-wrap items-start gap-3">
                <ChannelMark className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {active.person}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {active.phone} · {active.recordLabel}
                  </p>
                </div>
                <DeliveryTag state={active.delivery} time={active.time} />
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <Fact label="Product" value={active.product} />
                <Fact
                  label="Assigned to"
                  value={
                    active.assignedToUserId
                      ? userById(active.assignedToUserId).name
                      : "Unassigned"
                  }
                />
                <Fact label="Status" value={active.status} />
              </dl>

              <p className="mt-5 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Last message:
                </span>{" "}
                {active.lastMessage}
              </p>

              {/*
                Every row opens its OWN conversation, so the Unassigned queue
                reaches the unknown-number thread rather than landing on the
                built-out one.
              */}
              <Button asChild className="mt-5">
                <Link
                  href={
                    `/wireframes/whatsapp/conversation?conversation=${active.id}` as Route
                  }
                >
                  Open conversation
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>
          ) : null}
        </div>
      </div>
    </CrmChrome>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function initialsOf(name: string): string {
  if (/^\d/.test(name)) return "#";
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
