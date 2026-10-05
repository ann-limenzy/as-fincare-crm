import { PurchaseDetailScreen } from "@/components/wireframes/customers/purchase-detail";
import { StepFooter } from "@/components/wireframes/presentation-chrome";

/**
 * Which Customer Purchase to show. Read on the server and handed down as a
 * plain string; the screen resolves it against the purchase list and shows an
 * explicit "not available" rather than substituting another purchase.
 */
export default async function Page({
  searchParams,
}: PageProps<"/wireframes/customers/purchase">) {
  const { purchase } = await searchParams;
  return (
    <>
      <PurchaseDetailScreen
        purchaseId={typeof purchase === "string" ? purchase : null}
      />
      <StepFooter />
    </>
  );
}
