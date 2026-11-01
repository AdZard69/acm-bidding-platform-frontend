export type Role = 'admin' | 'team';

export type GameStatus =
  | 'waiting'
  | 'bidding'
  | 'paused'
  | 'between_prompts'
  | 'round_ended'
  | 'coding'
  | 'judging'
  | 'finished';

export interface User {
  role: Role;
  sub?: string;
  adminId?: number;
  username?: string;
  teamId?: number;
  teamName?: string;
}

export interface Team {
  id: number;
  teamName: string;
  isActive: boolean;
  createdAt: string;
  assignment?: Assignment | null;
  score?: Score | null;
  submission?: Submission | null;
}

export interface Prompt {
  id: number;
  title: string;
  description: string;
  displayOrder: number;
  createdAt?: string;
}

export interface Bid {
  timerId?: string | null;
  id?: number;
  teamId: number;
  teamName?: string;
  promptId: number;
  bidMinutes: number;
  round: number;
  submittedAt?: string;
  prompt?: Prompt;
}

export interface Assignment {
  id: number;
  teamId: number;
  promptId: number;
  bidMinutes: number;
  round: number;
  multiplier: number;
  assignedAt?: string;
  prompt?: Prompt;
}

export interface Score {
  id: number;
  teamId: number;
  teamName?: string;
  judgeScore: number;
  multiplier: number;
  finalScore: number;
  scoredAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: number;
  teamName: string;
  isActive: boolean;
  prompt?: {
    id: number;
    title: string;
    displayOrder: number;
  } | null;
  bidMinutes?: number | null;
  multiplier?: number | null;
  judgeScore?: number | null;
  finalScore?: number | null;
  scoredAt?: string | null;
}

export interface RoundDefinition {
  roundNumber: number;
  promptIds: number[];
}

export interface GameConfig {
  id: number;
  baseTime: number; // default 120
  minBid: number; // default 30
  maxTeams: number; // default 10
  slotsPerPrompt: number; // default 3
  bidDurationSeconds: number; // default 60
  currentRound: number; // 0 before bidding; pass number thereafter
  currentPromptIndex: number; // 0-based
  status: GameStatus;
  updatedAt?: string;
}

export interface WinnerResult {
  teamId: number;
  teamName: string;
  bidMinutes: number;
  multiplier: number;
}

export interface PromptResultsData {
  promptId: number;
  winners: WinnerResult[];
}

export interface RoundEndedSummary {
  round: number;
  assignedTeams: number;
  unassignedTeams: number;
  autoAssigned?: {
    teamId: number;
    teamName: string;
    promptId: number;
    bidMinutes: number;
    multiplier: number;
  };
}

export interface AssignmentReceivedData {
  promptId: number;
  title: string;
  description: string;
  bidMinutes: number;
  multiplier: number;
  codingTimeMinutes: number;
  round?: number;
}

export interface ClockBiddingState {
  status: GameStatus;
  currentRound: number;
  activePromptId: number | null;
  isRunning: boolean;
  isPaused: boolean;
  hasExpired: boolean;
  startTime: number | null;
  endsAt: number | null;
  durationSeconds: number;
  remainingMs: number;
  secondsRemaining: number;
}

export interface ClockStatusResponse {
  success: boolean;
  serverTime: number;
  serverTimeIso: string;
  uptime: number;
  timezone: string;
  bidding: ClockBiddingState;
}

export interface ClockSyncResponse {
  success: boolean;
  clientTime: number | null;
  serverReceiveTime: number;
  serverTransmitTime: number;
  serverTime: number;
  serverTimeIso: string;
  precision: string;
}

export interface CurrentBiddingStateResponse {
  timerStreamId?: string;
  timerSequence?: number;
  serverMonotonicTime?: number;
  success: boolean;
  status: GameStatus;
  currentRound: number;
  currentPromptIndex?: number;
  promptIndex?: number;
  totalPromptsInRound?: number;
  canStartRound2?: boolean;
  unassignedTeamsCount?: number;
  currentPrompt: Prompt | null;
  rounds: RoundDefinition[];
  totalRounds: number;
  openedPrompts: { roundNumber: number; promptId: number }[];
  promptNumber: number;
  totalPrompts: number;
  unassignedTeams: number;
  passComplete: boolean;
  hasNextPrompt: boolean;
  nextPromptNumber: number | null;
  hasNextRound: boolean;
  nextRoundNumber: number | null;
  winners?: WinnerResult[];
  summary?: RoundEndedSummary | null;
  secondsRemaining: number;
  remainingMs: number;
  durationSeconds: number;
  timerId: string | null;
  availableSlots: number;
  config: Pick<GameConfig, 'baseTime' | 'minBid' | 'slotsPerPrompt' | 'bidDurationSeconds'>;
  codingState?: AdminCodingState;
  serverTime?: number;
  startTime?: number | null;
  endsAt?: number | null;
  isPaused?: boolean;
  hasExpired?: boolean;
  bids: Bid[];
}

export interface RerunRoundResponse {
  success: boolean;
  message: string;
  round: number;
  prompt?: Prompt;
  promptIndex?: number;
  resetWinners?: number[];
  status?: GameStatus;
}

export interface Submission {
  id: number;
  teamId: number;
  githubUrl: string;
  submittedAt: string;
  updatedAt: string;
}

export interface TeamCodingState {
  gameStatus: GameStatus;
  isStarted: boolean;
  startTime: number | null;
  isPaused: boolean;
  deadline: number | null;
  remainingSeconds: number;
  isExpired: boolean;
}

export interface AdminCodingState {
  isStarted: boolean;
  startTime: number | null;
  isPaused: boolean;
}

export interface AdminSubmissionItem {
  teamId: number;
  teamName: string;
  assignment: {
    promptId: number;
    promptTitle?: string;
    bidMinutes: number;
    round: number;
    multiplier: number;
  } | null;
  submission: Submission | null;
  deadline: number | null;
  remainingSeconds: number;
  isExpired: boolean;
  isSubmitted: boolean;
  isLate: boolean;
}

export interface SubmissionsResponse {
  success: boolean;
  gameStatus: GameStatus;
  codingState: AdminCodingState;
  submissions: AdminSubmissionItem[];
}

export interface TeamSubmissionResponse {
  success: boolean;
  submission: Submission | null;
  assignment: {
    promptId: number;
    promptTitle?: string;
    description?: string;
    bidMinutes: number;
    round: number;
    multiplier: number;
  } | null;
  codingState: TeamCodingState;
}

export interface SubmitProjectResponse {
  success: boolean;
  message: string;
  submission: Submission;
  deadline: number;
  remainingSeconds: number;
}
