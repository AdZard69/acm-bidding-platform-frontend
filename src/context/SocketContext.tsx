import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  GameConfig,
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
import { sound } from '../utils/audio';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

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
  soundEnabled: boolean;
  toggleSound: () => void;
  // Team actions
  placeBid: (bidMinutes: number) => Promise<{ success: boolean; message?: string }>;
  updateBid: (bidMinutes: number) => Promise<{ success: boolean; message?: string }>;
  // Admin socket actions
  adminStartRound: (roundNumber?: number) => Promise<{ success: boolean; message?: string }>;
  adminPause: () => Promise<{ success: boolean }>;
  adminResume: () => Promise<{ success: boolean }>;
  adminExtend: (extraSeconds: number) => Promise<{ success: boolean }>;
  adminNextPrompt: () => Promise<{ success: boolean }>;
  adminEndRound: () => Promise<{ success: boolean }>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Live Game States
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [bids, setBids] = useState<Bid[]>([]);
  const [lastWinners, setLastWinners] = useState<WinnerResult[] | null>(null);
  const [myAssignment, setMyAssignment] = useState<AssignmentReceivedData | null>(null);
  const [myScore, setMyScore] = useState<Score | null>(null);
  const [roundSummary, setRoundSummary] = useState<RoundEndedSummary | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const prevSecondsRef = useRef<number>(0);

  const toggleSound = () => {
    sound.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

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
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // timer:tick -> { secondsLeft, promptId }
    newSocket.on('timer:tick', (data: { secondsLeft: number; promptId?: number }) => {
      const left = data.secondsLeft;
      setSecondsRemaining(left);

      // Play audio cues
      if (left <= 5 && left > 0 && left !== prevSecondsRef.current) {
        sound.warningTick();
      } else if (left <= 10 && left > 5 && left !== prevSecondsRef.current) {
        sound.tick();
      } else if (left === 0 && prevSecondsRef.current > 0) {
        sound.buzzer();
      }
      prevSecondsRef.current = left;
    });

    // bid:new -> { teamId, teamName, bidMinutes, promptId }
    newSocket.on('bid:new', (data: Bid) => {
      setBids((prev) => {
        // filter out any existing bid from same team
        const filtered = prev.filter((b) => b.teamId !== data.teamId);
        return [...filtered, data].sort((a, b) => a.bidMinutes - b.bidMinutes);
      });
      sound.tick();
    });

    // bid:updated -> { teamId, teamName, bidMinutes, promptId }
    newSocket.on('bid:updated', (data: Bid) => {
      setBids((prev) => {
        const filtered = prev.filter((b) => b.teamId !== data.teamId);
        return [...filtered, data].sort((a, b) => a.bidMinutes - b.bidMinutes);
      });
      sound.tick();
    });

    // prompt:reveal -> { promptId, title, description, displayOrder }
    newSocket.on('prompt:reveal', (data: Prompt) => {
      setCurrentPrompt(data);
      setBids([]); // reset bids for the new prompt
      setLastWinners(null);
      setGameStatus('bidding');
    });

    // prompt:results -> { promptId, winners: [...] }
    newSocket.on('prompt:results', (data: PromptResultsData) => {
      setLastWinners(data.winners);
      sound.victory();
    });

    // prompt:next -> { nextPromptIndex, totalPrompts }
    newSocket.on('prompt:next', () => {
      setBids([]);
    });

    // round:started -> { roundNumber }
    newSocket.on('round:started', (data: { roundNumber: number }) => {
      setCurrentRound(data.roundNumber);
      setGameStatus('bidding');
      setRoundSummary(null);
      setBids([]);
      sound.victory();
    });

    // round:paused -> { secondsRemaining }
    newSocket.on('round:paused', (data: { secondsRemaining: number }) => {
      setGameStatus('paused');
      if (data?.secondsRemaining !== undefined) {
        setSecondsRemaining(data.secondsRemaining);
      }
    });

    // round:resumed -> { secondsRemaining }
    newSocket.on('round:resumed', (data: { secondsRemaining: number }) => {
      setGameStatus('bidding');
      if (data?.secondsRemaining !== undefined) {
        setSecondsRemaining(data.secondsRemaining);
      }
    });

    // round:ended -> { roundNumber, summary }
    newSocket.on('round:ended', (data: { roundNumber: number; summary: RoundEndedSummary }) => {
      setGameStatus('round_ended');
      setRoundSummary(data.summary);
      setSecondsRemaining(0);
      sound.buzzer();
    });

    // timer:extended -> { newSecondsLeft }
    newSocket.on('timer:extended', (data: { newSecondsLeft: number }) => {
      setSecondsRemaining(data.newSecondsLeft);
      sound.tick();
    });

    // game:status -> { status, currentRound, currentPrompt }
    newSocket.on('game:status', (data: { status: GameStatus; currentRound?: number; currentPrompt?: Prompt }) => {
      setGameStatus(data.status);
      if (data.currentRound !== undefined) setCurrentRound(data.currentRound);
      if (data.currentPrompt !== undefined) setCurrentPrompt(data.currentPrompt);
    });

    // assignment:received -> { promptId, title, description, bidMinutes, multiplier, codingTimeMinutes }
    newSocket.on('assignment:received', (data: AssignmentReceivedData) => {
      setMyAssignment(data);
      sound.victory();
    });

    // score:received -> { judgeScore, multiplier, finalScore }
    newSocket.on('score:received', (data: Score) => {
      setMyScore(data);
      sound.victory();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Client bid actions
  const placeBid = useCallback(
    (bidMinutes: number): Promise<{ success: boolean; message?: string }> => {
      return new Promise((resolve) => {
        if (!socket) {
          resolve({ success: false, message: 'Socket not connected' });
          return;
        }
        socket.emit('bid:place', { bidMinutes }, (res: { success: boolean; message?: string }) => {
          resolve(res || { success: true });
        });
      });
    },
    [socket]
  );

  const updateBid = useCallback(
    (bidMinutes: number): Promise<{ success: boolean; message?: string }> => {
      return new Promise((resolve) => {
        if (!socket) {
          resolve({ success: false, message: 'Socket not connected' });
          return;
        }
        socket.emit('bid:update', { bidMinutes }, (res: { success: boolean; message?: string }) => {
          resolve(res || { success: true });
        });
      });
    },
    [socket]
  );

  // Admin Socket actions with acks
  const adminStartRound = useCallback(
    (roundNumber?: number): Promise<{ success: boolean; message?: string }> => {
      return new Promise((resolve) => {
        if (!socket) {
          resolve({ success: false, message: 'Socket not connected' });
          return;
        }
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
    soundEnabled,
    toggleSound,
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
