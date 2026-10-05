/**
 * The insurance product catalogue (spec §66, §193, §193.1–§193.3).
 *
 * Three levels of reference data, and nothing customer-specific:
 *
 *   Product Category → Provider → Plan / Sub-product
 *
 * §66 is explicit about the shape and about what a Customer actually buys:
 * "A Customer purchases a Plan/Sub-product, never a Product Category and never
 * a Provider on its own." A Customer Purchase therefore references a PLAN id —
 * see `customer-purchase.ts` — and reads its Category and Provider back
 * through the catalogue rather than storing its own copies.
 *
 * Everything joins on stable ids. §193 lets Admin rename a catalogue record, so
 * a purchase that referenced the name "Family Health Optima" would change
 * meaning the moment it was renamed; one that references `plan-fho` does not.
 *
 * §193: "catalogue visibility is not restricted by the reporting hierarchy;
 * every role needs to read the catalogue to do their work." So nothing here
 * takes an actor — the restriction lives on the operational records that
 * reference it, not on the reference data itself. Equally, §66: "catalogue
 * records are never the Record Owner or assignee of an operational record",
 * so no entity here carries an owner.
 */

/* ------------------------------------------------------------------ model */

export type ProductCategory = {
  readonly id: string;
  /** §193.1 "Category Name — required". */
  readonly name: string;
  /** §193.1 "Description — optional". */
  readonly description?: string;
  /** §193.1 lists Reorder among the actions. */
  readonly order: number;
  /** §193.1 "Status — Active / Inactive". */
  readonly active: boolean;
};

export type Provider = {
  readonly id: string;
  /** §193.2 "Provider Name — required". */
  readonly name: string;
  /**
   * §193.2 "Product Categories the Provider operates in", and §66: "a Provider
   * may offer multiple Plans, across more than one Product Category." So this
   * is a list, not a single parent.
   */
  readonly categoryIds: readonly string[];
  /** §193.2 "Reference / code, where A&S Fincare uses one — optional". */
  readonly reference?: string;
  readonly description?: string;
  readonly active: boolean;
};

export type Plan = {
  readonly id: string;
  /** §193.3 "Plan Name — required". */
  readonly name: string;
  /**
   * §66 and §193.3: "each Plan belongs to exactly ONE Product Category and
   * exactly ONE Provider." Singular on purpose — the cardinality is the
   * integrity rule, and a list here would quietly permit a Plan in two places.
   */
  readonly categoryId: string;
  readonly providerId: string;
  readonly description?: string;
  readonly active: boolean;
};

/* ------------------------------------------------------- illustrative data */

/**
 * §66 and §193.3 both say the names are "examples showing the shape of the
 * data… not fixed or seeded values" — A&S Fincare's real catalogue is entered
 * by an Admin. Everything below is illustrative, and the provider names that
 * are not real carry "(sample)" so nobody reads them as a commercial
 * relationship that exists.
 */
export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  { id: "cat-health", name: "Health Insurance", order: 1, active: true },
  { id: "cat-motor", name: "Motor Insurance", order: 2, active: true },
  { id: "cat-life", name: "Term Life Insurance", order: 3, active: true },
  { id: "cat-puc", name: "PUC Certificate", order: 4, active: true },
];

export const PROVIDERS: readonly Provider[] = [
  {
    id: "prov-star",
    name: "Star Health",
    categoryIds: ["cat-health"],
    active: true,
  },
  {
    /*
     * Operates in two categories, which is what §193.2 and §66 allow: "a
     * Provider may offer multiple Plans, across more than one Product
     * Category." Without one such provider the relationship would be
     * indistinguishable from one-category-per-provider.
     */
    id: "prov-shield",
    name: "Shield General (sample provider)",
    categoryIds: ["cat-motor", "cat-health"],
    active: true,
  },
  {
    id: "prov-pinnacle",
    name: "Pinnacle Life (sample provider)",
    categoryIds: ["cat-life"],
    active: true,
  },
  {
    id: "prov-testing",
    name: "Authorised Testing Centre (sample)",
    categoryIds: ["cat-puc"],
    active: true,
  },
];

