import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "events.json";

export async function GET() {
  const events = (await kv.get<any[]>(KEY)) ?? [];
  return NextResponse.json({ ok: true, events });
}