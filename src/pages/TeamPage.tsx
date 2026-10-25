import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Zap,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import { calculateMultiplier, calculateBoostPercentage, calculateFinalScore } from '../utils/multiplier';
import { Assignment, Bid } from '../types';

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
    myAssignment: socketAssignment,
    myScore: socketScore
  } = useSocket();

  const [bidMinutes, setBidMinutes] = useState<number>(60);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // REST-backed state
  const [persistedAssignment, setPersistedAssignment] = useState<Assignment | null>(null);
  const [myBidsHistory, setMyBidsHistory] = useState<Bid[]>([]);

  // Fetch team's assignment and previous bids on mount
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const [assignRes, bidsRes] = await Promise.allSettled([
          api.getMyAssignment(),
          api.getMyBids()
        ]);
        if (assignRes.status === 'fulfilled' && assignRes.value.success) {
          setPersistedAssignment(assignRes.value.assignment);
        }
        if (bidsRes.status === 'fulfilled' && bidsRes.value.success) {
          setMyBidsHistory(bidsRes.value.bids);
        }
      } catch {
        // Fallback
      }
    };
    fetchTeamData();
  }, []);

  // Use socket assignment or persisted assignment
  const activeAssignment = socketAssignment || persistedAssignment;

  const assignmentTitle =
    activeAssignment && 'title' in activeAssignment
      ? activeAssignment.title
      : (activeAssignment as Assignment | null)?.prompt?.title || 'Problem Statement';

  const assignmentDescription =
    activeAssignment && 'description' in activeAssignment
      ? activeAssignment.description
      : (activeAssignment as Assignment | null)?.prompt?.description || '';

  // Find team's existing bid on the current prompt
  const myCurrentBid = bids.find((b) => b.teamId === user?.teamId);

  useEffect(() => {
    if (myCurrentBid) {
      setBidMinutes(myCurrentBid.bidMinutes);
    }
  }, [myCurrentBid]);

  // Anti-collision check: Does another team have the exact same bid minutes?
  const collision = bids.find(
    (b) => b.teamId !== user?.teamId && b.bidMinutes === bidMinutes
  );

  const multiplier = calculateMultiplier(bidMinutes, currentRound || 1);
  const boost = calculateBoostPercentage(multiplier);
  const simulatedScore = calculateFinalScore(80, multiplier);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (collision) {
      setErrorMsg(`Minute collision: another team already bid ${bidMinutes}m. Select a unique time.`);
      return;
    }

    if (bidMinutes < 30 || bidMinutes > 120) {
      setErrorMsg('Bid must be between 30 and 120 minutes.');
      return;
    }

    setSubmitting(true);
    try {
      const res = myCurrentBid ? await updateBid(bidMinutes) : await placeBid(bidMinutes);
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to place bid');
      }
      setSuccessMsg(`Bid recorded: ${bidMinutes} minutes`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place bid';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Team Header */}
      <div className="p-4 rounded-xl bg-surface-100 border border-surface-border flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-surface-50 text-brand-emerald">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white text-sm block">{user?.teamName}</span>
            <span className="text-slate-400">Team Dashboard</span>
          </div>
        </div>

        <div className="text-right text-slate-400">
          <div>Status: <strong className="text-white uppercase">{gameStatus}</strong></div>
          {currentRound > 0 && <div>Round: <strong className="text-brand-amber">R{currentRound}</strong></div>}
        </div>
      </div>

      {/* STATE A: TEAM HAS BEEN ASSIGNED A PROMPT */}
      {activeAssignment ? (
        <div className="p-6 rounded-xl bg-surface-100 border border-emerald-500/30 space-y-6 font-mono">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Assigned Problem Statement
            </span>
            <span className="text-xs text-slate-400">
              Round {activeAssignment.round} Winner
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              {assignmentTitle}
            </h2>
            <div className="p-4 rounded-lg bg-surface-200 border border-surface-border text-sm text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
              {assignmentDescription}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border">
              <span className="text-slate-400 block">Committed Time</span>
              <span className="text-lg font-bold text-white mt-0.5 block">
                {activeAssignment.bidMinutes} mins
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border">
              <span className="text-slate-400 block">Multiplier</span>
              <span className="text-lg font-bold text-brand-cyan mt-0.5 block">
                {Number(activeAssignment.multiplier).toFixed(3)}x
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border">
              <span className="text-slate-400 block">Multiplier Boost</span>
              <span className="text-lg font-bold text-brand-emerald mt-0.5 block">
                +{calculateBoostPercentage(Number(activeAssignment.multiplier)).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Judge Evaluation Score (if received) */}
          {socketScore && (
            <div className="p-4 rounded-lg bg-surface-200 border border-surface-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-brand-cyan font-bold uppercase">
                <Award className="w-4 h-4" />
                <span>Judge Evaluation Result</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Judge Raw Score</span>
                  <span className="text-base font-bold text-white">{socketScore.judgeScore} / 100</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Multiplier</span>
                  <span className="text-base font-bold text-brand-cyan">{Number(socketScore.multiplier).toFixed(3)}x</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Final Multiplied Score</span>
                  <span className="text-base font-bold text-emerald-400">{Number(socketScore.finalScore).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STATE B: BIDDING IN PROGRESS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Prompt & Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-brand-cyan font-bold">CURRENT PROMPT</span>
                <span className="text-slate-400">
                  {secondsRemaining > 0 ? (
                    <strong className="text-white">{secondsRemaining}s left to bid</strong>
                  ) : (
                    <span>Timer Expired</span>
                  )}
                </span>
              </div>

              {currentPrompt ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold font-mono text-white">
                    {currentPrompt.title}
                  </h3>
                  <p className="text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                    {currentPrompt.description}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 font-mono text-xs">
                  No active prompt. Bidding unlocks when the admin reveals the prompt.
                </div>
              )}
            </div>

            {/* Bidding Form */}
            <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <span className="font-bold text-white uppercase">Place Time Commitment</span>
                {myCurrentBid && (
                  <span className="text-emerald-400">
                    Your Bid: {myCurrentBid.bidMinutes} mins
                  </span>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {collision && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Conflict: Another team already bid {bidMinutes}m. Choose another value.</span>
                </div>
              )}

              <form onSubmit={handleSubmitBid} className="space-y-5">
                {/* Minute Chips */}
                <div>
                  <label className="text-slate-400 block mb-2">Preset Minutes:</label>
                  <div className="flex flex-wrap gap-1.5">
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
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                              : isTaken
                              ? 'bg-surface-200 text-slate-600 border-surface-border line-through'
                              : 'bg-surface-200 text-slate-300 border-surface-border hover:text-white'
                          }`}
                        >
                          {mins}m
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Bid Minutes:</span>
                    <span className="font-bold text-[#D4AF37] text-sm">{bidMinutes} mins</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={120}
                    step={1}
                    value={bidMinutes}
                    onChange={(e) => setBidMinutes(Number(e.target.value))}
                    className="w-full accent-[#D4AF37] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>30m (Max Multiplier)</span>
                    <span>120m (Base Time)</span>
                  </div>
                </div>

                {/* Multiplier Formula preview */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-surface-200 border border-surface-border text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Multiplier</span>
                    <span className="text-sm font-bold text-brand-cyan">{multiplier.toFixed(3)}x</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Boost</span>
                    <span className="text-sm font-bold text-brand-emerald">+{boost.toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Sim on 80/100</span>
                    <span className="text-sm font-bold text-slate-200">{simulatedScore.toFixed(1)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !!collision || gameStatus !== 'bidding'}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40"
                >
                  {submitting
                    ? 'Submitting...'
                    : gameStatus !== 'bidding'
                    ? 'Bidding Closed'
                    : collision
                    ? 'Time Taken'
                    : myCurrentBid
                    ? `Update Bid to ${bidMinutes}m`
                    : `Submit Bid: ${bidMinutes}m`}
                </button>
              </form>
            </div>
          </div>

          {/* Live Placed Bids Column (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-surface-100 border border-surface-border flex flex-col font-mono text-xs">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
              <span className="font-bold text-white uppercase">Auction Board</span>
              <span className="text-slate-400">Lowest 3 Qualify</span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[440px] pr-1 flex-1">
              {bids.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-500">
                  No bids placed yet
                </div>
              ) : (
                bids.map((b, idx) => {
                  const isMine = b.teamId === user?.teamId;
                  const isWinning = idx < 3;
                  const m = calculateMultiplier(b.bidMinutes, currentRound || 1);

                  return (
                    <div
                      key={b.teamId}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        isMine
                          ? 'bg-surface-50 border-white text-white'
                          : isWinning
                          ? 'bg-surface-200 border-emerald-500/40 text-slate-200'
                          : 'bg-surface-300 border-surface-border text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                            isWinning ? 'bg-emerald-500 text-slate-950' : 'bg-surface-100 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span>{b.teamName || `Team #${b.teamId}`} {isMine && '(You)'}</span>
                      </div>

                      <div className="text-right">
                        <div>{b.bidMinutes}m</div>
                        <div className="text-[10px] text-slate-400">{m.toFixed(3)}x</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
