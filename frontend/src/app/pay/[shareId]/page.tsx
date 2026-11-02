import type { Metadata } from "next";
import { PayScreen } from "@/features/pay/components/PayScreen";

// A pay link names a person and an amount, so search engines keep out.
export const metadata: Metadata = { title: "Your share", robots: { index: false } };

interface PayPageProps {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ token?: string | string[]; cancelled?: string | string[] }>;
}

export default async function PayPage({ params, searchParams }: PayPageProps) {
  const { shareId } = await params;
  const { token, cancelled } = await searchParams;
  // PayPal's way back. A cancel carries a token too, and that one must never place a hold.
  const returnedOrder = typeof token === "string" && cancelled === undefined ? token : null;
  return <PayScreen shareId={shareId} returnedOrder={returnedOrder} />;
}
