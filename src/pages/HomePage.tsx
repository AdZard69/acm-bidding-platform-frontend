import React from 'react';
import { Link } from 'react-router-dom';
import {
  Tv,
  Users,
  Trophy,
  ShieldCheck,
  ArrowRight,
  Clock,
  Zap,
  Target
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { isConnected, gameStatus, currentRound, secondsRemaining, currentPrompt, refreshState } = useSocket();
  const { isAuthenticated, user } = useAuth();

  React.useEffect(() => {
    refreshState();
    if (!isConnected) {
      const timer = setInterval(refreshState, 3000);
      return () => clearInterval(timer);
    }
  }, [isConnected, refreshState]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
      {/* Editorial Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-[#D4AF37]">
          <span>USICT-ACM</span>
          <span className="text-white/20">•</span>
          <span>Time-Commitment Hackathon</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-sans font-extrabold tracking-tight text-[#F4F0EA]">
          BID <span className="font-editorial italic font-normal text-[#D4AF37]">&</span> CODE
        </h1>
        <p className="text-sm sm:text-base text-[#A8A29E] font-sans max-w-xl leading-relaxed">
          The auction where time is currency. Bid the minutes you commit to build—lower bids earn higher score multipliers.
        </p>
      </div>

      {/* Live Event Status Strip */}
      <div className="p-4 rounded-xl bg-[#141211] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#7A756D] uppercase text-[11px] tracking-wider">Status:</span>
          {gameStatus === 'bidding' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
              Live Auction
            </span>
          ) : gameStatus === 'paused' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold">
              Paused
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#A8A29E]">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              Waiting for Round
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 text-[#A8A29E]">
          <div>
            <span className="text-[#7A756D] mr-1.5">ROUND:</span>
            <strong className="text-[#F4F0EA]">{currentRound > 0 ? `R${currentRound}` : '—'}</strong>
          </div>
          <div>
            <span className="text-[#7A756D] mr-1.5">TIMER:</span>
            <strong className="text-[#D4AF37]">{secondsRemaining}s</strong>
          </div>
          <div>
            <span className="text-[#7A756D] mr-1.5">PROMPT:</span>
            <strong className="text-[#F4F0EA] truncate max-w-[200px] inline-block align-bottom">
              {currentPrompt ? currentPrompt.title : 'None active'}
            </strong>
          </div>
        </div>
      </div>

      {/* Functional Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Arena */}
        <Link
          to="/arena"
          className="group relative p-6 rounded-xl bg-[#141211] hover:bg-[#181614] border border-white/10 hover:border-[#D4AF37]/40 transition-all duration-200 flex flex-col justify-between space-y-6"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-[#D4AF37] uppercase font-bold">
                Auditorium
              </span>
              <Tv className="w-4 h-4 text-[#7A756D] group-hover:text-[#D4AF37] transition-colors" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-[#F4F0EA]">Projector Arena</h3>
              <p className="text-xs text-[#A8A29E] font-sans mt-1">
                Big-screen display with countdown timer, active prompt, and live auction board.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#F4F0EA] group-hover:text-[#D4AF37] transition-colors">
            <span>Launch Arena</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Team Portal */}
        {(!isAuthenticated || user?.role === 'team') && (
          <Link
            to={isAuthenticated && user?.role === 'team' ? '/team' : '/login'}
            className="group relative p-6 rounded-xl bg-[#141211] hover:bg-[#181614] border border-white/10 hover:border-[#D4AF37]/40 transition-all duration-200 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-[#E5C158] uppercase font-bold">
                  Participant
                </span>
                <Users className="w-4 h-4 text-[#7A756D] group-hover:text-[#E5C158] transition-colors" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-lg text-[#F4F0EA]">Team Portal</h3>
                <p className="text-xs text-[#A8A29E] font-sans mt-1">
                  Place time bids during live prompt windows and view assigned problem specs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#F4F0EA] group-hover:text-[#E5C158] transition-colors">
              <span>{isAuthenticated && user?.role === 'team' ? 'Open Dashboard' : 'Sign In as Team'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Leaderboard */}
        <Link
          to="/leaderboard"
          className="group relative p-6 rounded-xl bg-[#141211] hover:bg-[#181614] border border-white/10 hover:border-[#D4AF37]/40 transition-all duration-200 flex flex-col justify-between space-y-6"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-[#D4AF37] uppercase font-bold">
                Rankings
              </span>
              <Trophy className="w-4 h-4 text-[#7A756D] group-hover:text-[#D4AF37] transition-colors" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-[#F4F0EA]">Leaderboard</h3>
              <p className="text-xs text-[#A8A29E] font-sans mt-1">
                Live rankings showing bids, calculated multipliers, judge scores, and final totals.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#F4F0EA] group-hover:text-[#D4AF37] transition-colors">
            <span>View Standings</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Admin Room (only shown to authenticated admins) */}
        {isAuthenticated && user?.role === 'admin' && (
          <Link
            to="/admin"
            className="group relative p-6 rounded-xl bg-[#141211] hover:bg-[#181614] border border-white/10 hover:border-[#D45B70]/40 transition-all duration-200 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-[#D45B70] uppercase font-bold">
                  Organizers
                </span>
                <ShieldCheck className="w-4 h-4 text-[#7A756D] group-hover:text-[#D45B70] transition-colors" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-lg text-[#F4F0EA]">Admin Console</h3>
                <p className="text-xs text-[#A8A29E] font-sans mt-1">
                  Manage auction rounds, team credentials, problem prompts, and score submissions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#F4F0EA] group-hover:text-[#D45B70] transition-colors">
              <span>Open Console</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}
      </div>

      {/* Clean 3-Metric Rule Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#141211] border border-white/10 flex items-start gap-3">
          <Clock className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-xs font-bold text-[#F4F0EA]">30m – 120m</div>
            <div className="font-sans text-[11px] text-[#A8A29E]">Time commitment bidding window</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141211] border border-white/10 flex items-start gap-3">
          <Target className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-xs font-bold text-[#F4F0EA]">Top 3 Lowest</div>
            <div className="font-sans text-[11px] text-[#A8A29E]">Bidders win problem slots</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141211] border border-white/10 flex items-start gap-3">
          <Zap className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <div>
            <div className="font-mono text-xs font-bold text-[#F4F0EA]">Anti-Collision</div>
            <div className="font-sans text-[11px] text-[#A8A29E]">Duplicate bid minutes prevented</div>
          </div>
        </div>
      </div>
    </div>
  );
};
