import React, { useState } from 'react';
import { X, Calculator, Zap, ShieldAlert, Award } from 'lucide-react';
import { calculateMultiplier, calculateFinalScore, calculateBoostPercentage } from '../utils/multiplier';

interface MultiplierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiplierModal: React.FC<MultiplierModalProps> = ({ isOpen, onClose }) => {
  const [round, setRound] = useState<number>(1);
  const [bidMinutes, setBidMinutes] = useState<number>(50);
  const [judgeScore, setJudgeScore] = useState<number>(75);

  if (!isOpen) return null;

  const currentMultiplier = calculateMultiplier(bidMinutes, round, 120, 30);
  const boost = calculateBoostPercentage(currentMultiplier);
  const projectedFinalScore = calculateFinalScore(judgeScore, currentMultiplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface-100 border border-surface-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">The Multiplier Formula</h2>
              <p className="text-xs text-slate-400 font-mono">Risk vs Reward Mathematical Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Formula Display */}
          <div className="p-4 rounded-xl bg-surface-300 border border-surface-border font-mono text-center">
            <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Mathematical Curve</div>
            <div className="text-lg text-brand-cyan font-bold tracking-wider">
              Multiplier = e<sup>(k × (1 - bid / 120))</sup>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex justify-center gap-6">
              <span><span className="text-brand-emerald font-semibold">k = 1.0</span> (Round 1)</span>
              <span><span className="text-brand-amber font-semibold">k = 0.7</span> (Round 2)</span>
              <span><span className="text-brand-purple font-semibold">Min: 30m</span></span>
              <span><span className="text-brand-blue font-semibold">Max: 120m</span></span>
            </div>
          </div>

          {/* Interactive Calculator */}
          <div className="space-y-5 bg-surface-200/60 p-5 rounded-xl border border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase">Simulate Multiplier</span>
              <div className="flex items-center gap-1 bg-surface-300 p-1 rounded-lg border border-surface-border">
                <button
                  type="button"
                  onClick={() => setRound(1)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                    round === 1
                      ? 'bg-brand-cyan text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Round 1 (k=1.0)
                </button>
                <button
                  type="button"
                  onClick={() => setRound(2)}
                  className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                    round === 2
                      ? 'bg-brand-amber text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Round 2 (k=0.7)
                </button>
              </div>
            </div>

            {/* Bid Slider */}
            <div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-300 font-medium">Bidding Time Commitment:</span>
                <span className="font-mono text-brand-cyan font-bold text-base">{bidMinutes} mins</span>
              </div>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                value={bidMinutes}
                onChange={(e) => setBidMinutes(Number(e.target.value))}
                className="w-full accent-brand-cyan cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
                <span>30m (Aggressive)</span>
                <span>60m (Balanced)</span>
                <span>120m (Safe)</span>
              </div>
            </div>

            {/* Hypothetical Judge Score Slider */}
            <div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-300 font-medium">Estimated Judge Score:</span>
                <span className="font-mono text-brand-purple font-bold text-base">{judgeScore} / 100</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={judgeScore}
                onChange={(e) => setJudgeScore(Number(e.target.value))}
                className="w-full accent-brand-purple cursor-pointer"
              />
            </div>

            {/* Result Stats Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-surface-300/80 p-3 rounded-xl border border-surface-border text-center">
                <div className="text-[10px] font-mono uppercase text-slate-400">Multiplier</div>
                <div className="text-xl font-bold font-mono text-brand-cyan mt-0.5">
                  {currentMultiplier.toFixed(3)}x
                </div>
              </div>

              <div className="bg-surface-300/80 p-3 rounded-xl border border-surface-border text-center">
                <div className="text-[10px] font-mono uppercase text-slate-400">Score Boost</div>
                <div className="text-xl font-bold font-mono text-brand-emerald mt-0.5">
                  +{boost.toFixed(1)}%
                </div>
              </div>

              <div className="bg-surface-300/80 p-3 rounded-xl border border-surface-border text-center">
                <div className="text-[10px] font-mono uppercase text-slate-400">Projected Score</div>
                <div className="text-xl font-bold font-mono text-brand-amber mt-0.5">
                  {projectedFinalScore.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Reference Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Lookup Table ({round === 1 ? 'Round 1: k=1.0' : 'Round 2: k=0.7'})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-200 text-slate-400 border-b border-surface-border">
                  <tr>
                    <th className="py-2 px-3">Bid Time</th>
                    <th className="py-2 px-3">Multiplier</th>
                    <th className="py-2 px-3">Boost</th>
                    <th className="py-2 px-3">Score on 80/100</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface-300/40">
                  {[30, 45, 60, 75, 90, 105, 120].map((mins) => {
                    const m = calculateMultiplier(mins, round, 120, 30);
                    const b = calculateBoostPercentage(m);
                    const score = calculateFinalScore(80, m);
                    return (
                      <tr
                        key={mins}
                        className={`hover:bg-surface-50/50 transition-colors ${
                          bidMinutes === mins ? 'bg-brand-cyan/10 font-bold' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-200">{mins} mins</td>
                        <td className="py-2 px-3 text-brand-cyan">{m.toFixed(3)}x</td>
                        <td className="py-2 px-3 text-brand-emerald">+{b.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-brand-amber">{score.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategy Tip */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3">
            <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Strategy Tip:</span> Aggressive bids yield huge score boosts, but only if you finish your prototype! An incomplete 40-point submission will lose even with a 2.1x multiplier. Balance speed against execution quality.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-surface-border bg-surface-200/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-lg transition-colors"
          >
            Close Calculator
          </button>
        </div>
      </div>
    </div>
  );
};
