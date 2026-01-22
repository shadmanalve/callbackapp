import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";

const PREFIX = "events/";
const CLEAR_FILE = `${PREFIX}_clear.json`;

export async function POST() {
  const cookieName = process.env.VIEWER_COOKIE_NAME || "wv_auth";
  const jar = await cookies();
  const authed = jar.get(cookieName)?.value === "1";
  if (!authed) return NextResponse.json({ ok: false }, { status: 401 });

  await put(CLEAR_FILE, JSON.stringify({ clearedAt: new Date().toISOString() }), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
  });

  return NextResponse.json({ ok: true });
}
