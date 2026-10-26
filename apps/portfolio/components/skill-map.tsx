type SkillGroup = {
  group: string;
  description: string;
  items: string[];
};

type SkillMapProps = {
  items: SkillGroup[];
  className?: string;
};

export function SkillMap({ items, className = "grid gap-4 md:grid-cols-2 lg:grid-cols-3" }: SkillMapProps) {
  return (
    <div className={className}>
      {items.map((skill) => (
        <article
          className="relative overflow-hidden rounded-lg border border-line bg-panel p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-md"
          key={skill.group}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
          <h3 className="text-base font-semibold text-ink">{skill.group}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{skill.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {skill.items.map((item) => (
              <span
                className="rounded-md border border-line bg-canvas px-2.5 py-1 text-xs font-medium leading-5 text-muted"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
