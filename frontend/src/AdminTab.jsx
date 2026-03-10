// AdminTab.jsx — drop into frontend/src/
import { useState, useEffect, useRef } from "react";
import SentSamplesSection from "./SentSamplesSection";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }

  .admin-section {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
  }
  .admin-section-header {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .admin-section-title {
    font-family: var(--serif);
    font-size: 18px; font-weight: 300; color: var(--text);
    display: flex; align-items: center; gap: 8px;
  }
  .admin-section-body { padding: 16px 20px; }

  /* INVITE LIST */
  .invite-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0; border-bottom: 1px solid var(--border);
  }
  .invite-item:last-child { border-bottom: none; }
  .invite-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--gold-dim); border: 1px solid rgba(201,168,76,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--gold); font-weight: 500; flex-shrink: 0;
  }
  .invite-info { flex: 1; min-width: 0; }
  .invite-name { font-size: 14px; color: var(--text); }
  .invite-meta { font-size: 11px; color: var(--text3); margin-top: 1px; }
  .invite-link {
    font-size: 11px; color: var(--blue); background: rgba(91,141,238,0.1);
    border: 1px solid rgba(91,141,238,0.2); border-radius: 6px;
    padding: 4px 8px; cursor: pointer; white-space: nowrap;
    transition: all 0.15s; font-family: var(--sans);
  }
  .invite-link:hover { background: rgba(45,212,191,0.15); border-color: rgba(45,212,191,0.3); color: var(--teal, #2dd4bf); }
  .invite-active { width: 8px; height: 8px; border-radius: 50%;
                   background: var(--green); flex-shrink: 0; }
  .invite-inactive { width: 8px; height: 8px; border-radius: 50%;
                     background: var(--text3); flex-shrink: 0; }

  /* REQUEST LIST */
  .request-item {
    border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 14px; margin-bottom: 10px; transition: border-color 0.15s;
  }
  .request-item:last-child { margin-bottom: 0; }
  .request-item.pending { border-left: 3px solid var(--gold); }
  .request-item.sent    { border-left: 3px solid var(--green); opacity: 0.7; }
  .request-item.declined{ border-left: 3px solid var(--red); opacity: 0.5; }
  .request-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .request-friend { font-size: 14px; color: var(--text); font-weight: 500; }
  .request-date { font-size: 11px; color: var(--text3); }
  .request-frags { font-size: 12px; color: var(--text2); margin-bottom: 8px; line-height: 1.5; }
  .request-message { font-size: 12px; color: var(--text3); font-style: italic; margin-bottom: 10px; }
  .request-actions { display: flex; gap: 6px; }
  .status-badge {
    font-size: 10px; padding: 2px 8px; border-radius: 8px; font-weight: 500;
    letter-spacing: 0.04em; text-transform: uppercase;
  }
  .status-badge.pending  { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(201,168,76,0.35); box-shadow: 0 0 6px rgba(201,168,76,0.15); }
  .status-badge.sent     { background: rgba(76,174,122,0.15); color: var(--green); border: 1px solid rgba(76,174,122,0.3); }
  .status-badge.declined { background: rgba(224,85,85,0.15); color: var(--red); border: 1px solid rgba(224,85,85,0.3); }

  .filter-tabs { display: flex; gap: 4px; margin-bottom: 14px; }
  .filter-tab {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    color: var(--text3); padding: 5px 12px; font-size: 12px;
    cursor: pointer; transition: all 0.15s; font-family: var(--sans);
  }
  .filter-tab:hover { color: var(--text2); }
  .filter-tab.active { border-color: var(--violet); color: var(--violet); background: rgba(167,139,250,0.08); }

  .copy-toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--bg3); border: 1px solid var(--green);
    color: var(--green); border-radius: 8px; padding: 8px 16px;
    font-size: 13px; z-index: 500; pointer-events: none;
    animation: toastIn 0.2s ease;
  }
  .empty-section { padding: 30px; text-align: center; color: var(--text3); font-size: 13px; }

  /* DISCONTINUED SCRAPE */
  .disc-result { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); }
  .disc-result:last-child { border-bottom:none; }
  .disc-badge { font-size:10px; padding:2px 7px; border-radius:4px; font-weight:600; white-space:nowrap; flex-shrink:0; }
  .disc-badge.verified  { background:rgba(224,85,85,0.15); color:var(--red); border:1px solid rgba(224,85,85,0.3); }
  .disc-badge.likely    { background:rgba(201,168,76,0.08); color:var(--gold); border:1px solid rgba(201,168,76,0.3); }
  .disc-badge.possible  { background:rgba(91,141,238,0.1); color:var(--blue); border:1px solid rgba(91,141,238,0.2); }
  .disc-badge.not_found { background:var(--bg3); color:var(--text3); border:1px solid var(--border); }
  .disc-badge.already   { background:rgba(76,174,122,0.1); color:var(--green); border:1px solid rgba(76,174,122,0.2); }
  .disc-name { flex:1; font-size:13px; color:var(--text); min-width:0; }
  .disc-detail { font-size:11px; color:var(--text3); }
  .disc-check { width:16px; height:16px; cursor:pointer; accent-color:var(--gold); flex-shrink:0; }
  .disc-progress { font-size:12px; color:var(--text3); margin-bottom:10px; }
  .disc-progress-bar { height:4px; background:var(--bg3); border-radius:2px; overflow:hidden; margin-bottom:12px; }
  .disc-progress-fill { height:100%; background:var(--gold); transition:width 0.3s; border-radius:2px; }

  /* BATCH ENRICH */
  .batch-controls { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
  .batch-progress-bar { height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; margin-bottom: 14px; }
  .batch-progress-fill { height: 100%; background: var(--gold); transition: width 0.3s; border-radius: 3px; }
  .batch-log { max-height: 260px; overflow-y: auto; font-size: 12px; font-family: monospace; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 3px; }
  .batch-log-row { display: flex; gap: 8px; align-items: baseline; }
  .batch-log-row.updated  { color: var(--green); }
  .batch-log-row.complete { color: var(--text3); }
  .batch-log-row.no_data  { color: var(--text3); opacity: 0.6; }
  .batch-log-row.error    { color: var(--red); }
  .batch-log-row.running  { color: var(--gold); animation: pulse 1s ease-in-out infinite alternate; }
  @keyframes pulse { from { opacity: 0.7; } to { opacity: 1; } }
  .batch-summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; font-size: 12px; }
  .batch-stat { display: flex; gap: 4px; }
  .batch-stat-label { color: var(--text3); }
  .batch-stat-val { color: var(--text); font-weight: 500; }
