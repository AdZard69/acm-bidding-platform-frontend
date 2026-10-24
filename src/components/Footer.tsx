import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-surface-border bg-surface-300/40 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span>ACM Student Chapter</span>
          <span>•</span>
          <span className="text-slate-400">Bid & Code Hackathon Engine</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Formula: <code className="text-brand-cyan">e^(k×(1-bid/120))</code></span>
          <span>•</span>
          <span>Live WebSocket Auction</span>
        </div>
      </div>
    </footer>
  );
};
