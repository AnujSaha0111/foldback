import type { ApiFailure } from "@/api/baseApi";
import { errorMessage } from "@/api/baseApi";
import { Message } from "./styled";

interface FormErrorProps {
  error: ApiFailure | undefined;
}

/** The failure of a request, under the button that sent it. Nothing is shown until there is one. */
export function FormError({ error }: FormErrorProps) {
  return error ? <Message role="alert">{errorMessage(error)}</Message> : null;
}
