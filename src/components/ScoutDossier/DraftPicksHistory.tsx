import React, { useState, useMemo } from 'react';
import { History, Search, Filter } from 'lucide-react';
import { SleeperDraftPick } from '../../types/sleeper';

interface DraftPicksHistoryProps {
  picks: (SleeperDraftPick & { draftName?: string; season?: string })[];
}

const POSITIONS = ['ALL', 'RB', 'WR', 'QB', 'TE', 'K', 'DEF'];

const POS_COLORS: Record<string, string> = {
  RB: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  WR: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  QB: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  TE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  K: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DEF: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export const DraftPicksHistory: React.FC<DraftPicksHistoryProps> = ({ picks }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPos, setSelectedPos] = useState('ALL');

  const filteredPicks = useMemo(() => {
    return picks.filter((p) => {
      const playerName = `${p.metadata?.first_name || ''} ${p.metadata?.last_name || ''}`.toLowerCase();
      const pos = (p.metadata?.position || 'FLEX').toUpperCase();
      const team = (p.metadata?.team || '').toLowerCase();
      const draftName = (p.draftName || '').toLowerCase();

      const matchesSearch =
        searchTerm === '' ||
        playerName.includes(searchTerm.toLowerCase()) ||
        team.includes(searchTerm.toLowerCase()) ||
        draftName.includes(searchTerm.toLowerCase());

      const matchesPos = selectedPos === 'ALL' || pos === selectedPos;

      return matchesSearch && matchesPos;
    });
  }, [picks, searchTerm, selectedPos]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <History className="w-4 h-4 text-emerald-400" />
            <span>Complete Historical Pick Log</span>
          </h3>
          <p className="text-xs text-slate-400">
            Every tracked pick across past leagues and drafts ({filteredPicks.length} displayed)
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter player or team..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Position pills */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-500 ml-1 mr-0.5" />
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPos(pos)}
                className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                  selectedPos === pos
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-slate-400 sticky top-0 border-b border-slate-800 font-mono text-[11px] uppercase">
            <tr>
              <th className="py-2.5 px-3">Round / Pick</th>
              <th className="py-2.5 px-3">Player</th>
              <th className="py-2.5 px-3">Pos</th>
              <th className="py-2.5 px-3">Team</th>
              <th className="py-2.5 px-3">Draft / League</th>
              <th className="py-2.5 px-3 text-right">Year</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {filteredPicks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  No picks match the selected filters.
                </td>
              </tr>
            ) : (
              filteredPicks.map((p, idx) => {
                const pos = (p.metadata?.position || 'FLEX').toUpperCase();
                const posStyle = POS_COLORS[pos] || 'bg-slate-800 text-slate-300';
                const fullName = `${p.metadata?.first_name || ''} ${p.metadata?.last_name || ''}`.trim() || 'Unknown';

                return (
                  <tr key={`${p.draft_id}-${p.pick_no}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-300">
                      R{p.round}.{String(p.draft_slot || ((p.pick_no - 1) % 12) + 1).padStart(2, '0')}
                      <span className="text-[10px] text-slate-500 ml-1.5">#{p.pick_no}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {fullName}
                      {p.is_keeper && (
                        <span className="ml-1.5 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                          KEEPER
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border ${posStyle}`}>
                        {pos}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {p.metadata?.team || 'FA'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[180px]">
                      {p.draftName || 'Draft'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {p.season || '2024'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
