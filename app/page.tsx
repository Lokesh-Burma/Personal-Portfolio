import Link from "next/link";
import { ProjectCard } from "@/components/cards";
import { Section } from "@/components/section";
import { SkillMap } from "@/components/skill-map";
import { TechGrid } from "@/components/tech-grid";
import { getAllProjects } from "@/lib/content";
import { fundamentals, highlights, impactAreas, pipelineProjects, profile, skills, techHighlights } from "@/lib/profile";

export default function Home() {
  const projects = getAllProjects().slice(0, 3);

  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl content-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
              Senior Software Engineer | Backend systems and production reliability
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
              Lokesh Burma
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{profile.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                href="/projects"
              >
                View engineering themes
              </Link>
              <Link
                className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                href="/pipeline"
              >
                See pipeline
              </Link>
              <Link
                className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                href={profile.resumeHref}
              >
                Download resume
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Engineering impact</h2>
            <div className="mt-5 space-y-4">
              {highlights.map((item) => (
                <p className="border-l-2 border-teal-600 pl-4 text-sm leading-6 text-slate-700" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Section
        eyebrow="Positioning"
        title="Backend engineer focused on reliable SaaS systems."
        intro="I focus on backend APIs, databases, system design, production debugging, observability, cloud delivery, and practical AI-assisted engineering."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {impactAreas.map((area) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={area.title}>
              <h3 className="font-semibold text-slate-950">{area.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{area.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Fundamentals"
        title="Software engineering fundamentals I work with"
        intro="These are the core engineering areas I focus on while building, debugging, and improving backend systems."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fundamentals.map((item) => (
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
              <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Technologies"
        title="Core tools at a glance"
        intro="A quick visual map of the tools I use most often across implementation, cloud, data, observability, and AI-assisted work."
      >
        <TechGrid items={techHighlights} />
      </Section>

      <Section
        eyebrow="Technology map"
        title="Tools grouped by engineering capability"
        intro="A practical map of how I use tools across implementation, data, architecture, delivery, production support, and AI-assisted workflows."
      >
        <SkillMap items={skills} />
      </Section>

      <Section
        eyebrow="Engineering themes"
        title="Selected engineering work"
        intro="High-level summaries of backend work, written generically so the engineering value is clear without exposing company-specific implementation details."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} {...project} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Pipeline"
        title="Future projects and learning direction"
        intro="A transparent view of where I want to take this portfolio and my engineering practice next."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {pipelineProjects.slice(0, 2).map((project) => (
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={project.title}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">{project.status}</p>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">{project.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{project.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <Link className="mt-6 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900" href="/pipeline">
          View full pipeline
        </Link>
      </Section>

    </main>
  );
}
