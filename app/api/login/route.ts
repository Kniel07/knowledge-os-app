import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const required = process.env.APP_PASSWORD;
  if (!required) throw new Error("Missing required env var: APP_PASSWORD");

  const { password } = await req.json();
  if (password !== required) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("kos_auth", required, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
