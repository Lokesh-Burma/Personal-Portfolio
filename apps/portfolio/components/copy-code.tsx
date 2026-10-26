"use client";

import { useState } from "react";

type CopyCodeProps = {
  code: string;
};

export function CopyCode({ code }: CopyCodeProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-canvas">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">Command</span>
        <button
          className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-panel-raised"
          onClick={copyCode}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}
