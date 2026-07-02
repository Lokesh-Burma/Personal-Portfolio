import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getAllBlogPosts, getBlogPost } from "@/lib/content";
import { getPublishedPostBySlug, hasBlogDbConfig } from "@/lib/blog-db";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  if (hasBlogDbConfig()) {
    const dbPost = await getPublishedPostBySlug(slug);

    if (dbPost) {
      return {
        title: dbPost.title,
        date: dbPost.published_at || dbPost.created_at,
        summary: dbPost.summary || "",
        body: dbPost.content_markdown,
      };
    }
  }

  const localPost = getAllBlogPosts().find((item) => item.slug === slug);
  return localPost ? getBlogPost(slug) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} | Lokesh Burma`,
    description: post.summary,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }
  return (
    <main className="border-t border-slate-200 bg-white">
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" href="/blog">
          Back to blog
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          {post.date}
        </p>
        <Markdown content={post.body} />
      </article>
    </main>
  );
}
