"use client";

import Dialog from "@mui/material/Dialog";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { useGetContractsQuery } from "@/api/contractsApi";
import { DRAFT_STATUSES } from "@/lib/status";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectThemeMode, toggleTheme } from "@/store/themeSlice";
import { Empty, Input, List, Option, PAPER_SX } from "./styled";

interface Command {
  id: string;
  label: string;
  /** What choosing it does, on the right. */
  hint: string;
  run: () => void;
}

export interface PaletteProps {
  onClose: () => void;
  onReset: () => void;
  onSignOut: () => void;
}

const STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

/** Every place and action an organizer has, filtered as they type. Nothing here moves money. */
function useCommands({ onReset, onSignOut }: Omit<PaletteProps, "onClose">): Command[] {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const dark = useAppSelector(selectThemeMode) === "dark";
  const { data } = useGetContractsQuery();
  const go = (href: string) => () => router.push(href);
  const plans = (data ?? []).filter((plan) => !DRAFT_STATUSES.has(plan.status));
  return [
    { id: "plans", label: "Plans", hint: "Read a chat, start a plan", run: go("/plans") },
    ...plans.map((plan) => ({
      id: plan.id,
      label: plan.title ?? "Untitled plan",
      hint: "Open plan",
      run: go(`/plans/${plan.id}`),
    })),
    {
      id: "theme",
      label: dark ? "Light theme" : "Dark theme",
      hint: "Switch theme",
      run: () => dispatch(toggleTheme()),
    },
    { id: "reset", label: "Reset demo data", hint: "Asks first", run: onReset },
    { id: "sign-out", label: "Sign out", hint: "End this session", run: onSignOut },
  ];
}

/** The command palette: a combobox over a listbox, driven by arrows and Enter, closed by Escape. */
export function Palette({ onClose, ...actions }: PaletteProps) {
  const commands = useCommands(actions);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const id = useId();
  const needle = query.trim().toLowerCase();
  const shown = commands.filter((command) => command.label.toLowerCase().includes(needle));
  const current = shown[Math.min(active, shown.length - 1)];

  const choose = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = STEP[event.key];
    if (step !== undefined && shown.length > 0) {
      event.preventDefault();
      setActive((Math.min(active, shown.length - 1) + step + shown.length) % shown.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(current);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      transitionDuration={0}
      aria-labelledby={`${id}-title`}
      slotProps={{ paper: { sx: PAPER_SX } }}
    >
      <h2 id={`${id}-title`} className="sr-only">
        Command menu
      </h2>
      <Input
        autoFocus
        role="combobox"
        aria-expanded
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={current ? `${id}-${current.id}` : undefined}
        aria-label="Search pages and actions"
        placeholder="Search pages and actions…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <List id={`${id}-list`} role="listbox" aria-label="Results">
        {shown.map((command, index) => (
          <Option
            key={command.id}
            id={`${id}-${command.id}`}
            role="option"
            aria-selected={command === current}
            onMouseMove={() => setActive(index)}
            onClick={() => choose(command)}
          >
            <span>{command.label}</span>
            <small>{command.hint}</small>
          </Option>
        ))}
      </List>
      {shown.length === 0 ? <Empty>Nothing matches “{query.trim()}”.</Empty> : null}
    </Dialog>
  );
}
