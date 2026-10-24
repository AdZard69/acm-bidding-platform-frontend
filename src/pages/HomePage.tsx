import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Tv,
  Users,
  Trophy,
  ShieldCheck,
  Zap,
  Clock,
  Award,
  ChevronRight,
  TrendingUp,
  Cpu,
  Calculator
} from 'lucide-react';
import { MultiplierModal } from '../components/MultiplierModal';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { isConnected, gameStatus, currentRound, secondsRemaining } = useSocket();
  const { isAuthenticated, user } = useAuth();
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto space-y-6">
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-200/80 border border-surface-border backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-ping" />
            <span className="text-xs font-mono font-medium text-slate-300">
              STATUS: <span className="text-brand-cyan uppercase font-bold">{gameStatus.replace('_', ' ')}</span>
            </span>
            {currentRound > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-brand-amber font-semibold">ROUND {currentRound}</span>
              </>
            )}
            {secondsRemaining > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-brand-emerald font-bold">{secondsRemaining}s LEFT</span>
              </>
            )}
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-mono uppercase">
            Bid <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-teal-400 to-brand-blue">&</span> Code
          </h1>

          <p className="text-base sm:text-lg text-slate-400 font-sans leading-relaxed">
            A high-stakes hackathon auction where time is your currency. Bid the minutes you commit to build your project. The lower your bid, the less time you have to code — but the higher your final score multiplier.
          </p>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/arena"
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-mono font-bold text-sm tracking-wide shadow-lg shadow-brand-cyan/20 transition-all transform hover:-translate-y-0.5"
            >
              <Tv className="w-4 h-4" />
              <span>LAUNCH AUDITORIUM ARENA</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            {isAuthenticated ? (
              <Link
                to={user?.role === 'admin' ? '/admin' : '/team'}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-100 hover:bg-surface-50 text-white font-mono font-bold text-sm border border-surface-border transition-all"
              >
                <span>OPEN YOUR DASHBOARD</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-100 hover:bg-surface-50 text-white font-mono font-bold text-sm border border-surface-border transition-all"
              >
                <Users className="w-4 h-4 text-brand-emerald" />
                <span>TEAM / ADMIN LOGIN</span>
              </Link>
            )}

            <button
              onClick={() => setIsCalcOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-200/80 hover:bg-surface-100 text-slate-300 font-mono text-sm border border-surface-border transition-all"
            >
              <Calculator className="w-4 h-4 text-brand-cyan" />
              <span>Multiplier Formula</span>
            </button>
          </div>
        </div>

        {/* 4 Feature Gateways */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-16">
          {/* Card 1: Auditorium Arena */}
          <Link
            to="/arena"
            className="group p-6 rounded-2xl bg-surface-200/60 border border-surface-border hover:border-brand-cyan/50 hover:bg-surface-100/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan mb-4 group-hover:scale-110 transition-transform">
                <Tv className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono group-hover:text-brand-cyan transition-colors">
                Auditorium Arena
              </h3>
              <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                Projector view for the big stage. Features real-time countdown timer, live bids stream, and winning cut-off spotlights.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-mono text-brand-cyan font-semibold">
              <span>View Live Stage</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Team Portal */}
          <Link
            to="/team"
            className="group p-6 rounded-2xl bg-surface-200/60 border border-surface-border hover:border-brand-emerald/50 hover:bg-surface-100/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono group-hover:text-brand-emerald transition-colors">
                Team Portal
              </h3>
              <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                Live bidding console for hackathon teams. Includes real-time multiplier simulator, anti-collision alerts, and coding timer.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-mono text-brand-emerald font-semibold">
              <span>Enter Portal</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Leaderboard */}
          <Link
            to="/leaderboard"
            className="group p-6 rounded-2xl bg-surface-200/60 border border-surface-border hover:border-brand-amber/50 hover:bg-surface-100/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-amber/10 border border-brand-amber/20 flex items-center justify-center text-brand-amber mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono group-hover:text-brand-amber transition-colors">
                Leaderboard
              </h3>
              <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                Live standings updated as judges submit evaluations. See judge scores, awarded multipliers, and final rankings.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-mono text-brand-amber font-semibold">
              <span>View Standings</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Admin Control Room */}
          <Link
            to="/admin"
            className="group p-6 rounded-2xl bg-surface-200/60 border border-surface-border hover:border-brand-purple/50 hover:bg-surface-100/60 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-mono group-hover:text-brand-purple transition-colors">
                Admin Master
              </h3>
              <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">
                Game Master command center. Start rounds, pause/extend timers, manage teams and prompts, enter judge scores, or reset.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-mono text-brand-purple font-semibold">
              <span>Control Room</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* How It Works Section */}
        <div className="mt-24 p-8 rounded-2xl bg-surface-200/40 border border-surface-border">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold font-mono text-white">How "Bid and Code" Works</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-widest">
              Simple rules, relentless strategy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl bg-surface-300/60 border border-surface-border">
              <div className="text-brand-cyan font-mono font-bold text-xl mb-2">01</div>
              <h4 className="text-sm font-bold text-white font-mono">Prompt Revealed</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                4 prompts shown sequentially on the big screen for 60 seconds each.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-300/60 border border-surface-border">
              <div className="text-brand-emerald font-mono font-bold text-xl mb-2">02</div>
              <h4 className="text-sm font-bold text-white font-mono">Open Live Auction</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Teams bid how many minutes (30m to 120m) they need. No duplicate bids allowed.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-300/60 border border-surface-border">
              <div className="text-brand-amber font-mono font-bold text-xl mb-2">03</div>
              <h4 className="text-sm font-bold text-white font-mono">Lowest 3 Win Slots</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                The 3 lowest bidders win the prompt, lock in their multiplier, and leave the bidding pool.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-300/60 border border-surface-border">
              <div className="text-brand-purple font-mono font-bold text-xl mb-2">04</div>
              <h4 className="text-sm font-bold text-white font-mono">Code & Multiplied Score</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Build in your committed time. Final score = Judge Score (0-100) × Multiplier.
              </p>
            </div>
          </div>
        </div>
      </div>

      <MultiplierModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </div>
  );
};
