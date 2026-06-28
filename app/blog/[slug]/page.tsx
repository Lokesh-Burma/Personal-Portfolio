import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getAllBlogPosts, getBlogPost } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getAllBlogPosts().find((item) => item.slug === slug);

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
  const post = getAllBlogPosts().find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  const fullPost = getBlogPost(slug);

  return (
    <main className="border-t border-slate-200 bg-white">
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" href="/blog">
          Back to blog
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          {fullPost.date}
        </p>
        <Markdown content={fullPost.body} />
      </article>
    </main>
  );
}
