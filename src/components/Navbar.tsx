import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Flame,
  Tv,
  Users,
  Trophy,
  ShieldCheck,
  Calculator,
  Volume2,
  VolumeX,
  LogOut,
  KeyRound,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MultiplierModal } from './MultiplierModal';
import { ChangePasswordModal } from './ChangePasswordModal';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected, soundEnabled, toggleSound } = useSocket();

  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-surface-300/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center shadow-lg shadow-brand-cyan/20 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-slate-950 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base font-mono">
                  BID<span className="text-brand-cyan">&</span>CODE
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                  ACM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">Time-Commitment Hackathon</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/arena"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                isActive('/arena')
                  ? 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30'
                  : 'text-slate-300 hover:text-white hover:bg-surface-100'
              }`}
            >
              <Tv className="w-4 h-4 text-brand-cyan" />
              <span>Projector Arena</span>
            </Link>

            <Link
              to="/team"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                isActive('/team')
                  ? 'bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30'
                  : 'text-slate-300 hover:text-white hover:bg-surface-100'
              }`}
            >
              <Users className="w-4 h-4 text-brand-emerald" />
              <span>Team Portal</span>
            </Link>

            <Link
              to="/leaderboard"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                isActive('/leaderboard')
                  ? 'bg-brand-amber/15 text-brand-amber border border-brand-amber/30'
                  : 'text-slate-300 hover:text-white hover:bg-surface-100'
              }`}
            >
              <Trophy className="w-4 h-4 text-brand-amber" />
              <span>Leaderboard</span>
            </Link>

            <Link
              to="/admin"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                isActive('/admin')
                  ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/30'
                  : 'text-slate-300 hover:text-white hover:bg-surface-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-brand-purple" />
              <span>Admin Room</span>
            </Link>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Socket Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-mono border ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
              title={isConnected ? 'Live Socket Connected' : 'Connecting to Server...'}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span className="hidden lg:inline">SYNCED</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400" />
                  <span className="hidden lg:inline">DISCONNECTED</span>
                </>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'border-surface-border text-slate-300 hover:text-white bg-surface-200'
                  : 'border-rose-500/30 text-rose-400 bg-rose-500/10'
              }`}
              title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Multiplier Simulator Modal Button */}
            <button
              onClick={() => setIsCalcOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-100 text-slate-200 border border-surface-border text-xs font-mono transition-colors"
              title="Multiplier Simulator"
            >
              <Calculator className="w-3.5 h-3.5 text-brand-cyan" />
              <span className="hidden sm:inline">Formula</span>
            </button>

            {/* Auth status / Login Button */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white font-mono">
                    {user.role === 'team' ? user.teamName : user.username}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={() => setIsPassModalOpen(true)}
                  className="p-2 rounded-lg bg-surface-200 hover:bg-surface-100 text-slate-300 hover:text-white border border-surface-border transition-colors"
                  title="Change Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-bold text-xs font-mono tracking-wide shadow-md shadow-brand-cyan/20 transition-all"
              >
                LOGIN
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <MultiplierModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
      <ChangePasswordModal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />
    </>
  );
};
