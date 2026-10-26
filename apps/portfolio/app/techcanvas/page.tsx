import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/section";

export const metadata: Metadata = {
  title: "TechCanvas AI | Lokesh Burma",
  description: "A private concept studio for technical explanations, visual memory aids, and reviewable blog drafts.",
};

export default function TechCanvasPage() {
  return (
    <main>
      <Section eyebrow="TechCanvas AI" title="Learn it. Visualize it. Make it yours." intro="A concept studio that turns technical ideas into clear explanations, visual memory aids, and drafts you can review before sharing.">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["01", "Explore a concept", "Work through an explanation, a practical example, and the tradeoffs."],
            ["02", "Remember it visually", "Use concept cards and connected diagrams as cues for what you learned."],
            ["03", "Review and publish", "Save the blog draft directly in this portfolio, verify its claims, and publish when it is ready."],
          ].map(([number, title, description]) => (
            <article key={number} className="rounded-xl border border-line bg-panel p-6 shadow-sm">
              <p className="text-sm font-semibold tracking-widest text-accent-soft">{number}</p>
              <h2 className="mt-4 text-xl font-semibold text-ink">{title}</h2>
              <p className="mt-3 leading-7 text-muted">{description}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-xl border border-accent/20 bg-accent/10 p-6">
          <h2 className="text-xl font-semibold text-ink">Owner workspace</h2>
          <p className="mt-2 max-w-2xl leading-7 text-muted">The studio is private and requires owner sign-in. AI generation is currently paused. Saved content and exported drafts remain yours to review.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/techcanvas/studio" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">Open owner studio</a>
            <Link href="/admin" className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink">Open the blog editor</Link>
          </div>
          <p className="mt-4 text-sm text-muted">The studio and blog editor share one owner login with MFA. Save a completed pack directly as an unpublished draft, then review it in the editor. JSON import and export remain available.</p>
        </div>
      </Section>
    </main>
  );
}
