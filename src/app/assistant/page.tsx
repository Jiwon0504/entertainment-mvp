import { AssistantClient } from "@/components/assistant/AssistantClient";
import { getSkuById } from "@/lib/data";

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sku?: string }>;
}) {
  const { q, sku } = await searchParams;
  const focusedSku = sku ? getSkuById(sku) : undefined;

  return (
    <AssistantClient
      initialQuery={q}
      focusedSkuId={focusedSku?.id}
      focusedSkuName={focusedSku?.name}
    />
  );
}
