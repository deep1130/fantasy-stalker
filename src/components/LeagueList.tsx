import React from 'react';
import { Trophy, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import { SleeperLeague } from '../types/sleeper';

interface LeagueListProps {
  leagues: SleeperLeague[];
  selectedLeagueId: string | null;
  onSelectLeague: (league: SleeperLeague) => void;
  isLoading: boolean;
  season: string;
}

export const LeagueList: React.FC<LeagueListProps> = ({
  leagues,
  selectedLeagueId,
  onSelectLeague,
  isLoading,
  season,
}) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse">
        <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
        <p className="text-slate-400 text-sm">Intercepting leagues for season {season}...</p>
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
        <p className="text-slate-400 text-sm">No leagues found for season {season}. Try switching seasons above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span>Active Leagues ({leagues.length})</span>
        </h2>
        <span className="text-xs text-slate-400">Select a league to stalk its draft room</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {leagues.map((league) => {
          const isSelected = league.league_id === selectedLeagueId;
          const scoringType = league.metadata?.scoring_type || (league.scoring_settings?.rec === 1 ? 'ppr' : league.scoring_settings?.rec === 0.5 ? 'half_ppr' : 'standard');
          const isSuperFlex = league.roster_positions?.includes('SUPER_FLEX');

          return (
            <button
              key={league.league_id}
              onClick={() => onSelectLeague(league)}
              className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between group cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {league.name || 'Unnamed League'}
                  </h3>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-emerald-400 translate-x-1' : 'text-slate-600 group-hover:text-slate-400'}`} />
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium uppercase">
                    {scoringType.replace('_', ' ')}
                  </span>
                  {isSuperFlex && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                      2QB/Superflex
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{league.total_rosters} Teams</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span className="capitalize">{league.status}</span>
                {isSelected && (
                  <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Selected</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
