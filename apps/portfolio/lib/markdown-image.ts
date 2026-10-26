export function parseMarkdownImage(block: string): { alt: string; src: string } | null {
  const match = /^!\[([^\]\n]*)\]\(([^\s<>"']+)\)$/.exec(block.trim());
  if (!match) return null;
  const [, alt, src] = match;
  if (src.includes('\\') || src.startsWith('//')) return null;
  if (src.startsWith('/')) return { alt, src };
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return { alt, src };
  } catch { return null; }
}
