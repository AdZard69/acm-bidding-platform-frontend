import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, ShieldCheck, Flame, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAsTeam, loginAsAdmin } = useAuth();

  const [mode, setMode] = useState<'team' | 'admin'>('team');
  const [teamName, setTeamName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'team') {
        if (!teamName.trim()) throw new Error('Please enter your team name');
        if (!password) throw new Error('Please enter your password');
        await loginAsTeam(teamName.trim(), password);
        navigate(from || '/team', { replace: true });
      } else {
        if (!adminUsername.trim()) throw new Error('Please enter admin username');
        if (!password) throw new Error('Please enter admin password');
        await loginAsAdmin(adminUsername.trim(), password);
        navigate(from || '/admin', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-surface-100 border border-surface-border rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Top Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-cyan to-brand-blue shadow-lg shadow-brand-cyan/20 mb-3">
            <Flame className="w-6 h-6 text-slate-950 font-black" />
          </div>
          <h2 className="text-xl font-bold font-mono text-white tracking-wide">
            Access Hackathon Platform
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Sign in with your assigned team credentials or admin key
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-300 rounded-xl border border-surface-border mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('team');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all ${
              mode === 'team'
                ? 'bg-brand-emerald text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>TEAM LOGIN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all ${
              mode === 'admin'
                ? 'bg-brand-purple text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ADMIN ROOM</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'team' ? (
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">Team Name</label>
              <input
                type="text"
                required
                autoFocus
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Alpha, CyberKnights..."
                className="w-full px-3.5 py-2.5 bg-surface-300 border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-brand-emerald font-mono placeholder:text-slate-600"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">Admin Username</label>
              <input
                type="text"
                required
                autoFocus
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="e.g. admin"
                className="w-full px-3.5 py-2.5 bg-surface-300 border border-surface-border rounded-xl text-white text-sm focus:outline-none focus:border-brand-purple font-mono placeholder:text-slate-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full px-3.5 py-2.5 bg-surface-300 border border-surface-border rounded-xl text-white text-sm focus:outline-none font-mono placeholder:text-slate-600 ${
                mode === 'team' ? 'focus:border-brand-emerald' : 'focus:border-brand-purple'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 ${
              mode === 'team'
                ? 'bg-brand-emerald hover:bg-brand-emerald/90 text-slate-950 shadow-brand-emerald/20'
                : 'bg-brand-purple hover:bg-brand-purple/90 text-slate-950 shadow-brand-purple/20'
            }`}
          >
            {loading ? (
              <span className="animate-pulse">AUTHENTICATING...</span>
            ) : (
              <>
                <span>ENTER AS {mode.toUpperCase()}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-surface-border text-center">
          <p className="text-[11px] font-mono text-slate-500">
            Forgot or lost your team password? Contact an ACM hackathon organizer.
          </p>
        </div>
      </div>
    </div>
  );
};
