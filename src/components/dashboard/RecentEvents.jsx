import React from 'react';

function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export default function RecentEvents({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2>Recent Events</h2>
        </div>
        <div className="panel-body">
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>
            No recent events
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Recent Events</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Last {events.length} events
        </span>
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        <table className="events-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Source</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <span className={`badge badge-${event.severity}`}>
                    {event.severity}
                  </span>
                </td>
                <td>{event.source}</td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {event.message}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatTime(event.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
