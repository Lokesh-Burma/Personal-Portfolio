import Link from "next/link";
import { PostCard, ProjectCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllBlogPosts, getAllProjects } from "@/lib/content";
import { highlights, impactAreas, profile, skills } from "@/lib/profile";

const featuredPostSlugs = [
  "zero-downtime-data-migration-patterns",
  "debugging-distributed-backup-systems",
  "understanding-how-this-frontend-portfolio-app-works",
];

export default function Home() {
  const projects = getAllProjects().slice(0, 3);
  const allPosts = getAllBlogPosts();
  const posts = allPosts
    .filter((post) => featuredPostSlugs.includes(post.slug))
    .sort((a, b) => featuredPostSlugs.indexOf(a.slug) - featuredPostSlugs.indexOf(b.slug));

  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl content-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
              Senior Software Engineer | AI-enabled backend systems
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
                View case studies
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
        title="Backend systems with scale, reliability, and AI-assisted operations."
        intro="The portfolio is organized around the work that best represents my engineering direction: distributed backend architecture, production reliability, and practical AI tooling for engineering teams."
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
        eyebrow="Technologies"
        title="Tools and systems I have worked with"
        intro="Grouped by how I use them in backend engineering work, instead of as one long keyword list."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={skill.group}>
              <h3 className="font-semibold text-slate-950">{skill.group}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{skill.items.join(", ")}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Case studies"
        title="Selected engineering work"
        intro="These projects show the work I want to be evaluated on: backend architecture, reliability, observability, AI-assisted debugging, and production ownership."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} {...project} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Writing"
        title="Engineering notes"
        intro="Featured posts focus on backend systems and how I reason about architecture, debugging, and this frontend portfolio as a backend engineer."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} {...post} />
          ))}
        </div>
      </Section>
    </main>
  );
}
