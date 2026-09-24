import React, { useState, useEffect } from 'react';
import PageContainer from '../components/layout/PageContainer';
import Loading from '../components/common/Loading';
import adminService from '../services/adminService';
import { useAuth } from '../context/AuthContext';

function Toggles({ title, note, fields, load, save }) {
  const [cfg, setCfg] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => { load().then(setCfg).catch((e) => setMsg({ type: 'err', text: e.message })); }, [load]);
  const submit = async () => {
    try { setMsg(null); await save(cfg); setMsg({ type: 'ok', text: 'Saved.' }); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  };
  return (
    <div className="panel">
      <div className="panel-header"><h2>{title}</h2></div>
      <div className="panel-body">
        {note && <p className="pg-muted" style={{ marginBottom: 10 }}>{note}</p>}
        {!cfg ? (msg ? null : <Loading />) : (
          <>
            {fields.map((f) => f.type === 'bool' ? (
              <label className="pg-toggle" key={f.key}><input type="checkbox" checked={!!cfg[f.key]} onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.checked })} />{f.label}</label>
            ) : f.type === 'select' ? (
              <label className="pg-field" key={f.key}>{f.label}
                <select className="pg-select" value={cfg[f.key]} onChange={(e) => setCfg({ ...cfg, [f.key]: e.target.value })}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
              </label>
            ) : (
              <label className="pg-field" key={f.key}>{f.label}
                <input className="pg-input" type="number" min="1" value={cfg[f.key]} onChange={(e) => setCfg({ ...cfg, [f.key]: Number(e.target.value) })} />
              </label>
            ))}
            <button className="pg-btn" onClick={submit}>Save</button>
          </>
        )}
        {msg && <div className={`pg-msg ${msg.type}`} style={{ marginTop: 10 }}>{msg.text}</div>}
      </div>
    </div>
  );
}

function SecondaryPassword() {
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(null);
  const submit = async () => {
    try { setMsg(null); await adminService.setSecondaryPassword(pw); setPw(''); setMsg({ type: 'ok', text: 'Unlock password updated.' }); }
    catch (e) { setMsg({ type: 'err', text: e.message }); }
  };
  return (
    <div className="panel">
      <div className="panel-header"><h2>Sensitive-log unlock password</h2></div>
      <div className="panel-body">
        <div className="pg-row">
          <input className="pg-input" type="password" placeholder="New unlock password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="pg-btn" disabled={pw.length < 8} onClick={submit}>Update</button>
        </div>
        <p className="pg-muted" style={{ marginTop: 8 }}>At least 8 characters.</p>
        {msg && <div className={`pg-msg ${msg.type}`} style={{ marginTop: 10 }}>{msg.text}</div>}
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  useEffect(() => { if (isAdmin) adminService.getSecurityStatus().then(setStatus).catch(() => {}); }, [isAdmin]);

  return (
    <PageContainer>
      <div className="pg-stack">
        <div className="pg-title-row"><h1>Settings</h1></div>

        <div className="panel">
          <div className="panel-header"><h2>Your account</h2></div>
          <div className="panel-body">
            <dl className="pg-kv">
              <dt>Email</dt><dd>{user?.email}</dd>
              <dt>Role</dt><dd>{user?.role}</dd>
              <dt>Sensitive log access</dt><dd>{user?.sensitiveAccess ? 'Approved' : 'Not approved'}</dd>
            </dl>
          </div>
        </div>

        {isAdmin && (
          <>
            {status && (
              <div className="panel">
                <div className="panel-header"><h2>Security status</h2></div>
                <div className="panel-body pg-row">
                  {Object.entries(status).map(([k, v]) => <span key={k} className={`badge ${v ? 'badge-success' : 'badge-critical'}`}>{k}: {v ? 'on' : 'off'}</span>)}
                </div>
              </div>
            )}
            <Toggles title="Masking rules" note="Applies to logs uploaded after you save."
              load={adminService.getMasking} save={adminService.saveMasking}
              fields={['email', 'password', 'apiKey', 'phone', 'ip'].map((k) => ({ key: k, label: `Mask ${k}`, type: 'bool' }))} />
            <Toggles title="Detection settings" load={adminService.getAiSettings} save={adminService.saveAiSettings}
              fields={[
                { key: 'anomalyDetection', label: 'Anomaly detection', type: 'bool' },
                { key: 'threatCorrelation', label: 'Threat correlation', type: 'bool' },
                { key: 'aiMasking', label: 'AI masking (not active yet)', type: 'bool' },
                { key: 'automaticAlerts', label: 'Automatic alerts', type: 'bool' },
                { key: 'sensitivity', label: 'Sensitivity', type: 'select', options: ['low', 'medium', 'high'] },
              ]} />
            <Toggles title="System settings" load={adminService.getSystemSettings} save={adminService.saveSystemSettings}
              fields={[
                { key: 'logRetentionDays', label: 'Log retention (days)', type: 'num' },
                { key: 'maxUploadSizeMb', label: 'Max upload size (MB)', type: 'num' },
                { key: 'sessionTimeoutMinutes', label: 'Session timeout (minutes)', type: 'num' },
                { key: 'notifyOnCriticalAlerts', label: 'Notify on critical alerts', type: 'bool' },
              ]} />
            <SecondaryPassword />
          </>
        )}
      </div>
    </PageContainer>
  );
}
