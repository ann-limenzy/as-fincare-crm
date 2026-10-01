"use client";

import { ArrowLeft, Check, FileText, Lock, Send, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { PhoneFrame, PhoneScreen } from "@/components/wireframes/phone-frame";
import {
  CONVERSATIONS,
  TEMPLATES,
  type Template,
} from "@/lib/wireframes/mock-data";
import { USER, userById } from "@/lib/wireframes/sales-teams";
import {
  NO_SELECTABLE_TEMPLATE,
  checkSend,
  eligibleTemplatesFor,
  previewTemplate,
} from "@/lib/wireframes/whatsapp-messaging";
import {
  resolveTemplateValues,
  templateNeedsPurchase,
} from "@/lib/wireframes/whatsapp-template-variables";
import { sendMessage } from "@/lib/wireframes/whatsapp-store";
import { cn } from "@/lib/utils";

/**
 * B4 — Choose a message template (phone).
 *
 * A bottom sheet, because the list is short and the salesperson is already at
 * the bottom of the screen composing. Selecting a template previews the exact
 * text with this customer's details filled in — nothing is sent until they
 * read it and press send.
 *
 * The list is what can actually be sent. §97 and §197 put the
 * Approved/Pending/Rejected/Unavailable listing on the Admin template screen;
 * a salesperson picking a reply mid-conversation has no use for another
 * team's approval backlog.
 */
export function MobileTemplatesScreen({
  templates = TEMPLATES,
}: {
  /** Overridden only to show an account with no approved template. */
  templates?: readonly Template[];
} = {}) {
  const conversation = CONVERSATIONS[0]!;
  const viewer = userById(USER.sneha);
  const offered = eligibleTemplatesFor(viewer, conversation, templates);
  const [selected, setSelected] = useState(
    offered[1]?.id ?? offered[0]?.id ?? "",
  );
  /** §98: never a silent default when the customer holds several policies. */
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const chosen = offered.find((t) => t.id === selected) ?? null;
  const preview =
    chosen === null
      ? null
      : previewTemplate(viewer, conversation, chosen, purchaseId);
  const purchaseChoices =
    chosen === null || !templateNeedsPurchase(chosen)
      ? []
      : (() => {
          const resolved = resolveTemplateValues(viewer, conversation, chosen);
          return resolved.ok ? [] : resolved.choices;
        })();
  const check = checkSend(
    viewer,
    conversation,
    {
      text: "",
      templateId: selected === "" ? null : selected,
      purchaseId,
    },
    templates,
  );

  const send = () => {
    if (!check.ok || chosen === null) return;
    sendMessage(conversation.id, check);
    setSent(chosen.name);
  };

  return (
    <div className="app-ambient min-h-dvh">
      <div className="mx-auto w-full max-w-[1100px] px-0 py-0 md:px-6 md:py-8">
        <PhoneFrame caption="Bottom sheet · preview before sending">
          <PhoneScreen
            activeNav="whatsapp"
            header={
              <header className="surface-glass sticky top-0 z-10 flex items-center gap-1 rounded-none border-x-0 border-t-0 px-2 py-2 pt-[env(safe-area-inset-top)]">
                <Link
                  href={"/wireframes/whatsapp/mobile" as Route}
                  aria-label="Back to conversation"
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground"
                >
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {conversation.person}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Choosing a template
                  </p>
                </div>
              </header>
            }
          >
            {/* Dimmed conversation behind the sheet. */}
            <div
              aria-hidden="true"
              className="flex flex-col gap-3 bg-muted/40 px-3 py-4 opacity-40"
            >
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-xl bg-primary px-3 py-2 text-[13px] text-primary-foreground">
                  Yes, please renew it
                </div>
              </div>
              <div className="flex justify-start">
                <div className="surface-solid max-w-[85%] rounded-xl px-3 py-2 text-[13px]">
                  Same cover as last year is fine.
                </div>
              </div>
            </div>

            {/* Bottom sheet */}
            <section
              aria-label="Message templates"
              className="surface-solid sticky bottom-0 rounded-t-2xl border-t border-border shadow-2xl"
            >
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span
                  aria-hidden="true"
                  className="absolute top-2 left-1/2 mx-auto h-1 w-10 -translate-x-1/2 rounded-full bg-border-strong/50"
                />
                <FileText
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-semibold text-foreground">
                  Approved templates
                </h2>
                <Link
                  href={"/wireframes/whatsapp/mobile" as Route}
                  aria-label="Close templates"
                  className="ms-auto grid size-11 place-items-center rounded-lg text-muted-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </Link>
              </div>

              {sent === null ? (
                <>
                  {offered.length === 0 ? (
                    <p
                      role="status"
                      className="px-4 py-5 text-[12px] leading-relaxed text-muted-foreground"
                    >
                      {NO_SELECTABLE_TEMPLATE}
                    </p>
                  ) : (
                    <ul className="max-h-[15rem] divide-y divide-border/70 overflow-y-auto">
                      {offered.map((t) => {
                        const isSelected = t.id === selected;
                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(t.id);
                                setPurchaseId(null);
                              }}
                              aria-pressed={isSelected}
                              className={cn(
                                "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left",
                                isSelected && "bg-accent",
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "grid size-5 shrink-0 place-items-center rounded-full border",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border-strong",
                                )}
                              >
                                {isSelected ? (
                                  <Check className="size-3" />
                                ) : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-foreground">
                                  {t.name}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {t.purpose} · {t.language}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="border-t border-border px-4 py-3">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Preview
                    </p>
                    {purchaseChoices.length > 0 ? (
                      <div className="mt-1.5 mb-1.5">
                        <label
                          htmlFor="applicable-purchase-phone"
                          className="mb-1 block text-[11px] font-medium text-foreground"
                        >
                          Which policy is this about?
                        </label>
                        <select
                          id="applicable-purchase-phone"
                          value={purchaseId ?? ""}
                          onChange={(e) =>
                            setPurchaseId(
                              e.target.value === "" ? null : e.target.value,
                            )
                          }
                          className="h-11 w-full rounded-lg border border-input bg-surface px-2.5 text-[13px] text-foreground"
                        >
                          <option value="">Choose a policy…</option>
                          {purchaseChoices.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.planSubProduct} · {p.policyReference}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {preview === null ? (
                      <p className="mt-1.5 text-[12px] text-muted-foreground">
                        Nothing to preview.
                      </p>
                    ) : preview.ok ? (
                      <p
                        data-testid="template-preview"
                        className="mt-1.5 rounded-lg bg-primary px-3 py-2.5 text-[13px] leading-relaxed text-primary-foreground"
                      >
                        {preview.text}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-medium text-danger-on-subtle">
                        {preview.reason}
                      </p>
                    )}

                    <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      <Lock
                        className="mt-0.5 size-3 shrink-0"
                        aria-hidden="true"
                      />
                      Your administrator decides which templates appear here.
                      Creation, editing and approval happen on the WhatsApp
                      platform, not in the CRM.
                    </p>

                    {!check.ok ? (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {check.reason}
                      </p>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={"/wireframes/whatsapp/mobile" as Route}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground"
                      >
                        Cancel
                      </Link>
                      <button
                        type="button"
                        onClick={send}
                        disabled={!check.ok}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        <Send className="size-4" aria-hidden="true" />
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-4 py-5">
                  <p className="text-sm font-semibold text-foreground">
                    {sent} added to the conversation
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                    It starts as Sending and settles to Sent, Delivered and then
                    Read as WhatsApp reports each step. Open the conversation to
                    watch it.
                  </p>
                  <Link
                    href={"/wireframes/whatsapp/mobile" as Route}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
                  >
                    Back to conversation
                  </Link>
                </div>
              )}
            </section>
          </PhoneScreen>
        </PhoneFrame>
      </div>
    </div>
  );
}
