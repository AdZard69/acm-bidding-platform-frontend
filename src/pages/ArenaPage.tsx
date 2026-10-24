import React, { useState, useEffect } from 'react';
import {
  Tv,
  Maximize2,
  Minimize2,
  Clock,
  Award,
  Zap,
  TrendingDown,
  Sparkles,
  Volume2,
  VolumeX,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSocket } from '../context/SocketContext';
import { calculateMultiplier, calculateBoostPercentage } from '../utils/multiplier';
import { WinnerResult } from '../types';

export const ArenaPage: React.FC = () => {
  const {
    gameStatus,
    currentRound,
    currentPrompt,
    secondsRemaining,
    bids,
    lastWinners,
    soundEnabled,
    toggleSound
  } = useSocket();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Trigger celebration confetti when lastWinners arrives
  useEffect(() => {
    if (lastWinners && lastWinners.length > 0) {
      setShowWinnerModal(true);
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore if confetti fails
      }
      const timer = setTimeout(() => {
        setShowWinnerModal(false);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [lastWinners]);

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
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Color logic for timer
  const isUrgent = secondsRemaining <= 10 && secondsRemaining > 0;
  const isWarning = secondsRemaining <= 20 && secondsRemaining > 10;

  const timerColor = isUrgent
    ? 'text-rose-500 border-rose-500/50 shadow-rose-500/30'
    : isWarning
    ? 'text-amber-400 border-amber-400/50 shadow-amber-400/30'
    : 'text-brand-cyan border-brand-cyan/40 shadow-brand-cyan/20';

  return (
    <div className="relative min-h-[92vh] flex flex-col p-4 sm:p-6 lg:p-8 bg-[#070A10] text-slate-100 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Arena Top Bar */}
      <div className="relative z-10 flex items-center justify-between pb-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan shadow-lg shadow-brand-cyan/10">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-mono tracking-wider text-white uppercase">
                Auditorium Arena
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                LIVE STAGE
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Big Screen Projector Broadcast • Real-time Open Auction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Round Indicator Badge */}
          <div className="px-3.5 py-1.5 rounded-xl bg-surface-200 border border-surface-border font-mono text-xs flex items-center gap-2">
            <span className="text-slate-400 uppercase">ROUND</span>
            <span className="font-bold text-brand-amber text-sm">{currentRound > 0 ? currentRound : 'WAITING'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-surface-200 text-slate-300 hover:text-white border-surface-border'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-200 hover:bg-surface-100 text-slate-200 border border-surface-border font-mono text-xs transition-colors"
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Active Prompt + Timer, Right = Live Bids Board */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column (7 cols): Timer & Prompt Statement */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Big Center Timer Display */}
          <div className="p-6 rounded-2xl bg-surface-200/70 border border-surface-border flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-cyan" />
              <span>BIDDING TIME REMAINING</span>
            </div>

            <div
              className={`text-6xl sm:text-8xl font-black font-mono tracking-tight my-2 transition-all ${
                isUrgent ? 'animate-pulse-fast text-rose-500' : isWarning ? 'text-amber-400' : 'text-brand-cyan'
              }`}
            >
              {formatTime(secondsRemaining)}
            </div>

            {/* Status bar under timer */}
            <div className="mt-3 flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    gameStatus === 'bidding'
                      ? 'bg-emerald-500 animate-ping'
                      : gameStatus === 'paused'
                      ? 'bg-amber-500'
                      : 'bg-slate-500'
                  }`}
                />
                STATUS: <strong className="text-white uppercase">{gameStatus}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                TOTAL BIDS: <strong className="text-brand-cyan">{bids.length}</strong>
              </span>
            </div>
          </div>

          {/* Active Prompt Card */}
          <div className="flex-1 p-6 sm:p-8 rounded-2xl bg-surface-200/50 border border-surface-border flex flex-col justify-between backdrop-blur-md">
            {currentPrompt ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                    PROBLEM STATEMENT #{currentPrompt.displayOrder || currentPrompt.id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Target: 3 Winning Slots
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {currentPrompt.title}
                </h2>

                <div className="p-4 rounded-xl bg-surface-300/80 border border-surface-border text-sm sm:text-base text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {currentPrompt.description}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-surface-300 border border-surface-border flex items-center justify-center text-slate-500">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold font-mono text-white">Awaiting Next Prompt</h3>
                <p className="text-xs text-slate-400 font-mono max-w-sm">
                  The admin will reveal the next problem statement shortly. All teams get ready!
                </p>
              </div>
            )}

            {/* Bidding Rules Quick Bar */}
            <div className="mt-6 pt-4 border-t border-surface-border flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-3">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Min Bid: <strong>30 mins</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand-blue" />
                <span>Base Time: <strong>120 mins</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-brand-amber" />
                <span>No Duplicate Bids</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Live Bids Leaderboard Wall */}
        <div className="lg:col-span-5 flex flex-col p-6 rounded-2xl bg-surface-200/50 border border-surface-border backdrop-blur-md">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-brand-emerald" />
              <h3 className="font-bold font-mono text-white text-base tracking-wide">
                Live Bids Leaderboard
              </h3>
            </div>
            <span className="text-xs font-mono text-brand-cyan">
              Lowest 3 Win
            </span>
          </div>

          {/* Bids List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {bids.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs space-y-2">
                <span className="animate-pulse">WAITING FOR TEAMS TO PLACE BIDS...</span>
                <span className="text-[11px] text-slate-600">Bids will stream in live on this board</span>
              </div>
            ) : (
              bids.map((bid, index) => {
                const isWinningSlot = index < 3;
                const multiplier = calculateMultiplier(bid.bidMinutes, currentRound || 1);
                const boost = calculateBoostPercentage(multiplier);

                return (
                  <div
                    key={bid.teamId}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      isWinningSlot
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-md shadow-emerald-950/30'
                        : 'bg-surface-300/60 border-surface-border opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                          isWinningSlot
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                            : 'bg-surface-100 text-slate-400'
                        }`}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-mono">
                            {bid.teamName || `Team #${bid.teamId}`}
                          </span>
                          {isWinningSlot && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              QUALIFIED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Time: <strong className="text-white">{bid.bidMinutes} mins</strong>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-brand-cyan text-sm">
                        {multiplier.toFixed(3)}x
                      </div>
                      <div className="text-[10px] font-mono text-brand-emerald">
                        +{boost.toFixed(1)}% Boost
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Qualified Cutoff Divider Note */}
          <div className="mt-4 pt-3 border-t border-surface-border text-center">
            <p className="text-[11px] font-mono text-slate-400">
              Only the <span className="text-emerald-400 font-bold">TOP 3 TEAMS</span> get assigned this prompt
            </p>
          </div>
        </div>
      </div>

      {/* WINNERS REVEALED CELEBRATION MODAL */}
      {showWinnerModal && lastWinners && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
          <div className="relative w-full max-w-2xl bg-surface-100 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-bounce">
              <Award className="w-10 h-10" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 text-brand-cyan font-mono text-sm tracking-widest uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Bidding Concluded</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-3xl font-black font-mono text-white mt-1">
                Prompt Winners Assigned!
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                The 3 winning teams have claimed their slots and multiplier factors
              </p>
            </div>

            {/* Winners Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {lastWinners.map((winner, idx) => (
                <div
                  key={winner.teamId}
                  className="p-4 rounded-2xl bg-surface-200/80 border border-emerald-500/30 text-center space-y-2 shadow-lg"
                >
                  <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500 text-slate-950 font-bold font-mono text-sm flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div className="font-bold text-white font-mono text-base truncate">
                    {winner.teamName}
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Bid: <strong className="text-white">{winner.bidMinutes}m</strong>
                  </div>
                  <div className="pt-2 border-t border-surface-border">
                    <span className="text-xs font-mono text-slate-400 block">MULTIPLIER</span>
                    <span className="text-xl font-black font-mono text-brand-cyan">
                      {Number(winner.multiplier).toFixed(3)}x
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowWinnerModal(false)}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold transition-colors"
            >
              Dismiss Announcement
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
