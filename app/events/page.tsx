"use client";

import { useEffect, useMemo, useState } from "react";

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
  const s = safeStringify(payload);
  return s?.length > 180 ? s.slice(0, 180) + "…" : s;
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
    <div style={page()}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={header()}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Webhook Viewer</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              {loading ? "Loading…" : `${list?.length} event(s)`} • polling every 4s
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                if (!confirm("Clear all events?")) return;
                await fetch("/api/clear", { method: "POST" });
                await load();
              }}
              style={btnDanger()}
            >
              Clear
            </button>

            <button onClick={load} style={btn()}>
              Refresh
            </button>
          </div>
        </header>

        <main style={grid()}>
          {/* LEFT */}
          <section style={panel()}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search anything… (phone, name, object, leadgen)"
              style={input()}
            />

            <div style={{ marginTop: 12, maxHeight: "78vh", overflow: "auto", paddingRight: 6 }}>
              {list.map((e) => {
                const active = selected?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    style={{ ...card(), ...(active ? cardActive() : {}) }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {new Date(e.receivedAt).toLocaleString()}
                      </div>
                      <div style={badge()}>
                        {typeof e.payload?.object === "string" ? e.payload.object : "event"}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, lineHeight: 1.35 }}>
                      {formatPreview(e.payload)}
                    </div>
                  </button>
                );
              })}

              {list?.length === 0 && <div style={{ padding: 12, opacity: 0.8 }}>No events.</div>}
            </div>
          </section>

          {/* RIGHT */}
          <section style={panel()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Event Details</div>
                {selected ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    id: <span style={{ opacity: 0.9 }}>{selected.id}</span> •{" "}
                    {new Date(selected.receivedAt).toLocaleString()}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Select an event.</div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={toggleWrap()}>
                  <button
                    onClick={() => setViewMode("tree")}
                    style={viewMode === "tree" ? toggleOn() : toggleOff()}
                    disabled={!selected}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setViewMode("lines")}
                    style={viewMode === "lines" ? toggleOn() : toggleOff()}
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
                  style={btn()}
                  disabled={!selected}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {!selected ? (
                <div style={{ padding: 12, opacity: 0.8 }}>Choose an event to view JSON.</div>
              ) : viewMode === "lines" ? (
                <LineViewer text={selectedJson} />
              ) : (
                <div style={{ maxHeight: "78vh", overflow: "auto", border: softBorder(), borderRadius: 12, padding: 10 }}>
                  <JsonTree value={selected.payload} />
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/** -------- Tree Viewer (no deps) -------- */

function JsonTree({ value }: { value: any }) {
  return <Node name={null} value={value} depth={0} />;
}

function Node({ name, value, depth }: { name: string | null; value: any; depth: number }) {
  const isObj = value !== null && typeof value === "object";
  const isArr = Array.isArray(value);

  const [open, setOpen] = useState(depth < 1); // open first level by default

  const indent = { paddingLeft: depth * 14 };

  if (!isObj) {
    return (
      <div style={{ ...row(), ...indent }}>
        {name !== null && <span style={keyStyle()}>"{name}"</span>}
        {name !== null && <span style={{ opacity: 0.7 }}>: </span>}
        <span style={primitiveStyle(value)}>{formatPrimitive(value)}</span>
      </div>
    );
  }

  const keys = isArr ? value.map((_: any, i: number) => String(i)) : Object.keys(value);
  const label = isArr ? `Array(${keys?.length})` : `Object(${keys?.length})`;

  return (
    <div>
      <div style={{ ...row(), ...indent }}>
        <button onClick={() => setOpen(!open)} style={expander()}>
          {open ? "▾" : "▸"}
        </button>

        {name !== null && <span style={keyStyle()}>"{name}"</span>}
        {name !== null && <span style={{ opacity: 0.7 }}>: </span>}

        <span style={{ opacity: 0.75 }}>{label}</span>
      </div>

      {open && (
        <div>
          {keys.map((k: string) => (
            <Node
              key={k}
              name={isArr ? null : k}
              value={isArr ? value[Number(k)] : value[k]}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatPrimitive(v: any) {
  if (v === null) return "null";
  if (typeof v === "string") return `"${v}"`;
  if (typeof v === "undefined") return "undefined";
  return String(v);
}

function primitiveStyle(v: any) {
  if (v === null) return { color: "#d19a66" };
  if (typeof v === "string") return { color: "#98c379" };
  if (typeof v === "number") return { color: "#61afef" };
  if (typeof v === "boolean") return { color: "#e06c75" };
  return { color: "#eaeaea" };
}

/** -------- Line Viewer -------- */

function LineViewer({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ maxHeight: "78vh", overflow: "auto", border: softBorder(), borderRadius: 12 }}>
      {lines.map((line, idx) => (
        <div key={idx} style={lineRow()}>
          <div style={lineNo()}>{idx + 1}</div>
          <div style={lineText()}>{line}</div>
        </div>
      ))}
    </div>
  );
}

/** -------- Styles -------- */

function page() {
  return {
    minHeight: "100vh",
    padding: 16,
    background: "#0b0b0c",
    color: "#eaeaea",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  } as const;
}

function header() {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  } as const;
}

function grid() {
  return {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "460px 1fr",
    gap: 14,
  } as const;
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

function softBorder() {
  return "1px solid rgba(255,255,255,0.10)";
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
    background: "rgba(255,255,255,0.06)",
    color: "#eaeaea",
    cursor: "pointer",
    fontWeight: 700,
  } as const;
}

function btnDanger() {
  return {
    ...btn(),
    background: "#ff3b30",
    border: "1px solid rgba(255,255,255,0.16)",
    color: "#fff",
  } as const;
}

function card() {
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

function cardActive() {
  return {
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.08)",
  };
}

function badge() {
  return {
    fontSize: 11,
    opacity: 0.85,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
  } as const;
}

function toggleWrap() {
  return {
    display: "flex",
    gap: 6,
    padding: 4,
    borderRadius: 10,
    border: softBorder(),
  } as const;
}

function toggleOff() {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  } as const;
}

function toggleOn() {
  return {
    ...toggleOff(),
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
  } as const;
}

function expander() {
  return {
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    cursor: "pointer",
    width: 22,
    height: 22,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    userSelect: "none" as const,
  };
}

function row() {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 0",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.35,
  } as const;
}

function keyStyle() {
  return { color: "#e5c07b" } as const;
}

function lineRow() {
  return {
    display: "grid",
    gridTemplateColumns: "56px 1fr",
    gap: 12,
    padding: "6px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.45,
  } as const;
}

function lineNo() {
  return { opacity: 0.45, textAlign: "right", userSelect: "none" as const } as const;
}

function lineText() {
  return { whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const } as const;
}
