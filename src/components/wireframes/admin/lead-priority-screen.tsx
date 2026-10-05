"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Flame,
  History,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  Star,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CrmChrome } from "@/components/wireframes/crm-chrome";
import { PriorityBadge } from "@/components/wireframes/lead-priority-parts";
import { Note, Panel, ScreenHeading } from "@/components/wireframes/wf-ui";
import { LEAD_PRIORITY_COUNTS } from "@/lib/wireframes/mock-data";
import {
  LEAD_PRIORITIES,
  SET_DEFAULT_AUTHORITY_PENDING,
  deactivatePriority,
  orderedPriorities,
  reactivatePriority,
  reorderPriority,
  resolveDefaultPriority,
  type LeadPriority,
} from "@/lib/wireframes/lead-priority";

/**
 * E6 — Lead Priority (Settings → Lead Priority, spec §192).
 *
 * Its OWN screen, deliberately not a tab on the Pipeline page. §192 requires
 * that Priority "is separate from pipeline stage and must never be merged with
 * it or presented as a stage", and §40 adds that Hot, Warm and Cold "are
 * priority values, not pipeline stages, and must never be added to the
 * pipeline". A shared screen would quietly suggest otherwise.
 *
 * The operations offered are exactly the five §192 lists: add, rename,
 * reorder, deactivate, reactivate. There is no delete — a value that has been
 * used stays on the Leads and in the history that reference it (§192, §207),
 * so removing it outright has no safe meaning.
 *
 * Nothing here is a permission setting (§192, §2.6). The screen says so,
 * because a configuration page listing values next to an Active switch is
 * exactly where a client starts to assume otherwise.
 */
