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

const POS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  RB: { bg: 'rgba(96, 165, 250, 0.12)', text: '#93c5fd', border: 'rgba(96, 165, 250, 0.3)' },
  WR: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  QB: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  TE: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
  K: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  DEF: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
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

  const totalRounds = league.settings.draft_rounds || Math.max(...picks.map((p) => p.round), 14);
  const totalSlots = league.total_rosters || 12;

  const pickGrid = new Map<string, SleeperDraftPick>();
  for (const p of picks) {
    pickGrid.set(`${p.round}-${p.draft_slot}`, p);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(10, 11, 13, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-raised)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutGrid size={16} style={{ color: 'var(--accent-text)' }} />
            <div>
              <h3 style={{ margin: 0, font: '600 15px var(--display)', color: 'var(--ink)' }}>
                {league.name} · Draft Board Grid
              </h3>
              <p style={{ margin: '2px 0 0', font: '11px var(--mono)', color: 'var(--muted)' }}>
                {picks.length} picks · {totalRounds} Rounds · {totalSlots} Teams
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: 'var(--control)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Grid Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', font: '12px var(--mono)' }}>
              <Loader2 size={20} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              <span>Loading complete draft matrix…</span>
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `44px repeat(${totalSlots}, minmax(105px, 1fr))`,
                  gap: '6px',
                  marginBottom: '6px',
                  minWidth: `${totalSlots * 115}px`,
                }}
              >
                <div style={{ font: '700 10px var(--mono)', color: 'var(--muted)', textAlign: 'center', padding: '6px 0' }}>
                  RND
                </div>
                {Array.from({ length: totalSlots }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '6px 4px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      borderRadius: '5px',
                      font: '700 10px var(--mono)',
                      color: 'var(--muted)',
                      textAlign: 'center',
                    }}
                  >
                    SLOT {idx + 1}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div style={{ minWidth: `${totalSlots * 115}px`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Array.from({ length: totalRounds }).map((_, rIdx) => {
                  const roundNum = rIdx + 1;
                  return (
                    <div
                      key={roundNum}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `44px repeat(${totalSlots}, minmax(105px, 1fr))`,
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          background: 'var(--surface-raised)',
                          border: '1px solid var(--line)',
                          borderRadius: '5px',
                          display: 'grid',
                          placeItems: 'center',
                          font: '700 11px var(--mono)',
                          color: 'var(--muted)',
                        }}
                      >
                        R{roundNum}
                      </div>

                      {Array.from({ length: totalSlots }).map((_, sIdx) => {
                        const slotNum = sIdx + 1;
                        const pick = pickGrid.get(`${roundNum}-${slotNum}`);
                        const pos = (pick?.metadata?.position || 'FLEX').toUpperCase();
                        const isTarget = pick && pick.picked_by === highlightUserId;
                        const style = POS_COLORS[pos] || {
                          bg: 'var(--surface-raised)',
                          text: 'var(--ink-secondary)',
                          border: 'var(--line)',
                        };

                        if (!pick) {
                          return (
                            <div
                              key={slotNum}
                              style={{
                                height: '56px',
                                border: '1px dashed var(--line)',
                                borderRadius: '6px',
                                background: 'transparent',
                              }}
                            />
                          );
                        }

                        return (
                          <div
                            key={slotNum}
                            style={{
                              height: '56px',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: isTarget ? '2px solid var(--accent)' : `1px solid ${style.border}`,
                              background: isTarget ? 'var(--accent-soft)' : style.bg,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: isTarget ? '0 0 10px rgba(96, 165, 250, 0.3)' : 'none',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span
                                style={{
                                  font: '600 11px var(--display)',
                                  color: 'var(--ink)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '75px',
                                }}
                              >
                                {pick.metadata?.first_name?.[0]}. {pick.metadata?.last_name}
                              </span>
                              <span style={{ font: '9px var(--mono)', color: 'var(--muted)' }}>
                                #{pick.pick_no}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', font: '10px var(--mono)' }}>
                              <span style={{ color: 'var(--muted)' }}>{pick.metadata?.team || 'FA'}</span>
                              <span style={{ color: style.text, fontWeight: 700 }}>{pos}</span>
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
