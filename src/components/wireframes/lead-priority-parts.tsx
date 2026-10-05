import {
  LEAD_PRIORITIES,
  displayPriority,
  type LeadPriority,
  type PriorityTone,
} from "@/lib/wireframes/lead-priority";
import { cn } from "@/lib/utils";

/**
 * Lead Priority indicator (spec §192, §41, §43, §57).
 *
 * One component, everywhere priority is shown, so a screen cannot drift into
 * its own labels or its own colour meanings.
 *
 * It always prints the word. §57 requires priority to be "visibly distinct"
 * and §192 makes it a field in its own right — a coloured dot alone would be
 * invisible to anyone who cannot tell the colours apart, and indistinguishable
 * from the stage indicator beside it. The tone is decoration layered on top of
 * the text, never a substitute for it.
 */
const TONE_CLASS: Record<PriorityTone, string> = {
  hot: "border-danger/30 bg-danger-subtle text-danger-on-subtle",
  warm: "border-warning/30 bg-warning-subtle text-warning-on-subtle",
  cold: "border-info/30 bg-info-subtle text-info-on-subtle",
};

/** The neutral treatment, for a value an administrator added later. */
const NEUTRAL =
  "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle";

export function PriorityBadge({
  priorityId,
  /** Include the "Priority:" prefix, where the surrounding text needs it. */
  withLabel = false,
  /** The configuration to resolve against. The screens use the real one. */
  config = LEAD_PRIORITIES,
  className,
}: {
  priorityId: string | null | undefined;
  withLabel?: boolean;
  config?: readonly LeadPriority[];
  className?: string;
}) {
  const priority = displayPriority(priorityId, config);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        priority.tone ? TONE_CLASS[priority.tone] : NEUTRAL,
        className,
      )}
    >
      {withLabel ? (
        <span className="font-normal opacity-80">Priority:</span>
      ) : null}
      {priority.label}
      {/*
        §192: a deactivated value stays on the Leads that hold it and "must
        continue to display correctly". Saying so is clearer than showing a
        value the user can no longer choose with no explanation.
      */}
      {priority.retired ? (
        <span className="font-normal opacity-80">· retired</span>
      ) : null}
    </span>
  );
}

/**
 * Priority as plain text, for a dense row or a sentence.
 *
 * Same resolution, no colour at all — which is the point: every surface can
 * convey priority without relying on the badge.
 */
export function PriorityText({
  priorityId,
  config = LEAD_PRIORITIES,
  className,
}: {
  priorityId: string | null | undefined;
  config?: readonly LeadPriority[];
  className?: string;
}) {
  const priority = displayPriority(priorityId, config);
  return (
    <span className={className}>
      Priority: {priority.label}
      {priority.retired ? " (retired)" : ""}
    </span>
  );
}
