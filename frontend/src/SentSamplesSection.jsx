import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "";

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

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sampRes, fragRes, friendRes] = await Promise.all([
        fetch(`${API}/api/admin/sent-samples`, { headers }),
        fetch(`${API}/api/fragrances`, { headers }),
        fetch(`${API}/api/admin/friends`, { headers }),
      ]);
      if (sampRes.ok)   setSamples(await sampRes.json());
      if (fragRes.ok)   setFragrances(await fragRes.json());
      if (friendRes.ok) setFriends(await friendRes.json());
    } catch (e) {
      console.error("SentSamples load error:", e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filteredFragrances = fragrances.filter(f => {
    const q = fragSearch.toLowerCase();
    return !q || f.name?.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q);
  });

  const handleSubmit = async () => {
    if (!form.fragrance_id || !form.friend_name) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/admin/sent-samples`, {
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
    const res = await fetch(`${API}/api/admin/sent-samples/${id}`, { method: "DELETE", headers });
    if (res.ok) setSamples(prev => prev.filter(s => s.id !== id));
  };

  const uniqueFriends = [...new Set(samples.map(s => s.friend_name))].sort();
  const displaySamples = filterFriend === "all"
    ? samples
    : samples.filter(s => s.friend_name === filterFriend);

  // Group displayed samples by friend
  const grouped = displaySamples.reduce((acc, s) => {
    if (!acc[s.friend_name]) acc[s.friend_name] = [];
    acc[s.friend_name].push(s);
    return acc;
  }, {});

  return (
    <div style={{ marginTop: "2rem" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-primary)", fontWeight: 600 }}>
          📬 Previously-Sent Samples
          <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 400 }}>
            {samples.length} record{samples.length !== 1 ? "s" : ""}
          </span>
        </h3>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: showForm ? "rgba(122,171,255,0.15)" : "var(--accent-violet)",
            color: "#fff", border: "none", borderRadius: "8px",
            padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.85rem",
          }}
        >
          {showForm ? "✕ Cancel" : "+ Log Sent Sample"}
        </button>
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem"
        }}>
          {/* Fragrance search/select */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Fragrance *
            </label>
            <input
              placeholder="Search by name or brand…"
              value={fragSearch}
              onChange={e => { setFragSearch(e.target.value); setForm(f => ({ ...f, fragrance_id: "" })); }}
              style={inputStyle}
            />
            {fragSearch && !form.fragrance_id && (
              <div style={{
                maxHeight: "180px", overflowY: "auto", border: "1px solid var(--border)",
                borderRadius: "8px", marginTop: "0.3rem", background: "var(--bg)"
              }}>
                {filteredFragrances.slice(0, 30).map(f => (
                  <div
                    key={f.id}
                    onClick={() => { setForm(prev => ({ ...prev, fragrance_id: f.id })); setFragSearch(`${f.brand} – ${f.name}`); }}
                    style={{
                      padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "0.85rem",
                      color: "var(--text-primary)", borderBottom: "1px solid var(--border)"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--hover-bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{f.brand}</span>{" "}
                    {f.name}
                  </div>
                ))}
                {filteredFragrances.length === 0 && (
                  <div style={{ padding: "0.5rem 0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>No matches</div>
                )}
              </div>
            )}
          </div>

          {/* Friend name */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Friend *
            </label>
            <input
              list="friend-list"
              placeholder="Name…"
              value={form.friend_name}
              onChange={e => setForm(f => ({ ...f, friend_name: e.target.value }))}
              style={inputStyle}
            />
            <datalist id="friend-list">
              {friends.map(fr => <option key={fr.email || fr.name} value={fr.name} />)}
            </datalist>
          </div>

          {/* Friend email */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Email (optional)
            </label>
            <input
              placeholder="friend@email.com"
              value={form.friend_email}
              onChange={e => setForm(f => ({ ...f, friend_email: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Notes
            </label>
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
              style={{
                background: "var(--accent-violet)", color: "#fff", border: "none",
                borderRadius: "8px", padding: "0.5rem 1.4rem", cursor: "pointer",
                fontSize: "0.9rem", opacity: (!form.fragrance_id || !form.friend_name) ? 0.5 : 1
              }}
            >
              {saving ? "Saving…" : "Log Sample"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      {uniqueFriends.length > 1 && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {["all", ...uniqueFriends].map(f => (
            <button
              key={f}
              onClick={() => setFilterFriend(f)}
              style={{
                padding: "0.3rem 0.75rem", borderRadius: "20px", fontSize: "0.78rem",
                border: "1px solid var(--border)", cursor: "pointer",
                background: filterFriend === f ? "var(--accent-violet)" : "transparent",
                color: filterFriend === f ? "#fff" : "var(--text-muted)",
              }}
            >
              {f === "all" ? "All friends" : f}
            </button>
          ))}
        </div>
      )}

      {/* ── Records ── */}
      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</p>
      ) : samples.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>
          No sent samples logged yet. Use the button above to start tracking.
        </p>
      ) : (
        Object.entries(grouped).map(([friendName, friendSamples]) => (
          <div key={friendName} style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.82rem", color: "var(--accent-blue)", fontWeight: 600, marginBottom: "0.4rem", letterSpacing: "0.03em" }}>
              👤 {friendName}
              <span style={{ marginLeft: "0.5rem", color: "var(--text-muted)", fontWeight: 400 }}>
                · {friendSamples.length} sample{friendSamples.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {friendSamples.map(s => (
                <div
                  key={s.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "0.75rem",
                    background: "var(--card-bg)", border: "1px solid var(--border)",
                    borderRadius: "10px", padding: "0.65rem 0.9rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 500 }}>
                      {s.fragrance_brand && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{s.fragrance_brand} – </span>}
                      {s.fragrance_name}
                    </div>
                    {s.notes && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        {s.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", marginTop: "0.15rem" }}>
                    {s.sent_at}
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: "0.8rem", padding: "0.1rem 0.3rem",
                      borderRadius: "4px", lineHeight: 1
                    }}
                    title="Remove record"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: "var(--bg)", border: "1px solid var(--border)",
  borderRadius: "8px", padding: "0.5rem 0.75rem",
  color: "var(--text-primary)", fontSize: "0.88rem",
};
