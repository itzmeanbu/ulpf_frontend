import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Loading from '../components/common/Loading';
import logService from '../services/logService';
import { useAuth } from '../context/AuthContext';

// Turns pasted/file text into a list of single log events.
function splitLogs(text, fmt) {
  const t = text.trim();
  // A JSON object or a JSON array (array -> one event per item)
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed.map((x) => JSON.stringify(x)) : [t];
    } catch {
      /* not one JSON document: maybe one JSON per line, handled below */
    }
  }
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
  // CSV: the first line is the header, so send it together with each row.
  const first = lines[0] || '';
  const looksLikeHeader = /timestamp|src_ip|source_ip|action|event_type/i.test(first) && first.includes(',');
  if ((fmt === 'csv' || looksLikeHeader) && lines.length > 1) {
    return lines.slice(1).map((row) => `${first}\n${row}`);
  }
  return lines;
}

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
  const [panelMsg, setPanelMsg] = useState(null);
  const detailsRef = useRef(null);

  // Whenever a log gets opened, the details panel renders further down the
  // page (below the table), so jump the view to it instead of leaving the
  // user to notice it and scroll themselves.
  useEffect(() => {
    if (selected && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selected]);

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
      // One upload can hold many logs. Split it into separate events.
      const asJson = splitLogs(rawLog, sourceType);
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

  const open = (log) => { setSelected(log); setUnlocked(null); setUnlockPw(''); setNotice(null); setPanelMsg(null); };

  const unlock = async () => {
    try {
      setPanelMsg(null);
      setUnlocked(await logService.unlockLog(selected.eventId, unlockPw));
      setPanelMsg({ type: 'ok', text: 'Unlocked. Original values are shown below.' });
    } catch (e) {
      setPanelMsg({ type: 'err', text: e.message });
    }
  };

  const requestAccess = async () => {
    try {
      await logService.requestSensitiveAccess();
      setPanelMsg({ type: 'ok', text: 'Request sent. An admin will review it.' });
    } catch (e) {
      setPanelMsg({ type: 'err', text: e.message });
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
                <thead><tr><th>Time</th><th>Vendor</th><th>Summary</th><th>Source IP</th><th>Dest IP</th><th></th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.eventId}>
                      <td>{l.timestamp ? new Date(l.timestamp).toLocaleString() : '-'}</td>
                      <td>{l.vendor}</td>
                      <td>{l.readableSummary || l.action || '-'}</td>
                      <td>{l.sourceIP || '-'}</td><td>{l.destIP || '-'}</td>
                      <td><button className="pg-btn small ghost" onClick={() => open(l)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="panel" ref={detailsRef}>
            <div className="panel-header">
              <h2>Log details {unlocked ? '(unmasked)' : '(masked)'}</h2>
              <button className="pg-btn small ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="panel-body pg-stack">
              {panelMsg && <div className={`pg-msg ${panelMsg.type}`}>{panelMsg.text}</div>}
              {shown?.readableSummary && (
                <div className="pg-msg ok" style={{ fontSize: '0.95rem' }}>{shown.readableSummary}</div>
              )}
              <div className="pg-table-wrap">
                <table className="pg-table">
                  <thead>
                    <tr><th>Field</th><th>Masked (safe view)</th>{unlocked && <th>Original (unlocked)</th>}</tr>
                  </thead>
                  <tbody>
                    {Object.keys(unlocked || selected)
                      .filter((k) => k !== 'rawLog' && k !== 'eventId' && k !== 'readableSummary')
                      .map((k) => {
                        const m = String(selected[k] ?? '-');
                        const o = unlocked ? String(unlocked[k] ?? '-') : null;
                        return (
                          <tr key={k}>
                            <td>{k}</td>
                            <td>{m}</td>
                            {unlocked && <td style={o !== m ? { color: 'var(--color-success)', fontWeight: 600 } : undefined}>{o}</td>}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {unlocked?.rawLog && <div><div className="pg-muted">Original log line</div><pre className="pg-pre">{unlocked.rawLog}</pre></div>}
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
