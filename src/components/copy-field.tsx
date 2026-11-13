"use client";

import { useState } from "react";

/** Read-only link with a Copy button. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <input aria-label={label} value={value} readOnly onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" />
      <button
        type="button"
        className="btn-secondary shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard blocked: the text is selectable in the box.
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
