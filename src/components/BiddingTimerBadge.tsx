import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const BiddingTimerBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { secondsRemaining, gameStatus, isConnected, isTimerSynced, refreshState } = useSocket();
  const active = gameStatus === 'bidding' || gameStatus === 'paused';
  const display = `${Math.floor(secondsRemaining / 60).toString().padStart(2, '0')}:${(secondsRemaining % 60).toString().padStart(2, '0')}`;
  const label = !isTimerSynced ? 'Syncing bidding timer' : gameStatus === 'paused' ? 'Bidding paused'
    : gameStatus === 'bidding' ? 'Bidding countdown' : gameStatus === 'round_ended' ? 'Round complete' : 'Bidding closed';
  return (
    <div className={`flex items-center gap-2 font-mono border border-surface-border text-xs ${compact ? 'rounded px-2 py-1 bg-surface-200/60' : 'rounded-xl p-3 bg-surface-100 justify-between'}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${isConnected && isTimerSynced ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
        <span className="text-slate-400">{label}</span>
        {active && <strong className="tabular-nums text-white">{display}</strong>}
        {!compact && <span className="text-slate-500">{isConnected ? 'Live' : 'Reconnecting · checking for updates'}</span>}
      </div>
      {!compact && <button type="button" onClick={() => void refreshState()} title="Refresh bidding state" className="p-1 text-slate-300 hover:text-white">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>}
    </div>
  );
};
