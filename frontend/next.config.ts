import type { NextConfig } from "next";

// The browser calls the API directly. In production that is https://api.<domain> (same site as app.<domain>, so the
// session cookie is sent). In development it is the local backend on another port of localhost, which is also the
// same site. A production build without the address would silently point at localhost, so it refuses to build.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be set for a production build, for example https://api.example.com",
  );
}

const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const sockets = api.replace(/^http/, "ws");

// Report-only first: Next.js, Emotion and Bryntum inject inline styles and scripts, so the policy is watched in the
// console on a preview deploy before it is enforced. The other headers are safe to send now.
const CSP = [
  "default-src 'self'",
  `connect-src 'self' ${api} ${sockets}`,
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "frame-ancestors 'none'",
].join("; ");

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers() {
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The microphone is ours only, for Speak the plan on New plan.
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
      // Pay links are capabilities: never indexed, whatever the page or response.
      { source: "/pay/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ]);
  },
};

export default config;
