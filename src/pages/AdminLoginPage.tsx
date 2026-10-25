import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsAdmin } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!username.trim()) throw new Error('Enter admin username');
      if (!password) throw new Error('Enter password');
      await loginAsAdmin(username.trim(), password);
      navigate(from || '/admin', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#141211] border border-white/10 rounded-xl p-6 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#D45B70]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-sans text-[#F4F0EA]">Admin Sign In</h2>
            <p className="text-xs text-[#A8A29E] font-sans">
              Organizer and Game Master console
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
            <label className="block text-xs font-mono text-[#A8A29E] mb-1">Admin Username</label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2 bg-[#0E0D0C] border border-white/10 rounded-lg text-[#F4F0EA] text-xs font-mono focus:outline-none focus:border-[#D45B70] placeholder:text-[#5A554E]"
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
              className="w-full px-3 py-2 bg-[#0E0D0C] border border-white/10 rounded-lg text-[#F4F0EA] text-xs font-mono focus:outline-none focus:border-[#D45B70] placeholder:text-[#5A554E]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-[#721426] hover:bg-[#8B1A30] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border border-[#D45B70]/30 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Console'}
          </button>
        </form>
      </div>
    </div>
  );
};
