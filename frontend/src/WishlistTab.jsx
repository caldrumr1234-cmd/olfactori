// WishlistTab.jsx — drop into frontend/src/
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .wl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
  .wl-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    transition: all 0.2s; cursor: pointer;
  }
  .wl-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .wl-card-img {
    width: 100%; aspect-ratio: 1; background: var(--bg3);
    display: flex; align-items: center; justify-content: center; overflow: hidden;
  }
  .wl-card-img img { width: 75%; height: 75%; object-fit: contain; }
  .wl-card-img-placeholder { font-size: 40px; opacity: 0.2; }
  .wl-card-body { padding: 12px; }
  .wl-brand { font-size: 10px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 2px; }
  .wl-name { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 300; color: var(--text); line-height: 1.3; margin-bottom: 6px; }
  .wl-meta { font-size: 11px; color: var(--text3); margin-bottom: 6px; }
  .wl-footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--border); background: var(--bg3); }
  .wl-priority { display: flex; gap: 3px; }
  .wl-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border2); }
  .wl-dot.active { background: var(--gold); }
  .wl-price { font-size: 11px; color: var(--text3); }
  .wl-price span { color: var(--gold); font-weight: 500; }
  .wl-empty {
    grid-column: 1/-1;
    display: flex; flex-direction: column; align-items: center;
    padding: 80px 24px; color: var(--text3); gap: 12px; text-align: center;
  }
  .wl-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
  .wl-count { font-size: 13px; color: var(--text3); margin-left: auto; }
  .priority-btn {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    color: var(--text3); padding: 5px 10px; font-size: 12px;
    cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .priority-btn.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }

  /* DRAWER */
  .wl-drawer-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    z-index: 300; display: flex; justify-content: flex-end;
    animation: fadeIn 0.2s ease;
  }
  .wl-drawer {
    width: 420px; max-width: 95vw; height: 100%;
    background: var(--bg2); border-left: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
    animation: slideIn 0.25s ease;
  }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .wl-drawer-hero {
    width: 100%; aspect-ratio: 1; background: var(--bg3);
    display: flex; align-items: center; justify-content: center;
    position: relative; flex-shrink: 0;
  }
  .wl-drawer-hero img { width: 60%; height: 60%; object-fit: contain; }
  .wl-drawer-hero-placeholder { font-size: 64px; opacity: 0.15; }
  .wl-drawer-close {
    position: absolute; top: 12px; right: 12px;
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 50%; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 14px; color: var(--text2);
    transition: all 0.15s;
  }
  .wl-drawer-close:hover { border-color: var(--border2); color: var(--text); }
  .wl-drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
  .wl-drawer-brand { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
  .wl-drawer-name { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: var(--text); line-height: 1.2; margin-bottom: 12px; }
  .wl-drawer-section { margin-bottom: 16px; }
  .wl-drawer-label { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 5px; }
  .wl-drawer-value { font-size: 13px; color: var(--text2); }
  .wl-drawer-notes { font-size: 13px; color: var(--text2); font-style: italic; line-height: 1.5; }
  .wl-drawer-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border); flex-shrink: 0; }
  .wl-img-row { display: flex; gap: 8px; align-items: center; }
  .wl-img-input { flex: 1; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 7px 10px; font-size: 12px; font-family: "DM Sans",sans-serif; outline: none; transition: border-color 0.15s; }
  .wl-img-input:focus { border-color: var(--gold); }
