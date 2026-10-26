type TechItem = {
  name: string;
  group: string;
  slug: string | null;
  icon: string;
  color: string;
  tone: string;
};

const stacks = [
  { name: "Languages", description: "The foundation for services, workers, and automation.", accent: "bg-cyan-400/100", badge: "text-cyan-300 bg-cyan-400/10", symbol: "{ }" },
  { name: "Backend & APIs", description: "Building services and clear integration contracts.", accent: "bg-emerald-400/100", badge: "text-emerald-300 bg-emerald-400/10", symbol: "</>" },
  { name: "Data & caching", description: "Storing, querying, and accessing data efficiently.", accent: "bg-blue-400/100", badge: "text-blue-300 bg-blue-400/10", symbol: "[ ]" },
  { name: "Cloud & delivery", description: "Taking services from development to production.", accent: "bg-amber-400/100", badge: "text-amber-300 bg-amber-400/10", symbol: ">_" },
  { name: "Observability", description: "Understanding service behavior and investigating issues.", accent: "bg-rose-400/100", badge: "text-rose-300 bg-rose-400/10", symbol: "~/" },
  { name: "AI engineering", description: "Connecting context, agents, and engineer-reviewed workflows.", accent: "bg-violet-400/100", badge: "text-violet-300 bg-violet-400/10", symbol: "✦" },
];

export function TechGrid({ items }: { items: TechItem[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {stacks.map((stack) => {
        const technologies = items.filter((item) => item.group === stack.name);
        if (technologies.length === 0) return null;

        return (
          <article key={stack.name} className="group relative overflow-hidden rounded-2xl border border-line bg-panel p-6 shadow-sm transition duration-200 hover:border-line hover:shadow-md motion-reduce:transition-none">
            <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${stack.accent}`} />
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-semibold ${stack.badge}`}>
                {stack.symbol}
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-ink">{stack.name}</h3>
                <p className="mt-1 text-sm leading-6 text-subtle">{stack.description}</p>
              </div>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2.5" aria-label={`${stack.name} technologies`}>
              {technologies.map((item) => (
                <li key={item.name} className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/70 py-2 pl-2 pr-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${item.tone}`}>
                    {item.slug ? (
                      <span aria-hidden="true" className="h-4 w-4" style={{
                        backgroundColor: `#${item.color}`,
                        WebkitMaskImage: `url(/icons/simple-icons/${item.slug}.svg)`,
                        maskImage: `url(/icons/simple-icons/${item.slug}.svg)`,
                        WebkitMaskPosition: "center", maskPosition: "center",
                        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                        WebkitMaskSize: "contain", maskSize: "contain",
                      }} />
                    ) : (
                      <span aria-hidden="true" className="text-[10px] font-bold" style={{ color: `#${item.color}` }}>{item.icon}</span>
                    )}
                  </span>
                  <span className="text-sm font-medium text-muted">{item.name}</span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
