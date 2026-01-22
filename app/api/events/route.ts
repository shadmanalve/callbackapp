import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

const PREFIX = "events/";
const CLEAR_FILE = `${PREFIX}_clear.json`;

async function getClearedAt(): Promise<number> {
  const { blobs } = await list({ prefix: CLEAR_FILE, limit: 1 });
  if (!blobs.length) return 0;

  // cache-bust to avoid CDN stale reads
  const r = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) return 0;

  const data = await r.json().catch(() => null);
  const iso = data?.clearedAt;
  const t = iso ? Date.parse(iso) : 0;
  return Number.isFinite(t) ? t : 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") || "300"), 300);

  const clearedAtMs = await getClearedAt();

  // list latest blobs
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });

  // exclude clear marker and anything older than clearedAt
  const candidates = blobs
    .filter((b) => !b.pathname.endsWith("_clear.json"))
    .filter((b) => (b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0) > clearedAtMs)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, limit);

  // fetch each event JSON
  const events = await Promise.all(
    candidates.map(async (b) => {
      const r = await fetch(`${b.url}?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json().catch(() => null);
    })
  );

  const cleaned = events.filter(Boolean);

  const filtered = !q
    ? cleaned
    : cleaned.filter((e: any) => JSON.stringify(e).toLowerCase().includes(q));

  return NextResponse.json({ ok: true, count: filtered.length, events: filtered });
}
