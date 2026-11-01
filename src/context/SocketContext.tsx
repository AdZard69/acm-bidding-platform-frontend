import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Bid, WinnerResult, RoundEndedSummary, AssignmentReceivedData,
  Score, CurrentBiddingStateResponse, GameStatus
} from '../types';
import { useAuth } from './AuthContext';
import { api, API_BASE } from '../api/client';
import { BiddingTimer, isOlderTimerSnapshot } from '../utils/biddingTimer';
import { biddingSocketOptions } from '../utils/socketOptions';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || new URL(API_BASE, window.location.origin).origin;
type ActionResult = { success: boolean; message?: string };

const initialState: CurrentBiddingStateResponse = {
  success: true, status: 'waiting', currentRound: 0, currentPrompt: null,
  currentPromptIndex: 0, totalPromptsInRound: 0, totalPrompts: 0,
  hasNextPrompt: false, canStartRound2: false, unassignedTeamsCount: 0,
  rounds: [], totalRounds: 0, hasNextRound: false, nextRoundNumber: null,
  availableSlots: 0, secondsRemaining: 0, remainingMs: 0, durationSeconds: 60, timerId: null,
  startTime: null, endsAt: null, isPaused: false, hasExpired: true, bids: [],
  config: { baseTime: 120, minBid: 30, slotsPerPrompt: 3, bidDurationSeconds: 60 }
};

