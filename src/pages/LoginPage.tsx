import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsTeam } = useAuth();

  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!teamName.trim()) throw new Error('Enter team name');
      if (!password) throw new Error('Enter password');
      await loginAsTeam(teamName.trim(), password);
      navigate(from || '/team', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#141211] border border-white/10 rounded-xl p-6 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#E5C158]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans text-[#F4F0EA]">Team Sign In</h2>
            <p className="text-xs text-[#A8A29E] font-sans">
              Enter your assigned team credentials
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[#721426]/20 border border-[#D45B70]/40 text-[#D45B70] text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#A8A29E] mb-1">Team Name</label>
            <input
              type="text"
              required
              autoFocus
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team Alpha"
              className="w-full px-3 py-2 bg-[#0E0D0C] border border-white/10 rounded-lg text-[#F4F0EA] text-xs font-mono focus:outline-none focus:border-[#D4AF37] placeholder:text-[#5A554E]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#A8A29E] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-[#0E0D0C] border border-white/10 rounded-lg text-[#F4F0EA] text-xs font-mono focus:outline-none focus:border-[#D4AF37] placeholder:text-[#5A554E]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B0B] font-mono font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Team'}
          </button>
        </form>
      </div>
    </div>
  );
};
