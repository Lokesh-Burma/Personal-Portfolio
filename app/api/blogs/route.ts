import { forwardPortfolioApi } from "@/lib/portfolio-api";
import { NextResponse } from "next/server";
import { listPublishedPosts } from "@/lib/blog-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const upstream = await forwardPortfolioApi(request, "/blogs");
  if (upstream) return upstream;
  try {
    return NextResponse.json({ posts: await listPublishedPosts() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load posts" },
      { status: 500 },
    );
  }
}
