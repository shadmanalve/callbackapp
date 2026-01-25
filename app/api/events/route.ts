import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const FILE = path.join("/tmp", "events.json");

export async function GET() {
  try {
    const txt = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(txt);
    const events = Array.isArray(data) ? data : [];
    return NextResponse.json({ ok: true, events });
  } catch {
    return NextResponse.json({ ok: true, events: [] });
  }
}