import { NextRequest, NextResponse } from "next/server";
import { createProjectFromTemplate } from "@/lib/github";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) throw new Error("Missing required field: name");
    await createProjectFromTemplate(name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
