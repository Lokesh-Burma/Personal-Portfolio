import Link from "next/link";

type ProjectCardProps = {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
  outcome: string;
};

export function ProjectCard({ slug, title, summary, stack, outcome }: ProjectCardProps) {
  return (
    <article className="rounded-lg border border-line bg-panel p-6 shadow-sm transition hover:border-accent">
      <h3 className="text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{summary}</p>
      {outcome ? <p className="mt-4 text-sm font-medium text-ink">{outcome}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {stack.map((item) => (
          <span className="rounded-md bg-panel-raised px-2.5 py-1 text-xs font-medium text-muted" key={item}>
            {item}
          </span>
        ))}
      </div>
      <Link className="mt-5 inline-flex text-sm font-semibold text-accent-soft hover:text-ink" href={`/projects/${slug}`}>
        Read case study
      </Link>
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
    <article className="rounded-lg border border-line bg-panel p-6 shadow-sm transition hover:border-accent">
      <h3 className="text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{summary}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent-soft" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <Link className="mt-5 inline-flex text-sm font-semibold text-accent-soft hover:text-ink" href={`/blog/${slug}`}>
        Read post
      </Link>
    </article>
  );
}
