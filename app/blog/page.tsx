import { headers } from "next/headers";
import { PostCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllBlogPosts } from "@/lib/content";

export const dynamic = "force-dynamic";

type ApiBlogPost = {
  slug: string;
  title: string;
  summary: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
};

async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") || "http";

  return host ? protocol + "://" + host : null;
}

async function getPosts() {
  const origin = await getRequestOrigin();

  if (origin) {
    try {
      const response = await fetch(origin + "/api/blogs", { cache: "no-store" });

      if (response.ok) {
        const data = (await response.json()) as { posts?: ApiBlogPost[] };
        return (data.posts || []).map((post) => ({
          slug: post.slug,
          title: post.title,
          date: post.published_at || post.created_at,
          summary: post.summary || "",
          tags: post.tags || [],
          body: "",
        }));
      }
    } catch {
      // Fall through to local MDX posts when the API is unavailable locally.
    }
  }

  return getAllBlogPosts();
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main>
      <Section
        eyebrow="Blog"
        title="Engineering notes under review"
        intro="I am refining these posts before publishing them. The blog will focus on backend fundamentals, production systems, reliability, security, databases, and AI-assisted engineering."
      >
        {posts.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} {...post} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm leading-6 text-slate-600">
              No posts are published right now. Drafts can be managed from the admin editor.
            </p>
          </div>
        )}
      </Section>
    </main>
  );
}
