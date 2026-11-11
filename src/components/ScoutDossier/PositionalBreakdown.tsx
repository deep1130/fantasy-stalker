import React from 'react';
import { PieChart } from 'lucide-react';
import { PositionStat } from '../../types/sleeper';

interface PositionalBreakdownProps {
  stats: PositionStat[];
  totalPicks: number;
}

export const PositionalBreakdown: React.FC<PositionalBreakdownProps> = ({ stats, totalPicks }) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <span>Positional Allocation</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">{totalPicks} picks total</span>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-950 p-0.5 border border-slate-800 mb-5">
          {stats.map((s) => (
            <div
              key={s.position}
              style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              title={`${s.position}: ${s.percentage}% (${s.count} picks)`}
            />
          ))}
        </div>

        {/* Breakdown List */}
        <div className="space-y-3">
          {stats.map((stat) => (
            <div key={stat.position} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: stat.color }}
                />
                <span className="font-bold text-slate-200">{stat.position}</span>
              </div>

              <div className="flex items-center space-x-3 font-mono">
                <span className="text-slate-400">{stat.count} picks</span>
                <span className="text-slate-200 font-bold w-10 text-right">{stat.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
        <span>Drafted Positional Priority</span>
        <span className="text-emerald-400 font-semibold">
          Primary: {stats[0]?.position || 'N/A'} ({stats[0]?.percentage || 0}%)
        </span>
      </div>
    </div>
  );
};
