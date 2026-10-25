import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GameStatus,
  Prompt,
  Bid,
  WinnerResult,
  PromptResultsData,
  RoundEndedSummary,
  AssignmentReceivedData,
  Score
} from '../types';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

const DEFAULT_SOCKET_URL =
  typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    ? 'https://acm-bidding-platform-backend.onrender.com'
    : 'http://localhost:5000';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  gameStatus: GameStatus;
  currentRound: number;
  currentPrompt: Prompt | null;
  secondsRemaining: number;
  bids: Bid[];
  lastWinners: WinnerResult[] | null;
  myAssignment: AssignmentReceivedData | null;
  myScore: Score | null;
  roundSummary: RoundEndedSummary | null;
  refreshState: () => Promise<void>;
  // Team actions
  placeBid: (bidMinutes: number) => Promise<{ success: boolean; message?: string }>;
  updateBid: (bidMinutes: number) => Promise<{ success: boolean; message?: string }>;
  // Admin actions
  adminStartRound: (roundNumber?: number) => Promise<{ success: boolean; message?: string }>;
  adminPause: () => Promise<{ success: boolean }>;
  adminResume: () => Promise<{ success: boolean }>;
  adminExtend: (extraSeconds: number) => Promise<{ success: boolean }>;
  adminNextPrompt: () => Promise<{ success: boolean }>;
  adminEndRound: () => Promise<{ success: boolean }>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Live game states
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [bids, setBids] = useState<Bid[]>([]);
  const [lastWinners, setLastWinners] = useState<WinnerResult[] | null>(null);
  const [myAssignment, setMyAssignment] = useState<AssignmentReceivedData | null>(null);
  const [myScore, setMyScore] = useState<Score | null>(null);
  const [roundSummary, setRoundSummary] = useState<RoundEndedSummary | null>(null);

  // Sync state via REST API as baseline
  const refreshState = useCallback(async () => {
    try {
      const res = await api.getCurrentBiddingState();
      if (res.success) {
        if (res.status) setGameStatus(res.status as GameStatus);
        if (res.currentRound !== undefined) setCurrentRound(res.currentRound);
        if (res.currentPrompt) setCurrentPrompt(res.currentPrompt);
        if (res.secondsRemaining !== undefined) setSecondsRemaining(res.secondsRemaining);
        if (res.bids) setBids(res.bids);
      }
    } catch {
      // Ignore initial sync failure if server not ready
    }
  }, []);

  useEffect(() => {
    refreshState();
    if (!isConnected) {
      const interval = setInterval(refreshState, 2000);
      return () => clearInterval(interval);
    }
  }, [isConnected, refreshState]);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      refreshState();
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // timer:tick
    newSocket.on('timer:tick', (data: { secondsLeft: number; promptId?: number }) => {
      setSecondsRemaining(data.secondsLeft);
    });

    // bid:new
    newSocket.on('bid:new', (data: Bid) => {
      setBids((prev) => {
        const filtered = prev.filter((b) => b.teamId !== data.teamId);
        return [...filtered, data].sort((a, b) => a.bidMinutes - b.bidMinutes);
      });
    });

    // bid:updated
    newSocket.on('bid:updated', (data: Bid) => {
      setBids((prev) => {
        const filtered = prev.filter((b) => b.teamId !== data.teamId);
        return [...filtered, data].sort((a, b) => a.bidMinutes - b.bidMinutes);
      });
    });

    // prompt:reveal
    newSocket.on('prompt:reveal', (data: Prompt) => {
      setCurrentPrompt(data);
      setBids([]);
      setLastWinners(null);
      setGameStatus('bidding');
    });

    // prompt:results
    newSocket.on('prompt:results', (data: PromptResultsData) => {
      setLastWinners(data.winners);
    });

    // prompt:next
    newSocket.on('prompt:next', () => {
      setBids([]);
    });

    // round:started
    newSocket.on('round:started', (data: { roundNumber: number }) => {
      setCurrentRound(data.roundNumber);
      setGameStatus('bidding');
      setRoundSummary(null);
      setBids([]);
    });

    // round:paused
    newSocket.on('round:paused', (data: { secondsRemaining: number }) => {
      setGameStatus('paused');
      if (data?.secondsRemaining !== undefined) {
        setSecondsRemaining(data.secondsRemaining);
      }
    });

    // round:resumed
    newSocket.on('round:resumed', (data: { secondsRemaining: number }) => {
      setGameStatus('bidding');
      if (data?.secondsRemaining !== undefined) {
        setSecondsRemaining(data.secondsRemaining);
      }
    });

    // round:ended
    newSocket.on('round:ended', (data: { roundNumber: number; summary: RoundEndedSummary }) => {
      setGameStatus('round_ended');
      setRoundSummary(data.summary);
      setSecondsRemaining(0);
    });

    // timer:extended
    newSocket.on('timer:extended', (data: { newSecondsLeft: number }) => {
      setSecondsRemaining(data.newSecondsLeft);
    });

    // game:status
    newSocket.on('game:status', (data: { status: GameStatus; currentRound?: number; currentPrompt?: Prompt }) => {
      setGameStatus(data.status);
      if (data.currentRound !== undefined) setCurrentRound(data.currentRound);
      if (data.currentPrompt !== undefined) setCurrentPrompt(data.currentPrompt);
    });

    // assignment:received
    newSocket.on('assignment:received', (data: AssignmentReceivedData) => {
      setMyAssignment(data);
    });

    // score:received
    newSocket.on('score:received', (data: Score) => {
      setMyScore(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, refreshState]);

  // Client bid actions (tries socket first, falls back to REST api)
  const placeBid = useCallback(
    async (bidMinutes: number): Promise<{ success: boolean; message?: string }> => {
      if (socket && isConnected) {
        return new Promise((resolve) => {
          socket.emit('bid:place', { bidMinutes }, async (res: { success: boolean; error?: { message: string }; message?: string }) => {
            if (res && res.success === false) {
              resolve({ success: false, message: res.error?.message || res.message });
            } else {
              resolve({ success: true });
            }
          });
        });
      }
      try {
        await api.placeBid(bidMinutes);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, message: err instanceof Error ? err.message : 'Failed to place bid' };
      }
    },
    [socket, isConnected]
  );

  const updateBid = useCallback(
    async (bidMinutes: number): Promise<{ success: boolean; message?: string }> => {
      return placeBid(bidMinutes);
    },
    [placeBid]
  );

  // Admin Socket actions with acks
  const adminStartRound = useCallback(
    (roundNumber?: number): Promise<{ success: boolean; message?: string }> => {
      return new Promise((resolve) => {
        if (!socket) return resolve({ success: false, message: 'Socket disconnected' });
        socket.emit('admin:start-round', { roundNumber }, (res: { success: boolean; message?: string }) => {
          resolve(res || { success: true });
        });
      });
    },
    [socket]
  );

  const adminPause = useCallback((): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!socket) return resolve({ success: false });
      socket.emit('admin:pause', {}, (res: { success: boolean }) => resolve(res || { success: true }));
    });
  }, [socket]);

  const adminResume = useCallback((): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!socket) return resolve({ success: false });
      socket.emit('admin:resume', {}, (res: { success: boolean }) => resolve(res || { success: true }));
    });
  }, [socket]);

  const adminExtend = useCallback(
    (extraSeconds: number): Promise<{ success: boolean }> => {
      return new Promise((resolve) => {
        if (!socket) return resolve({ success: false });
        socket.emit('admin:extend', { extraSeconds }, (res: { success: boolean }) =>
          resolve(res || { success: true })
        );
      });
    },
    [socket]
  );

  const adminNextPrompt = useCallback((): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!socket) return resolve({ success: false });
      socket.emit('admin:next-prompt', {}, (res: { success: boolean }) =>
        resolve(res || { success: true })
      );
    });
  }, [socket]);

  const adminEndRound = useCallback((): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!socket) return resolve({ success: false });
      socket.emit('admin:end-round', {}, (res: { success: boolean }) =>
        resolve(res || { success: true })
      );
    });
  }, [socket]);

  const value = {
    socket,
    isConnected,
    gameStatus,
    currentRound,
    currentPrompt,
    secondsRemaining,
    bids,
    lastWinners,
    myAssignment,
    myScore,
    roundSummary,
    refreshState,
    placeBid,
    updateBid,
    adminStartRound,
    adminPause,
    adminResume,
    adminExtend,
    adminNextPrompt,
    adminEndRound
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
