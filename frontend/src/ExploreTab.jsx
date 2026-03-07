// ExploreTab.jsx — Explore tab with Spin the Bottle, Note Cloud, Scent Timeline
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .explore-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
  }
  .explore-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 24px;
  }
  .explore-card.wide { grid-column: 1 / -1; }
  .explore-card-title {
    font-size: 11px; color: var(--text3); letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
  }
  .explore-card-title span { font-size: 18px; }

  /* SPIN THE BOTTLE */
  .spin-center {
    display: flex; flex-direction: column; align-items: center;
    gap: 24px; padding: 8px 0;
  }
  .spin-bottle-wrap {
    position: relative; width: 120px; height: 120px;
    display: flex; align-items: center; justify-content: center;
  }
  .spin-bottle-icon {
    transition: transform 0.8s cubic-bezier(0.23,1,0.32,1);
    display: block;
  }
  .spin-bottle-icon.spinning {
    animation: spinBottle 0.8s cubic-bezier(0.23,1,0.32,1) forwards;
  }
  @keyframes spinBottle {
    0%   { transform: rotate(0deg) scale(1); }
    40%  { transform: rotate(200deg) scale(1.15); }
    100% { transform: rotate(360deg) scale(1); }
  }
  .spin-btn {
    background: var(--gold); color: #0c0c0f;
    border: none; border-radius: 10px;
    padding: 12px 32px; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em;
  }
  .spin-btn:hover { background: var(--gold2); transform: translateY(-1px); }
  .spin-btn:active { transform: translateY(0); }
  .spin-btn:disabled { opacity: 0.5; cursor: default; transform: none; }
  .spin-result {
    width: 100%; background: var(--bg3); border: 1px solid var(--border2);
    border-radius: var(--radius); padding: 16px 20px;
    animation: fadeSlideUp 0.4s ease;
    cursor: pointer; transition: border-color 0.15s;
  }
  .spin-result:hover { border-color: var(--gold); }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .spin-result-brand {
    font-size: 10px; color: var(--text3); text-transform: uppercase;
    letter-spacing: 0.1em; margin-bottom: 4px;
  }
  .spin-result-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px; font-weight: 300; color: var(--text);
    line-height: 1.2; margin-bottom: 8px;
  }
  .spin-result-meta {
    font-size: 12px; color: var(--text3);
    display: flex; gap: 12px; flex-wrap: wrap;
  }
  .spin-result-img {
    width: 64px; height: 64px; object-fit: contain;
    float: right; margin-left: 12px;
  }
  .spin-result-row {
    display: flex; align-items: flex-start; gap: 12px;
  }
  .spin-result-info { flex: 1; }
  .spin-tap-hint {
    font-size: 11px; color: var(--text3); margin-top: 8px;
    font-style: italic;
  }

  /* NOTE CLOUD */
  .note-cloud {
    display: flex; flex-wrap: wrap; gap: 8px;
    align-items: center; padding: 8px 0;
  }
  .note-cloud-tag {
    cursor: pointer; border-radius: 20px;
    border: 1px solid transparent;
    transition: all 0.15s; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
    line-height: 1;
  }
  .note-cloud-tag:hover {
    border-color: var(--gold);
    background: var(--gold-dim) !important;
    color: var(--gold) !important;
    transform: scale(1.05);
  }
  .note-cloud-tag.active {
    border-color: var(--gold);
    background: var(--gold-dim) !important;
    color: var(--gold) !important;
  }
  .note-cloud-hint {
    font-size: 12px; color: var(--text3); margin-top: 12px;
    font-style: italic;
  }

  /* TIMELINE */
  .timeline-wrap { overflow-x: auto; padding-bottom: 8px; }
  .timeline-track {
    display: flex; gap: 6px; min-width: max-content;
    align-items: flex-end; padding: 8px 0 16px;
  }
  .timeline-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .timeline-bar-wrap { display: flex; flex-direction: column; justify-content: flex-end; height: 100px; }
  .timeline-bar {
    width: 44px; background: var(--gold-dim);
    border: 1px solid rgba(201,168,76,0.3);
    border-radius: 4px 4px 0 0; min-height: 4px;
    transition: background 0.15s, transform 0.15s; cursor: default;
    position: relative;
  }
  .timeline-bar:hover { background: var(--gold); transform: scaleY(1.03); transform-origin: bottom; }
  .timeline-bar-tooltip {
    position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
    background: var(--bg3); border: 1px solid var(--border2);
    border-radius: 6px; padding: 4px 8px;
    font-size: 11px; color: var(--text2); white-space: nowrap;
    pointer-events: none; opacity: 0; transition: opacity 0.15s;
    margin-bottom: 4px;
  }
  .timeline-bar:hover .timeline-bar-tooltip { opacity: 1; }
  .timeline-label { font-size: 10px; color: var(--text3); }
  .timeline-cnt { font-size: 11px; color: var(--text2); }

  .explore-loading {
    display: flex; align-items: center; gap: 8px;
    color: var(--text3); font-size: 13px;
    padding: 60px 0; justify-content: center;
  }

  /* NEW RELEASE RADAR */
  .radar-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .radar-year-btn {
    padding: 4px 10px; border-radius: 6px; font-size: 11px;
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text3); cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }
  .radar-year-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
  .radar-count { font-size: 12px; color: var(--text3); margin-left: auto; }
  .radar-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  .radar-card {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    transition: all 0.2s;
  }
  .radar-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .radar-card-img {
    width: 100%; aspect-ratio: 1; background: var(--bg2);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .radar-card-img img { width: 70%; height: 70%; object-fit: contain; }
  .radar-card-img-placeholder { font-size: 28px; opacity: 0.15; }
  .radar-card-body { padding: 8px 10px; }
  .radar-card-brand { font-size: 9px; font-weight: 700; color: var(--gold); opacity: 0.8;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
  .radar-card-name { font-family: 'Cormorant Garamond', serif; font-size: 13px; color: var(--text);
    line-height: 1.2; overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .radar-card-year { font-size: 10px; color: var(--text3); margin-top: 3px; }
  .radar-card-link {
    display: block; font-size: 10px; color: var(--blue);
    padding: 0 10px 8px; text-decoration: none;
  }
  .radar-card-link:hover { text-decoration: underline; }
  .radar-owned-badge {
    font-size: 9px; background: var(--gold-dim); color: var(--gold);
    border: 1px solid rgba(201,168,76,0.3); border-radius: 4px;
    padding: 1px 5px; margin-top: 3px; display: inline-block;
  }
  .radar-empty { color: var(--text3); font-size: 13px; padding: 32px 0; text-align: center; }
`;

// ── PERFUME BOTTLE SVG ────────────────────────────────────────
function PerfumeBottle({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 120" width="90" height="120">
      {/* Pump stem */}
      <rect x="36" y="4" width="4" height="14" rx="2" fill="#c9a84c"/>
      {/* Pump head */}
      <rect x="26" y="2" width="24" height="6" rx="3" fill="#c9a84c"/>
      {/* Spray nozzle */}
      <rect x="50" y="3" width="10" height="3" rx="1.5" fill="#c9a84c"/>
      {/* Spray dots */}
      <circle cx="64" cy="3" r="1.2" fill="rgba(201,168,76,0.5)"/>
      <circle cx="68" cy="2" r="0.9" fill="rgba(201,168,76,0.35)"/>
      <circle cx="66" cy="6" r="0.8" fill="rgba(201,168,76,0.3)"/>
      {/* Neck */}
      <rect x="32" y="16" width="12" height="8" rx="2" fill="#c9a84c"/>
      {/* Shoulder */}
      <path d="M24 30 Q24 24 32 24 L44 24 Q52 24 52 30 Z" fill="#e8c96a"/>
      {/* Bottle body */}
      <rect x="18" y="30" width="40" height="68" rx="8" fill="#e8c96a"/>
      {/* Shine */}
      <rect x="22" y="35" width="8" height="40" rx="4" fill="rgba(255,255,255,0.18)"/>
      {/* Label */}
      <rect x="22" y="52" width="32" height="28" rx="4" fill="rgba(201,168,76,0.35)" stroke="rgba(201,168,76,0.5)" strokeWidth="0.5"/>
      {/* Label lines */}
      <rect x="26" y="59" width="22" height="2" rx="1" fill="rgba(12,12,15,0.4)"/>
      <rect x="28" y="64" width="18" height="1.5" rx="0.75" fill="rgba(12,12,15,0.3)"/>
      <rect x="30" y="69" width="14" height="1.5" rx="0.75" fill="rgba(12,12,15,0.25)"/>
      {/* Bottom highlight */}
      <rect x="22" y="90" width="32" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
    </svg>
  );
}
function NoteCloud({ onNoteClick }) {
  const [notes, setNotes] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/insights/dna`)
      .then(r => r.json())
      .then(d => {
        const all = (d.top_notes || []).slice(0, 60);
        setNotes(all);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{color:"var(--text3)",fontSize:13}}>Loading notes...</div>;

  const max = Math.max(...notes.map(n => n.cnt), 1);
  const min = Math.min(...notes.map(n => n.cnt), 1);

  const getSize = (cnt) => {
    const pct = (cnt - min) / (max - min || 1);
    return Math.round(10 + pct * 16); // 10px to 26px
  };

  const getOpacity = (cnt) => {
    const pct = (cnt - min) / (max - min || 1);
    return (0.45 + pct * 0.55).toFixed(2);
  };

  const handleClick = (note) => {
    setActive(note.note_name);
    onNoteClick(note.note_name);
  };

  // Shuffle so it looks more cloud-like
  const shuffled = [...notes].sort(() => Math.random() - 0.5);

  return (
    <>
      <div className="note-cloud">
        {shuffled.map(n => (
          <span
            key={n.note_name}
            className={`note-cloud-tag ${active === n.note_name ? "active" : ""}`}
            style={{
              fontSize: `${getSize(n.cnt)}px`,
              color: `rgba(232,224,213,${getOpacity(n.cnt)})`,
              background: "var(--bg3)",
              padding: `${4 + Math.round((getSize(n.cnt)-10)/4)}px ${8 + Math.round((getSize(n.cnt)-10)/3)}px`,
            }}
            onClick={() => handleClick(n)}
            title={`${n.note_name} — ${n.cnt} fragrances`}
          >
            {n.note_name}
          </span>
        ))}
      </div>
      <div className="note-cloud-hint">
        Click any note to filter your collection by it
      </div>
    </>
  );
}

// ── SCENT TIMELINE ─────────────────────────────────────────────
function ScentTimeline() {
  const [decades, setDecades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/insights/timeline`)
      .then(r => r.json())
      .then(d => {
        const map = {};
        (d.fragrances || []).forEach(f => {
          if (!f.year_released) return;
          const dec = Math.floor(f.year_released / 10) * 10;
          map[dec] = (map[dec] || 0) + 1;
        });
        const sorted = Object.entries(map)
          .sort(([a],[b]) => a - b)
          .map(([decade, cnt]) => ({ decade: parseInt(decade), cnt }));
        setDecades(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{color:"var(--text3)",fontSize:13}}>Loading timeline...</div>;
  if (!decades.length) return <div style={{color:"var(--text3)",fontSize:13}}>No year data available.</div>;

  const maxCnt = Math.max(...decades.map(d => d.cnt), 1);

  return (
    <div className="timeline-wrap">
      <div className="timeline-track">
        {decades.map(({ decade, cnt }) => (
          <div key={decade} className="timeline-col">
            <div className="timeline-cnt">{cnt}</div>
            <div className="timeline-bar-wrap">
              <div
                className="timeline-bar"
                style={{ height: `${Math.max(6, Math.round((cnt / maxCnt) * 92))}px` }}
              >
                <div className="timeline-bar-tooltip">{decade}s · {cnt} fragrance{cnt !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div className="timeline-label">{decade}s</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SPIN THE BOTTLE ────────────────────────────────────────────
function SpinTheBottle({ onOpenFrag }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult]     = useState(null);
  const [frags, setFrags]       = useState([]);

  useEffect(() => {
    fetch(`${API}/fragrances?limit=500`)
      .then(r => r.json())
      .then(d => setFrags(d.items || []))
      .catch(() => {});
  }, []);

  const spin = () => {
    if (spinning || !frags.length) return;
    setSpinning(true);
    setResult(null);

    setTimeout(() => {
      const pick = frags[Math.floor(Math.random() * frags.length)];
      setResult(pick);
      setSpinning(false);
    }, 850);
  };

  const imgSrc = result?.custom_image_url || result?.fragella_image_url || null;

  return (
    <div className="spin-center">
      <div className="spin-bottle-wrap">
        <PerfumeBottle
          className={`spin-bottle-icon ${spinning ? "spinning" : ""}`}
          key={spinning ? "spin" : "idle"}
        />
      </div>

      <button className="spin-btn" onClick={spin} disabled={spinning}>
        {spinning ? "Spinning..." : result ? "Spin Again" : "Spin the Bottle"}
      </button>

      {result && !spinning && (
        <div className="spin-result" onClick={() => onOpenFrag(result)}>
          <div className="spin-result-row">
            {imgSrc && (
              <img
                src={imgSrc}
                alt={result.name}
                className="spin-result-img"
                onError={e => { e.target.style.display = "none"; }}
              />
            )}
            <div className="spin-result-info">
              <div className="spin-result-brand">{result.brand}</div>
              <div className="spin-result-name">{result.name}</div>
              <div className="spin-result-meta">
                {result.concentration && <span>{result.concentration}</span>}
                {result.gender_class && <span>{result.gender_class}</span>}
                {result.size_raw && <span>{result.size_raw}</span>}
              </div>
            </div>
          </div>
          <div className="spin-tap-hint">Tap to open details →</div>
        </div>
      )}
    </div>
  );
}

// ── NEW RELEASE RADAR ─────────────────────────────────────────
const FRAGELLA_API = "https://api.fragella.com";
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

function NewReleaseRadar() {
  const [releases, setReleases]   = useState([]);
  const [owned, setOwned]         = useState(new Set()); // "brand||name" keys we own
  const [ownedBrands, setOwnedBrands] = useState(new Set());
  const [year, setYear]           = useState(CURRENT_YEAR);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Load collection brands once
  useEffect(() => {
    fetch(`${API}/fragrances?limit=500`)
      .then(r => r.json())
      .then(d => {
        const items = d.items || [];
        const brands = new Set(items.map(f => (f.brand || "").toLowerCase().trim()));
        const keys   = new Set(items.map(f =>
          `${(f.brand||"").toLowerCase().trim()}||${(f.name||"").toLowerCase().trim()}`
        ));
        setOwnedBrands(brands);
        setOwned(keys);
      })
      .catch(() => {});
  }, []);

  // Load releases from Fragella when year changes
  useEffect(() => {
    if (ownedBrands.size === 0) return;
    setLoading(true);
    setError(null);

    fetch(`${FRAGELLA_API}/fragrances?year=${year}&limit=200`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => {
        const items = Array.isArray(d) ? d : d.items || d.fragrances || d.data || [];
        // Filter to brands we own
        const filtered = items.filter(f => {
          const brand = (f.Brand || f.brand || "").toLowerCase().trim();
          return ownedBrands.has(brand);
        });
        setReleases(filtered);
        setLoading(false);
      })
      .catch(err => {
        setError("Could not load releases from Fragella.");
        setLoading(false);
      });
  }, [year, ownedBrands]);

  const getKey = (f) =>
    `${(f.Brand||f.brand||"").toLowerCase().trim()}||${(f.Name||f.name||"").toLowerCase().trim()}`;

  const filtered = releases;

  return (
    <div>
      <div className="radar-toolbar">
        {YEARS.map(y => (
          <button key={y} className={`radar-year-btn ${year===y?"active":""}`}
            onClick={() => setYear(y)}>{y}</button>
        ))}
        {!loading && !error && (
          <span className="radar-count">
            {filtered.length} release{filtered.length !== 1 ? "s" : ""} from brands you own
          </span>
        )}
      </div>

      {loading ? (
        <div className="radar-empty">Loading releases…</div>
      ) : error ? (
        <div className="radar-empty">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="radar-empty">No new releases found from your brands for {year}.</div>
      ) : (
        <div className="radar-grid">
          {filtered.map((f, i) => {
            const brand  = f.Brand  || f.brand  || "";
            const name   = f.Name   || f.name   || "";
            const img    = f["Image URL"] || f.image_url || f.ImageUrl || null;
            const url    = f["Fragrantica URL"] || f.fragrantica_url || null;
            const yr     = f["Year Released"] || f.year_released || f.year || year;
            const isOwned = owned.has(getKey(f));
            return (
              <div key={i} className="radar-card">
                <div className="radar-card-img">
                  {img
                    ? <img src={img} alt={name} onError={e => e.target.style.display="none"} />
                    : <span className="radar-card-img-placeholder">🆕</span>
                  }
                </div>
                <div className="radar-card-body">
                  <div className="radar-card-brand">{brand}</div>
                  <div className="radar-card-name">{name}</div>
                  <div className="radar-card-year">{yr}</div>
                  {isOwned && <span className="radar-owned-badge">✓ In Collection</span>}
                </div>
                {url && (
                  <a className="radar-card-link" href={url} target="_blank" rel="noreferrer">
                    View on Fragrantica ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPLORE TAB ───────────────────────────────────────────
export default function ExploreTab({ onNoteFilter, onOpenFrag }) {
  return (
    <>
      <style>{css}</style>
      <div className="explore-grid">

        {/* SPIN THE BOTTLE */}
        <div className="explore-card">
          <div className="explore-card-title">
            <span>🧴</span> Spin the Bottle
          </div>
          <SpinTheBottle onOpenFrag={onOpenFrag} />
        </div>

        {/* NOTE CLOUD */}
        <div className="explore-card" style={{gridColumn: "span 2"}}>
          <div className="explore-card-title">
            <span>🌿</span> Note Cloud
          </div>
          <NoteCloud onNoteClick={onNoteFilter} />
        </div>

        {/* SCENT TIMELINE */}
        <div className="explore-card wide">
          <div className="explore-card-title">
            <span>📅</span> Scent Timeline
          </div>
          <ScentTimeline />
        </div>

        {/* NEW RELEASE RADAR */}
        <div className="explore-card wide">
          <div className="explore-card-title">
            <span>📡</span> New Release Radar
          </div>
          <NewReleaseRadar />
        </div>

      </div>
    </>
  );
}
