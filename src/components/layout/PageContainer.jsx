import React from 'react';

export default function PageContainer({ children, title }) {
  return (
    <div className="page-container">
      {title && <h1 className="dashboard-title">{title}</h1>}
      {children}
    </div>
  );
}