export const PLANS: readonly Plan[] = [
  {
    // §66's own worked example.
    id: "plan-fho",
    name: "Family Health Optima",
    categoryId: "cat-health",
    providerId: "prov-star",
    active: true,
  },
  {
    id: "plan-secure-shield",
    name: "Secure Shield",
    categoryId: "cat-health",
    providerId: "prov-star",
    active: true,
  },
  {
    id: "plan-shield-health",
    name: "Shield Health Advantage",
    categoryId: "cat-health",
    providerId: "prov-shield",
    active: true,
  },
  {
    id: "plan-car-comp",
    name: "Private Car Comprehensive",
    categoryId: "cat-motor",
    providerId: "prov-shield",
    active: true,
  },
  {
    id: "plan-tw-comp",
    name: "Two Wheeler Comprehensive",
    categoryId: "cat-motor",
    providerId: "prov-shield",
    active: true,
  },
  {
    id: "plan-term-25",
    name: "Term Secure 25",
    categoryId: "cat-life",
    providerId: "prov-pinnacle",
    active: true,
  },
  {
    id: "plan-car-puc",
    name: "Private Car PUC",
    categoryId: "cat-puc",
    providerId: "prov-testing",
    active: true,
  },
  {
    /*
     * Withdrawn by the provider. §193.3: deactivating a Plan "prevents it from
     * being selected for new Customer Purchases. Existing purchases keep their
     * Plan reference, their history and their renewal cycles." A purchase still
     * holds this one, which is the only way to show that rule.
     */
    id: "plan-health-classic",
    name: "Star Health Classic (withdrawn)",
    categoryId: "cat-health",
    providerId: "prov-star",
    active: false,
  },
];

/* ---------------------------------------------------------------- reading */

export function categoryById(
  id: string,
  from: readonly ProductCategory[] = PRODUCT_CATEGORIES,
): ProductCategory | undefined {
  return from.find((c) => c.id === id);
}

export function providerById(
  id: string,
  from: readonly Provider[] = PROVIDERS,
): Provider | undefined {
  return from.find((p) => p.id === id);
}

export function planById(
  id: string,
  from: readonly Plan[] = PLANS,
): Plan | undefined {
  return from.find((p) => p.id === id);
}

/** Categories in configured order (§193.1 "Reorder"). */
export function orderedCategories(
  from: readonly ProductCategory[] = PRODUCT_CATEGORIES,
): readonly ProductCategory[] {
  return [...from].sort((a, b) => a.order - b.order);
}

/** §67: "selecting a Category narrows the Providers offered." Active only. */
export function providersForCategory(
  categoryId: string,
  providers: readonly Provider[] = PROVIDERS,
): readonly Provider[] {
  return providers.filter(
    (p) => p.active && p.categoryIds.includes(categoryId),
  );
}

/** §67: "selecting a Provider narrows the Plans offered." Active only. */
export function plansFor(
  categoryId: string,
  providerId: string,
  plans: readonly Plan[] = PLANS,
): readonly Plan[] {
  return plans.filter(
    (p) =>
      p.active && p.categoryId === categoryId && p.providerId === providerId,
  );
}

/** Every Plan in a category, whatever the Provider (§66). */
export function plansInCategory(
  categoryId: string,
  plans: readonly Plan[] = PLANS,
): readonly Plan[] {
  return plans.filter((p) => p.categoryId === categoryId);
}

/** Every Plan a Provider offers, across categories (§193.2). */
export function plansByProvider(
  providerId: string,
  plans: readonly Plan[] = PLANS,
): readonly Plan[] {
  return plans.filter((p) => p.providerId === providerId);
}

/* --------------------------------------------------------------- lineage */

/** Shown wherever a catalogue reference resolves to nothing. */
export const UNKNOWN_CATALOGUE_LABEL = "Not available";

export type PlanLineage = {
  readonly plan: Plan;
  readonly provider: Provider;
  readonly category: ProductCategory;
};

export type LineageResult =
  | { readonly ok: true; readonly lineage: PlanLineage }
  | { readonly ok: false; readonly reason: string };

/**
 * Resolve a Plan to its Provider and Product Category.
 *
 * This is how §68's detail view gets all three levels from the one reference a
 * purchase stores. An unresolvable id is reported, never swapped for another
 * catalogue entry: showing the wrong insurer on a policy is worse than showing
 * that the record needs attention.
 */
export function planLineage(
  planId: string,
  catalogue: {
    readonly plans?: readonly Plan[];
    readonly providers?: readonly Provider[];
    readonly categories?: readonly ProductCategory[];
  } = {},
): LineageResult {
  const plans = catalogue.plans ?? PLANS;
  const providers = catalogue.providers ?? PROVIDERS;
  const categories = catalogue.categories ?? PRODUCT_CATEGORIES;

  const plan = planById(planId, plans);
  if (!plan) {
    return {
      ok: false,
      reason: `This purchase refers to a plan that is not in the catalogue (${planId}).`,
    };
  }
  const provider = providerById(plan.providerId, providers);
  if (!provider) {
    return {
      ok: false,
      reason: `${plan.name} refers to a provider that is not in the catalogue.`,
    };
  }
  const category = categoryById(plan.categoryId, categories);
  if (!category) {
    return {
      ok: false,
      reason: `${plan.name} refers to a product category that is not in the catalogue.`,
    };
  }
  return { ok: true, lineage: { plan, provider, category } };
}

