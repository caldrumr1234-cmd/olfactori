// AdminTab.jsx — drop into frontend/src/
import { useState, useEffect } from "react";

const API = "https://olfactori-production.up.railway.app/api";

const css = `
  .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }

  .admin-section {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
  }
  .admin-section-header {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .admin-section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px; font-weight: 300; color: var(--text);
    display: flex; align-items: center; gap: 8px;
  }
  .admin-section-body { padding: 16px 20px; }

  /* INVITE LIST */
  .invite-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0; border-bottom: 1px solid var(--border);
  }
  .invite-item:last-child { border-bottom: none; }
  .invite-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--gold-dim); border: 1px solid rgba(201,168,76,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--gold); font-weight: 500; flex-shrink: 0;
  }
  .invite-info { flex: 1; min-width: 0; }
  .invite-name { font-size: 14px; color: var(--text); }
  .invite-meta { font-size: 11px; color: var(--text3); margin-top: 1px; }
  .invite-link {
    font-size: 11px; color: var(--blue); background: rgba(91,141,238,0.1);
    border: 1px solid rgba(91,141,238,0.2); border-radius: 6px;
    padding: 4px 8px; cursor: pointer; white-space: nowrap;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .invite-link:hover { background: rgba(91,141,238,0.2); }
  .invite-active { width: 8px; height: 8px; border-radius: 50%;
                   background: var(--green); flex-shrink: 0; }
  .invite-inactive { width: 8px; height: 8px; border-radius: 50%;
                     background: var(--text3); flex-shrink: 0; }

  /* REQUEST LIST */
  .request-item {
    border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 14px; margin-bottom: 10px; transition: border-color 0.15s;
  }
  .request-item:last-child { margin-bottom: 0; }
  .request-item.pending { border-left: 3px solid var(--gold); }
  .request-item.sent    { border-left: 3px solid var(--green); opacity: 0.7; }
  .request-item.declined{ border-left: 3px solid var(--red); opacity: 0.5; }
  .request-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .request-friend { font-size: 14px; color: var(--text); font-weight: 500; }
  .request-date { font-size: 11px; color: var(--text3); }
  .request-frags { font-size: 12px; color: var(--text2); margin-bottom: 8px; line-height: 1.5; }
  .request-message { font-size: 12px; color: var(--text3); font-style: italic; margin-bottom: 10px; }
  .request-actions { display: flex; gap: 6px; }
  .status-badge {
    font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 500;
    letter-spacing: 0.04em; text-transform: uppercase;
  }
  .status-badge.pending  { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(201,168,76,0.3); }
  .status-badge.sent     { background: rgba(76,174,122,0.15); color: var(--green); border: 1px solid rgba(76,174,122,0.3); }
  .status-badge.declined { background: rgba(224,85,85,0.15); color: var(--red); border: 1px solid rgba(224,85,85,0.3); }

  .filter-tabs { display: flex; gap: 4px; margin-bottom: 14px; }
  .filter-tab {
    background: none; border: 1px solid var(--border); border-radius: 6px;
    color: var(--text3); padding: 5px 12px; font-size: 12px;
    cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .filter-tab:hover { color: var(--text2); }
  .filter-tab.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }

  .copy-toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--bg3); border: 1px solid var(--green);
    color: var(--green); border-radius: 8px; padding: 8px 16px;
    font-size: 13px; z-index: 500; pointer-events: none;
    animation: toastIn 0.2s ease;
  }
  .empty-section { padding: 30px; text-align: center; color: var(--text3); font-size: 13px; }
`;

