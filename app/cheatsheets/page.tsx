import Link from "next/link";
import { Section } from "@/components/section";
import { getAllCheatSheets } from "@/lib/content";

export default function CheatSheetsPage() {
  const cheatSheets = getAllCheatSheets();

  return (
    <main>
      <Section
        eyebrow="Cheatsheets"
        title="Command references for backend and cloud work"
        intro="Small, practical notes for tools I use repeatedly. Each sheet is meant to be fast to scan and easy to extend."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {cheatSheets.map((sheet) => (
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500" key={sheet.slug}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">{sheet.category}</p>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">{sheet.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{sheet.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {sheet.tools.map((tool) => (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700" key={tool}>
                    {tool}
                  </span>
                ))}
              </div>
              <Link className="mt-5 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900" href={`/cheatsheets/${sheet.slug}`}>
                Open cheatsheet
              </Link>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}
