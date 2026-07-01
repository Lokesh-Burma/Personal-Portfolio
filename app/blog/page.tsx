import { PostCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllBlogPosts } from "@/lib/content";

export default function BlogPage() {
  const posts = getAllBlogPosts();

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
              No posts are published right now. Drafts are stored in the repository and will be added back after review.
            </p>
          </div>
        )}
      </Section>
    </main>
  );
}
