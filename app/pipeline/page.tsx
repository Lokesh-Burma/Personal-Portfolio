import { Section } from "@/components/section";
import { pipelineProjects } from "@/lib/profile";

export default function PipelinePage() {
  return (
    <main>
      <Section
        eyebrow="Pipeline"
        title="Future projects and learning direction"
        intro="This page keeps upcoming work visible without mixing it into completed project case studies. It shows what I am actively exploring next."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {pipelineProjects.map((project) => (
            <article className="rounded-lg border border-line bg-panel p-6 shadow-sm" key={project.title}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-soft">{project.status}</p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">{project.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{project.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <span className="rounded-md bg-panel-raised px-2.5 py-1 text-xs font-medium text-muted" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}
