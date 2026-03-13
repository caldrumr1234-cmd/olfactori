import { useState, useEffect, useCallback } from "react";

const API = "https://olfactori-production.up.railway.app/api";

function VolumeBar({ remaining, total }) {
  if (!total) return null;
  const pct = Math.min(100, Math.max(0, (remaining / total) * 100));
  const color = pct > 60 ? "#4ade80" : pct > 25 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ marginTop: "0.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.2rem" }}>
        <span>{remaining.toFixed(1)} ml left</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: "4px", background: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "999px", transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

function DecantCard({ decant, token, onUpdate, onDelete }) {
  const [editing, setEditing]     = useState(false);
  const [volInput, setVolInput]   = useState(decant.volume_remaining_ml ?? "");
  const [sizeInput, setSizeInput] = useState(decant.size_ml ?? "");
  const [saving, setSaving]       = useState(false);

  const imgSrc = decant.custom_image_url || decant.fragella_image_url;

  const save = async () => {
    setSaving(true);
    const tok = token || sessionStorage.getItem("olfactori_token");
    const headers = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
    const body = {};
    const newVol  = volInput  === "" ? null : parseFloat(volInput);
    const newSize = sizeInput === "" ? null : parseFloat(sizeInput);
    if (newVol  !== (decant.volume_remaining_ml ?? null)) body.volume_remaining_ml = newVol;
    if (newSize !== (decant.size_ml ?? null))             body.size_ml             = newSize;
    if (Object.keys(body).length) {
      const res = await fetch(`${API}/decants/${decant.id}`, {
        method: "PATCH", headers, body: JSON.stringify(body),
      });
      if (res.ok) onUpdate(await res.json());
    }
    setSaving(false);
    setEditing(false);
  };

  const imgBox = { height: "110px", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={imgBox}>
        {imgSrc
          ? <img src={imgSrc} alt={decant.fragrance_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "2rem" }}>🧴</span>}
      </div>
      <div style={{ padding: "0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{decant.fragrance_brand}</div>
        <div style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, lineHeight: 1.2 }}>{decant.fragrance_name}</div>
        {!editing ? (
          <>
            {decant.volume_remaining_ml != null && decant.size_ml != null
              ? <VolumeBar remaining={decant.volume_remaining_ml} total={decant.size_ml} />
              : decant.volume_remaining_ml != null
              ? <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: "0.3rem" }}>{decant.volume_remaining_ml} ml remaining</div>
              : decant.size_ml != null
              ? <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: "0.3rem" }}>{decant.size_ml} ml</div>
              : null}
            {decant.source && <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.1rem" }}>📦 {decant.source}</div>}
            {decant.notes  && <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.1rem", fontStyle: "italic" }}>{decant.notes}</div>}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.3rem" }}>
            <label style={labelStyle}>Total size (ml)</label>
            <input type="number" min="0" step="0.5" value={sizeInput} onChange={e => setSizeInput(e.target.value)} style={inputSm} placeholder="e.g. 10" />
            <label style={labelStyle}>Volume remaining (ml)</label>
            <input type="number" min="0" step="0.1" value={volInput}  onChange={e => setVolInput(e.target.value)}  style={inputSm} placeholder="e.g. 7.5" />
          </div>
        )}
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto", paddingTop: "0.5rem" }}>
          {!editing
            ? <button onClick={() => setEditing(true)} style={btnSmStyle}>✏️ Edit</button>
            : <>
                <button onClick={save} disabled={saving} style={{ ...btnSmStyle, background: "var(--violet)", color: "#fff" }}>{saving ? "…" : "Save"}</button>
                <button onClick={() => setEditing(false)} style={btnSmStyle}>Cancel</button>
              </>}
          <button onClick={() => { if (confirm("Delete this decant?")) onDelete(decant.id); }} style={{ ...btnSmStyle, marginLeft: "auto", color: "#f87171" }}>🗑</button>
        </div>
      </div>
    </div>
  );
}

