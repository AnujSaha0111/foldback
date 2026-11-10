import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Foldback plans, or try it as a guest with two sample plans.",
};

export default function LoginPage() {
  return <LoginForm />;
}
