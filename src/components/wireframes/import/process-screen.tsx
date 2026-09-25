"use client";

import { CircleCheck, Loader, SkipForward, XCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { ImportShell } from "@/components/wireframes/import/import-shell";
import { Note, Panel } from "@/components/wireframes/wf-ui";
import {
  choiceLabel,
  getAssignmentChoice,
  getAssignmentServerChoice,
  subscribeToAssignmentChoice,
} from "@/lib/wireframes/import-assignment";
import { IMPORT_RESULT, VALIDATION_TOTALS } from "@/lib/wireframes/mock-data";

/**
 * A7 — Import processing (spec §159).
 *
 * A deterministic wireframe state, not a live job: the numbers below are
 * fixed so a demonstration shows the same thing every time. §159 says the
 * user need not keep the page open and that revisiting must not create
 * duplicate records, so this screen offers no way to start the import again
 * — Back would falsely imply a completed import could be undone.
 */

/** Partway through, so the screen shows real remaining work. */
const PROCESSED = 260;

export function ProcessScreen() {
  const choice = useSyncExternalStore(
    subscribeToAssignmentChoice,
    getAssignmentChoice,
    getAssignmentServerChoice,
  );
  const total = VALIDATION_TOTALS.ready;
  const remaining = Math.max(0, total - PROCESSED);
  const percent = Math.round((PROCESSED / total) * 100);

  return (
    <ImportShell
      current={6}
      title="Import in progress"
      description="The import is running. You may continue using the CRM — a notification is created when it completes."
    >
      <div className="flex flex-col gap-4">
        <Panel title="Progress" bodyClassName="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Loader
              className="size-5 shrink-0 animate-spin text-primary"
              aria-hidden="true"
            />
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-medium text-foreground"
            >
              {PROCESSED} of {total} records processed — {remaining} remaining
            </p>
          </div>

          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Import progress"
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              icon={CircleCheck}
              label="Processed"
              value={PROCESSED}
              tone="success"
            />
            <Stat
              icon={SkipForward}
              label="Duplicates skipped"
              value={IMPORT_RESULT.skippedDuplicates}
              tone="neutral"
            />
            <Stat
              icon={XCircle}
              label="Failed so far"
              value={0}
              tone="neutral"
            />
          </dl>
        </Panel>

        <Panel title="Assignment being applied" bodyClassName="p-4 sm:p-5">
          <p className="text-sm text-foreground">{choiceLabel(choice)}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            This is the strategy confirmed at the previous step. It is applied
            as each row is created and is recorded in the import history.
          </p>
        </Panel>

        <Note>
          Nothing can be re-run from here. Leaving this screen does not stop the
          import, and returning to it will not start a second one.
        </Note>

        <div className="flex flex-wrap gap-2">
          {/*
            No Back control: §159 requires that revisiting the flow cannot
            create duplicate records, and a Back action here would imply a
            running import could be undone.
          */}
          <Button asChild className="ms-auto">
            <Link href={"/wireframes/import/result" as Route}>
              View result when complete
            </Link>
          </Button>
        </div>
      </div>
    </ImportShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CircleCheck;
  label: string;
  value: number;
  tone: "success" | "neutral";
}) {
  return (
    <div className="surface-solid rounded-lg p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon
          className={
            tone === "success"
              ? "size-3.5 text-success"
              : "size-3.5 text-muted-foreground"
          }
          aria-hidden="true"
        />
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-foreground tabular-nums">
        {value}
      </dd>
    </div>
  );
}