`;

function AddInviteModal({ onClose, onAdd, toast }) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch(`${API}/friends/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      onAdd(data);
    }
    setSaving(false);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${result.invite_url}`;
    navigator.clipboard.writeText(url);
    toast("Link copied ✓");
  };

  return (
    <div className="modal-overlay" onClick={result ? onClose : undefined}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{result ? "Invite Created" : "Invite a Friend"}</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!result ? (
            <div className="edit-form">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoFocus placeholder="Friend's name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="friend@example.com" />
              </div>
              <p style={{fontSize:12,color:"var(--text3)",lineHeight:1.6}}>
                This generates a magic link. Send it to your friend — they click it, set their name, and can browse your collection and request samples. No account or password needed.
              </p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <p style={{fontSize:13,color:"var(--text2)"}}>
                Share this link with <strong style={{color:"var(--text)"}}>{result.name}</strong>:
              </p>
              <div style={{
                background:"var(--bg3)", border:"1px solid var(--border)",
                borderRadius:8, padding:"10px 14px",
                fontFamily:"monospace", fontSize:12, color:"var(--text2)",
                wordBreak:"break-all"
              }}>
                {window.location.origin}{result.invite_url}
              </div>
              <button className="btn btn-primary" onClick={copyLink}>
                📋 Copy Link
              </button>
              <p style={{fontSize:11,color:"var(--text3)"}}>
                The link is single-use per friend and can be revoked from the Admin panel at any time.
              </p>
            </div>
          )}
        </div>
        {!result && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving || !form.name}>
              {saving ? "Creating…" : "Create Invite"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BATCH ENRICH COMPONENT ───────────────────────────────────
function BatchEnrich({ toast }) {
  const [running, setRunning]   = useState(false);
  const [stopped, setStopped]   = useState(false);
  const [results, setResults]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent]   = useState("");
  const logRef    = useRef(null);
  const stopRef   = useRef(false);

  async function startBatch() {
    setRunning(true);
    setStopped(false);
    setResults([]);
    setSummary(null);
    setProgress(0);
    setCurrent("");
    stopRef.current = false;

    // 1. Fetch all fragrances
    let frags = [];
    try {
      const res = await fetch(`${API}/fragrances?limit=500`);
      const data = await res.json();
      frags = data.items || [];
    } catch (e) {
      setResults([{ status: "error", name: "Failed to load fragrances: " + e.message }]);
      setRunning(false);
      return;
    }

    const counts = { updated: 0, complete: 0, no_data: 0, errors: 0 };
    const log = [];

    for (let i = 0; i < frags.length; i++) {
      if (stopRef.current) { setStopped(true); break; }

      const f = frags[i];
      const label = `${f.brand} ${f.name}`;
      setCurrent(label);
      setProgress(Math.round((i / frags.length) * 100));

      try {
        // Call enrich/smart — returns merged + conflicts
        const smartRes = await fetch(`${API}/fragrances/${f.id}/enrich/smart`, { method: "POST" });
        if (!smartRes.ok) throw new Error(`HTTP ${smartRes.status}`);
        const smart = await smartRes.json();

        if (smart.status === "complete") {
          counts.complete++;
          log.push({ status: "complete", name: label });
        } else if (!smart.merged || Object.keys(smart.merged).length === 0) {
          counts.no_data++;
          log.push({ status: "no_data", name: label });
        } else {
          // Filter out image fields — never update images in batch
          const safeData = Object.fromEntries(
            Object.entries(smart.merged).filter(([k]) =>
              !["fragella_image_url", "custom_image_url"].includes(k)
            )
          );
          if (Object.keys(safeData).length === 0) {
            counts.no_data++;
            log.push({ status: "no_data", name: label });
          } else {
            // Apply the merged data
            const applyRes = await fetch(`${API}/fragrances/${f.id}/enrich/apply`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: safeData, lock: false }),
            });
            if (!applyRes.ok) throw new Error(`Apply HTTP ${applyRes.status}`);
            counts.updated++;
            log.push({ status: "updated", name: label, updated: Object.keys(safeData) });
          }
        }
      } catch (e) {
        counts.errors++;
        log.push({ status: "error", name: label, error: e.message });
      }

      // Update log in batches of 5 to avoid excessive re-renders
      if (i % 5 === 0 || i === frags.length - 1) {
        setResults([...log]);
      }
    }

    setResults([...log]);
    setProgress(100);
    setCurrent("");
    setSummary({ total: frags.length, ...counts });
    setRunning(false);
    toast?.(`Batch complete: ${counts.updated} updated, ${counts.errors} errors`);
  }

  function stopBatch() {
    stopRef.current = true;
  }

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [results]);

  const statusIcon = { updated: "✓", complete: "·", no_data: "–", error: "✗" };

  return (
    <div>
      <div className="batch-controls">
        {!running ? (
          <button className="btn btn-primary" onClick={startBatch}>
            ▶ Start Batch Enrich
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopBatch}>
            ⏹ Stop
          </button>
        )}
        {summary && (
          <div className="batch-summary">
            <div className="batch-stat"><span className="batch-stat-label">Total:</span><span className="batch-stat-val">{summary.total}</span></div>
            <div className="batch-stat"><span className="batch-stat-label">Updated:</span><span className="batch-stat-val" style={{color:"var(--green)"}}>{summary.updated}</span></div>
            <div className="batch-stat"><span className="batch-stat-label">Already complete:</span><span className="batch-stat-val">{summary.complete}</span></div>
            <div className="batch-stat"><span className="batch-stat-label">No data:</span><span className="batch-stat-val">{summary.no_data}</span></div>
            <div className="batch-stat"><span className="batch-stat-label">Errors:</span><span className="batch-stat-val" style={{color:summary.errors>0?"var(--red)":"inherit"}}>{summary.errors}</span></div>
          </div>
        )}
      </div>

      {(running || progress > 0) && (
        <div style={{marginBottom:10}}>
          <div className="batch-progress-bar">
            <div className="batch-progress-fill" style={{width:`${progress}%`}} />
          </div>
          {current && <div style={{fontSize:11,color:"var(--text3)",marginTop:3}}>⟳ {current}</div>}
        </div>
      )}

      {results.length > 0 && (
        <div className="batch-log" ref={logRef}>
          {results.map((r, i) => (
            <div key={i} className={`batch-log-row ${r.status}`}>
              <span style={{opacity:0.5,flexShrink:0}}>{statusIcon[r.status] || "·"}</span>
              <span style={{flexShrink:0}}>{r.name}</span>
              {r.updated?.length > 0 && (
                <span style={{opacity:0.6,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  → {r.updated.join(", ")}
                </span>
              )}
              {r.error && <span style={{opacity:0.7,fontSize:11}}>{r.error}</span>}
            </div>
          ))}
        </div>
      )}

      {!running && results.length === 0 && (
        <div style={{color:"var(--text3)",fontSize:13}}>
          Searches Fragella, Basenotes, and Parfumo for missing fields only. Requires 2 matching sources to update (except perfumer — first match wins). Images are never touched. Locked fragrances are skipped.
        </div>
      )}
    </div>
  );
}


// ── DISCONTINUED SCRAPE COMPONENT ────────────────────────────
function DiscontinuedScrape({ toast }) {
  const [running, setRunning]   = useState(false);
  const [results, setResults]   = useState([]);
  const [checked, setChecked]   = useState(new Set());
  const [progress, setProgress] = useState(0);
  const [current, setCurrent]   = useState("");
  const [applying, setApplying] = useState(false);
  const stopRef = useRef(false);

  async function startScrape() {
    setRunning(true);
    setResults([]);
    setChecked(new Set());
    setProgress(0);
    setCurrent("");
    stopRef.current = false;

    let frags = [];
    try {
      const res = await fetch(`${API}/fragrances?limit=500`);
      const data = await res.json();
      // Only check ones not already marked
      frags = (data.items || []).filter(f => !f.is_discontinued);
    } catch (e) {
      toast?.("Failed to load fragrances");
      setRunning(false);
      return;
    }

    const found = [];
    for (let i = 0; i < frags.length; i++) {
      if (stopRef.current) break;
      const f = frags[i];
      setCurrent(`${f.brand} ${f.name}`);
      setProgress(Math.round((i / frags.length) * 100));
      try {
        const res = await fetch(`${API}/fragrances/meta/discontinued_check/${f.id}`, { method: "POST" });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.overall !== "not_found") {
          found.push(data);
          setResults([...found]);
        }
      } catch (e) {}
    }
    setProgress(100);
    setCurrent("");
    setRunning(false);
    if (found.length === 0) toast?.("No discontinued fragrances found");
    else toast?.(`Found ${found.length} possible discontinued fragrances`);
  }

  async function applyMarked() {
    if (checked.size === 0) return;
    setApplying(true);
    let done = 0;
    for (const id of checked) {
      try {
        await fetch(`${API}/fragrances/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_discontinued: true }),
        });
        done++;
      } catch (e) {}
    }
    setChecked(new Set());
    setResults(prev => prev.filter(r => ![...checked].includes(r.id)));
    setApplying(false);
    toast?.(`Marked ${done} fragrance${done !== 1 ? "s" : ""} as discontinued`);
  }

  const toggleCheck = (id) => {
    setChecked(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const badgeLabel = { verified: "Verified", likely: "Likely", possible: "Possible", not_found: "Not Found" };

  return (
    <div>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
        {!running ? (
          <button className="btn btn-primary" onClick={startScrape}>
            ▶ Start Scan
          </button>
        ) : (
          <button className="btn btn-danger" onClick={() => stopRef.current = true}>
            ⏹ Stop
          </button>
        )}
        {checked.size > 0 && (
          <button className="btn btn-primary" onClick={applyMarked} disabled={applying}>
            {applying ? "Applying…" : `✓ Mark ${checked.size} as Discontinued`}
          </button>
        )}
        {results.length > 0 && !running && (
          <span style={{fontSize:12,color:"var(--text3)"}}>{results.length} found — check boxes to mark discontinued</span>
        )}
      </div>

      {(running || progress > 0 && progress < 100) && (
        <div>
          <div className="disc-progress-bar">
            <div className="disc-progress-fill" style={{width:`${progress}%`}} />
          </div>
          {current && <div className="disc-progress">⟳ {current}</div>}
        </div>
      )}

      {results.length > 0 && (
        <div style={{maxHeight:340,overflowY:"auto"}}>
          {results.map(r => (
            <div key={r.id} className="disc-result">
              <input type="checkbox" className="disc-check"
                checked={checked.has(r.id)}
                onChange={() => toggleCheck(r.id)} />
              <span className={`disc-badge ${r.overall}`}>{badgeLabel[r.overall]}</span>
              <div style={{flex:1,minWidth:0}}>
                <div className="disc-name">{r.brand} {r.name}</div>
                {r.findings.map((f,i) => (
                  <div key={i} className="disc-detail">{f.source}: {f.detail}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!running && results.length === 0 && progress === 0 && (
        <div style={{color:"var(--text3)",fontSize:13}}>
          Scans Fragella, Basenotes, and Parfumo for each non-discontinued fragrance. Shows results for review — nothing is marked automatically. Already-discontinued fragrances are skipped.
        </div>
      )}
    </div>
  );
}



// ── SECURITY PANEL ────────────────────────────────────────────
function SecurityPanel({ toast }) {
  const [settings, setSettings] = useState([]);
  const [saving, setSaving]     = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API}/security`)
      .then(r => r.json())
      .then(d => { setSettings(d.settings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = async (key, currentVal) => {
    const newVal = currentVal ? 0 : 1;
    setSaving(key);
    const token = sessionStorage.getItem("olfactori_token");
    try {
      await fetch(`${API}/security/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ public: newVal }),
      });
      setSettings(prev => prev.map(s => s.key === key ? { ...s, public: newVal } : s));
      toast(`${newVal ? "Public" : "Private"}`);
    } catch (e) {
      toast("Error saving setting");
    }
    setSaving(null);
  };

  const reset = async () => {
    if (!confirm("Reset all settings to private?")) return;
    const token = sessionStorage.getItem("olfactori_token");
    await fetch(`${API}/security/reset`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });
    setSettings(prev => prev.map(s => ({ ...s, public: 0 })));
    toast("All settings reset to private");
  };

  if (loading) return <div style={{color:"var(--text3)",fontSize:13}}>Loading...</div>;

  const groups = {};
  settings.forEach(s => {
    if (!groups[s.grp]) groups[s.grp] = [];
    groups[s.grp].push(s);
  });

  return (
    <div>
      <p style={{fontSize:13,color:"var(--text3)",marginBottom:16}}>
        Control what non-admin visitors can see. Admin always has full access.
        Edit controls, enrichment, and the Admin tab are always private regardless of these settings.
      </p>
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} style={{marginBottom:20}}>
          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",
            letterSpacing:"0.1em",marginBottom:10,fontWeight:600}}>{group}</div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {items.map(s => (
              <div key={s.key} style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"10px 14px",background:"var(--bg3)",borderRadius:8,
                border:"1px solid var(--border)",
              }}>
                <span style={{fontSize:13,color:"var(--text2)"}}>{s.label}</span>
                <button
                  onClick={() => toggle(s.key, s.public)}
                  disabled={saving === s.key}
                  style={{
                    width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",
                    background: s.public ? "var(--green)" : "var(--border2)",
                    position:"relative",transition:"background 0.2s",flexShrink:0,
                  }}
                  title={s.public ? "Public — click to make private" : "Private — click to make public"}
                >
                  <span style={{
                    position:"absolute",top:3,
                    left: s.public ? "calc(100% - 21px)" : "3px",
                    width:18,height:18,borderRadius:"50%",
                    background:"white",transition:"left 0.2s",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
                  }}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-danger btn-sm" onClick={reset} style={{marginTop:8}}>
        Reset All to Private
      </button>
    </div>
  );
}


