import type { ReactNode } from "react";

import { CrmChrome } from "@/components/wireframes/crm-chrome";
import { ConceptBadge } from "@/components/wireframes/concept-badge";
import { StepRail } from "@/components/wireframes/wf-ui";

export const IMPORT_STEPS = [
  "Upload",
  "Map columns",
  "Assign Leads",
  "Validate",
  "Resolve issues",
  "Confirm",
  "Process",
  "Results",
] as const;

/**
 * Frame shared by the import screens.
 *
 * Eight stages, each with its own screen, so every stage of §144's workflow
 * is directly demonstrable — including Processing (§159), which sits between
 * Confirm and Results.
 *
 * The step rail is the spine of this flow: at every point the admin can see
 * how far through they are and that nothing has been written yet.
 */
export function ImportShell({
  current,
  title,
  description,
  children,
}: {
  current: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <CrmChrome active="settings">
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <ConceptBadge className="lg:hidden" />
          </div>
          <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <StepRail steps={IMPORT_STEPS} current={current} />

        {children}
      </div>
    </CrmChrome>
  );
}
