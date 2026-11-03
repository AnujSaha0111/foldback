import { z } from "zod";

/** Where the demo clock moves to. The rule reads it as "now". */
export const clockSchema = z.strictObject({ demo_now: z.iso.datetime({ offset: true }) });
export type ClockInput = z.infer<typeof clockSchema>;
