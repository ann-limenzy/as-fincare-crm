"use client";

import {
  Building2,
  CalendarCheck,
  CircleAlert,
  Info,
  Layers,
  Mail,
  MessageCircle,
  Package,
  Plus,
  Timer,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CrmChrome } from "@/components/wireframes/crm-chrome";
import {
  Note,
  Panel,
  ScreenHeading,
  TableScroll,
} from "@/components/wireframes/wf-ui";
import {
  EMAIL_TEMPLATES,
  FOLLOW_UP_DEFAULTS,
  REMINDER_RULES,
  TEMPLATES,
} from "@/lib/wireframes/mock-data";
import {
  PLANS,
  PRODUCT_CATEGORIES,
  PROVIDERS,
  UNKNOWN_CATALOGUE_LABEL,
  catalogueProblems,
  categoryById,
  mayDeactivateCategory,
  orderedCategories,
  planLineage,
  plansByProvider,
  plansInCategory,
  providersForCategory,
} from "@/lib/wireframes/catalogue";
import { templateUnavailableReason } from "@/lib/wireframes/whatsapp-messaging";
import { cn } from "@/lib/utils";

/**
 * E4 — Products, reminders and templates.
 *
 * The screen that answers the client's real question: "can we change this
 * ourselves later?" Everything here is business configuration — what you
 * sell, when customers are reminded, and what those reminders say — and none
 * of it needs a developer.
 */

