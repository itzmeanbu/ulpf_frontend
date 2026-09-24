import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import ActionButton from '../components/common/ActionButton';
import alertService from '../services/alertService';
import { useAuth } from '../context/AuthContext';

const SEV_BADGE: Record<string, string> = { high: 'badge-critical', medium: 'badge-warning', low: 'badge-info' };

export default function Alerts() {
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sev, setSev] = useState('');
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setAlerts(await alertService.getAlerts());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = async (id: string, newStatus: string) => {
    try {
      setMsg('');
      await alertService.updateAlertStatus(id, newStatus);
      setAlerts((list) => list.map((a) => (a.alertId === id ? { ...a, status: newStatus } : a)));
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const remove = async (id: string) => {
    try {
      setMsg('');
      await alertService.deleteAlert(id);
      setAlerts((list) => list.filter((a) => a.alertId !== id));
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  if (loading) return <Loading message="Loading alerts..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const shown = alerts.filter((a) => (!sev || a.severity === sev) && (!status || a.status === status));

  const allChecked = shown.length > 0 && shown.every((a) => checked.has(a.alertId));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(shown.map((a) => a.alertId)));
  const toggleOne = (id: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const deleteSelected = async () => {
    if (checked.size === 0) return;
    if (!window.confirm(`Move ${checked.size} selected alert(s) to the recycle bin?`)) return;
    const ids = Array.from(checked);
    try {
      setMsg('');
      await alertService.bulkDeleteAlerts(ids);
      setAlerts((list) => list.filter((a) => !ids.includes(a.alertId)));
      setChecked(new Set());
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  return (
    <PageContainer>
      <div className="pg-stack">
        <div className="pg-title-row">
          <h1>Alerts</h1>
          <div className="pg-row">
            <select className="pg-select" value={sev} onChange={(e) => setSev(e.target.value)}>
              <option value="">All severities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <select className="pg-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
        {msg && <div className="pg-msg err">{msg}</div>}
        <div className="panel">
          {isAdmin && shown.length > 0 && (
            <div className="pg-row" style={{ padding: '10px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <button className="pg-btn small ghost" onClick={toggleAll}>
                {allChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                <span style={{ marginLeft: 6 }}>{allChecked ? 'Unselect all' : 'Select all'}</span>
              </button>
              <span className="pg-muted">{checked.size} of {shown.length} selected</span>
              <ActionButton variant="danger" size="small" disabled={checked.size === 0} onClick={deleteSelected}>
                <Trash2 size={14} /> Delete selected
              </ActionButton>
            </div>
          )}
          {shown.length === 0 ? <div className="pg-empty">No alerts.</div> : (
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead><tr>{isAdmin && <th style={{ width: 32 }}></th>}<th>Severity</th><th>Reason</th><th>Related events</th><th>Time</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
                <tbody>
                  {shown.map((a) => (
                    <tr key={a.alertId}>
                      {isAdmin && <td><input type="checkbox" checked={checked.has(a.alertId)} onChange={() => toggleOne(a.alertId)} /></td>}
                      <td><span className={`badge ${SEV_BADGE[a.severity] || 'badge-info'}`}>{a.severity}</span></td>
                      <td>{a.reason}</td>
                      <td>{a.relatedEvents?.length || 0}</td>
                      <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        {isAdmin ? (
                          <select className="pg-select" value={a.status} onChange={(e) => change(a.alertId, e.target.value)}>
                            <option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option>
                          </select>
                        ) : a.status}
                      </td>
                      {isAdmin && (
                        <td>
                          <ActionButton
                            variant="danger" size="small"
                            onClick={() => window.confirm('Move this alert to the recycle bin?') && remove(a.alertId)}
                          >
                            <Trash2 size={14} />
                          </ActionButton>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
