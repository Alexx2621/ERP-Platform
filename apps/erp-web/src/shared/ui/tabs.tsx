import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  ariaLabel: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ items, ariaLabel, value, defaultValue, onValueChange }: TabsProps) {
  const generatedId = useId();
  const firstEnabledId = items.find((item) => !item.disabled)?.id;
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabledId);
  const requestedValue = value ?? internalValue;
  const activeValue = items.some((item) => item.id === requestedValue && !item.disabled)
    ? requestedValue
    : firstEnabledId;
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // A real sliding pill under the active tab, not just a color swap —
  // measured (not animated via layout libraries this codebase doesn't
  // depend on) so it can transition smoothly between two real button
  // positions. useLayoutEffect runs before paint, so the first render's
  // position is already correct — no visible jump on mount. jsdom (unit
  // tests) reports zeroed rects, which only means the indicator sits at
  // {0,0} there; nothing asserts its position.
  const activeIndex = items.findIndex((item) => item.id === activeValue);
  useLayoutEffect(() => {
    const node = activeIndex >= 0 ? buttonRefs.current[activeIndex] : null;
    if (!node) {
      setIndicator(null);
      return;
    }
    setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
  }, [activeIndex, items.length]);

  const activate = (nextValue: string): void => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  const moveFocus = (currentIndex: number, direction: 1 | -1): void => {
    if (items.length === 0) {
      return;
    }
    let nextIndex = currentIndex;
    for (let attempt = 0; attempt < items.length; attempt += 1) {
      nextIndex = (nextIndex + direction + items.length) % items.length;
      if (!items[nextIndex]?.disabled) {
        const nextItem = items[nextIndex];
        buttonRefs.current[nextIndex]?.focus();
        if (nextItem) {
          activate(nextItem.id);
        }
        return;
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(index, event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const enabledIndexes = items
        .map((item, itemIndex) => (!item.disabled ? itemIndex : -1))
        .filter((itemIndex) => itemIndex >= 0);
      const nextIndex = event.key === "Home" ? enabledIndexes[0] : enabledIndexes.at(-1);
      if (nextIndex !== undefined) {
        const nextItem = items[nextIndex];
        buttonRefs.current[nextIndex]?.focus();
        if (nextItem) {
          activate(nextItem.id);
        }
      }
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="relative flex gap-1 overflow-x-auto border-b border-[var(--line-strong)]"
      >
        {items.map((item, index) => {
          const selected = item.id === activeValue;
          return (
            <button
              key={item.id}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${generatedId}-tab-${item.id}`}
              aria-controls={`${generatedId}-panel-${item.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => activate(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`h-11 shrink-0 px-3.5 text-[13px] font-extrabold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
                selected ? "text-[var(--accent)]" : "text-[var(--muted-strong)] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
        {indicator ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-1px] h-0.5 rounded-full bg-[var(--accent)] transition-[left,width] duration-[220ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{ left: indicator.left + 8, width: Math.max(indicator.width - 16, 0) }}
          />
        ) : null}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${generatedId}-panel-${item.id}`}
          aria-labelledby={`${generatedId}-tab-${item.id}`}
          tabIndex={0}
          hidden={item.id !== activeValue}
          className="py-5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
        >
          {item.panel}
        </div>
      ))}
    </div>
  );
}
