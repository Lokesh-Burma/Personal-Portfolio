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
          className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
          key={skill.group}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-teal-600" />
          <h3 className="text-base font-semibold text-slate-950">{skill.group}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{skill.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {skill.items.map((item) => (
              <span
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium leading-5 text-slate-700"
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
