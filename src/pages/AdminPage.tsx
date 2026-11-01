import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Play,
  Pause,
  FastForward,
  Plus,
  Trash2,
  Settings,
  Users,
  FileCode,
  Award,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Edit3,
  Power,
  TrendingDown,
  Clock,
  History,
  SlidersHorizontal,
  FolderGit2,
  Github,
  ExternalLink
} from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { BiddingTimerBadge } from '../components/BiddingTimerBadge';
import { Team, Prompt, GameConfig, LeaderboardEntry, Bid, AdminSubmissionItem, AdminCodingState } from '../types';
import { groupRoundBids, promptRounds } from '../utils/rounds';
import { calculateFinalScore, calculateMultiplier, calculateBoostPercentage } from '../utils/multiplier';

type AdminTab = 'controls' | 'teams' | 'prompts' | 'judging' | 'config' | 'reset' | 'submissions';

export const AdminPage: React.FC = () => {
  const {
    socket,
    isConnected,
    gameStatus,
    currentRound,
    currentPromptIndex,
    totalPromptsInRound,
    hasNextPrompt,
    canStartRound2,
    unassignedTeamsCount,
    rounds: capturedRounds,
    hasNextRound,
    currentPrompt,
    secondsRemaining,
    availableSlots,
    isPaused,
    isExpired,
    bids,
    lastWinners,
    refreshState,
    adminStartRound,
    adminPause,
    adminResume,
    adminExtend,
    adminNextPrompt,
    adminEndRound,
    adminRerunRound
  } = useSocket();

  const [activeTab, setActiveTab] = useState<AdminTab>('controls');
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [targetRound, setTargetRound] = useState<number>(1);
  const [controlsView, setControlsView] = useState<'controls' | number>('controls');

  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [codingState, setCodingState] = useState<AdminCodingState>({ isStarted: false, startTime: null, isPaused: false });
  const [loadingCoding, setLoadingCoding] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'pending' | 'expired'>('all');

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await api.listSubmissions();
      if (res.success) {
        setSubmissions(res.submissions);
        setCodingState(res.codingState);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions, activeTab, gameStatus]);

  useEffect(() => {
    if (!socket) return;
    const handleCodingEvent = () => {
      void fetchSubmissions();
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
  }, [socket, fetchSubmissions, refreshState]);

  const handleStartCoding = async () => {
    if (codingState.isStarted && !confirm('Coding timers are already running. Do you want to restart the coding window for all teams?')) {
      return;
    }
    setLoadingCoding(true);
    try {
      const res = await api.startCodingTimers();
      setNotification({ type: 'success', text: res.message || 'Coding timers started for all teams!' });
      await fetchSubmissions();
      await refreshState();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to start coding timers' });
    } finally {
      setLoadingCoding(false);
    }
  };

  const handlePauseCoding = async () => {
    setLoadingCoding(true);
    try {
      const res = await api.pauseCodingTimers();
      setNotification({ type: 'success', text: res.message || 'Coding timers paused' });
      await fetchSubmissions();
      await refreshState();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to pause coding timers' });
    } finally {
      setLoadingCoding(false);
    }
  };

  const handleResumeCoding = async () => {
    setLoadingCoding(true);
    try {
      const res = await api.resumeCodingTimers();
      setNotification({ type: 'success', text: res.message || 'Coding timers resumed' });
      await fetchSubmissions();
      await refreshState();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to resume coding timers' });
    } finally {
      setLoadingCoding(false);
    }
  };

  const handleResetCoding = async (wipe: boolean = false) => {
    if (!confirm(wipe ? 'Are you sure you want to reset the coding phase and WIPE all submitted GitHub URLs?' : 'Are you sure you want to reset coding timers?')) {
      return;
    }
    setLoadingCoding(true);
    try {
      const res = await api.resetCodingTimers(wipe);
      setNotification({ type: 'success', text: res.message || 'Coding timers reset successfully' });
      await fetchSubmissions();
      await refreshState();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to reset coding timers' });
    } finally {
      setLoadingCoding(false);
    }
  };

  useEffect(() => {
    setTargetRound(gameStatus === 'round_ended' && currentRound === 1 && canStartRound2 ? 2 : currentRound || 1);
  }, [currentRound, gameStatus, canStartRound2]);

  // Team creation
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPass, setNewTeamPass] = useState('');

  // Team editing
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamPass, setEditTeamPass] = useState('');

  // Prompt creation
  const [showAddPromptModal, setShowAddPromptModal] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptDesc, setNewPromptDesc] = useState('');
  const [newPromptOrder, setNewPromptOrder] = useState<number>(1);

  // Prompt editing
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [editPromptTitle, setEditPromptTitle] = useState('');
  const [editPromptDesc, setEditPromptDesc] = useState('');
  const [editPromptOrder, setEditPromptOrder] = useState<number>(1);

  // Scoring
  const [judgeScores, setJudgeScores] = useState<Record<number, number>>({});

  // Reset
  const [wipeTeams, setWipeTeams] = useState(false);
  const [wipePrompts, setWipePrompts] = useState(false);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3500);
  };

  const adminRead = useRef<Promise<void> | null>(null);
  const adminRefreshQueued = useRef(false);
  const fetchAdminData = useCallback((): Promise<void> => {
    if (adminRead.current) {
      adminRefreshQueued.current = true;
      return adminRead.current;
    }
    adminRead.current = (async () => {
      setLoading(true);
      try {
        const [teamsRes, promptsRes, configRes, leadRes, historyRes] = await Promise.allSettled([
          api.listTeams(),
          api.listPrompts(),
          api.getConfig(),
          api.getLeaderboard(),
          api.listBids()
        ]);

        const failed = [teamsRes, promptsRes, configRes, leadRes, historyRes].find((result) => result.status === 'rejected');
        if (failed?.status === 'rejected') {
          showMsg('error', failed.reason instanceof Error ? failed.reason.message : 'Admin data could not be loaded');
        }

        if (historyRes.status === 'fulfilled' && historyRes.value.success) {
          setBidHistory(historyRes.value.bids);
        }
        if (teamsRes.status === 'fulfilled' && teamsRes.value.success) {
          setTeams(teamsRes.value.teams);
        }
        if (promptsRes.status === 'fulfilled' && promptsRes.value.success) {
          setPrompts(promptsRes.value.prompts);
        }
        if (configRes.status === 'fulfilled' && configRes.value.success) {
          setConfig(configRes.value.config);
        }
        if (leadRes.status === 'fulfilled' && leadRes.value.success) {
          setLeaderboard(leadRes.value.leaderboard);
          const map: Record<number, number> = {};
          leadRes.value.leaderboard.forEach((e) => {
            if (e.judgeScore !== null && e.judgeScore !== undefined) {
              map[e.teamId] = e.judgeScore;
            }
          });
          setJudgeScores(map);
        }
      } catch {
        showMsg('error', 'Error syncing admin data');
      } finally {
        setLoading(false);
      }
    })().finally(() => {
      adminRead.current = null;
      if (adminRefreshQueued.current) {
        adminRefreshQueued.current = false;
        queueMicrotask(() => { void fetchAdminData(); });
      }
    });
    return adminRead.current;
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { void fetchAdminData(); };
    const reset = () => {
      setBidHistory([]);
      refresh();
    };
    const events = ['connect', 'prompt:results', 'round:ended', 'leaderboard:update', 'config:updated'];
    events.forEach((event) => socket.on(event, refresh));
    socket.on('game:reset', reset);
    return () => {
      events.forEach((event) => socket.off(event, refresh));
      socket.off('game:reset', reset);
    };
  }, [socket, fetchAdminData]);

  // Round operations
  const handleStartRound = async (roundNum?: number) => {
    const r = roundNum || targetRound || 1;
    try {
      setLoading(true);
      const result = await adminStartRound(r);
      if (!result.success) throw new Error(result.message || 'Failed to start round');
      showMsg('success', `Round ${r} started`);
      setControlsView('controls');
      setTargetRound(r);
      await fetchAdminData();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to start round');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      const result = await adminPause();
      if (!result.success) throw new Error(result.message || 'Action failed');
      showMsg('success', 'Round timer paused');
      refreshState();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const handleResume = async () => {
    try {
      const result = await adminResume();
      if (!result.success) throw new Error(result.message || 'Action failed');
      showMsg('success', 'Round timer resumed');
      refreshState();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  const handleExtend = async (seconds: number) => {
    try {
      const result = await adminExtend(seconds);
      if (!result.success) throw new Error(result.message || 'Action failed');
      showMsg('success', `Extended by ${seconds}s`);
      refreshState();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to extend');
    }
  };

  const handleNextPrompt = async () => {
    if (gameStatus !== 'round_ended' && !isExpired && !window.confirm(hasNextRound ? 'Close this round early and open the next prompt? This awards the current winning bids.' : 'Close the final round early and award the winning bids?')) return;
    try {
      const result = await adminNextPrompt();
      if (!result.success) throw new Error(result.message || 'Action failed');
      showMsg('success', result.message || 'Opened the next prompt round');
      fetchAdminData();
      refreshState();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to advance prompt');
    }
  };

  const handleEndRound = async () => {
    if (!window.confirm('Close this round and award its winners? The next prompt will wait for you to click Next.')) return;
    try {
      const result = await adminEndRound();
      if (!result.success) throw new Error(result.message || 'Action failed');
      showMsg('success', 'Round ended');
      fetchAdminData();
      refreshState();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to end round');
    }
  };

  const handleRerunRound = async (roundNum?: number) => {
    const r = roundNum !== undefined ? roundNum : (currentRound || targetRound || 1);
    if (r < 1 || r > totalRounds) {
      showMsg('error', `Invalid round number: ${r}`);
      return;
    }

    const roundDef = roundDefinitions.find((def) => def.roundNumber === r);
    const prompt = prompts.find((p) => p.id === roundDef?.promptId);
    const promptLabel = prompt ? ` ("${prompt.title}")` : '';

    const confirmMsg =
      `RERUN ROUND ${r}${promptLabel}?\n\n` +
      `⚠️ WARNING: This will:\n` +
      `• Reset all bids placed for Round ${r}\n` +
      `• Clear assignments and scores for teams who won in Round ${r}\n` +
      `• Immediately restart the bidding countdown for Round ${r}\n\n` +
      `Are you sure you want to proceed?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const result = await adminRerunRound(r);
      if (!result.success) throw new Error(result.message || 'Failed to rerun round');
      showMsg('success', result.message || `Round ${r} rerun started`);
      setControlsView('controls');
      setTargetRound(r);
      await fetchAdminData();
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to rerun round');
    } finally {
      setLoading(false);
    }
  };

  // Team CRUD
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createTeam(newTeamName.trim(), newTeamPass);
      if (res.success) {
        showMsg('success', `Team "${res.team.teamName}" created`);
        setNewTeamName('');
        setNewTeamPass('');
        setShowAddTeamModal(false);
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error creating team');
    }
  };

  const handleToggleTeam = async (id: number) => {
    try {
      const res = await api.toggleTeam(id);
      if (res.success) {
        showMsg('success', 'Team status updated');
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error updating team');
    }
  };

  const handleDeleteTeam = async (id: number, name: string) => {
    if (!window.confirm(`Delete team "${name}"?`)) return;
    try {
      const res = await api.deleteTeam(id);
      if (res.success) {
        showMsg('success', 'Team deleted');
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error deleting team');
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    try {
      const payload: { teamName?: string; password?: string } = {};
      if (editTeamName.trim() && editTeamName.trim() !== editingTeam.teamName) {
        payload.teamName = editTeamName.trim();
      }
      if (editTeamPass.trim()) {
        payload.password = editTeamPass.trim();
      }
      if (Object.keys(payload).length === 0) {
        setEditingTeam(null);
        return;
      }
      const res = await api.updateTeam(editingTeam.id, payload);
      if (res.success) {
        showMsg('success', `Team "${res.team.teamName}" updated`);
        setEditingTeam(null);
        setEditTeamPass('');
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error updating team');
    }
  };

  // Prompt CRUD
  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPrompt(newPromptTitle.trim(), newPromptDesc.trim(), newPromptOrder);
      if (res.success) {
        showMsg('success', 'Prompt created');
        setNewPromptTitle('');
        setNewPromptDesc('');
        setNewPromptOrder(prompts.length + 1);
        setShowAddPromptModal(false);
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error creating prompt');
    }
  };

  const handleDeletePrompt = async (id: number, title: string) => {
    if (!window.confirm(`Delete prompt "${title}"?`)) return;
    try {
      const res = await api.deletePrompt(id);
      if (res.success) {
        showMsg('success', 'Prompt removed');
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error deleting prompt');
    }
  };

  const handleUpdatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;
    try {
      const res = await api.updatePrompt(editingPrompt.id, {
        title: editPromptTitle.trim(),
        description: editPromptDesc.trim(),
        displayOrder: editPromptOrder
      });
      if (res.success) {
        showMsg('success', 'Prompt updated');
        setEditingPrompt(null);
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error updating prompt');
    }
  };

  // Score submission
  const handleSubmitScore = async (teamId: number) => {
    const raw = judgeScores[teamId];
    if (raw === undefined || isNaN(raw) || raw < 0 || raw > 100) {
      showMsg('error', 'Score must be 0-100');
      return;
    }
    try {
      const res = await api.submitScore(teamId, raw);
      if (res.success) {
        showMsg('success', `Saved: ${res.score.finalScore} pts`);
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error submitting score');
    }
  };

  // Config update
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      const res = await api.updateConfig({
        baseTime: config.baseTime,
        minBid: config.minBid,
        maxTeams: config.maxTeams,
        slotsPerPrompt: config.slotsPerPrompt,
        bidDurationSeconds: config.bidDurationSeconds
      });
      if (res.success) {
        showMsg('success', 'Configuration updated');
        fetchAdminData();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error updating configuration');
    }
  };

  // Reset
  const handleNuclearReset = async () => {
    if (!window.confirm('RESET ENTIRE GAME? This clears active rounds, bids, and scores!')) return;
    try {
      const res = await api.resetGame({ wipeTeams, wipePrompts });
      if (res.success) {
        showMsg('success', 'Game reset to waiting state');
        setBidHistory([]);
        fetchAdminData();
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error resetting game');
    }
  };

  const roundDefinitions = promptRounds(prompts, capturedRounds);
  const totalRounds = 2;
  const roundList = [1, 2];
  const roundBidsHistory = groupRoundBids(bidHistory, bids, roundDefinitions);
  const isPromptRunning = gameStatus === 'bidding' && !isExpired;
  const isRoundOpen = gameStatus === 'bidding' || gameStatus === 'paused';
  const canStartRound = prompts.length > 0 && !isRoundOpen;
  const canAdvance = currentRound > 0 && (isRoundOpen || gameStatus === 'round_ended');

  // Computed placed bids for selected round view
  const selectedRoundBids = (() => {
    if (typeof controlsView !== 'number') return [];
    const r = controlsView;
    const mergedMap = new Map<string, Bid & { isAssigned?: boolean; promptTitle?: string }>();
    const add = (bid: Bid) => {
      if ((bid.round || 1) === r) {
        mergedMap.set(`${bid.teamId}:${bid.promptId}`, { ...bid, round: r });
      }
    };
    (roundBidsHistory[r] || []).forEach(add);
    if (currentRound === r) bids.forEach(add);
    teams.forEach((team) => {
      const assignment = team.assignment;
      if (!assignment || (assignment.round || 1) !== r) return;
      const key = `${team.id}:${assignment.promptId}`;
      const existing = mergedMap.get(key);
      mergedMap.set(key, {
        ...existing,
        teamId: team.id,
        teamName: team.teamName,
        promptId: assignment.promptId,
        bidMinutes: assignment.bidMinutes,
        round: r,
        prompt: assignment.prompt,
        isAssigned: true
      });
    });
    mergedMap.forEach((entry) => {
      entry.promptTitle = entry.prompt?.title || prompts.find((prompt) => prompt.id === entry.promptId)?.title || `Prompt #${entry.promptId}`;
    });

    return Array.from(mergedMap.values()).sort((a, b) => a.bidMinutes - b.bidMinutes);
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-100 border border-surface-border text-slate-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-mono text-white">
              Admin Control Room
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Auction Management & Judge Evaluations
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchAdminData();
            refreshState();
          }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 text-slate-300 border border-surface-border text-xs font-mono transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-surface-border pb-3 font-mono text-xs">
        {[
          { id: 'controls', label: 'Round Controls', icon: Play },
          { id: 'teams', label: `Teams (${teams.length})`, icon: Users },
          { id: 'prompts', label: `Prompts (${prompts.length})`, icon: FileCode },
          { id: 'judging', label: 'Judging', icon: Award },
          { id: 'config', label: 'Settings', icon: Settings },
          { id: 'reset', label: 'Reset', icon: AlertTriangle },
          { id: 'submissions', label: `Submissions (${submissions.filter((s) => s.isSubmitted).length}/${submissions.length})`, icon: FolderGit2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-[#721426] text-white font-bold border border-[#D45B70]/40'
                  : 'bg-surface-100 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CONTROLS */}
      {activeTab === 'controls' && (
        <div className="space-y-6">
          {/* Synchronized Bidding Countdown */}
          <BiddingTimerBadge />

          {/* Status Row */}
          <div className="p-4 rounded-xl bg-surface-100 border border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div>
              <span className="text-slate-500 block">GAME STATUS</span>
              <span className="text-base font-bold text-white uppercase">{gameStatus === 'round_ended' ? 'Round complete' : gameStatus}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ROUND</span>
              <span className="text-base font-bold text-white">
                {currentRound > 0 ? `Round ${currentRound} (k = ${currentRound === 1 ? '1.0' : '0.7'})` : 'None'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">TIME LEFT</span>
              {isPaused ? (
                <span className="text-base font-bold text-amber-400">
                  {secondsRemaining}s <span className="text-[10px] text-amber-300 uppercase">(PAUSED)</span>
                </span>
              ) : (gameStatus === 'bidding' || gameStatus === 'round_ended') && secondsRemaining <= 0 ? (
                <span className="text-base font-bold text-rose-400">EXPIRED</span>
              ) : (
                <span className="text-base font-bold text-[#D4AF37]">{secondsRemaining}s</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block">ACTIVE PROMPT</span>
              <span className="text-base font-bold text-slate-200 truncate block">
                {currentPrompt ? `P${currentPromptIndex + 1}: ${currentPrompt.title}` : 'None'}
              </span>
            </div>
          </div>

          {gameStatus === 'round_ended' && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-200 font-mono">
              Round {currentRound} · Prompt {currentPromptIndex + 1} complete.{' '}
              {hasNextPrompt
                ? 'The prompt and bids stay here until you click Next Prompt.'
                : currentRound === 1
                ? canStartRound2
                  ? `Round 1 complete! ${unassignedTeamsCount} teams remain unassigned. You can start Round 2 (Second Chance).`
                  : 'Round 1 complete! All teams have been assigned.'
                : 'Round 2 complete! All open bidding is finished.'}
            </div>
          )}

          {/* Round Navigation Bar */}
          <div className="p-4 rounded-xl bg-surface-100 border border-surface-border flex items-center justify-between gap-3 font-mono text-xs flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Controls Button */}
              <button
                onClick={() => setControlsView('controls')}
                className={`px-3.5 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                  controlsView === 'controls'
                    ? 'bg-[#721426] text-white border-[#D45B70]/60 shadow-sm'
                    : 'bg-surface-200 text-slate-300 border-surface-border hover:bg-surface-50 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Controls</span>
                {isPromptRunning && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Bidding in progress" />
                )}
              </button>

              <div className="h-4 w-px bg-surface-border mx-1" />

              <span className="text-slate-400 font-bold uppercase flex items-center gap-1.5 mr-1 text-[11px]">
                <History className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Rounds:</span>
              </span>

              {roundList.map((r) => {
                const isSelected = controlsView === r;
                const isLive = currentRound === r && isPromptRunning;
                const hasData =
                  (roundBidsHistory[r] && roundBidsHistory[r].length > 0) ||
                  teams.some((t) => (t.assignment?.round || 1) === r);

                return (
                  <button
                    key={r}
                    onClick={() => setControlsView(r)}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-sm'
                        : 'bg-surface-200 text-slate-300 border-surface-border hover:bg-surface-50 hover:text-white'
                    }`}
                  >
                    <span>Round {r} {r === 1 ? '(k=1.0)' : '(k=0.7)'}</span>
                    {isLive ? (
                      <span
                        className={`w-2 h-2 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-400'} animate-pulse`}
                        title="Bidding active"
                      />
                    ) : hasData ? (
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded font-normal ${
                          isSelected ? 'bg-black/20 text-black' : 'bg-surface-100 text-slate-400'
                        }`}
                      >
                        Bids
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {controlsView !== 'controls' && (
              <button
                onClick={() => setControlsView('controls')}
                className="px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-50 text-slate-300 border border-surface-border font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Return to Controls</span>
              </button>
            )}
          </div>

          {/* VIEW A: CONTROLS VIEW */}
          {controlsView === 'controls' && (
            <>
              {/* Operational Buttons */}
              <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                  <span className="font-bold text-white uppercase block">
                    Round Actions {currentRound > 0 ? `(Active: Round ${currentRound})` : ''}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Status: <strong className={`uppercase ${isPromptRunning ? 'text-emerald-400' : 'text-white'}`}>{gameStatus}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-surface-200 border border-surface-border rounded-lg px-3 py-2 shrink-0">
                      <span className="text-slate-400 font-bold uppercase text-[11px]">Round:</span>
                      <input
                        type="range"
                        min={1}
                        max={2}
                        step={1}
                        value={targetRound}
                        disabled={loading}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTargetRound(val);
                        }}
                        className="w-16 sm:w-24 accent-[#D4AF37] cursor-pointer"
                        title="Round slider"
                        aria-label="Round to control"
                      />
                      <input
                        type="number"
                        min={1}
                        max={2}
                        value={targetRound}
                        aria-label="Round number to control"
                        disabled={loading}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(2, Number(e.target.value) || 1));
                          setTargetRound(val);
                        }}
                        className="w-12 px-2 py-1 bg-surface-100 border border-surface-border rounded text-center text-white font-bold text-xs focus:outline-none focus:border-[#D4AF37]"
                      />
                      <span className="text-[10px] text-slate-500">/ 2</span>
                    </div>

                    <button
                      onClick={() => handleStartRound(targetRound)}
                      disabled={loading || !canStartRound}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] font-bold uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                      title={`Round ${targetRound}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isRoundOpen ? `Round ${currentRound} Active` : `Start Round ${targetRound}`}
                      </span>
                    </button>
                  </div>

                  {gameStatus === 'paused' ? (
                    <button
                      onClick={handleResume}
                      disabled={loading}
                      className="py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume Timer</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      disabled={loading || !isPromptRunning}
                      className="py-2.5 px-4 rounded-lg bg-surface-50 hover:bg-surface-200 text-slate-300 border border-surface-border font-bold uppercase transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Timer</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-surface-border">
                  {/* Extend time */}
                  <div className="flex gap-1.5">
                    {[15, 30, 60].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleExtend(s)}
                        disabled={loading || currentRound === 0}
                        className="flex-1 py-2 bg-surface-200 hover:bg-surface-50 text-slate-300 border border-surface-border rounded-lg disabled:opacity-40 transition-colors"
                        title={`Add ${s}s to countdown`}
                      >
                        +{s}s
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleNextPrompt}
                    disabled={loading || !canAdvance}
                    className="py-2 px-4 rounded-lg bg-surface-200 hover:bg-surface-50 text-slate-300 border border-surface-border font-bold uppercase transition-colors disabled:opacity-40"
                  >
                    {hasNextPrompt ? 'Next Prompt' : (currentRound === 1 ? 'Finish Round 1' : 'Finish Round 2')}
                  </button>

                  <button
                    onClick={handleEndRound}
                    disabled={loading || !isRoundOpen}
                    className="py-2 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase transition-colors disabled:opacity-40"
                  >
                    End Current Round
                  </button>

                  <button
                    onClick={() => handleRerunRound(targetRound)}
                    disabled={loading}
                    className="py-2 px-4 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    title={`Reset bids and winners, then restart Round ${targetRound}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rerun Round {targetRound}</span>
                  </button>
                </div>
              </div>

              {/* Round Management & Controls for Each Round */}
              <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#D4AF37]" />
                    <span className="font-bold text-white uppercase text-sm">
                      Round Controls
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Total Rounds: <strong className="text-white">{totalRounds}</strong>
                  </span>
                </div>

                <div className="divide-y divide-surface-border rounded-lg border border-surface-border overflow-hidden bg-surface-200/40">
                  {/* Round 1 Card */}
                  <div
                    className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      currentRound === 1 ? 'bg-surface-50/80' : 'hover:bg-surface-50/40'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          Round 1 (Primary Round · k = 1.0)
                        </span>
                        {currentRound === 1 && isPromptRunning && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            LIVE
                          </span>
                        )}
                        {currentRound === 1 && isPaused && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                            PAUSED
                          </span>
                        )}
                        {currentRound === 1 && gameStatus === 'round_ended' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                            ROUND COMPLETE
                          </span>
                        )}
                        {currentRound > 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-500/15 text-slate-300 border border-surface-border font-bold">
                            COMPLETED
                          </span>
                        )}
                        {teams.filter((t) => (t.assignment?.round || 1) === 1).length > 0 && (
                          <span className="text-emerald-400 text-[11px] font-bold">
                            {teams.filter((t) => (t.assignment?.round || 1) === 1).length} Winners Assigned
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        All active teams participate across all 4 prompts. Lowest unique bids win prompt slots.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setControlsView(1)}
                        className="py-1.5 px-3 rounded-lg bg-surface-200 hover:bg-surface-50 text-slate-300 hover:text-white border border-surface-border font-bold uppercase transition-colors flex items-center gap-1.5"
                        title="View bids for Round 1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Bids ({(roundBidsHistory[1] || []).length})</span>
                      </button>

                      <button
                        onClick={() => handleRerunRound(1)}
                        disabled={loading || currentRound === 0}
                        className="py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title="Rerun Round 1 (resets bids and assignments for Round 1)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rerun Round 1</span>
                      </button>
                    </div>
                  </div>

                  {/* Round 2 Card */}
                  <div
                    className={`p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      currentRound === 2 ? 'bg-surface-50/80' : 'hover:bg-surface-50/40'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          Round 2 (Second Chance · k = 0.7)
                        </span>
                        {currentRound === 2 && isPromptRunning && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            LIVE
                          </span>
                        )}
                        {currentRound === 2 && isPaused && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                            PAUSED
                          </span>
                        )}
                        {currentRound === 2 && gameStatus === 'round_ended' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                            ROUND COMPLETE
                          </span>
                        )}
                        {currentRound < 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-surface-100 text-slate-500 border border-surface-border font-bold">
                            {canStartRound2 ? 'READY TO START' : 'SAFETY NET'}
                          </span>
                        )}
                        {teams.filter((t) => t.assignment?.round === 2).length > 0 && (
                          <span className="text-emerald-400 text-[11px] font-bold">
                            {teams.filter((t) => t.assignment?.round === 2).length} Winners Assigned
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Only unassigned teams bid on prompts with remaining open slots (&lt; {config?.slotsPerPrompt || 3} assigned). Reduced multiplier curve.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setControlsView(2)}
                        className="py-1.5 px-3 rounded-lg bg-surface-200 hover:bg-surface-50 text-slate-300 hover:text-white border border-surface-border font-bold uppercase transition-colors flex items-center gap-1.5"
                        title="View bids for Round 2"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Bids ({(roundBidsHistory[2] || []).length})</span>
                      </button>

                      <button
                        onClick={() => handleRerunRound(2)}
                        disabled={loading || currentRound < 2}
                        className="py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title="Rerun Round 2 (resets bids and assignments for Round 2)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rerun Round 2</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Placed Bids Live Feed */}
              <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded bg-surface-50 text-brand-emerald">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase text-sm">
                          Placed Bids Till Now
                        </span>
                        {isPromptRunning && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            LIVE
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {currentPrompt
                          ? `Active for Prompt #${currentPrompt.displayOrder || currentPrompt.id}: ${currentPrompt.title}`
                          : 'Live incoming bids for the current prompt'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-surface-200 text-slate-300 border border-surface-border font-bold">
                      {bids.length} {bids.length === 1 ? 'Bid' : 'Bids'} Placed
                    </span>
                    <button
                      onClick={() => refreshState()}
                      className="p-1.5 rounded bg-surface-200 hover:bg-surface-50 text-slate-300 border border-surface-border transition-colors"
                      title="Refresh bids"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bids Table / Empty State */}
                {bids.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 space-y-1">
                    <Clock className="w-6 h-6 mx-auto opacity-40 mb-2" />
                    <p className="font-bold text-slate-400">No bids placed yet</p>
                    <p className="text-[11px]">
                      {gameStatus === 'bidding'
                        ? 'Waiting for teams to submit their time commitments...'
                        : 'Bids will appear here in real-time once round bidding begins.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-surface-border overflow-hidden bg-surface-200/50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-surface-200 text-slate-400 border-b border-surface-border uppercase">
                          <tr>
                            <th className="py-2.5 px-3 w-14">Rank</th>
                            <th className="py-2.5 px-3">Team</th>
                            <th className="py-2.5 px-3 text-center">Bid Time</th>
                            <th className="py-2.5 px-3 text-center">Multiplier</th>
                            <th className="py-2.5 px-3 text-center">Boost</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                          {bids.map((b, idx) => {
                            const slots = availableSlots;
                            const isWinning = gameStatus === 'round_ended'
                              ? Boolean(lastWinners?.some((winner) => winner.teamId === b.teamId)) : idx < slots;
                            const teamName =
                              b.teamName ||
                              teams.find((t) => t.id === b.teamId)?.teamName ||
                              `Team #${b.teamId}`;
                            const m = calculateMultiplier(
                              b.bidMinutes,
                              currentRound || b.round || 1,
                              config?.baseTime || 120,
                              config?.minBid || 30
                            );
                            const boost = calculateBoostPercentage(m);

                            return (
                              <tr
                                key={b.teamId}
                                className={`transition-colors ${
                                  isWinning
                                    ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                                    : 'hover:bg-surface-50/50'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-bold">
                                  <span
                                    className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                                      isWinning
                                        ? 'bg-emerald-500 text-slate-950 font-black'
                                        : 'bg-surface-100 text-slate-400'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-white">
                                  {teamName}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="font-bold text-[#D4AF37]">
                                    {b.bidMinutes}m
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-brand-cyan font-bold">
                                  {m.toFixed(3)}x
                                </td>
                                <td className="py-2.5 px-3 text-center text-emerald-400">
                                  +{boost.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isWinning ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                                      {gameStatus === 'round_ended' ? 'Selected' : `Qualifying (Top ${slots})`}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-surface-100 text-slate-400 border border-surface-border">
                                      Cutoff
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                                  {b.submittedAt
                                    ? new Date(b.submittedAt).toLocaleTimeString()
                                    : 'Just now'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* If Last Winners Exist & No Active Bids */}
                {lastWinners && lastWinners.length > 0 && bids.length === 0 && (
                  <div className="pt-3 border-t border-surface-border">
                    <span className="text-[11px] text-slate-400 font-bold uppercase block mb-2">
                      Winners of Previous Prompt:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {lastWinners.map((w, i) => (
                        <div
                          key={w.teamId}
                          className="p-2.5 rounded-lg bg-surface-200 border border-emerald-500/30 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="font-bold text-white">{w.teamName}</span>
                          </div>
                          <span className="text-[#D4AF37] font-bold">
                            {w.bidMinutes}m ({Number(w.multiplier).toFixed(3)}x)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* VIEW B: ROUND BIDS LIST (No statistics, clean list of placed bids & selection status) */}
          {typeof controlsView === 'number' && (
            <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm uppercase">
                      Round {controlsView} Bids {controlsView === 1 ? '(k = 1.0)' : '(k = 0.7)'}
                    </h3>
                    {currentRound === controlsView && isPromptRunning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {controlsView === 1
                      ? 'Primary Round: All bids placed across all prompts'
                      : 'Second Chance Round: Bids placed by remaining unassigned teams'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded bg-surface-200 text-slate-300 border border-surface-border font-bold">
                    {selectedRoundBids.length} {selectedRoundBids.length === 1 ? 'Bid' : 'Bids'} Placed
                  </span>

                  <button
                    onClick={() => handleRerunRound(controlsView)}
                    disabled={loading || currentRound === 0 || controlsView > currentRound}
                    className="py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title={
                      currentRound === 0
                        ? 'No round has been started yet'
                        : controlsView > currentRound
                        ? `Round ${controlsView} has not been started yet`
                        : `Rerun Round ${controlsView} (resets bids and assignments for this round)`
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rerun Round {controlsView}</span>
                  </button>
                </div>
              </div>

              {selectedRoundBids.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 mx-auto opacity-30 mb-1" />
                  <p className="font-bold text-slate-300 text-sm">No bids placed for Round {controlsView}</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Bids will appear here once teams place their bids during Round {controlsView}.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-surface-border overflow-hidden bg-surface-200/50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-surface-200 text-slate-400 border-b border-surface-border uppercase">
                        <tr>
                          <th className="py-2.5 px-3 w-14">Rank</th>
                          <th className="py-2.5 px-3">Team</th>
                          <th className="py-2.5 px-3">Problem / Prompt</th>
                          <th className="py-2.5 px-3 text-center">Bid Time</th>
                          <th className="py-2.5 px-3 text-center">Multiplier</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {selectedRoundBids.map((b, idx) => {
                          const teamName =
                            b.teamName ||
                            teams.find((t) => t.id === b.teamId)?.teamName ||
                            `Team #${b.teamId}`;
                          const isSelected = Boolean(
                            b.isAssigned ||
                            (currentRound === controlsView && isPromptRunning && b.promptId === currentPrompt?.id &&
                              bids.some((liveBid, liveIndex) => liveBid.teamId === b.teamId && liveIndex < availableSlots))
                          );
                          const storedMultiplier = teams.find((team) => team.id === b.teamId && team.assignment?.promptId === b.promptId)?.assignment?.multiplier;
                          const m = storedMultiplier ?? calculateMultiplier(
                            b.bidMinutes,
                            controlsView,
                            config?.baseTime || 120,
                            config?.minBid || 30
                          );
                          const boost = calculateBoostPercentage(Number(m));

                          return (
                            <tr
                              key={`${b.teamId}-${idx}`}
                              className={`transition-colors ${
                                isSelected ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-surface-50/50'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold">
                                <span
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                                    isSelected
                                      ? 'bg-emerald-500 text-slate-950 font-black'
                                      : 'bg-surface-100 text-slate-400'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                {teamName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">
                                {b.promptTitle || b.prompt?.title || '--'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold text-[#D4AF37]">
                                {b.bidMinutes}m
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="text-brand-cyan font-bold">{Number(m).toFixed(3)}x</span>
                                <span className="text-slate-400 text-[10px] ml-1">(+{boost.toFixed(0)}%)</span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Selected</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] bg-surface-100 text-slate-400 border border-surface-border">
                                    Not Selected
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                                {b.submittedAt ? new Date(b.submittedAt).toLocaleTimeString() : 'Logged'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEAMS */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-white uppercase">Teams Registered</span>
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-950 font-mono font-bold text-xs rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Team</span>
            </button>
          </div>

          <div className="rounded-xl border border-surface-border overflow-hidden bg-surface-100">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-200 text-slate-400 border-b border-surface-border uppercase">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Team Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assignment</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-50/50">
                    <td className="py-2.5 px-3 text-slate-500">#{t.id}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{t.teamName}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        t.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {t.assignment ? `${t.assignment.bidMinutes}m (${Number(t.assignment.multiplier).toFixed(3)}x)` : 'Unassigned'}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => {
                          setEditingTeam(t);
                          setEditTeamName(t.teamName);
                          setEditTeamPass('');
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="Edit team"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleTeam(t.id)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="Toggle active"
                      >
                        {t.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id, t.teamName)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400"
                        title="Delete team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROMPTS */}
      {activeTab === 'prompts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-white uppercase">Problem Statements</span>
            <button
              onClick={() => setShowAddPromptModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-950 font-mono font-bold text-xs rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Prompt</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {prompts.map((p) => (
              <div key={p.id} className="p-4 rounded-xl bg-surface-100 border border-surface-border space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold">Order #{p.displayOrder}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingPrompt(p);
                        setEditPromptTitle(p.title);
                        setEditPromptDesc(p.description);
                        setEditPromptOrder(p.displayOrder);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Edit prompt"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(p.id, p.title)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                      title="Delete prompt"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="font-mono font-bold text-white text-sm">{p.title}</h4>
                <p className="text-xs text-slate-300 font-sans line-clamp-3 leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: JUDGING */}
      {activeTab === 'judging' && (
        <div className="space-y-4">
          <span className="font-mono text-xs font-bold text-white uppercase block">
            Judge Score Entry
          </span>

          <div className="rounded-xl border border-surface-border overflow-hidden bg-surface-100">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-200 text-slate-400 border-b border-surface-border uppercase">
                <tr>
                  <th className="py-2.5 px-3">Team</th>
                  <th className="py-2.5 px-3">Assigned Problem</th>
                  <th className="py-2.5 px-3 text-center">Multiplier</th>
                  <th className="py-2.5 px-3">Judge Score (0-100)</th>
                  <th className="py-2.5 px-3 text-center">Final Score</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {leaderboard.map((team) => {
                  const m = team.multiplier ? Number(team.multiplier) : 1.0;
                  const currentScore = judgeScores[team.teamId] ?? team.judgeScore ?? 0;
                  const final = calculateFinalScore(currentScore, m);

                  return (
                    <tr key={team.teamId} className="hover:bg-surface-50/50">
                      <td className="py-2.5 px-3 font-bold text-white">{team.teamName}</td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">
                        {team.prompt?.title || <span className="text-slate-500 italic">None</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center text-brand-cyan">
                        {team.multiplier ? `${Number(team.multiplier).toFixed(3)}x` : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={judgeScores[team.teamId] ?? ''}
                          onChange={(e) =>
                            setJudgeScores({
                              ...judgeScores,
                              [team.teamId]: Number(e.target.value)
                            })
                          }
                          placeholder="85"
                          className="w-20 px-2 py-1 bg-surface-200 border border-surface-border rounded text-white text-xs font-mono focus:outline-none focus:border-slate-400"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {final > 0 ? final.toFixed(2) : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleSubmitScore(team.teamId)}
                          disabled={!team.prompt}
                          className="px-2.5 py-1 rounded bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs uppercase disabled:opacity-40"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CONFIG */}
      {activeTab === 'config' && config && (
        <form onSubmit={handleSaveConfig} className="max-w-md p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4 font-mono text-xs">
          <span className="font-bold text-white uppercase block">Parameters</span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Base Time (mins)</label>
              <input
                type="number"
                value={config.baseTime}
                onChange={(e) => setConfig({ ...config, baseTime: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Min Bid (mins)</label>
              <input
                type="number"
                value={config.minBid}
                onChange={(e) => setConfig({ ...config, minBid: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Slots / Prompt</label>
              <input
                type="number"
                value={config.slotsPerPrompt}
                onChange={(e) => setConfig({ ...config, slotsPerPrompt: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Duration (sec)</label>
              <input
                type="number"
                value={config.bidDurationSeconds}
                onChange={(e) => setConfig({ ...config, bidDurationSeconds: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-white hover:bg-slate-200 text-slate-950 font-bold uppercase rounded transition-colors"
          >
            Save Settings
          </button>
        </form>
      )}

      {/* TAB 6: RESET */}
      {activeTab === 'reset' && (
        <div className="max-w-md p-5 rounded-xl bg-surface-100 border border-rose-500/30 space-y-4 font-mono text-xs">
          <span className="font-bold text-rose-400 uppercase block">Game Reset</span>
          <p className="text-slate-400 leading-relaxed">
            Resets game status to <strong>waiting</strong>, stops active timers, and wipes bids, assignments, and scores.
          </p>

          <div className="space-y-2 pt-1 text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wipeTeams}
                onChange={(e) => setWipeTeams(e.target.checked)}
                className="accent-rose-500"
              />
              <span>Also delete teams</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wipePrompts}
                onChange={(e) => setWipePrompts(e.target.checked)}
                className="accent-rose-500"
              />
              <span>Also delete prompts</span>
            </label>
          </div>

          <button
            onClick={handleNuclearReset}
            className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase rounded transition-colors"
          >
            Execute Reset
          </button>
        </div>
      )}

      {/* TAB 7: SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-6 font-mono text-xs">
          {/* Coding Control Bar */}
          <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="flex items-center gap-2.5">
                <FolderGit2 className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="text-white font-bold text-sm tracking-wider uppercase">Project Submissions & Coding Timers</h3>
                  <p className="text-slate-400 text-[11px]">
                    Manage the live coding phase countdowns and verify GitHub repository submissions per team.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    codingState.isPaused
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : codingState.isStarted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-surface-200 text-slate-400 border border-surface-border'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      codingState.isPaused
                        ? 'bg-amber-400'
                        : codingState.isStarted
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-slate-500'
                    }`}
                  />
                  {codingState.isPaused
                    ? 'Coding Paused'
                    : codingState.isStarted
                    ? 'Coding In Progress'
                    : 'Coding Not Started'}
                </span>
                <button
                  onClick={fetchSubmissions}
                  className="p-1.5 bg-surface-200 hover:bg-surface-50 text-slate-300 rounded border border-surface-border transition-colors"
                  title="Refresh Submissions"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-surface-200/60 border border-surface-border">
                <span className="text-slate-500 block text-[10px] uppercase">Assigned Teams</span>
                <span className="text-base font-bold text-white">
                  {submissions.filter((s) => s.assignment !== null).length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-200/60 border border-surface-border">
                <span className="text-slate-500 block text-[10px] uppercase">Submissions Received</span>
                <span className="text-base font-bold text-emerald-400">
                  {submissions.filter((s) => s.isSubmitted).length} / {submissions.filter((s) => s.assignment !== null).length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-200/60 border border-surface-border">
                <span className="text-slate-500 block text-[10px] uppercase">Pending Submissions</span>
                <span className="text-base font-bold text-amber-400">
                  {submissions.filter((s) => s.assignment !== null && !s.isSubmitted).length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-200/60 border border-surface-border">
                <span className="text-slate-500 block text-[10px] uppercase">Phase Status</span>
                <span className="text-base font-bold text-slate-200">
                  {codingState.isPaused ? 'Paused' : codingState.isStarted ? 'Live' : 'Ready'}
                </span>
              </div>
            </div>

            {/* Timer Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-border">
              <button
                onClick={handleStartCoding}
                disabled={loadingCoding}
                className="py-2.5 px-5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{codingState.isStarted ? 'Restart Coding Timers' : 'Start Coding Timers'}</span>
              </button>

              {codingState.isStarted && (
                <>
                  {codingState.isPaused ? (
                    <button
                      onClick={handleResumeCoding}
                      disabled={loadingCoding}
                      className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume Timers</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseCoding}
                      disabled={loadingCoding}
                      className="py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause Timers</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleResetCoding(false)}
                    disabled={loadingCoding}
                    className="py-2.5 px-4 rounded-lg bg-surface-200 hover:bg-surface-50 text-slate-300 border border-surface-border font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Timers</span>
                  </button>
                  <button
                    onClick={() => handleResetCoding(true)}
                    disabled={loadingCoding}
                    className="py-2.5 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-50 ml-auto"
                    title="Reset timers and wipe all submitted GitHub URLs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe Submissions</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Submissions Table Card */}
          <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-white" />
                <span className="font-bold text-white uppercase text-sm">Teams & Submission Details</span>
                <span className="text-slate-400 text-xs">({submissions.length} teams registered)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter team / prompt..."
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  className="px-2.5 py-1 bg-surface-200 border border-surface-border rounded text-white text-xs w-full sm:w-48 placeholder-slate-500"
                />
                <select
                  value={submissionFilter}
                  onChange={(e) => setSubmissionFilter(e.target.value as any)}
                  className="px-2.5 py-1 bg-surface-200 border border-surface-border rounded text-white text-xs"
                >
                  <option value="all">All Teams</option>
                  <option value="submitted">Submitted Only</option>
                  <option value="pending">Pending Only</option>
                  <option value="expired">Expired Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-surface-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-200/70 border-b border-surface-border text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Assigned Problem</th>
                    <th className="py-2.5 px-3 text-center">Committed Time</th>
                    <th className="py-2.5 px-3 text-center">Countdown / Deadline</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">GitHub Project URL</th>
                    <th className="py-2.5 px-3 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No teams available. Create teams and run bidding to assign problems.
                      </td>
                    </tr>
                  ) : (
                    submissions
                      .filter((item) => {
                        if (submissionSearch) {
                          const query = submissionSearch.toLowerCase();
                          const matchesTeam = item.teamName.toLowerCase().includes(query);
                          const matchesPrompt = item.assignment?.promptTitle?.toLowerCase().includes(query);
                          if (!matchesTeam && !matchesPrompt) return false;
                        }
                        if (submissionFilter === 'submitted') return item.isSubmitted;
                        if (submissionFilter === 'pending') return !item.isSubmitted;
                        if (submissionFilter === 'expired') {
                          if (!codingState.startTime || !item.assignment) return false;
                          const deadline = codingState.startTime + item.assignment.bidMinutes * 60 * 1000;
                          return currentTime > deadline;
                        }
                        return true;
                      })
                      .map((item) => {
                        let remainingSecs = 0;
                        let isExpired = false;
                        let deadlineFormatted = '';

                        if (codingState.startTime && item.assignment) {
                          const deadline = codingState.startTime + item.assignment.bidMinutes * 60 * 1000;
                          deadlineFormatted = new Date(deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                          const diff = Math.ceil((deadline - currentTime) / 1000);
                          remainingSecs = Math.max(0, diff);
                          isExpired = currentTime > deadline;
                        }

                        const formatRemaining = (seconds: number) => {
                          if (!codingState.startTime) return 'NOT STARTED';
                          if (codingState.isPaused) return 'PAUSED';
                          if (seconds <= 0) return 'EXPIRED';
                          const h = Math.floor(seconds / 3600);
                          const m = Math.floor((seconds % 3600) / 60);
                          const s = seconds % 60;
                          if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
                          return `${m}m ${s.toString().padStart(2, '0')}s`;
                        };

                        return (
                          <tr key={item.teamId} className="hover:bg-surface-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-white">
                              <div className="flex items-center gap-1.5">
                                <span>{item.teamName}</span>
                                <span className="text-[10px] text-slate-500 font-normal">#{item.teamId}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {item.assignment ? (
                                <div>
                                  <span className="text-slate-200 font-medium block">
                                    {item.assignment.promptTitle || `Prompt #${item.assignment.promptId}`}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    Round {item.assignment.round} • Multiplier: {item.assignment.multiplier.toFixed(3)}x
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">No prompt assigned</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.assignment ? (
                                <span className="px-2 py-0.5 rounded bg-surface-200 text-amber-400 font-bold">
                                  {item.assignment.bidMinutes} mins
                                </span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {item.assignment ? (
                                !codingState.startTime ? (
                                  <span className="text-slate-500">Timer not started</span>
                                ) : isExpired ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                                    EXPIRED
                                  </span>
                                ) : (
                                  <div>
                                    <span
                                      className={`font-bold ${
                                        remainingSecs < 600
                                          ? 'text-amber-400 animate-pulse'
                                          : 'text-emerald-400'
                                      }`}
                                    >
                                      {formatRemaining(remainingSecs)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 block">
                                      Due by {deadlineFormatted}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.isSubmitted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{item.isLate ? 'Late' : 'Submitted'}</span>
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                                  <span>Missed</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-200 text-slate-400 text-[10px]">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              {item.submission?.githubUrl ? (
                                <a
                                  href={item.submission.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline font-bold max-w-[200px] truncate"
                                  title={item.submission.githubUrl}
                                >
                                  <Github className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{item.submission.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                                </a>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                              {item.submission?.submittedAt ? (
                                new Date(item.submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD TEAM MODAL */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-xs bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4 font-mono text-xs">
            <h3 className="font-bold text-white text-sm">Add Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Alpha"
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newTeamPass}
                  onChange={(e) => setNewTeamPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-3 py-1 bg-surface-200 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-white text-slate-950 font-bold rounded"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PROMPT MODAL */}
      {showAddPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-sm bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4 font-mono text-xs">
            <h3 className="font-bold text-white text-sm">Add Problem Statement</h3>
            <form onSubmit={handleCreatePrompt} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  placeholder="Shortest Path Optimization"
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={newPromptDesc}
                  onChange={(e) => setNewPromptDesc(e.target.value)}
                  placeholder="Problem details..."
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white font-sans text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={newPromptOrder}
                  onChange={(e) => setNewPromptOrder(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddPromptModal(false)}
                  className="px-3 py-1 bg-surface-200 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-white text-slate-950 font-bold rounded"
                >
                  Add Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-xs bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4 font-mono text-xs">
            <h3 className="font-bold text-white text-sm">Edit Team #{editingTeam.id}</h3>
            <form onSubmit={handleUpdateTeam} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">New Password (leave blank to keep)</label>
                <input
                  type="password"
                  value={editTeamPass}
                  onChange={(e) => setEditTeamPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-3 py-1 bg-surface-200 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-white text-slate-950 font-bold rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROMPT MODAL */}
      {editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-sm bg-surface-100 border border-surface-border rounded-xl p-5 space-y-4 font-mono text-xs">
            <h3 className="font-bold text-white text-sm">Edit Problem Statement</h3>
            <form onSubmit={handleUpdatePrompt} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editPromptTitle}
                  onChange={(e) => setEditPromptTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={editPromptDesc}
                  onChange={(e) => setEditPromptDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white font-sans text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={editPromptOrder}
                  onChange={(e) => setEditPromptOrder(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-surface-200 border border-surface-border rounded text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingPrompt(null)}
                  className="px-3 py-1 bg-surface-200 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-white text-slate-950 font-bold rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
