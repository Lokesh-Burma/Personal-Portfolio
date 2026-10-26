import { forwardPortfolioApi } from "@/lib/portfolio-api";
import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const upstream = await forwardPortfolioApi(request, "/auth/logout");
  if (upstream) return upstream;
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
