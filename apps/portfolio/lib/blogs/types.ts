type BlogStatus = "draft" | "published";

export type Blog = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content_markdown: string;
  cover_image: string | null;
  tags: string[];
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogWrite = Omit<Blog,"id"|"created_at"|"updated_at">;
