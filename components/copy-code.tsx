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
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Command</span>
        <button
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
          onClick={copyCode}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
