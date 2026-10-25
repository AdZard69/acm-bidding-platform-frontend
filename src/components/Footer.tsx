import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-surface-border bg-surface-300 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500">
        <div>ACM Student Chapter — Bid & Code</div>
        <div>Hackathon Platform</div>
      </div>
    </footer>
  );
};
