"use client";

import { useEffect, useMemo, useState } from "react";

type EventItem = {
  id: string;
  receivedAt: string;
  payload: any;
};

export default function EventsPage() {
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selected, setSelected] = useState<EventItem | null>(null);

  async function load() {
    const res = await fetch(`/api/events?q=${encodeURIComponent(q)}&limit=300`, {
      cache: "no-store",
    });
    const data = await res.json();
    setEvents(data.events || []);
    if (selected) {
      const stillThere = (data.events || []).find((e: EventItem) => e.id === selected.id);
      if (!stillThere) setSelected(null);
    }
  }

  // load on q change
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // polling so refresh not required
  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => events, [events]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 12, padding: 12 }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Events</h2>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (phone, name, 'whatsapp_business_account', etc.)"
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <div style={{ maxHeight: "75vh", overflow: "auto" }}>
          {list.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 10,
                marginBottom: 8,
                borderRadius: 8,
                border: "1px solid #eee",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(e.receivedAt).toLocaleString()}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {typeof e.payload?.object === "string" ? `object: ${e.payload.object}` : "event"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {JSON.stringify(e.payload).slice(0, 120)}...
              </div>
            </button>
          ))}
          {list.length === 0 && <p>No events found.</p>}
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Payload</h2>
        {!selected ? (
          <p>Select an event to view details.</p>
        ) : (
          <>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              id: {selected.id} • receivedAt: {new Date(selected.receivedAt).toLocaleString()}
            </div>
            <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
