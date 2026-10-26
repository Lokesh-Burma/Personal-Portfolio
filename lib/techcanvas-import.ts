export const MAX_TECHCANVAS_IMPORT_BYTES = 256_000;

export type TechCanvasDraftForm = {
  title: string;
  slug: string;
  summary: string;
  content_markdown: string;
  cover_image: string;
  tags: string;
  status: "draft";
};

export function parseTechCanvasDraft(text: string): TechCanvasDraftForm {
  if (new TextEncoder().encode(text).byteLength > MAX_TECHCANVAS_IMPORT_BYTES) {
    throw new Error("Choose a TechCanvas JSON export smaller than 256 KB.");
  }
  let input: unknown;
  try { input = JSON.parse(text); } catch { throw new Error("This file is not valid JSON."); }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Choose the portfolio.json file from a TechCanvas content pack.");
  }
  const data = input as Record<string, unknown>;
  const bounded = (key: string, maximum: number, required = false) => {
    const value = data[key];
    if (value === undefined && !required) return "";
    if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) {
      throw new Error(`Invalid ${key} in this export.`);
    }
    return value;
  };
  const title = bounded("title", 160, true).trim();
  const tags = data.tags ?? [];
  if (!Array.isArray(tags) || tags.length > 12 || tags.some(tag => typeof tag !== "string" || tag.length > 40 || tag.includes(","))) {
    throw new Error("Tags must be a list of up to 12 short names without commas.");
  }
  return {
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    summary: bounded("summary", 1800),
    content_markdown: bounded("content_markdown", 200_000, true),
    // Private signed links expire; publication needs a separately reviewed cover URL.
    cover_image: "",
    tags: tags.map(tag => tag.trim()).filter(Boolean).join(", "),
    status: "draft",
  };
}
