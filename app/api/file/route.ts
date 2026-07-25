import { NextRequest, NextResponse } from "next/server";
import { getFile, putFile } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) throw new Error("Missing required query param: path");
  const file = await getFile(path);
  return NextResponse.json(file);
}

export async function PUT(req: NextRequest) {
  const { path, content, sha, message } = await req.json();
  if (!path || content === undefined || !sha) {
    throw new Error("Body must include path, content, and sha");
  }
  await putFile(path, content, sha, message || `Update ${path}`);
  return NextResponse.json({ ok: true });
}
