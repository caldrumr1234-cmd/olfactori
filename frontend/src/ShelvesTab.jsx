import { useState, useEffect, useCallback, useRef } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const SHELF_COLORS = [
  "#7aabff", "#a78bfa", "#f472b6", "#34d399", "#fbbf24",
  "#f87171", "#38bdf8", "#fb923c", "#a3e635", "#e879f9",
];

const SHELF_ICONS = [
  "🧴", "🌹", "🌿", "🌊", "🔥", "🍋", "🌙", "⭐", "🏔", "🌸",
  "🍂", "🫧", "💎", "🎋", "🌾", "🍵", "🌺", "🦋", "❄️", "🎩",
];

function getHeaders(token) {
  const tok = token || sessionStorage.getItem("olfactori_token");
  return { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
}

function ColorIconPicker({ color, icon, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div>
        <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.3rem" }}>Color</div>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {SHELF_COLORS.map(c => (
            <div key={c} onClick={() => onChange({ color: c, icon })}
              style={{ width: "22px", height: "22px", borderRadius: "50%", background: c, cursor: "pointer",
                boxShadow: color === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : "none", transition: "box-shadow 0.15s" }} />
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.3rem" }}>Icon</div>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {SHELF_ICONS.map(ic => (
            <span key={ic} onClick={() => onChange({ color, icon: ic })}
              style={{ fontSize: "1.1rem", cursor: "pointer", padding: "2px 4px", borderRadius: "6px",
                background: icon === ic ? "rgba(255,255,255,0.15)" : "transparent",
                outline: icon === ic ? `2px solid ${color}` : "none", transition: "background 0.1s" }}>
              {ic}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShelfCard({ shelf, allFragrances, token, onUpdate, onDelete, onReorderUp, onReorderDown, isFirst, isLast }) {
  const [expanded, setExpanded]       = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editName, setEditName]       = useState(shelf.name);
  const [editColor, setEditColor]     = useState(shelf.color);
  const [editIcon, setEditIcon]       = useState(shelf.icon);
  const [saving, setSaving]           = useState(false);
  const [showPicker, setShowPicker]   = useState(false);
  const [showAddFrag, setShowAddFrag] = useState(false);
  const [fragSearch, setFragSearch]   = useState("");
  const dragItem     = useRef(null);
  const dragOverItem = useRef(null);

  const saveEdits = async () => {
    setSaving(true);
    const res = await fetch(`${API}/shelves/${shelf.id}`, {
      method: "PATCH", headers: getHeaders(token),
      body: JSON.stringify({ name: editName, color: editColor, icon: editIcon }),
    });
    if (res.ok) onUpdate(await res.json());
    setSaving(false);
    setEditing(false);
    setShowPicker(false);
  };

  const removeFrag = async (fragId) => {
    await fetch(`${API}/shelves/${shelf.id}/fragrances/${fragId}`, { method: "DELETE", headers: getHeaders(token) });
    onUpdate({ ...shelf, fragrances: shelf.fragrances.filter(f => f.id !== fragId) });
  };

  const addFrag = async (frag) => {
    const existing = shelf.fragrances.map(f => f.id);
    if (existing.includes(frag.id)) return;
    const newIds = [...existing, frag.id];
    const res = await fetch(`${API}/shelves/${shelf.id}/fragrances`, {
      method: "PUT", headers: getHeaders(token), body: JSON.stringify({ fragrance_ids: newIds }),
    });
    if (res.ok) {
      const updatedFrags = await res.json();
      onUpdate({ ...shelf, fragrances: updatedFrags });
    }
    setFragSearch("");
    setShowAddFrag(false);
  };

  const handleFragDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...shelf.fragrances];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, moved);
    dragItem.current = null;
    dragOverItem.current = null;
    onUpdate({ ...shelf, fragrances: reordered });
    await fetch(`${API}/shelves/${shelf.id}/fragrances/reorder`, {
      method: "POST", headers: getHeaders(token),
      body: JSON.stringify({ ordered_fragrance_ids: reordered.map(f => f.id) }),
    });
  };

  const filteredFrags = allFragrances.filter(f => {
    const q = fragSearch.toLowerCase();
    const alreadyOn = shelf.fragrances.some(sf => sf.id === f.id);
    return !alreadyOn && (!q || f.name?.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q));
  });

  return (
    <div style={{ background: "var(--bg2)", border: `1px solid ${shelf.color}44`, borderRadius: "14px", overflow: "hidden", marginBottom: "0.75rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", cursor: "pointer",
        borderLeft: `4px solid ${shelf.color}`, background: `linear-gradient(90deg, ${shelf.color}18 0%, transparent 60%)` }}>
        {/* Reorder arrows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <button onClick={e => { e.stopPropagation(); onReorderUp(); }} disabled={isFirst} style={arrowBtn}>▲</button>
          <button onClick={e => { e.stopPropagation(); onReorderDown(); }} disabled={isLast} style={arrowBtn}>▼</button>
        </div>

        <span style={{ fontSize: "1.4rem" }}>{shelf.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpanded(v => !v)}>
          {editing ? (
            <input value={editName} onChange={e => setEditName(e.target.value)} onClick={e => e.stopPropagation()} autoFocus
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${shelf.color}`, color: "var(--text)", fontSize: "0.95rem", fontWeight: 600, outline: "none", width: "100%" }} />
          ) : (
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>{shelf.name}</span>
          )}
          <span style={{ fontSize: "0.75rem", color: "var(--text3)", marginLeft: "0.5rem" }}>
            {shelf.fragrances.length} fragrance{shelf.fragrances.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
          {!editing ? (
            <>
              <button onClick={e => { e.stopPropagation(); setEditing(true); setExpanded(true); }} style={iconBtn}>✏️</button>
              <button onClick={e => { e.stopPropagation(); if (confirm(`Delete shelf "${shelf.name}"?`)) onDelete(shelf.id); }} style={iconBtn}>🗑</button>
            </>
          ) : (
            <>
              <button onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }} style={iconBtn}>🎨</button>
              <button onClick={e => { e.stopPropagation(); saveEdits(); }} disabled={saving} style={{ ...iconBtn, color: shelf.color }}>
                {saving ? "…" : "✓"}
              </button>
              <button onClick={e => { e.stopPropagation(); setEditing(false); setShowPicker(false); setEditName(shelf.name); setEditColor(shelf.color); setEditIcon(shelf.icon); }} style={iconBtn}>✕</button>
            </>
          )}
          <button onClick={() => setExpanded(v => !v)} style={{ ...iconBtn, fontSize: "0.7rem" }}>
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Color/icon picker */}
      {editing && showPicker && (
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)", background: "var(--bg2)" }}>
          <ColorIconPicker color={editColor} icon={editIcon}
            onChange={({ color, icon }) => { setEditColor(color); setEditIcon(icon); }} />
        </div>
      )}

      {/* Fragrance grid */}
      {expanded && (
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
          {showAddFrag ? (
            <div style={{ marginBottom: "0.75rem", position: "relative" }}>
              <input autoFocus placeholder="Search to add…" value={fragSearch}
                onChange={e => setFragSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowAddFrag(false), 200)}
                style={{ ...inputStyle, borderColor: shelf.color }} />
              {fragSearch && (
                <div style={{ position: "absolute", zIndex: 10, top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: "200px", overflowY: "auto", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  {filteredFrags.slice(0, 20).map(f => (
                    <div key={f.id} onMouseDown={() => addFrag(f)}
                      style={{ padding: "0.45rem 0.75rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{f.brand}</span> {f.name}
                    </div>
                  ))}
                  {filteredFrags.length === 0 && <div style={{ padding: "0.5rem 0.75rem", color: "var(--text3)", fontSize: "0.82rem" }}>No matches</div>}
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAddFrag(true)}
              style={{ ...iconBtn, marginBottom: "0.75rem", fontSize: "0.8rem", color: shelf.color, borderColor: `${shelf.color}66`, padding: "0.3rem 0.8rem" }}>
              + Add Fragrance
            </button>
          )}

          {shelf.fragrances.length === 0 ? (
            <p style={{ color: "var(--text3)", fontSize: "0.82rem", margin: 0 }}>No fragrances yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {shelf.fragrances.map((f, i) => (
                <div key={f.id} draggable
                  onDragStart={() => { dragItem.current = i; }}
                  onDragEnter={() => { dragOverItem.current = i; }}
                  onDragEnd={handleFragDragEnd}
                  onDragOver={e => e.preventDefault()}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem",
                    background: `${shelf.color}22`, border: `1px solid ${shelf.color}55`,
                    borderRadius: "20px", padding: "0.25rem 0.6rem 0.25rem 0.75rem",
                    fontSize: "0.8rem", color: "var(--text)", cursor: "grab", userSelect: "none" }}>
                  <span style={{ color: "var(--text3)", fontSize: "0.72rem" }}>⠿</span>
                  {f.brand && <span style={{ color: "var(--text3)", fontSize: "0.72rem" }}>{f.brand} –</span>}
                  {f.name}
                  <button onClick={() => removeFrag(f.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.7rem", padding: "0 0 0 2px", lineHeight: 1 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShelvesTab({ token }) {
  const [shelves, setShelves]     = useState([]);
  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [newName, setNewName]     = useState("");
  const [newColor, setNewColor]   = useState(SHELF_COLORS[0]);
  const [newIcon, setNewIcon]     = useState(SHELF_ICONS[0]);
  const [creating, setCreating]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, fr] = await Promise.all([
        fetch(`${API}/shelves`, { headers: getHeaders(token) }),
        fetch(`${API}/fragrances?limit=2000`),
      ]);
      if (sr.ok) setShelves(await sr.json());
      if (fr.ok) {
        const data = await fr.json();
        setFragrances(data.items || data);
      }
    } catch (e) {
      console.error("ShelvesTab load error:", e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch(`${API}/shelves`, {
      method: "POST", headers: getHeaders(token),
      body: JSON.stringify({ name: newName.trim(), color: newColor, icon: newIcon }),
    });
    if (res.ok) {
      const newShelf = await res.json();
      setShelves(prev => [...prev, newShelf]);
      setNewName(""); setNewColor(SHELF_COLORS[0]); setNewIcon(SHELF_ICONS[0]);
      setShowNew(false);
    }
    setCreating(false);
  };

  const handleUpdate = (updated) => setShelves(prev => prev.map(s => s.id === updated.id ? updated : s));

  const handleDelete = async (id) => {
    await fetch(`${API}/shelves/${id}`, { method: "DELETE", headers: getHeaders(token) });
    setShelves(prev => prev.filter(s => s.id !== id));
  };

  const reorder = async (index, direction) => {
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= shelves.length) return;
    const reordered = [...shelves];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setShelves(reordered);
    await fetch(`${API}/shelves/reorder`, {
      method: "POST", headers: getHeaders(token),
      body: JSON.stringify({ ordered_ids: reordered.map(s => s.id) }),
    });
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text)" }}>
          🗄 Shelves
          <span style={{ fontSize: "0.8rem", color: "var(--text3)", fontWeight: 400, marginLeft: "0.5rem" }}>
            {shelves.length} shelf{shelves.length !== 1 ? "ves" : ""}
          </span>
        </h2>
        <button onClick={() => setShowNew(v => !v)}
          style={{ background: "var(--violet)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.85rem" }}>
          {showNew ? "✕ Cancel" : "+ New Shelf"}
        </button>
      </div>

      {showNew && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={labelStyle}>Shelf name *</label>
            <input autoFocus placeholder="e.g. Summer Rotation" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              style={inputStyle} />
          </div>
          <ColorIconPicker color={newColor} icon={newIcon}
            onChange={({ color, icon }) => { setNewColor(color); setNewIcon(icon); }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${newColor}33`, border: `2px solid ${newColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
              {newIcon}
            </div>
            <span style={{ color: "var(--text3)", fontSize: "0.82rem" }}>{newName || "Untitled shelf"}</span>
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              style={{ marginLeft: "auto", background: "var(--violet)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.45rem 1.2rem", cursor: "pointer", fontSize: "0.88rem", opacity: !newName.trim() ? 0.5 : 1 }}>
              {creating ? "Creating…" : "Create Shelf"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--text3)" }}>Loading…</p>
      ) : shelves.length === 0 ? (
        <p style={{ color: "var(--text3)", textAlign: "center", padding: "3rem 1rem" }}>
          No shelves yet. Create one to start grouping your collection.
        </p>
      ) : (
        shelves.map((shelf, i) => (
          <ShelfCard key={shelf.id} shelf={shelf} allFragrances={fragrances} token={token}
            onUpdate={handleUpdate} onDelete={handleDelete}
            onReorderUp={() => reorder(i, -1)} onReorderDown={() => reorder(i, 1)}
            isFirst={i === 0} isLast={i === shelves.length - 1} />
        ))
      )}
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.5rem 0.75rem", color: "var(--text)", fontSize: "0.88rem" };
const labelStyle = { display: "block", fontSize: "0.78rem", color: "var(--text3)", marginBottom: "0.3rem" };
const iconBtn    = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text3)" };
const arrowBtn   = { background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.65rem", lineHeight: 1, padding: "1px 3px", opacity: 0.7 };
