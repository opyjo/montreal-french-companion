"use client";

import type { RefObject } from "react";

const ACCENTS = ["é", "è", "ê", "à", "â", "ç", "î", "ï", "ô", "ù", "û", "ë", "œ"];

/** On-screen accent keys that insert at the cursor (most keyboards make these painful). */
export function AccentKeys({
  inputRef,
  value,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  function insert(ch: string) {
    const el = inputRef.current;
    if (!el) return onChange(value + ch);
    const s = el.selectionStart ?? value.length;
    const e = el.selectionEnd ?? value.length;
    onChange(value.slice(0, s) + ch + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + ch.length, s + ch.length);
    });
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Accented letters">
      {ACCENTS.map((a) => (
        <button
          key={a}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(a)}
          className="min-w-9 rounded-lg border border-line bg-surface px-2 py-1.5 text-base hover:bg-surface-2"
        >
          {a}
        </button>
      ))}
    </div>
  );
}
