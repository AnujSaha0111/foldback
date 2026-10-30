"use client";

import { useSignupMutation } from "@/api/authApi";
import { Field } from "@/components/Field";
import { formText } from "@/lib/formText";
import { AuthForm } from "../AuthForm";

export function SignupForm() {
  const [signup, { isLoading, error }] = useSignupMutation();

  const send = async (form: FormData) => {
    const result = await signup({
      display_name: formText(form, "name"),
      email: formText(form, "email"),
      password: formText(form, "password"),
    });
    return "data" in result;
  };

  return (
    <AuthForm
      title="Create account"
      prompt="Already have one?"
      other={{ href: "/login", label: "Sign in" }}
      submitLabel="Create account"
      busyLabel="Creating account…"
      busy={isLoading}
      error={error}
      send={send}
    >
      <Field label="Name" name="name" autoComplete="name" placeholder="Alex Chen" maxLength={80} required />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        help="At least 10 characters"
        minLength={10}
        maxLength={128}
        required
      />
    </AuthForm>
  );
}
