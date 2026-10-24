import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, ShieldCheck, AlertCircle } from 'lucide-react';
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
        if (!teamName.trim()) throw new Error('Enter team name');
        if (!password) throw new Error('Enter password');
        await loginAsTeam(teamName.trim(), password);
        navigate(from || '/team', { replace: true });
      } else {
        if (!adminUsername.trim()) throw new Error('Enter admin username');
        if (!password) throw new Error('Enter admin password');
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
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-100 border border-surface-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold font-mono text-white">Sign In</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Log in with team or admin credentials
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-300 rounded-lg border border-surface-border font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('team');
              setError(null);
            }}
            className={`py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'team'
                ? 'bg-surface-50 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
            }}
            className={`py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'admin'
                ? 'bg-surface-50 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'team' ? (
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Team Name</label>
              <input
                type="text"
                required
                autoFocus
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team Alpha"
                className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-lg text-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Admin Username</label>
              <input
                type="text"
                required
                autoFocus
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-lg text-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-surface-300 border border-surface-border rounded-lg text-white text-xs font-mono focus:outline-none focus:border-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : `Sign In as ${mode}`}
          </button>
        </form>
      </div>
    </div>
  );
};
