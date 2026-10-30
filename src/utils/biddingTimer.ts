import { GameStatus } from '../types';

export interface BiddingTimerSnapshot {
  timerId: string | null;
  status: GameStatus;
  remainingMs: number;
  durationSeconds: number;
}

/** Interpolates the server's bidding countdown using elapsed browser time.
 * Neither the user's date/time nor the server's wall clock drives the display. */
export class BiddingTimer {
  private snapshot: BiddingTimerSnapshot = {
    timerId: null, status: 'waiting', remainingMs: 0, durationSeconds: 0
  };
  private receivedAt = 0;

  constructor(private now: () => number = () => performance.now()) {}

  apply(snapshot: BiddingTimerSnapshot, latencyMs = 0) {
    this.snapshot = {
      ...snapshot,
      remainingMs: Math.max(0, snapshot.remainingMs - (snapshot.status === 'bidding' ? latencyMs : 0))
    };
    this.receivedAt = this.now();
  }

  remainingMs() {
    if (!this.snapshot.timerId || !['bidding', 'paused'].includes(this.snapshot.status)) return 0;
    const elapsed = this.snapshot.status === 'bidding' ? Math.max(0, this.now() - this.receivedAt) : 0;
    return Math.max(0, this.snapshot.remainingMs - elapsed);
  }

  secondsRemaining() { return Math.ceil(this.remainingMs() / 1000); }
}
