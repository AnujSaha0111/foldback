import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/SignupForm";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create a Foldback account: paste a group chat, confirm the plan, and send each friend a PayPal hold link.",
};

export default function SignupPage() {
  return <SignupForm />;
}
