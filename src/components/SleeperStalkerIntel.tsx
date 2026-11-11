import React, { useState, useEffect } from 'react';
import { LayoutGrid, Repeat, ShoppingCart, Users, Loader2 } from 'lucide-react';
import {
  SleeperLeagueUser,
  ManagerOtherLeagueDetail,
  SleeperTransaction,
} from '../types/sleeper';
import {
  getUserLeagues,
  getLeagueUsers,
  getLeagueRosters,
  getLeagueTransactions,
} from '../services/sleeperApi';
import { fetchSleeperPlayers, SleeperPlayer } from '../services/sleeperPlayers';

interface SleeperStalkerIntelProps {
  targetUser: SleeperLeagueUser;
  currentLeagueId: string;
  availableSeasons: string[];
  onOpenDraftBoard: (draftId: string, title: string, teams?: number, rounds?: number) => void;
}

export const SleeperStalkerIntel: React.FC<SleeperStalkerIntelProps> = ({
  targetUser,
  currentLeagueId,
  availableSeasons,
  onOpenDraftBoard,
}) => {
  const [subTab, setSubTab] = useState<'other_drafts' | 'teams' | 'trades' | 'waivers'>('other_drafts');
  const [otherLeagues, setOtherLeagues] = useState<ManagerOtherLeagueDetail[]>([]);
  const [crossTrades, setCrossTrades] = useState<(SleeperTransaction & { leagueName: string })[]>([]);
  const [crossWaivers, setCrossWaivers] = useState<(SleeperTransaction & { leagueName: string })[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, SleeperPlayer>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function stalkManager() {
      try {
        setIsLoading(true);
        const seasons = availableSeasons.slice(0, 3);
        const [players, ...seasonLeagues] = await Promise.all([
          fetchSleeperPlayers().catch(() => ({})),
          ...seasons.map((s) => getUserLeagues(targetUser.user_id, s).catch(() => [])),
        ]);

        setPlayersMap(players);
        const allLeaguesFlat = seasonLeagues.flat();

        // Filter out current league if we want to focus on their other leagues
        const otherLeaguesList: ManagerOtherLeagueDetail[] = [];
        const gatheredTrades: (SleeperTransaction & { leagueName: string })[] = [];
        const gatheredWaivers: (SleeperTransaction & { leagueName: string })[] = [];

        await Promise.all(
          allLeaguesFlat.slice(0, 8).map(async (league) => {
            try {
              const isDyn = league.settings?.type === 2;
              const scoring = league.metadata?.scoring_type || (league.scoring_settings?.rec === 1 ? 'PPR' : 'Half PPR');
              const [users, rosters] = await Promise.all([
                getLeagueUsers(league.league_id).catch(() => []),
                getLeagueRosters(league.league_id).catch(() => []),
              ]);

              const userInLeague = users.find((u) => u.user_id === targetUser.user_id);
              const teamName = userInLeague?.metadata?.team_name || `${targetUser.display_name}'s Team`;
              const roster = rosters.find((r) => r.owner_id === targetUser.user_id);

              otherLeaguesList.push({
                leagueId: league.league_id,
                name: league.name,
                season: league.season,
                draftId: league.draft_id,
                isDynasty: isDyn,
                totalTeams: league.total_rosters || 12,
                scoringType: scoring,
                teamName,
                record: roster ? { wins: roster.settings.wins, losses: roster.settings.losses } : undefined,
                rosterPlayerIds: roster?.players || [],
              });

              // Fetch transactions for week 1-6 for this league
              const weeklyTxs = await Promise.all(
                [1, 2, 3, 4, 5, 6].map((w) => getLeagueTransactions(league.league_id, w).catch(() => []))
              );
              for (const tx of weeklyTxs.flat()) {
                const isUserInvolved =
                  tx.creator === targetUser.user_id ||
                  (roster && tx.roster_ids?.includes(roster.roster_id));

                if (isUserInvolved) {
                  if (tx.type === 'trade') {
                    gatheredTrades.push({ ...tx, leagueName: league.name });
                  } else if (tx.type === 'waiver') {
                    gatheredWaivers.push({ ...tx, leagueName: league.name });
                  }
                }
              }
            } catch (err) {
              console.warn('Failed to inspect league', league.league_id, err);
            }
          })
        );

        setOtherLeagues(otherLeaguesList);
        setCrossTrades(gatheredTrades.sort((a, b) => b.created - a.created));
        setCrossWaivers(gatheredWaivers.sort((a, b) => b.created - a.created));
      } catch (err) {
        console.error('Failed to stalk manager cross-league', err);
      } finally {
        setIsLoading(false);
      }
    }
    stalkManager();
  }, [targetUser.user_id, availableSeasons]);

  const getPlayerLabel = (id: string) => {
    const p = playersMap[id];
    return p ? `${p.full_name} (${p.position} - ${p.team || 'FA'})` : `Player #${id}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* View Tabs */}
      <div className="view-tabs" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setSubTab('other_drafts')}
          className={subTab === 'other_drafts' ? 'selected' : ''}
        >
          <LayoutGrid size={12} />
          <span>Draft Boards in Their Other Leagues ({otherLeagues.filter(l => l.draftId).length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('teams')}
          className={subTab === 'teams' ? 'selected' : ''}
        >
          <Users size={12} />
          <span>Their Teams &amp; Rosters ({otherLeagues.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('trades')}
          className={subTab === 'trades' ? 'selected' : ''}
        >
          <Repeat size={12} />
          <span>Their Trades Across Leagues ({crossTrades.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('waivers')}
          className={subTab === 'waivers' ? 'selected' : ''}
        >
          <ShoppingCart size={12} />
          <span>Their Waiver Moves &amp; FAAB ({crossWaivers.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', font: '12px var(--mono)', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <Loader2 size={18} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
          <span>Stalking {targetUser.display_name}'s other leagues, draft boards, and trade logs…</span>
        </div>
      ) : (
        <>
          {/* 1. DRAFT BOARDS IN THEIR OTHER LEAGUES */}
          {subTab === 'other_drafts' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px', width: '100%' }}>
              {otherLeagues
                .filter((l) => l.draftId)
                .map((l) => {
                  const isCurrent = l.leagueId === currentLeagueId;
                  return (
                    <div
                      key={`${l.leagueId}-${l.draftId}`}
                      style={{
                        background: 'var(--surface)',
                        border: isCurrent ? '1px solid var(--accent-border)' : '1px solid var(--line)',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <strong style={{ font: '600 13px var(--display)', color: 'var(--ink)' }}>{l.name}</strong>
                          <span className={l.isDynasty ? 'badge-dynasty' : 'badge-redraft'}>
                            {l.isDynasty ? 'Dynasty' : 'Redraft'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 6px', font: '11px var(--mono)', color: 'var(--muted)' }}>
                          Season {l.season} · {l.totalTeams} Teams · {l.scoringType}
                        </p>
                        {l.record && (
                          <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--accent-text)', background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: '4px' }}>
                            Record: {l.record.wins}–{l.record.losses} ({l.teamName})
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenDraftBoard(l.draftId, `${l.name} (${l.season})`, l.totalTeams)}
                        className="action-btn active"
                        style={{ width: '100%', justifyContent: 'center', padding: '7px 12px' }}
                      >
                        <LayoutGrid size={12} />
                        <span>Inspect Draft Board</span>
                      </button>
                    </div>
                  );
                })}
              {otherLeagues.filter((l) => l.draftId).length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '12px', padding: '20px' }}>No draft records found for this manager.</p>
              )}
            </div>
          )}

          {/* 2. TEAMS & ROSTERS ACROSS LEAGUES */}
          {subTab === 'teams' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', width: '100%' }}>
              {otherLeagues.map((l) => (
                <div
                  key={l.leagueId}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ font: '600 13px var(--display)', color: 'var(--ink)' }}>{l.name}</strong>
                      <div style={{ font: '11px var(--mono)', color: 'var(--muted)', marginTop: '2px' }}>
                        {l.teamName} {l.record ? `(${l.record.wins}–${l.record.losses})` : ''} · {l.season}
                      </div>
                    </div>
                    <span className={l.isDynasty ? 'badge-dynasty' : 'badge-redraft'}>
                      {l.isDynasty ? 'Dynasty' : 'Redraft'}
                    </span>
                  </div>

                  <div>
                    <div style={{ font: '600 10px var(--mono)', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Rostered Players ({l.rosterPlayerIds?.length || 0}):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '160px', overflowY: 'auto' }}>
                      {l.rosterPlayerIds?.map((pid) => {
                        const player = playersMap[pid];
                        return (
                          <span
                            key={pid}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--surface-raised)',
                              border: '1px solid var(--line)',
                              font: '10px var(--mono)',
                              color: 'var(--ink-secondary)',
                            }}
                          >
                            {player ? `${player.full_name} (${player.position})` : `Player ${pid}`}
                          </span>
                        );
                      })}
                      {(!l.rosterPlayerIds || l.rosterPlayerIds.length === 0) && (
                        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Roster unavailable.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. TRADES ACROSS LEAGUES */}
          {subTab === 'trades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {crossTrades.map((t) => {
                const addedIds = t.adds ? Object.keys(t.adds) : [];
                const droppedIds = t.drops ? Object.keys(t.drops) : [];
                return (
                  <div
                    key={t.transaction_id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ font: '700 11px var(--mono)', color: 'var(--accent-text)' }}>
                          {t.leagueName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>· Week {t.leg} Trade</span>
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
                            {dp.season} Round {dp.round} Pick
                          </div>
                        ))}
                        {addedIds.length === 0 && !t.draft_picks?.length && <span style={{ color: 'var(--muted)' }}>—</span>}
                      </div>

                      <div style={{ padding: '8px', background: 'var(--surface-raised)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        <div style={{ font: '600 10px var(--mono)', color: 'var(--unlucky-text)', marginBottom: '4px' }}>
                          TRADED AWAY (-)
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
              {crossTrades.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  No trade transactions found across their leagues.
                </div>
              )}
            </div>
          )}

          {/* 4. WAIVERS & FAAB ACROSS LEAGUES */}
          {subTab === 'waivers' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="th-rank">Week</th>
                    <th>League</th>
                    <th>Player Claimed (Add)</th>
                    <th>Player Dropped</th>
                    <th>FAAB Bid</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {crossWaivers.slice(0, 50).map((w) => {
                    const addedId = w.adds ? Object.keys(w.adds)[0] : null;
                    const droppedId = w.drops ? Object.keys(w.drops)[0] : null;
                    const bid = w.settings?.waiver_bid ?? 0;
                    const isSuccess = w.status === 'complete';

                    return (
                      <tr key={w.transaction_id}>
                        <td className="th-rank" style={{ fontFamily: 'var(--mono)' }}>
                          W{w.leg}
                        </td>
                        <td style={{ color: 'var(--ink-secondary)', fontWeight: 600 }}>
                          {w.leagueName}
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
                  {crossWaivers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        No waiver moves logged across their leagues.
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
