import { Board } from "@/features/board/components/Board";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Board id={id} />;
}
