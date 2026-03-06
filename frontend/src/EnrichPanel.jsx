import React, { useState } from "react";

const FIELD_LABELS = {
  year_released:      "Year Released",
  gender_class:       "Gender",
  concentration:      "Concentration",
  perfumer:           "Perfumer",
  top_notes:          "Top Notes",
  middle_notes:       "Middle Notes",
  base_notes:         "Base Notes",
  main_accords:       "Accords",
  fragrantica_rating: "Fragrantica Rating",
  longevity_rating:   "Longevity",
  sillage_rating:     "Sillage",
  image:              "Image",
};

const SOURCE_COLORS = {
  fragella:    "var(--blue)",
  fragrantica: "var(--gold)",
  basenotes:   "var(--green)",
  parfumo:     "#b57bee",
};

// ── IMAGE PREVIEW MODAL ───────────────────────────────────────
function ImagePreviewModal({ preview, onConfirm, onCancel }) {
  const [imgOk, setImgOk] = useState(true);

  if (!preview) return null;

  const isManual = preview.source === "manual_needed" || !preview.url;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)", padding: 20,
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "var(--bg2)", border: "1px solid var(--border)",
        borderRadius: 16, width: "100%", maxWidth: 400,
        boxShadow: "var(--shadow)",
        animation: "modalEnter 0.25s cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 20, fontWeight: 300, color: "var(--text)",
          }}>
            {isManual ? "No Image Found" : "Image Found"}
          </span>
          <button onClick={onCancel} style={{
            background: "none", border: "none", color: "var(--text3)",
            fontSize: 18, cursor: "pointer", lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {isManual ? (
            <div style={{
              fontSize: 13, color: "var(--text2)", lineHeight: 1.6,
              background: "var(--bg3)", borderRadius: 8, padding: "12px 14px",
            }}>
              Could not find a Fragrantica match for this fragrance. You can enter
              an image URL manually in the Edit tab.
            </div>
          ) : (
            <>
              {/* Image preview */}
              <div style={{
                background: "#ffffff", borderRadius: 8, padding: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 180,
              }}>
                {imgOk ? (
                  <img
                    src={preview.url}
                    alt="Preview"
                    onError={() => setImgOk(false)}
                    style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text3)" }}>
                    Image failed to load
                  </div>
                )}
              </div>

              {/* Source + URL */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", width: 80 }}>Source</span>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: "rgba(201,168,76,0.15)", color: "var(--gold)",
                    border: "1px solid rgba(201,168,76,0.3)",
                  }}>{preview.source}</span>
                </div>
                {preview.fragrantica_url && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", width: 80, paddingTop: 2, flexShrink: 0 }}>
                      Frag. URL
                    </span>
                    <a
                      href={preview.fragrantica_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: "var(--blue)", wordBreak: "break-all", lineHeight: 1.4 }}
                    >
                      {preview.fragrantica_url}
                    </a>
                  </div>
                )}
              </div>

              {!imgOk && (
                <div style={{ fontSize: 12, color: "var(--red)", background: "rgba(224,85,85,0.1)", borderRadius: 6, padding: "8px 12px" }}>
                  The image URL was found but failed to load. You can still save it and check manually.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid var(--border)",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button
            onClick={onCancel}
            style={{
              background: "var(--bg3)", border: "1px solid var(--border)",
              color: "var(--text3)", borderRadius: 8, padding: "8px 16px",
              fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {isManual ? "OK" : "No, skip"}
          </button>
          {!isManual && (
            <button
              onClick={() => onConfirm(preview)}
              style={{
                background: "var(--gold)", border: "none", color: "#0c0c0f",
                borderRadius: 8, padding: "8px 16px",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Yes, use this image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ENRICH PANEL ──────────────────────────────────────────────
export function EnrichPanel({ frag, API, toast, onUpdate }) {
  const [status,      setStatus]      = useState(null);
  const [mode,        setMode]        = useState(null);
  const [result,      setResult]      = useState(null);
  const [conflicts,   setConflicts]   = useState([]);
  const [choices,     setChoices]     = useState({});
  const [applying,    setApplying]    = useState(false);
  const [lockAfter,   setLockAfter]   = useState(false);
  const [imgPreview,  setImgPreview]  = useState(null); // preview modal data

  const isLocked = !!frag.enrichment_locked;

  const run = async (m) => {
    if (isLocked) return;
    setMode(m);
    setStatus("loading");
    setResult(null);
    setConflicts([]);
    setChoices({});
    try {
      const res  = await fetch(`${API}/fragrances/${frag.id}/enrich/${m}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Enrichment failed");
      setResult(data);
      setConflicts(data.conflicts || []);
      const init = {};
      (data.conflicts || []).forEach(c => {
        if (c.values?.[0]) init[c.field] = c.values[0].value;
      });
      setChoices(init);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setResult({ error: e.message });
    }
  };

  const apply = async () => {
    if (!result) return;
    setApplying(true);
    const data = { ...(result.merged || {}), ...choices };
    try {
      const res = await fetch(`${API}/fragrances/${frag.id}/enrich/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, lock: lockAfter }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        toast("Enrichment applied ✓");
        setStatus(null);
        setResult(null);
      } else {
        toast("Failed to apply enrichment");
      }
    } catch {
      toast("Error applying enrichment");
    }
    setApplying(false);
  };

  // Image refresh — shows preview modal, user confirms before saving
  const refreshImage = async () => {
    if (isLocked) return;
    setMode("image");
    setStatus("loading");
    try {
      const res  = await fetch(`${API}/fragrances/${frag.id}/enrich/image/preview`, { method: "POST" });
      const data = await res.json();
      setStatus(null);
      setImgPreview(data); // show modal regardless of result
    } catch {
      setStatus("error");
      setResult({ error: "Image search failed" });
    }
  };

  const confirmImage = async (preview) => {
    setImgPreview(null);
    if (!preview.url) return;
    // Save via apply endpoint
    const payload = { fragella_image_url: preview.url };
    if (preview.fragrantica_url) payload.fragrantica_url = preview.fragrantica_url;
    try {
      const res = await fetch(`${API}/fragrances/${frag.id}/enrich/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload, lock: false }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        toast("Image saved ✓");
      } else {
        toast("Failed to save image");
      }
    } catch {
      toast("Error saving image");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* IMAGE PREVIEW MODAL */}
      {imgPreview && (
        <ImagePreviewModal
          preview={imgPreview}
          onConfirm={confirmImage}
          onCancel={() => setImgPreview(null)}
        />
      )}

      {/* LOCKED WARNING */}
      {isLocked && (
        <div style={{
          background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)",
          borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--gold)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🔒 Enrichment is locked. Unlock in the Edit tab to update this fragrance.
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn btn-secondary"
          onClick={() => run("smart")}
          disabled={isLocked || status === "loading"}
          title="Fill only missing fields from all sources"
        >
          {status === "loading" && mode === "smart"
            ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}} /> Scanning…</>
            : "⬇ Fill Missing"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => run("rescrape")}
          disabled={isLocked || status === "loading"}
          title="Re-fetch all data and overwrite existing"
        >
          {status === "loading" && mode === "rescrape"
            ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}} /> Scraping…</>
            : "↺ Re-scrape All"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={refreshImage}
          disabled={isLocked || status === "loading"}
          title="Search for image via Fragrantica"
        >
          {status === "loading" && mode === "image"
            ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}} /> Searching…</>
            : "🖼 Refresh Image"}
        </button>
      </div>

      {/* LOADING STATE */}
      {status === "loading" && (
        <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", flexDirection: "column", gap: 4 }}>
          <div>
            {mode === "image"
              ? "Searching Fragrantica for this fragrance…"
              : "Querying Fragella, Fragrantica, Basenotes, Parfumo…"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)", opacity: 0.7 }}>
            {mode === "image" ? "Usually under 10 seconds" : "This may take 10–30 seconds"}
          </div>
        </div>
      )}

      {/* ERROR */}
      {status === "error" && (
        <div style={{ fontSize: 13, color: "var(--red)", background: "rgba(224,85,85,0.1)", borderRadius: 8, padding: "10px 14px" }}>
          {result?.error || "Something went wrong"}
        </div>
      )}

      {/* COMPLETE — nothing missing */}
      {status === "done" && result?.status === "complete" && (
        <div style={{ fontSize: 13, color: "var(--green)", background: "rgba(76,174,122,0.1)", borderRadius: 8, padding: "10px 14px" }}>
          ✓ {result.message}
        </div>
      )}

      {/* RESULTS */}
      {status === "done" && result && result.status !== "complete" && (
        <>
          {/* SOURCES FOUND */}
          {result.sources_found && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Sources</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(result.sources_found).map(([src, found]) => (
                  <span key={src} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: found ? "rgba(76,174,122,0.15)" : "var(--bg3)",
                    color: found ? "var(--green)" : "var(--text3)",
                    border: `1px solid ${found ? "rgba(76,174,122,0.3)" : "var(--border)"}`,
                  }}>
                    {found ? "✓" : "✗"} {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AUTO-MERGED FIELDS */}
          {result.merged && Object.keys(result.merged).length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Auto-resolved ({Object.keys(result.merged).length} fields)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(result.merged).map(([field, val]) => (
                  <div key={field} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    background: "var(--bg3)", borderRadius: 8, padding: "8px 12px",
                    fontSize: 12,
                  }}>
                    <span style={{ color: "var(--text3)", width: 110, flexShrink: 0, paddingTop: 1 }}>
                      {FIELD_LABELS[field] || field}
                    </span>
                    <span style={{ color: "var(--text2)", flex: 1 }}>
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </span>
                    <span style={{ color: "var(--green)", fontSize: 11, flexShrink: 0 }}>✓ agreed</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONFLICTS */}
          {conflicts.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Conflicts — select your preferred value
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {conflicts.map(conflict => (
                  <div key={conflict.field} style={{
                    background: "var(--bg3)", borderRadius: 8, padding: 12,
                    border: "1px solid rgba(224,85,85,0.2)",
                  }}>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8, fontWeight: 500 }}>
                      {FIELD_LABELS[conflict.field] || conflict.field}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {conflict.values.map((sv, i) => {
                        const displayVal = Array.isArray(sv.value) ? sv.value.join(", ") : String(sv.value);
                        const isSelected = JSON.stringify(choices[conflict.field]) === JSON.stringify(sv.value);
                        return (
                          <div key={i}
                            onClick={() => setChoices(prev => ({ ...prev, [conflict.field]: sv.value }))}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 8,
                              padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                              background: isSelected ? "var(--gold-dim)" : "var(--bg2)",
                              border: `1px solid ${isSelected ? "rgba(201,168,76,0.4)" : "var(--border)"}`,
                              transition: "all 0.15s",
                            }}
                          >
                            <span style={{
                              width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                              background: isSelected ? "var(--gold)" : "var(--border2)",
                              border: `2px solid ${isSelected ? "var(--gold)" : "var(--border2)"}`,
                            }} />
                            <span style={{ fontSize: 11, color: SOURCE_COLORS[sv.source] || "var(--text3)", width: 80, flexShrink: 0 }}>
                              {sv.source}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text2)", flex: 1, lineHeight: 1.4 }}>
                              {displayVal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STILL MISSING */}
          {result.missing_fields && result.missing_fields.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              Still missing after scrape:{" "}
              {result.missing_fields
                .filter(f => !result.merged?.[f] && !conflicts.find(c => c.field === f))
                .map(f => FIELD_LABELS[f] || f)
                .join(", ") || "none"}
            </div>
          )}

          {/* APPLY */}
          {(Object.keys(result.merged || {}).length > 0 || conflicts.length > 0) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
              <button className="btn btn-primary" onClick={apply} disabled={applying}>
                {applying ? "Applying…" : "Apply Changes"}
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text3)" }}>
                <input
                  type="checkbox"
                  checked={lockAfter}
                  onChange={e => setLockAfter(e.target.checked)}
                  style={{ accentColor: "var(--gold)", width: 13, height: 13 }}
                />
                Lock after applying
              </label>
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}
                onClick={() => { setStatus(null); setResult(null); setConflicts([]); }}>
                Discard
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
