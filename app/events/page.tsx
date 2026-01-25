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

  // NEW: store pre-stringified JSON for selected event
  const [selectedJson, setSelectedJson] = useState<string>("");

  // NEW: default to raw lines (not collapsed)
  const [viewMode, setViewMode] = useState<"tree" | "lines">("lines");

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

      // keep selection in sync
      if (selected) {
        const stillThere = next.find((e) => e.id === selected.id);
        if (!stillThere) {
          setSelected(null);
          setSelectedJson("");
        } else {
          // refresh selected payload if it changed
          setSelected(stillThere);
          setSelectedJson(safeStringify(stillThere.payload));
        }
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

  return (
    <div style={page()}>
      {/* Hacker overlays */}
      <div style={gridOverlay()} />
      <div style={scanlines()} />
      <div style={vignette()} />

      <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <header style={header()}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.6 }}>
              <span style={{ color: "#98c379" }}>WEBHOOK</span>{" "}
              <span style={{ opacity: 0.9 }}>VIEWER</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              {loading ? "Loading…" : `${list?.length} event(s)`} • polling every 4s
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                if (!confirm("Clear all events?")) return;
                await fetch("/api/clear", { method: "POST" });
                setSelected(null);
                setSelectedJson("");
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
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anything… (phone, name, object, leadgen)"
                style={input()}
              />
              <div style={kbdWrap()}>
                <span style={kbdKey()}>CTRL</span>
                <span style={kbdKey()}>F</span>
              </div>
            </div>

            <div style={{ marginTop: 12, maxHeight: "78vh", overflow: "auto", paddingRight: 6 }}>
              {list.map((e) => {
                const active = selected?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSelected(e);
                      setSelectedJson(safeStringify(e.payload)); // PRE-STRINGIFY NOW
                      setViewMode("lines"); // default view = raw open
                    }}
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

                    <div style={metaRow()}>
                      <span style={pill()}>id:{e.id.slice(0, 8)}</span>
                      <span style={pill()}>
                        size:{safeStringify(e.payload).length.toLocaleString()}
                      </span>
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
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.3 }}>
                  Event Details
                </div>
                {selected ? (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    id: <span style={{ opacity: 0.9 }}>{selected.id}</span> •{" "}
                    {new Date(selected.receivedAt).toLocaleString()}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    Select an event.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={toggleWrap()}>
                  <button
                    onClick={() => setViewMode("lines")}
                    style={viewMode === "lines" ? toggleOn() : toggleOff()}
                    disabled={!selected}
                  >
                    RAW
                  </button>
                  <button
                    onClick={() => setViewMode("tree")}
                    style={viewMode === "tree" ? toggleOn() : toggleOff()}
                    disabled={!selected}
                  >
                    TREE
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
                <div style={treeWrap()}>
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

  const [open, setOpen] = useState(depth < 2); // open a bit more by default
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

/** -------- Line Viewer (hacker style) -------- */

function LineViewer({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={linesWrap()}>
      {lines.map((line, idx) => (
        <div key={idx} style={lineRow()}>
          <div style={lineNo()}>{String(idx + 1).padStart(3, "0")}</div>
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
    position: "relative",
    overflow: "hidden",
  } as const;
}

function header() {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 4px",
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
    backdropFilter: "blur(6px)",
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
    fontWeight: 800,
    letterSpacing: 0.2,
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
    transition: "transform 120ms ease, border-color 120ms ease, background 120ms ease",
  };
}

function cardActive() {
  return {
    border: "1px solid rgba(152,195,121,0.35)",
    background: "rgba(152,195,121,0.08)",
    boxShadow: "0 0 0 1px rgba(152,195,121,0.12), 0 12px 28px rgba(0,0,0,0.45)",
    transform: "translateY(-1px)",
  };
}

function badge() {
  return {
    fontSize: 11,
    opacity: 0.9,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.20)",
  } as const;
}

function metaRow() {
  return {
    display: "flex",
    gap: 8,
    marginTop: 10,
    opacity: 0.85,
    flexWrap: "wrap" as const,
  };
}

function pill() {
  return {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.22)",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  } as const;
}

function toggleWrap() {
  return {
    display: "flex",
    gap: 6,
    padding: 4,
    borderRadius: 10,
    border: softBorder(),
    background: "rgba(0,0,0,0.22)",
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
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.3,
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

function treeWrap() {
  return {
    maxHeight: "78vh",
    overflow: "auto",
    border: softBorder(),
    borderRadius: 12,
    padding: 10,
    background: "rgba(0,0,0,0.22)",
  } as const;
}

function linesWrap() {
  return {
    maxHeight: "78vh",
    overflow: "auto",
    border: softBorder(),
    borderRadius: 12,
    background: "rgba(0,0,0,0.26)",
  } as const;
}

function lineRow() {
  return {
    display: "grid",
    gridTemplateColumns: "64px 1fr",
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
  return {
    opacity: 0.45,
    textAlign: "right",
    userSelect: "none" as const,
    color: "rgba(152,195,121,0.85)",
  } as const;
}

function lineText() {
  return {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  } as const;
}

/** -------- Hacker overlays (subtle) -------- */

function gridOverlay() {
  return {
    position: "fixed" as const,
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
    backgroundSize: "38px 38px",
    opacity: 0.35,
    pointerEvents: "none" as const,
    zIndex: 0,
  };
}

function scanlines() {
  return {
    position: "fixed" as const,
    inset: 0,
    backgroundImage:
      "linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.00))",
    backgroundSize: "100% 6px",
    mixBlendMode: "overlay" as const,
    opacity: 0.25,
    pointerEvents: "none" as const,
    zIndex: 1,
  };
}

function vignette() {
  return {
    position: "fixed" as const,
    inset: 0,
    background:
      "radial-gradient(ellipse at center, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.72) 100%)",
    opacity: 0.95,
    pointerEvents: "none" as const,
    zIndex: 1,
  };
}

function kbdWrap() {
  return {
    display: "flex",
    gap: 6,
    alignItems: "center",
    opacity: 0.75,
    userSelect: "none" as const,
  } as const;
}

function kbdKey() {
  return {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.4,
    padding: "6px 8px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.30)",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  } as const;
}