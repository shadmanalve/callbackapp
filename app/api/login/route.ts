import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));

  if (!process.env.VIEWER_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Server not configured" }, { status: 500 });
  }

  if (password !== process.env.VIEWER_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const cookieName = process.env.VIEWER_COOKIE_NAME || "wv_auth";
  const res = NextResponse.json({ ok: true });

  res.cookies.set(cookieName, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
