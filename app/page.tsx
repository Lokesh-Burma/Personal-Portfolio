import Link from "next/link";
import { PostCard, ProjectCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllBlogPosts, getAllProjects } from "@/lib/content";
import { highlights, profile, skills } from "@/lib/profile";

export default function Home() {
  const projects = getAllProjects().slice(0, 3);
  const posts = getAllBlogPosts().slice(0, 3);

  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl content-center gap-12 px-5 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">
              Backend Software Engineer
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
                View projects
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
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Current focus</h2>
            <div className="mt-5 space-y-4">
              {highlights.slice(0, 4).map((item) => (
                <p className="border-l-2 border-teal-600 pl-4 text-sm leading-6 text-slate-700" key={item}>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Section
        eyebrow="Strengths"
        title="Cloud-native backend systems, delivered with production context."
        intro="The site is designed as a living resume: experience, architecture decisions, implementation notes, and writing in one place."
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
        eyebrow="Projects"
        title="Selected engineering work"
        intro="Case studies are framed around the problem, architecture, tradeoffs, and measurable impact."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} {...project} />
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Writing"
        title="Technical learnings as blog posts"
        intro="The first posts are seeded as topics from your resume. They can be expanded manually as you collect implementation notes."
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
