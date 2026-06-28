import { ProjectCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllProjects } from "@/lib/content";

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <main>
      <Section
        eyebrow="Projects"
        title="Project case studies"
        intro="Each project is positioned as a case study you can expand with architecture diagrams, tradeoffs, and links when public details are available."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} {...project} />
          ))}
        </div>
      </Section>
    </main>
  );
}
