// InsightsTab.jsx — drop into frontend/src/
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .ins-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
  .ins-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px;
  }
  .ins-card-title {
    font-size: 11px; color: var(--text3); letter-spacing: 0.1em;
    text-transform: uppercase; margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .ins-card-title span { font-size: 16px; }
  .ins-stat-row {
    display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
  }
  .ins-stat-label { font-size: 13px; color: var(--text2); flex: 1; min-width: 0;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ins-bar-bg { width: 100px; height: 6px; background: var(--bg3);
                border-radius: 3px; overflow: hidden; flex-shrink: 0; }
  .ins-bar-fill { height: 100%; background: var(--gold); border-radius: 3px; transition: width 0.6s ease; }
  .ins-bar-val { font-size: 12px; color: var(--text3); width: 24px; text-align: right; flex-shrink: 0; }
  .ins-big-num { font-family: 'Cormorant Garamond', serif; font-size: 48px;
                 font-weight: 300; color: var(--gold); line-height: 1; }
  .ins-big-label { font-size: 12px; color: var(--text3); margin-top: 4px; }
  .ins-hero-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
  .ins-hero-item { background: var(--bg3); border-radius: 8px; padding: 14px; text-align: center; }
  .ins-hero-num { font-family: 'Cormorant Garamond', serif; font-size: 32px;
                  color: var(--gold); font-weight: 300; }
  .ins-hero-lbl { font-size: 10px; color: var(--text3); text-transform: uppercase;
                  letter-spacing: 0.08em; margin-top: 2px; }
  .gap-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 0; border-bottom: 1px solid var(--border);
  }
  .gap-item:last-child { border-bottom: none; }
  .gap-name { font-size: 13px; color: var(--text2); text-transform: capitalize; }
  .gap-zero { font-size: 11px; color: var(--red); background: rgba(224,85,85,0.1);
              padding: 2px 7px; border-radius: 10px; }
  .gap-few { font-size: 11px; color: var(--gold); background: var(--gold-dim);
             padding: 2px 7px; border-radius: 10px; }
  .season-row { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
  .season-item { background: var(--bg3); border-radius: 8px; padding: 12px; }
  .season-name { font-size: 11px; color: var(--text3); text-transform: uppercase;
                 letter-spacing: 0.08em; margin-bottom: 6px; }
  .season-bar-bg { height: 8px; background: var(--bg2); border-radius: 4px; overflow: hidden; }
  .season-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
  .season-pct { font-size: 20px; font-family: 'Cormorant Garamond', serif;
                color: var(--text); font-weight: 300; margin-top: 6px; }
  .timeline-wrap { overflow-x: auto; padding-bottom: 8px; }
  .timeline-track { display: flex; gap: 4px; min-width: max-content; align-items: flex-end; padding: 8px 0; }
  .timeline-decade { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .timeline-bar-wrap { display: flex; flex-direction: column; justify-content: flex-end; height: 80px; }
  .timeline-bar {
    width: 40px; background: var(--gold-dim); border: 1px solid rgba(201,168,76,0.3);
    border-radius: 4px 4px 0 0; min-height: 4px;
    transition: background 0.15s; cursor: default;
  }
  .timeline-bar:hover { background: var(--gold); }
  .timeline-label { font-size: 10px; color: var(--text3); }
  .timeline-cnt { font-size: 11px; color: var(--text2); }
  .redundant-group { margin-bottom: 14px; }
  .redundant-accords { font-size: 11px; color: var(--gold); margin-bottom: 6px;
                       text-transform: capitalize; }
  .redundant-frags { display: flex; flex-direction: column; gap: 4px; }
  .redundant-frag { font-size: 12px; color: var(--text2); padding: 4px 8px;
                    background: var(--bg3); border-radius: 6px; }
  .ins-loading { display: flex; align-items: center; gap: 8px; color: var(--text3);
                 font-size: 13px; padding: 40px 0; justify-content: center; }
`;

const SEASON_COLORS = {
  Spring: "#7bc67e",
  Summer: "#f0c040",
  Fall:   "#e08050",
  Winter: "#6ab0d4",
};

function BarRow({ label, value, max, color }) {
  return (
    <div className="ins-stat-row">
      <span className="ins-stat-label">{label}</span>
      <div className="ins-bar-bg">
        <div className="ins-bar-fill" style={{ width: `${Math.round((value/max)*100)}%`, background: color || "var(--gold)" }} />
      </div>
      <span className="ins-bar-val">{value}</span>
    </div>
  );
}

export default function InsightsTab() {
  const [dna,        setDna]        = useState(null);
  const [seasons,    setSeasons]    = useState(null);
  const [stats,      setStats]      = useState(null);

  useEffect(() => {
    const safe = (url) => fetch(url)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); })
      .catch(e => { console.error(e); return null; });
    Promise.all([
      safe(`${API}/insights/dna`),
      safe(`${API}/insights/seasonal_balance`),
      safe(`${API}/insights/stats`),
    ]).then(([d,s,st]) => {
      setDna(d || {}); setSeasons(s || {}); setStats(st || {});
    });
  }, []);

  if (!dna && !stats) return (
    <div className="ins-loading">
      <div className="spinner" /> Loading insights...
    </div>
  );

  const maxAccord = Math.max(...(dna.top_accords||[]).map(a=>a.cnt), 1);
  const maxBrand  = Math.max(...(dna.top_brands||[]).map(b=>b.cnt), 1);
  const maxNote   = Math.max(...(dna.top_notes||[]).map(n=>n.cnt), 1);

  return (
    <>
      <style>{css}</style>

      {/* HERO STATS */}
      <div className="ins-hero-grid" style={{marginBottom:24}}>
        {[
          [stats?.total,        "Bottles"],
          [stats?.brands,       "Houses"],
          [dna?.top_accords?.[0]?.note_name || "—", "Top Accord"],
        ].map(([val, lbl], i) => (
          <div key={i} className="ins-hero-item">
            <div className="ins-hero-num">{val ?? "—"}</div>
            <div className="ins-hero-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      <div className="ins-grid">

        {/* TOP ACCORDS */}
        <div className="ins-card">
          <div className="ins-card-title"><span>🎯</span> Signature Accords</div>
          {(dna.top_accords || []).map(a => (
            <BarRow key={a.note_name} label={a.note_name} value={a.cnt} max={maxAccord} />
          ))}
        </div>

        {/* TOP HOUSES */}
        <div className="ins-card">
          <div className="ins-card-title"><span>🏛️</span> Favourite Houses</div>
          {(dna.top_brands || []).map(b => (
            <BarRow key={b.brand} label={b.brand} value={b.cnt} max={maxBrand} color="var(--blue)" />
          ))}
        </div>

        {/* TOP NOTES */}
        <div className="ins-card">
          <div className="ins-card-title"><span>🌿</span> Most Common Notes</div>
          {(dna.top_notes || []).slice(0, 10).map(n => (
            <BarRow key={n.note_name} label={n.note_name} value={n.cnt} max={maxNote} color="var(--green)" />
          ))}
        </div>

        {/* SEASONAL BALANCE */}
        <div className="ins-card">
          <div className="ins-card-title"><span>🌤️</span> Seasonal Balance</div>
          <div className="season-row">
            {Object.entries(seasons?.seasons || {}).map(([s, data]) => (
              <div key={s} className="season-item">
                <div className="season-name">{s}</div>
                <div className="season-bar-bg">
                  <div className="season-bar-fill"
                    style={{ width: `${data.pct}%`, background: SEASON_COLORS[s] || "var(--gold)" }} />
                </div>
                <div className="season-pct">{data.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* CONCENTRATION SPLIT */}
        <div className="ins-card">
          <div className="ins-card-title"><span>💧</span> Concentration Split</div>
          {(stats?.by_concentration || []).map(c => (
            <BarRow
              key={c.concentration}
              label={c.concentration}
              value={c.cnt}
              max={Math.max(...(stats?.by_concentration||[]).map(x=>x.cnt),1)}
              color="var(--text2)"
            />
          ))}
        </div>

      </div>
    </>
  );
}
