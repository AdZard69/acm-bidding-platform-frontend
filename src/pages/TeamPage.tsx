import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Award,
  Github,
  ExternalLink,
  FolderGit2,
  Clock,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { BiddingTimerBadge } from '../components/BiddingTimerBadge';
import { api } from '../api/client';
import { Bid, Submission, TeamCodingState } from '../types';
import { calculateMultiplier, calculateBoostPercentage } from '../utils/multiplier';

export const TeamPage: React.FC = () => {
  const { user } = useAuth();
  const {
    socket,
    refreshState,
    gameStatus,
    currentRound,
    currentPromptIndex,
    totalPromptsInRound,
    hasNextPrompt,
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
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [codingState, setCodingState] = useState<TeamCodingState | null>(null);
  const [githubUrlInput, setGithubUrlInput] = useState<string>('');
  const [submittingUrl, setSubmittingUrl] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [currentClientTime, setCurrentClientTime] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentClientTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMySubmission = useCallback(async () => {
    try {
      const res = await api.getMySubmission();
      if (res.success) {
        setSubmission(res.submission);
        setCodingState(res.codingState);
        if (res.submission?.githubUrl) {
          setGithubUrlInput(res.submission.githubUrl);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchMySubmission();
  }, [fetchMySubmission, gameStatus, currentRound, timerId, user?.teamId]);

  useEffect(() => {
    if (!socket) return;
    const handleCodingEvent = () => {
      void fetchMySubmission();
      void refreshState();
    };
    socket.on('coding:started', handleCodingEvent);
    socket.on('coding:paused', handleCodingEvent);
    socket.on('coding:resumed', handleCodingEvent);
    socket.on('coding:reset', handleCodingEvent);
    socket.on('submission:updated', handleCodingEvent);
    return () => {
      socket.off('coding:started', handleCodingEvent);
      socket.off('coding:paused', handleCodingEvent);
      socket.off('coding:resumed', handleCodingEvent);
      socket.off('coding:reset', handleCodingEvent);
      socket.off('submission:updated', handleCodingEvent);
    };
  }, [socket, fetchMySubmission, refreshState]);

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);
    setSubmissionSuccess(null);

    const trimmed = githubUrlInput.trim();
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/;
    if (!trimmed) {
      setSubmissionError('Please enter a GitHub repository URL.');
      return;
    }
    if (!githubRegex.test(trimmed)) {
      setSubmissionError('Invalid GitHub URL. Must be in format: https://github.com/username/repository');
      return;
    }

    setSubmittingUrl(true);
    try {
      const res = await api.submitProject(trimmed);
      setSubmission(res.submission);
      setSubmissionSuccess('Project repository URL submitted successfully!');
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit project');
    } finally {
      setSubmittingUrl(false);
    }
  };

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
          {currentRound > 0 && (
            <div>
              Round: <strong className="text-brand-amber">R{currentRound} P{currentPromptIndex + 1}</strong>
            </div>
          )}
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
                <span className="text-brand-cyan font-bold">
                  ROUND {currentRound || '—'} · PROMPT {currentRound ? currentPromptIndex + 1 : '—'}
                  {currentRound === 2 ? ' (k = 0.7 SECOND CHANCE)' : ' (k = 1.0)'}
                </span>
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

              {gameStatus === 'round_ended' && (
                <p className="text-amber-300 text-xs font-mono">
                  Round {currentRound} · Prompt {currentPromptIndex + 1} is complete. {hasNextPrompt ? 'Waiting for admin to advance to next prompt.' : (currentRound === 1 ? 'Round 1 is complete.' : 'Bidding is complete.')}
                </p>
              )}
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
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold font-mono">
                        {calculateMultiplier(bidMinutes, currentRound || 1, biddingConfig.baseTime, biddingConfig.minBid).toFixed(3)}x
                        {' '}(+{calculateBoostPercentage(calculateMultiplier(bidMinutes, currentRound || 1, biddingConfig.baseTime, biddingConfig.minBid))}%)
                      </span>
                      <span className="font-bold text-[#D4AF37] text-sm">{bidMinutes} mins</span>
                    </div>
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

      {/* Project Submission Card */}
      <div className="p-5 rounded-xl bg-surface-100 border border-surface-border font-mono text-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h3 className="font-bold text-white uppercase text-sm tracking-wider">Project Submission</h3>
              <p className="text-slate-400 text-[11px]">
                Submit your team's GitHub repository before your committed coding timer expires.
              </p>
            </div>
          </div>

          {activeAssignment && codingState?.isStarted && (
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  codingState.isPaused
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : (() => {
                        const dl = (codingState.startTime || 0) + activeAssignment.bidMinutes * 60 * 1000;
                        return currentClientTime > dl
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
                      })()
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {codingState.isPaused
                  ? 'Coding Paused'
                  : (() => {
                      const dl = (codingState.startTime || 0) + activeAssignment.bidMinutes * 60 * 1000;
                      return currentClientTime > dl ? 'Time Expired' : 'Coding Active';
                    })()}
              </span>
            </div>
          )}
        </div>

        {/* State 1: No Assignment Yet */}
        {!activeAssignment ? (
          <div className="py-6 px-4 rounded-lg bg-surface-200/50 border border-surface-border text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
            <p className="text-slate-300 font-bold">No Problem Statement Assigned Yet</p>
            <p className="text-slate-500 text-[11px] max-w-md mx-auto">
              Place your bids during the live auction rounds. Once you win a prompt, your project submission and individual countdown timer will activate here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Assignment & Timer Summary */}
            {(() => {
              const allocatedMs = activeAssignment.bidMinutes * 60 * 1000;
              const startTime = codingState?.startTime || 0;
              const deadline = startTime ? startTime + allocatedMs : 0;
              const isStarted = Boolean(codingState?.isStarted && startTime > 0);
              const isPaused = Boolean(codingState?.isPaused);
              const diffMs = deadline ? deadline - currentClientTime : 0;
              const remainingSecs = Math.max(0, Math.ceil(diffMs / 1000));
              const isExpired = isStarted && currentClientTime > deadline;
              const elapsedMs = Math.min(allocatedMs, Math.max(0, currentClientTime - startTime));
              const progressPct = allocatedMs > 0 ? Math.min(100, Math.max(0, (elapsedMs / allocatedMs) * 100)) : 0;

              const formatTimer = (secs: number) => {
                const h = Math.floor(secs / 3600);
                const m = Math.floor((secs % 3600) / 60);
                const s = secs % 60;
                if (h > 0) {
                  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                }
                return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
              };

              return (
                <div className="space-y-4">
                  {/* Timer Dashboard Card */}
                  <div className="p-4 rounded-xl bg-surface-200/60 border border-surface-border space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2.5">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Assigned Challenge</span>
                        <span className="text-sm font-bold text-white">{assignmentTitle}</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-slate-400 block text-[10px] uppercase">Committed Time Limit</span>
                        <span className="text-sm font-bold text-[#D4AF37]">{activeAssignment.bidMinutes} minutes</span>
                      </div>
                    </div>

                    {/* Countdown Display */}
                    {!isStarted ? (
                      <div className="p-4 rounded-lg bg-surface-100 border border-surface-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-surface-200 text-slate-400">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-white font-bold text-xs block">Coding Window Not Started</span>
                            <span className="text-slate-400 text-[11px]">
                              Waiting for organizers to start the countdown. You will have {activeAssignment.bidMinutes} minutes once started.
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-surface-200 text-slate-400 text-[10px] uppercase font-bold shrink-0">
                          Standby
                        </span>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-surface-100 border border-surface-border space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock className={`w-4 h-4 ${isExpired ? 'text-rose-400' : isPaused ? 'text-amber-400' : 'text-emerald-400'}`} />
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                              {isExpired ? 'Time Remaining:' : isPaused ? 'Timer Frozen (Paused):' : 'Coding Time Remaining:'}
                            </span>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-slate-400 text-[10px]">
                              Deadline: {deadline ? new Date(deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-baseline gap-3">
                          <span
                            className={`text-2xl sm:text-3xl font-extrabold tracking-wider ${
                              isExpired
                                ? 'text-rose-500'
                                : isPaused
                                ? 'text-amber-400'
                                : remainingSecs < 600
                                ? 'text-amber-400 animate-pulse'
                                : 'text-emerald-400'
                            }`}
                          >
                            {isExpired ? '00:00:00 — TIME EXPIRED' : formatTimer(remainingSecs)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isExpired
                                ? 'bg-rose-500'
                                : isPaused
                                ? 'bg-amber-400'
                                : remainingSecs < 600
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${100 - progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission Form */}
                  <form onSubmit={handleSubmitProject} className="space-y-4">
                    {submissionError && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{submissionError}</span>
                      </div>
                    )}

                    {submissionSuccess && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{submissionSuccess}</span>
                      </div>
                    )}

                    {isExpired && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          Coding time expired! Your committed limit of {activeAssignment.bidMinutes} minutes has ended. Submissions are now closed.
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="text-slate-300 block mb-1.5 font-bold uppercase text-[11px]">
                        GitHub Repository URL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Github className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          required
                          disabled={submittingUrl || !isStarted || isPaused || isExpired}
                          value={githubUrlInput}
                          onChange={(e) => setGithubUrlInput(e.target.value)}
                          placeholder="https://github.com/organization/repository"
                          className="w-full pl-9 pr-3 py-2.5 bg-surface-200 border border-surface-border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed font-mono text-xs"
                        />
                      </div>
                      <p className="text-slate-500 text-[10px] mt-1.5">
                        Please provide a public GitHub repository link containing your team's hackathon project code.
                      </p>
                    </div>

                    {/* Current recorded submission link */}
                    {submission && (
                      <div className="p-3 rounded-lg bg-surface-200/50 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-slate-300 block text-[10px] uppercase">Recorded Submission</span>
                            <a
                              href={submission.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#D4AF37] hover:underline font-bold flex items-center gap-1"
                            >
                              <span>{submission.githubUrl}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        <span className="text-slate-500 text-[10px]">
                          Submitted at {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingUrl || !isStarted || isPaused || isExpired}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                    >
                      <Github className="w-4 h-4" />
                      <span>
                        {submittingUrl
                          ? 'Submitting...'
                          : !isStarted
                          ? 'Waiting for Coding Phase to Start'
                          : isPaused
                          ? 'Coding Paused'
                          : isExpired
                          ? 'Submissions Closed (Deadline Passed)'
                          : submission
                          ? 'Update GitHub Repository URL'
                          : 'Submit Project Repository URL'}
                      </span>
                    </button>
                  </form>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
