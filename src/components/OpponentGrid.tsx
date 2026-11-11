import React from 'react';
import { Target, Users, LayoutGrid, Loader2 } from 'lucide-react';
import { SleeperLeague, SleeperLeagueUser, SleeperRoster } from '../types/sleeper';
import { getAvatarUrl } from '../services/sleeperApi';

interface OpponentGridProps {
  league: SleeperLeague;
  users: SleeperLeagueUser[];
  rosters: SleeperRoster[];
  selectedUserId: string | null;
  onSelectOpponent: (user: SleeperLeagueUser) => void;
  onOpenDraftBoard: () => void;
  isLoadingUsers: boolean;
  isScouting: boolean;
}

export const OpponentGrid: React.FC<OpponentGridProps> = ({
  league,
  users,
  rosters,
  selectedUserId,
  onSelectOpponent,
  onOpenDraftBoard,
  isLoadingUsers,
  isScouting,
}) => {
  if (isLoadingUsers) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse">
        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-bounce" />
        <p className="text-slate-400 text-sm">Loading league managers and rosters...</p>
      </div>
    );
  }

  // Map rosters to owners for record lookup
  const rosterMap = new Map<string, SleeperRoster>();
  for (const r of rosters) {
    if (r.owner_id) {
      rosterMap.set(r.owner_id, r);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>League Targets ({users.length} Managers)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click on any league mate to reveal their full draft history and tendencies
          </p>
        </div>

        {league.draft_id && (
          <button
            onClick={onOpenDraftBoard}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer shrink-0"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inspect Full Draft Board</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {users.map((u) => {
          const isSelected = u.user_id === selectedUserId;
          const roster = rosterMap.get(u.user_id);
          const teamName = u.metadata?.team_name || `${u.display_name}'s Team`;

          return (
            <div
              key={u.user_id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <img
                    src={getAvatarUrl(u.avatar)}
                    alt={u.display_name}
                    className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                  />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white text-sm truncate">{u.display_name}</h3>
                  <p className="text-xs text-slate-400 truncate">@{u.username || 'sleeper_user'}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{teamName}</p>
                </div>
              </div>

              {roster && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Record:</span>
                  <span className="font-mono font-medium text-slate-300">
                    {roster.settings.wins}-{roster.settings.losses}
                    {roster.settings.ties ? `-${roster.settings.ties}` : ''}
                  </span>
                </div>
              )}

              <button
                onClick={() => onSelectOpponent(u)}
                disabled={isScouting && isSelected}
                className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isScouting && isSelected ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Drafts...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Scouting Active' : 'Scout Draft DNA'}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
