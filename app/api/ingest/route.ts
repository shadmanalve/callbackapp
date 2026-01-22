import { NextResponse } from "next/server";
import { list, put } from "@vercel/blob";

const FILE = "events/events.json";
const MAX_EVENTS = 5000;

async function readEvents() {
  const { blobs } = await list({ prefix: FILE, limit: 1 });
  if (!blobs.length) return [];
  const r = await fetch(blobs[0].url, { cache: "no-store" });
  const data = await r.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export async function POST(req: Request) {
  // protect ingest so random people can’t spam your storage
  const secret = req.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  const events = await readEvents();

  events.unshift({
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload,
  });

  const trimmed = events.slice(0, MAX_EVENTS);

  await put(FILE, JSON.stringify(trimmed), {
    access: "public",
    addRandomSuffix: false, // IMPORTANT: overwrite same “file”
    contentType: "application/json",
  });

  return NextResponse.json({ ok: true });
}
