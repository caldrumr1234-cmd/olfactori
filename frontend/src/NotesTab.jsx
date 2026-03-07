// NotesTab.jsx — drop into frontend/src/
import { useState, useEffect, useMemo } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .notes-tab { display: flex; gap: 24px; height: calc(100vh - 120px); min-height: 0; }

  /* LEFT: cloud panel */
  .notes-panel {
    width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;
  }
  .notes-search-wrap {
    position: relative;
  }
  .notes-search-input {
    width: 100%; box-sizing: border-box;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    padding: 8px 12px; font-size: 13px; font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.15s;
  }
  .notes-search-input:focus { border-color: var(--gold); }
  .notes-tier-tabs { display: flex; gap: 6px; }
  .notes-tier-btn {
    flex: 1; padding: 5px 0; font-size: 11px; font-family: 'DM Sans', sans-serif;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text3); cursor: pointer;
    transition: all 0.15s; text-align: center;
  }
  .notes-tier-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
  .notes-cloud-wrap {
    flex: 1; overflow-y: auto; background: var(--bg2);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px; display: flex; flex-wrap: wrap;
    gap: 8px; align-content: flex-start;
  }
  .note-cloud-pill {
    padding: 4px 10px; border-radius: 20px;
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text2); cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.15s; white-space: nowrap; line-height: 1;
  }
  .note-cloud-pill:hover { border-color: var(--gold); color: var(--gold); }
  .note-cloud-pill.active { background: var(--gold-dim); border-color: var(--gold); color: var(--gold); }
  .note-count {
    font-size: 10px; opacity: 0.6; margin-left: 4px;
  }

  /* RIGHT: results panel */
  .notes-results {
    flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px;
  }
  .notes-results-header {
    display: flex; align-items: baseline; gap: 10px; flex-shrink: 0;
  }
  .notes-results-title {
    font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: var(--text);
  }
  .notes-results-subtitle {
    font-size: 12px; color: var(--text3);
  }
  .notes-results-tier { font-size: 11px; color: var(--text3); }
  .notes-results-grid {
    flex: 1; overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px; align-content: flex-start;
  }
  .notes-frag-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    cursor: pointer; transition: all 0.2s;
  }
  .notes-frag-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .notes-frag-img {
    width: 100%; aspect-ratio: 1; background: var(--bg3);
    display: flex; align-items: center; justify-content: center;
  }
  .notes-frag-img img { width: 70%; height: 70%; object-fit: contain; }
  .notes-frag-img-placeholder { font-size: 28px; opacity: 0.2; }
  .notes-frag-body { padding: 8px 10px; }
  .notes-frag-brand { font-size: 9px; font-weight: 700; color: var(--gold); opacity: 0.8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
  .notes-frag-name { font-family: 'Cormorant Garamond', serif; font-size: 14px; color: var(--text); line-height: 1.2;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .notes-frag-tier { font-size: 9px; color: var(--text3); margin-top: 3px; }

  .notes-empty {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; color: var(--text3); gap: 10px;
  }

  @media (max-width: 700px) {
    .notes-tab { flex-direction: column; height: auto; }
    .notes-panel { width: 100%; }
    .notes-cloud-wrap { max-height: 220px; }
  }
`;

function imgSrc(frag) {
  return frag.custom_image_url || frag.fragella_image_url || null;
}

const TIERS = ["All", "Top", "Heart", "Base"];

function parseArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
}

export default function NotesTab({ onOpenFrag }) {
  const [frags, setFrags]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tier, setTier]           = useState("All");
  const [noteSearch, setNoteSearch] = useState("");
  const [activeNote, setActiveNote] = useState(null);

  useEffect(() => {
    // Fetch all fragrances (no pagination limit) for note aggregation
    fetch(`${API}/fragrances?limit=2000`)
      .then(r => r.json())
      .then(d => { setFrags(Array.isArray(d) ? d : d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build note → [{frag, tiers:[]}] map
  const noteMap = useMemo(() => {
    const map = new Map(); // note → [{frag, tiers}]
    frags.forEach(frag => {
      const entries = [
        { tier: "Top",   notes: parseArr(frag.top_notes) },
        { tier: "Heart", notes: parseArr(frag.middle_notes) },
        { tier: "Base",  notes: parseArr(frag.base_notes) },
      ];
      entries.forEach(({ tier: t, notes }) => {
        notes.forEach(note => {
          const key = note.toLowerCase().trim();
          if (!key) return;
          if (!map.has(key)) map.set(key, { display: note, frags: [] });
          const entry = map.get(key);
          const existing = entry.frags.find(e => e.frag.id === frag.id);
          if (existing) { existing.tiers.push(t); }
          else { entry.frags.push({ frag, tiers: [t] }); }
        });
      });
    });
    return map;
  }, [frags]);

  // Filtered note list based on tier and search
  const noteList = useMemo(() => {
    let entries = [...noteMap.entries()].map(([key, val]) => ({
      key, display: val.display, count: val.frags.length,
      frags: val.frags,
    }));

    if (tier !== "All") {
      entries = entries
        .map(e => ({
          ...e,
          frags: e.frags.filter(f => f.tiers.includes(tier)),
        }))
        .filter(e => e.frags.length > 0)
        .map(e => ({ ...e, count: e.frags.length }));
    }

    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase();
      entries = entries.filter(e => e.key.includes(q));
    }

    return entries.sort((a, b) => b.count - a.count);
  }, [noteMap, tier, noteSearch]);

  // Results for selected note
  const results = useMemo(() => {
    if (!activeNote) return [];
    const entry = noteMap.get(activeNote);
    if (!entry) return [];
    if (tier === "All") return entry.frags;
    return entry.frags.filter(f => f.tiers.includes(tier));
  }, [activeNote, noteMap, tier]);

  // Font size scaling for cloud
  const maxCount = noteList.length ? Math.max(...noteList.map(n => n.count)) : 1;
  const fontSize = (count) => {
    const ratio = count / maxCount;
    return 10 + Math.round(ratio * 8); // 10px–18px
  };

  if (loading) return <div className="loading"><div className="spinner" /> Loading notes...</div>;

  return (
    <>
      <style>{css}</style>
      <div className="notes-tab">

        {/* LEFT: note cloud */}
        <div className="notes-panel">
          <input
            className="notes-search-input"
            placeholder="Search notes…"
            value={noteSearch}
            onChange={e => setNoteSearch(e.target.value)}
          />
          <div className="notes-tier-tabs">
            {TIERS.map(t => (
              <button key={t} className={`notes-tier-btn ${tier===t?"active":""}`}
                onClick={() => { setTier(t); setActiveNote(null); }}>
                {t}
              </button>
            ))}
          </div>
          <div className="notes-cloud-wrap">
            {noteList.length === 0
              ? <span style={{color:"var(--text3)",fontSize:13}}>No notes found</span>
              : noteList.map(n => (
                <span
                  key={n.key}
                  className={`note-cloud-pill ${activeNote===n.key?"active":""}`}
                  style={{ fontSize: fontSize(n.count) }}
                  onClick={() => setActiveNote(activeNote===n.key ? null : n.key)}
                >
                  {n.display}<span className="note-count">{n.count}</span>
                </span>
              ))
            }
          </div>
        </div>

        {/* RIGHT: results */}
        <div className="notes-results">
          {activeNote ? (
            <>
              <div className="notes-results-header">
                <span className="notes-results-title">{noteMap.get(activeNote)?.display}</span>
                <span className="notes-results-subtitle">
                  {results.length} fragrance{results.length !== 1 ? "s" : ""}
                  {tier !== "All" && <> · <span className="notes-results-tier">{tier} note</span></>}
                </span>
              </div>
              <div className="notes-results-grid">
                {results.map(({ frag, tiers }) => {
                  const img = imgSrc(frag);
                  return (
                    <div key={frag.id} className="notes-frag-card" onClick={() => onOpenFrag?.(frag)}>
                      <div className="notes-frag-img">
                        {img
                          ? <img src={img} alt={frag.name} onError={e => e.target.style.display="none"} />
                          : <span className="notes-frag-img-placeholder">🧴</span>
                        }
                      </div>
                      <div className="notes-frag-body">
                        <div className="notes-frag-brand">{frag.brand}</div>
                        <div className="notes-frag-name">{frag.name}</div>
                        <div className="notes-frag-tier">{tiers.join(" · ")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="notes-empty">
              <span style={{fontSize:48,opacity:0.2}}>🌿</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text2)"}}>
                Select a note
              </span>
              <span style={{fontSize:13,maxWidth:280,textAlign:"center",lineHeight:1.5}}>
                {noteList.length > 0
                  ? `${noteList.length} notes across your collection — click any to explore`
                  : "No notes in your collection yet"}
              </span>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