export function LeadPriorityScreen() {
  const [config, setConfig] =
    useState<readonly LeadPriority[]>(LEAD_PRIORITIES);
  /** The reason the last attempted change was refused, if it was. */
  const [refused, setRefused] = useState<string | null>(null);

  const ordered = orderedPriorities(config);
  const active = ordered.filter((p) => p.active);
  const retired = ordered.filter((p) => !p.active);
  // The configured default, or the reason there is not a usable one. Never a
  // substitute: §38 and §149 both read whatever is actually configured.
  const configuredDefault = resolveDefaultPriority(config);

  const apply = (result: ReturnType<typeof reorderPriority>) => {
    if (result.ok) {
      setConfig(result.config);
      setRefused(null);
      return;
    }
    setRefused(result.reason);
  };

  return (
    <CrmChrome active="settings">
      <div className="flex min-w-0 flex-col gap-5">
        <ScreenHeading
          title="Lead Priority"
          description="How urgent or promising a Lead is. A separate field from the pipeline stage — a Lead can be Hot at any stage, and changing one never changes the other."
        />

        <Note icon={Info}>
          These are <strong className="font-semibold">business values</strong>,
          not permissions. Changing them does not alter who can see a Lead, who
          owns it, or how new Leads are shared out between the team. The three
          values and the current default are{" "}
          <strong className="font-semibold">illustrative</strong> — for A&amp;S
          Fincare to confirm, not an approved decision.
        </Note>

        {/*
          §38 and §149 depend on a configured default. If the configuration
          cannot supply one, the screen says so rather than letting new Leads
          quietly pick up a different value.
        */}
        {configuredDefault.ok ? null : (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger-on-subtle"
          >
            {configuredDefault.reason}
          </p>
        )}

        {refused ? (
          <p
            role="alert"
            className="rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2.5 text-sm text-warning-on-subtle"
          >
            {refused}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel
              title="Active values"
              icon={Flame}
              count={active.length}
              action={
                <Button size="sm">
                  <Plus className="size-4" aria-hidden="true" />
                  Add value
                </Button>
              }
            >
              <ul className="divide-y divide-border/70">
                {active.map((priority, index) => (
                  <li
                    key={priority.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <PriorityBadge priorityId={priority.id} />
                        {configuredDefault.ok &&
                        configuredDefault.priority.id === priority.id ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <Star className="size-3" aria-hidden="true" />
                            Currently the default for new Leads
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {LEAD_PRIORITY_COUNTS[priority.id] ?? 0} leads currently
                        have this priority
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <IconButton
                        label={`Move ${priority.label} up`}
                        onClick={() =>
                          apply(reorderPriority(config, priority.id, "up"))
                        }
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Move ${priority.label} down`}
                        onClick={() =>
                          apply(reorderPriority(config, priority.id, "down"))
                        }
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton label={`Rename ${priority.label}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Deactivate ${priority.label}`}
                        onClick={() =>
                          apply(deactivatePriority(config, priority.id))
                        }
                      >
                        <History className="size-4" aria-hidden="true" />
                      </IconButton>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            {retired.length > 0 ? (
              <Panel
                title="Deactivated values"
                icon={History}
                count={retired.length}
              >
                <ul className="divide-y divide-border/70">
                  {retired.map((priority) => (
                    <li
                      key={priority.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <PriorityBadge priorityId={priority.id} />
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Not offered for new Leads or priority changes ·{" "}
                          {LEAD_PRIORITY_COUNTS[priority.id] ?? 0} existing
                          leads keep this value
                        </span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11 shrink-0 sm:min-h-9"
                        onClick={() =>
                          apply(reactivatePriority(config, priority.id))
                        }
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        Reactivate
                      </Button>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Panel title="What each action does" bodyClassName="p-4 sm:p-5">
              <ul className="flex flex-col gap-3 text-sm">
                <Rule label="Add">
                  A new value becomes available for new Leads and for priority
                  changes.
                </Rule>
                <Rule label="Rename">
                  The label changes everywhere it is shown. Past activity and
                  audit entries keep the wording they recorded, so history is
                  never rewritten.
                </Rule>
                <Rule label="Reorder">
                  Sets the order used by the Leads list, the priority filters
                  and the dashboard breakdown.
                </Rule>
                <Rule label="Deactivate">
                  Stops the value being chosen for new Leads and for future
                  priority changes. Leads that already hold it keep it, and go
                  on displaying it. The value currently set as the default
                  cannot be deactivated, because new Leads would silently start
                  receiving a different priority.
                </Rule>
                <Rule label="Reactivate">
                  Makes a deactivated value selectable again.
                </Rule>
              </ul>
              <p className="mt-4 rounded-lg border border-border bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                There is no delete. A value that Leads or history refer to has
                to stay readable, so values are deactivated rather than removed.
              </p>
              {/*
                The honest gap. The specification depends on a configured
                default (§38, §149) but does not list choosing it among §192's
                Admin operations, so no control for choosing it appears here.
              */}
              <p className="mt-2 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2.5 text-xs leading-relaxed text-warning-on-subtle">
                <strong className="font-semibold">
                  Changing the default is not offered yet.
                </strong>{" "}
                {SET_DEFAULT_AUTHORITY_PENDING}
              </p>
            </Panel>

            <Panel title="Not the pipeline" bodyClassName="p-4 sm:p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Hot, Warm and Cold are priority values. They are not pipeline
                stages and are never added to the pipeline. A Lead has one stage{" "}
                <em>and</em> one priority, and moving it between stages leaves
                its priority alone.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 min-h-11 sm:min-h-9"
                asChild
              >
                <Link href={"/wireframes/admin/pipeline" as Route}>
                  Pipeline stages
                </Link>
              </Button>
            </Panel>
          </div>
        </div>
      </div>
    </CrmChrome>
  );
}

function Rule({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2.5">
      <Check
        className="mt-0.5 size-4 shrink-0 text-success"
        aria-hidden="true"
      />
      <span className="min-w-0">
        <strong className="font-semibold text-foreground">{label}</strong>{" "}
        <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-9"
    >
      {children}
    </button>
  );
}
