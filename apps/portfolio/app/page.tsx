import Link from "next/link";
import { Section } from "@/components/section";
import { TechGrid } from "@/components/tech-grid";
import { highlights, impactAreas, profile, techHighlights } from "@/lib/profile";

export default function Home() {
  return <main>
    <section className="canvas-hero border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-accent-soft">LOKESH BURMA / BACKEND ENGINEER</p>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-[-.045em] text-ink md:text-7xl">Reliable systems.<br/><span className="text-accent-soft">Clearer ideas.</span></h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-muted">{profile.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/projects" className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-ink transition hover:bg-accent-soft">Explore my work <span aria-hidden="true">↗</span></Link>
            <Link href="/blog" className="rounded-lg border border-line bg-panel px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent/60">Read the notebook</Link>
          </div>
          <p className="mt-8 text-xs text-subtle">Hyderabad, India <span className="mx-2 text-accent" aria-hidden="true">/</span> Distributed systems, cloud & practical AI</p>
        </div>
        <div className="canvas-grid rounded-2xl border border-line bg-panel p-7 md:p-9">
          <div className="flex items-center justify-between"><p className="text-[10px] tracking-[.2em] text-subtle">THE WORKBENCH</p><span className="rounded-full border border-accent/30 px-3 py-1 text-[10px] text-accent-soft">Build · learn · share</span></div>
          <div className="mt-8 space-y-7">
            {[
              {number:'01',title:'Build dependable systems',text:'Backend services, data, and the details that make production work.',href:'/projects'},
              {number:'02',title:'Make the ideas understandable',text:'Engineering notes and lessons distilled into something useful.',href:'/blog'},
              {number:'03',title:'Give learning a canvas',text:'Visual memory aids and reviewable writing in TechCanvas.',href:'/techcanvas'},
            ].map(item=><Link key={item.number} href={item.href} className="group flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas font-mono text-xs text-accent-soft">{item.number}</span><span><span className="block text-base font-semibold text-ink group-hover:text-accent-soft">{item.title}</span><span className="mt-2 block text-sm leading-6 text-subtle">{item.text}</span></span></Link>)}
          </div>
          <Link href="/techcanvas" className="mt-8 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent-soft">Explore TechCanvas <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
    <Section eyebrow="01 / ENGINEERING" title="Care in the implementation. Clarity in the outcome." intro="My work connects backend fundamentals with the operational realities of shipping and supporting software.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{impactAreas.map(area=><article key={area.title} className="rounded-xl border border-line bg-panel p-6"><h3 className="font-semibold text-ink">{area.title}</h3><p className="mt-3 text-sm leading-7 text-muted">{area.text}</p></article>)}</div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">{highlights.map(item=><p key={item} className="border-l-2 border-accent/50 py-2 pl-5 text-sm leading-7 text-muted">{item}</p>)}</div>
      <Link href="/experience" className="mt-7 inline-block text-sm font-semibold text-accent-soft">View experience <span aria-hidden="true">↗</span></Link>
    </Section>
    <Section eyebrow="02 / CONCEPT STUDIO" title="From a technical idea to something worth sharing." intro="TechCanvas brings explanations, diagrams and blog drafts into one learning workflow. The portfolio is where reviewed ideas can become published writing.">
      <div className="grid gap-5 md:grid-cols-3">{[['Understand','Break down a concept and examine its tradeoffs.'],['Remember','Use visual notes to connect the important ideas.'],['Share','Import a draft into the editor and publish after review.']].map(([title,text],i)=><article key={title} className="rounded-xl border border-line bg-panel p-6"><p className="font-mono text-xs text-accent-soft">0{i+1}</p><h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3><p className="mt-3 text-sm leading-7 text-muted">{text}</p></article>)}</div>
      <div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold"><Link href="/techcanvas" className="text-accent-soft">Meet TechCanvas ↗</Link><Link href="/blog" className="text-muted">Browse writing ↗</Link></div>
    </Section>
    <Section eyebrow="03 / TOOLS OF THE TRADE" title="The stack behind the work." intro="Tools are most useful when they fit the problem. Here is how mine connect across implementation, data, cloud and operations."><TechGrid items={techHighlights}/><Link href="/about" className="mt-7 inline-block text-sm font-semibold text-accent-soft">More about my approach ↗</Link></Section>
    <section className="border-t border-line"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-5 py-14 md:flex-row md:items-center"><div><p className="text-[11px] tracking-[.18em] text-accent-soft">NEXT / A CONVERSATION</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Working on something interesting?</h2></div><Link href="/contact" className="self-start rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-accent-ink md:self-auto">Let’s connect ↗</Link></div></section>
  </main>;
}
