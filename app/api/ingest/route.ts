import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const LIST_KEY = "events:list";
const MAX_EVENTS = 5000;

export async function POST(req: Request) {
  const secret = req.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const event = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload: body,
  };

  // push newest to the front
  await kv.lpush(LIST_KEY, JSON.stringify(event));

  // trim to max
  await kv.ltrim(LIST_KEY, 0, MAX_EVENTS - 1);

  return NextResponse.json({ ok: true });
}
