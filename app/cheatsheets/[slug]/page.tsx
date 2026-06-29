import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getAllCheatSheets, getCheatSheet } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCheatSheets().map((sheet) => ({ slug: sheet.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sheet = getAllCheatSheets().find((item) => item.slug === slug);

  if (!sheet) {
    return {};
  }

  return {
    title: `${sheet.title} | Lokesh Burma`,
    description: sheet.summary,
  };
}

export default async function CheatSheetDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const sheet = getAllCheatSheets().find((item) => item.slug === slug);

  if (!sheet) {
    notFound();
  }

  const fullSheet = getCheatSheet(slug);

  return (
    <main className="border-t border-slate-200 bg-white">
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" href="/cheatsheets">
          Back to cheatsheets
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          {fullSheet.category}
        </p>
        <Markdown content={fullSheet.body} />
      </article>
    </main>
  );
}
