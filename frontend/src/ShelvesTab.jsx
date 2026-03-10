// ShelvesTab.jsx — Custom shelves / groupings
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const EMOJIS = ["🗄️","🌊","🌿","🔥","❄️","🌸","🍂","🌙","☀️","💎","🖤","🤍","🍋","🌴","🏔️","🎩","🕌","🌺","🐉","⚡"];

const css = `
  .shelves-wrap { max-width: 860px; margin: 0 auto; }
  .shelves-header { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
  .shelves-title { font-family: var(--serif); font-size: 28px; font-weight: 300; color: var(--text); flex: 1; }
  .shelf-create-btn { background: var(--gold); border: none; border-radius: 8px; color: var(--bg); padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--sans); transition: all 0.15s; }
  .shelf-create-btn:hover { background: var(--gold2); transform: translateY(-1px); }

  /* SHELF LIST */
  .shelves-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
  .shelf-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; cursor: pointer; transition: all 0.15s; }
  .shelf-card:hover { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
  .shelf-card-emoji { font-size: 32px; margin-bottom: 10px; }
  .shelf-card-name { font-family: var(--serif); font-size: 20px; color: var(--text); margin-bottom: 4px; }
  .shelf-card-desc { font-size: 12px; color: var(--text3); margin-bottom: 10px; min-height: 16px; }
  .shelf-card-count { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; }
  .shelf-empty { text-align: center; padding: 60px 20px; color: var(--text3); font-size: 14px; }
  .shelf-empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }

  /* SHELF DETAIL */
  .shelf-detail-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
  .shelf-back-btn { background: none; border: none; color: var(--text3); font-size: 12px; cursor: pointer; font-family: var(--sans); padding: 4px 0; transition: color 0.15s; }
  .shelf-back-btn:hover { color: var(--text2); }
  .shelf-detail-emoji { font-size: 36px; }
  .shelf-detail-name { font-family: var(--serif); font-size: 26px; font-weight: 300; color: var(--text); }
  .shelf-detail-desc { font-size: 13px; color: var(--text3); margin-top: 2px; }
  .shelf-detail-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
  .shelf-action-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text2); padding: 7px 14px; font-size: 12px; cursor: pointer; transition: all 0.15s; font-family: var(--sans); }
  .shelf-action-btn:hover { border-color: var(--border2); color: var(--text); }
  .shelf-action-btn.primary { background: var(--gold); border-color: var(--gold); color: var(--bg); font-weight: 600; }
  .shelf-action-btn.primary:hover { background: var(--gold2); }
  .shelf-action-btn.danger { color: #c94040; }
  .shelf-action-btn.danger:hover { border-color: #c94040; }
  .shelf-items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
  .shelf-item-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; position: relative; transition: all 0.15s; }
  .shelf-item-card:hover { border-color: var(--border2); }
  .shelf-item-img { width: 100%; aspect-ratio: 1; background: #ffffff; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; overflow: hidden; }
  .shelf-item-img img { width: 85%; height: 85%; object-fit: contain; }
  .shelf-item-brand { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; }
  .shelf-item-name { font-family: var(--serif); font-size: 15px; color: var(--text); line-height: 1.2; }
  .shelf-item-remove { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; color: var(--text3); width: 22px; height: 22px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
  .shelf-item-card:hover .shelf-item-remove { opacity: 1; }
  .shelf-item-remove:hover { color: #c94040; }
  .shelf-items-empty { color: var(--text3); font-size: 13px; padding: 32px 0; }

  /* MODAL */
  .shelf-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .shelf-modal { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px; width: 100%; max-width: 440px; }
  .shelf-modal-title { font-family: var(--serif); font-size: 22px; color: var(--text); margin-bottom: 20px; }
  .shelf-modal-field { margin-bottom: 16px; }
  .shelf-modal-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; display: block; }
  .shelf-modal-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 9px 12px; font-size: 13px; font-family: var(--sans); outline: none; transition: border-color 0.15s; box-sizing: border-box; }
  .shelf-modal-input:focus { border-color: var(--gold); }
  .shelf-emoji-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .shelf-emoji-btn { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; font-size: 18px; cursor: pointer; transition: all 0.1s; }
  .shelf-emoji-btn.active { border-color: var(--gold); background: var(--gold-dim); }
  .shelf-emoji-btn:hover { border-color: var(--border2); }
  .shelf-modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
  .shelf-modal-cancel { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text3); padding: 8px 16px; font-size: 13px; cursor: pointer; font-family: var(--sans); }
  .shelf-modal-save { background: var(--gold); border: none; border-radius: 8px; color: var(--bg); padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--sans); }
`;

