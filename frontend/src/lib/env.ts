/** Where the browser finds the API. A production build refuses to run without it (next.config.ts). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
