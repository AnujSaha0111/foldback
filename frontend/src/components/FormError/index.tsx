import type { ApiFailure } from "@/api/baseApi";
import { errorCode, errorMessage } from "@/api/baseApi";
import { Message } from "./styled";

interface FormErrorProps {
  error: ApiFailure | undefined;
}

/**
 * The failure of a request, under the button that sent it. The alert region is always mounted, so screen readers
 * announce the message when it arrives. A lapsed session shows nothing: the header already sends the person to sign in. A wrong password still shows.
 */
export function FormError({ error }: FormErrorProps) {
  const signedOut = errorCode(error) === "unauthenticated";
  return <Message role="alert">{error && !signedOut ? errorMessage(error) : null}</Message>;
}
