import { useState, useEffect, useCallback } from "react";

const API = "https://olfactori-production.up.railway.app/api";

export default function SentSamplesSection({ token }) {
  const [samples, setSamples]           = useState([]);
  const [fragrances, setFragrances]     = useState([]);
  const [friends, setFriends]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [fragSearch, setFragSearch]     = useState("");
  const [form, setForm]                 = useState({ fragrance_id: "", friend_name: "", friend_email: "", notes: "" });
  const [saving, setSaving]             = useState(false);
  const [filterFriend, setFilterFriend] = useState("all");

  const tok = token || sessionStorage.getItem("olfactori_token");
  const headers = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sampRes, fragRes, friendRes] = await Promise.all([
        fetch(`${API}/sent-samples`, { headers }),
        fetch(`${API}/fragrances`, { headers }),
        fetch(`${API}/friends/invites`, { headers }),
      ]);
      if (sampRes.ok)   setSamples(await sampRes.json());
      if (fragRes.ok) {
        const data = await fragRes.json();
        setFragrances(data.items || data);
      }
      if (friendRes.ok) setFriends(await friendRes.json());
    } catch (e) {
      console.error("SentSamples load error:", e);
    }
    setLoading(false);
  }, [tok]);

  useEffect(() => { load(); }, [load]);

  const filteredFragrances = fragrances.filter(f => {
    const q = fragSearch.toLowerCase();
    return !q || f.name?.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q);
  });

  const handleSubmit = async () => {
    if (!form.fragrance_id || !form.friend_name) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/sent-samples`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fragrance_id: parseInt(form.fragrance_id),
          friend_name: form.friend_name,
          friend_email: form.friend_email || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        const newSample = await res.json();
        setSamples(prev => [newSample, ...prev]);
        setForm({ fragrance_id: "", friend_name: "", friend_email: "", notes: "" });
        setFragSearch("");
        setShowForm(false);
      }
    } catch (e) {
      console.error("SentSamples save error:", e);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this sent sample record?")) return;
    const res = await fetch(`${API}/sent-samples/${id}`, { method: "DELETE", headers });
    if (res.ok) setSamples(prev => prev.filter(s => s.id !== id));
  };

  const uniqueFriends = [...new Set(samples.map(s => s.friend_name))].sort();
  const displaySamples = filterFriend === "all"
    ? samples
    : samples.filter(s => s.friend_name === filterFriend);

  const grouped = displaySamples.reduce((acc, s) => {
    if (!acc[s.friend_name]) acc[s.friend_name] = [];
    acc[s.friend_name].push(s);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: "var(--text2)" }}>
          {samples.length} record{samples.length !== 1 ? "s" : ""}
        </span>
        <button onClick={() => setShowForm(v => !v)} className="btn btn-primary btn-sm">
          {showForm ? "✕ Cancel" : "+ Log Sent Sample"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Fragrance *</label>
            <input
              placeholder="Search by name or brand…"
              value={fragSearch}
              onChange={e => { setFragSearch(e.target.value); setForm(f => ({ ...f, fragrance_id: "" })); }}
              style={inputStyle}
            />
            {fragSearch && !form.fragrance_id && (
              <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, marginTop: 4, background: "var(--bg2)" }}>
                {filteredFragrances.slice(0, 30).map(f => (
                  <div key={f.id}
                    onClick={() => { setForm(prev => ({ ...prev, fragrance_id: f.id })); setFragSearch(`${f.brand} – ${f.name}`); }}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: "var(--text3)", fontSize: 11 }}>{f.brand}</span>{" "}{f.name}
                  </div>
                ))}
                {filteredFragrances.length === 0 && (
                  <div style={{ padding: "8px 12px", color: "var(--text3)", fontSize: 13 }}>No matches</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Friend *</label>
            <input
              list="sent-friend-list"
              placeholder="Name…"
              value={form.friend_name}
              onChange={e => setForm(f => ({ ...f, friend_name: e.target.value }))}
              style={inputStyle}
            />
            <datalist id="sent-friend-list">
              {friends.map(fr => <option key={fr.token || fr.name} value={fr.name} />)}
            </datalist>
          </div>

          <div>
            <label style={labelStyle}>Email (optional)</label>
            <input
              placeholder="friend@email.com"
              value={form.friend_email}
              onChange={e => setForm(f => ({ ...f, friend_email: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              placeholder="Any notes about this shipment…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.fragrance_id || !form.friend_name}
              className="btn btn-primary"
              style={{ opacity: (!form.fragrance_id || !form.friend_name) ? 0.5 : 1 }}
            >
              {saving ? "Saving…" : "Log Sample"}
            </button>
          </div>
        </div>
      )}

      {/* Friend filter pills */}
      {uniqueFriends.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {["all", ...uniqueFriends].map(f => (
            <button key={f} onClick={() => setFilterFriend(f)}
              className={`filter-tab ${filterFriend === f ? "active" : ""}`}>
              {f === "all" ? "All friends" : f}
            </button>
          ))}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div style={{ color: "var(--text3)", fontSize: 13 }}>Loading…</div>
      ) : samples.length === 0 ? (
        <div className="empty-section">
          No sent samples logged yet. Use the button above to start tracking.
        </div>
      ) : (
        Object.entries(grouped).map(([friendName, friendSamples]) => (
          <div key={friendName} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--blue)", fontWeight: 600, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              👤 {friendName}
              <span style={{ marginLeft: 6, color: "var(--text3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                · {friendSamples.length} sample{friendSamples.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {friendSamples.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                      {s.fragrance_brand && <span style={{ color: "var(--text3)", fontWeight: 400 }}>{s.fragrance_brand} – </span>}
                      {s.fragrance_name}
                    </div>
                    {s.notes && (
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3, fontStyle: "italic" }}>{s.notes}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap", marginTop: 2 }}>{s.sent_at}</div>
                  <button onClick={() => handleDelete(s.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 12, padding: "0 2px", lineHeight: 1 }}
                    title="Remove record">✕</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 13, fontFamily: "var(--sans)", outline: "none" };
const labelStyle = { display: "block", fontSize: 11, color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" };
