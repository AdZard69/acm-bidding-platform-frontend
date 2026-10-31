import { GameStatus } from '../types';

interface TimerOrder {
  timerStreamId?: string;
  timerSequence?: number;
  serverTime?: number;
}

export function isOlderTimerSnapshot(next: TimerOrder, current: TimerOrder) {
  if (next.timerStreamId && current.timerStreamId) {
    if (next.timerStreamId !== current.timerStreamId) return false;
    if (next.timerSequence != null && current.timerSequence != null) return next.timerSequence < current.timerSequence;
  }
  return next.serverTime != null && current.serverTime != null && next.serverTime < current.serverTime;
}

export interface BiddingTimerSnapshot {
  timerId?: string | null;
  status: GameStatus;
  remainingMs?: number;
  secondsRemaining?: number;
  secondsLeft?: number;
  durationSeconds?: number;
}

/** Interpolates the server's bidding countdown using elapsed browser time.
 * Neither the user's date/time nor the server's wall clock drives the display. */
export class BiddingTimer {
  private snapshot: { timerId: string | null; status: GameStatus; remainingMs: number; durationSeconds: number } = {
    timerId: null, status: 'waiting', remainingMs: 0, durationSeconds: 0
  };
  private receivedAt = 0;

  constructor(private now: () => number = () => performance.now()) {}

  apply(snapshot: BiddingTimerSnapshot, latencyMs = 0) {
    const rawMs = snapshot.remainingMs != null
      ? snapshot.remainingMs
      : snapshot.secondsRemaining != null
      ? snapshot.secondsRemaining * 1000
      : snapshot.secondsLeft != null
      ? snapshot.secondsLeft * 1000
      : 0;

    const status = snapshot.status || this.snapshot.status;
    const adjustedLatency = Number.isFinite(latencyMs) ? Math.max(0, latencyMs) : 0;

    this.snapshot = {
      timerId: snapshot.timerId ?? this.snapshot.timerId,
      status,
      durationSeconds: snapshot.durationSeconds ?? this.snapshot.durationSeconds,
      remainingMs: Math.max(0, rawMs - (status === 'bidding' ? adjustedLatency : 0))
    };
    this.receivedAt = this.now();
  }

  remainingMs() {
    if (!['bidding', 'paused'].includes(this.snapshot.status)) return 0;
    const elapsed = this.snapshot.status === 'bidding' ? Math.max(0, this.now() - this.receivedAt) : 0;
    return Math.max(0, this.snapshot.remainingMs - elapsed);
  }

  secondsRemaining() { return Math.ceil(this.remainingMs() / 1000); }
}
