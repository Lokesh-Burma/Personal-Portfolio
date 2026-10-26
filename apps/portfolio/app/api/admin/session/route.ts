import { forwardPortfolioApi } from "@/lib/portfolio-api";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const upstream = await forwardPortfolioApi(request, "/auth/session");
  if (upstream) return upstream;
  const session = await getAdminSession();
  return NextResponse.json({ authenticated: Boolean(session), email: session?.email || null });
}
