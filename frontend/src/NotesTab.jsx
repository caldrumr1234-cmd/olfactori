// NotesTab.jsx — drop into frontend/src/
import { useState, useEffect, useMemo } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .notes-tab { display: flex; gap: 24px; align-items: flex-start; }

  .notes-panel {
    width: 340px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;
    position: sticky; top: 0;
  }
  .notes-search-input {
    width: 100%; box-sizing: border-box;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text);
    padding: 8px 12px; font-size: 13px; font-family: var(--sans);
    outline: none; transition: border-color 0.15s;
  }
  .notes-search-input:focus { border-color: var(--gold); }
  .notes-tier-tabs { display: flex; gap: 6px; }
  .notes-tier-btn {
    flex: 1; padding: 5px 0; font-size: 11px; font-family: var(--sans);
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text3); cursor: pointer;
    transition: all 0.15s; text-align: center;
  }
  .notes-tier-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
  .notes-cloud-wrap {
    max-height: calc(100vh - 160px); overflow-y: auto; background: var(--bg2);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px; display: flex; flex-wrap: wrap;
    gap: 8px; align-content: flex-start;
  }
  .note-cloud-pill {
    padding: 4px 10px; border-radius: 20px;
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text2); cursor: pointer; font-family: var(--sans);
    transition: all 0.15s; white-space: nowrap; line-height: 1; user-select: none;
  }
  .note-cloud-pill:hover { border-color: var(--gold); color: var(--gold); }
  .note-cloud-pill.active { background: var(--gold-dim); border-color: var(--gold); color: var(--gold); }
  .note-count { font-size: 10px; opacity: 0.6; margin-left: 4px; }
  .notes-clear-btn {
    font-size: 11px; color: var(--text3); background: none; border: none;
    cursor: pointer; padding: 0; font-family: var(--sans);
    transition: color 0.15s;
  }
  .notes-clear-btn:hover { color: var(--gold); }

  .notes-results {
    flex: 1; min-width: 0;
  }
  .notes-results-header {
    display: flex; align-items: baseline; gap: 10px; flex-shrink: 0; flex-wrap: wrap;
  }
  .notes-results-title {
    font-family: var(--serif); font-size: 24px; font-weight: 300; color: var(--text);
    line-height: 1.2;
  }
  .notes-active-pills { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .notes-active-pill {
    padding: 3px 8px; border-radius: 20px;
    background: var(--gold-dim); border: 1px solid var(--gold);
    color: var(--gold); font-size: 12px; font-family: var(--sans);
    display: flex; align-items: center; gap: 5px;
  }
  .notes-active-pill-x { cursor: pointer; opacity: 0.7; font-size: 10px; }
  .notes-active-pill-x:hover { opacity: 1; }
  .notes-results-subtitle { font-size: 12px; color: var(--text3); }
  .notes-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 12px; margin-top: 14px;
  }
  .notes-frag-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    cursor: pointer; transition: all 0.2s;
  }
  .notes-frag-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .notes-frag-img {
    width: 100%; aspect-ratio: 1; background: var(--bg3);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .notes-frag-img img { width: 70%; height: 70%; object-fit: contain; }
  .notes-frag-img-placeholder { font-size: 28px; opacity: 0.2; }
  .notes-frag-body { padding: 8px 10px; }
  .notes-frag-brand { font-size: 9px; font-weight: 700; color: var(--gold); opacity: 0.8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
  .notes-frag-name { font-family: var(--serif); font-size: 14px; color: var(--text); line-height: 1.2;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .notes-frag-tier { font-size: 9px; color: var(--text3); margin-top: 3px; }

  .notes-empty {
    display: flex; flex-direction: column; align-items: center;
    padding: 80px 24px; color: var(--text3); gap: 10px;
  }

  @media (max-width: 700px) {
    .notes-tab { flex-direction: column; }
    .notes-panel { width: 100%; }
    .notes-cloud-wrap { max-height: 220px; }
  }
`;

function imgSrc(frag) {
  return frag.r2_image_url || frag.custom_image_url || frag.fragella_image_url || null;
}

const TIERS = ["All", "Top", "Heart", "Base"];

function parseArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
}

export default function NotesTab({ onOpenFrag, initialNote }) {
  const [frags, setFrags]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tier, setTier]             = useState("All");
  const [noteSearch, setNoteSearch] = useState("");
  const [activeNotes, setActiveNotes] = useState(new Set()); // multi-select

  // Jump to a note passed in from Explore tab
  useEffect(() => {
    if (!initialNote) return;
    setActiveNotes(new Set([initialNote.toLowerCase()]));
  }, [initialNote]);

  useEffect(() => {
    // Fetch full collection — API returns { items: [] }
    fetch(`${API}/fragrances?limit=500`)
      .then(r => r.json())
      .then(d => {
        const list = d.items || (Array.isArray(d) ? d : []);
        setFrags(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // note key → { display, frags: [{frag, tiers}] }
  const noteMap = useMemo(() => {
    const map = new Map();
    frags.forEach(frag => {
      const entries = [
        { t: "Top",   notes: parseArr(frag.top_notes) },
        { t: "Heart", notes: parseArr(frag.middle_notes) },
        { t: "Base",  notes: parseArr(frag.base_notes) },
      ];
      entries.forEach(({ t, notes }) => {
        notes.forEach(note => {
          if (!note) return;
          const key = note.toLowerCase().trim();
          if (!map.has(key)) map.set(key, { display: note, frags: [] });
          const entry = map.get(key);
          const existing = entry.frags.find(e => e.frag.id === frag.id);
          if (existing) existing.tiers.push(t);
          else entry.frags.push({ frag, tiers: [t] });
        });
      });
    });
    return map;
  }, [frags]);

  // Pill list filtered by tier + search
  const noteList = useMemo(() => {
    let entries = [...noteMap.entries()].map(([key, val]) => {
      const fragsInTier = tier === "All"
        ? val.frags
        : val.frags.filter(f => f.tiers.includes(tier));
      return { key, display: val.display, count: fragsInTier.length };
    }).filter(e => e.count > 0);

    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase();
      entries = entries.filter(e => e.key.includes(q));
    }

    return entries.sort((a, b) => b.count - a.count);
  }, [noteMap, tier, noteSearch]);

  // Results: fragrances containing ALL selected notes in the chosen tier
  const results = useMemo(() => {
    if (activeNotes.size === 0) return [];

    const selectedKeys = [...activeNotes];

    // For each selected note, get frag IDs that qualify
    const fragSets = selectedKeys.map(key => {
      const entry = noteMap.get(key);
      if (!entry) return new Set();
      const qualifying = tier === "All"
        ? entry.frags
        : entry.frags.filter(f => f.tiers.includes(tier));
      return new Set(qualifying.map(f => f.frag.id));
    });

    // Intersection: frag must appear in ALL note sets
    const intersection = fragSets.reduce((acc, set) =>
      new Set([...acc].filter(id => set.has(id)))
    );

    // Build result list with tier info for each selected note
    return frags
      .filter(frag => intersection.has(frag.id))
      .map(frag => {
        const tierLabels = selectedKeys.flatMap(key => {
          const entry = noteMap.get(key);
          const match = entry?.frags.find(f => f.frag.id === frag.id);
          return match ? match.tiers : [];
        });
        const uniqueTiers = [...new Set(tierLabels)];
        return { frag, tiers: uniqueTiers };
      });
  }, [activeNotes, noteMap, tier, frags]);

  const toggleNote = (key) => {
    setActiveNotes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const maxCount = noteList.length ? Math.max(...noteList.map(n => n.count)) : 1;
  const fontSize = (count) => 10 + Math.round((count / maxCount) * 8);

  if (loading) return <div className="loading"><div className="spinner" /> Loading notes...</div>;

  const activeNoteDisplays = [...activeNotes].map(k => noteMap.get(k)?.display).filter(Boolean);

  return (
    <>
      <style>{css}</style>
      <div className="notes-tab">

        {/* LEFT */}
        <div className="notes-panel">
          <input className="notes-search-input" placeholder="Search notes…"
            value={noteSearch} onChange={e => setNoteSearch(e.target.value)} />
          <div className="notes-tier-tabs">
            {TIERS.map(t => (
              <button key={t} className={`notes-tier-btn ${tier===t?"active":""}`}
                onClick={() => { setTier(t); setActiveNotes(new Set()); }}>
                {t}
              </button>
            ))}
          </div>
          <div className="notes-cloud-wrap">
            {noteList.length === 0
              ? <span style={{color:"var(--text3)",fontSize:13}}>No notes found</span>
              : noteList.map(n => (
                <span key={n.key}
                  className={`note-cloud-pill ${activeNotes.has(n.key)?"active":""}`}
                  style={{ fontSize: fontSize(n.count) }}
                  onClick={() => toggleNote(n.key)}
                >
                  {n.display}<span className="note-count">{n.count}</span>
                </span>
              ))
            }
          </div>
        </div>

        {/* RIGHT */}
        <div className="notes-results">
          {activeNotes.size > 0 ? (
            <>
              <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
                <div className="notes-active-pills">
                  {activeNoteDisplays.map(d => (
                    <span key={d} className="notes-active-pill">
                      {d}
                      <span className="notes-active-pill-x"
                        onClick={() => toggleNote(d.toLowerCase().trim())}>✕</span>
                    </span>
                  ))}
                  {activeNotes.size > 1 && (
                    <button className="notes-clear-btn" onClick={() => setActiveNotes(new Set())}>
                      Clear all
                    </button>
                  )}
                </div>
                <span className="notes-results-subtitle">
                  {results.length} fragrance{results.length !== 1 ? "s" : ""}
                  {activeNotes.size > 1 && " containing all selected notes"}
                  {tier !== "All" && ` · ${tier} notes only`}
                </span>
              </div>
              {results.length > 0 ? (
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
              ) : (
                <div className="notes-empty">
                  <span style={{fontSize:32,opacity:0.2}}>🔍</span>
                  <span style={{fontSize:14,color:"var(--text2)"}}>No fragrances contain all selected notes</span>
                </div>
              )}
            </>
          ) : (
            <div className="notes-empty">
              <span style={{fontSize:48,opacity:0.2}}>🌿</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text2)"}}>
                Select a note
              </span>
              <span style={{fontSize:13,maxWidth:300,textAlign:"center",lineHeight:1.5,color:"var(--text3)"}}>
                {noteList.length > 0
                  ? `${noteList.length} notes across your collection — click any to explore, select multiple to find overlap`
                  : "No notes in your collection yet"}
              </span>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
