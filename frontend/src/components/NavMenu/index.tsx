"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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
          {links.map((link) => (
            <li key={link.key}>{link.render(() => setOpen(false))}</li>
          ))}
        </Links>
        <Actions>{actions}</Actions>
      </Menu>
    </>
  );
}