function useBiddingState() {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState(initialState);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [lastWinners, setLastWinners] = useState<WinnerResult[] | null>(null);
  const [myAssignment, setMyAssignment] = useState<AssignmentReceivedData | null>(null);
  const [myScore, setMyScore] = useState<Score | null>(null);
  const [roundSummary, setRoundSummary] = useState<RoundEndedSummary | null>(null);
  const [isTimerSynced, setIsTimerSynced] = useState(false);
  const stateRef = useRef(state);
  const countdown = useRef(new BiddingTimer());
  const eventVersion = useRef(0);
  const privateEventVersion = useRef(0);
  const requestVersion = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const latencyMs = useRef(0);
  const clockAnchor = useRef<{ streamId: string; serverTime: number; receivedAt: number } | null>(null);
  const pingSamples = useRef<number[]>([]);
  const adminPending = useRef(false);
  const recoveringTimerId = useRef<string | null>(null);

  const applyState = useCallback((next: CurrentBiddingStateResponse) => {
    const previous = stateRef.current;
    if (isOlderTimerSnapshot(next, previous)) return;
    stateRef.current = next;
    const anchor = clockAnchor.current;
    const age = anchor && anchor.streamId === next.timerStreamId && next.serverMonotonicTime != null
      ? Math.max(0, anchor.serverTime + performance.now() - anchor.receivedAt - next.serverMonotonicTime)
      : latencyMs.current;
    countdown.current.apply(next, age);
    setState(next);
    setSecondsRemaining(countdown.current.secondsRemaining());
    setIsTimerSynced(true);
    if (previous.timerId !== next.timerId && next.status === 'bidding') {
      setLastWinners(null);
      setRoundSummary(null);
      // A rerun has the same prompt/round but a new bidding session.
      if (previous.timerId !== null) {
        privateEventVersion.current++;
        setMyAssignment((assignment) => assignment && assignment.promptId === next.currentPrompt?.id && assignment.round === next.currentRound ? null : assignment);
      }
    }
    if (next.status === 'round_ended') {
      setLastWinners(next.winners || []);
      setRoundSummary(next.summary || null);
    }
    if (next.status === 'waiting') {
      privateEventVersion.current++;
      setMyAssignment(null);
      setMyScore(null);
      setLastWinners(null);
      setRoundSummary(null);
    }
  }, []);

  // A single snapshot supplies prompt, bids, settings and timer together. Never
  // let a slow REST response overwrite a newer socket event or another login.
  const refreshState = useCallback(async () => {
    const request = ++requestVersion.current;
    const version = eventVersion.current;
    const privateVersion = privateEventVersion.current;
    await Promise.allSettled([
      api.getCurrentBiddingState().then((result) => {
        if (request === requestVersion.current && version === eventVersion.current && result.success) applyState(result);
      }),
      user?.role === 'team' ? api.getMyAssignment().then((result) => {
        if (request !== requestVersion.current || privateVersion !== privateEventVersion.current || !result.success) return;
        const { assignment, score } = result;
        setMyAssignment(assignment ? {
          promptId: assignment.promptId, title: assignment.prompt?.title || '',
          description: assignment.prompt?.description || '', bidMinutes: assignment.bidMinutes,
          multiplier: Number(assignment.multiplier), codingTimeMinutes: assignment.bidMinutes, round: assignment.round
        } : null);
        setMyScore(score || null);
      }) : Promise.resolve()
    ]);
  }, [applyState, user?.role, user?.teamId, token]);

  useEffect(() => {
    const ticker = setInterval(() => setSecondsRemaining(countdown.current.secondsRemaining()), 100);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    setMyAssignment(null);
    setMyScore(null);
    setIsTimerSynced(false);
    eventVersion.current++;
    const connection = io(SOCKET_URL, {
      ...biddingSocketOptions,
      auth: token ? { token } : {}
    });
    socketRef.current = connection;
    setSocket(connection);
    let alive = true;

    const ping = () => {
      const sentAt = performance.now();
      connection.timeout(5000).emit('time:sync', {}, (error: Error | null, result?: any) => {
        if (error || !alive) return;
        const receivedAt = performance.now();
        const processingMs = Math.max(0, (result?.serverTransmitTime ?? 0) - (result?.serverReceiveTime ?? 0));
        const delay = Math.max(0, (receivedAt - sentAt - processingMs) / 2);
        pingSamples.current = [...pingSamples.current.slice(-4), delay];
        latencyMs.current = Math.min(...pingSamples.current);
        const timer = result?.timer;
        if (timer?.timerStreamId && timer.serverMonotonicTime != null && delay <= latencyMs.current) {
          clockAnchor.current = { streamId: timer.timerStreamId, serverTime: timer.serverMonotonicTime + delay, receivedAt };
        }
      });
    };
    connection.on('connect', () => {
      if (!alive) return;
      setIsConnected(true);
      latencyMs.current = 0;
      pingSamples.current = [];
      clockAnchor.current = null;
      ping();
      void refreshState();
    });
    connection.on('disconnect', () => { if (alive) setIsConnected(false); });
    connection.on('connect_error', () => { if (alive) setIsConnected(false); });

    const handleTimerTick = (timer: any) => {
      if (!timer) return;
      const current = stateRef.current;
      if (isOlderTimerSnapshot(timer, current)) return;
      const newSession = Boolean(timer.timerId && timer.timerId !== current.timerId);
      if (newSession) eventVersion.current++;
      const status = (timer.status || (timer.secondsRemaining || timer.secondsLeft ? 'bidding' : current.status)) as GameStatus;
      const rawMs = timer.remainingMs != null
        ? timer.remainingMs
        : timer.secondsRemaining != null
        ? timer.secondsRemaining * 1000
        : timer.secondsLeft != null
        ? timer.secondsLeft * 1000
        : 0;
      const timerId = timer.timerId || current.timerId;
      const round = timer.roundNumber || timer.currentRound || timer.round || current.currentRound;
      const prompt = timer.currentPrompt || timer.prompt ||
        (!newSession || current.currentPrompt?.id === timer.promptId ? current.currentPrompt : null);

      const nextState: CurrentBiddingStateResponse = {
        ...current,
        ...timer,
        status,
        currentRound: round,
        currentPrompt: prompt,
        currentPromptIndex: timer.currentPromptIndex ?? timer.promptIndex ?? current.currentPromptIndex,
        totalPromptsInRound: timer.totalPromptsInRound ?? timer.totalPrompts ?? current.totalPromptsInRound,
        hasNextPrompt: timer.hasNextPrompt ?? current.hasNextPrompt,
        canStartRound2: timer.canStartRound2 ?? current.canStartRound2,
        unassignedTeamsCount: timer.unassignedTeamsCount ?? current.unassignedTeamsCount,
        timerId,
        bids: timer.bids ?? (newSession ? [] : current.bids),
        winners: newSession ? [] : current.winners,
        summary: newSession ? null : current.summary,
        availableSlots: timer.availableSlots ?? (newSession ? current.config.slotsPerPrompt : current.availableSlots),
        remainingMs: rawMs,
        secondsRemaining: Math.ceil(rawMs / 1000),
        isPaused: status === 'paused',
        hasExpired: rawMs <= 0 && status !== 'paused'
      };

      applyState(nextState);
      // The tick already has authoritative remaining time. Render it immediately
      // while fetching prompt/history details; a slow REST read must not gate it.
      if ((newSession || !prompt) && !timer.currentPrompt && timerId && recoveringTimerId.current !== timerId) {
        recoveringTimerId.current = timerId;
        void refreshState().finally(() => {
          if (recoveringTimerId.current === timerId) recoveringTimerId.current = null;
        });
      }
    };

    const handleRoundState = (data: any) => {
      if (!data) return;
      eventVersion.current++;
      const current = stateRef.current;
      const rawMs = data.remainingMs != null
        ? data.remainingMs
        : data.secondsRemaining != null
        ? data.secondsRemaining * 1000
        : data.secondsLeft != null
        ? data.secondsLeft * 1000
        : current.remainingMs;
      const status = (data.status || 'bidding') as GameStatus;
      const nextState: CurrentBiddingStateResponse = {
        ...current,
        ...data,
        status,
        currentRound: data.roundNumber || data.currentRound || data.round || current.currentRound,
        currentPrompt: data.currentPrompt || data.prompt || current.currentPrompt,
        currentPromptIndex: data.currentPromptIndex ?? data.promptIndex ?? current.currentPromptIndex,
        totalPromptsInRound: data.totalPromptsInRound ?? data.totalPrompts ?? current.totalPromptsInRound,
        hasNextPrompt: data.hasNextPrompt ?? current.hasNextPrompt,
        canStartRound2: data.canStartRound2 ?? current.canStartRound2,
        unassignedTeamsCount: data.unassignedTeamsCount ?? current.unassignedTeamsCount,
        remainingMs: rawMs,
        secondsRemaining: Math.ceil(rawMs / 1000),
        isPaused: status === 'paused',
        hasExpired: false
      };
      applyState(nextState);
    };

    connection.on('game:status', (next: CurrentBiddingStateResponse) => {
      eventVersion.current++;
      applyState(next);
    });
    connection.on('timer:tick', handleTimerTick);
    connection.on('round:started', handleRoundState);
    connection.on('round:resumed', handleRoundState);
    connection.on('prompt:reveal', handleRoundState);
    connection.on('prompt:next', handleRoundState);
    connection.on('timer:extended', (data: any) => {
      eventVersion.current++;
      handleTimerTick(data);
    });
    connection.on('round:paused', (data: any) => {
      eventVersion.current++;
      const current = stateRef.current;
      const nextState: CurrentBiddingStateResponse = {
        ...current,
        ...data,
        status: 'paused' as GameStatus,
        isPaused: true
      };
      applyState(nextState);
    });
    const receiveBid = (bid: Bid) => {
      const current = stateRef.current;
      if (bid.promptId !== current.currentPrompt?.id || bid.round !== current.currentRound) return;
      if (bid.timerId && bid.timerId !== current.timerId) return;
      eventVersion.current++;
      const next = { ...current, bids: [...current.bids.filter((b) => b.teamId !== bid.teamId), bid]
        .sort((a, b) => a.bidMinutes - b.bidMinutes) };
      stateRef.current = next;
      setState(next);
    };
    connection.on('bid:new', receiveBid);
    connection.on('bid:updated', receiveBid);
    connection.on('prompt:results', (data: { winners: WinnerResult[] }) => setLastWinners(data.winners));
    connection.on('round:ended', (data: any) => {
      eventVersion.current++;
      const current = stateRef.current;
      if (data?.timerId && data.timerId !== current.timerId) return;
      const winners = data?.summary?.winners || data?.winners || current.winners || [];
      const nextState: CurrentBiddingStateResponse = {
        ...current,
        status: 'round_ended' as GameStatus,
        remainingMs: 0,
        secondsRemaining: 0,
        hasExpired: true,
        winners,
        summary: data?.summary || current.summary
      };
      applyState(nextState);
      setLastWinners(winners);
      if (data?.summary) setRoundSummary(data.summary);
    });
    const clearAssignment = () => {
      privateEventVersion.current++;
      setMyAssignment(null);
      setMyScore(null);
    };
    connection.on('assignment:received', (data: AssignmentReceivedData | null) => {
      if (!data?.promptId) { clearAssignment(); return; }
      privateEventVersion.current++;
      setMyAssignment(data);
    });
    connection.on('assignment:cleared', clearAssignment);
    connection.on('assignment:reset', clearAssignment);
    connection.on('score:received', (data: Score) => {
      privateEventVersion.current++;
      setMyScore(data);
    });
    connection.on('game:refresh', () => { void refreshState(); });
    connection.on('game:reset', () => {
      privateEventVersion.current++;
      setMyAssignment(null);
      setMyScore(null);
      void refreshState();
    });
    connection.on('coding:started', () => { void refreshState(); });
    connection.on('coding:paused', () => { void refreshState(); });
    connection.on('coding:resumed', () => { void refreshState(); });
    connection.on('coding:reset', () => { void refreshState(); });
    connection.on('submission:updated', () => { void refreshState(); });
    const pingInterval = setInterval(ping, 30000);
    connection.connect();
    return () => {
      alive = false;
      eventVersion.current++;
      privateEventVersion.current++;
      requestVersion.current++;
      clearInterval(pingInterval);
      connection.removeAllListeners();
      connection.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token, refreshState, applyState]);

  useEffect(() => {
    void refreshState();
    const poll = setInterval(refreshState, isConnected ? 15000 : 2500);
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshState(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(poll); document.removeEventListener('visibilitychange', onVisible); };
  }, [isConnected, refreshState]);

  const placeBid = useCallback(async (bidMinutes: number): Promise<ActionResult> => {
    const current = stateRef.current;
    if (current.status === 'paused') return { success: false, message: 'Bidding is currently paused' };
    if (current.status !== 'bidding' || !current.currentPrompt || countdown.current.remainingMs() <= 0)
      return { success: false, message: 'Bidding is closed for this prompt' };
    const input = { bidMinutes, promptId: current.currentPrompt.id, round: current.currentRound, timerId: current.timerId };
    const connection = socketRef.current;
    if (connection?.connected) {
      return new Promise((resolve) => {
        connection.timeout(8000).emit('bid:place', input,
          (error: Error | null, result?: ActionResult & { error?: { message?: string } }) => {
            if (error || !result) {
              void refreshState();
              resolve({ success: false, message: 'Bid confirmation was interrupted. Check your current bid before trying again.' });
              return;
            }
            resolve({ success: result.success, message: result.error?.message || result.message });
          });
      });
    }
    try {
      const result = await api.placeBid(bidMinutes, input);
      await refreshState();
      return result;
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Failed to place bid' };
    }
  }, [refreshState]);

  // Send each command once. HTTP mutations publish the same socket snapshots to
  // every viewer; no optimistic state changes or duplicate mutation fallback.
  const adminAction = useCallback(async (action: () => Promise<ActionResult>): Promise<ActionResult> => {
    if (adminPending.current) return { success: false, message: 'An admin action is already in progress' };
    adminPending.current = true;
    try {
      const result = await action();
      const next = result as ActionResult & Partial<CurrentBiddingStateResponse>;
      if (result.success && next.config && next.currentRound != null && Array.isArray(next.bids) && next.remainingMs != null) {
        eventVersion.current++;
        applyState(next as CurrentBiddingStateResponse);
      }
      void refreshState();
      return result;
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Admin action failed' };
    } finally { adminPending.current = false; }
  }, [refreshState, applyState]);

  return {
    socket, isConnected, gameStatus: state.status, currentRound: state.currentRound,
    currentPromptIndex: state.currentPromptIndex ?? 0,
    totalPromptsInRound: state.totalPromptsInRound ?? state.totalPrompts ?? 0,
    hasNextPrompt: state.hasNextPrompt ?? false,
    canStartRound2: state.canStartRound2 ?? false,
    unassignedTeamsCount: state.unassignedTeamsCount ?? 0,
    currentPrompt: state.currentPrompt, bids: state.bids, secondsRemaining,
    timerId: state.timerId,
    endsAt: state.endsAt ?? null, startTime: state.startTime ?? null, durationSeconds: state.durationSeconds,
    isPaused: state.status === 'paused', isExpired: secondsRemaining <= 0,
    biddingConfig: state.config, availableSlots: state.availableSlots, isTimerSynced,
    rounds: state.rounds, totalRounds: state.totalRounds, hasNextRound: state.hasNextRound, nextRoundNumber: state.nextRoundNumber,
    codingState: state.codingState,
    lastWinners, myAssignment, myScore, roundSummary, refreshState, placeBid, updateBid: placeBid,
    adminStartRound: (round?: number) => adminAction(() => api.startRound(round)),
    adminPause: () => adminAction(() => api.pauseRound(stateRef.current.timerId)),
    adminResume: () => adminAction(() => api.resumeRound(stateRef.current.timerId)),
    adminExtend: (extra: number) => adminAction(() => api.extendRound(extra, stateRef.current.timerId)),
    adminNextPrompt: () => adminAction(() => api.nextPrompt(stateRef.current.timerId)),
    adminEndRound: () => adminAction(() => api.endRound(stateRef.current.timerId)),
    adminRerunRound: (round?: number) => adminAction(() => api.rerunRound(round))
  };
}

const SocketContext = createContext<ReturnType<typeof useBiddingState> | undefined>(undefined);
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useBiddingState();
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
