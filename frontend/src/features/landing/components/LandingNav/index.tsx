"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/Button";
import { GuestButton } from "@/features/auth/components/GuestButton";
import { Actions, Links, Menu, Toggle } from "./styled";

const SECTIONS = [
  { href: "#how", label: "How it works" },
  { href: "#hold", label: "Why a hold" },
  { href: "#board", label: "The board" },
];

const MENU_ID = "main-menu";

/** The links collapse into a menu under 900 px. */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Toggle
        type="button"
        aria-expanded={open}
        aria-controls={MENU_ID}
        aria-label="Menu"
        onClick={() => setOpen(!open)}
      >
        <span />
      </Toggle>
      <Menu id={MENU_ID} aria-label="Main" data-open={open}>
        <Links>
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <a href={section.href} onClick={() => setOpen(false)}>
                {section.label}
              </a>
            </li>
          ))}
        </Links>
        <Actions>
          <ButtonLink href="/login" variant="link" arrow={false}>
            Sign in
          </ButtonLink>
          <GuestButton small />
        </Actions>
      </Menu>
    </>
  );
}
