import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Bid, WinnerResult, RoundEndedSummary, AssignmentReceivedData,
  Score, CurrentBiddingStateResponse
} from '../types';
import { useAuth } from './AuthContext';
import { api, API_BASE } from '../api/client';
import { BiddingTimer } from '../utils/biddingTimer';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || new URL(API_BASE, window.location.origin).origin;
type ActionResult = { success: boolean; message?: string };

const initialState: CurrentBiddingStateResponse = {
  success: true, status: 'waiting', currentRound: 0, currentPrompt: null,
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
  const adminPending = useRef(false);

  const applyState = useCallback((next: CurrentBiddingStateResponse) => {
    const previous = stateRef.current;
    stateRef.current = next;
    countdown.current.apply(next, latencyMs.current);
    setState(next);
    setSecondsRemaining(countdown.current.secondsRemaining());
    setIsTimerSynced(true);
    if (previous.timerId !== next.timerId && next.status === 'bidding') {
      setLastWinners(null);
      setRoundSummary(null);
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
    const [publicResult, privateResult] = await Promise.allSettled([
      api.getCurrentBiddingState(),
      user?.role === 'team' ? api.getMyAssignment() : Promise.resolve(null)
    ]);
    if (request !== requestVersion.current) return;
    if (version === eventVersion.current && publicResult.status === 'fulfilled' && publicResult.value.success) applyState(publicResult.value);
    if (privateVersion === privateEventVersion.current && privateResult.status === 'fulfilled' && privateResult.value?.success) {
      const { assignment, score } = privateResult.value;
      setMyAssignment(assignment ? {
        promptId: assignment.promptId, title: assignment.prompt?.title || '',
        description: assignment.prompt?.description || '', bidMinutes: assignment.bidMinutes,
        multiplier: Number(assignment.multiplier), codingTimeMinutes: assignment.bidMinutes, round: assignment.round
      } : null);
      setMyScore(score || null);
    }
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
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000
    });
    socketRef.current = connection;
    setSocket(connection);
    let alive = true;

    const ping = () => {
      const sentAt = performance.now();
      connection.timeout(5000).emit('time:sync', {}, (error: Error | null) => {
        if (!error && alive) latencyMs.current = Math.max(0, (performance.now() - sentAt) / 2);
      });
    };
    connection.on('connect', () => {
      if (!alive) return;
      setIsConnected(true);
      ping();
      void refreshState();
    });
    connection.on('disconnect', () => { if (alive) setIsConnected(false); });
    connection.on('connect_error', () => { if (alive) setIsConnected(false); });

    connection.on('game:status', (next: CurrentBiddingStateResponse) => {
      eventVersion.current++;
      applyState(next);
    });
    connection.on('timer:tick', (timer: CurrentBiddingStateResponse) => {
      const current = stateRef.current;
      if (timer.timerId !== current.timerId || current.status !== 'bidding') return;
      countdown.current.apply({ ...current, ...timer }, latencyMs.current);
      setSecondsRemaining(countdown.current.secondsRemaining());
    });
    const receiveBid = (bid: Bid) => {
      const current = stateRef.current;
      if (bid.promptId !== current.currentPrompt?.id || bid.round !== current.currentRound) return;
      eventVersion.current++;
      const next = { ...current, bids: [...current.bids.filter((b) => b.teamId !== bid.teamId), bid]
        .sort((a, b) => a.bidMinutes - b.bidMinutes) };
      stateRef.current = next;
      setState(next);
    };
    connection.on('bid:new', receiveBid);
    connection.on('bid:updated', receiveBid);
    connection.on('prompt:results', (data: { winners: WinnerResult[] }) => setLastWinners(data.winners));
    connection.on('round:ended', (data: { summary: RoundEndedSummary }) => setRoundSummary(data.summary));
    connection.on('assignment:received', (data: AssignmentReceivedData) => {
      privateEventVersion.current++;
      setMyAssignment(data);
    });
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
    const pingInterval = setInterval(ping, 30000);
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
      await refreshState();
      return result;
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Admin action failed' };
    } finally { adminPending.current = false; }
  }, [refreshState]);

  return {
    socket, isConnected, gameStatus: state.status, currentRound: state.currentRound,
    currentPrompt: state.currentPrompt, bids: state.bids, secondsRemaining,
    endsAt: state.endsAt ?? null, startTime: state.startTime ?? null, durationSeconds: state.durationSeconds,
    isPaused: state.status === 'paused', isExpired: secondsRemaining <= 0,
    biddingConfig: state.config, availableSlots: state.availableSlots, isTimerSynced,
    rounds: state.rounds, totalRounds: state.totalRounds, hasNextRound: state.hasNextRound, nextRoundNumber: state.nextRoundNumber,
    lastWinners, myAssignment, myScore, roundSummary, refreshState, placeBid, updateBid: placeBid,
    adminStartRound: (round?: number) => adminAction(() => api.startRound(round)),
    adminPause: () => adminAction(() => api.pauseRound(stateRef.current.timerId)),
    adminResume: () => adminAction(() => api.resumeRound(stateRef.current.timerId)),
    adminExtend: (extra: number) => adminAction(() => api.extendRound(extra, stateRef.current.timerId)),
    adminNextPrompt: () => adminAction(() => api.nextPrompt(stateRef.current.timerId)),
    adminEndRound: () => adminAction(() => api.endRound(stateRef.current.timerId))
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
