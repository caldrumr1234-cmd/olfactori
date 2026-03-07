// UsedToHaveTab.jsx — Fragrances you used to have, grid + detail drawer
import { useState, useEffect, useRef } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const REASONS = [
  { id:"sold",     label:"Sold",     icon:"💸" },
  { id:"used up",  label:"Used Up",  icon:"🪫" },
  { id:"gifted",   label:"Gifted",   icon:"🎁" },
  { id:"traded",   label:"Traded",   icon:"🤝" },
  { id:"lost",     label:"Lost",     icon:"🔍" },
  { id:"returned", label:"Returned", icon:"↩️" },
  { id:"other",    label:"Other",    icon:"📦" },
];

const css = `
  .uth-wrap { max-width: 900px; margin: 0 auto; }

  /* HEADER */
  .uth-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .uth-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: var(--text); flex: 1; }
  .uth-add-btn { background: var(--gold); border: none; border-radius: 8px; color: #0c0c0f; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .uth-add-btn:hover { background: var(--gold2); transform: translateY(-1px); }
  .uth-search { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 8px 14px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; width: 200px; }
  .uth-search:focus { border-color: var(--gold); }
  .uth-count { font-size: 12px; color: var(--text3); }
  .uth-view-toggle { display: flex; gap: 4px; }
  .uth-view-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text3); padding: 6px 10px; font-size: 13px; cursor: pointer; transition: all 0.15s; }
  .uth-view-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }

  /* GRID */
  .uth-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
  .uth-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: all 0.15s; }
  .uth-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
  .uth-card-img { width: 100%; aspect-ratio: 1; background: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .uth-card-img img { width: 80%; height: 80%; object-fit: contain; }
  .uth-card-placeholder { font-size: 32px; opacity: 0.3; }
  .uth-card-body { padding: 10px 12px 12px; }
  .uth-card-brand { font-size: 9px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; }
  .uth-card-name { font-family: 'Cormorant Garamond', serif; font-size: 15px; color: var(--text); line-height: 1.2; margin-top: 2px; }
  .uth-card-reason { margin-top: 6px; }
  .uth-reason-pill { font-size: 10px; color: var(--text3); background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 2px 7px; display: inline-block; }

  /* LIST */
  .uth-list { display: flex; flex-direction: column; }
  .uth-item { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--border); cursor: pointer; transition: all 0.15s; }
  .uth-item:last-child { border-bottom: none; }
  .uth-item:hover .uth-item-name { color: var(--gold); }
  .uth-item-thumb { width: 44px; height: 44px; background: #ffffff; border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .uth-item-thumb img { width: 88%; height: 88%; object-fit: contain; }
  .uth-item-info { flex: 1; min-width: 0; }
  .uth-item-brand { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; }
  .uth-item-name { font-family: 'Cormorant Garamond', serif; font-size: 17px; color: var(--text); transition: color 0.15s; }
  .uth-item-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  /* EMPTY */
  .uth-empty { text-align: center; padding: 60px 20px; color: var(--text3); font-size: 14px; }
  .uth-empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }

  /* DETAIL DRAWER */
  .uth-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 300; animation: fadeIn 0.2s ease; }
  .uth-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 480px; background: var(--bg1); border-left: 1px solid var(--border); z-index: 301; overflow-y: auto; animation: slideInRight 0.25s ease; display: flex; flex-direction: column; }
  @keyframes slideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .uth-drawer-hero { width: 100%; height: 320px; background: radial-gradient(ellipse 70% 80% at 50% 60%, rgba(201,168,76,0.12) 0%, var(--bg3) 70%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; position: relative; }
  .uth-drawer-hero img { width: auto; height: 90%; max-width: 88%; object-fit: contain; }
  .uth-drawer-hero-placeholder { font-size: 64px; opacity: 0.12; }
  .uth-drawer-close { position: absolute; top: 14px; right: 14px; background: rgba(0,0,0,0.5); border: none; color: var(--text2); width: 32px; height: 32px; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .uth-drawer-close:hover { background: rgba(0,0,0,0.8); color: var(--text); }
  .uth-drawer-body { padding: 24px 28px; flex: 1; }
  .uth-drawer-brand { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px; }
  .uth-drawer-name { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 300; color: var(--text); line-height: 1.1; margin-bottom: 16px; }
  .uth-drawer-reason { display: inline-flex; align-items: center; gap: 6px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 6px 14px; font-size: 13px; color: var(--text2); margin-bottom: 24px; }
  .uth-drawer-reason-icon { font-size: 16px; }
  .uth-drawer-img-section { margin-bottom: 20px; }
  .uth-drawer-img-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .uth-drawer-img-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 12px; font-size: 12px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
  .uth-drawer-img-input:focus { border-color: var(--gold); }
  .uth-drawer-img-save { margin-top: 6px; background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; color: var(--text2); padding: 5px 14px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .uth-drawer-img-save:hover { border-color: var(--gold); color: var(--gold); }
  .uth-drawer-actions { display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap; }
  .uth-drawer-btn { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); padding: 10px; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; text-align: center; }
  .uth-drawer-btn:hover { border-color: var(--border2); color: var(--text); }
  .uth-drawer-btn.danger:hover { border-color: #c94040; color: #c94040; }

  /* ADD/EDIT MODAL */
  .uth-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .uth-modal { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; width: 100%; max-width: 440px; }
  .uth-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: var(--text); margin-bottom: 20px; }
  .uth-field { margin-bottom: 16px; }
  .uth-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; display: block; }
  .uth-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 12px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
  .uth-input:focus { border-color: var(--gold); }
  .uth-reason-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .uth-reason-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px 4px; text-align: center; cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; font-size: 11px; color: var(--text2); }
  .uth-reason-btn:hover { border-color: var(--border2); color: var(--text); }
  .uth-reason-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
  .uth-reason-btn-icon { font-size: 16px; display: block; margin-bottom: 4px; }
  .uth-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .uth-modal-cancel { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text3); padding: 8px 16px; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .uth-modal-save { background: var(--gold); border: none; border-radius: 8px; color: #0c0c0f; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .uth-modal-save:disabled { opacity: 0.5; cursor: default; }
`;

