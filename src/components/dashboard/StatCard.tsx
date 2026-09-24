import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  color?: string;
  trend?: number;
  trendLabel?: string;
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend, trendLabel }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={24} />
      </div>
      <div className="stat-details">
        <h3>{title}</h3>
        <div className="stat-value">{value}</div>
        {trend !== undefined && (
          <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {Math.abs(trend)}% {trendLabel || 'vs last week'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
