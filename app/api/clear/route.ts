import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";

const FILE = "events/REPLACE_WITH_RANDOM_NAME.json";

export async function POST() {
  const cookieName = process.env.VIEWER_COOKIE_NAME || "wv_auth";

  const jar = await cookies();                 // ✅ await cookies()
  const authed = jar.get(cookieName)?.value === "1";

  if (!authed) return NextResponse.json({ ok: false }, { status: 401 });

  await put(FILE, "[]", {
    access: "public",
    addRandomSuffix: false,
      allowOverwrite: true,      // ✅ ADD THIS

    contentType: "application/json",
  });

  return NextResponse.json({ ok: true });
}
