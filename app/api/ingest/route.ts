import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

const PREFIX = "events/";
const CLEAR_FILE = `${PREFIX}_clear.json`;

export async function POST(req: Request) {
  const secret = req.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });

  const event = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload,
  };

  // unique file per event => no overwrite issues ever
  const filename = `${PREFIX}${Date.now()}-${event.id}.json`;

  await put(filename, JSON.stringify(event), {
    access: "public",
    contentType: "application/json",
  });

  return NextResponse.json({ ok: true });
}
