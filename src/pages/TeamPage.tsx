import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Zap,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Award,
  Code2,
  Sparkles,
  Calculator,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { calculateMultiplier, calculateBoostPercentage, calculateFinalScore } from '../utils/multiplier';
import { MultiplierModal } from '../components/MultiplierModal';

export const TeamPage: React.FC = () => {
  const { user } = useAuth();
  const {
    gameStatus,
    currentRound,
    currentPrompt,
    secondsRemaining,
    bids,
    placeBid,
    updateBid,
    myAssignment,
    myScore
  } = useSocket();

  const [bidMinutes, setBidMinutes] = useState<number>(60);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);

  // Coding phase personal timer
  const [codingSecondsLeft, setCodingSecondsLeft] = useState<number>(0);
  const [isCodingTimerRunning, setIsCodingTimerRunning] = useState<boolean>(false);

  // Initialize coding timer when assignment is received
  useEffect(() => {
    if (myAssignment?.bidMinutes) {
      setCodingSecondsLeft(myAssignment.bidMinutes * 60);
    }
  }, [myAssignment]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isCodingTimerRunning && codingSecondsLeft > 0) {
      interval = setInterval(() => {
        setCodingSecondsLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCodingTimerRunning, codingSecondsLeft]);

  // Find if current team already placed a bid on this prompt
  const myExistingBid = bids.find((b) => b.teamId === user?.teamId);

  useEffect(() => {
    if (myExistingBid) {
      setBidMinutes(myExistingBid.bidMinutes);
    }
  }, [myExistingBid]);

  // Anti-collision check: Does another team have the same bid minutes?
  const collisionBid = bids.find(
    (b) => b.teamId !== user?.teamId && b.bidMinutes === bidMinutes
  );

  const currentMultiplier = calculateMultiplier(bidMinutes, currentRound || 1);
  const boost = calculateBoostPercentage(currentMultiplier);
  const simulatedScore = calculateFinalScore(80, currentMultiplier);

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (collisionBid) {
      setErrorMsg(`Another team has already bid ${bidMinutes} mins. Pick another value!`);
      return;
    }

    if (bidMinutes < 30 || bidMinutes > 120) {
      setErrorMsg('Bid must be between 30 and 120 minutes');
      return;
    }

    setSubmitting(true);
    try {
      const res = myExistingBid ? await updateBid(bidMinutes) : await placeBid(bidMinutes);
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to place bid');
      }
      setSuccessMsg(`Bid placed for ${bidMinutes} minutes!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place bid';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-surface-200/80 border border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-white">
                Team {user?.teamName || 'Dashboard'}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Round: <span className="text-brand-amber font-bold">{currentRound || 'Waiting'}</span> • Status:{' '}
              <span className="text-brand-cyan uppercase font-bold">{gameStatus}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCalcOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-300 hover:bg-surface-100 text-slate-200 border border-surface-border text-xs font-mono transition-colors"
        >
          <Calculator className="w-4 h-4 text-brand-cyan" />
          <span>Formula Simulator</span>
        </button>
      </div>

      {/* STATE A: ASSIGNED TO A PROMPT (CODING PHASE) */}
      {myAssignment ? (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-surface-200 via-surface-100 to-emerald-950/20 border border-emerald-500/30 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PROMPT SECURED</span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {myAssignment.round ? `Round ${myAssignment.round} Winner` : 'Slot Winner'}
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                {myAssignment.title}
              </h2>
              <div className="mt-3 p-4 rounded-xl bg-surface-300/80 border border-surface-border text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {myAssignment.description}
              </div>
            </div>

            {/* Committed Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-surface-300 border border-surface-border">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Coding Commitment</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {myAssignment.bidMinutes} mins
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-300 border border-surface-border">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Multiplier Awarded</div>
                <div className="text-2xl font-bold font-mono text-brand-cyan mt-1">
                  {Number(myAssignment.multiplier).toFixed(3)}x
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-300 border border-surface-border">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Score Multiplier Boost</div>
                <div className="text-2xl font-bold font-mono text-brand-emerald mt-1">
                  +{calculateBoostPercentage(Number(myAssignment.multiplier)).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Personal Coding Stopwatch Timer */}
            <div className="p-6 rounded-2xl bg-surface-300/60 border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase">
                  <Code2 className="w-4 h-4 text-brand-cyan" />
                  <span>Your Coding Time Countdown</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black font-mono text-white mt-1">
                  {formatTimer(codingSecondsLeft)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCodingTimerRunning(!isCodingTimerRunning)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all shadow-md ${
                    isCodingTimerRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                      : 'bg-brand-emerald hover:bg-brand-emerald/90 text-slate-950 shadow-brand-emerald/20'
                  }`}
                >
                  {isCodingTimerRunning ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>PAUSE TIMER</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>START CODING TIMER</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsCodingTimerRunning(false);
                    setCodingSecondsLeft(myAssignment.bidMinutes * 60);
                  }}
                  className="p-2.5 rounded-xl bg-surface-200 hover:bg-surface-100 text-slate-300 border border-surface-border transition-colors"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Final Judge Score Result (if received) */}
            {myScore && (
              <div className="p-6 rounded-2xl bg-surface-300 border border-brand-cyan/40 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-brand-cyan font-mono text-sm font-bold uppercase">
                  <Award className="w-5 h-5" />
                  <span>Official Judge Evaluation Received!</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-surface-200">
                    <span className="text-xs font-mono text-slate-400 block">Judge Raw Score</span>
                    <span className="text-2xl font-bold font-mono text-white">
                      {myScore.judgeScore} / 100
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-200">
                    <span className="text-xs font-mono text-slate-400 block">Multiplier</span>
                    <span className="text-2xl font-bold font-mono text-brand-cyan">
                      {Number(myScore.multiplier).toFixed(3)}x
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-200 border border-brand-cyan/30">
                    <span className="text-xs font-mono text-slate-400 block">Final Multiplied Score</span>
                    <span className="text-3xl font-black font-mono text-brand-emerald">
                      {Number(myScore.finalScore).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STATE B: BIDDING IN PROGRESS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Active Prompt & Live Bidding Console */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Prompt Card */}
            <div className="p-6 rounded-2xl bg-surface-200/80 border border-surface-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                  CURRENT PROBLEM
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {secondsRemaining > 0 ? (
                    <strong className="text-brand-amber">{secondsRemaining}s left to bid</strong>
                  ) : (
                    <span>Timer Expired</span>
                  )}
                </span>
              </div>

              {currentPrompt ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold font-mono text-white">
                    {currentPrompt.title}
                  </h2>
                  <p className="text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                    {currentPrompt.description}
                  </p>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 font-mono text-xs">
                  Awaiting next prompt from admin. Bidding will unlock as soon as prompt is revealed!
                </div>
              )}
            </div>

            {/* Bidding Control Panel */}
            <div className="p-6 rounded-2xl bg-surface-200/80 border border-surface-border space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand-cyan" />
                  <h3 className="font-bold font-mono text-white text-base">Place Your Time Bid</h3>
                </div>
                {myExistingBid && (
                  <span className="text-xs font-mono text-brand-emerald font-semibold">
                    Current Bid: {myExistingBid.bidMinutes} mins
                  </span>
                )}
              </div>

              {/* Alert Messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Collision Warning */}
              {collisionBid && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-3 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="text-white block mb-0.5">DUPLICATE BID COLLISION:</strong>
                    Another team has already bid <strong>{bidMinutes} minutes</strong>. No two teams can bid the same time. Select another number (e.g. {bidMinutes - 1} or {bidMinutes + 1}).
                  </div>
                </div>
              )}

              <form onSubmit={handleBidSubmit} className="space-y-6">
                {/* Quick Chips */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-2">
                    Quick Select Minutes:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[30, 45, 60, 75, 90, 105, 120].map((mins) => {
                      const isTaken = bids.some(
                        (b) => b.teamId !== user?.teamId && b.bidMinutes === mins
                      );
                      const isSelected = bidMinutes === mins;
                      return (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setBidMinutes(mins)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                            isSelected
                              ? 'bg-brand-cyan text-slate-950 border-brand-cyan shadow-md shadow-brand-cyan/20'
                              : isTaken
                              ? 'bg-surface-300/50 text-slate-600 border-surface-border line-through'
                              : 'bg-surface-300 hover:bg-surface-100 text-slate-300 border-surface-border'
                          }`}
                        >
                          {mins}m {isTaken && '(taken)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slider & Number Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-300">Adjust Committed Time:</span>
                    <span className="text-base font-bold text-brand-cyan">{bidMinutes} mins</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={120}
                    step={1}
                    value={bidMinutes}
                    onChange={(e) => setBidMinutes(Number(e.target.value))}
                    className="w-full accent-brand-cyan cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>30m (Higher Multiplier)</span>
                    <span>120m (Base Time)</span>
                  </div>
                </div>

                {/* Live Multiplier Preview */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-300 border border-surface-border text-center">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Multiplier</div>
                    <div className="text-lg font-bold font-mono text-brand-cyan mt-0.5">
                      {currentMultiplier.toFixed(3)}x
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Boost</div>
                    <div className="text-lg font-bold font-mono text-brand-emerald mt-0.5">
                      +{boost.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Sim on 80 Pts</div>
                    <div className="text-lg font-bold font-mono text-brand-amber mt-0.5">
                      {simulatedScore.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Submit / Update Button */}
                <button
                  type="submit"
                  disabled={submitting || !!collisionBid || gameStatus !== 'bidding'}
                  className={`w-full py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-lg disabled:opacity-50 ${
                    myExistingBid
                      ? 'bg-brand-emerald hover:bg-brand-emerald/90 text-slate-950 shadow-brand-emerald/20'
                      : 'bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 shadow-brand-cyan/20'
                  }`}
                >
                  {submitting ? (
                    'SUBMITTING...'
                  ) : gameStatus !== 'bidding' ? (
                    'BIDDING IS CURRENTLY CLOSED'
                  ) : collisionBid ? (
                    'CANNOT SUBMIT: TIME COLLISION'
                  ) : myExistingBid ? (
                    `UPDATE BID TO ${bidMinutes} MINS`
                  ) : (
                    `PLACE BID FOR ${bidMinutes} MINS`
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column (5 cols): Live Bids Board */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-surface-200/80 border border-surface-border flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-brand-cyan" />
                <h3 className="font-bold font-mono text-white text-base">Auction Board</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">Top 3 Win Slots</span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1 flex-1">
              {bids.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-500 font-mono text-xs">
                  No bids placed yet for this prompt
                </div>
              ) : (
                bids.map((b, idx) => {
                  const isMine = b.teamId === user?.teamId;
                  const isWinning = idx < 3;
                  const m = calculateMultiplier(b.bidMinutes, currentRound || 1);

                  return (
                    <div
                      key={b.teamId}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isMine
                          ? 'bg-brand-cyan/15 border-brand-cyan shadow-md shadow-brand-cyan/10'
                          : isWinning
                          ? 'bg-surface-300/80 border-emerald-500/30'
                          : 'bg-surface-300/40 border-surface-border opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center ${
                            isWinning
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-surface-200 text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-xs text-white">
                              {b.teamName || `Team #${b.teamId}`}
                            </span>
                            {isMine && (
                              <span className="text-[10px] font-mono px-1 rounded bg-brand-cyan text-slate-950 font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {b.bidMinutes} mins
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-brand-cyan block">
                          {m.toFixed(3)}x
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {isWinning ? (
                            <strong className="text-emerald-400">Winning Slot</strong>
                          ) : (
                            'Outbid'
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <MultiplierModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </div>
  );
};
