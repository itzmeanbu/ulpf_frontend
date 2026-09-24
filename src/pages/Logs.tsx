import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, CheckSquare, Square, ChevronRight, Loader2, Check, X } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Loading from '../components/common/Loading';
import ActionButton from '../components/common/ActionButton';
import logService from '../services/logService';
import { useAuth } from '../context/AuthContext';

// Turns pasted/file text into a list of single log events.
function splitLogs(text: string, fmt: string): string[] {
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

type QueueStatus = 'pending' | 'processing' | 'done' | 'error';
interface QueueItem {
  id: number;
  preview: string;
  status: QueueStatus;
  result?: any;
  error?: string;
}

export default function Logs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawLog, setRawLog] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: string; text: string } | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [unlockPw, setUnlockPw] = useState('');
  const [unlocked, setUnlocked] = useState<any>(null);
  const [panelMsg, setPanelMsg] = useState<{ type: string; text: string } | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selected]);

  const load = useCallback(async (q = '') => {
    try {
      setLoading(true);
      setError('');
      const data = await logService.searchLogs(q);
      setLogs(data);
      setChecked(new Set());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  // Uploads a pasted paragraph of many log lines ONE AT A TIME, updating a
  // visible queue as each one finishes - instead of silently processing
  // everything and only reporting a final count.
  const upload = async () => {
    if (!rawLog.trim()) return;
    const lines = splitLogs(rawLog, sourceType);
    const initialQueue: QueueItem[] = lines.map((line, i) => ({
      id: i,
      preview: line.length > 90 ? `${line.slice(0, 90)}...` : line,
      status: 'pending',
    }));
    setQueue(initialQueue);
    setNotice(null);
    setUploading(true);

    let ok = 0;
    let failed = 0;
    for (let i = 0; i < lines.length; i++) {
      setQueue((q) => q.map((item) => (item.id === i ? { ...item, status: 'processing' } : item)));
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await logService.uploadLog(lines[i], sourceType);
        ok++;
        setQueue((q) => q.map((item) => (item.id === i ? { ...item, status: 'done', result } : item)));
      } catch (e: any) {
        failed++;
        setQueue((q) => q.map((item) => (item.id === i ? { ...item, status: 'error', error: e.message } : item)));
      }
    }

    setUploading(false);
    setNotice({ type: failed ? 'err' : 'ok', text: `${ok} log(s) processed${failed ? `, ${failed} failed` : ''}.` });
    if (ok) { setRawLog(''); load(query); }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setRawLog(String(r.result || ''));
    r.readAsText(f);
  };

  const open = (log: any) => { setSelected(log); setUnlocked(null); setUnlockPw(''); setNotice(null); setPanelMsg(null); };

  const unlock = async () => {
    try {
      setPanelMsg(null);
      setUnlocked(await logService.unlockLog(selected.eventId, unlockPw));
      setPanelMsg({ type: 'ok', text: 'Unlocked. Original values are shown below.' });
    } catch (e: any) {
      setPanelMsg({ type: 'err', text: e.message });
    }
  };

  const requestAccess = async () => {
    try {
      await logService.requestSensitiveAccess();
      setPanelMsg({ type: 'ok', text: 'Request sent. An admin will review it.' });
    } catch (e: any) {
      setPanelMsg({ type: 'err', text: e.message });
    }
  };

  /* --- Select / delete / clear --- */
  const allChecked = logs.length > 0 && checked.size === logs.length;
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(logs.map((l) => l.eventId)));
  const toggleOne = (id: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const deleteOne = async (id: string) => {
    try {
      await logService.deleteLog(id);
      setNotice({ type: 'ok', text: 'Log moved to the recycle bin.' });
      load(query);
      if (selected?.eventId === id) setSelected(null);
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const deleteSelected = async () => {
    if (checked.size === 0) return;
    if (!window.confirm(`Move ${checked.size} selected log(s) to the recycle bin?`)) return;
    try {
      await logService.bulkDeleteLogs(Array.from(checked));
      setNotice({ type: 'ok', text: `${checked.size} log(s) moved to the recycle bin.` });
      load(query);
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const clearAll = async () => {
    if (logs.length === 0) return;
    if (!window.confirm('Clear ALL logs? Every log currently in the list will be moved to the recycle bin.')) return;
    try {
      const result = await logService.clearAllLogs();
      setNotice({ type: 'ok', text: `${result.count} log(s) moved to the recycle bin.` });
      load(query);
    } catch (e: any) {
      setNotice({ type: 'err', text: e.message });
    }
  };

  const shown = unlocked || selected;

  return (
    <PageContainer>
      <div className="pg-stack">
        <div className="pg-title-row">
          <h1>Logs</h1>
          <ActionButton variant="ghost" size="small" onClick={() => navigate('/recycle-bin')}>
            <Trash2 size={14} /> Recycle bin <ChevronRight size={14} />
          </ActionButton>
        </div>

        {notice && <div className={`pg-msg ${notice.type}`}>{notice.text}</div>}

        {queue.length > 0 && (
          <div className="panel">
            <div className="panel-header"><h2>Processing {queue.length} log(s) one by one</h2></div>
            <div className="panel-body pg-stack">
              {queue.map((item) => (
                <div key={item.id} className={`upload-queue-item ${item.status}`}>
                  <span className="upload-queue-icon">
                    {item.status === 'pending' && <span className="pg-muted">#{item.id + 1}</span>}
                    {item.status === 'processing' && <Loader2 size={16} className="pg-spin-icon" />}
                    {item.status === 'done' && <Check size={16} color="var(--color-success)" />}
                    {item.status === 'error' && <X size={16} color="var(--color-danger)" />}
                  </span>
                  <span className="upload-queue-text">
                    {item.status === 'done' && item.result?.readableSummary ? item.result.readableSummary : item.preview}
                  </span>
                  {item.status === 'done' && (
                    <button className="pg-btn small ghost" onClick={() => open(item.result)}>Full details</button>
                  )}
                  {item.status === 'error' && <span className="pg-muted">{item.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel-header"><h2>Upload logs</h2></div>
          <div className="panel-body">
            <textarea className="pg-textarea" placeholder="Paste one or more log lines here (syslog, CEF, LEEF, JSON, CSV)... each line is uploaded and shown one by one." value={rawLog} onChange={(e) => setRawLog(e.target.value)} />
            <div className="pg-row" style={{ marginTop: 10 }}>
              <input type="file" accept=".log,.txt,.json,.cef,.csv,.syslog" onChange={onFile} className="pg-muted" />
              <select className="pg-select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                {SOURCES.map((s) => <option key={s} value={s}>{s || 'Auto-detect format'}</option>)}
              </select>
              <ActionButton onClick={upload} disabled={uploading || !rawLog.trim()} loadingText="Processing...">Upload</ActionButton>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Search logs</h2>
            <div className="pg-row">
              <input className="pg-input" placeholder="vendor, event, IP, action..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(query)} />
              <ActionButton onClick={() => load(query)}>Search</ActionButton>
            </div>
          </div>

          {!loading && !error && logs.length > 0 && (
            <div className="pg-row" style={{ padding: '10px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <button className="pg-btn small ghost" onClick={toggleAll}>
                {allChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                <span style={{ marginLeft: 6 }}>{allChecked ? 'Unselect all' : 'Select all'}</span>
              </button>
              <span className="pg-muted">{checked.size} of {logs.length} selected</span>
              <ActionButton variant="danger" size="small" disabled={checked.size === 0} onClick={deleteSelected}>
                <Trash2 size={14} /> Delete selected
              </ActionButton>
              <ActionButton variant="danger" size="small" onClick={clearAll}>
                Clear all logs
              </ActionButton>
            </div>
          )}

          {loading ? <Loading message="Loading logs..." /> : error ? <div className="pg-empty">{error}</div> : logs.length === 0 ? (
            <div className="pg-empty">No logs found.</div>
          ) : (
            <div className="pg-table-wrap">
              <table className="pg-table">
                <thead><tr><th style={{ width: 32 }}></th><th>Time</th><th>Vendor</th><th>Summary</th><th>Source IP</th><th>Dest IP</th><th></th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.eventId}>
                      <td><input type="checkbox" checked={checked.has(l.eventId)} onChange={() => toggleOne(l.eventId)} /></td>
                      <td>{l.timestamp ? new Date(l.timestamp).toLocaleString() : '-'}</td>
                      <td>{l.vendor}</td>
                      <td>{l.readableSummary || l.action || '-'}</td>
                      <td>{l.sourceIP || '-'}</td><td>{l.destIP || '-'}</td>
                      <td>
                        <div className="pg-row" style={{ flexWrap: 'nowrap' }}>
                          <button className="pg-btn small ghost" onClick={() => open(l)}>Open</button>
                          <ActionButton size="small" variant="danger" onClick={() => deleteOne(l.eventId)}><Trash2 size={14} /></ActionButton>
                        </div>
                      </td>
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
                  <ActionButton disabled={!unlockPw} onClick={unlock}>Unlock original</ActionButton>
                </div>
              ) : (
                <div className="pg-row">
                  <span className="pg-muted">You are not approved to see sensitive details.</span>
                  <ActionButton variant="ghost" onClick={requestAccess}>Request access</ActionButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
