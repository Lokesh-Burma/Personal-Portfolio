import type { Metadata } from "next";
import { headers } from "next/headers";
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

async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") || "http";

  return host ? protocol + "://" + host : null;
}

async function getPost(slug: string) {
  const origin = await getRequestOrigin();

  if (origin) {
    try {
      const response = await fetch(origin + "/api/blogs/" + encodeURIComponent(slug), {
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as { post?: ApiBlogPost };

        if (data.post) {
          return {
            title: data.post.title,
            date: data.post.published_at || data.post.created_at,
            summary: data.post.summary || "",
            body: data.post.content_markdown,
          };
        }
      }
    } catch {
      // Fall through to local MDX posts when the API is unavailable locally.
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
