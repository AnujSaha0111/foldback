import { z } from "zod";

/** The `token` from PayPal's return URL. It only has to look like an id: the service compares it to the stored order. */
export const authorizeSchema = z.strictObject({ order_id: z.string().min(1).max(64) });
export type AuthorizeInput = z.infer<typeof authorizeSchema>;

/** `buyer_cancelled` comes from PayPal's cancel return. Without it, sync only settles unknown calls. */
export const syncSchema = z.strictObject({ buyer_cancelled: z.literal(true).optional() });
export type SyncInput = z.infer<typeof syncSchema>;
