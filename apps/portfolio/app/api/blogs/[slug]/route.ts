import { NextResponse } from "next/server";
import { getPublishedPostBySlug } from "@/lib/blog-db";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const post = await getPublishedPostBySlug(slug);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch { return NextResponse.json({error:"Content storage is temporarily unavailable."},{status:503,headers:{"cache-control":"no-store"}}); }
}
