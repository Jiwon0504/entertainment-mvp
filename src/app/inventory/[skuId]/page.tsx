import { SkuDetailClient } from "@/components/inventory/SkuDetailClient";

export default async function SkuDetailPage({ params }: { params: Promise<{ skuId: string }> }) {
  const { skuId } = await params;
  return <SkuDetailClient skuId={skuId} />;
}
