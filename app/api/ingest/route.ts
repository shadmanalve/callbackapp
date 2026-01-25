import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const FILE = path.join("/tmp", "events.json");
const MAX_EVENTS = 2000;

// 1) Put the lock HERE (module scope, outside POST)
let writing: Promise<void> = Promise.resolve();

async function readEvents() {
  try {
    const txt = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeEvents(events: any[]) {
  await fs.writeFile(FILE, JSON.stringify(events, null, 2), "utf8");
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-ingest-secret");
  if (!process.env.INGEST_SECRET || secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const event = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload,
  };

  // 2) Use the lock HERE, replacing direct read/write
  writing = writing.then(async () => {
    const events = await readEvents();
    events.unshift(event);
    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
    await writeEvents(events);
  });

  // 3) Wait for YOUR write to finish
  await writing;

  return NextResponse.json({ ok: true, id: event.id });
}