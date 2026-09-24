import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Loading from '../components/common/Loading';
import logService from '../services/logService';
import { useAuth } from '../context/AuthContext';

const SOURCES = ['', 'syslog', 'cef', 'leef', 'json', 'csv'];

export default function Logs() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawLog, setRawLog] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [unlockPw, setUnlockPw] = useState('');
  const [unlocked, setUnlocked] = useState(null);

  const load = useCallback(async (q = '') => {
    try {
      setLoading(true);
      setError('');
      setLogs(await logService.searchLogs(q));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const upload = async () => {
    if (!rawLog.trim()) return;
    try {
      setUploading(true);
      setNotice(null);
      // A file can hold many lines; send each non-empty line as its own event.
      const lines = rawLog.split('\n').map((l) => l.trim()).filter(Boolean);
      const asJson = rawLog.trim().startsWith('{') && lines.length > 1 ? [rawLog.trim()] : lines;
      let ok = 0;
      let failed = 0;
      let lastErr = '';
      for (const line of asJson) {
        try { await logService.uploadLog(line, sourceType); ok++; }
        catch (e) { failed++; lastErr = e.message; }
      }
      setNotice({ type: failed ? 'err' : 'ok', text: `${ok} log(s) processed${failed ? `, ${failed} failed (${lastErr})` : ''}.` });
      if (ok) { setRawLog(''); load(query); }
    } finally {
      setUploading(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setRawLog(String(r.result || ''));
    r.readAsText(f);
  };

  const open = (log) => { setSelected(log); setUnlocked(null); setUnlockPw(''); setNotice(null); };

  const unlock = async () => {
    try {
      setNotice(null);
      setUnlocked(await logService.unlockLog(selected.eventId, unlockPw));
    } catch (e) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const requestAccess = async () => {
    try {
      await logService.requestSensitiveAccess();
      setNotice({ type: 'ok', text: 'Request sent. An admin will review it.' });
    } catch (e) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const shown = unlocked || selected;

  return (
    <PageContainer>
      <div className="pg-stack">
        <div className="pg-title-row"><h1>Logs</h1></div>

        {notice && <div className={`pg-msg ${notice.type}`}>{notice.text}</div>}

        <div className="panel">
          <div className="panel-header"><h2>Upload logs</h2></div>
          <div className="panel-body">
            <textarea className="pg-textarea" placeholder="Paste one or more log lines here (syslog, CEF, LEEF, JSON, CSV)..." value={rawLog} onChange={(e) => setRawLog(e.target.value)} />
            <div className="pg-row" style={{ marginTop: 10 }}>
              <input type="file" accept=".log,.txt,.json,.cef,.csv,.syslog" onChange={onFile} className="pg-muted" />
              <select className="pg-select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                {SOURCES.map((s) => <option key={s} value={s}>{s || 'Auto-detect format'}</option>)}
              </select>
              <button className="pg-btn" onClick={upload} disabled={uploading || !rawLog.trim()}>{uploading ? 'Processing...' : 'Upload'}</button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Search logs</h2>
            <div className="pg-row">
              <input className="pg-input" placeholder="vendor, event, IP, action..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(query)} />
              <button className="pg-btn" onClick={() => load(query)}>Search</button>
            </div>
          </div>
          {loading ? <Loading message="Loading logs..." /> : error ? <div className="pg-empty">{error}</div> : logs.length === 0 ? (
            <div className="pg-empty">No logs found.</div>
          ) : (
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead><tr><th>Time</th><th>Vendor</th><th>Event</th><th>Source IP</th><th>Dest IP</th><th>Action</th><th></th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.eventId}>
                      <td>{l.timestamp ? new Date(l.timestamp).toLocaleString() : '-'}</td>
                      <td>{l.vendor}</td><td>{l.eventType}</td><td>{l.sourceIP || '-'}</td><td>{l.destIP || '-'}</td><td>{l.action || '-'}</td>
                      <td><button className="pg-btn small ghost" onClick={() => open(l)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="panel">
            <div className="panel-header">
              <h2>Log details {unlocked ? '(unmasked)' : '(masked)'}</h2>
              <button className="pg-btn small ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="panel-body pg-stack">
              <dl className="pg-kv">
                {Object.entries(shown).filter(([k]) => k !== 'rawLog').map(([k, v]) => (
                  <React.Fragment key={k}><dt>{k}</dt><dd>{String(v ?? '-')}</dd></React.Fragment>
                ))}
              </dl>
              {unlocked?.rawLog && <div><div className="pg-muted">Original log</div><pre className="pg-pre">{unlocked.rawLog}</pre></div>}
              {!unlocked && (user?.sensitiveAccess ? (
                <div className="pg-row">
                  <input className="pg-input" type="password" placeholder="Second password" value={unlockPw} onChange={(e) => setUnlockPw(e.target.value)} />
                  <button className="pg-btn" onClick={unlock} disabled={!unlockPw}>Unlock original</button>
                </div>
              ) : (
                <div className="pg-row">
                  <span className="pg-muted">You are not approved to see sensitive details.</span>
                  <button className="pg-btn ghost" onClick={requestAccess}>Request access</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
