// UsedToHaveTab.jsx — Fragrances you used to have
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const REASONS = [
  { id:"sold",     label:"Sold",     icon:"💸" },
  { id:"used up",  label:"Used Up",  icon:"🪫" },
  { id:"gifted",   label:"Gifted",   icon:"🎁" },
  { id:"lost",     label:"Lost",     icon:"🔍" },
  { id:"returned", label:"Returned", icon:"↩️" },
  { id:"other",    label:"Other",    icon:"📦" },
];

const css = `
  .uth-wrap { max-width: 760px; margin: 0 auto; }
  .uth-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
  .uth-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: var(--text); flex: 1; }
  .uth-add-btn { background: var(--gold); border: none; border-radius: 8px; color: #0c0c0f; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .uth-add-btn:hover { background: var(--gold2); transform: translateY(-1px); }
  .uth-search { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 8px 14px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; width: 220px; }
  .uth-search:focus { border-color: var(--gold); }
  .uth-count { font-size: 12px; color: var(--text3); }

  /* LIST */
  .uth-list { display: flex; flex-direction: column; gap: 0; }
  .uth-item { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .uth-item:last-child { border-bottom: none; }
  .uth-item-info { flex: 1; min-width: 0; }
  .uth-item-brand { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; }
  .uth-item-name { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: var(--text); }
  .uth-item-reason { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
  .uth-reason-badge { font-size: 11px; color: var(--text3); background: var(--bg3); border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; }
  .uth-item-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .uth-item-btn { background: none; border: 1px solid var(--border); border-radius: 6px; color: var(--text3); padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .uth-item-btn:hover { border-color: var(--border2); color: var(--text2); }
  .uth-item-btn.danger:hover { border-color: #c94040; color: #c94040; }
  .uth-empty { text-align: center; padding: 60px 20px; color: var(--text3); font-size: 14px; }
  .uth-empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }

  /* MODAL */
  .uth-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .uth-modal { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; width: 100%; max-width: 420px; }
  .uth-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: var(--text); margin-bottom: 20px; }
  .uth-field { margin-bottom: 16px; }
  .uth-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; display: block; }
  .uth-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 12px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
  .uth-input:focus { border-color: var(--gold); }
  .uth-reason-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .uth-reason-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px 6px; text-align: center; cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--text2); }
  .uth-reason-btn:hover { border-color: var(--border2); color: var(--text); }
  .uth-reason-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
  .uth-reason-icon { font-size: 18px; display: block; margin-bottom: 4px; }
  .uth-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .uth-modal-cancel { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text3); padding: 8px 16px; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .uth-modal-save { background: var(--gold); border: none; border-radius: 8px; color: #0c0c0f; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .uth-modal-save:disabled { opacity: 0.5; cursor: default; }
`;

function AddModal({ item, onSave, onClose }) {
  const [brand,  setBrand]  = useState(item?.brand  || "");
  const [name,   setName]   = useState(item?.name   || "");
  const [reason, setReason] = useState(item?.reason || "");

  const handleSave = async () => {
    if (!brand.trim() || !name.trim()) return;
    const url    = item ? `${API}/used_to_have/${item.id}` : `${API}/used_to_have`;
    const method = item ? "PATCH" : "POST";
    const res  = await fetch(url, { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ brand: brand.trim(), name: name.trim(), reason: reason || null }) });
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
          <input className="uth-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aventus" />
        </div>

        <div className="uth-field">
          <label className="uth-label">Why did it leave? (optional)</label>
          <div className="uth-reason-grid">
            {REASONS.map(r => (
              <button key={r.id} className={`uth-reason-btn ${reason===r.id?"active":""}`} onClick={() => setReason(reason === r.id ? "" : r.id)}>
                <span className="uth-reason-icon">{r.icon}</span>
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

export default function UsedToHaveTab({ toast }) {
  const [items, setItems]     = useState([]);
  const [search, setSearch]   = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null);

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
    load(val);
  };

  const handleSave = (saved) => {
    load();
    setShowModal(false);
    setEditItem(null);
    toast && toast(editItem ? "Entry updated" : "Added to Used to Have");
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/used_to_have/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    toast && toast("Entry removed");
  };

  const reasonObj = (r) => REASONS.find(x => x.id === r);

  return (
    <>
      <style>{css}</style>
      <div className="uth-wrap">
        <div className="uth-header">
          <div className="uth-title">Used to Have</div>
          <input
            className="uth-search"
            placeholder="Search..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          <span className="uth-count">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
          <button className="uth-add-btn" onClick={() => { setEditItem(null); setShowModal(true); }}>+ Add</button>
        </div>

        {items.length === 0 ? (
          <div className="uth-empty">
            <span className="uth-empty-icon">📦</span>
            Track fragrances you owned but no longer have — sold, used up, gifted, or otherwise gone.
          </div>
        ) : (
          <div className="uth-list">
            {items.map(item => {
              const r = reasonObj(item.reason);
              return (
                <div key={item.id} className="uth-item">
                  <div className="uth-item-info">
                    <div className="uth-item-brand">{item.brand}</div>
                    <div className="uth-item-name">{item.name}</div>
                    {r && (
                      <div className="uth-item-reason">
                        <span className="uth-reason-badge">{r.icon} {r.label}</span>
                      </div>
                    )}
                  </div>
                  <div className="uth-item-actions">
                    <button className="uth-item-btn" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                    <button className="uth-item-btn danger" onClick={() => handleDelete(item.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
