import { parseMarkdownImage } from "@/lib/markdown-image";
import { CopyCode } from "@/components/copy-code";

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
    <div className="space-y-6 break-words">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return <CopyCode code={block.value} key={`${block.value}-${index}`} />;
        }

        return block.value.split(/\n{2,}/).filter(Boolean).map((textBlock) => {
          const image = parseMarkdownImage(textBlock);
          if (image) {
            return (
              <figure className="space-y-3" key={textBlock}>
                <a href={image.src} target="_blank" rel="noopener noreferrer">
                  <img src={image.src} alt={image.alt} loading="lazy" decoding="async" className="h-auto w-full rounded-xl border border-line" />
                </a>
                <figcaption className="text-sm text-subtle">
                  <a href={image.src} target="_blank" rel="noopener noreferrer" className="text-accent-soft hover:text-ink">Open image at full size ↗</a>
                </figcaption>
              </figure>
            );
          }
          if (textBlock.startsWith("# ")) {
            return (
              <h1 className="text-4xl font-semibold tracking-tight text-ink" key={textBlock}>
                {textBlock.replace("# ", "")}
              </h1>
            );
          }

          if (textBlock.startsWith("## ")) {
            return (
              <h2 className="pt-4 text-2xl font-semibold tracking-tight text-ink" key={textBlock}>
                {textBlock.replace("## ", "")}
              </h2>
            );
          }

          if (textBlock.startsWith("### ")) {
            return (
              <h3 className="pt-2 text-lg font-semibold text-ink" key={textBlock}>
                {textBlock.replace("### ", "")}
              </h3>
            );
          }

          if (textBlock.startsWith("- ")) {
            return (
              <ul className="space-y-2 pl-5" key={textBlock}>
                {textBlock.split("\n").map((item) => (
                  <li className="list-disc text-base leading-7 text-muted" key={item}>
                    {item.replace("- ", "")}
                  </li>
                ))}
              </ul>
            );
          }

          return (
            <p className="text-base leading-8 text-muted" key={textBlock}>
              {textBlock}
            </p>
          );
        });
      })}
    </div>
  );
}
