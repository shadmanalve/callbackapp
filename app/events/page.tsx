"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// react-json-view needs window, so load client-side only
const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

type EventItem = {
  id: string;
  receivedAt: string;
  payload: any;
};

function safeStringify(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function formatPreview(payload: any) {
  // nicer preview for list items
  const s = safeStringify(payload);
  return s.length > 180 ? s.slice(0, 180) + "…" : s;
}

export default function EventsPage() {
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "lines">("tree");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?q=${encodeURIComponent(q)}&limit=300`, {
        cache: "no-store",
      });
      const data = await res.json();
      const next = (data.events || []) as EventItem[];
      setEvents(next);

      if (selected) {
        const stillThere = next.find((e) => e.id === selected.id);
        if (!stillThere) setSelected(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => events, [events]);

  const selectedJson = selected ? safeStringify(selected.payload) : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        background: "#0b0b0c",
        color: "#eaeaea",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Webhook Viewer</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              {loading ? "Loading…" : `${list.length} event(s) loaded`} • Polling every 4s
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                if (!confirm("Clear all events?")) return;
                await fetch("/api/clear", { method: "POST" });
                await load();
              }}
              style={btn()}
            >
              Clear
            </button>

            <button onClick={load} style={btnSecondary()}>
              Refresh
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "460px 1fr",
            gap: 14,
          }}
        >
          {/* LEFT: list */}
          <div style={panel()}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anything… (phone, name, object, leadgen)"
                style={input()}
              />
            </div>

            <div style={{ marginTop: 12, maxHeight: "78vh", overflow: "auto", paddingRight: 6 }}>
              {list.map((e) => {
                const active = selected?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    style={{
                      ...listItem(),
                      ...(active ? listItemActive() : {}),
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {new Date(e.receivedAt).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.7,
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        {typeof e.payload?.object === "string" ? e.payload.object : "event"}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>
                      {formatPreview(e.payload)}
                    </div>
                  </button>
                );
              })}

              {list.length === 0 && (
                <div style={{ padding: 12, opacity: 0.8 }}>No events found.</div>
              )}
            </div>
          </div>

          {/* RIGHT: details */}
          <div style={panel()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Event Details</div>
                {selected ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    id: <span style={{ opacity: 0.9 }}>{selected.id}</span> •{" "}
                    {new Date(selected.receivedAt).toLocaleString()}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    Select an event on the left.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 10, border: softBorder() }}>
                  <button
                    onClick={() => setViewMode("tree")}
                    style={viewMode === "tree" ? pillActive() : pill()}
                    disabled={!selected}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setViewMode("lines")}
                    style={viewMode === "lines" ? pillActive() : pill()}
                    disabled={!selected}
                  >
                    Lines
                  </button>
                </div>

                <button
                  onClick={async () => {
                    if (!selected) return;
                    await navigator.clipboard.writeText(selectedJson);
                    alert("Copied JSON");
                  }}
                  style={btnSecondary()}
                  disabled={!selected}
                >
                  Copy JSON
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {!selected ? (
                <div style={{ padding: 12, opacity: 0.8 }}>
                  Choose an event to see beautified JSON.
                </div>
              ) : viewMode === "tree" ? (
                <div style={{ border: softBorder(), borderRadius: 12, padding: 12, overflow: "auto" }}>
                  <ReactJson
                    src={selected.payload}
                    name={null}
                    collapsed={1}        // collapse big objects by default
                    enableClipboard={false}
                    displayDataTypes={false}
                    displayObjectSize={true}
                    indentWidth={2}
                    style={{
                      background: "transparent",
                      fontSize: "13px",
                      lineHeight: 1.35,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    border: softBorder(),
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <LineViewer text={selectedJson} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Line-by-line viewer with line numbers */
function LineViewer({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div style={{ maxHeight: "78vh", overflow: "auto" }}>
      {lines.map((line, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr",
            gap: 12,
            padding: "6px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <div style={{ opacity: 0.45, textAlign: "right", userSelect: "none" }}>
            {idx + 1}
          </div>
          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{line}</div>
        </div>
      ))}
    </div>
  );
}

/** styles */
function softBorder() {
  return "1px solid rgba(255,255,255,0.10)";
}

function panel() {
  return {
    background: "rgba(255,255,255,0.04)",
    border: softBorder(),
    borderRadius: 14,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  } as const;
}

function input() {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: softBorder(),
    background: "rgba(0,0,0,0.35)",
    color: "#eaeaea",
    outline: "none",
  } as const;
}

function btn() {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#ff3b30",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  } as const;
}

function btnSecondary() {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#eaeaea",
    cursor: "pointer",
    fontWeight: 600,
  } as const;
}

function listItem() {
  return {
    width: "100%",
    textAlign: "left" as const,
    padding: 12,
    marginBottom: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
  };
}

function listItemActive() {
  return {
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.08)",
  };
}

function pill() {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  } as const;
}

function pillActive() {
  return {
    ...pill(),
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
  } as const;
}
