"use client";

import { Info, TriangleAlert } from "lucide-react";

import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AssignmentSummary } from "@/components/wireframes/import/assignment-summary";
import { ImportShell } from "@/components/wireframes/import/import-shell";
import { Note, Panel } from "@/components/wireframes/wf-ui";
import { VALIDATION_TOTALS, WORKSPACE } from "@/lib/wireframes/mock-data";

/**
 * A5 — Confirm and process.
 *
 * Import is a major data action, so it takes an explicit confirmation that
 * states exactly what will and will not happen — in the future tense,
 * because nothing has started yet.
 *
 * There is deliberately no progress here. Stage 7 has its own screen
 * (`/wireframes/import/process`), and showing live progress before the
 * admin has pressed Start would misdescribe what the CRM is doing.
 */
export function ConfirmScreen() {
  return (
    <ImportShell
      current={5}
      title="Confirm and process"
      description="The last checkpoint before records are created. Everything below is reversible up to the moment you start."
    >
      <AssignmentSummary title="Assignment being confirmed" showDistribution />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <ConfirmCard />

        <div className="flex flex-col gap-4">
          <Panel title="What happens next" bodyClassName="p-4 sm:p-5">
            <p className="mb-3.5 text-xs leading-relaxed text-muted-foreground">
              After you start the import, {VALIDATION_TOTALS.ready} ready rows
              will be processed. You can monitor progress on the next screen.
              Duplicate, needs-attention and non-importable rows will remain
              accounted for in the final result.
            </p>
            <ol className="flex flex-col gap-3.5 text-sm">
              <NextStep n={1} title="Records will be created">
                {VALIDATION_TOTALS.ready} new leads will appear in the{" "}
                {WORKSPACE.name} workspace, owned by the users you mapped.
              </NextStep>
              <NextStep n={2} title="You will be able to carry on working">
                Progress will be shown on the next screen. The import will run
                without this page staying open.
              </NextStep>
              <NextStep n={3} title="You will get a notification">
                A notification will appear when the import finishes, with the
                result and any error report.
              </NextStep>
            </ol>
          </Panel>

          <Note icon={Info}>
            Rows outside the import are not deleted or altered — they stay in
            your spreadsheet, and the issue report tells you why each one was
            left out.
          </Note>
        </div>
      </div>
    </ImportShell>
  );
}

function ConfirmCard() {
  return (
    // Presented as the confirmation dialog it will be, shown inline so the
    // client can read it during the walkthrough.
    <section
      role="group"
      aria-label="Import confirmation"
      className="surface-solid rounded-xl p-5 shadow-lg sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning-subtle text-warning-on-subtle"
        >
          <TriangleAlert className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Import {VALIDATION_TOTALS.ready} leads?
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates new records in the {WORKSPACE.name} workspace.
          </p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-3 text-sm">
        <Outcome tone="create">
          <strong className="font-semibold text-foreground">
            {VALIDATION_TOTALS.ready} new lead records
          </strong>{" "}
          will be created in the {WORKSPACE.name} workspace.
        </Outcome>
        <Outcome tone="skip">
          <strong className="font-semibold text-foreground">
            {VALIDATION_TOTALS.duplicates} possible duplicates
          </strong>{" "}
          will be skipped. Existing records are not changed.
        </Outcome>
        <Outcome tone="skip">
          <strong className="font-semibold text-foreground">
            {VALIDATION_TOTALS.attention} rows that need attention
          </strong>{" "}
          will not be imported, and will stay available to resolve.
        </Outcome>
        <Outcome tone="skip">
          <strong className="font-semibold text-foreground">
            {VALIDATION_TOTALS.cannotImport} rows that cannot be imported
          </strong>{" "}
          will remain outside the import and appear in the error report.
        </Outcome>
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        All {VALIDATION_TOTALS.found} rows in the file are accounted for by the
        four outcomes above. Nothing has been created yet — the import starts
        only when you press the button below.
      </p>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          <Link href={"/wireframes/import/resolve" as Route}>Back</Link>
        </Button>
        <Button asChild>
          <Link href={"/wireframes/import/process" as Route}>Start import</Link>
        </Button>
      </div>
    </section>
  );
}

function Outcome({
  tone,
  children,
}: {
  tone: "create" | "skip";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-muted-foreground">
      <span
        aria-hidden="true"
        className={
          tone === "create"
            ? "mt-1.5 size-2 shrink-0 rounded-full bg-success"
            : "mt-1.5 size-2 shrink-0 rounded-full bg-border-strong"
        }
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function NextStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
      >
        {n}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {children}
        </span>
      </span>
    </li>
  );
}
