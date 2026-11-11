import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Providers } from "@/components/Providers";
import { SITE_URL } from "@/lib/site";
import { themeInitScript } from "@/theme/initScript";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const DESCRIPTION =
  "Group payments as PayPal holds. Captured if everyone joins by the deadline, released if not.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Foldback", template: "%s · Foldback" },
  description: DESCRIPTION,
  // The card image is app/opengraph-image.tsx; Next adds it to every page.
  openGraph: { title: "Foldback", description: DESCRIPTION, url: "/", siteName: "Foldback", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  // The page may draw under a notch; Inner, the footer and the sign-in and pay columns keep their content clear of it.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161616" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
