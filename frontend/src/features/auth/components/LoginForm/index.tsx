"use client";

import { useLoginMutation } from "@/api/authApi";
import { Field } from "@/components/Field";
import { formText } from "@/lib/formText";
import { AuthForm } from "../AuthForm";

export function LoginForm() {
  const [login, { isLoading, error }] = useLoginMutation();

  const send = async (form: FormData) => {
    const result = await login({ email: formText(form, "email"), password: formText(form, "password") });
    return "data" in result;
  };

  return (
    <AuthForm
      title="Welcome back"
      lead="Pick up your plans where you left them."
      submitLabel="Sign in"
      busyLabel="Signing in…"
      busy={isLoading}
      error={error}
      send={send}
    >
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        required
      />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
    </AuthForm>
  );
}
