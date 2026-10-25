import React, { useState, useEffect, useCallback } from 'react';
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
  Power
} from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { Team, Prompt, GameConfig, LeaderboardEntry } from '../types';
import { calculateFinalScore } from '../utils/multiplier';

type AdminTab = 'controls' | 'teams' | 'prompts' | 'judging' | 'config' | 'reset';

export const AdminPage: React.FC = () => {
  const {
    gameStatus,
    currentRound,
    currentPrompt,
    secondsRemaining,
    refreshState
  } = useSocket();

  const [activeTab, setActiveTab] = useState<AdminTab>('controls');
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

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

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, promptsRes, configRes, leadRes] = await Promise.allSettled([
        api.listTeams(),
        api.listPrompts(),
        api.getConfig(),
        api.getLeaderboard()
      ]);

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
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Round operations
  const handleStartRound = async (roundNum?: number) => {
    try {
      const res = await api.startRound(roundNum);
      if (res.success) {
        showMsg('success', `Round ${res.round} started`);
        fetchAdminData();
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to start round');
    }
  };

  const handlePause = async () => {
    try {
      const res = await api.pauseRound();
      if (res.success) {
        showMsg('success', 'Round paused');
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const handleResume = async () => {
    try {
      const res = await api.resumeRound();
      if (res.success) {
        showMsg('success', 'Round resumed');
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  const handleExtend = async (seconds: number) => {
    try {
      const res = await api.extendRound(seconds);
      if (res.success) {
        showMsg('success', `Extended by ${seconds}s`);
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to extend');
    }
  };

  const handleNextPrompt = async () => {
    if (!window.confirm('Force advance to next prompt? This awards the winning bids.')) return;
    try {
      const res = await api.nextPrompt();
      if (res.success) {
        showMsg('success', res.message || 'Advanced to next prompt');
        fetchAdminData();
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to advance prompt');
    }
  };

  const handleEndRound = async () => {
    if (!window.confirm('Force end the round?')) return;
    try {
      const res = await api.endRound();
      if (res.success) {
        showMsg('success', 'Round ended');
        fetchAdminData();
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Failed to end round');
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
        fetchAdminData();
        refreshState();
      }
    } catch (err: unknown) {
      showMsg('error', err instanceof Error ? err.message : 'Error resetting game');
    }
  };

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
          { id: 'reset', label: 'Reset', icon: AlertTriangle }
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
          {/* Status Row */}
          <div className="p-4 rounded-xl bg-surface-100 border border-surface-border grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div>
              <span className="text-slate-500 block">GAME STATUS</span>
              <span className="text-base font-bold text-white uppercase">{gameStatus}</span>
            </div>
            <div>
              <span className="text-slate-500 block">ROUND</span>
              <span className="text-base font-bold text-white">{currentRound > 0 ? `Round ${currentRound}` : 'None'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">TIME LEFT</span>
              <span className="text-base font-bold text-[#D4AF37]">{secondsRemaining}s</span>
            </div>
            <div>
              <span className="text-slate-500 block">ACTIVE PROMPT</span>
              <span className="text-base font-bold text-slate-200 truncate block">
                {currentPrompt ? currentPrompt.title : 'None'}
              </span>
            </div>
          </div>

          {/* Operational Buttons */}
          <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-4 font-mono text-xs">
            <span className="font-bold text-white uppercase block">Auction Actions</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleStartRound(1)}
                disabled={gameStatus === 'bidding' || gameStatus === 'paused'}
                className="py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] font-bold uppercase transition-colors disabled:opacity-40"
              >
                Start Round 1
              </button>

              <button
                onClick={() => handleStartRound(2)}
                disabled={gameStatus === 'bidding' || gameStatus === 'paused'}
                className="py-2.5 px-4 rounded-lg bg-surface-50 hover:bg-surface-200 text-[#E5C158] border border-[#D4AF37]/30 font-bold uppercase transition-colors disabled:opacity-40"
              >
                Start Round 2
              </button>

              {gameStatus === 'paused' ? (
                <button
                  onClick={handleResume}
                  className="py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold uppercase transition-colors"
                >
                  Resume Timer
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  disabled={gameStatus !== 'bidding'}
                  className="py-2.5 px-4 rounded-lg bg-surface-50 hover:bg-surface-200 text-slate-300 border border-surface-border font-bold uppercase transition-colors disabled:opacity-40"
                >
                  Pause Timer
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-surface-border">
              {/* Extend time */}
              <div className="flex gap-1.5">
                {[15, 30, 60].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleExtend(s)}
                    disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                    className="flex-1 py-2 bg-surface-200 hover:bg-surface-50 text-slate-300 border border-surface-border rounded-lg disabled:opacity-40"
                  >
                    +{s}s
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextPrompt}
                disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                className="py-2 px-4 rounded-lg bg-surface-200 hover:bg-surface-50 text-slate-300 border border-surface-border font-bold uppercase transition-colors disabled:opacity-40"
              >
                Force Next Prompt
              </button>

              <button
                onClick={handleEndRound}
                disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                className="py-2 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase transition-colors disabled:opacity-40"
              >
                End Current Round
              </button>
            </div>
          </div>
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
