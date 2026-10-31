import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  RefreshCw,
  Search
} from 'lucide-react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { LeaderboardEntry } from '../types';
import { calculateBoostPercentage } from '../utils/multiplier';

export const LeaderboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const showMultiplier = isAdmin;
  const { socket } = useSocket();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      // Try admin endpoint or public bid endpoint
      const res = await (isAdmin ? api.getLeaderboard() : api.getPublicLeaderboard());
      if (res && res.success && res.leaderboard) {
        setEntries(res.leaderboard);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchLeaderboard();
    };
    const events = ['connect', 'leaderboard:update', 'round:ended', 'game:reset'];
    events.forEach((event) => socket.on(event, handleUpdate));
    return () => {
      events.forEach((event) => socket.off(event, handleUpdate));
    };
  }, [socket, fetchLeaderboard]);

  const filtered = entries.filter((e) =>
    e.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.prompt?.title && e.prompt.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-100 border border-surface-border text-slate-300">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-mono text-white">
              Public Standings
            </h1>
            <p className="text-xs font-mono text-slate-400">
              {showMultiplier
                ? 'Ranked by Final Multiplied Score (Judge Score × Multiplier)'
                : 'Ranked by Final Score'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team or prompt..."
              className="w-full pl-8 pr-3 py-1.5 bg-surface-100 border border-surface-border rounded-lg text-xs font-mono text-white focus:outline-none focus:border-slate-500 placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="p-2 rounded-lg bg-surface-100 hover:bg-surface-50 text-slate-300 border border-surface-border text-xs font-mono transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Clean Leaderboard Table */}
      <div className="rounded-xl border border-surface-border overflow-hidden bg-surface-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-surface-200 text-slate-400 border-b border-surface-border uppercase">
              <tr>
                <th className="py-3 px-4 w-16">Rank</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Assigned Problem</th>
                <th className="py-3 px-4 text-center">Bid Time</th>
                {showMultiplier && (
                  <th className="py-3 px-4 text-center">Multiplier</th>
                )}
                <th className="py-3 px-4 text-center">Judge Score</th>
                <th className="py-3 px-4 text-right">Final Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showMultiplier ? 7 : 6} className="py-12 text-center text-slate-500">
                    {loading ? 'Loading standings...' : 'No teams found'}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const m = entry.multiplier ? Number(entry.multiplier) : null;
                  const boost = m ? calculateBoostPercentage(m) : null;

                  return (
                    <tr key={entry.teamId} className="hover:bg-surface-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] ${
                            entry.rank === 1
                              ? 'bg-[#D4AF37] text-black font-black shadow-sm'
                              : entry.rank === 2
                              ? 'bg-[#C4BEB5] text-black font-bold shadow-sm'
                              : entry.rank === 3
                              ? 'bg-[#CD7F32] text-white font-bold shadow-sm'
                              : 'text-[#A8A29E] bg-white/5'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-white">
                        {entry.teamName}
                      </td>

                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                        {entry.prompt?.title ? (
                          <span>
                            <span className="text-slate-500 mr-1.5">
                              #{entry.prompt.displayOrder}
                            </span>
                            {entry.prompt.title}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center text-slate-300">
                        {entry.bidMinutes ? `${entry.bidMinutes}m` : '-'}
                      </td>

                      {showMultiplier && (
                        <td className="py-3 px-4 text-center">
                          {m ? (
                            <span className="text-brand-cyan">
                              {m.toFixed(3)}x
                              {boost !== null && (
                                <span className="text-slate-400 text-[10px] ml-1">
                                  (+{boost.toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      <td className="py-3 px-4 text-center text-slate-300">
                        {entry.judgeScore !== null && entry.judgeScore !== undefined
                          ? `${entry.judgeScore} / 100`
                          : <span className="text-slate-600">Pending</span>}
                      </td>

                      <td className="py-3 px-4 text-right font-bold">
                        {entry.finalScore !== null && entry.finalScore !== undefined ? (
                          <span className="text-emerald-400 text-sm">
                            {Number(entry.finalScore).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-600">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
