import {
  GameConfig,
  LeaderboardEntry,
  Prompt,
  Role,
  Score,
  Team,
  User,
  WinnerResult,
  RoundEndedSummary,
  Bid,
  Assignment,
  ClockStatusResponse,
  ClockSyncResponse,
  CurrentBiddingStateResponse
} from '../types';

const DEFAULT_API_BASE =
  typeof window !== 'undefined' && !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
    ? 'https://acm-bidding-platform-backend.onrender.com/api'
    : 'http://localhost:5000/api';

export const API_BASE = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/$/, '');

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  public getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${path}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      signal: options.signal || AbortSignal.timeout(15000),
      headers
    });

    const authHeader = response.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      this.setToken(authHeader.substring(7));
    }

    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errData = data as { error?: { message?: string }; message?: string };
      const errorMessage =
        errData?.error?.message ||
        errData?.message ||
        `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }

  // --- Health ---
  async checkHealth(): Promise<{ success: boolean; status: string; uptime: number }> {
    return this.request('/health');
  }

  // --- Auth API ---

  async teamLogin(teamName: string, password: string): Promise<{
    success: boolean;
    token: string;
    teamId: number;
    teamName: string;
  }> {
    const res = await this.request<{
      success: boolean;
      token: string;
      teamId: number;
      teamName: string;
    }>('/auth/team/login', {
      method: 'POST',
      body: JSON.stringify({ teamName, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async adminLogin(username: string, password: string): Promise<{
    success: boolean;
    token: string;
    role: 'admin';
    adminId: number;
    username: string;
  }> {
    const res = await this.request<{
      success: boolean;
      token: string;
      role: 'admin';
      adminId: number;
      username: string;
    }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getMe(): Promise<{ success: boolean } & User> {
    return this.request<{ success: boolean } & User>('/auth/me');
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
    return { success: true, message: 'Logged out' };
  }

  async changeTeamPassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/auth/team/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  async changeAdminPassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/auth/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  // --- Admin: Teams ---

  async listBids(round?: number): Promise<{ success: boolean; bids: Bid[] }> {
    return this.request(round === undefined ? '/admin/bids' : `/admin/bids?round=${round}`);
  }

  async listTeams(): Promise<{ success: boolean; teams: Team[] }> {
    return this.request('/admin/teams');
  }

  async createTeam(teamName: string, password: string): Promise<{ success: boolean; team: Team }> {
    return this.request('/admin/teams', {
      method: 'POST',
      body: JSON.stringify({ teamName, password })
    });
  }

  async updateTeam(
    id: number,
    data: { teamName?: string; password?: string; isActive?: boolean }
  ): Promise<{ success: boolean; team: Team }> {
    return this.request(`/admin/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTeam(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/teams/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleTeam(id: number): Promise<{ success: boolean; team: Team }> {
    return this.request(`/admin/teams/${id}/toggle`, {
      method: 'PATCH'
    });
  }

  // --- Admin: Prompts ---

  async listPrompts(): Promise<{ success: boolean; prompts: Prompt[] }> {
    return this.request('/admin/prompts');
  }

  async createPrompt(
    title: string,
    description: string,
    displayOrder?: number
  ): Promise<{ success: boolean; prompt: Prompt }> {
    return this.request('/admin/prompts', {
      method: 'POST',
      body: JSON.stringify({ title, description, displayOrder })
    });
  }

  async updatePrompt(
    id: number,
    data: { title?: string; description?: string; displayOrder?: number }
  ): Promise<{ success: boolean; prompt: Prompt }> {
    return this.request(`/admin/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePrompt(id: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/prompts/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Admin: Round Controls ---

  async startRound(roundNumber?: number): Promise<{
    success: boolean;
    message: string;
    round: number;
    currentPrompt: Prompt;
    secondsRemaining: number;
    status: string;
  }> {
    return this.request('/admin/round/start', {
      method: 'POST',
      body: JSON.stringify(roundNumber ? { roundNumber } : {})
    });
  }

  async pauseRound(timerId?: string | null): Promise<{
    success: boolean;
    message: string;
    round: number;
    secondsRemaining: number;
    status: string;
  }> {
    return this.request('/admin/round/pause', {
      method: 'POST',
      body: JSON.stringify({ timerId })
    });
  }

  async resumeRound(timerId?: string | null): Promise<{
    success: boolean;
    message: string;
    round: number;
    secondsRemaining: number;
    status: string;
  }> {
    return this.request('/admin/round/resume', {
      method: 'POST',
      body: JSON.stringify({ timerId })
    });
  }

  async extendRound(extraSeconds: number, timerId?: string | null): Promise<{
    success: boolean;
    message: string;
    extraSeconds: number;
    secondsRemaining: number;
  }> {
    return this.request('/admin/round/extend', {
      method: 'POST',
      body: JSON.stringify({ extraSeconds, timerId })
    });
  }

  async nextPrompt(timerId?: string | null): Promise<{
    success: boolean;
    message: string;
    round: number;
    prompt?: Prompt;
    promptIndex?: number;
    totalPrompts?: number;
    winners?: WinnerResult[];
    status?: string;
    summary?: RoundEndedSummary;
  }> {
    return this.request('/admin/round/next-prompt', {
      method: 'POST',
      body: JSON.stringify({ timerId })
    });
  }

  async endRound(timerId?: string | null): Promise<{
    success: boolean;
    message: string;
    round: number;
    status: string;
    winners: WinnerResult[];
    summary: RoundEndedSummary;
  }> {
    return this.request('/admin/round/end', {
      method: 'POST',
      body: JSON.stringify({ timerId })
    });
  }

  // --- Admin: Scores & Leaderboard ---

  async submitScore(
    teamId: number,
    judgeScore: number
  ): Promise<{ success: boolean; message: string; score: Score }> {
    return this.request(`/admin/scores/${teamId}`, {
      method: 'POST',
      body: JSON.stringify({ judgeScore })
    });
  }

  async getLeaderboard(): Promise<{ success: boolean; leaderboard: LeaderboardEntry[] }> {
    return this.request('/admin/leaderboard');
  }

  // --- Admin: Reset & Config ---

  async resetGame(options: { wipeTeams?: boolean; wipePrompts?: boolean; wipeAll?: boolean } = {}) {
    return this.request<{ success: boolean; message: string; status: string }>('/admin/reset', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async getConfig(): Promise<{ success: boolean; config: GameConfig }> {
    return this.request('/admin/config');
  }

  async updateConfig(
    data: Partial<Pick<GameConfig, 'baseTime' | 'minBid' | 'maxTeams' | 'slotsPerPrompt' | 'bidDurationSeconds'>>
  ): Promise<{ success: boolean; message: string; config: GameConfig }> {
    return this.request('/admin/config', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // --- Server Clock API ---

  async getClock(): Promise<ClockStatusResponse> {
    return this.request<ClockStatusResponse>('/clock');
  }

  async syncClock(clientTime: number = Date.now()): Promise<ClockSyncResponse> {
    return this.request<ClockSyncResponse>(`/clock/sync?t0=${clientTime}`);
  }

  // --- Team Bidding Routes ---

  async getCurrentBiddingState(): Promise<CurrentBiddingStateResponse> {
    return this.request<CurrentBiddingStateResponse>('/bid/current');
  }

  async placeBid(bidMinutes: number, context: { promptId?: number; round?: number; timerId?: string | null } = {}): Promise<{ success: boolean; message: string; bid: Bid }> {
    return this.request('/bid/place', {
      method: 'POST',
      body: JSON.stringify({ bidMinutes, ...context })
    });
  }

  async updateBid(bidMinutes: number): Promise<{ success: boolean; message: string; bid: Bid }> {
    return this.request('/bid/update', {
      method: 'PUT',
      body: JSON.stringify({ bidMinutes })
    });
  }

  async getMyBids(): Promise<{ success: boolean; bids: (Bid & { prompt?: Prompt })[] }> {
    return this.request('/bid/my-bids');
  }

  async getMyAssignment(): Promise<{ success: boolean; assignment: Assignment | null; score: Score | null }> {
    return this.request('/bid/assignment');
  }

  async getPublicLeaderboard(): Promise<{ success: boolean; leaderboard: LeaderboardEntry[] }> {
    return this.request('/bid/leaderboard');
  }
}

export const api = new ApiClient();
