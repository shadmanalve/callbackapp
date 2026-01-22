import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const LIST_KEY = "events:list";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || "200"), 1000);

  const raw = (await kv.lrange<string>(LIST_KEY, 0, limit - 1)) || [];
  const events = raw
    .map((s) => {
      try { return JSON.parse(s); } catch { return null; }
    })
    .filter(Boolean);

  const filtered = !q
    ? events
    : events.filter((e: any) => JSON.stringify(e.payload).toLowerCase().includes(q));

  return NextResponse.json({ ok: true, count: filtered.length, events: filtered });
}
