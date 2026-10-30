"use client";

import { useState } from "react";
import { useSignupMutation } from "@/api/authApi";
import { Field } from "@/components/Field";
import { formText } from "@/lib/formText";
import { AuthForm } from "../AuthForm";

/** An address needs a name, an @, and a domain with a dot and a real ending: the browser's own check allows "a@b". */
const EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[A-Za-z]{2,}";

export function SignupForm() {
  const [signup, { isLoading, error }] = useSignupMutation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm !== "" && confirm !== password;

  const send = async (form: FormData) => {
    if (password !== confirm) return false;
    const result = await signup({
      display_name: formText(form, "name"),
      email: formText(form, "email"),
      password: formText(form, "password"),
    });
    return "data" in result;
  };

  return (
    <AuthForm
      title="Create your account"
      lead="Plans you make stay yours. Sandbox only."
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
        pattern={EMAIL_PATTERN}
        title="An email like name@example.com"
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
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        help={mismatch ? "The passwords do not match." : undefined}
        aria-invalid={mismatch || undefined}
        maxLength={128}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        required
      />
    </AuthForm>
  );
}
