type TechItem = {
  name: string;
  icon: string;
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
            <img
              alt={`${item.name} logo`}
              className="h-6 w-6 object-contain"
              src={`https://cdn.simpleicons.org/${item.slug}/${item.color}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">{item.name}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{item.icon}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