function parseArr(val) {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val) || []; } catch { return []; }
}
function imgSrc(f) { return f?.custom_image_url || f?.fragella_image_url || null; }

// ── CREATE / EDIT MODAL ───────────────────────────────────────
function ShelfModal({ shelf, onSave, onClose }) {
  const [name, setName]   = useState(shelf?.name || "");
  const [desc, setDesc]   = useState(shelf?.description || "");
  const [emoji, setEmoji] = useState(shelf?.emoji || "🗄️");

  const handleSave = async () => {
    if (!name.trim()) return;
    const url    = shelf ? `${API}/shelves/${shelf.id}` : `${API}/shelves`;
    const method = shelf ? "PATCH" : "POST";
    const res  = await fetch(url, { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, emoji }) });
    const data = await res.json();
    onSave(data);
  };

  return (
    <div className="shelf-modal-overlay" onClick={onClose}>
      <div className="shelf-modal" onClick={e => e.stopPropagation()}>
        <div className="shelf-modal-title">{shelf ? "Edit Shelf" : "New Shelf"}</div>

        <div className="shelf-modal-field">
          <label className="shelf-modal-label">Name</label>
          <input className="shelf-modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Rotation" autoFocus />
        </div>

        <div className="shelf-modal-field">
          <label className="shelf-modal-label">Description (optional)</label>
          <input className="shelf-modal-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="A short note about this shelf" />
        </div>

        <div className="shelf-modal-field">
          <label className="shelf-modal-label">Icon</label>
          <div className="shelf-emoji-grid">
            {EMOJIS.map(e => (
              <button key={e} className={`shelf-emoji-btn ${emoji===e?"active":""}`} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
        </div>

        <div className="shelf-modal-actions">
          <button className="shelf-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="shelf-modal-save" onClick={handleSave} disabled={!name.trim()}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── SHELF DETAIL VIEW ─────────────────────────────────────────
function ShelfDetail({ shelf, onBack, onDelete, onEdit, onPickFragrances, toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = () => {
    setLoading(true);
    fetch(`${API}/shelves/${shelf.id}/items`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadItems(); }, [shelf.id]);

  const removeItem = async (fragId) => {
    await fetch(`${API}/shelves/${shelf.id}/items/${fragId}`, { method: "DELETE" });
    setItems(prev => prev.filter(f => f.id !== fragId));
    toast && toast("Removed from shelf");
  };

  const handleAddFragrances = () => {
    onPickFragrances(async (ids) => {
      const res  = await fetch(`${API}/shelves/${shelf.id}/items`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ fragrance_ids: ids }) });
      const data = await res.json();
      toast && toast(`Added ${data.added} fragrance${data.added !== 1 ? "s" : ""} to ${shelf.name}`);
      loadItems();
    });
  };

  return (
    <div>
      <div className="shelf-detail-header">
        <button className="shelf-back-btn" onClick={onBack}>← All Shelves</button>
        <div className="shelf-detail-emoji">{shelf.emoji}</div>
        <div>
          <div className="shelf-detail-name">{shelf.name}</div>
          {shelf.description && <div className="shelf-detail-desc">{shelf.description}</div>}
        </div>
        <div className="shelf-detail-actions">
          <button className="shelf-action-btn primary" onClick={handleAddFragrances}>+ Add Fragrances</button>
          <button className="shelf-action-btn" onClick={onEdit}>Edit</button>
          <button className="shelf-action-btn danger" onClick={() => {
            if (window.confirm(`Delete shelf "${shelf.name}"?`)) onDelete(shelf.id);
          }}>Delete</button>
        </div>
      </div>

      {loading ? (
        <div style={{color:"var(--text3)",fontSize:13}}>Loading...</div>
      ) : items.length === 0 ? (
        <div className="shelf-items-empty">
          No fragrances on this shelf yet. Click <strong>+ Add Fragrances</strong> to get started.
        </div>
      ) : (
        <div className="shelf-items-grid">
          {items.map(f => (
            <div key={f.id} className="shelf-item-card">
              <div className="shelf-item-img">
                {imgSrc(f)
                  ? <img src={imgSrc(f)} alt="" onError={e=>{e.target.style.display="none";}} />
                  : <span style={{fontSize:24}}>🧴</span>}
              </div>
              <div className="shelf-item-brand">{f.brand}</div>
              <div className="shelf-item-name">{f.name}</div>
              {f.is_discontinued === 1 && (
                <span style={{fontSize:10,color:"#c94040",display:"block",marginTop:4}}>Discontinued</span>
              )}
              <button className="shelf-item-remove" onClick={() => removeItem(f.id)} title="Remove from shelf">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export default function ShelvesTab({ toast, onPickFragrances }) {
  const [shelves, setShelves]       = useState([]);
  const [activeShelf, setActiveShelf] = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [editShelf, setEditShelf]   = useState(null);

  const loadShelves = () => {
    fetch(`${API}/shelves`)
      .then(r => r.json())
      .then(d => setShelves(d.shelves || []))
      .catch(() => {});
  };

  useEffect(() => { loadShelves(); }, []);

  const handleSave = (saved) => {
    loadShelves();
    setShowModal(false);
    setEditShelf(null);
    if (!editShelf) {
      // new shelf — navigate into it
      setActiveShelf(saved);
    } else {
      // update active if we edited it
      if (activeShelf?.id === saved.id) setActiveShelf(saved);
    }
    toast && toast(editShelf ? "Shelf updated" : "Shelf created");
  };

  const handleDelete = async (shelfId) => {
    await fetch(`${API}/shelves/${shelfId}`, { method: "DELETE" });
    setShelves(prev => prev.filter(s => s.id !== shelfId));
    setActiveShelf(null);
    toast && toast("Shelf deleted");
  };

  return (
    <>
      <style>{css}</style>
      <div className="shelves-wrap">

        {activeShelf ? (
          <ShelfDetail
            shelf={activeShelf}
            onBack={() => { setActiveShelf(null); loadShelves(); }}
            onDelete={(id) => { handleDelete(id); }}
            onEdit={() => { setEditShelf(activeShelf); setShowModal(true); }}
            onPickFragrances={onPickFragrances}
            toast={toast}
          />
        ) : (
          <>
            <div className="shelves-header">
              <div className="shelves-title">Shelves</div>
              <button className="shelf-create-btn" onClick={() => { setEditShelf(null); setShowModal(true); }}>+ New Shelf</button>
            </div>

            {shelves.length === 0 ? (
              <div className="shelf-empty">
                <span className="shelf-empty-icon">🗄️</span>
                Create shelves to organise your collection into custom groups — by season, mood, occasion, or anything you want.
              </div>
            ) : (
              <div className="shelves-grid">
                {shelves.map(s => (
                  <div key={s.id} className="shelf-card" onClick={() => setActiveShelf(s)}>
                    <div className="shelf-card-emoji">{s.emoji}</div>
                    <div className="shelf-card-name">{s.name}</div>
                    <div className="shelf-card-desc">{s.description || ""}</div>
                    <div className="shelf-card-count">{s.item_count} fragrance{s.item_count !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {showModal && (
          <ShelfModal
            shelf={editShelf}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditShelf(null); }}
          />
        )}
      </div>
    </>
  );
}
