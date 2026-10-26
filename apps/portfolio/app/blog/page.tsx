import { listPublishedPosts } from "@/lib/blog-db";
import { hasBlogDbConfig as apiConfigured } from "@/lib/blog-db";
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

async function getPosts() {
  try {
    const posts=await listPublishedPosts();
    return posts.map(post=>({slug:post.slug,title:post.title,date:post.published_at || post.created_at,summary:post.summary || "",tags:post.tags || [],body:""}));
  } catch { return apiConfigured()?[]:getAllBlogPosts(); }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main>
      <Section
        eyebrow="Blog"
        title="The engineering notebook."
        intro="Notes on backend fundamentals, distributed systems, production lessons, and ideas explored through TechCanvas."
      >
        {posts.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} {...post} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-panel p-6 shadow-sm">
            <p className="text-sm leading-6 text-muted">
              No posts are published right now. Drafts can be managed from the admin editor.
            </p>
          </div>
        )}
      </Section>
    </main>
  );
}