const TABS = [
  { id: "products", label: "Product Catalogue", icon: Package },
  { id: "reminders", label: "Renewal reminders", icon: Timer },
  { id: "followups", label: "Follow-up defaults", icon: CalendarCheck },
  { id: "whatsapp", label: "WhatsApp templates", icon: MessageCircle },
  { id: "email", label: "Email templates", icon: Mail },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ConfigurationScreen() {
  const [tab, setTab] = useState<TabId>("products");

  return (
    <CrmChrome active="settings">
      <div className="flex min-w-0 flex-col gap-5">
        <ScreenHeading
          title="Products, reminders and templates"
          description="The settings A&S Fincare will change most often, in one place. None of this needs a developer."
        />

        <div
          role="tablist"
          aria-label="Configuration sections"
          className="surface-elevated flex flex-wrap gap-1 rounded-xl p-1.5"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors sm:flex-none",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "products" ? <ProductsTab /> : null}
        {tab === "reminders" ? <RemindersTab /> : null}
        {tab === "followups" ? <FollowUpsTab /> : null}
        {tab === "whatsapp" ? <WhatsAppTab /> : null}
        {tab === "email" ? <EmailTab /> : null}
      </div>
    </CrmChrome>
  );
}

function ProductsTab() {
  /*
   * §193: the Product Catalogue, at its three levels. §66 is explicit that
   * these are three separate things and that a Customer buys only the third —
   * a flat "products and services" list with a category column could not say
   * which provider a plan belongs to, and invited a purchase against the
   * category itself.
   */
  const problems = catalogueProblems();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Note icon={Info}>
        The catalogue is{" "}
        <strong className="font-semibold">reference data</strong>. A customer
        buys a <strong className="font-semibold">Plan / Sub-product</strong> —
        never a category or a provider on its own. Deactivating an entry stops
        it being chosen for new purchases and never alters an existing one.
      </Note>

      {problems.length > 0 ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5 text-sm text-danger-on-subtle"
        >
          {problems.join(" ")}
        </p>
      ) : null}

      <Panel
        title="Product Categories"
        icon={Layers}
        count={PRODUCT_CATEGORIES.length}
        action={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Add category
          </Button>
        }
      >
        <ul className="divide-y divide-border/70">
          {orderedCategories().map((category, index) => {
            const deactivate = mayDeactivateCategory(category.id);
            return (
              <li
                key={category.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {category.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {plansInCategory(category.id).length} plans ·{" "}
                    {providersForCategory(category.id).length} active providers
                  </span>
                </span>
                <CatalogueStatus active={category.active} />
                {/*
                  §193.1: "a Category cannot be deactivated while it has active
                  Providers or Plans still available for selection."
                */}
                <span className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    disabled={!deactivate.ok}
                    title={deactivate.ok ? undefined : deactivate.reason}
                  >
                    Deactivate
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel
        title="Providers"
        icon={Building2}
        count={PROVIDERS.length}
        action={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Add provider
          </Button>
        }
      >
        <ul className="divide-y divide-border/70">
          {PROVIDERS.map((provider) => (
            <li
              key={provider.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {provider.name}
                </span>
                {/*
                  §193.2 and §66: "a Provider may offer multiple Plans, across
                  more than one Product Category." So the categories it operates
                  in are a list.
                */}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {provider.categoryIds
                    .map(
                      (id) => categoryById(id)?.name ?? UNKNOWN_CATALOGUE_LABEL,
                    )
                    .join(" · ")}{" "}
                  · {plansByProvider(provider.id).length} plans
                </span>
              </span>
              <CatalogueStatus active={provider.active} />
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0 sm:min-h-9"
              >
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Plans / Sub-products"
        icon={Package}
        count={PLANS.length}
        action={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Add plan
          </Button>
        }
      >
        <TableScroll>
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Plan / Sub-product
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Provider
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Product Category
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map((plan) => {
                // §193.3: exactly one provider and exactly one category each.
                const lineage = planLineage(plan.id);
                return (
                  <tr
                    key={plan.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {plan.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lineage.ok
                        ? lineage.lineage.provider.name
                        : UNKNOWN_CATALOGUE_LABEL}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lineage.ok
                        ? lineage.lineage.category.name
                        : UNKNOWN_CATALOGUE_LABEL}
                    </td>
                    <td className="px-4 py-3">
                      <CatalogueStatus active={plan.active} />
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      </Panel>

      <Note icon={CircleAlert} tone="warning">
        A withdrawn plan stays on the purchases that already hold it, with its
        policy number, documents, Closed Amount and renewal history intact. It
        is simply no longer offered when recording a new purchase. The catalogue
        connects to no provider system.
      </Note>
    </div>
  );
}

/** Active or inactive, in words. Never colour alone. */
function CatalogueStatus({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        active
          ? "border-success/30 bg-success-subtle text-success-on-subtle"
          : "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RemindersTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <Panel
        title="Renewal reminder timing"
        icon={Timer}
        count={REMINDER_RULES.length}
      >
        <ul className="divide-y divide-border/70">
          {REMINDER_RULES.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {rule.product}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reminds the customer {rule.offsets}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {rule.channel}
              </span>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Note icon={CircleAlert} tone="warning">
        Reminders only go out once the relevant channel is set up. WhatsApp is
        not connected and the email sender is not verified in these wireframes,
        so nothing would actually send.
      </Note>
    </div>
  );
}

function FollowUpsTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Panel title="Follow-up defaults" icon={CalendarCheck}>
        <ul className="divide-y divide-border/70">
          {FOLLOW_UP_DEFAULTS.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                {d.label}
              </span>
              <span className="shrink-0 text-sm font-medium text-foreground">
                {d.value}
              </span>
              <Button variant="ghost" size="sm">
                Change
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Why this matters" icon={Wrench} bodyClassName="p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          These defaults decide what a salesperson sees before they type
          anything. Setting the default follow-up to a 10:00 AM call means the
          common case takes one tap, and the unusual case still takes the same
          three.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Round-robin assignment spreads new leads across the team automatically
          rather than leaving them unassigned until someone notices.
        </p>
      </Panel>
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <Panel
        title="WhatsApp templates"
        icon={MessageCircle}
        count={TEMPLATES.length}
        action={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            New template
          </Button>
        }
      >
        <ul className="divide-y divide-border/70">
          {TEMPLATES.map((t) => (
            <li key={t.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {t.name}
                </p>
                {/* §97's columns: Purpose, Language, Status. */}
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {t.purpose}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {t.language}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    !t.active
                      ? "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle"
                      : t.status === "Approved"
                        ? "border-success/30 bg-success-subtle text-success-on-subtle"
                        : t.status === "Pending"
                          ? "border-warning/30 bg-warning-subtle text-warning-on-subtle"
                          : t.status === "Rejected"
                            ? "border-danger/30 bg-danger-subtle text-danger-on-subtle"
                            : "border-border-strong/40 bg-neutral-subtle text-neutral-on-subtle",
                  )}
                >
                  {t.active ? t.status : "Not in use"}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t.body}
              </p>
              {/*
                §98's variables, listed for the administrator. The operational
                picker shows none of this: there it is already substituted.
              */}
              <p className="mt-1.5 flex flex-wrap gap-1">
                {t.variables.map((v) => (
                  <code
                    key={v}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </p>
              {templateUnavailableReason(t) ? (
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {templateUnavailableReason(t)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>

      <Note icon={CircleAlert} tone="warning">
        WhatsApp requires Meta to approve each template before it can be sent.
        No approval has been requested in these wireframes. Creation, editing
        and approval happen on the WhatsApp platform — the CRM lists what the
        connected account reports and sends the administrator there, rather than
        implying the change was made here. Managing templates is business data
        and changes nobody&rsquo;s permissions.
      </Note>
    </div>
  );
}

function EmailTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <Panel
        title="Email templates"
        icon={Mail}
        count={EMAIL_TEMPLATES.length}
        action={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            New template
          </Button>
        }
      >
        <ul className="divide-y divide-border/70">
          {EMAIL_TEMPLATES.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {t.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t.subject}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  t.status === "Active"
                    ? "border-success/30 bg-success-subtle text-success-on-subtle"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {t.status}
              </span>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Panel>

      <Note icon={CircleAlert} tone="warning">
        Email sending needs a verified sender address for the workspace. Until
        that is set up, templates can be written but nothing will send.
      </Note>
    </div>
  );
}