`;

const PRIORITY_LABELS = { 1: "Must Have", 2: "Want", 3: "Maybe" };
const PRIORITY_COLORS = { 1: "var(--red)", 2: "var(--gold)", 3: "var(--text3)" };

function PriorityDots({ value }) {
  return (
    <div className="wl-priority" title={PRIORITY_LABELS[value]}>
      {[1,2,3].map(i => (
        <div key={i} className={`wl-dot ${i <= (4-value) ? "active" : ""}`}
          style={i <= (4-value) ? { background: PRIORITY_COLORS[value] } : {}} />
      ))}
    </div>
  );
}

function imgSrc(item) {
  return item.custom_image_url || null;
}

// ── DRAWER ────────────────────────────────────────────────────
function WishlistDrawer({ item, onClose, onUpdate, onDelete, onPurchased, toast }) {
  const [imgUrl, setImgUrl] = useState(item.custom_image_url || "");
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const img = imgUrl || item.custom_image_url;

  const saveImage = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/wishlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_image_url: imgUrl || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        toast?.("Image saved ✓");
      }
    } catch(e) {}
    setSaving(false);
  };

  return (
    <div className="wl-drawer-overlay" onClick={onClose}>
      <div className="wl-drawer" onClick={e => e.stopPropagation()}>
        <div className="wl-drawer-hero">
          {img
            ? <img src={img} alt={item.name} onError={e => e.target.style.display="none"} />
            : <span className="wl-drawer-hero-placeholder">🌟</span>
          }
          <button className="wl-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="wl-drawer-body">
          <div className="wl-drawer-brand">{item.brand}</div>
          <div className="wl-drawer-name">{item.name}</div>

          {/* Image URL */}
          <div className="wl-drawer-section">
            <div className="wl-drawer-label">Image URL</div>
            <div className="wl-img-row">
              <input className="wl-img-input" value={imgUrl}
                onChange={e => setImgUrl(e.target.value)}
                placeholder="https://..."
              />
              <button className="btn btn-secondary btn-sm" onClick={saveImage} disabled={saving}>
                {saving ? "…" : "Save"}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="wl-drawer-section">
            <div className="wl-drawer-label">Details</div>
            <div className="wl-drawer-value">
              {[
                item.concentration,
                item.size_ml ? `${item.size_ml}ml` : null,
                item.target_price ? `Target: $${item.target_price}` : null,
              ].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>

          {/* Priority */}
          <div className="wl-drawer-section">
            <div className="wl-drawer-label">Priority</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <PriorityDots value={item.priority} />
              <span className="wl-drawer-value">{PRIORITY_LABELS[item.priority]}</span>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="wl-drawer-section">
              <div className="wl-drawer-label">Notes</div>
              <div className="wl-drawer-notes">"{item.notes}"</div>
            </div>
          )}

          {/* Link */}
          {item.fragrantica_url && (
            <div className="wl-drawer-section">
              <a href={item.fragrantica_url} target="_blank" rel="noreferrer"
                style={{fontSize:12,color:"var(--blue)"}}>
                View on Fragrantica ↗
              </a>
            </div>
          )}
        </div>

        <div className="wl-drawer-actions">
          <button className="btn btn-primary" style={{flex:1}} onClick={() => { onClose(); onPurchased(item.id); }}>
            ✓ Mark Purchased
          </button>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-danger" onClick={() => { onClose(); onDelete(item.id); }}>✕</button>
        </div>
      </div>

      {showEdit && (
        <EditWishlistModal
          item={item}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => { onUpdate(updated); setShowEdit(false); }}
          toast={toast}
        />
      )}
    </div>
  );
}

// ── EDIT MODAL ────────────────────────────────────────────────
function EditWishlistModal({ item, onClose, onSave, toast }) {
  const [form, setForm] = useState({
    brand: item.brand || "",
    name: item.name || "",
    concentration: item.concentration || "",
    size_ml: item.size_ml || "",
    notes: item.notes || "",
    priority: item.priority || 2,
    target_price: item.target_price || "",
    fragrantica_url: item.fragrantica_url || "",
    custom_image_url: item.custom_image_url || "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await fetch(`${API}/wishlist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        size_ml: form.size_ml ? parseFloat(form.size_ml) : null,
        target_price: form.target_price ? parseFloat(form.target_price) : null,
        priority: parseInt(form.priority),
      })
    });
    if (res.ok) {
      const updated = await res.json();
      onSave(updated);
      toast?.("Saved ✓");
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Wishlist Item</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="edit-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input className="form-input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Concentration</label>
                <select className="form-select" value={form.concentration} onChange={e=>setForm({...form,concentration:e.target.value})}>
                  <option value="">—</option>
                  {["EdP","EdT","EdC","Extrait","Parfum","Eau Fraîche"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Size (ml)</label>
                <input className="form-input" type="number" value={form.size_ml} onChange={e=>setForm({...form,size_ml:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target Price ($)</label>
                <input className="form-input" type="number" value={form.target_price} onChange={e=>setForm({...form,target_price:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                  <option value={1}>🔴 Must Have</option>
                  <option value={2}>🟡 Want</option>
                  <option value={3}>⚪ Maybe</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Custom Image URL</label>
              <input className="form-input" value={form.custom_image_url} onChange={e=>setForm({...form,custom_image_url:e.target.value})} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label className="form-label">Fragrantica URL</label>
              <input className="form-input" value={form.fragrantica_url} onChange={e=>setForm({...form,fragrantica_url:e.target.value})} placeholder="https://www.fragrantica.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Why you want it, where you smelled it..." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ADD MODAL ─────────────────────────────────────────────────
function AddWishlistModal({ onClose, onAdd, toast }) {
  const [form, setForm] = useState({
    brand: "", name: "", concentration: "", size_ml: "",
    notes: "", priority: 2, target_price: "", fragrantica_url: "",
    custom_image_url: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.brand || !form.name) return;
    setSaving(true);
    const res = await fetch(`${API}/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        size_ml: form.size_ml ? parseFloat(form.size_ml) : null,
        target_price: form.target_price ? parseFloat(form.target_price) : null,
        priority: parseInt(form.priority),
      })
    });
    if (res.ok) {
      const item = await res.json();
      onAdd(item);
      toast?.("Added to wishlist ✓");
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add to Wishlist</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="edit-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand *</label>
                <input className="form-input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Concentration</label>
                <select className="form-select" value={form.concentration} onChange={e=>setForm({...form,concentration:e.target.value})}>
                  <option value="">—</option>
                  {["EdP","EdT","EdC","Extrait","Parfum","Eau Fraîche"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Size (ml)</label>
                <input className="form-input" type="number" value={form.size_ml} onChange={e=>setForm({...form,size_ml:e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target Price ($)</label>
                <input className="form-input" type="number" value={form.target_price} onChange={e=>setForm({...form,target_price:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                  <option value={1}>🔴 Must Have</option>
                  <option value={2}>🟡 Want</option>
                  <option value={3}>⚪ Maybe</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Custom Image URL</label>
              <input className="form-input" value={form.custom_image_url} onChange={e=>setForm({...form,custom_image_url:e.target.value})} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label className="form-label">Fragrantica URL</label>
              <input className="form-input" value={form.fragrantica_url} onChange={e=>setForm({...form,fragrantica_url:e.target.value})} placeholder="https://www.fragrantica.com/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Why you want it, where you smelled it..." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !form.brand || !form.name}>
            {saving ? "Adding…" : "Add to Wishlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WishlistTab({ toast }) {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);

  useEffect(() => {
    fetch(`${API}/wishlist`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : data.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addItem = (item) => setItems(prev => [item, ...prev]);

  const updateItem = (updated) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    if (activeItem?.id === updated.id) setActiveItem(updated);
  };

  const markPurchased = async (id) => {
    if (!window.confirm("Mark this as purchased? It will be removed from your wishlist.")) return;
    const res = await fetch(`${API}/wishlist/${id}/purchased`, { method: "PATCH" });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast?.("Marked as purchased ✓");
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Remove from wishlist?")) return;
    const res = await fetch(`${API}/wishlist/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast?.("Removed ✓");
    }
  };

  const filtered = filterPriority
    ? items.filter(i => i.priority === filterPriority)
    : items;

  const counts = { 1: items.filter(i=>i.priority===1).length, 2: items.filter(i=>i.priority===2).length, 3: items.filter(i=>i.priority===3).length };

  return (
    <>
      <style>{css}</style>

      <div className="wl-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
        {[1,2,3].map(p => (
          <button key={p}
            className={`priority-btn ${filterPriority===p?"active":""}`}
            onClick={() => setFilterPriority(filterPriority===p ? null : p)}
          >
            {p===1?"🔴":p===2?"🟡":"⚪"} {PRIORITY_LABELS[p]} {counts[p]>0 && `(${counts[p]})`}
          </button>
        ))}
        <span className="wl-count">{filtered.length} item{filtered.length!==1?"s":""}</span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading wishlist...</div>
      ) : (
        <div className="wl-grid">
          {filtered.length === 0 ? (
            <div className="wl-empty">
              <span style={{fontSize:48,opacity:0.3}}>🌟</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"var(--text2)"}}>
                {items.length === 0 ? "Your wishlist is empty" : "No items match this filter"}
              </span>
            </div>
          ) : (
            filtered
              .sort((a,b) => a.priority - b.priority)
              .map(item => {
                const img = imgSrc(item);
                return (
                  <div key={item.id} className="wl-card" onClick={() => setActiveItem(item)}>
                    <div className="wl-card-img">
                      {img
                        ? <img src={img} alt={item.name} onError={e => e.target.style.display="none"} />
                        : <span className="wl-card-img-placeholder">🌟</span>
                      }
                    </div>
                    <div className="wl-card-body">
                      <div className="wl-brand">{item.brand}</div>
                      <div className="wl-name">{item.name}</div>
                      <div className="wl-meta">
                        {[item.concentration, item.size_ml ? `${item.size_ml}ml` : null]
                          .filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <div className="wl-footer">
                      <PriorityDots value={item.priority} />
                      {item.target_price
                        ? <span className="wl-price">Target: <span>${item.target_price}</span></span>
                        : <span />
                      }
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {activeItem && (
        <WishlistDrawer
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onUpdate={updateItem}
          onDelete={removeItem}
          onPurchased={markPurchased}
          toast={toast}
        />
      )}

      {showAdd && (
        <AddWishlistModal
          onClose={() => setShowAdd(false)}
          onAdd={addItem}
          toast={toast}
        />
      )}
    </>
  );
}
