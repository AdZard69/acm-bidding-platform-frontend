import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Play,
  Pause,
  FastForward,
  Plus,
  Trash2,
  Edit,
  Clock,
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
  Power,
  Zap
} from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { Team, Prompt, GameConfig, LeaderboardEntry, Score } from '../types';
import { calculateMultiplier, calculateFinalScore } from '../utils/multiplier';

type AdminTab = 'controls' | 'teams' | 'prompts' | 'judging' | 'config' | 'reset';

export const AdminPage: React.FC = () => {
  const {
    gameStatus,
    currentRound,
    currentPrompt,
    secondsRemaining,
    adminStartRound,
    adminPause,
    adminResume,
    adminExtend,
    adminNextPrompt,
    adminEndRound
  } = useSocket();

  const [activeTab, setActiveTab] = useState<AdminTab>('controls');
  const [loading, setLoading] = useState<boolean>(false);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Modals & form states
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPass, setNewTeamPass] = useState('');

  const [showAddPromptModal, setShowAddPromptModal] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptDesc, setNewPromptDesc] = useState('');
  const [newPromptOrder, setNewPromptOrder] = useState<number>(1);

  const [extendSeconds, setExtendSeconds] = useState<number>(30);
  const [judgeScores, setJudgeScores] = useState<Record<number, number>>({});

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [wipeTeams, setWipeTeams] = useState(false);
  const [wipePrompts, setWipePrompts] = useState(false);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setBannerMsg({ type, text });
    setTimeout(() => setBannerMsg(null), 4000);
  };

  // Fetch initial admin data
  const fetchData = async () => {
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
        // Preset judge scores map
        const scoreMap: Record<number, number> = {};
        leadRes.value.leaderboard.forEach((e) => {
          if (e.judgeScore !== null && e.judgeScore !== undefined) {
            scoreMap[e.teamId] = e.judgeScore;
          }
        });
        setJudgeScores(scoreMap);
      }
    } catch (err: unknown) {
      showNotification('error', 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Round Control Actions ---

  const handleStartRound = async (roundNum?: number) => {
    try {
      const res = await api.startRound(roundNum);
      if (res.success) {
        showNotification('success', `Round ${res.round} started successfully!`);
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting round';
      showNotification('error', msg);
    }
  };

  const handlePause = async () => {
    try {
      const res = await api.pauseRound();
      if (res.success) {
        showNotification('success', 'Bidding paused');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error pausing';
      showNotification('error', msg);
    }
  };

  const handleResume = async () => {
    try {
      const res = await api.resumeRound();
      if (res.success) {
        showNotification('success', 'Bidding resumed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resuming';
      showNotification('error', msg);
    }
  };

  const handleExtend = async (seconds: number) => {
    try {
      const res = await api.extendRound(seconds);
      if (res.success) {
        showNotification('success', `Timer extended by ${seconds}s`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error extending timer';
      showNotification('error', msg);
    }
  };

  const handleNextPrompt = async () => {
    if (!window.confirm('Force advance to next prompt? This will evaluate current bids.')) return;
    try {
      const res = await api.nextPrompt();
      if (res.success) {
        showNotification('success', res.message || 'Advanced to next prompt');
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error advancing prompt';
      showNotification('error', msg);
    }
  };

  const handleEndRound = async () => {
    if (!window.confirm('Force end the current round immediately?')) return;
    try {
      const res = await api.endRound();
      if (res.success) {
        showNotification('success', 'Round ended');
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error ending round';
      showNotification('error', msg);
    }
  };

  // --- Team Actions ---

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createTeam(newTeamName.trim(), newTeamPass);
      if (res.success) {
        showNotification('success', `Team "${res.team.teamName}" created`);
        setNewTeamName('');
        setNewTeamPass('');
        setShowAddTeamModal(false);
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating team';
      showNotification('error', msg);
    }
  };

  const handleToggleTeam = async (id: number) => {
    try {
      const res = await api.toggleTeam(id);
      if (res.success) {
        showNotification('success', `Team active status updated`);
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating team';
      showNotification('error', msg);
    }
  };

  const handleDeleteTeam = async (id: number, name: string) => {
    if (!window.confirm(`Delete team "${name}"? This removes their bids and score.`)) return;
    try {
      const res = await api.deleteTeam(id);
      if (res.success) {
        showNotification('success', 'Team removed');
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting team';
      showNotification('error', msg);
    }
  };

  // --- Prompt Actions ---

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPrompt(newPromptTitle.trim(), newPromptDesc.trim(), newPromptOrder);
      if (res.success) {
        showNotification('success', `Prompt created: "${res.prompt.title}"`);
        setNewPromptTitle('');
        setNewPromptDesc('');
        setNewPromptOrder(prompts.length + 1);
        setShowAddPromptModal(false);
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating prompt';
      showNotification('error', msg);
    }
  };

  const handleDeletePrompt = async (id: number, title: string) => {
    if (!window.confirm(`Delete prompt "${title}"?`)) return;
    try {
      const res = await api.deletePrompt(id);
      if (res.success) {
        showNotification('success', 'Prompt removed');
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting prompt';
      showNotification('error', msg);
    }
  };

  // --- Scoring Actions ---

  const handleSubmitScore = async (teamId: number) => {
    const scoreVal = judgeScores[teamId];
    if (scoreVal === undefined || isNaN(scoreVal) || scoreVal < 0 || scoreVal > 100) {
      showNotification('error', 'Judge score must be between 0 and 100');
      return;
    }
    try {
      const res = await api.submitScore(teamId, scoreVal);
      if (res.success) {
        showNotification('success', `Score submitted: ${res.score.finalScore} pts`);
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting score';
      showNotification('error', msg);
    }
  };

  // --- Config Actions ---

  const handleUpdateConfig = async (e: React.FormEvent) => {
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
        showNotification('success', 'Game configuration saved');
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving config';
      showNotification('error', msg);
    }
  };

  // --- Nuclear Reset ---

  const handleResetGame = async () => {
    if (!window.confirm('ARE YOU ABSOLUTELY SURE? This resets active round, bids, and scores!')) return;
    try {
      const res = await api.resetGame({
        wipeTeams,
        wipePrompts
      });
      if (res.success) {
        showNotification('success', 'Game reset successfully to waiting state');
        setShowResetModal(false);
        fetchData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resetting game';
      showNotification('error', msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">
                Game Master Room
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Live Auction Control • Team & Prompt Setup • Judge Scoring
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-200 hover:bg-surface-100 text-slate-300 border border-surface-border font-mono text-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync State</span>
        </button>
      </div>

      {/* Toast Notification Alert */}
      {bannerMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-surface-border pb-4 font-mono text-xs">
        {[
          { id: 'controls', label: 'Round Controls', icon: Play },
          { id: 'teams', label: `Teams (${teams.length})`, icon: Users },
          { id: 'prompts', label: `Prompts (${prompts.length})`, icon: FileCode },
          { id: 'judging', label: 'Judging & Scores', icon: Award },
          { id: 'config', label: 'Game Settings', icon: Settings },
          { id: 'reset', label: 'Nuclear Reset', icon: AlertTriangle }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                isSelected
                  ? 'bg-brand-purple text-slate-950 shadow-md shadow-brand-purple/20'
                  : 'bg-surface-200/60 hover:bg-surface-100 text-slate-300 border border-surface-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ROUND CONTROLS */}
      {activeTab === 'controls' && (
        <div className="space-y-6">
          {/* Live Status Bar */}
          <div className="p-6 rounded-2xl bg-surface-200/80 border border-surface-border grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Game Status</span>
              <span className="text-xl font-bold font-mono text-brand-cyan uppercase">
                {gameStatus}
              </span>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Current Round</span>
              <span className="text-xl font-bold font-mono text-brand-amber">
                {currentRound > 0 ? `Round ${currentRound}` : 'None'}
              </span>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Timer Remaining</span>
              <span className="text-xl font-bold font-mono text-white">
                {secondsRemaining}s
              </span>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">Active Prompt</span>
              <span className="text-sm font-bold font-mono text-slate-200 truncate block mt-0.5">
                {currentPrompt ? currentPrompt.title : 'None Active'}
              </span>
            </div>
          </div>

          {/* Action Control Panel */}
          <div className="p-6 rounded-2xl bg-surface-200/50 border border-surface-border space-y-6">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Bidding Master Operations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Start Round 1 / Round 2 */}
              <button
                onClick={() => handleStartRound(1)}
                disabled={gameStatus === 'bidding' || gameStatus === 'paused'}
                className="p-4 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-mono font-bold text-xs uppercase tracking-wide flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-brand-cyan/10"
              >
                <Play className="w-5 h-5" />
                <span>Start Round 1</span>
                <span className="text-[10px] font-normal opacity-80">All prompts & teams (k=1.0)</span>
              </button>

              <button
                onClick={() => handleStartRound(2)}
                disabled={gameStatus === 'bidding' || gameStatus === 'paused'}
                className="p-4 rounded-xl bg-brand-amber hover:bg-brand-amber/90 text-slate-950 font-mono font-bold text-xs uppercase tracking-wide flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-brand-amber/10"
              >
                <Play className="w-5 h-5" />
                <span>Start Round 2</span>
                <span className="text-[10px] font-normal opacity-80">Unassigned teams only (k=0.7)</span>
              </button>

              {/* Pause / Resume */}
              {gameStatus === 'paused' ? (
                <button
                  onClick={handleResume}
                  className="p-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wide flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
                >
                  <Play className="w-5 h-5" />
                  <span>Resume Timer</span>
                  <span className="text-[10px] font-normal opacity-80">Unfreeze countdown</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  disabled={gameStatus !== 'bidding'}
                  className="p-4 rounded-xl bg-surface-100 hover:bg-surface-50 text-amber-400 border border-amber-500/30 font-mono font-bold text-xs uppercase tracking-wide flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause Timer</span>
                  <span className="text-[10px] font-normal opacity-80">Freeze countdown</span>
                </button>
              )}
            </div>

            {/* Timer Extenders & Skip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-surface-border">
              {/* Extend time */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExtend(15)}
                  disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                  className="flex-1 py-3 px-3 bg-surface-300 hover:bg-surface-100 text-white font-mono text-xs font-bold rounded-xl border border-surface-border disabled:opacity-40"
                >
                  +15s
                </button>
                <button
                  onClick={() => handleExtend(30)}
                  disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                  className="flex-1 py-3 px-3 bg-surface-300 hover:bg-surface-100 text-white font-mono text-xs font-bold rounded-xl border border-surface-border disabled:opacity-40"
                >
                  +30s
                </button>
                <button
                  onClick={() => handleExtend(60)}
                  disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                  className="flex-1 py-3 px-3 bg-surface-300 hover:bg-surface-100 text-white font-mono text-xs font-bold rounded-xl border border-surface-border disabled:opacity-40"
                >
                  +60s
                </button>
              </div>

              {/* Force Next Prompt */}
              <button
                onClick={handleNextPrompt}
                disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                className="py-3 px-4 bg-surface-100 hover:bg-surface-50 text-brand-cyan border border-brand-cyan/30 font-mono font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <FastForward className="w-4 h-4" />
                <span>Next Prompt / Advance</span>
              </button>

              {/* End Round */}
              <button
                onClick={handleEndRound}
                disabled={gameStatus !== 'bidding' && gameStatus !== 'paused'}
                className="py-3 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Power className="w-4 h-4" />
                <span>Force End Round</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS MANAGEMENT */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-sm font-bold text-white uppercase">
              Participating Teams ({teams.length})
            </h3>
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-emerald hover:bg-brand-emerald/90 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Team</span>
            </button>
          </div>

          <div className="rounded-2xl border border-surface-border overflow-hidden bg-surface-200/60">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-300 text-slate-400 border-b border-surface-border uppercase">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Team Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Prompt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-100/50">
                    <td className="py-3 px-4 text-slate-400">#{t.id}</td>
                    <td className="py-3 px-4 font-bold text-white">{t.teamName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {t.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {t.assignment ? (
                        <span className="text-brand-cyan">
                          Assigned ({t.assignment.bidMinutes}m, {Number(t.assignment.multiplier).toFixed(3)}x)
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleTeam(t.id)}
                        className={`p-1.5 rounded-lg border text-xs ${
                          t.isActive
                            ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                            : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        }`}
                        title={t.isActive ? 'Deactivate Team' : 'Activate Team'}
                      >
                        {t.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(t.id, t.teamName)}
                        className="p-1.5 rounded-lg text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20"
                        title="Delete Team"
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

      {/* TAB 3: PROMPTS MANAGEMENT */}
      {activeTab === 'prompts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-sm font-bold text-white uppercase">
              Hackathon Problem Statements ({prompts.length})
            </h3>
            <button
              onClick={() => setShowAddPromptModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Prompt</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-surface-200/70 border border-surface-border flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                      ORDER #{p.displayOrder}
                    </span>
                    <button
                      onClick={() => handleDeletePrompt(p.id, p.title)}
                      className="p-1 rounded text-rose-400 hover:text-white"
                      title="Delete Prompt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-bold font-mono text-white text-base">{p.title}</h4>
                  <p className="text-xs text-slate-300 font-sans line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: JUDGING & SCORES */}
      {activeTab === 'judging' && (
        <div className="space-y-6">
          <h3 className="font-mono text-sm font-bold text-white uppercase">
            Judge Evaluation Console
          </h3>

          <div className="rounded-2xl border border-surface-border overflow-hidden bg-surface-200/60">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-surface-300 text-slate-400 border-b border-surface-border uppercase">
                <tr>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Assigned Problem</th>
                  <th className="py-3 px-4 text-center">Bid Time</th>
                  <th className="py-3 px-4 text-center">Multiplier</th>
                  <th className="py-3 px-4">Judge Score (0-100)</th>
                  <th className="py-3 px-4 text-center">Final Score</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {leaderboard.map((team) => {
                  const m = team.multiplier ? Number(team.multiplier) : 1.0;
                  const currentScore = judgeScores[team.teamId] ?? team.judgeScore ?? 0;
                  const calculatedFinal = calculateFinalScore(currentScore, m);

                  return (
                    <tr key={team.teamId} className="hover:bg-surface-100/50">
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {team.teamName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {team.prompt?.title || <span className="text-slate-500 italic">None</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {team.bidMinutes ? `${team.bidMinutes}m` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-brand-cyan">
                        {team.multiplier ? `${Number(team.multiplier).toFixed(3)}x` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
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
                          placeholder="e.g. 85"
                          className="w-24 px-2.5 py-1.5 bg-surface-300 border border-surface-border rounded-lg text-white font-mono text-xs focus:outline-none focus:border-brand-purple"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-brand-emerald text-sm">
                        {calculatedFinal > 0 ? calculatedFinal.toFixed(2) : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleSubmitScore(team.teamId)}
                          disabled={!team.prompt}
                          className="px-3 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-slate-950 font-bold text-xs uppercase disabled:opacity-40"
                        >
                          Submit
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

      {/* TAB 5: GAME CONFIG */}
      {activeTab === 'config' && config && (
        <form onSubmit={handleUpdateConfig} className="max-w-xl space-y-5 p-6 rounded-2xl bg-surface-200/60 border border-surface-border">
          <h3 className="font-mono text-sm font-bold text-white uppercase">
            Game Parameters & Timing
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Base Time (mins)</label>
              <input
                type="number"
                min={30}
                max={240}
                value={config.baseTime}
                onChange={(e) => setConfig({ ...config, baseTime: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Min Bid (mins)</label>
              <input
                type="number"
                min={10}
                max={config.baseTime}
                value={config.minBid}
                onChange={(e) => setConfig({ ...config, minBid: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Slots Per Prompt</label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.slotsPerPrompt}
                onChange={(e) => setConfig({ ...config, slotsPerPrompt: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Bid Countdown (sec)</label>
              <input
                type="number"
                min={10}
                max={300}
                value={config.bidDurationSeconds}
                onChange={(e) => setConfig({ ...config, bidDurationSeconds: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-bold font-mono text-xs uppercase"
          >
            Save Parameters
          </button>
        </form>
      )}

      {/* TAB 6: NUCLEAR RESET */}
      {activeTab === 'reset' && (
        <div className="max-w-xl p-6 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-6">
          <div className="flex items-center gap-2.5 text-rose-400 font-mono font-bold text-sm uppercase">
            <AlertTriangle className="w-5 h-5" />
            <span>Nuclear Reset Option</span>
          </div>

          <p className="text-xs font-mono text-slate-300 leading-relaxed">
            Resetting the game stops any running timer, resets the game status back to <strong>waiting</strong>, and wipes all placed bids, assignments, and judge scores.
          </p>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2.5 text-xs font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wipeTeams}
                onChange={(e) => setWipeTeams(e.target.checked)}
                className="rounded accent-rose-500"
              />
              <span>Also delete all teams</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wipePrompts}
                onChange={(e) => setWipePrompts(e.target.checked)}
                className="rounded accent-rose-500"
              />
              <span>Also delete all problem statements (prompts)</span>
            </label>
          </div>

          <button
            onClick={handleResetGame}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-rose-600/20"
          >
            EXECUTE NUCLEAR RESET
          </button>
        </div>
      )}

      {/* CREATE TEAM MODAL */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-100 border border-surface-border rounded-2xl p-6 space-y-4">
            <h3 className="font-mono text-base font-bold text-white">Create New Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. CodeTitans"
                  className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white text-xs font-mono focus:outline-none focus:border-brand-emerald"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Password (min 4 chars)</label>
                <input
                  type="password"
                  required
                  value={newTeamPass}
                  onChange={(e) => setNewTeamPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white text-xs font-mono focus:outline-none focus:border-brand-emerald"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 bg-surface-200 text-slate-300 text-xs font-mono rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-emerald text-slate-950 font-bold text-xs font-mono rounded-xl"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROMPT MODAL */}
      {showAddPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-surface-100 border border-surface-border rounded-2xl p-6 space-y-4">
            <h3 className="font-mono text-base font-bold text-white">Add Problem Statement</h3>
            <form onSubmit={handleCreatePrompt} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Title (max 100 chars)</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus Engine"
                  className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white text-xs font-mono focus:outline-none focus:border-brand-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Description / Spec</label>
                <textarea
                  required
                  rows={4}
                  value={newPromptDesc}
                  onChange={(e) => setNewPromptDesc(e.target.value)}
                  placeholder="Problem details, edge cases, input/output requirements..."
                  className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white text-xs font-sans focus:outline-none focus:border-brand-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={newPromptOrder}
                  onChange={(e) => setNewPromptOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-xl text-white text-xs font-mono focus:outline-none focus:border-brand-cyan"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPromptModal(false)}
                  className="px-4 py-2 bg-surface-200 text-slate-300 text-xs font-mono rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-cyan text-slate-950 font-bold text-xs font-mono rounded-xl"
                >
                  Add Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
