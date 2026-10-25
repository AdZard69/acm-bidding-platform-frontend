import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-[#0B0B0B] py-5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#7A756D]">
        <div className="flex items-center gap-2">
          <span className="text-[#A8A29E] font-bold">USICT-ACM</span>
          <span className="text-[#D4AF37]/50">•</span>
          <span>Bid & Code Hackathon</span>
        </div>
        <div className="text-[11px] text-[#7A756D]">
          Time-Commitment Strategy & Execution
        </div>
      </div>
    </footer>
  );
};
