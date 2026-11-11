import React, { useState, useEffect } from 'react';
import { LayoutGrid, Repeat, ShoppingCart, Loader2 } from 'lucide-react';
import { SleeperLeagueUser, SleeperTransaction, ManagerOtherDraft } from '../types/sleeper';
import { getLeagueTransactions } from '../services/sleeperApi';
import { fetchSleeperPlayers, SleeperPlayer } from '../services/sleeperPlayers';

interface ManagerActivityViewProps {
  user: SleeperLeagueUser;
  leagueId: string;
  season: string;
  otherDrafts: ManagerOtherDraft[];
  onOpenDraftBoard: (draftId: string, title: string, teams?: number, rounds?: number) => void;
}

export const ManagerActivityView: React.FC<ManagerActivityViewProps> = ({
  user,
  leagueId,
  otherDrafts,
  onOpenDraftBoard,
}) => {
  const [subTab, setSubTab] = useState<'drafts' | 'trades' | 'waivers'>('drafts');
  const [transactions, setTransactions] = useState<SleeperTransaction[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, SleeperPlayer>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!leagueId) return;
      try {
        setIsLoading(true);
        const [players, ...weeklyTxs] = await Promise.all([
          fetchSleeperPlayers().catch(() => ({})),
          ...Array.from({ length: 14 }, (_, i) =>
            getLeagueTransactions(leagueId, i + 1).catch(() => [])
          ),
        ]);

        setPlayersMap(players);
        const all = weeklyTxs.flat();
        const userTxs = all.filter(
          (t: SleeperTransaction) =>
            t.creator === user.user_id ||
            t.consenter_ids?.some((cid) => String(cid) === user.user_id)
        );
        setTransactions(userTxs);
      } catch (err) {
        console.error('Failed to load activity', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [leagueId, user.user_id]);

  const trades = transactions.filter((t) => t.type === 'trade');
  const waivers = transactions.filter((t) => t.type === 'waiver');

  const getPlayerLabel = (id: string) => {
    const p = playersMap[id];
    return p ? `${p.full_name} (${p.position} - ${p.team || 'FA'})` : `Player #${id}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub Tabs */}
      <div className="view-tabs" style={{ alignSelf: 'flex-start' }}>
        <button
          type="button"
          onClick={() => setSubTab('drafts')}
          className={subTab === 'drafts' ? 'selected' : ''}
        >
          <LayoutGrid size={12} />
          <span>Draft Boards Across Leagues ({otherDrafts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('trades')}
          className={subTab === 'trades' ? 'selected' : ''}
        >
          <Repeat size={12} />
          <span>Trades ({trades.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('waivers')}
          className={subTab === 'waivers' ? 'selected' : ''}
        >
          <ShoppingCart size={12} />
          <span>Waivers &amp; FAAB ({waivers.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', font: '12px var(--mono)' }}>
          <Loader2 size={16} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
          <span>Loading activity log…</span>
        </div>
      ) : (
        <>
          {/* 1. DRAFT BOARDS ACROSS LEAGUES */}
          {subTab === 'drafts' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {otherDrafts.map((d) => (
                <div
                  key={d.draftId}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <strong style={{ font: '600 13px var(--display)', color: 'var(--ink)' }}>{d.name}</strong>
                      <span className={d.isDynasty ? 'badge-dynasty' : 'badge-redraft'}>
                        {d.isDynasty ? 'Dynasty' : 'Redraft'}
                      </span>
                    </div>
                    <p style={{ margin: 0, font: '11px var(--mono)', color: 'var(--muted)' }}>
                      Season {d.season} · {d.type.toUpperCase()} · {d.teams} Teams · {d.rounds} Rounds
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDraftBoard(d.draftId, d.name, d.teams, d.rounds)}
                    className="action-btn"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <LayoutGrid size={12} />
                    <span>View Full Draft Board</span>
                  </button>
                </div>
              ))}
              {otherDrafts.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '12px' }}>No drafts found for this manager.</p>
              )}
            </div>
          )}

          {/* 2. TRADES */}
          {subTab === 'trades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {trades.map((t) => {
                const addedIds = t.adds ? Object.keys(t.adds) : [];
                const droppedIds = t.drops ? Object.keys(t.drops) : [];
                return (
                  <div
                    key={t.transaction_id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ font: '700 11px var(--mono)', color: 'var(--accent-text)' }}>
                          WEEK {t.leg}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>· Trade Completed</span>
                      </div>
                      <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>
                        {new Date(t.created).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                      <div style={{ padding: '8px', background: 'var(--surface-raised)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        <div style={{ font: '600 10px var(--mono)', color: 'var(--lucky-text)', marginBottom: '4px' }}>
                          RECEIVED (+)
                        </div>
                        {addedIds.map((pid) => (
                          <div key={pid} style={{ color: 'var(--ink)' }}>{getPlayerLabel(pid)}</div>
                        ))}
                        {t.draft_picks?.map((dp, i) => (
                          <div key={i} style={{ color: 'var(--accent-text)' }}>
                            Year {dp.season} Round {dp.round} Pick
                          </div>
                        ))}
                      </div>

                      <div style={{ padding: '8px', background: 'var(--surface-raised)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        <div style={{ font: '600 10px var(--mono)', color: 'var(--unlucky-text)', marginBottom: '4px' }}>
                          SENT AWAY (-)
                        </div>
                        {droppedIds.map((pid) => (
                          <div key={pid} style={{ color: 'var(--ink)' }}>{getPlayerLabel(pid)}</div>
                        ))}
                        {droppedIds.length === 0 && <span style={{ color: 'var(--muted)' }}>—</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {trades.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '12px' }}>No trade transactions logged for this season.</p>
              )}
            </div>
          )}

          {/* 3. WAIVERS & FAAB */}
          {subTab === 'waivers' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="th-rank">Week</th>
                    <th>Player Claimed (Add)</th>
                    <th>Player Dropped</th>
                    <th>FAAB Bid</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {waivers.map((w) => {
                    const addedId = w.adds ? Object.keys(w.adds)[0] : null;
                    const droppedId = w.drops ? Object.keys(w.drops)[0] : null;
                    const bid = w.settings?.waiver_bid ?? 0;
                    const isSuccess = w.status === 'complete';

                    return (
                      <tr key={w.transaction_id}>
                        <td className="th-rank" style={{ fontFamily: 'var(--mono)' }}>
                          W{w.leg}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {addedId ? getPlayerLabel(addedId) : '—'}
                        </td>
                        <td style={{ color: 'var(--muted)' }}>
                          {droppedId ? getPlayerLabel(droppedId) : 'None'}
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--ink-secondary)' }}>
                          ${bid} FAAB
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`reach-pill ${isSuccess ? 'steal' : 'reach'}`}>
                            {isSuccess ? 'Won' : 'Outbid'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {waivers.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        No waiver claims logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
