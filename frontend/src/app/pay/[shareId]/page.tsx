import type { Metadata } from "next";
import { PayScreen } from "@/features/pay/components/PayScreen";

// A pay link names a person and an amount, so search engines keep out.
export const metadata: Metadata = { title: "Your share", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  return <PayScreen shareId={shareId} />;
}