function imgSrc(item) {
  return item?.custom_image_url || null;
}

// ── ADD / EDIT MODAL ──────────────────────────────────────────
function AddModal({ item, onSave, onClose }) {
  const [brand,  setBrand]  = useState(item?.brand  || "");
  const [name,   setName]   = useState(item?.name   || "");
  const [reason, setReason] = useState(item?.reason || "");

  const handleSave = async () => {
    if (!brand.trim() || !name.trim()) return;
    const url    = item ? `${API}/used_to_have/${item.id}` : `${API}/used_to_have`;
    const method = item ? "PATCH" : "POST";
    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand: brand.trim(), name: name.trim(), reason: reason || null })
    });
    const data = await res.json();
    onSave(data);
  };

  return (
    <div className="uth-modal-overlay" onClick={onClose}>
      <div className="uth-modal" onClick={e => e.stopPropagation()}>
        <div className="uth-modal-title">{item ? "Edit Entry" : "Used to Have"}</div>

        <div className="uth-field">
          <label className="uth-label">Brand</label>
          <input className="uth-input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Creed" autoFocus />
        </div>

        <div className="uth-field">
          <label className="uth-label">Fragrance</label>
          <input className="uth-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aventus"
            onKeyDown={e => e.key === "Enter" && handleSave()} />
        </div>

        <div className="uth-field">
          <label className="uth-label">Why did it leave? (optional)</label>
          <div className="uth-reason-grid">
            {REASONS.map(r => (
              <button key={r.id} className={`uth-reason-btn ${reason === r.id ? "active" : ""}`}
                onClick={() => setReason(reason === r.id ? "" : r.id)}>
                <span className="uth-reason-btn-icon">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="uth-modal-actions">
          <button className="uth-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="uth-modal-save" onClick={handleSave} disabled={!brand.trim() || !name.trim()}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── DETAIL DRAWER ─────────────────────────────────────────────
function DetailDrawer({ item, onClose, onEdit, onDelete, onImageSaved }) {
  const [imgUrl, setImgUrl] = useState(item.custom_image_url || "");
  const [imgDirty, setImgDirty] = useState(false);

  const reasonObj = REASONS.find(r => r.id === item.reason);

  const saveImage = async () => {
    const res  = await fetch(`${API}/used_to_have/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_image_url: imgUrl.trim() || null })
    });
    const data = await res.json();
    setImgDirty(false);
    onImageSaved(data);
  };

  return (
    <>
      <div className="uth-drawer-overlay" onClick={onClose} />
      <div className="uth-drawer">
        {/* HERO IMAGE */}
        <div className="uth-drawer-hero">
          {imgSrc(item)
            ? <img src={imgSrc(item)} alt="" onError={e => { e.target.style.display = "none"; }} />
            : <span className="uth-drawer-hero-placeholder">🧴</span>
          }
          <button className="uth-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="uth-drawer-body">
          <div className="uth-drawer-brand">{item.brand}</div>
          <div className="uth-drawer-name">{item.name}</div>

          {reasonObj && (
            <div className="uth-drawer-reason">
              <span className="uth-drawer-reason-icon">{reasonObj.icon}</span>
              {reasonObj.label}
            </div>
          )}

          {/* IMAGE URL */}
          <div className="uth-drawer-img-section">
            <div className="uth-drawer-img-label">Custom Image URL</div>
            <input
              className="uth-drawer-img-input"
              value={imgUrl}
              onChange={e => { setImgUrl(e.target.value); setImgDirty(true); }}
              placeholder="https://..."
            />
            {imgDirty && (
              <button className="uth-drawer-img-save" onClick={saveImage}>Save Image</button>
            )}
          </div>

          <div className="uth-drawer-actions">
            <button className="uth-drawer-btn" onClick={onEdit}>✏️ Edit</button>
            <button className="uth-drawer-btn danger" onClick={() => {
              if (window.confirm(`Remove "${item.brand} ${item.name}" from Used to Have?`)) onDelete(item.id);
            }}>🗑 Remove</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export default function UsedToHaveTab({ toast }) {
  const [items, setItems]         = useState([]);
  const [search, setSearch]       = useState("");
  const [view, setView]           = useState("grid");
  const [activeItem, setActiveItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const searchTimer               = useRef(null);

  const load = (q = search) => {
    const params = q ? `?search=${encodeURIComponent(q)}` : "";
    fetch(`${API}/used_to_have${params}`)
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 300);
  };

  const handleSave = (saved) => {
    load();
    setShowModal(false);
    setEditItem(null);
    // if we edited the open item, update it
    if (activeItem?.id === saved.id) setActiveItem(saved);
    toast && toast(editItem ? "Entry updated" : "Added to Used to Have");
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/used_to_have/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setActiveItem(null);
    toast && toast("Entry removed");
  };

  const handleImageSaved = (saved) => {
    setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
    setActiveItem(saved);
    toast && toast("Image saved");
  };

  const openEdit = () => {
    setEditItem(activeItem);
    setShowModal(true);
  };

  const reasonObj = (r) => REASONS.find(x => x.id === r);

  return (
    <>
      <style>{css}</style>
      <div className="uth-wrap">

        {/* HEADER */}
        <div className="uth-header">
          <div className="uth-title">Used to Have</div>
          <input
            className="uth-search"
            placeholder="Search..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          <span className="uth-count">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
          <div className="uth-view-toggle">
            <button className={`uth-view-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>⊞</button>
            <button className={`uth-view-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>≡</button>
          </div>
          <button className="uth-add-btn" onClick={() => { setEditItem(null); setShowModal(true); }}>+ Add</button>
        </div>

        {/* CONTENT */}
        {items.length === 0 ? (
          <div className="uth-empty">
            <span className="uth-empty-icon">📦</span>
            Track fragrances you owned but no longer have — sold, used up, gifted, traded, or otherwise gone.
          </div>
        ) : view === "grid" ? (
          <div className="uth-grid">
            {items.map(item => {
              const r = reasonObj(item.reason);
              return (
                <div key={item.id} className="uth-card" onClick={() => setActiveItem(item)}>
                  <div className="uth-card-img">
                    {imgSrc(item)
                      ? <img src={imgSrc(item)} alt="" onError={e => { e.target.style.display = "none"; }} />
                      : <span className="uth-card-placeholder">🧴</span>
                    }
                  </div>
                  <div className="uth-card-body">
                    <div className="uth-card-brand">{item.brand}</div>
                    <div className="uth-card-name">{item.name}</div>
                    {r && (
                      <div className="uth-card-reason">
                        <span className="uth-reason-pill">{r.icon} {r.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="uth-list">
            {items.map(item => {
              const r = reasonObj(item.reason);
              return (
                <div key={item.id} className="uth-item" onClick={() => setActiveItem(item)}>
                  <div className="uth-item-thumb">
                    {imgSrc(item)
                      ? <img src={imgSrc(item)} alt="" onError={e => { e.target.style.display = "none"; }} />
                      : <span style={{fontSize:18,opacity:0.3}}>🧴</span>
                    }
                  </div>
                  <div className="uth-item-info">
                    <div className="uth-item-brand">{item.brand}</div>
                    <div className="uth-item-name">{item.name}</div>
                  </div>
                  <div className="uth-item-right">
                    {r && <span className="uth-reason-pill">{r.icon} {r.label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DETAIL DRAWER */}
        {activeItem && (
          <DetailDrawer
            item={activeItem}
            onClose={() => setActiveItem(null)}
            onEdit={openEdit}
            onDelete={handleDelete}
            onImageSaved={handleImageSaved}
          />
        )}

        {/* ADD / EDIT MODAL */}
        {showModal && (
          <AddModal
            item={editItem}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditItem(null); }}
          />
        )}

      </div>
    </>
  );
}
