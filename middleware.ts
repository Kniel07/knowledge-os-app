import { NextRequest, NextResponse } from "next/server";

const COOKIE = "kos_auth";

export function middleware(req: NextRequest) {
  const required = process.env.APP_PASSWORD;
  if (!required) throw new Error("Missing required env var: APP_PASSWORD");

  if (req.nextUrl.pathname === "/login") return NextResponse.next();

  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie === required) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
