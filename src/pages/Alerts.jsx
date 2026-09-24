import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import alertService from '../services/alertService';
import { useAuth } from '../context/AuthContext';

const SEV_BADGE = { high: 'badge-critical', medium: 'badge-warning', low: 'badge-info' };

export default function Alerts() {
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sev, setSev] = useState('');
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setAlerts(await alertService.getAlerts());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = async (id, newStatus) => {
    try {
      setMsg('');
      await alertService.updateAlertStatus(id, newStatus);
      setAlerts((list) => list.map((a) => (a.alertId === id ? { ...a, status: newStatus } : a)));
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (loading) return <Loading message="Loading alerts..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const shown = alerts.filter((a) => (!sev || a.severity === sev) && (!status || a.status === status));

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
          {shown.length === 0 ? <div className="pg-empty">No alerts.</div> : (
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead><tr><th>Severity</th><th>Reason</th><th>Related events</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {shown.map((a) => (
                    <tr key={a.alertId}>
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
