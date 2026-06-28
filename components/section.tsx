import type { ReactNode } from "react";

type SectionProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
};

export function Section({ eyebrow, title, intro, children }: SectionProps) {
  return (
    <section className="border-t border-slate-200 py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-9 max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h2>
          {intro ? <p className="mt-4 text-base leading-7 text-slate-600">{intro}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
