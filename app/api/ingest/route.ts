import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "events.json";

export async function POST(req: Request) {
  const secret = req.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const event = { id: crypto.randomUUID(), receivedAt: new Date().toISOString(), payload };

  const events = (await kv.get<any[]>(KEY)) ?? [];
  events.unshift(event);

  // optional cap (prevents unbounded growth)
  if (events.length > 2000) events.length = 2000;

  await kv.set(KEY, events);

  return NextResponse.json({ ok: true, id: event.id });
}