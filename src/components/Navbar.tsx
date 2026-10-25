import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Tv,
  Users,
  Trophy,
  ShieldCheck,
  LogOut,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-surface-300/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo / Title */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="font-mono font-bold tracking-tight text-white text-sm">
              BID<span className="text-brand-cyan">&</span>CODE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-100 text-slate-400 border border-surface-border">
              ACM
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            <Link
              to="/arena"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                isActive('/arena')
                  ? 'bg-surface-50 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Arena</span>
            </Link>

            {isAuthenticated && user?.role === 'team' && (
              <Link
                to="/team"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  isActive('/team')
                    ? 'bg-surface-50 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-brand-emerald" />
                <span>Team</span>
              </Link>
            )}

            <Link
              to="/leaderboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                isActive('/leaderboard')
                  ? 'bg-surface-50 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-brand-amber" />
              <span>Leaderboard</span>
            </Link>

            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  isActive('/admin')
                    ? 'bg-surface-50 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-purple" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Right Auth */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-200">
                  {user.role === 'team' ? user.teamName : user.username}
                </span>

                <button
                  onClick={() => setIsPassModalOpen(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-100 transition-colors"
                  title="Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-surface-100 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 text-white border border-surface-border text-xs font-mono font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} />
    </>
  );
};
