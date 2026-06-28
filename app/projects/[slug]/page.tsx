import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getAllProjects, getProject } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllProjects().map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getAllProjects().find((item) => item.slug === slug);

  if (!project) {
    return {};
  }

  return {
    title: `${project.title} | Lokesh Burma`,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getAllProjects().find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  const fullProject = getProject(slug);

  return (
    <main className="border-t border-slate-200 bg-white">
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" href="/projects">
          Back to projects
        </Link>
        <div className="mt-8 flex flex-wrap gap-2">
          {fullProject.stack.map((item) => (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700" key={item}>
              {item}
            </span>
          ))}
        </div>
        <Markdown content={fullProject.body} />
      </article>
    </main>
  );
}
