// DecantsTab.jsx — Decants & Samples inventory
import { useState, useEffect, useRef } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .dec-toolbar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .dec-toggle {
    display: flex; background: var(--bg3);
    border: 1px solid var(--border); border-radius: 10px;
    overflow: hidden; flex-shrink: 0;
  }
  .dec-toggle-btn {
    padding: 8px 20px; font-size: 13px; font-weight: 500;
    background: none; border: none; color: var(--text3);
    cursor: pointer; transition: all 0.15s;
  }
  .dec-toggle-btn.active {
    background: var(--gold); color: var(--bg);
  }
  .dec-search {
    flex: 1; min-width: 180px;
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: 10px; padding: 8px 14px;
    color: var(--text); font-size: 13px;
  }
  .dec-search:focus { outline: none; border-color: var(--gold); }
  .dec-add-btn {
    background: var(--gold); color: var(--bg);
    border: none; border-radius: 10px;
    padding: 8px 18px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .dec-add-btn:hover { background: var(--gold2); }

  /* TABLE */
  .dec-table-wrap { overflow-x: auto; }
  .dec-table {
    width: 100%; border-collapse: collapse;
    font-size: 13px;
  }
  .dec-table th {
    text-align: left; font-size: 10px; font-weight: 600;
    color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em;
    padding: 8px 12px; border-bottom: 1px solid var(--border);
  }
  .dec-table td {
    padding: 10px 12px; border-bottom: 1px solid var(--border);
    color: var(--text2); vertical-align: middle;
  }
  .dec-table tr:last-child td { border-bottom: none; }
  .dec-table tr:hover td { background: var(--bg3); }
  .dec-table tr.editing td { background: var(--bg3); }

  .dec-brand { font-weight: 600; color: var(--gold); font-size: 12px; }
  .dec-name  { color: var(--text); font-weight: 500; }
  .dec-in-coll {
    display: inline-block;
    font-size: 10px; background: rgba(201,168,76,0.08);
    color: var(--gold); border: 1px solid rgba(201,168,76,0.3);
    border-radius: 6px; padding: 1px 6px; margin-left: 6px;
    cursor: pointer; transition: background 0.15s;
  }
  .dec-in-coll:hover { background: rgba(201,168,76,0.3); }

  /* INLINE EDIT */
  .dec-input {
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: 6px; padding: 5px 8px;
    color: var(--text); font-size: 13px; width: 100%;
  }
  .dec-input:focus { outline: none; border-color: var(--gold); }
  .dec-select {
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: 6px; padding: 5px 8px;
    color: var(--text); font-size: 13px;
  }
  .dec-select:focus { outline: none; border-color: var(--gold); }

  .dec-action-btn {
    background: none; border: none; cursor: pointer;
    font-size: 15px; padding: 2px 5px; border-radius: 5px;
    transition: background 0.15s;
  }
  .dec-action-btn:hover { background: var(--bg3); }

  .dec-empty {
    text-align: center; padding: 60px 20px;
    color: var(--text3); font-size: 14px;
  }
  .dec-count {
    font-size: 12px; color: var(--text3); margin-left: auto;
  }
  .dec-new-row td { background: rgba(201,168,76,0.06); }
`;

const CONC_OPTIONS = ["EDP","EDT","EDC","EDP Intense","Parfum","Parfum Extract","Hair Mist","Other"];

function EditableRow({ item, onSave, onCancel, onDelete, isNew, onOpenCollection }) {
  const [form, setForm] = useState({
    type:          item.type          || "decant",
    brand:         item.brand         || "",
    name:          item.name          || "",
    concentration: item.concentration || "",
    size_ml:       item.size_ml       != null ? String(item.size_ml) : "",
    quantity:      item.quantity      != null ? String(item.quantity) : "1",
    notes:         item.notes         || "",
  });
  const brandRef = useRef();
  useEffect(() => { if (isNew && brandRef.current) brandRef.current.focus(); }, [isNew]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.brand.trim() || !form.name.trim()) return;
    onSave({
      ...form,
      size_ml:  form.size_ml  ? parseFloat(form.size_ml)  : null,
      quantity: form.quantity ? parseInt(form.quantity)    : 1,
    });
  };

  const handleKey = (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") onCancel();
  };

  return (
    <tr className={`editing ${isNew ? "dec-new-row" : ""}`}>
      <td>
        <select className="dec-select" value={form.type} onChange={e => set("type", e.target.value)}>
          <option value="decant">Decant</option>
          <option value="sample">Sample</option>
        </select>
      </td>
      <td><input ref={brandRef} className="dec-input" value={form.brand} onChange={e => set("brand", e.target.value)} onKeyDown={handleKey} placeholder="House" /></td>
      <td><input className="dec-input" value={form.name} onChange={e => set("name", e.target.value)} onKeyDown={handleKey} placeholder="Fragrance name" /></td>
      <td>
        <select className="dec-select" value={form.concentration} onChange={e => set("concentration", e.target.value)}>
          <option value="">—</option>
          {CONC_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td><input className="dec-input" style={{width:70}} value={form.size_ml} onChange={e => set("size_ml", e.target.value)} onKeyDown={handleKey} placeholder="ml" type="number" min="0" /></td>
      <td><input className="dec-input" style={{width:60}} value={form.quantity} onChange={e => set("quantity", e.target.value)} onKeyDown={handleKey} placeholder="1" type="number" min="1" /></td>
      <td><input className="dec-input" value={form.notes} onChange={e => set("notes", e.target.value)} onKeyDown={handleKey} placeholder="Notes..." /></td>
      <td>
        <button className="dec-action-btn" onClick={save} title="Save">✓</button>
        <button className="dec-action-btn" onClick={onCancel} title="Cancel">✕</button>
        {!isNew && <button className="dec-action-btn" onClick={onDelete} title="Delete" style={{color:"var(--red)"}}>🗑</button>}
      </td>
    </tr>
  );
}

function ReadRow({ item, onEdit, onOpenCollection }) {
  return (
    <tr>
      <td>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 6,
          background: item.type === "sample" ? "rgba(106,176,212,0.15)" : "rgba(201,168,76,0.12)",
          color: item.type === "sample" ? "var(--blue)" : "var(--gold)",
          border: `1px solid ${item.type === "sample" ? "rgba(106,176,212,0.3)" : "rgba(201,168,76,0.25)"}`,
        }}>
          {item.type}
        </span>
      </td>
      <td><span className="dec-brand">{item.brand}</span></td>
      <td>
        <span className="dec-name">{item.name}</span>
        {item.in_collection && (
          <span className="dec-in-coll" onClick={() => onOpenCollection(item.in_collection)} title="In your collection — click to open">
            ✓ owned
          </span>
        )}
      </td>
      <td>{item.concentration || <span style={{color:"var(--text3)"}}>—</span>}</td>
      <td>{item.size_ml != null ? `${item.size_ml}ml` : <span style={{color:"var(--text3)"}}>—</span>}</td>
      <td>{item.quantity ?? 1}</td>
      <td style={{maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
        {item.notes || <span style={{color:"var(--text3)"}}>—</span>}
      </td>
      <td>
        <button className="dec-action-btn" onClick={onEdit} title="Edit">✏️</button>
      </td>
    </tr>
  );
}

export default function DecantsTab({ onOpenFrag }) {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [type,      setType]      = useState("all");   // all | decant | sample
  const [search,    setSearch]    = useState("");
  const [editingId, setEditingId] = useState(null);    // item id being edited
  const [addingNew, setAddingNew] = useState(false);

  const load = async (t = type, s = search) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (t !== "all") params.set("type", t);
    if (s) params.set("search", s);
    try {
      const res = await fetch(`${API}/decants?${params}`);
      const d   = await res.json();
      setItems(d.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTypeChange = (t) => { setType(t); load(t, search); };
  const handleSearch = (s) => { setSearch(s); load(type, s); };

  const handleAdd = async (form) => {
    const res = await fetch(`${API}/decants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const item = await res.json();
    setItems(prev => [...prev, item]);
    setAddingNew(false);
    await load(type, search);
  };

  const handleSave = async (id, form) => {
    const res = await fetch(`${API}/decants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    setEditingId(null);
    await load(type, search);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/decants/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setEditingId(null);
  };

  const handleOpenCollection = async (fragId) => {
    try {
      const res = await fetch(`${API}/fragrances/${fragId}`);
      const frag = await res.json();
      onOpenFrag(frag);
    } catch (e) { console.error(e); }
  };

  const decantCount = items.filter(i => i.type === "decant").length;
  const sampleCount = items.filter(i => i.type === "sample").length;

  return (
    <>
      <style>{css}</style>

      <div className="dec-toolbar">
        <div className="dec-toggle">
          {[["all","All"], ["decant","Decants"], ["sample","Samples"]].map(([val, lbl]) => (
            <button key={val} className={`dec-toggle-btn ${type === val ? "active" : ""}`}
              onClick={() => handleTypeChange(val)}>
              {lbl}
            </button>
          ))}
        </div>

        <input
          className="dec-search"
          placeholder="Search house or fragrance..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />

        <span className="dec-count">
          {decantCount} decant{decantCount !== 1 ? "s" : ""} · {sampleCount} sample{sampleCount !== 1 ? "s" : ""}
        </span>

        <button className="dec-add-btn" onClick={() => { setAddingNew(true); setEditingId(null); }}>
          + Add
        </button>
      </div>

      <div className="dec-table-wrap">
        <table className="dec-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>House</th>
              <th>Fragrance</th>
              <th>Conc.</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {addingNew && (
              <EditableRow
                isNew
                item={{ type: type !== "all" ? type : "decant" }}
                onSave={handleAdd}
                onCancel={() => setAddingNew(false)}
                onDelete={() => {}}
                onOpenCollection={handleOpenCollection}
              />
            )}
            {loading ? (
              <tr><td colSpan={8} style={{textAlign:"center",padding:"40px",color:"var(--text3)"}}>Loading...</td></tr>
            ) : items.length === 0 && !addingNew ? (
              <tr><td colSpan={8}>
                <div className="dec-empty">
                  No {type !== "all" ? type + "s" : "decants or samples"} yet.
                  {search && " Try clearing the search."}
                </div>
              </td></tr>
            ) : items.map(item =>
              editingId === item.id ? (
                <EditableRow
                  key={item.id}
                  item={item}
                  onSave={(form) => handleSave(item.id, form)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => handleDelete(item.id)}
                  onOpenCollection={handleOpenCollection}
                />
              ) : (
                <ReadRow
                  key={item.id}
                  item={item}
                  onEdit={() => { setEditingId(item.id); setAddingNew(false); }}
                  onOpenCollection={handleOpenCollection}
                />
              )
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