// ── SHARE SETTINGS PANEL ──────────────────────────────────────
function SharePanel({ toast }) {
  const API = "https://olfactori-production.up.railway.app/api";
  const USERNAME = "adam";
  const [profile, setProfile] = useState({ display_name: "", bio: "", enabled: true, show_notes: true, show_concentration: true, show_size: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/share/${USERNAME}/profile`)
      .then(r => r.json())
      .then(d => { if (d.exists !== false) setProfile(p => ({...p, ...d})); })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/share/${USERNAME}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      toast("Share settings saved");
    } catch { toast("Error saving"); }
    finally { setSaving(false); }
  };

  const url = `https://www.olfactori.vip/share/${USERNAME}`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--bg3)",borderRadius:8,border:"1px solid var(--border)"}}>
        <span style={{fontSize:12,color:"var(--text3)",flex:1,wordBreak:"break-all"}}>{url}</span>
        <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px",flexShrink:0}}
          onClick={() => { navigator.clipboard.writeText(url); toast("Link copied!"); }}>
          Copy
        </button>
        <a href={url} target="_blank" rel="noreferrer"
          className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px",flexShrink:0,textDecoration:"none"}}>
          View
        </a>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <div style={{fontSize:11,color:"var(--text3)",marginBottom:5}}>Display Name</div>
          <input className="form-input" value={profile.display_name} placeholder="Your name"
            onChange={e => setProfile(p => ({...p, display_name: e.target.value}))} />
        </div>
        <div>
          <div style={{fontSize:11,color:"var(--text3)",marginBottom:5}}>Bio (optional)</div>
          <input className="form-input" value={profile.bio} placeholder="A short bio"
            onChange={e => setProfile(p => ({...p, bio: e.target.value}))} />
        </div>
      </div>

      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        {[
          ["enabled", "Public page on"],
          ["show_notes", "Show notes"],
          ["show_concentration", "Show concentration"],
          ["show_size", "Show size"],
        ].map(([key, label]) => (
          <label key={key} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:"var(--text2)"}}>
            <input type="checkbox" checked={!!profile[key]} onChange={e => setProfile(p => ({...p, [key]: e.target.checked}))}
              style={{accentColor:"var(--gold)",width:14,height:14}} />
            {label}
          </label>
        ))}
      </div>

      <button className="btn btn-primary" style={{alignSelf:"flex-start"}} onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}

