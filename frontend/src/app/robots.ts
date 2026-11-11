import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public pages may be indexed. Pay links and plans are private, so crawlers are asked to stay out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/login", "/signup", "/privacy"], disallow: ["/pay/", "/plans"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
