import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Loading from '../components/common/Loading';
import adminService from '../services/adminService';
import { useAuth } from '../context/AuthContext';

const TABS = ['Overview', 'Users', 'Access requests', 'Log sources', 'Log access', 'Audit log', 'Reports'];
const ROLES = ['pending', 'viewer', 'analyst', 'admin'];

// Small helper: loads data when the tab opens.
function useLoad(fn) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setError(''); setData(await fn()); } catch (e) { setError(e.message); }
  }, [fn]);
  useEffect(() => { load(); }, [load]);
  return { data, error, reload: load, setData };
}

function Overview() {
  const { data, error } = useLoad(adminService.getOverview);
  if (error) return <div className="pg-msg err">{error}</div>;
  if (!data) return <Loading />;
  const items = [
    ['Total users', data.totalUsers], ['Pending access requests', data.pendingAccessRequests],
    ['Logs processed', data.logsProcessed], ['Active sources', data.activeSources],
    ['Open security alerts', data.openSecurityAlerts],
  ];
  return <div className="pg-cards">{items.map(([l, n]) => <div className="pg-card" key={l}><div className="num">{n}</div><div className="lbl">{l}</div></div>)}</div>;
}

function Users() {
  const { user: me } = useAuth();
  const { data, error, reload } = useLoad(adminService.getUsers);
  const [msg, setMsg] = useState(null);
  const run = async (fn, okText) => {
    try { setMsg(null); await fn(); setMsg({ type: 'ok', text: okText }); reload(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  };
  if (error) return <div className="pg-msg err">{error}</div>;
  if (!data) return <Loading />;
  return (
    <div className="pg-stack">
      {msg && <div className={`pg-msg ${msg.type}`}>{msg.text}</div>}
      <div className="panel pg-table-wrap">
        <table className="pg-table">
          <thead><tr><th>Email</th><th>Role</th><th>Sensitive</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <select className="pg-select" value={u.role} onChange={(e) => run(() => adminService.updateUserRole(u.id, e.target.value), 'Role updated.')}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td>{u.sensitive_access ? <button className="pg-btn small ghost" onClick={() => run(() => adminService.revokeSensitive(u.id), 'Sensitive access revoked.')}>Revoke</button> : 'No'}</td>
                <td><span className={`badge ${u.disabled ? 'badge-critical' : u.role === 'pending' ? 'badge-warning' : 'badge-success'}`}>{u.disabled ? 'disabled' : u.role === 'pending' ? 'awaiting approval' : 'active'}</span></td>
                <td>
                  <div className="pg-row">
                    {u.role === 'pending' && <button className="pg-btn small" onClick={() => run(() => adminService.updateUserRole(u.id, 'viewer'), 'User approved as viewer.')}>Approve</button>}
                    {u.id !== me?.id && (u.disabled
                      ? <button className="pg-btn small ghost" onClick={() => run(() => adminService.enableUser(u.id), 'User enabled.')}>Enable</button>
                      : <button className="pg-btn small ghost" onClick={() => run(() => adminService.disableUser(u.id), 'User disabled.')}>Disable</button>)}
                    {u.id !== me?.id && <button className="pg-btn small danger" onClick={() => window.confirm(`Delete ${u.email}?`) && run(() => adminService.deleteUser(u.id), 'User deleted.')}>Delete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccessRequests() {
  const { data, error, reload } = useLoad(adminService.getAccessRequests);
  const [msg, setMsg] = useState(null);
  const run = async (fn, t) => { try { setMsg(null); await fn(); setMsg({ type: 'ok', text: t }); reload(); } catch (e) { setMsg({ type: 'err', text: e.message }); } };
  if (error) return <div className="pg-msg err">{error}</div>;
  if (!data) return <Loading />;
  return (
    <div className="pg-stack">
      {msg && <div className={`pg-msg ${msg.type}`}>{msg.text}</div>}
      <div className="panel pg-table-wrap">
        {data.length === 0 ? <div className="pg-empty">No requests.</div> : (
          <table className="pg-table">
            <thead><tr><th>User</th><th>Requested</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.map((r) => (
              <tr key={r.id}>
                <td>{r.email}</td><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.status}</td>
                <td>{r.status === 'pending' && <div className="pg-row">
                  <button className="pg-btn small" onClick={() => run(() => adminService.approveAccessRequest(r.id), 'Approved.')}>Approve</button>
                  <button className="pg-btn small danger" onClick={() => run(() => adminService.rejectAccessRequest(r.id), 'Rejected.')}>Reject</button>
                </div>}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Sources() {
  const { data, error, reload } = useLoad(adminService.getSources);
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [msg, setMsg] = useState(null);
  const run = async (fn, t) => { try { setMsg(null); await fn(); setMsg({ type: 'ok', text: t }); reload(); } catch (e) { setMsg({ type: 'err', text: e.message }); } };
  if (error) return <div className="pg-msg err">{error}</div>;
  if (!data) return <Loading />;
  return (
    <div className="pg-stack">
      {msg && <div className={`pg-msg ${msg.type}`}>{msg.text}</div>}
      <div className="pg-row">
        <input className="pg-input" placeholder="Source name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="pg-input" placeholder="Vendor (optional)" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        <button className="pg-btn" disabled={!name.trim()} onClick={() => run(async () => { await adminService.addSource(name.trim(), vendor.trim() || undefined); setName(''); setVendor(''); }, 'Source added.')}>Add source</button>
      </div>
      <div className="panel pg-table-wrap">
        <table className="pg-table">
          <thead><tr><th>Name</th><th>Vendor</th><th>Enabled</th></tr></thead>
          <tbody>{data.map((s) => (
            <tr key={s.id}><td>{s.name}</td><td>{s.vendor || '-'}</td>
              <td><label className="pg-toggle"><input type="checkbox" checked={s.enabled} onChange={(e) => run(() => adminService.updateSource(s.id, { enabled: e.target.checked }), 'Source updated.')} />{s.enabled ? 'On' : 'Off'}</label></td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogAccess() {
  const access = useLoad(adminService.getLogAccess);
  const sources = useLoad(adminService.getSources);
  const [msg, setMsg] = useState(null);
  if (access.error || sources.error) return <div className="pg-msg err">{access.error || sources.error}</div>;
  if (!access.data || !sources.data) return <Loading />;
  const toggle = async (u, cat, on) => {
    const next = on ? [...u.categories, cat] : u.categories.filter((c) => c !== cat);
    try { setMsg(null); await adminService.setLogAccess(u.userId, next); setMsg({ type: 'ok', text: 'Saved.' }); access.reload(); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  };
  return (
    <div className="pg-stack">
      {msg && <div className={`pg-msg ${msg.type}`}>{msg.text}</div>}
      <div className="panel pg-table-wrap">
        <table className="pg-table">
          <thead><tr><th>User</th>{sources.data.map((s) => <th key={s.id}>{s.name}</th>)}</tr></thead>
          <tbody>{access.data.map((u) => (
            <tr key={u.userId}><td>{u.email}</td>
              {sources.data.map((s) => <td key={s.id}><input type="checkbox" checked={u.categories.includes(s.name)} onChange={(e) => toggle(u, s.name, e.target.checked)} /></td>)}
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Audit() {
  const { data, error } = useLoad(adminService.getAudit);
  if (error) return <div className="pg-msg err">{error}</div>;
  if (!data) return <Loading />;
  return (
    <div className="panel pg-table-wrap">
      {data.length === 0 ? <div className="pg-empty">Nothing recorded yet.</div> : (
        <table className="pg-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>{data.map((a) => (
            <tr key={a.id}><td>{new Date(a.created_at).toLocaleString()}</td><td>{a.user_email || '-'}</td><td>{a.action}</td>
              <td className="pg-muted">{a.details ? JSON.stringify(a.details) : ''}</td></tr>))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Reports() {
  const [type, setType] = useState('daily');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const run = async (t) => {
    setType(t); setReport(null); setError('');
    try { setReport(await adminService.getReport(t)); } catch (e) { setError(e.message); }
  };
  useEffect(() => { run('daily'); }, []);
  return (
    <div className="pg-stack">
      <div className="pg-row">
        {['daily', 'weekly', 'security', 'user-activity'].map((t) => (
          <button key={t} className={`pg-btn ${type === t ? '' : 'ghost'}`} onClick={() => run(t)}>{t}</button>
        ))}
      </div>
      {error && <div className="pg-msg err">{error}</div>}
      {!report && !error && <Loading />}
      {report && <pre className="pg-pre" style={{ maxHeight: 420 }}>{JSON.stringify(report, null, 2)}</pre>}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState(TABS[0]);
  return (
    <PageContainer>
      <div className="pg-title-row"><h1>Admin</h1></div>
      <div className="pg-tabs">
        {TABS.map((t) => <button key={t} className={`pg-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Overview' && <Overview />}
      {tab === 'Users' && <Users />}
      {tab === 'Access requests' && <AccessRequests />}
      {tab === 'Log sources' && <Sources />}
      {tab === 'Log access' && <LogAccess />}
      {tab === 'Audit log' && <Audit />}
      {tab === 'Reports' && <Reports />}
    </PageContainer>
  );
}
