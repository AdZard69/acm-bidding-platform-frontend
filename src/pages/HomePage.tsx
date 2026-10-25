import React from 'react';
import { Link } from 'react-router-dom';
import {
  Tv,
  Users,
  Trophy,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { gameStatus, currentRound, secondsRemaining, currentPrompt } = useSocket();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Platform Title */}
      <div className="space-y-1.5 border-b border-surface-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
          Bid & Code Platform
        </h1>
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

        {/* Team Portal - only visible to guests and logged-in teams */}
        {(!isAuthenticated || user?.role === 'team') && (
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
        )}

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
              Standings showing team bids, multipliers, judge evaluations, and final scores.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300 group-hover:text-white">
            <span>View Standings</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Admin Room - only visible to authenticated admins */}
        {isAuthenticated && user?.role === 'admin' && (
          <Link
            to="/admin"
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
              <span>Open Admin Room</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        )}
      </div>

      {/* Auction Rules Overview */}
      <div className="p-4 rounded-xl border border-surface-border bg-surface-200/40 font-mono text-xs space-y-1.5 text-slate-400">
        <span className="font-bold text-white uppercase block">Auction Rules:</span>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
          <li>Time commitment bounds: Minimum 30 mins, Maximum 120 mins</li>
          <li>Top 3 lowest bidders win slots for that problem statement</li>
          <li>No duplicate bids allowed on the same prompt</li>
        </ul>
      </div>
    </div>
  );
};
