import { PostCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllBlogPosts } from "@/lib/content";
import { hasBlogDbConfig, listPublishedPosts } from "@/lib/blog-db";

export const dynamic = "force-dynamic";

async function getPosts() {
  if (!hasBlogDbConfig()) {
    return getAllBlogPosts();
  }

  try {
    const posts = await listPublishedPosts();
    return posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.published_at || post.created_at,
      summary: post.summary || "",
      tags: post.tags || [],
      body: "",
    }));
  } catch {
    return getAllBlogPosts();
  }
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
