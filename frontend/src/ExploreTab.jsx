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
    background: var(--gold); color: var(--bg);
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
    font-family: var(--serif);
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
    font-family: var(--sans);
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

  const imgSrc = result?.r2_image_url || result?.custom_image_url || result?.fragella_image_url || null;

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

      </div>
    </>
  );
}