function AddInviteModal({ onClose, onAdd, toast }) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch(`${API}/friends/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      onAdd(data);
    }
    setSaving(false);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${result.invite_url}`;
    navigator.clipboard.writeText(url);
    toast("Link copied ✓");
  };

  return (
    <div className="modal-overlay" onClick={result ? onClose : undefined}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{result ? "Invite Created" : "Invite a Friend"}</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!result ? (
            <div className="edit-form">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoFocus placeholder="Friend's name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="friend@example.com" />
              </div>
              <p style={{fontSize:12,color:"var(--text3)",lineHeight:1.6}}>
                This generates a magic link. Send it to your friend — they click it, set their name, and can browse your collection and request samples. No account or password needed.
              </p>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <p style={{fontSize:13,color:"var(--text2)"}}>
                Share this link with <strong style={{color:"var(--text)"}}>{result.name}</strong>:
              </p>
              <div style={{
                background:"var(--bg3)", border:"1px solid var(--border)",
                borderRadius:8, padding:"10px 14px",
                fontFamily:"monospace", fontSize:12, color:"var(--text2)",
                wordBreak:"break-all"
              }}>
                {window.location.origin}{result.invite_url}
              </div>
              <button className="btn btn-primary" onClick={copyLink}>
                📋 Copy Link
              </button>
              <p style={{fontSize:11,color:"var(--text3)"}}>
                The link is single-use per friend and can be revoked from the Admin panel at any time.
              </p>
            </div>
          )}
        </div>
        {!result && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving || !form.name}>
              {saving ? "Creating…" : "Create Invite"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminTab({ toast }) {
  const [invites,  setInvites]  = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [reqFilter, setReqFilter]   = useState("pending");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/friends/invites`).then(r=>r.json()).catch(()=>[]),
      fetch(`${API}/friends/requests`).then(r=>r.json()).catch(()=>[]),
    ]).then(([inv, req]) => {
      setInvites(inv);
      setRequests(req);
      setLoading(false);
    });
  }, []);

  const addInvite = (invite) => setInvites(prev => [invite, ...prev]);

  const revokeInvite = async (id) => {
    if (!window.confirm("Revoke this invite link?")) return;
    await fetch(`${API}/friends/invites/${id}`, { method: "DELETE" });
    setInvites(prev => prev.map(i => i.id === id ? {...i, is_active: 0} : i));
    toast("Invite revoked");
  };

  const copyInviteLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    toast("Link copied ✓");
  };

  const updateRequestStatus = async (id, status) => {
    const res = await fetch(`${API}/friends/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setRequests(prev => prev.map(r => r.id === id ? {...r, status} : r));
      toast(`Marked as ${status} ✓`);
    }
  };

  const filteredRequests = reqFilter === "all"
    ? requests
    : requests.filter(r => r.status === reqFilter);

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>;

  return (
    <>
      <style>{css}</style>
      <div className="admin-grid">

        {/* FRIEND INVITES */}
        <div className="admin-section">
          <div className="admin-section-header">
            <span className="admin-section-title">👥 Friends</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
              + Invite
            </button>
          </div>
          <div className="admin-section-body">
            {invites.length === 0 ? (
              <div className="empty-section">
                No friends invited yet. Send an invite link to let friends browse your collection and request samples.
              </div>
            ) : (
              invites.map(inv => (
                <div key={inv.id} className="invite-item">
                  <div className="invite-avatar">{inv.name.charAt(0).toUpperCase()}</div>
                  <div className="invite-info">
                    <div className="invite-name">{inv.name}</div>
                    <div className="invite-meta">
                      {inv.email || "No email"} · {inv.last_seen ? `Last seen ${inv.last_seen.split("T")[0]}` : "Never visited"}
                    </div>
                  </div>
                  {inv.is_active
                    ? <>
                        <div className="invite-active" title="Active" />
                        <button className="invite-link" onClick={() => copyInviteLink(inv.token)}>
                          Copy Link
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => revokeInvite(inv.id)} title="Revoke">✕</button>
                      </>
                    : <div className="invite-inactive" title="Revoked" />
                  }
                </div>
              ))
            )}
          </div>
        </div>

        {/* SAMPLE REQUESTS */}
        <div className="admin-section">
          <div className="admin-section-header">
            <span className="admin-section-title">
              📬 Sample Requests
              {pendingCount > 0 && (
                <span style={{
                  background:"var(--red)", color:"white", borderRadius:10,
                  fontSize:11, padding:"1px 7px", fontFamily:"'DM Sans',sans-serif"
                }}>{pendingCount}</span>
              )}
            </span>
          </div>
          <div className="admin-section-body">
            <div className="filter-tabs">
              {["pending","sent","declined","all"].map(f => (
                <button key={f} className={`filter-tab ${reqFilter===f?"active":""}`}
                  onClick={() => setReqFilter(f)}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                  {f !== "all" && ` (${requests.filter(r=>r.status===f).length})`}
                </button>
              ))}
            </div>

            {filteredRequests.length === 0 ? (
              <div className="empty-section">
                No {reqFilter === "all" ? "" : reqFilter} requests.
              </div>
            ) : (
              filteredRequests.map(req => {
                const names = Array.isArray(req.fragrance_names)
                  ? req.fragrance_names
                  : (typeof req.fragrance_names === "string"
                      ? JSON.parse(req.fragrance_names || "[]")
                      : []);
                return (
                  <div key={req.id} className={`request-item ${req.status}`}>
                    <div className="request-header">
                      <span className="request-friend">{req.friend_name}</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span className="request-date">{req.created_at?.split("T")[0]}</span>
                        <span className={`status-badge ${req.status}`}>{req.status}</span>
                      </div>
                    </div>
                    <div className="request-frags">
                      {names.length > 0
                        ? names.join(", ")
                        : `${JSON.parse(req.fragrance_ids||"[]").length} fragrances`
                      }
                    </div>
                    {req.message && (
                      <div className="request-message">"{req.message}"</div>
                    )}
                    {req.status === "pending" && (
                      <div className="request-actions">
                        <button className="btn btn-primary btn-sm"
                          onClick={() => updateRequestStatus(req.id, "sent")}>
                          ✓ Mark Sent
                        </button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => updateRequestStatus(req.id, "declined")}>
                          Decline
                        </button>
                      </div>
                    )}
                    {req.status === "sent" && (
                      <div className="request-actions">
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => updateRequestStatus(req.id, "pending")}>
                          ↩ Reopen
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {showInvite && (
        <AddInviteModal
          onClose={() => setShowInvite(false)}
          onAdd={addInvite}
          toast={toast}
        />
      )}
    </>
  );
}
