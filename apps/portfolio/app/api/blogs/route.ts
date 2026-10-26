import { NextResponse } from "next/server";
import { listPublishedPosts } from "@/lib/blog-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return NextResponse.json({ posts: await listPublishedPosts() });
  } catch { return NextResponse.json({error:"Content storage is temporarily unavailable."},{status:503,headers:{"cache-control":"no-store"}}); }
}
