type MarkdownProps = {
  content: string;
};

function splitBlocks(content: string) {
  const blocks: Array<{ type: "code" | "text"; value: string }> = [];
  const pattern = /```(?:\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index).trim();

    if (textBefore) {
      blocks.push({ type: "text", value: textBefore });
    }

    blocks.push({ type: "code", value: match[1].trim() });
    lastIndex = pattern.lastIndex;
  }

  const textAfter = content.slice(lastIndex).trim();

  if (textAfter) {
    blocks.push({ type: "text", value: textAfter });
  }

  return blocks;
}

export function Markdown({ content }: MarkdownProps) {
  const blocks = splitBlocks(content);

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100" key={`${block.value}-${index}`}>
              <code>{block.value}</code>
            </pre>
          );
        }

        return block.value.split(/\n{2,}/).filter(Boolean).map((textBlock) => {
          if (textBlock.startsWith("# ")) {
            return (
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950" key={textBlock}>
                {textBlock.replace("# ", "")}
              </h1>
            );
          }

          if (textBlock.startsWith("## ")) {
            return (
              <h2 className="pt-4 text-2xl font-semibold tracking-tight text-slate-950" key={textBlock}>
                {textBlock.replace("## ", "")}
              </h2>
            );
          }

          if (textBlock.startsWith("- ")) {
            return (
              <ul className="space-y-2 pl-5" key={textBlock}>
                {textBlock.split("\n").map((item) => (
                  <li className="list-disc text-base leading-7 text-slate-700" key={item}>
                    {item.replace("- ", "")}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p className="text-base leading-8 text-slate-700" key={textBlock}>
              {textBlock}
            </p>
          );
        });
      })}
    </div>
  );
}
