import Link from "next/link";

type ProjectCardProps = {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
  outcome: string;
};

export function ProjectCard({ title, summary, stack, outcome }: ProjectCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500">
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{summary}</p>
      {outcome ? <p className="mt-4 text-sm font-medium text-slate-950">{outcome}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {stack.map((item) => (
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700" key={item}>
            {item}
          </span>
        ))}
      </div>
      <p className="mt-5 text-sm font-semibold text-teal-700">Detailed case study under review</p>
    </article>
  );
}

type PostCardProps = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
};

export function PostCard({ slug, title, summary, tags }: PostCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500">
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{summary}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <Link className="mt-5 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900" href={`/blog/${slug}`}>
        Read post
      </Link>
    </article>
  );
}