/**
 * Whether this Plan may be chosen for a NEW Customer Purchase.
 *
 * §193.2 and §193.3: deactivating either the Plan or its Provider "prevents its
 * Plans from being selected for new Customer Purchases". A deactivated Category
 * has the same effect, since §193.1 requires its Providers and Plans to be
 * deactivated first.
 */
export function isPlanSelectable(
  planId: string,
  catalogue: {
    readonly plans?: readonly Plan[];
    readonly providers?: readonly Provider[];
    readonly categories?: readonly ProductCategory[];
  } = {},
): boolean {
  const result = planLineage(planId, catalogue);
  if (!result.ok) return false;
  const { plan, provider, category } = result.lineage;
  return plan.active && provider.active && category.active;
}

/** Every Plan currently offerable, in category then plan-name order. */
export function selectablePlans(
  catalogue: {
    readonly plans?: readonly Plan[];
    readonly providers?: readonly Provider[];
    readonly categories?: readonly ProductCategory[];
  } = {},
): readonly Plan[] {
  const plans = catalogue.plans ?? PLANS;
  return plans.filter((p) => isPlanSelectable(p.id, catalogue));
}

/* ------------------------------------------------------------- integrity */

/**
 * §193.1: "a Category cannot be deactivated while it has active Providers or
 * Plans still available for selection. Those must be deactivated first."
 */
export function mayDeactivateCategory(
  categoryId: string,
  catalogue: {
    readonly plans?: readonly Plan[];
    readonly providers?: readonly Provider[];
  } = {},
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const plans = catalogue.plans ?? PLANS;
  const providers = catalogue.providers ?? PROVIDERS;
  const activePlans = plans.filter(
    (p) => p.categoryId === categoryId && p.active,
  );
  if (activePlans.length > 0) {
    return {
      ok: false,
      reason: `${activePlans.length} active ${
        activePlans.length === 1 ? "plan" : "plans"
      } still belong to this category. Deactivate those first.`,
    };
  }
  const activeProviders = providers.filter(
    (p) => p.active && p.categoryIds.includes(categoryId),
  );
  if (activeProviders.length > 0) {
    return {
      ok: false,
      reason: `${activeProviders.length} active ${
        activeProviders.length === 1 ? "provider" : "providers"
      } still operate in this category. Deactivate those first.`,
    };
  }
  return { ok: true };
}

/**
 * Structural problems in the catalogue itself.
 *
 * Checked rather than assumed, because §66's cardinality rules are the thing
 * that makes a purchase's Category and Provider derivable at all: a Plan
 * pointing at a Provider that does not operate in the Plan's Category would
 * make the hierarchy shown on screen a fiction.
 */
export function catalogueProblems(
  catalogue: {
    readonly plans?: readonly Plan[];
    readonly providers?: readonly Provider[];
    readonly categories?: readonly ProductCategory[];
  } = {},
): readonly string[] {
  const plans = catalogue.plans ?? PLANS;
  const providers = catalogue.providers ?? PROVIDERS;
  const categories = catalogue.categories ?? PRODUCT_CATEGORIES;
  const problems: string[] = [];

  for (const provider of providers) {
    if (provider.categoryIds.length === 0) {
      problems.push(`${provider.name} operates in no product category.`);
    }
    for (const id of provider.categoryIds) {
      if (!categoryById(id, categories)) {
        problems.push(`${provider.name} refers to unknown category ${id}.`);
      }
    }
  }

  for (const plan of plans) {
    const provider = providerById(plan.providerId, providers);
    const category = categoryById(plan.categoryId, categories);
    if (!provider) {
      problems.push(
        `${plan.name} refers to unknown provider ${plan.providerId}.`,
      );
      continue;
    }
    if (!category) {
      problems.push(
        `${plan.name} refers to unknown category ${plan.categoryId}.`,
      );
      continue;
    }
    if (!provider.categoryIds.includes(plan.categoryId)) {
      problems.push(
        `${plan.name} is a ${category.name} plan but ${provider.name} does not operate in that category.`,
      );
    }
  }

  const ids = [
    ...categories.map((c) => c.id),
    ...providers.map((p) => p.id),
    ...plans.map((p) => p.id),
  ];
  if (new Set(ids).size !== ids.length) {
    problems.push("Two catalogue records share an id.");
  }
  return problems;
}
