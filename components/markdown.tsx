type MarkdownProps = {
  content: string;
};

export function Markdown({ content }: MarkdownProps) {
  const blocks = content.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="space-y-6">
      {blocks.map((block) => {
        if (block.startsWith("# ")) {
          return (
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950" key={block}>
              {block.replace("# ", "")}
            </h1>
          );
        }

        if (block.startsWith("## ")) {
          return (
            <h2 className="pt-4 text-2xl font-semibold tracking-tight text-slate-950" key={block}>
              {block.replace("## ", "")}
            </h2>
          );
        }

        if (block.startsWith("- ")) {
          return (
            <ul className="space-y-2 pl-5" key={block}>
              {block.split("\n").map((item) => (
                <li className="list-disc text-base leading-7 text-slate-700" key={item}>
                  {item.replace("- ", "")}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p className="text-base leading-8 text-slate-700" key={block}>
            {block}
          </p>
        );
      })}
    </div>
  );
}