// ── TRADE REQUESTS PANEL ─────────────────────────────────────
function TradeRequestsPanel({ toast }) {
  const API = "https://olfactori-production.up.railway.app/api";
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/trade-requests`)
      .then(r => r.json())
      .then(d => { setRequests(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const update = async (id, status) => {
    await fetch(`${API}/trade-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setRequests(rs => rs.map(r => r.id === id ? {...r, status} : r));
    toast(`Request ${status}`);
  };

  const remove = async (id) => {
    await fetch(`${API}/trade-requests/${id}`, { method: "DELETE" });
    setRequests(rs => rs.filter(r => r.id !== id));
    toast("Request deleted");
  };

  const STATUS_COLOR = { pending: "var(--gold)", accepted: "#4ade80", declined: "#f87171" };

  if (loading) return <div style={{color:"var(--text3)",fontSize:13}}>Loading…</div>;
  if (!requests.length) return <div style={{color:"var(--text3)",fontSize:13,padding:"20px 0",textAlign:"center"}}>No trade requests yet.</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {requests.map(r => (
        <div key={r.id} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
            <div>
              <div style={{fontSize:13,color:"var(--text)",fontWeight:500}}>{r.fragrance_brand} – {r.fragrance_name}</div>
              <div style={{fontSize:12,color:"var(--text3)",marginTop:2}}>{r.requester_name} · {r.requester_email} · {r.created_at}</div>
            </div>
            <span style={{fontSize:11,color:STATUS_COLOR[r.status]||"var(--text3)",background:"rgba(0,0,0,0.3)",padding:"2px 8px",borderRadius:4,flexShrink:0}}>
              {r.status}
            </span>
          </div>
          {r.offering && <div style={{fontSize:12,color:"var(--text2)",marginBottom:4}}>📦 Offering: {r.offering}</div>}
          {r.message  && <div style={{fontSize:12,color:"var(--text2)",marginBottom:8,fontStyle:"italic"}}>"{r.message}"</div>}
          <div style={{display:"flex",gap:6}}>
            {r.status !== "accepted"  && <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={() => update(r.id,"accepted")}>Accept</button>}
            {r.status !== "declined"  && <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={() => update(r.id,"declined")}>Decline</button>}
            {r.status === "pending"   && <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px"}} onClick={() => update(r.id,"pending")}>Reset</button>}
            <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 10px",marginLeft:"auto",color:"var(--text3)"}} onClick={() => remove(r.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── LOGIN HISTORY MODAL ───────────────────────────────────────
function LoginHistoryModal({ onClose }) {
  const API = "https://olfactori-production.up.railway.app/api";
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/auth/history`)
      .then(r => r.json())
      .then(d => { setHistory(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:520, maxHeight:"80vh", display:"flex", flexDirection:"column"}}>
        <div className="modal-header">
          <span className="modal-title">🔐 Login History</span>
          <button className="drawer-close" style={{position:"static"}} onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{overflowY:"auto", flex:1}}>
          {loading
            ? <div style={{color:"var(--text3)",fontSize:13}}>Loading…</div>
            : history.length === 0
              ? <div style={{color:"var(--text3)",fontSize:13,padding:"20px 0",textAlign:"center"}}>No logins recorded yet.</div>
              : <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid var(--border)"}}>
                      <th style={{textAlign:"left",padding:"8px 12px",color:"var(--text3)",fontWeight:400,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase"}}>Email</th>
                      <th style={{textAlign:"left",padding:"8px 12px",color:"var(--text3)",fontWeight:400,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase"}}>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r, i) => (
                      <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
                        <td style={{padding:"10px 12px",color:"var(--text)"}}>{r.email}</td>
                        <td style={{padding:"10px 12px",color:"var(--text2)",fontFamily:"monospace",fontSize:12}}>{r.logged_in_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          }
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


// ── R2 MIRROR PANEL ──────────────────────────────────────────
function MirrorPanel({ toast }) {
  const API = "https://olfactori-production.up.railway.app/api";
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const token = sessionStorage.getItem("olfactori_token");
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const loadStatus = async () => {
    try {
      const r = await fetch(`${API}/images/status`, { headers });
      setStatus(await r.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadStatus(); }, []);

  const runMirror = async () => {
    setRunning(true);
    toast("Mirroring images to R2… this may take a few minutes");
    try {
      const r = await fetch(`${API}/images/mirror-all`, { method: "POST", headers });
      const d = await r.json();
      toast(`Done — mirrored: ${d.mirrored}, failed: ${d.failed}`);
      await loadStatus();
    } catch (e) {
      toast("Mirror failed — check Railway logs");
    }
    setRunning(false);
  };

  if (!status) return <div style={{color:"var(--text3)",fontSize:13}}>Loading…</div>;

  const pct = status.has_source_image > 0
    ? Math.round((status.mirrored_to_r2 / status.has_source_image) * 100)
    : 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          ["Total Bottles", status.total],
          ["Have Image", status.has_source_image],
          ["Mirrored to R2", status.mirrored_to_r2],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{background:"var(--bg3)",borderRadius:8,padding:"12px 14px",border:"1px solid var(--border)"}}>
            <div style={{fontFamily:"var(--serif)",fontSize:28,color:"var(--gold)",fontWeight:300}}>{val}</div>
            <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>{lbl}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text3)",marginBottom:6}}>
          <span>Mirror progress</span>
          <span style={{color:"var(--text)"}}>{pct}%</span>
        </div>
        <div style={{height:6,background:"var(--bg3)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"var(--gold)",borderRadius:3,transition:"width 0.4s"}} />
        </div>
        {status.pending > 0 && (
          <div style={{fontSize:12,color:"var(--text3)",marginTop:6}}>{status.pending} images pending</div>
        )}
      </div>
      <button
        className="btn btn-primary"
        style={{alignSelf:"flex-start"}}
        onClick={runMirror}
        disabled={running || status.pending === 0}
      >
        {running ? "Mirroring…" : status.pending === 0 ? "✓ All Mirrored" : `Mirror ${status.pending} Images to R2`}
      </button>
    </div>
  );
}

export default function AdminTab({ toast }) {
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [invites,  setInvites]  = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [reqFilter, setReqFilter]   = useState("pending");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/friends/invites`).then(r=>r.json()).catch(()=>[]),
      fetch(`${API}/friends/requests`).then(r=>r.json()).catch(()=>[]),
    ]).then(([inv, req]) => {
      setInvites(inv);
      setRequests(req);
      setLoading(false);
    });
  }, []);

  const addInvite = (invite) => setInvites(prev => [invite, ...prev]);

  const revokeInvite = async (id) => {
    if (!window.confirm("Revoke this invite link?")) return;
    await fetch(`${API}/friends/invites/${id}`, { method: "DELETE" });
    setInvites(prev => prev.map(i => i.id === id ? {...i, is_active: 0} : i));
    toast("Invite revoked");
  };

  const copyInviteLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    toast("Link copied ✓");
  };

  const updateRequestStatus = async (id, status) => {
    const res = await fetch(`${API}/friends/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setRequests(prev => prev.map(r => r.id === id ? {...r, status} : r));
      toast(`Marked as ${status} ✓`);
    }
  };

  const filteredRequests = reqFilter === "all"
    ? requests
    : requests.filter(r => r.status === reqFilter);

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>;

  return (
    <>
      <style>{css}</style>
      <div className="admin-grid">

        {/* FRIEND INVITES */}
        <div className="admin-section">
          <div className="admin-section-header">
            <span className="admin-section-title">👥 Friends</span>
            <button className="btn btn-secondary" style={{fontSize:11,padding:"4px 12px"}} onClick={() => setShowLoginHistory(true)}>🔐 Login History</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
              + Invite
            </button>
          </div>
          <div className="admin-section-body">
            {invites.length === 0 ? (
              <div className="empty-section">
                No friends invited yet. Send an invite link to let friends browse your collection and request samples.
              </div>
            ) : (
              invites.map(inv => (
                <div key={inv.id} className="invite-item">
                  <div className="invite-avatar">{inv.name.charAt(0).toUpperCase()}</div>
                  <div className="invite-info">
                    <div className="invite-name">{inv.name}</div>
                    <div className="invite-meta">
                      {inv.email || "No email"} · {inv.last_seen ? `Last seen ${inv.last_seen.split("T")[0]}` : "Never visited"}
                    </div>
                  </div>
                  {inv.is_active
                    ? <>
                        <div className="invite-active" title="Active" />
                        <button className="invite-link" onClick={() => copyInviteLink(inv.token)}>
                          Copy Link
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => revokeInvite(inv.id)} title="Revoke">✕</button>
                      </>
                    : <div className="invite-inactive" title="Revoked" />
                  }
                </div>
              ))
            )}
          </div>
        </div>

        {/* SAMPLE REQUESTS */}
        <div className="admin-section">
          <div className="admin-section-header">
            <span className="admin-section-title">
              📬 Sample Requests
              {pendingCount > 0 && (
                <span style={{
                  background:"var(--red)", color:"white", borderRadius:10,
                  fontSize:11, padding:"1px 7px", fontFamily:"'DM Sans',sans-serif"
                }}>{pendingCount}</span>
              )}
            </span>
          </div>
          <div className="admin-section-body">
            <div className="filter-tabs">
              {["pending","sent","declined","all"].map(f => (
                <button key={f} className={`filter-tab ${reqFilter===f?"active":""}`}
                  onClick={() => setReqFilter(f)}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                  {f !== "all" && ` (${requests.filter(r=>r.status===f).length})`}
                </button>
              ))}
            </div>

            {filteredRequests.length === 0 ? (
              <div className="empty-section">
                No {reqFilter === "all" ? "" : reqFilter} requests.
              </div>
            ) : (
              filteredRequests.map(req => {
                const names = Array.isArray(req.fragrance_names)
                  ? req.fragrance_names
                  : (typeof req.fragrance_names === "string"
                      ? JSON.parse(req.fragrance_names || "[]")
                      : []);
                return (
                  <div key={req.id} className={`request-item ${req.status}`}>
                    <div className="request-header">
                      <span className="request-friend">{req.friend_name}</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span className="request-date">{req.created_at?.split("T")[0]}</span>
                        <span className={`status-badge ${req.status}`}>{req.status}</span>
                      </div>
                    </div>
                    <div className="request-frags">
                      {names.length > 0
                        ? names.join(", ")
                        : `${JSON.parse(req.fragrance_ids||"[]").length} fragrances`
                      }
                    </div>
                    {req.message && (
                      <div className="request-message">"{req.message}"</div>
                    )}
                    {req.status === "pending" && (
                      <div className="request-actions">
                        <button className="btn btn-primary btn-sm"
                          onClick={() => updateRequestStatus(req.id, "sent")}>
                          ✓ Mark Sent
                        </button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => updateRequestStatus(req.id, "declined")}>
                          Decline
                        </button>
                      </div>
                    )}
                    {req.status === "sent" && (
                      <div className="request-actions">
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => updateRequestStatus(req.id, "pending")}>
                          ↩ Reopen
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── BATCH ENRICH ── */}
        <div className="admin-section" style={{gridColumn:"1/-1"}}>
          <div className="admin-section-header">
            <span className="admin-section-title">🔬 Batch Enrich Missing Data</span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Fragella · Basenotes · Parfumo — skips images, skips locked</span>
          </div>
          <div className="admin-section-body">
            <BatchEnrich toast={toast} />
          </div>
        </div>

        {/* ── DB BACKUP ── */}
        <div className="admin-section">
          <div className="admin-section-header">
            <span className="admin-section-title">💾 Database Backup</span>
          </div>
          <div className="admin-section-body">
            <p style={{fontSize:13,color:"var(--text3)",marginBottom:14}}>
              Download a full backup of your Olfactori database. Keep this safe — it contains all your fragrances, wear logs, wishlists, and shelves.
            </p>
            <a
              href={`${API}/fragrances/meta/backup`}
              download="sillage_backup.db"
              className="btn btn-primary"
              style={{display:"inline-block",textDecoration:"none"}}
            >
              ⬇ Download sillage.db
            </a>
          </div>
        </div>

        {/* ── DISCONTINUED SCRAPE ── */}
        <div className="admin-section" style={{gridColumn:"1/-1"}}>
          <div className="admin-section-header">
            <span className="admin-section-title">🔍 Discontinued Scanner</span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Basenotes · Parfumo · Fragella — read only, you choose what to mark</span>
          </div>
          <div className="admin-section-body">
            <DiscontinuedScrape toast={toast} />
          </div>
        </div>

        {/* ── SHARE PAGE ── */}
        <div className="admin-section" style={{gridColumn:"1/-1"}}>
          <div className="admin-section-header">
            <span className="admin-section-title">🔗 Share Page</span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Public collection page settings</span>
          </div>
          <div className="admin-section-body">
            <SharePanel toast={toast} />
          </div>
        </div>

        {/* ── TRADE REQUESTS ── */}
        <div className="admin-section" style={{gridColumn:"1/-1"}}>
          <div className="admin-section-header">
            <span className="admin-section-title">🔄 Trade Requests</span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Incoming trade requests from your public page</span>
          </div>
          <div className="admin-section-body">
            <TradeRequestsPanel toast={toast} />
          </div>
        </div>

        {/* ── R2 IMAGE MIRROR ── */}
        <div className="admin-section" style={{gridColumn:"1/-1"}}>
          <div className="admin-section-header">
            <span className="admin-section-title">🗂️ Image Storage</span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Mirror fragrance images to Cloudflare R2</span>
          </div>
          <div className="admin-section-body">
            <MirrorPanel toast={toast} />
          </div>
        </div>

        {/* ── SECURITY ── */}
        <div className="admin-section" style={{gridColumn:"1/-1"}}>
          <div className="admin-section-header">
            <span className="admin-section-title">🔒 Access Control</span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Toggle what non-admin visitors can see</span>
          </div>
          <div className="admin-section-body">
            <SecurityPanel toast={toast} />
          </div>
        </div>

        {/* ── PREVIOUSLY SENT SAMPLES ── */}
        <div className="admin-section" style={{gridColumn:"1/-1"}}>
          <div className="admin-section-header">
            <span className="admin-section-title">📬 Previously-Sent Samples</span>
            <span style={{fontSize:12,color:"var(--text3)"}}>Track which samples you've already sent to friends</span>
          </div>
          <div className="admin-section-body">
            <SentSamplesSection token={sessionStorage.getItem("olfactori_token")} />
          </div>
        </div>

      </div>

      {showInvite && (
        <AddInviteModal
          onClose={() => setShowInvite(false)}
          onAdd={addInvite}
          toast={toast}
        />
      )}
      {showLoginHistory && (
        <LoginHistoryModal onClose={() => setShowLoginHistory(false)} />
      )}
    </>
  );
}
