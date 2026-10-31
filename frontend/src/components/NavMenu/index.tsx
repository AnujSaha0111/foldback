"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Actions, Links, Menu, Toggle } from "./styled";

interface NavLink {
  key: string;
  /** Receives the function that closes the menu, so following a link on a phone does not leave it open. */
  render: (close: () => void) => ReactNode;
}

interface NavMenuProps {
  links: NavLink[];
  actions: ReactNode;
}

const MENU_ID = "main-menu";

/** The links and actions in the header. Under 900 px they collapse into a menu. */
export function NavMenu({ links, actions }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    toggle.current?.focus();
  };
  return (
    <>
      <Toggle
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={MENU_ID}
        aria-label="Menu"
        onClick={() => setOpen(!open)}
        onKeyDown={closeOnEscape}
      >
        <span />
      </Toggle>
      <Menu id={MENU_ID} aria-label="Main" data-open={open} onKeyDown={closeOnEscape}>
        <Links>
          {links.map((link) => (
            <li key={link.key}>{link.render(() => setOpen(false))}</li>
          ))}
        </Links>
        <Actions>{actions}</Actions>
      </Menu>
    </>
  );
}
