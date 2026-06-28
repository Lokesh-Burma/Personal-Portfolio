import { PostCard } from "@/components/cards";
import { Section } from "@/components/section";
import { getAllBlogPosts } from "@/lib/content";

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <main>
      <Section
        eyebrow="Blog"
        title="Engineering notes and learnings"
        intro="Manual blog writing starts in content/blog. Add a new MDX file with frontmatter and the site will pick it up automatically."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} {...post} />
          ))}
        </div>
      </Section>
    </main>
  );
}
