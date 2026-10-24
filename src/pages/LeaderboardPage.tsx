import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Award,
  RefreshCw,
  Search,
  Zap,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { LeaderboardEntry } from '../types';
import { calculateBoostPercentage } from '../utils/multiplier';

export const LeaderboardPage: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.getLeaderboard();
      if (res.success && res.leaderboard) {
        setEntries(res.leaderboard);
        setLastUpdated(new Date());
      }
    } catch {
      // Fallback or error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000); // Polling every 10s for live score updates
    return () => clearInterval(interval);
  }, []);

  const filteredEntries = entries.filter((e) =>
    e.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.prompt?.title && e.prompt.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const top3 = entries.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-amber/10 border border-brand-amber/20 text-brand-amber">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">
                Hackathon Leaderboard
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-amber/20 text-brand-amber border border-brand-amber/30">
                LIVE SCORES
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Rankings ranked by Final Score (Judge Score × Multiplier)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team or prompt..."
              className="w-full pl-9 pr-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-xs font-mono text-white focus:outline-none focus:border-brand-amber placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="p-2.5 rounded-xl bg-surface-200 hover:bg-surface-100 text-slate-300 border border-surface-border transition-colors disabled:opacity-50"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Podium for Top 3 (if we have at least 1 scored team) */}
      {top3.length > 0 && top3[0].finalScore !== null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <div className="order-2 md:order-1 p-6 rounded-2xl bg-surface-200/60 border border-slate-400/30 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-400/20 text-slate-300 border border-slate-400/30 flex items-center gap-1.5">
                  <Medal className="w-3.5 h-3.5 text-slate-300" />
                  <span>2ND PLACE</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {top3[1].multiplier ? `${Number(top3[1].multiplier).toFixed(3)}x` : '-'}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold font-mono text-white truncate">
                  {top3[1].teamName}
                </h3>
                <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                  {top3[1].prompt?.title || 'No prompt'}
                </p>
              </div>

              <div className="pt-3 border-t border-surface-border flex items-baseline justify-between font-mono">
                <span className="text-xs text-slate-400">Score:</span>
                <span className="text-2xl font-black text-slate-200">
                  {top3[1].finalScore !== null ? Number(top3[1].finalScore).toFixed(2) : '-'}
                </span>
              </div>
            </div>
          )}

          {/* Rank 1 (Gold) */}
          {top3[0] && (
            <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-surface-200 to-amber-950/20 border border-amber-500/50 shadow-xl shadow-amber-500/10 flex flex-col justify-between space-y-4 md:-translate-y-2">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>1ST PLACE</span>
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {top3[0].multiplier ? `${Number(top3[0].multiplier).toFixed(3)}x` : '-'}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black font-mono text-white truncate">
                  {top3[0].teamName}
                </h3>
                <p className="text-xs font-mono text-slate-300 truncate mt-0.5">
                  {top3[0].prompt?.title || 'No prompt'}
                </p>
              </div>

              <div className="pt-3 border-t border-surface-border flex items-baseline justify-between font-mono">
                <span className="text-xs text-amber-300">Final Score:</span>
                <span className="text-3xl font-black text-amber-400">
                  {top3[0].finalScore !== null ? Number(top3[0].finalScore).toFixed(2) : '-'}
                </span>
              </div>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <div className="order-3 p-6 rounded-2xl bg-surface-200/60 border border-amber-800/30 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-800/20 text-amber-500 border border-amber-800/30 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>3RD PLACE</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {top3[2].multiplier ? `${Number(top3[2].multiplier).toFixed(3)}x` : '-'}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold font-mono text-white truncate">
                  {top3[2].teamName}
                </h3>
                <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                  {top3[2].prompt?.title || 'No prompt'}
                </p>
              </div>

              <div className="pt-3 border-t border-surface-border flex items-baseline justify-between font-mono">
                <span className="text-xs text-slate-400">Score:</span>
                <span className="text-2xl font-black text-slate-200">
                  {top3[2].finalScore !== null ? Number(top3[2].finalScore).toFixed(2) : '-'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="rounded-2xl border border-surface-border overflow-hidden bg-surface-200/60 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-surface-300 text-slate-400 border-b border-surface-border uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Rank</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4">Assigned Problem</th>
                <th className="py-3.5 px-4 text-center">Bid Time</th>
                <th className="py-3.5 px-4 text-center">Multiplier</th>
                <th className="py-3.5 px-4 text-center">Judge Score</th>
                <th className="py-3.5 px-4 text-right">Final Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-200/40">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    {loading ? 'LOADING LEADERBOARD...' : 'NO TEAMS FOUND'}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const m = entry.multiplier ? Number(entry.multiplier) : null;
                  const boost = m ? calculateBoostPercentage(m) : null;

                  return (
                    <tr
                      key={entry.teamId}
                      className="hover:bg-surface-100/60 transition-colors"
                    >
                      <td className="py-4 px-4 font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                            entry.rank === 1
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : entry.rank === 2
                              ? 'bg-slate-300 text-slate-950 font-bold'
                              : entry.rank === 3
                              ? 'bg-amber-800 text-slate-100 font-bold'
                              : 'text-slate-400 bg-surface-300'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-white text-sm">
                        {entry.teamName}
                      </td>

                      <td className="py-4 px-4 text-slate-300 max-w-xs truncate">
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

                      <td className="py-4 px-4 text-center text-slate-300">
                        {entry.bidMinutes ? `${entry.bidMinutes}m` : '-'}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {m ? (
                          <div>
                            <span className="font-bold text-brand-cyan">{m.toFixed(3)}x</span>
                            {boost !== null && (
                              <span className="text-[10px] text-brand-emerald ml-1">
                                (+{boost.toFixed(0)}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {entry.judgeScore !== null && entry.judgeScore !== undefined ? (
                          <span className="font-semibold text-brand-purple">
                            {entry.judgeScore} / 100
                          </span>
                        ) : (
                          <span className="text-slate-600">Pending</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {entry.finalScore !== null && entry.finalScore !== undefined ? (
                          <span className="font-black text-brand-emerald text-base">
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