function SampleCard({ sample, token, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const imgSrc = sample.custom_image_url || sample.fragella_image_url;

  const handleDelete = async () => {
    if (!confirm("Delete this sample?")) return;
    setDeleting(true);
    const tok = token || sessionStorage.getItem("olfactori_token");
    await fetch(`${API}/decants/${sample.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tok}` },
    });
    onDelete(sample.id);
  };

  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "110px", background: "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {imgSrc
          ? <img src={imgSrc} alt={sample.fragrance_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "2rem" }}>🫙</span>}
      </div>
      <div style={{ padding: "0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{sample.fragrance_brand}</div>
        <div style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, lineHeight: 1.2 }}>{sample.fragrance_name}</div>
        {sample.size_ml && <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: "0.2rem" }}>{sample.size_ml} ml</div>}
        {sample.source  && <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>📦 {sample.source}</div>}
        {sample.notes   && <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontStyle: "italic" }}>{sample.notes}</div>}
        <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
          <button onClick={handleDelete} disabled={deleting} style={{ ...btnSmStyle, color: "#f87171" }}>🗑 {deleting ? "…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

export default function DecantsTab({ token }) {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("decants");
  const [showForm, setShowForm]     = useState(false);
  const [fragrances, setFragrances] = useState([]);
  const [fragSearch, setFragSearch] = useState("");
  const [form, setForm]             = useState({ fragrance_id: "", type: "decant", size_ml: "", volume_remaining_ml: "", source: "", notes: "" });
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const tok = token || sessionStorage.getItem("olfactori_token");
    const authHeaders = { Authorization: `Bearer ${tok}` };
    try {
      const [dr, fr] = await Promise.all([
        fetch(`${API}/decants`, { headers: authHeaders }),
        fetch(`${API}/fragrances?limit=2000`),
      ]);
      if (dr.ok) setItems(await dr.json());
      if (fr.ok) {
        const data = await fr.json();
        setFragrances(data.items || data);
      }
    } catch (e) {
      console.error("DecantsTab load error:", e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = (updated) => setItems(prev => prev.map(d => d.id === updated.id ? updated : d));
  const handleDelete = (id) => setItems(prev => prev.filter(d => d.id !== id));

  const handleSubmit = async () => {
    if (!form.fragrance_id) return;
    setSaving(true);
    const tok = token || sessionStorage.getItem("olfactori_token");
    const headers = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };
    const body = {
      fragrance_id:        parseInt(form.fragrance_id),
      type:                form.type || "decant",
      size_ml:             form.size_ml             === "" ? null : parseFloat(form.size_ml),
      volume_remaining_ml: form.volume_remaining_ml === "" ? null : parseFloat(form.volume_remaining_ml),
      source:              form.source  || null,
      notes:               form.notes   || null,
    };
    const res = await fetch(`${API}/decants`, { method: "POST", headers, body: JSON.stringify(body) });
    if (res.ok) {
      const newItem = await res.json();
      setItems(prev => [...prev, newItem]);
      setForm({ fragrance_id: "", type: "decant", size_ml: "", volume_remaining_ml: "", source: "", notes: "" });
      setFragSearch("");
      setShowForm(false);
    }
    setSaving(false);
  };

  const decants = items.filter(i => (i.type || "decant") === "decant");
  const samples = items.filter(i => i.type === "sample");

  const activeItems = activeTab === "decants" ? decants : samples;
  const filtered = activeItems.filter(d => {
    const q = search.toLowerCase();
    return !q || d.fragrance_name?.toLowerCase().includes(q) || d.fragrance_brand?.toLowerCase().includes(q);
  });

  const filteredFrags = fragrances.filter(f => {
    const q = fragSearch.toLowerCase();
    return q && (f.name?.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q));
  });

  return (
    <div style={{ padding: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text)" }}>
          🧪 Decants &amp; Samples
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ background: "var(--violet)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.85rem" }}
        >
          {showForm ? "✕ Cancel" : `+ Add ${activeTab === "decants" ? "Decant" : "Sample"}`}
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {["decants", "samples"].map(t => (
          <button key={t} onClick={() => { setActiveTab(t); setShowForm(false); }}
            style={{
              background: activeTab === t ? "var(--violet)" : "var(--bg2)",
              color: activeTab === t ? "#fff" : "var(--text3)",
              border: "1px solid var(--border)", borderRadius: "8px",
              padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.82rem", fontWeight: activeTab === t ? 600 : 400,
              textTransform: "capitalize",
            }}>
            {t} ({t === "decants" ? decants.length : samples.length})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        placeholder={`Search ${activeTab}…`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.5rem 0.75rem", color: "var(--text)", fontSize: "0.88rem", marginBottom: "1rem" }}
      />

      {/* Add form */}
      {showForm && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Fragrance *</label>
            <input
              placeholder="Search your collection…"
              value={fragSearch}
              onChange={e => { setFragSearch(e.target.value); setForm(f => ({ ...f, fragrance_id: "" })); }}
              style={inputStyle}
            />
            {fragSearch && !form.fragrance_id && filteredFrags.length > 0 && (
              <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", marginTop: "0.3rem", background: "var(--bg2)" }}>
                {filteredFrags.slice(0, 30).map(f => (
                  <div key={f.id}
                    onClick={() => { setForm(prev => ({ ...prev, fragrance_id: f.id })); setFragSearch(`${f.brand} – ${f.name}`); }}
                    style={{ padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{f.brand}</span> {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Total size (ml)</label>
            <input type="number" min="0" step="0.5" placeholder="10" value={form.size_ml} onChange={e => setForm(f => ({ ...f, size_ml: e.target.value }))} style={inputStyle} />
          </div>
          {activeTab === "decants" && (
            <div>
              <label style={labelStyle}>Volume remaining (ml)</label>
              <input type="number" min="0" step="0.1" placeholder="10" value={form.volume_remaining_ml} onChange={e => setForm(f => ({ ...f, volume_remaining_ml: e.target.value }))} style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Source</label>
            <input placeholder="e.g. Reddit r/fragrance" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input placeholder="Any notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.fragrance_id}
              style={{ background: "var(--violet)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 1.4rem", cursor: form.fragrance_id ? "pointer" : "not-allowed", fontSize: "0.9rem", opacity: !form.fragrance_id ? 0.5 : 1 }}
            >
              {saving ? "Saving…" : `Add ${activeTab === "decants" ? "Decant" : "Sample"}`}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <p style={{ color: "var(--text3)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text3)", textAlign: "center", padding: "2rem" }}>
          {activeItems.length === 0 ? `No ${activeTab} yet. Add one above.` : "No results for that search."}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
          {filtered.map(d =>
            activeTab === "decants"
              ? <DecantCard key={d.id} decant={d} token={token} onUpdate={handleUpdate} onDelete={handleDelete} />
              : <SampleCard key={d.id} sample={d} token={token} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.5rem 0.75rem", color: "var(--text)", fontSize: "0.88rem" };
const inputSm    = { ...inputStyle, padding: "0.35rem 0.6rem", fontSize: "0.82rem" };
const labelStyle = { display: "block", fontSize: "0.78rem", color: "var(--text3)", marginBottom: "0.3rem" };
const btnSmStyle = { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.25rem 0.6rem", cursor: "pointer", fontSize: "0.75rem", color: "var(--text3)" };
