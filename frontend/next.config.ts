import type { NextConfig } from "next";

// The browser calls the API directly. In production that is https://api.<domain> (same site as app.<domain>, so the
// session cookie is sent). In development it is the local backend on another port of localhost, which is also the
// same site. A production build without the address would silently point at localhost, so it refuses to build.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL must be set for a production build, for example https://api.example.com",
  );
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
