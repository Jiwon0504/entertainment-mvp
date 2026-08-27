import { RiskInvestigationClient } from "@/components/risk/RiskInvestigationClient";

export default async function RiskInvestigationPage({ params }: { params: Promise<{ concertId: string }> }) {
  const { concertId } = await params;
  return <RiskInvestigationClient concertId={concertId} />;
}
