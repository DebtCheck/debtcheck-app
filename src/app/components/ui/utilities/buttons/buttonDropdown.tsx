"use client";

import * as React from "react";
import { cn } from "@/app/lib/utils";
import { Button } from "./button";
import { ChevronDown } from "lucide-react";
import { Portal } from "../portal";

type DropdownItem = {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type Align = "start" | "end";
type Placement = "bottom" | "top";

export type ButtonDropdownProps = {
  buttonLabel: string | React.ReactNode;
  items: ReadonlyArray<DropdownItem>;
  onSelect: (id: string) => void;
  onSelectEx?: (info: {
    id: string;
    label: string;
    anchorRect: DOMRect;
  }) => void;
  className?: string;
  menuClassName?: string;
  align?: Align; // default: 'start'
  placement?: Placement; // default: 'bottom'
  showCaret?: boolean; // default: true
  disabled?: boolean;
  "aria-label"?: string;
};

export function ButtonDropdown({
  buttonLabel,
  items,
  onSelect,
  onSelectEx,
  className,
  menuClassName,
  align = "start",
  placement = "bottom",
  showCaret = true,
  disabled,
  ...aria
}: ButtonDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
  } | null>(null);

  const updateCoords = React.useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = 192; // menu width (w-48)
    const left = align === "start" ? r.left : r.right - width;
    const top = (placement === "bottom" ? r.bottom : r.top) + 4; // 4px gap
    setCoords({ top, left });
  }, [align, placement]);

  React.useEffect(() => {
    if (!open) return;

    updateCoords();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, updateCoords]);

  const enabledItems = React.useMemo(
    () => items.filter((it) => !it.disabled),
    [items]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(0);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, enabledItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(enabledItems.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = enabledItems[activeIndex];
      if (item) {
        onSelect(item.id);
        setOpen(false);
        setActiveIndex(-1);
        buttonRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      buttonRef.current?.focus();
    }
  };

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "bg-transparent border border-border/15 hover:bg-foreground/10 text-foreground px-3 py-1.5 text-sm transition",
          className
        )}
        {...aria}
      >
        <span className="inline-flex items-center gap-2">
          {buttonLabel}
          {showCaret && <ChevronDown className="size-4 opacity-70" />}
        </span>
      </Button>

      {open && coords && (
        <Portal>
          <div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className={cn(
              "z-500 w-48 rounded-xl border border-border/15 bg-popover/95 backdrop-blur shadow-xl",
              "py-1",
              "pointer-events-auto"
            )}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
            }}
          >
            <ul>
              {items.map((item, idx) => {
                const isDisabled = !!item.disabled;
                const isActive =
                  !isDisabled && enabledItems[activeIndex]?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2",
                        "cursor-pointer",
                        "text-foreground/90 hover:text-foreground",
                        "hover:bg-foreground/10 focus:bg-foreground/10 focus:outline-none",
                        isActive && "bg-foreground/10",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (isDisabled) return;
                        const rect = buttonRef.current?.getBoundingClientRect();
                        onSelect(item.id);
                        if (rect && onSelectEx) {
                          onSelectEx({
                            id: item.id,
                            label: item.label,
                            anchorRect: rect,
                          });
                        }
                        setOpen(false);
                        setActiveIndex(-1);
                        buttonRef.current?.focus();
                      }}
                      disabled={isDisabled}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="text-xs opacity-60">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Portal>
      )}
    </>
  );
}
