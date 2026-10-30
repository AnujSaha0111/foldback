import { PlanPreview } from "@/features/rules/components/PlanPreview";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanPreview id={id} />;
}
