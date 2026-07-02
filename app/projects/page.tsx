import { ProjectCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllProjects } from "@/lib/content";

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <main>
      <Section
        eyebrow="Projects"
        title="Engineering work themes"
        intro="High-level summaries of engineering areas I have worked on, written to show the problem space without exposing company-specific architecture details."
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
