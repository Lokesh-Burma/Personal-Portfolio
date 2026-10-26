import type { Metadata } from "next";
import { cache } from "react";
import { getPublishedPostBySlug } from "@/lib/blog-db";
import { apiConfigured, readPublicPortfolioApi } from "@/lib/portfolio-api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getAllBlogPosts, getBlogPost } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type ApiBlogPost = {
  title: string;
  summary: string | null;
  content_markdown: string;
  published_at: string | null;
  created_at: string;
};

export const dynamic = "force-dynamic";

const getPost = cache(async (slug: string) => {
  try {
    const remote=await readPublicPortfolioApi<{post:ApiBlogPost|null}>("/blogs/"+encodeURIComponent(slug));
    const post=remote?remote.post:await getPublishedPostBySlug(slug);
    if(post)return {title:post.title,date:post.published_at || post.created_at,summary:post.summary || "",body:post.content_markdown};
    if(apiConfigured())return null;
  } catch { if(apiConfigured())return null; }
  const local=getAllBlogPosts().find(item=>item.slug===slug);
  return local?getBlogPost(slug):null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title + " | Lokesh Burma",
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
    <main className="border-t border-line bg-panel">
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link className="text-sm font-semibold text-accent-soft hover:text-ink" href="/blog">
          Back to blog
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-subtle">
          {post.date}
        </p>
        <Markdown content={post.body} />
      </article>
    </main>
  );
}
