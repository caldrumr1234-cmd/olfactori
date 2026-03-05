// WishlistTab.jsx — drop into frontend/src/
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api/";

const css = `
  .wl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }
  .wl-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    transition: all 0.2s;
  }
  .wl-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .wl-card-body { padding: 16px; }
  .wl-brand { font-size: 10px; color: var(--text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 3px; }
  .wl-name { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 300; color: var(--text); margin-bottom: 10px; line-height: 1.3; }
  .wl-meta { font-size: 12px; color: var(--text3); margin-bottom: 10px; }
  .wl-notes { font-size: 12px; color: var(--text2); margin-bottom: 12px; font-style: italic; line-height: 1.5; }
  .wl-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-top: 1px solid var(--border); background: var(--bg3); }
  .wl-priority { display: flex; gap: 3px; }
  .wl-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border2); }
  .wl-dot.active { background: var(--gold); }
  .wl-actions { display: flex; gap: 6px; }
  .wl-price { font-size: 12px; color: var(--text3); }
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
  .wl-link { font-size: 11px; color: var(--blue); text-decoration: none; }
  .wl-link:hover { text-decoration: underline; }
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

function AddWishlistModal({ onClose, onAdd, toast }) {
  const [form, setForm] = useState({
    brand: "", name: "", concentration: "", size_ml: "",
    notes: "", priority: 2, target_price: "", fragrantica_url: ""
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
      toast("Added to wishlist ✓");
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
  const [filterPriority, setFilterPriority] = useState(null);

  useEffect(() => {
    fetch(`${API}/wishlist`)
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addItem = (item) => setItems(prev => [item, ...prev]);

  const markPurchased = async (id) => {
    if (!window.confirm("Mark this as purchased? It will be removed from your wishlist.")) return;
    const res = await fetch(`${API}/wishlist/${id}/purchased`, { method: "PATCH" });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast("Marked as purchased ✓");
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Remove from wishlist?")) return;
    const res = await fetch(`${API}/wishlist/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast("Removed ✓");
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
              {items.length === 0 && (
                <span style={{fontSize:13,maxWidth:300,lineHeight:1.5}}>
                  Add fragrances you want to try or buy.
                </span>
              )}
            </div>
          ) : (
            filtered
              .sort((a,b) => a.priority - b.priority)
              .map(item => (
                <div key={item.id} className="wl-card">
                  <div className="wl-card-body">
                    <div className="wl-brand">{item.brand}</div>
                    <div className="wl-name">{item.name}</div>
                    <div className="wl-meta">
                      {[item.concentration, item.size_ml ? `${item.size_ml}ml` : null]
                        .filter(Boolean).join(" · ") || "—"}
                    </div>
                    {item.notes && <div className="wl-notes">"{item.notes}"</div>}
                    {item.fragrantica_url && (
                      <a className="wl-link" href={item.fragrantica_url} target="_blank" rel="noreferrer">
                        View on Fragrantica ↗
                      </a>
                    )}
                  </div>
                  <div className="wl-footer">
                    <PriorityDots value={item.priority} />
                    {item.target_price
                      ? <span className="wl-price">Target: <span>${item.target_price}</span></span>
                      : <span />
                    }
                    <div className="wl-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => markPurchased(item.id)} title="Mark purchased">✓</button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.id)} title="Remove">✕</button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
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
