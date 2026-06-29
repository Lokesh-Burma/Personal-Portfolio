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
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={project.title}>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">{project.status}</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">{project.title}</h2>
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
      </Section>
    </main>
  );
}
