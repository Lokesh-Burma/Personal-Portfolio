import { forwardPortfolioApi } from "@/lib/portfolio-api";
import { NextResponse } from "next/server";
import { createAdminSession, setAdminSessionCookie, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const upstream = await forwardPortfolioApi(request, "/auth/login");
  if (upstream) return upstream;
  try {
    const { email, password } = await request.json();

    if (!email || !password || email !== process.env.ADMIN_EMAIL || !verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setAdminSessionCookie(createAdminSession(email));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 },
    );
  }
}
