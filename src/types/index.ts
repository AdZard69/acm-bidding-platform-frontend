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
}

export interface Prompt {
  id: number;
  title: string;
  description: string;
  displayOrder: number;
  createdAt?: string;
}

export interface Bid {
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

export interface GameConfig {
  id: number;
  baseTime: number; // default 120
  minBid: number; // default 30
  maxTeams: number; // default 10
  slotsPerPrompt: number; // default 3
  bidDurationSeconds: number; // default 60
  currentRound: number; // 0, 1, 2
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
