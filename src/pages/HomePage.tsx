import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tv,
  Users,
  Trophy,
  ShieldCheck,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const HomePage: React.FC = () => {
  const { gameStatus, currentRound, secondsRemaining, currentPrompt } = useSocket();
  const { isAuthenticated, user } = useAuth();
  const [backendHealth, setBackendHealth] = useState<'checking' | 'ok' | 'down'>('checking');

  useEffect(() => {
    api.checkHealth()
      .then((res) => {
        if (res.success) setBackendHealth('ok');
        else setBackendHealth('down');
      })
      .catch(() => setBackendHealth('down'));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Platform Title */}
      <div className="space-y-2 border-b border-surface-border pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
            Bid & Code Platform
          </h1>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              backendHealth === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            API: {backendHealth.toUpperCase()}
          </span>
        </div>
        <p className="text-xs font-mono text-slate-400">
          Hackathon auction platform where teams bid on coding time commitments.
        </p>
      </div>

      {/* Live Event Status Card */}
      <div className="p-5 rounded-xl bg-surface-100 border border-surface-border space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 border-b border-surface-border pb-3">
          <span className="uppercase font-semibold">Event Status</span>
          <span className="flex items-center gap-1.5 text-white">
            <span
              className={`w-2 h-2 rounded-full ${
                gameStatus === 'bidding' ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'
              }`}
            />
            <strong className="uppercase">{gameStatus}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div>
            <span className="text-slate-500 block">ROUND</span>
            <span className="text-sm font-bold text-white">
              {currentRound > 0 ? `Round ${currentRound}` : 'None'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">TIMER</span>
            <span className="text-sm font-bold text-brand-cyan">
              {secondsRemaining}s
            </span>
          </div>

          <div className="col-span-2">
            <span className="text-slate-500 block">ACTIVE PROMPT</span>
            <span className="text-sm font-bold text-slate-200 truncate block">
              {currentPrompt ? currentPrompt.title : 'None active'}
            </span>
          </div>
        </div>
      </div>

      {/* Direct Functional Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Arena */}
        <Link
          to="/arena"
          className="p-5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-surface-border transition-colors flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-brand-cyan font-bold uppercase tracking-wider">
                Display
              </span>
              <Tv className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-mono font-bold text-white text-base">Projector Arena</h3>
            <p className="text-xs text-slate-400 font-sans">
              Big screen display for the auditorium with countdown timer, active prompt, and live auction board.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300 group-hover:text-white">
            <span>Open Arena</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Team Portal */}
        <Link
          to={isAuthenticated && user?.role === 'team' ? '/team' : '/login'}
          className="p-5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-surface-border transition-colors flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-brand-emerald font-bold uppercase tracking-wider">
                Teams
              </span>
              <Users className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-mono font-bold text-white text-base">Team Portal</h3>
            <p className="text-xs text-slate-400 font-sans">
              Place time bids during live prompt windows, avoid duplicate collisions, and view awarded problem specs.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300 group-hover:text-white">
            <span>{isAuthenticated && user?.role === 'team' ? 'Go to Team Portal' : 'Team Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Leaderboard */}
        <Link
          to="/leaderboard"
          className="p-5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-surface-border transition-colors flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-brand-amber font-bold uppercase tracking-wider">
                Standings
              </span>
              <Trophy className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-mono font-bold text-white text-base">Public Leaderboard</h3>
            <p className="text-xs text-slate-400 font-sans">
              Standings showing team bids, locked multipliers, judge evaluations, and multiplied scores.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300 group-hover:text-white">
            <span>View Standings</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Admin */}
        <Link
          to={isAuthenticated && user?.role === 'admin' ? '/admin' : '/login'}
          className="p-5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-surface-border transition-colors flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-brand-purple font-bold uppercase tracking-wider">
                Organizers
              </span>
              <ShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-mono font-bold text-white text-base">Admin Room</h3>
            <p className="text-xs text-slate-400 font-sans">
              Round execution (start, pause, extend, next prompt), team/prompt setup, judge score submission, and reset.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300 group-hover:text-white">
            <span>{isAuthenticated && user?.role === 'admin' ? 'Open Admin Room' : 'Admin Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Rules Summary */}
      <div className="p-5 rounded-xl border border-surface-border bg-surface-200/40 font-mono text-xs space-y-2 text-slate-400">
        <span className="font-bold text-white uppercase block">Rules Reference:</span>
        <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
          <li>Min Bid: <strong>30 minutes</strong> • Max Bid / Base Time: <strong>120 minutes</strong></li>
          <li>Multiplier Formula: <code className="text-slate-300">multiplier = e^(k * (1 - bid / 120))</code> (k=1.0 for Round 1, k=0.7 for Round 2)</li>
          <li>Top 3 lowest bidders win slots for that prompt and lock in their multiplier.</li>
          <li>Final Score = <code className="text-slate-300">Judge Score (0-100) × Multiplier</code></li>
        </ul>
      </div>
    </div>
  );
};
