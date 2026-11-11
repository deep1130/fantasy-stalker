import React from 'react';
import { Target, Compass } from 'lucide-react';

interface EarlyRoundTendenciesProps {
  earlyPicks: { round: number; position: string; player: string; team: string }[];
  scoutingNotes: string[];
}

export const EarlyRoundTendencies: React.FC<EarlyRoundTendenciesProps> = ({
  earlyPicks,
  scoutingNotes,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Early Round Tendencies (Rounds 1-3)</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">{earlyPicks.length} sample picks</span>
        </div>

        {earlyPicks.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No early round picks recorded for this user.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {earlyPicks.slice(0, 6).map((pick, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 mr-1.5">
                    R{pick.round}
                  </span>
                  <span className="font-semibold text-slate-200">{pick.player}</span>
                </div>
                <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                  <span className="text-slate-400">{pick.team}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-emerald-400 font-bold">
                    {pick.position}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Counter-Strategy Tactical Callout */}
      <div className="mt-2 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 mb-1">
          <Compass className="w-3.5 h-3.5" />
          <span>Tactical Exploitation Intel</span>
        </div>
        <ul className="space-y-1 text-xs text-slate-300">
          {scoutingNotes.map((note, idx) => (
            <li key={idx} className="flex items-start space-x-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>{note}</span>
            </li>
          ))}
          {scoutingNotes.length === 0 && (
            <li className="text-slate-400">Standard balanced draft profile. Watch the board value rather than predicting a reach.</li>
          )}
        </ul>
      </div>
    </div>
  );
};
