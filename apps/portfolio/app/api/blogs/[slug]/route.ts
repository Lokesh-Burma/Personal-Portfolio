import { forwardPortfolioApi } from "@/lib/portfolio-api";
import { NextResponse } from "next/server";
import { getPublishedPostBySlug } from "@/lib/blog-db";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const upstream = await forwardPortfolioApi(_request, "/blogs/" + encodeURIComponent((await params).slug));
  if (upstream) return upstream;
  try {
    const { slug } = await params;
    const post = await getPublishedPostBySlug(slug);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load post" },
      { status: 500 },
    );
  }
}
