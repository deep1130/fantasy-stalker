import { useState, useEffect } from 'react';
import { AlertCircle, Search, Users, Target, History, LayoutGrid, Loader2, Compass, ShieldAlert, Sparkles } from 'lucide-react';
import {
  SleeperUser,
  SleeperLeague,
  SleeperLeagueUser,
  SleeperRoster,
  ManagerScoutProfile,
  SleeperDraft,
  SleeperDraftPick,
} from './types/sleeper';
import {
  getSleeperUser,
  getUserLeagues,
  getLeagueUsers,
  getLeagueRosters,
  getUserDrafts,
  getDraftPicks,
  getAvatarUrl,
} from './services/sleeperApi';
import { buildManagerDossier } from './services/analyzer';
import { DraftBoardModal } from './components/DraftBoardModal';
import './App.css';

const SAMPLE_USERS = ['matt', 'andy', 'jason'];

export function App() {
  const [usernameInput, setUsernameInput] = useState('matt');
  const [currentUser, setCurrentUser] = useState<SleeperUser | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('2024');
  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<SleeperLeague | null>(null);

  const [leagueUsers, setLeagueUsers] = useState<SleeperLeagueUser[]>([]);
  const [leagueRosters, setLeagueRosters] = useState<SleeperRoster[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<SleeperLeagueUser | null>(null);
  const [scoutProfile, setScoutProfile] = useState<ManagerScoutProfile | null>(null);

  const [activeTab, setActiveTab] = useState<'opponents' | 'dossier' | 'picks' | 'draftboard'>('opponents');
  const [searchFilter, setSearchFilter] = useState('');
  const [isDraftBoardModalOpen, setIsDraftBoardModalOpen] = useState(false);

  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isScoutingOpponent, setIsScoutingOpponent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    handleSearch('matt', '2024');
  }, []);

  const handleSearch = async (username: string, season: string) => {
    if (!username.trim()) return;
    try {
      setErrorMsg(null);
      setIsLoadingUser(true);
      setSelectedLeague(null);
      setSelectedOpponent(null);
      setScoutProfile(null);

      const user = await getSleeperUser(username);
      setCurrentUser(user);

      const userLeagues = await getUserLeagues(user.user_id, season);
      setLeagues(userLeagues);

      if (userLeagues.length > 0) {
        await handleSelectLeague(userLeagues[0], user.user_id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error fetching Sleeper data');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleSelectLeague = async (league: SleeperLeague, currentUserId?: string) => {
    try {
      setSelectedLeague(league);
      const [users, rosters] = await Promise.all([
        getLeagueUsers(league.league_id),
        getLeagueRosters(league.league_id),
      ]);
      setLeagueUsers(users);
      setLeagueRosters(rosters);

      // Auto-scout first opponent
      const target = users.find((u) => u.user_id !== (currentUserId || currentUser?.user_id)) || users[0];
      if (target) {
        handleScoutOpponent(target);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading league details');
    }
  };

  const handleScoutOpponent = async (targetUser: SleeperLeagueUser) => {
    try {
      setSelectedOpponent(targetUser);
      setIsScoutingOpponent(true);
      setErrorMsg(null);

      const [drafts2024, drafts2023] = await Promise.all([
        getUserDrafts(targetUser.user_id, '2024').catch(() => [] as SleeperDraft[]),
        getUserDrafts(targetUser.user_id, '2023').catch(() => [] as SleeperDraft[]),
      ]);

      const allDrafts = [...drafts2024, ...drafts2023].filter(
        (d) => d.status === 'complete' || d.status === 'drafting'
      );

      const targetDrafts = allDrafts.slice(0, 6);
      const draftsWithPicks = await Promise.all(
        targetDrafts.map(async (draft) => {
          try {
            const picks = await getDraftPicks(draft.draft_id);
            return { draft, picks };
          } catch {
            return { draft, picks: [] as SleeperDraftPick[] };
          }
        })
      );

      const profile = buildManagerDossier(targetUser, draftsWithPicks);
      setScoutProfile(profile);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to scout manager');
    } finally {
      setIsScoutingOpponent(false);
    }
  };

  const rosterMap = new Map<string, SleeperRoster>();
  for (const r of leagueRosters) {
    if (r.owner_id) rosterMap.set(r.owner_id, r);
  }

  // Filtered opponents
  const filteredUsers = leagueUsers.filter((u) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const name = u.display_name.toLowerCase();
    const handle = (u.username || '').toLowerCase();
    const team = (u.metadata?.team_name || '').toLowerCase();
    return name.includes(term) || handle.includes(term) || team.includes(term);
  });

  return (
    <div className="app-shell">
      {/* TOPBAR */}
      <header className="topbar">
        <a href="./" className="brand">
          <span className="brand-mark">FS</span>
          <span>
            FANTASY STALKER <span className="brand-light">· SLEEPER DRAFT SCOUT</span>
          </span>
        </a>

        <div className="topbar-right">
          <span className="season-label">NFL {selectedSeason}</span>
          <span className="live-dot" />
          <span className="live-label">PUBLIC SLEEPER API</span>
        </div>
      </header>

      {/* INTRO HERO */}
      <section className="intro">
        <div>
          <p className="eyebrow">
            SLEEPER DRAFT INTELLIGENCE <span>//</span> OPPONENT SCOUTING DOSSIER
          </p>
          <h1>
            Who did they draft? <em>How do they draft?</em>
          </h1>
          <p className="intro-copy">
            Scout your league mates' past drafts, positional tendencies, early round reaches, and favorite NFL teams across Sleeper leagues.
          </p>
        </div>

        <div className="league-control">
          <label>Sleeper Username</label>
          <div className="league-input-row">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="e.g. matt"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(usernameInput, selectedSeason)}
            />
            <select
              value={selectedSeason}
              onChange={(e) => {
                setSelectedSeason(e.target.value);
                handleSearch(usernameInput, e.target.value);
              }}
              className="season-select"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
            <button
              onClick={() => handleSearch(usernameInput, selectedSeason)}
              disabled={isLoadingUser}
              className="refresh-button"
            >
              {isLoadingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'SCAN LEAGUES'}
            </button>
          </div>
          <div className="refresh-meta">
            <span>Try sample scouts:</span>
            {SAMPLE_USERS.map((user) => (
              <button
                key={user}
                onClick={() => {
                  setUsernameInput(user);
                  handleSearch(user, selectedSeason);
                }}
                className="sample-user-btn"
              >
                @{user}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="error-banner">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SUMMARY STRIP (4 KPIS) */}
      <section className="summary-strip">
        <div className="summary-item">
          <span className="summary-label">ACTIVE LEAGUES</span>
          <strong>{leagues.length} Leagues</strong>
          <span className="summary-note">Season {selectedSeason}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">TARGET OPPONENT</span>
          <strong>{selectedOpponent ? selectedOpponent.display_name : 'None Selected'}</strong>
          <span className="summary-note">@{selectedOpponent?.username || '—'}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">DRAFT DNA ARCHETYPE</span>
          <strong>
            {scoutProfile?.dnaBadges[0] ? (
              <span className="kpi-luck-badge accent">{scoutProfile.dnaBadges[0].title}</span>
            ) : (
              <span className="summary-muted">Analyzing...</span>
            )}
          </strong>
          <span className="summary-note">{scoutProfile?.dnaBadges[0]?.desc || 'Draft tendencies'}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">PRIMARY POSITIONAL BIAS</span>
          <strong>
            {scoutProfile?.positionStats[0] ? (
              <>
                <span className="kpi-luck-badge positive">{scoutProfile.positionStats[0].position}</span>
                <span>{scoutProfile.positionStats[0].percentage}%</span>
              </>
            ) : (
              <span className="summary-muted">—</span>
            )}
          </strong>
          <span className="summary-note">{scoutProfile?.totalPicksAnalyzed || 0} picks analyzed</span>
        </div>
      </section>

      {/* LEAGUE SELECTOR PILLS */}
      {leagues.length > 1 && (
        <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>SELECT LEAGUE:</span>
          {leagues.map((l) => (
            <button
              key={l.league_id}
              onClick={() => handleSelectLeague(l)}
              className={`action-btn ${l.league_id === selectedLeague?.league_id ? 'active' : ''}`}
            >
              {l.name} ({l.total_rosters} Teams)
            </button>
          ))}
        </div>
      )}

      {/* MAIN BOARD SECTION */}
      <section>
        <div className="section-heading">
          <div>
            <h2>{selectedLeague?.name || 'League Opponents & Draft Dossier'}</h2>
            <p>
              {selectedLeague ? `${selectedLeague.total_rosters} Teams · Status: ${selectedLeague.status}` : 'Select a league to begin scouting'}
            </p>
          </div>

          <div className="board-tools">
            <div className="search-box">
              <Search className="w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter managers..."
              />
            </div>

            <div className="view-tabs">
              <button
                onClick={() => setActiveTab('opponents')}
                className={activeTab === 'opponents' ? 'selected' : ''}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Opponents</span>
              </button>
              <button
                onClick={() => setActiveTab('dossier')}
                className={activeTab === 'dossier' ? 'selected' : ''}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Scout Dossier</span>
              </button>
              <button
                onClick={() => setActiveTab('picks')}
                className={activeTab === 'picks' ? 'selected' : ''}
              >
                <History className="w-3.5 h-3.5" />
                <span>Pick Log</span>
              </button>
              {selectedLeague?.draft_id && (
                <button
                  onClick={() => setIsDraftBoardModalOpen(true)}
                  className="selected"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Draft Board</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: OPPONENTS TABLE */}
        {activeTab === 'opponents' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th-rank">#</th>
                  <th>Manager / Team</th>
                  <th>Record</th>
                  <th>Draft Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const roster = rosterMap.get(u.user_id);
                  const isSelected = u.user_id === selectedOpponent?.user_id;

                  return (
                    <tr key={u.user_id} className={isSelected ? 'selected-row' : ''}>
                      <td className="th-rank" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div className="team-cell">
                          <img
                            src={getAvatarUrl(u.avatar)}
                            alt={u.display_name}
                            className="team-avatar"
                          />
                          <div className="team-meta">
                            <span className="team-title">{u.display_name}</span>
                            <span className="team-sub">
                              @{u.username || 'user'} · {u.metadata?.team_name || 'Team'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--ink-secondary)' }}>
                        {roster ? `${roster.settings.wins}-${roster.settings.losses}` : '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            handleScoutOpponent(u);
                            setActiveTab('dossier');
                          }}
                          className={`action-btn ${isSelected ? 'active' : ''}`}
                        >
                          {isScoutingOpponent && isSelected ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Scouting...</span>
                            </>
                          ) : (
                            <>
                              <Target className="w-3 h-3" />
                              <span>{isSelected ? 'View Dossier' : 'Scout Opponent'}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DOSSIER VIEW */}
        {activeTab === 'dossier' && scoutProfile && (
          <div>
            <div className="dossier-grid">
              {/* Card 1: Positional Allocation */}
              <div className="dossier-card">
                <div>
                  <div className="dossier-card-title">
                    <h3>
                      <Target className="w-4 h-4 text-emerald-400" />
                      <span>Positional Allocation</span>
                    </h3>
                    <span>{scoutProfile.totalPicksAnalyzed} Picks</span>
                  </div>

                  <div className="position-bar-wrap">
                    {scoutProfile.positionStats.map((s) => (
                      <div
                        key={s.position}
                        style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                        title={`${s.position}: ${s.percentage}%`}
                      />
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {scoutProfile.positionStats.map((st) => (
                      <div
                        key={st.position}
                        style={{
                          padding: '10px',
                          background: 'var(--surface-raised)',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: st.color }}>{st.position}</span>
                        <span style={{ color: 'var(--ink)' }}>{st.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tactical-box">
                  <div className="tactical-box-header">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Tactical Exploitation Advice</span>
                  </div>
                  <ul>
                    {scoutProfile.scoutingNotes.map((note, nIdx) => (
                      <li key={nIdx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card 2: Draft Crushes & Early Rounds */}
              <div className="dossier-card">
                <div>
                  <div className="dossier-card-title">
                    <h3>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Rounds 1–3 Tendencies</span>
                    </h3>
                    <span>Early Capital</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {scoutProfile.earlyRoundPicks.slice(0, 5).map((ep, eIdx) => (
                      <div
                        key={eIdx}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--surface-raised)',
                          borderRadius: '6px',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: '10px',
                              background: 'var(--control)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              marginRight: '8px',
                            }}
                          >
                            R{ep.round}
                          </span>
                          <strong style={{ color: 'var(--ink)' }}>{ep.player}</strong>
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--accent-text)' }}>
                          {ep.position} · {ep.team}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team bias */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    <span style={{ font: '600 12px var(--display)', color: 'var(--ink)' }}>Favorite NFL Franchises:</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {scoutProfile.favoriteTeams.map((ft) => (
                      <span
                        key={ft.team}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: 'var(--surface-raised)',
                          border: '1px solid var(--line)',
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          color: 'var(--ink-secondary)',
                        }}
                      >
                        {ft.team} ({ft.count} picks)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMPLETE PICK LOG */}
        {activeTab === 'picks' && scoutProfile && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th-rank">Round / Pick</th>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Team</th>
                  <th>Draft / League</th>
                  <th style={{ textAlign: 'right' }}>Season</th>
                </tr>
              </thead>
              <tbody>
                {scoutProfile.draftHistory.map((pick, pIdx) => {
                  const fullName = `${pick.metadata?.first_name || ''} ${pick.metadata?.last_name || ''}`.trim() || 'Unknown';
                  const pos = (pick.metadata?.position || 'FLEX').toUpperCase();

                  return (
                    <tr key={`${pick.draft_id}-${pick.pick_no}-${pIdx}`}>
                      <td className="th-rank" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                        R{pick.round} (#{pick.pick_no})
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {fullName}
                        {pick.is_keeper && (
                          <span
                            style={{
                              marginLeft: '6px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'var(--accent-soft)',
                              color: 'var(--accent-text)',
                              fontSize: '9px',
                              fontFamily: 'var(--mono)',
                            }}
                          >
                            KEEPER
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontFamily: 'var(--mono)',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: 'var(--surface-raised)',
                            border: '1px solid var(--line)',
                            color: pos === 'RB' ? '#60a5fa' : pos === 'WR' ? '#34d399' : pos === 'QB' ? '#fbbf24' : '#f97316',
                          }}
                        >
                          {pos}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--ink-secondary)' }}>
                        {pick.metadata?.team || 'FA'}
                      </td>
                      <td style={{ color: 'var(--muted)' }}>
                        {pick.draftName || 'Draft'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                        {pick.season || selectedSeason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* DRAFT BOARD MODAL */}
      {isDraftBoardModalOpen && selectedLeague && (
        <DraftBoardModal
          league={selectedLeague}
          users={leagueUsers}
          highlightUserId={selectedOpponent?.user_id || null}
          onClose={() => setIsDraftBoardModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
