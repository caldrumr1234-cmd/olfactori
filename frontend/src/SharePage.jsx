import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:      #0e0e14;
    --bg2:     #13131a;
    --bg3:     #1a1a24;
    --bg4:     #1f1f2e;
    --border:  #2a2a3a;
    --border2: #3a3a50;
    --text:    #e8e6f0;
    --text2:   #a09aba;
    --text3:   #6b6880;
    --gold:    #c9a84c;
    --gold-dim:#8a6f2e;
    --radius:  10px;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); min-height: 100vh; }

  .sp-wrap { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; }

  /* Header */
  .sp-header {
    padding: 48px 0 32px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
    display: flex; align-items: flex-end; justify-content: space-between; gap: 20px;
    flex-wrap: wrap;
  }
  .sp-header-left { display: flex; flex-direction: column; gap: 8px; }
  .sp-logo { font-family: var(--serif); font-size: 13px; color: var(--gold); letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; }
  .sp-name { font-family: var(--serif); font-size: 42px; font-weight: 300; color: var(--text); line-height: 1; }
  .sp-bio { font-size: 13px; color: var(--text3); margin-top: 4px; }
  .sp-meta { font-size: 12px; color: var(--text3); }
  .sp-meta span { color: var(--gold); font-weight: 500; }

  /* Filters */
  .sp-filters {
    display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; align-items: center;
  }
  .sp-filter-btn {
    background: var(--bg3); border: 1px solid var(--border); border-radius: 20px;
    color: var(--text2); font-size: 12px; font-family: var(--sans);
    padding: 6px 14px; cursor: pointer; transition: all 0.15s;
  }
  .sp-filter-btn:hover { border-color: var(--violet, #a78bfa); color: var(--violet, #a78bfa); background: rgba(167,139,250,0.08); }
  .sp-filter-btn.active { background: var(--gold-dim); border-color: var(--gold); color: var(--gold); box-shadow: 0 0 8px rgba(201,168,76,0.2); }
  .sp-search {
    background: var(--bg3); border: 1px solid var(--border); border-radius: 20px;
    color: var(--text); font-size: 12px; font-family: var(--sans);
    padding: 6px 14px; outline: none; transition: border-color 0.15s; min-width: 200px;
  }
  .sp-search:focus { border-color: var(--gold); }
  .sp-search::placeholder { color: var(--text3); }
  .sp-count { font-size: 12px; color: var(--text3); margin-left: auto; }

  /* Grid */
  .sp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
  }

  /* Card */
  .sp-card {
    background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden; cursor: pointer; transition: transform 0.15s, border-color 0.15s;
    position: relative;
  }
  .sp-card:hover { transform: translateY(-2px); border-color: rgba(167,139,250,0.35); box-shadow: 0 6px 20px rgba(0,0,0,0.3), 0 0 12px rgba(167,139,250,0.06); }
  .sp-card.trade { border-color: var(--gold-dim); }
  .sp-card.trade:hover { border-color: var(--gold); box-shadow: 0 6px 20px rgba(0,0,0,0.3), 0 0 16px rgba(201,168,76,0.1); }
  .sp-card-img {
    width: 100%; aspect-ratio: 1;
    background: radial-gradient(ellipse at center, #1e1e2a 0%, var(--bg3) 100%);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .sp-card-img img { width: 75%; height: 75%; object-fit: contain; }
  .sp-card-body { padding: 10px 12px; }
  .sp-card-brand { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp-card-name { font-family: var(--serif); font-size: 15px; font-weight: 300; color: var(--text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .sp-card-meta { font-size: 10px; color: var(--text3); margin-top: 5px; }
  .sp-trade-badge {
    position: absolute; top: 8px; right: 8px;
    background: rgba(201,168,76,0.08); border: 1px solid var(--gold);
    border-radius: 4px; padding: 2px 6px; font-size: 9px; color: var(--gold);
    text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500;
  }

  /* Drawer overlay */
  .sp-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px); z-index: 100;
  }
  .sp-drawer {
    position: fixed; right: 0; top: 0; bottom: 0;
    width: 420px; max-width: 95vw;
    background: var(--bg2); border-left: 1px solid var(--border);
    display: flex; flex-direction: column; z-index: 101;
    animation: slideIn 0.25s ease;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .sp-drawer-hero {
    position: relative; height: 320px;
    background: radial-gradient(ellipse 70% 80% at 50% 60%, rgba(201,168,76,0.12) 0%, var(--bg3) 70%);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
  }
  .sp-drawer-hero img { height: 90%; width: auto; max-width: 88%; object-fit: contain; opacity: 0; transition: opacity 0.4s; }
  .sp-drawer-hero img.loaded { opacity: 1; }
  .sp-drawer-hero-overlay {
    position: absolute; bottom: 0; left: 0; right: 0; height: 80px;
    background: linear-gradient(transparent, var(--bg2));
  }
  .sp-drawer-close {
    position: absolute; top: 12px; right: 12px;
    background: rgba(0,0,0,0.5); border: 1px solid var(--border2); border-radius: 50%;
    width: 32px; height: 32px; color: var(--text2); font-size: 18px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    z-index: 2; transition: all 0.15s;
  }
  .sp-drawer-close:hover { color: var(--text); border-color: var(--gold); }

  .sp-drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
  .sp-drawer-brand { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .sp-drawer-name { font-family: var(--serif); font-size: 28px; font-weight: 300; color: var(--text); line-height: 1.2; margin-bottom: 16px; }

  .sp-drawer-section { margin-bottom: 16px; }
  .sp-drawer-label { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .sp-drawer-value { font-size: 13px; color: var(--text2); }

  .sp-notes-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px; }
  .sp-notes-tier { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; width: 36px; flex-shrink: 0; padding-top: 3px; }
  .sp-notes-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .sp-note-tag { background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: var(--text2); }

  .sp-drawer-footer { padding: 16px 20px; border-top: 1px solid var(--border); flex-shrink: 0; }

  /* Trade form */
  .sp-trade-form { display: flex; flex-direction: column; gap: 10px; }
  .sp-trade-title { font-size: 13px; color: var(--text); font-weight: 500; margin-bottom: 4px; }
  .sp-trade-input {
    background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); font-size: 13px; font-family: var(--sans);
    padding: 9px 12px; outline: none; transition: border-color 0.15s; width: 100%;
  }
  .sp-trade-input:focus { border-color: var(--gold); }
  .sp-trade-input::placeholder { color: var(--text3); }
  textarea.sp-trade-input { resize: vertical; min-height: 70px; }
  .sp-btn {
    padding: 10px 18px; border-radius: var(--radius); font-size: 13px;
    font-family: var(--sans); cursor: pointer; border: none; transition: all 0.15s;
  }
  .sp-btn-primary { background: linear-gradient(135deg, var(--gold), #e8b84e); color: #0e0e14; font-weight: 500; box-shadow: 0 2px 10px rgba(201,168,76,0.2); }
  .sp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(201,168,76,0.35); }
  .sp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .sp-btn-secondary { background: var(--bg3); border: 1px solid var(--border); color: var(--text2); }
  .sp-btn-secondary:hover { border-color: var(--violet, #a78bfa); color: var(--violet, #a78bfa); background: rgba(167,139,250,0.08); }

  .sp-success { text-align: center; padding: 20px 0; }
  .sp-success-icon { font-size: 36px; margin-bottom: 12px; }
  .sp-success-text { font-size: 14px; color: var(--text2); }

  /* Empty / loading */
  .sp-empty { text-align: center; padding: 80px 20px; color: var(--text3); font-size: 14px; }
  .sp-loading { text-align: center; padding: 80px 20px; color: var(--text3); font-size: 13px; }

  /* 404 */
  .sp-404 { text-align: center; padding: 120px 20px; }
  .sp-404-title { font-family: var(--serif); font-size: 48px; font-weight: 300; color: var(--text); margin-bottom: 12px; }
  .sp-404-sub { font-size: 14px; color: var(--text3); }
`;

const imgSrc = (f) => f?.custom_image_url || f?.fragella_image_url || null;

function TradeForm({ frag, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", offering: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSending(true);
    try {
      await fetch(`${API}/trade_requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fragrance_id: frag.id,
          fragrance_name: frag.name,
          fragrance_brand: frag.brand,
          requester_name: form.name,
          requester_email: form.email,
          offering: form.offering || null,
          message: form.message || null,
        }),
      });
      setSent(true);
    } catch (e) {
      alert("Failed to send request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div className="sp-success">
      <div className="sp-success-icon">✉️</div>
      <div className="sp-success-text">Trade request sent! The owner will be in touch.</div>
    </div>
  );

  return (
    <div className="sp-trade-form">
      <div className="sp-trade-title">Request a Trade for {frag.name}</div>
      <input className="sp-trade-input" placeholder="Your name *" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
      <input className="sp-trade-input" placeholder="Your email *" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
      <input className="sp-trade-input" placeholder="What are you offering in exchange?" value={form.offering} onChange={e => setForm(f => ({...f, offering: e.target.value}))} />
      <textarea className="sp-trade-input" placeholder="Any message for the owner?" value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} />
      <div style={{display:"flex", gap:8}}>
        <button className="sp-btn sp-btn-secondary" onClick={onClose}>Cancel</button>
        <button className="sp-btn sp-btn-primary" onClick={submit} disabled={sending || !form.name.trim() || !form.email.trim()}>
          {sending ? "Sending…" : "Send Request"}
        </button>
      </div>
    </div>
  );
}

function Drawer({ frag, profile, onClose }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showTrade, setShowTrade] = useState(false);
  const img = imgSrc(frag);
  const parseNotes = (v) => {
    if (!v) return [];
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(n=>n.trim()).filter(Boolean); } catch(e) {}
    return v.split(",").map(n=>n.trim()).filter(Boolean);
  };
  const top    = parseNotes(frag.top_notes);
  const middle = parseNotes(frag.middle_notes);
  const base   = parseNotes(frag.base_notes);
  const hasNotes = top.length || middle.length || base.length;
  const isTrade = !!frag.want_to_trade;

  return (
    <>
      <div className="sp-overlay" onClick={onClose} />
      <div className="sp-drawer">
        <div className="sp-drawer-hero">
          {img && !imgError
            ? <img src={img} alt={frag.name} className={imgLoaded ? "loaded" : ""} onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} />
            : null}
          <div className="sp-drawer-hero-overlay" />
          <button className="sp-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="sp-drawer-body">
          <div className="sp-drawer-brand">{frag.brand}</div>
          <div className="sp-drawer-name">{frag.name}</div>

          {(profile.show_concentration || profile.show_size) && (
            <div className="sp-drawer-section">
              <div className="sp-drawer-label">Details</div>
              <div className="sp-drawer-value">
                {[
                  profile.show_concentration && frag.concentration,
                  profile.show_size && frag.size_ml && `${frag.size_ml}ml`,
                  frag.year_released && frag.year_released,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
          )}

          {profile.show_notes && hasNotes && (
            <div className="sp-drawer-section">
              <div className="sp-drawer-label">Notes</div>
              {[["Top", top], ["Heart", middle], ["Base", base]].map(([label, notes]) =>
                notes.length > 0 && (
                  <div key={label} className="sp-notes-row">
                    <span className="sp-notes-tier">{label}</span>
                    <div className="sp-notes-tags">
                      {notes.map(n => <span key={n} className="sp-note-tag">{n}</span>)}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {frag.perfumer && (
            <div className="sp-drawer-section">
              <div className="sp-drawer-label">Perfumer</div>
              <div className="sp-drawer-value">{frag.perfumer}</div>
            </div>
          )}

          {isTrade && !showTrade && (
            <div style={{marginTop:8}}>
              <div style={{fontSize:12,color:"var(--text3)",marginBottom:10}}>
                🔄 This bottle is available for trade.
              </div>
              <button className="sp-btn sp-btn-primary" onClick={() => setShowTrade(true)}>
                Request a Trade
              </button>
            </div>
          )}

          {isTrade && showTrade && (
            <div style={{marginTop:12}}>
              <TradeForm frag={frag} onClose={() => setShowTrade(false)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SharePage({ username }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | trade
  const [active, setActive] = useState(null);

  useEffect(() => {
    fetch(`${API}/share/${username}`)
      .then(r => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [username]);

  const filtered = data ? data.fragrances.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.name.toLowerCase().includes(q) || f.brand.toLowerCase().includes(q);
    const matchFilter = filter === "all" || (filter === "trade" && f.want_to_trade);
    return matchSearch && matchFilter;
  }) : [];

  const tradeCount = data ? data.fragrances.filter(f => f.want_to_trade).length : 0;

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="sp-wrap"><div className="sp-loading">Loading collection…</div></div>
    </>
  );

  if (notFound) return (
    <>
      <style>{css}</style>
      <div className="sp-wrap">
        <div className="sp-404">
          <div className="sp-404-title">Collection not found</div>
          <div className="sp-404-sub">This profile doesn't exist or has been set to private.</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="sp-wrap">
        <div className="sp-header">
          <div className="sp-header-left">
            <a className="sp-logo" href="https://olfactori.vip">Olfactori</a>
            <div className="sp-name">{data.display_name || data.username}'s Collection</div>
            {data.bio && <div className="sp-bio">{data.bio}</div>}
          </div>
          <div className="sp-meta">
            <span>{data.fragrances.length}</span> bottles
            {tradeCount > 0 && <> · <span>{tradeCount}</span> available to trade</>}
          </div>
        </div>

        <div className="sp-filters">
          <input className="sp-search" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className={`sp-filter-btn${filter==="all"?" active":""}`} onClick={() => setFilter("all")}>All</button>
          {tradeCount > 0 && (
            <button className={`sp-filter-btn${filter==="trade"?" active":""}`} onClick={() => setFilter("trade")}>
              🔄 Trade ({tradeCount})
            </button>
          )}
          <span className="sp-count">{filtered.length} shown</span>
        </div>

        {filtered.length === 0
          ? <div className="sp-empty">No fragrances match your search.</div>
          : <div className="sp-grid">
              {filtered.map(f => (
                <div key={f.id} className={`sp-card${f.want_to_trade===1?" trade":""}`} onClick={() => setActive(f)}>
                  <div className="sp-card-img">
                    {imgSrc(f)
                      ? <img src={imgSrc(f)} alt={f.name} loading="lazy" />
                      : <div style={{width:40,height:60,borderRadius:6,background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.08)"}} />
                    }
                  </div>
                  {!!f.want_to_trade && <div className="sp-trade-badge">Trade</div>}
                  <div className="sp-card-body">
                    <div className="sp-card-brand">{f.brand}</div>
                    <div className="sp-card-name">{f.name}</div>
                    {data.show_concentration && f.concentration && (
                      <div className="sp-card-meta">{f.concentration}{data.show_size && f.size_ml ? ` · ${f.size_ml}ml` : ""}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {active && <Drawer frag={active} profile={data} onClose={() => setActive(null)} />}
    </>
  );
}
