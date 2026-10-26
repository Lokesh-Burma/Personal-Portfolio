export type BlogStatus = "draft" | "published";

export type BlogPostInput = {
  title: string;
  slug: string;
  summary?: string | null;
  content_markdown: string;
  cover_image?: string | null;
  tags?: string[];
  status?: BlogStatus;
  published_at?: string | null;
};

export type DbBlogPost = BlogPostInput & {
  id: string;
  created_at: string;
  updated_at: string;
  status: BlogStatus;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  return {
    endpoint: `${url.replace(/\/$/, "")}/rest/v1/blogs`,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
  };
}

export function hasBlogDbConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest<T>(path = "", init: RequestInit = {}) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.endpoint}${path}`, {
    ...init,
    headers: {
      ...config.headers,
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${body}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function normalizeSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateBlogInput(input: Partial<BlogPostInput>) {
  const title = input.title?.trim();
  const content = input.content_markdown?.trim();
  const slug = normalizeSlug(input.slug || input.title || "");

  if (!title) {
    throw new Error("Title is required");
  }

  if (!slug) {
    throw new Error("Slug is required");
  }

  if (!content) {
    throw new Error("Markdown content is required");
  }

  return {
    title,
    slug,
    summary: input.summary?.trim() || null,
    content_markdown: input.content_markdown || "",
    cover_image: input.cover_image?.trim() || null,
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) || [],
    status: input.status === "published" ? "published" : "draft",
    published_at:
      input.status === "published"
        ? input.published_at || new Date().toISOString()
        : input.published_at || null,
  } satisfies BlogPostInput;
}

export async function listPublishedPosts() {
  return supabaseRequest<DbBlogPost[]>(
    "?select=id,title,slug,summary,cover_image,tags,status,published_at,created_at,updated_at&status=eq.published&order=published_at.desc",
  );
}

export async function getPublishedPostBySlug(slug: string) {
  const rows = await supabaseRequest<DbBlogPost[]>(
    `?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
  );
  return rows[0] || null;
}

export async function listAdminPosts() {
  return supabaseRequest<DbBlogPost[]>("?select=*&order=updated_at.desc");
}

export async function createPost(input: Partial<BlogPostInput>) {
  const payload = validateBlogInput(input);
  const rows = await supabaseRequest<DbBlogPost[]>("", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  return rows[0];
}

export async function updatePost(id: string, input: Partial<BlogPostInput>) {
  const payload = validateBlogInput(input);
  const rows = await supabaseRequest<DbBlogPost[]>(`?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      ...payload,
      updated_at: new Date().toISOString(),
    }),
  });
  return rows[0] || null;
}

export async function deletePost(id: string) {
  await supabaseRequest<null>(`?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
