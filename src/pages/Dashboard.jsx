import React, { useState, useEffect } from 'react';
import { FileText, AlertTriangle, Activity, Server } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import StatCard from '../components/dashboard/StatCard';
import RecentEvents from '../components/dashboard/RecentEvents';
import AlertSummary from '../components/dashboard/AlertSummary';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import logService from '../services/logService';
import alertService from '../services/alertService';

export default function Dashboard() {
  const [logStats, setLogStats] = useState(null);
  const [alertSummary, setAlertSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logData, alertData] = await Promise.all([
        logService.getLogStats(),
        alertService.getAlertSummary(),
      ]);
      setLogStats(logData);
      setAlertSummary(alertData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <PageContainer>
      <div className="dashboard">
        <div className="stats-grid">
          <StatCard
            title="Total Logs"
            value={logStats?.total?.toLocaleString() || '0'}
            icon={FileText}
            color="blue"
            trend={12}
            trendLabel="vs last week"
          />
          <StatCard
            title="Active Alerts"
            value={alertSummary?.active || '0'}
            icon={AlertTriangle}
            color="red"
            trend={-5}
            trendLabel="vs last week"
          />
          <StatCard
            title="Critical Events"
            value={logStats?.critical || '0'}
            icon={Activity}
            color="yellow"
            trend={3}
            trendLabel="vs last week"
          />
          <StatCard
            title="Log Sources"
            value={logStats?.sources?.length || '0'}
            icon={Server}
            color="green"
          />
        </div>

        <div className="dashboard-grid">
          <RecentEvents events={logStats?.recentEvents || []} />
          <AlertSummary summary={alertSummary} />
        </div>
      </div>
    </PageContainer>
  );
}
