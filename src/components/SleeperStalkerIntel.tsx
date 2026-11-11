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
  getAvatarUrl,
} from '../services/sleeperApi';
import { fetchSleeperPlayers, SleeperPlayer } from '../services/sleeperPlayers';

interface SleeperStalkerIntelProps {
  targetUser: SleeperLeagueUser;
  currentLeagueId: string;
  availableSeasons: string[];
  leagueUsers?: SleeperLeagueUser[];
  onSelectTargetUser?: (user: SleeperLeagueUser) => void;
  onOpenDraftBoard: (draftId: string, title: string, teams?: number, rounds?: number) => void;
}

export const SleeperStalkerIntel: React.FC<SleeperStalkerIntelProps> = ({
  targetUser,
  currentLeagueId,
  availableSeasons,
  leagueUsers,
  onSelectTargetUser,
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

              // Weekly transactions
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
    return p ? `${p.full_name} (${p.position})` : `Player #${id}`;
  };

  const draftableLeagues = otherLeagues.filter((l) => l.draftId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Target Rival Focus Banner */}
      <div className="manager-focus-header">
        <div className="manager-focus-left">
          <img
            src={getAvatarUrl(targetUser.avatar)}
            alt={targetUser.display_name}
            className="manager-focus-avatar"
          />
          <div className="manager-focus-details">
            <h3>{targetUser.display_name}</h3>
            <p>
              @{targetUser.username || 'user'} · {targetUser.metadata?.team_name || 'Team'}
              <span style={{ color: 'var(--accent-text)', marginLeft: '8px' }}>
                ({otherLeagues.length} Leagues Found · {draftableLeagues.length} Draft Boards)
              </span>
            </p>
          </div>
        </div>

        {leagueUsers && onSelectTargetUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>STALK ANOTHER:</span>
            <select
              value={targetUser.user_id}
              onChange={(e) => {
                const found = leagueUsers.find((u) => u.user_id === e.target.value);
                if (found) onSelectTargetUser(found);
              }}
              className="season-select"
              style={{ width: '140px', height: '32px', borderRadius: '5px', border: '1px solid var(--line)' }}
              aria-label="Select league mate to stalk"
            >
              {leagueUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="view-tabs" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setSubTab('other_drafts')}
          className={subTab === 'other_drafts' ? 'selected' : ''}
        >
          <LayoutGrid size={12} />
          <span>Draft Boards ({draftableLeagues.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('teams')}
          className={subTab === 'teams' ? 'selected' : ''}
        >
          <Users size={12} />
          <span>Rosters ({otherLeagues.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('trades')}
          className={subTab === 'trades' ? 'selected' : ''}
        >
          <Repeat size={12} />
          <span>Trades ({crossTrades.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('waivers')}
          className={subTab === 'waivers' ? 'selected' : ''}
        >
          <ShoppingCart size={12} />
          <span>Waivers &amp; FAAB ({crossWaivers.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--muted)', font: '12px var(--mono)', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--line)' }}>
          <Loader2 size={18} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
          <span>Stalking {targetUser.display_name}&apos;s other leagues, draft boards, and trade logs…</span>
        </div>
      ) : (
        <>
          {/* 1. DRAFT BOARDS IN THEIR OTHER LEAGUES */}
          {subTab === 'other_drafts' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px', width: '100%' }}>
              {draftableLeagues.map((l) => {
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
              {draftableLeagues.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '12px', padding: '20px' }}>No draft records found for this manager.</p>
              )}
            </div>
          )}

          {/* 2. TEAMS & ROSTERS ACROSS LEAGUES */}
          {subTab === 'teams' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', width: '100%' }}>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '140px', overflowY: 'auto' }}>
                      {l.rosterPlayerIds?.map((pid) => (
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
                          {getPlayerLabel(pid)}
                        </span>
                      ))}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ font: '600 12px var(--display)', color: 'var(--ink)' }}>{t.leagueName}</span>
                      <span style={{ font: '10px var(--mono)', color: 'var(--muted)' }}>
                        Trade #{t.transaction_id.slice(-6)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      <div style={{ background: 'var(--surface-raised)', padding: '8px 10px', borderRadius: '5px' }}>
                        <span style={{ font: '600 10px var(--mono)', color: 'var(--lucky-text)', display: 'block', marginBottom: '4px' }}>
                          + PLAYERS ACQUIRED:
                        </span>
                        {addedIds.map((id) => (
                          <div key={id} style={{ font: '11px var(--mono)', color: 'var(--ink)' }}>
                            {getPlayerLabel(id)}
                          </div>
                        ))}
                        {addedIds.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '10px' }}>Draft pick or FAAB</span>}
                      </div>

                      <div style={{ background: 'var(--surface-raised)', padding: '8px 10px', borderRadius: '5px' }}>
                        <span style={{ font: '600 10px var(--mono)', color: 'var(--unlucky-text)', display: 'block', marginBottom: '4px' }}>
                          - PLAYERS SENT:
                        </span>
                        {droppedIds.map((id) => (
                          <div key={id} style={{ font: '11px var(--mono)', color: 'var(--ink-secondary)' }}>
                            {getPlayerLabel(id)}
                          </div>
                        ))}
                        {droppedIds.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '10px' }}>Draft pick or FAAB</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {crossTrades.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '12px', padding: '20px' }}>No cross-league trades found.</p>
              )}
            </div>
          )}

          {/* 4. WAIVERS ACROSS LEAGUES */}
          {subTab === 'waivers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {crossWaivers.map((w) => {
                const addedIds = w.adds ? Object.keys(w.adds) : [];
                const droppedIds = w.drops ? Object.keys(w.drops) : [];
                const bid = w.settings?.waiver_bid;
                return (
                  <div
                    key={w.transaction_id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ font: '600 12px var(--display)', color: 'var(--ink)' }}>{w.leagueName}</div>
                      <div style={{ font: '11px var(--mono)', color: 'var(--lucky-text)', marginTop: '2px' }}>
                        Claimed: {addedIds.map((id) => getPlayerLabel(id)).join(', ') || 'None'}
                        {droppedIds.length > 0 && (
                          <span style={{ color: 'var(--muted)', marginLeft: '8px' }}>
                            (Dropped {droppedIds.map((id) => getPlayerLabel(id)).join(', ')})
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ font: '700 12px var(--mono)', color: bid ? '#fbbf24' : 'var(--muted)', background: 'var(--surface-raised)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                        {bid != null ? `$${bid} FAAB` : '$0 / Priority'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {crossWaivers.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '12px', padding: '20px' }}>No waiver moves logged.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
