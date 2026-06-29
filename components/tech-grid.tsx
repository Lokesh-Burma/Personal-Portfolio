type TechItem = {
  name: string;
  slug: string;
  color: string;
  tone: string;
};

type TechGridProps = {
  items: TechItem[];
};

export function TechGrid({ items }: TechGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={item.name}>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${item.tone}`}>
            <div
              aria-hidden="true"
              className="h-6 w-6"
              style={{
                backgroundColor: `#${item.color}`,
                WebkitMaskImage: `url(/icons/simple-icons/${item.slug}.svg)`,
                maskImage: `url(/icons/simple-icons/${item.slug}.svg)`,
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
              }}
            />
          </div>
          <p className="text-sm font-semibold text-slate-950">{item.name}</p>
        </div>
      ))}
    </div>
  );
}
