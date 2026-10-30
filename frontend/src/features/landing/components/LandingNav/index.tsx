"use client";

import { ButtonLink } from "@/components/Button";
import { NavMenu } from "@/components/NavMenu";
import { GuestButton } from "@/features/auth/components/GuestButton";

const SECTIONS = [
  { href: "#how", label: "How it works" },
  { href: "#hold", label: "Why a hold" },
  { href: "#board", label: "The board" },
];

export function LandingNav() {
  return (
    <NavMenu
      links={SECTIONS.map((section) => ({
        key: section.href,
        render: (close) => (
          <a href={section.href} onClick={close}>
            {section.label}
          </a>
        ),
      }))}
      actions={
        <>
          <ButtonLink href="/login" variant="link" arrow={false}>
            Sign in
          </ButtonLink>
          <GuestButton small />
        </>
      }
    />
  );
}
