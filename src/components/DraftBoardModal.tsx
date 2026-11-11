import React, { useEffect, useState } from 'react';
import { X, Loader2, LayoutGrid } from 'lucide-react';
import { SleeperLeague, SleeperLeagueUser, SleeperDraftPick } from '../types/sleeper';
import { getDraftPicks } from '../services/sleeperApi';

interface DraftBoardModalProps {
  league: SleeperLeague;
  users: SleeperLeagueUser[];
  highlightUserId: string | null;
  onClose: () => void;
}

const POS_COLORS: Record<string, string> = {
  RB: 'bg-blue-600/30 border-blue-500/50 text-blue-200',
  WR: 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200',
  QB: 'bg-amber-600/30 border-amber-500/50 text-amber-200',
  TE: 'bg-orange-600/30 border-orange-500/50 text-orange-200',
  K: 'bg-purple-600/30 border-purple-500/50 text-purple-200',
  DEF: 'bg-pink-600/30 border-pink-500/50 text-pink-200',
};

export const DraftBoardModal: React.FC<DraftBoardModalProps> = ({
  league,
  highlightUserId,
  onClose,
}) => {
  const [picks, setPicks] = useState<SleeperDraftPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPicks() {
      if (!league.draft_id) return;
      try {
        setIsLoading(true);
        const data = await getDraftPicks(league.draft_id);
        setPicks(data);
      } catch (err) {
        console.error('Failed to load draft picks', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPicks();
  }, [league.draft_id]);

  // Group picks into round and draft slot
  const totalRounds = league.settings.draft_rounds || Math.max(...picks.map((p) => p.round), 14);
  const totalSlots = league.total_rosters || 12;

  // Map picks by round and slot
  const pickGrid = new Map<string, SleeperDraftPick>();
  for (const p of picks) {
    pickGrid.set(`${p.round}-${p.draft_slot}`, p);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <LayoutGrid className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                {league.name} - Full Draft Board Grid
              </h2>
              <p className="text-xs text-slate-400">
                {picks.length} picks logged • {totalRounds} Rounds • {totalSlots} Teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
              <p className="text-sm">Retrieving full draft board matrix...</p>
            </div>
          ) : (
            <div className="min-w-[900px]">
              {/* Draft Slot Headers */}
              <div
                className="grid gap-2 mb-2 sticky top-0 bg-slate-900 z-10 py-1"
                style={{ gridTemplateColumns: `50px repeat(${totalSlots}, minmax(110px, 1fr))` }}
              >
                <div className="text-[11px] font-bold text-slate-500 flex items-center justify-center">
                  RND
                </div>
                {Array.from({ length: totalSlots }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-slate-950 border border-slate-800 text-center font-mono text-[11px] text-slate-400 font-bold"
                  >
                    SLOT {idx + 1}
                  </div>
                ))}
              </div>

              {/* Rounds Rows */}
              <div className="space-y-2">
                {Array.from({ length: totalRounds }).map((_, rIdx) => {
                  const roundNum = rIdx + 1;
                  return (
                    <div
                      key={roundNum}
                      className="grid gap-2"
                      style={{ gridTemplateColumns: `50px repeat(${totalSlots}, minmax(110px, 1fr))` }}
                    >
                      {/* Round indicator */}
                      <div className="flex items-center justify-center font-mono font-bold text-xs text-slate-500 bg-slate-950/60 rounded border border-slate-800">
                        R{roundNum}
                      </div>

                      {/* Pick Slots */}
                      {Array.from({ length: totalSlots }).map((_, sIdx) => {
                        const slotNum = sIdx + 1;
                        const pick = pickGrid.get(`${roundNum}-${slotNum}`);
                        const pos = (pick?.metadata?.position || 'FLEX').toUpperCase();
                        const isTarget = pick && pick.picked_by === highlightUserId;

                        if (!pick) {
                          return (
                            <div
                              key={slotNum}
                              className="h-16 rounded border border-dashed border-slate-800 bg-slate-950/20"
                            />
                          );
                        }

                        const posStyle = POS_COLORS[pos] || 'bg-slate-800/40 border-slate-700 text-slate-300';

                        return (
                          <div
                            key={slotNum}
                            className={`h-16 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all ${posStyle} ${
                              isTarget
                                ? 'ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="font-bold text-[11px] truncate leading-tight">
                                {pick.metadata?.first_name?.[0]}. {pick.metadata?.last_name}
                              </span>
                              <span className="text-[9px] font-mono opacity-80 shrink-0 ml-1">
                                #{pick.pick_no}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                              <span>{pick.metadata?.team || 'FA'}</span>
                              <span className="px-1 rounded bg-black/30">{pos}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
