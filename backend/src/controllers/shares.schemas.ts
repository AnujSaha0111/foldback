import { z } from "zod";

/** The `token` from PayPal's return URL. It only has to look like an id: the service compares it to the stored order. */
export const authorizeSchema = z.strictObject({ order_id: z.string().min(1).max(64) });
export type AuthorizeInput = z.infer<typeof authorizeSchema>;
