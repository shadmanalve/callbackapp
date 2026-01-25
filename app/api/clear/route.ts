import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "events.json";

export async function POST(req: Request) {
  const secret = req.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await kv.set(KEY, []);
  return NextResponse.json({ ok: true });
}