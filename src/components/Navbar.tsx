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
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0B0B0B]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="font-sans font-bold tracking-tight text-[#F4F0EA] text-sm">
              BID<span className="font-editorial italic font-normal text-[#D4AF37] px-0.5 text-base">&</span>CODE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#D4AF37] border border-white/10">
              ACM
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5">
            <Link
              to="/arena"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                isActive('/arena')
                  ? 'bg-[#181614] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold'
                  : 'text-[#A8A29E] hover:text-[#F4F0EA] border border-transparent'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Arena</span>
            </Link>

            {isAuthenticated && user?.role === 'team' && (
              <Link
                to="/team"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  isActive('/team')
                    ? 'bg-[#181614] text-[#E5C158] border border-[#E5C158]/30 font-semibold'
                    : 'text-[#A8A29E] hover:text-[#F4F0EA] border border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team</span>
              </Link>
            )}

            <Link
              to="/leaderboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                isActive('/leaderboard')
                  ? 'bg-[#181614] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold'
                  : 'text-[#A8A29E] hover:text-[#F4F0EA] border border-transparent'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </Link>

            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  isActive('/admin')
                    ? 'bg-[#181614] text-[#D45B70] border border-[#D45B70]/30 font-semibold'
                    : 'text-[#A8A29E] hover:text-[#F4F0EA] border border-transparent'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
            )}
          </nav>

          {/* Right Auth */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#D4AF37] px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {user.role === 'team' ? user.teamName : user.username}
                </span>

                <button
                  onClick={() => setIsPassModalOpen(true)}
                  className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#F4F0EA] hover:bg-white/5 transition-colors"
                  title="Change Password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-[#A8A29E] hover:text-[#D45B70] hover:bg-white/5 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] text-xs font-mono font-bold tracking-wide transition-all shadow-sm"
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
