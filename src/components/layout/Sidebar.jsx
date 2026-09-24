import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Bell, Shield, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/logs', icon: FileText, label: 'Logs' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/admin', icon: Shield, label: 'Admin', adminOnly: true },
];

export default function Sidebar() {
  const { isAdmin } = useAuth();
  // Admin sees ONLY the Admin page. Everyone else sees everything except Admin.
  const items = navItems.filter((i) => (isAdmin ? i.adminOnly : !i.adminOnly));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Shield size={28} />
        <h2>ULPF</h2>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {!isAdmin && (
      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </div>
      )}
    </aside>
  );
}
