import React, { useState, useEffect } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  Clock,
  TrendingDown
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { BiddingTimerBadge } from '../components/BiddingTimerBadge';

export const ArenaPage: React.FC = () => {
  const {
    isConnected,
    gameStatus,
    currentRound,
    hasNextRound,
    currentPrompt,
    secondsRemaining,
    isPaused,
    isExpired,
    biddingConfig,
    availableSlots,
    bids,
    lastWinners,
    refreshState
  } = useSocket();

  const [isFullscreen, setIsFullscreen] = useState(false);


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isUrgent = secondsRemaining <= 10 && secondsRemaining > 0;
  const isWarning = secondsRemaining <= 20 && secondsRemaining > 10;

  return (
    <div className="min-h-[92vh] flex flex-col p-4 sm:p-6 bg-background text-slate-100">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-100 border border-surface-border text-slate-300">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-mono text-white">
              Auditorium Arena
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Live Auction & Timer Display
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BiddingTimerBadge compact />

          <div className="px-3 py-1.5 rounded-lg bg-surface-100 border border-surface-border font-mono text-xs text-slate-300">
            STATUS: <strong className="text-white uppercase">{gameStatus}</strong>
            {currentRound > 0 && <span className="ml-2 text-brand-amber">• R{currentRound}</span>}
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 text-slate-300 border border-surface-border font-mono text-xs transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column (7 cols): Timer & Problem Statement */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Big Digital Timer Display */}
          <div className="p-8 rounded-xl bg-surface-100 border border-surface-border flex flex-col items-center justify-center">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{isPaused ? 'Timer Paused' : 'Authoritative Countdown'}</span>
            </span>

            <div
              className={`text-6xl sm:text-8xl font-black font-mono tracking-tight my-2 ${
                isPaused
                  ? 'text-amber-400'
                  : isUrgent
                  ? 'text-rose-400 animate-pulse'
                  : isWarning
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {formatTime(secondsRemaining)}
            </div>

            {isPaused && (
              <div className="text-xs font-mono px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase mt-1">
                Round Paused
              </div>
            )}

            <div className="text-xs font-mono text-slate-400 mt-2">
              Total Bids: <strong className="text-white">{bids.length}</strong>
            </div>
          </div>

          {gameStatus === 'round_ended' && <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm font-mono">
            Round {currentRound} complete. {hasNextRound ? 'Waiting for the admin to open the next prompt.' : 'All prompt rounds are complete.'}
          </div>}

          {/* Active Prompt Card */}
          <div className="flex-1 p-6 rounded-xl bg-surface-100 border border-surface-border flex flex-col justify-between">
            {currentPrompt ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="px-2.5 py-0.5 rounded bg-surface-50 text-brand-cyan border border-surface-border font-bold">
                    ROUND {currentRound} · PROMPT {currentRound}
                  </span>
                  <span className="text-slate-400">{biddingConfig.slotsPerPrompt} Winning Slots</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold font-mono text-white">
                  {currentPrompt.title}
                </h2>

                <div className="p-4 rounded-lg bg-surface-200 border border-surface-border text-sm text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                  {currentPrompt.description}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs">
                Awaiting next prompt from admin
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-surface-border flex justify-between text-xs font-mono text-slate-400">
              <span>Min Bid: {biddingConfig.minBid}m</span>
              <span>Max Time: {biddingConfig.baseTime}m</span>
              <span>Anti-Collision: Unique minute bids</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Bids Wall */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-surface-100 border border-surface-border flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-brand-emerald" />
              <h3 className="font-mono font-bold text-white text-sm">
                Placed Bids (Lowest {biddingConfig.slotsPerPrompt} Qualify)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {bids.length} entries
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {bids.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 font-mono text-xs">
                No bids placed yet
              </div>
            ) : (
              bids.map((b, idx) => {
                const isWinning = gameStatus === 'round_ended'
                  ? Boolean(lastWinners?.some((winner) => winner.teamId === b.teamId)) : idx < availableSlots;

                return (
                  <div
                    key={b.teamId}
                    className={`p-3 rounded-lg border font-mono flex items-center justify-between text-xs ${
                      isWinning
                        ? 'bg-surface-50 border-emerald-500/40 text-white'
                        : 'bg-surface-200/50 border-surface-border text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] ${
                          isWinning ? 'bg-emerald-500 text-slate-950' : 'bg-surface-300 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-white">
                        {b.teamName || `Team #${b.teamId}`}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {b.bidMinutes} mins
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {lastWinners && lastWinners.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-border">
              <div className="text-xs font-mono font-bold text-emerald-400 mb-2 uppercase">
                Awarded Winners:
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                {lastWinners.map((w, i) => (
                  <div key={w.teamId} className="flex justify-between text-slate-300">
                    <span>#{i + 1} {w.teamName}</span>
                    <span>{w.bidMinutes}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
