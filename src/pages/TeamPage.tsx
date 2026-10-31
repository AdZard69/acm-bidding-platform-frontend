import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { BiddingTimerBadge } from '../components/BiddingTimerBadge';
import { api } from '../api/client';
import { Bid } from '../types';

export const TeamPage: React.FC = () => {
  const { user } = useAuth();
  const {
    gameStatus,
    currentRound,
    timerId,
    isTimerSynced,
    hasNextRound,
    currentPrompt,
    secondsRemaining,
    isPaused,
    isExpired,
    biddingConfig,
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
  const [myBidsHistory, setMyBidsHistory] = useState<Bid[]>([]);

  // Fetch team's assignment and previous bids on mount
  useEffect(() => {
    let active = true;
    const fetchTeamData = async () => {
      try {
        const bidsRes = await api.getMyBids();
        if (active && bidsRes.success) setMyBidsHistory(bidsRes.bids);
      } catch {
        // Fallback
      }
    };
    fetchTeamData();
    return () => { active = false; };
  }, [gameStatus, currentRound, timerId, user?.teamId]);

  const activeAssignment = socketAssignment;

  const assignmentTitle =
    activeAssignment && 'title' in activeAssignment
      ? activeAssignment.title
      : 'Problem Statement';

  const assignmentDescription =
    activeAssignment && 'description' in activeAssignment
      ? activeAssignment.description
      : '';

  // Find team's existing bid on the current prompt
  const myCurrentBid = bids.find((b) => b.teamId === user?.teamId);

  useEffect(() => {
    setBidMinutes((value) => Math.min(biddingConfig.baseTime, Math.max(biddingConfig.minBid, value)));
  }, [biddingConfig.baseTime, biddingConfig.minBid]);

  useEffect(() => { setErrorMsg(null); setSuccessMsg(null); }, [currentPrompt?.id, currentRound, timerId]);

  useEffect(() => {
    if (myCurrentBid) {
      setBidMinutes(myCurrentBid.bidMinutes);
    }
  }, [myCurrentBid]);

  // Anti-collision check: Does another team have the exact same bid minutes?
  const collision = bids.find(
    (b) => b.teamId !== user?.teamId && b.bidMinutes === bidMinutes
  );

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (collision) {
      setErrorMsg(`Minute collision: another team already bid ${bidMinutes}m. Select a unique time.`);
      return;
    }

    if (isPaused) {
      setErrorMsg('Cannot place bid: round is currently paused.');
      return;
    }

    if (isExpired || secondsRemaining <= 0) {
      setErrorMsg('Cannot place bid: bidding time has expired for this prompt.');
      return;
    }

    if (bidMinutes < biddingConfig.minBid || bidMinutes > biddingConfig.baseTime) {
      setErrorMsg(`Bid must be between ${biddingConfig.minBid} and ${biddingConfig.baseTime} minutes.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = myCurrentBid ? await updateBid(bidMinutes) : await placeBid(bidMinutes);
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to place bid');
      }
      setSuccessMsg(`Bid recorded: ${bidMinutes} minutes`);
      api.getMyBids().then((res) => {
        if (res.success) setMyBidsHistory(res.bids);
      }).catch(() => {});
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

      {/* Synchronized Bidding Countdown */}
      <BiddingTimerBadge />

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

          <div className="p-3 rounded-lg bg-surface-200 border border-surface-border text-xs">
            <span className="text-slate-400 block">Committed Time</span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {activeAssignment.bidMinutes} mins
            </span>
          </div>

          {/* Judge Evaluation Score (if received) */}
          {socketScore && (
            <div className="p-4 rounded-lg bg-surface-200 border border-surface-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-brand-cyan font-bold uppercase">
                <Award className="w-4 h-4" />
                <span>Judge Evaluation Result</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Judge Score</span>
                  <span className="text-base font-bold text-white">{socketScore.judgeScore} / 100</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Final Score</span>
                  <span className="text-base font-bold text-emerald-400">{Number(socketScore.finalScore).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STATE B: BIDDING IN PROGRESS */
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-brand-cyan font-bold">ROUND {currentRound || '—'} · PROMPT {currentRound || '—'}</span>
                <div>
                  {!isTimerSynced ? (
                    <span className="text-slate-400">Syncing bidding state…</span>
                  ) : isPaused ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      PAUSED ({secondsRemaining}s left)
                    </span>
                  ) : secondsRemaining > 0 && !isExpired ? (
                    <span className="px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold border border-[#D4AF37]/30">
                      {secondsRemaining}s left to bid
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {gameStatus === 'bidding' ? 'Timer Expired' : 'Bidding Closed'}
                    </span>
                  )}
                </div>
              </div>

              {gameStatus === 'round_ended' && <p className="text-amber-300 text-xs font-mono">
                Round {currentRound} is complete. {hasNextRound ? 'Waiting for the admin to open the next prompt.' : 'All prompt rounds are complete.'}
              </p>}
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
                    {[...new Set([biddingConfig.minBid, 45, 60, 75, 90, 105, biddingConfig.baseTime])].filter((value) => value >= biddingConfig.minBid && value <= biddingConfig.baseTime).sort((a, b) => a - b).map((mins) => {
                      const isSelected = bidMinutes === mins;
                      return (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setBidMinutes(mins)}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
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
                    min={biddingConfig.minBid}
                    max={biddingConfig.baseTime}
                    step={1}
                    value={bidMinutes}
                    onChange={(e) => setBidMinutes(Number(e.target.value))}
                    className="w-full accent-[#D4AF37] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{biddingConfig.minBid}m (Min Time)</span>
                    <span>{biddingConfig.baseTime}m (Max Time)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !!collision ||
                    gameStatus !== 'bidding' ||
                    isPaused ||
                    isExpired ||
                    secondsRemaining <= 0
                  }
                  className="w-full py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? 'Submitting...'
                    : isPaused
                    ? `Round Paused (${secondsRemaining}s remaining)`
                    : gameStatus !== 'bidding'
                    ? 'Bidding Closed'
                    : isExpired || secondsRemaining <= 0
                    ? 'Timer Expired (Bidding Closed)'
                    : collision
                    ? 'Time Taken'
                    : myCurrentBid
                    ? `Update Bid to ${bidMinutes}m`
                    : `Submit Bid: ${bidMinutes}m`}
                </button>
              </form>
            </div>
        </div>
      )}

      {/* Your Submitted Bids History */}
      {myBidsHistory.length > 0 && (
        <div className="p-5 rounded-xl bg-surface-100 border border-surface-border font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
            <span className="font-bold text-white uppercase tracking-wider">Your Placed Bids History</span>
            <span className="text-slate-400">{myBidsHistory.length} recorded</span>
          </div>
          <div className="space-y-1.5">
            {myBidsHistory.map((h, i) => (
              <div key={h.id || i} className="p-2.5 rounded-lg bg-surface-200 border border-surface-border flex items-center justify-between">
                <div>
                  <span className="text-[#D4AF37] font-bold mr-2">Round {h.round}</span>
                  <span className="text-slate-200">{h.prompt?.title || `Prompt #${h.promptId}`}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold">{h.bidMinutes} mins</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
