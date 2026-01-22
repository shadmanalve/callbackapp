import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

const FILE = "events/events.json";

async function readEvents() {
  const { blobs } = await list({ prefix: FILE, limit: 1 });

  if (!blobs.length) return [];
  const url = blobs[0].url;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];

  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || "300"), 2000);

  const events = (await readEvents()).slice(0, limit);

  const filtered = !q
    ? events
    : events.filter((e: any) =>
        JSON.stringify(e).toLowerCase().includes(q)
      );

  return NextResponse.json({ ok: true, count: filtered.length, events: filtered });
}
