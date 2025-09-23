import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { ProgressDomain } from "../../progress/Progress.types";
import { PROGRESS_THEME } from "./util";
import { DOMAIN_OPTIONS, type DomainOption } from "./constants";

const DOMAIN_BUTTON_STYLE: CSSProperties & { ["--tw-ring-color"]?: string } = {
  backgroundColor: "transparent",
  border: `1px solid ${PROGRESS_THEME.accentPrimary}`,
  boxShadow: PROGRESS_THEME.domainButtonShadow,
  color: PROGRESS_THEME.accentPrimary,
  ["--tw-ring-color"]: PROGRESS_THEME.accentPrimaryFocusRing,
};

const DOMAIN_MENU_STYLE: CSSProperties = {
  borderColor: PROGRESS_THEME.cardBorder,
  boxShadow: PROGRESS_THEME.cardShadow,
};

const DOMAIN_OPTION_HOVER_CLASS = "hover:bg-[rgba(226,125,96,0.08)]" as const;

interface DomainSelectorProps {
  domain: ProgressDomain;
  onChange: (domain: ProgressDomain) => void;
  options?: DomainOption[];
  encouragement: string;
}

export function DomainSelector({ domain, onChange, options = DOMAIN_OPTIONS, encouragement }: DomainSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const activeOption = options.find((option) => option.value === domain);

  return (
    <section className="relative" ref={menuRef}>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#111111]">{encouragement}</h1>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className="flex w-full items-center justify-between rounded-2xl px-5 py-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={DOMAIN_BUTTON_STYLE}
      >
        <span>{activeOption?.label ?? "Select"}</span>
        <span className="ml-3 text-base" aria-hidden>
          {menuOpen ? "▲" : "▼"}
        </span>
      </button>
      {menuOpen ? (
        <ul role="listbox" className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border bg-white" style={DOMAIN_MENU_STYLE}>
          {options.map((option) => {
            const isActive = option.value === domain;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.value);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-5 py-3 text-sm font-semibold transition focus:outline-none ${
                    isActive ? "" : DOMAIN_OPTION_HOVER_CLASS
                  }`}
                  style={{
                    backgroundColor: isActive ? PROGRESS_THEME.accentPrimarySurface : "transparent",
                    color: isActive ? PROGRESS_THEME.accentPrimary : PROGRESS_THEME.textMuted,
                  }}
                >
                  <span>{option.label}</span>
                  {isActive ? <span aria-hidden>✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
