import type { Metadata } from "next";
import { cache } from "react";
import { getPublishedPostBySlug } from "@/lib/blog-db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

const getPost = cache(async (slug: string) => {
  try {
    const post=await getPublishedPostBySlug(slug);
    if(post)return {title:post.title,date:post.published_at || post.created_at,summary:post.summary || "",body:post.content_markdown};
    return null;
  } catch { throw new Error("Published content is temporarily unavailable."); }
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
