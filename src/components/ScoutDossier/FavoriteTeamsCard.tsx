import React from 'react';
import { ShieldAlert, Repeat } from 'lucide-react';

interface FavoriteTeamsCardProps {
  favoriteTeams: { team: string; count: number; percentage: number }[];
  repeatPlayers: { name: string; position: string; team: string; count: number }[];
}

export const FavoriteTeamsCard: React.FC<FavoriteTeamsCardProps> = ({
  favoriteTeams,
  repeatPlayers,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Favorite NFL Teams */}
      <div>
        <div className="flex items-center space-x-2 text-sm font-bold text-white mb-3">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span>Top Drafted NFL Franchises</span>
        </div>

        {favoriteTeams.length === 0 ? (
          <p className="text-xs text-slate-500">No team bias detected.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {favoriteTeams.map((t) => (
              <div
                key={t.team}
                className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] text-cyan-300">
                    {t.team}
                  </div>
                  <span className="font-semibold text-slate-200">{t.team}</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{t.count} picks</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Repeat Draft Targets */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-center space-x-2 text-sm font-bold text-white mb-3">
          <Repeat className="w-4 h-4 text-purple-400" />
          <span>Draft Crushes & Repeat Targets</span>
        </div>

        {repeatPlayers.length === 0 ? (
          <p className="text-xs text-slate-500">No multi-draft player repeats recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {repeatPlayers.map((p) => (
              <div
                key={p.name}
                className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200">{p.name}</span>
                  <span className="text-[10px] text-slate-500 ml-1.5 font-mono">
                    {p.position} - {p.team}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                  {p.count}x Drafted
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
