"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Root } from "./styled";

const TABS = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Create account" },
];

/** Sign in and create account are two pages; these links switch between them like tabs, with an ink underline. */
export function AuthTabs() {
  const pathname = usePathname();
  return (
    <Root aria-label="Account">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </Root>
  );
}
