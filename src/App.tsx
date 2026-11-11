import { useState, useEffect } from 'react';
import { AlertCircle, Search, Users, Target, History, LayoutGrid, Loader2, Compass, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
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
  getNFLState,
} from './services/sleeperApi';
import { buildManagerDossier } from './services/analyzer';
import { DraftBoardModal } from './components/DraftBoardModal';
import './App.css';

const SAMPLE_USERS = ['matt', 'andy', 'jason'];

export function App() {
  const [usernameInput, setUsernameInput] = useState('matt');
  const [currentUser, setCurrentUser] = useState<SleeperUser | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['2025', '2024', '2023', '2022']);
  const [selectedSeason, setSelectedSeason] = useState('2025');
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

  // Initial load: dynamically detect current NFL season
  useEffect(() => {
    async function init() {
      try {
        const nflState = await getNFLState();
        const curYear = parseInt(nflState.season || '2025', 10);
        const dynamicSeasons = [
          String(curYear),
          String(curYear - 1),
          String(curYear - 2),
          String(curYear - 3),
          String(curYear - 4),
        ];
        const unique = Array.from(new Set(dynamicSeasons));
        setAvailableSeasons(unique);
        setSelectedSeason(String(curYear));
        await handleSearch('matt', String(curYear), unique);
      } catch {
        handleSearch('matt', '2025', ['2025', '2024', '2023', '2022']);
      }
    }
    init();
  }, []);

  const handleSearch = async (username: string, season: string, seasonList?: string[]) => {
    if (!username.trim()) return;
    try {
      setErrorMsg(null);
      setIsLoadingUser(true);
      setSelectedLeague(null);
      setSelectedOpponent(null);
      setScoutProfile(null);

      const user = await getSleeperUser(username);
      setCurrentUser(user);

      let userLeagues = await getUserLeagues(user.user_id, season);

      // If no leagues in this season, search other seasons
      if (userLeagues.length === 0 && seasonList && seasonList.length > 0) {
        for (const s of seasonList) {
          if (s !== season) {
            const check = await getUserLeagues(user.user_id, s);
            if (check.length > 0) {
              userLeagues = check;
              setSelectedSeason(s);
              break;
            }
          }
        }
      }

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

      const seasonsToScan = availableSeasons.slice(0, 4);
      const draftFetches = seasonsToScan.map((s) =>
        getUserDrafts(targetUser.user_id, s).catch(() => [] as SleeperDraft[])
      );

      const draftsBySeason = await Promise.all(draftFetches);
      const allDrafts = draftsBySeason
        .flat()
        .filter((d) => d.status === 'complete' || d.status === 'drafting');

      const targetDrafts = allDrafts.slice(0, 8);
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

  const filteredUsers = leagueUsers.filter((u) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const name = u.display_name.toLowerCase();
    const handle = (u.username || '').toLowerCase();
    const team = (u.metadata?.team_name || '').toLowerCase();
    return name.includes(term) || handle.includes(term) || team.includes(term);
  });

  return (
    <main className="app-shell">
      {/* TOPBAR */}
      <header className="topbar">
        <a href="./" className="brand" title="Fantasy Stalker">
          <span className="brand-mark">FS</span>
          <span>
            FANTASY<span className="brand-light">STALKER</span>
          </span>
        </a>

        <div className="topbar-right">
          <span className="season-label">NFL {selectedSeason}</span>
          <span className="live-dot" />
          <span className="live-label">LIVE DATA</span>
        </div>
      </header>

      {/* INTRO HERO */}
      <section className="intro">
        <div>
          <p className="eyebrow">
            SLEEPER DRAFT INTELLIGENCE <span>·</span> {selectedLeague ? selectedLeague.name.toUpperCase() : 'SCOUTING DOSSIER'}
          </p>
          <h1>
            Who did they draft? <em>How do they draft?</em>
          </h1>
          <p className="intro-copy">
            Scout your league mates' past drafts, positional tendencies, early round reaches, and favorite NFL teams across Sleeper leagues.
          </p>
        </div>

        <div className="league-control">
          <label htmlFor="sleeper-user">SLEEPER USERNAME</label>
          <div className="league-input-row">
            <input
              id="sleeper-user"
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="e.g. matt"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(usernameInput, selectedSeason)}
              disabled={isLoadingUser}
            />
            <select
              value={selectedSeason}
              onChange={(e) => {
                setSelectedSeason(e.target.value);
                handleSearch(usernameInput, e.target.value);
              }}
              className="season-select"
              aria-label="Select season"
            >
              {availableSeasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleSearch(usernameInput, selectedSeason)}
              disabled={isLoadingUser}
              className="refresh-button"
            >
              <RefreshCw size={13} className={isLoadingUser ? 'spin' : ''} />
              <span>{isLoadingUser ? 'Loading…' : 'Scan'}</span>
            </button>
          </div>
          <div className="refresh-meta">
            <span>Try sample scouts:</span>
            {SAMPLE_USERS.map((user) => (
              <button
                key={user}
                type="button"
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
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)}>Dismiss</button>
        </div>
      )}

      {/* SUMMARY STRIP (4 KPIS) */}
      <section className="summary-strip" aria-label="Overview Strip">
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
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>SELECT LEAGUE:</span>
          {leagues.map((l) => (
            <button
              key={l.league_id}
              type="button"
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
            <p className="eyebrow">
              {activeTab === 'opponents' && 'LEAGUE OPPONENTS'}
              {activeTab === 'dossier' && 'MANAGER SCOUTING DOSSIER'}
              {activeTab === 'picks' && 'HISTORICAL PICK LOG'}
              {activeTab === 'draftboard' && 'DRAFT BOARD MATRIX'}
              <span>·</span> {selectedLeague ? `${selectedLeague.total_rosters} TEAMS` : 'SCOUTING'}
            </p>
            <h2>
              {activeTab === 'opponents' && 'League Opponents & Draft Profiles'}
              {activeTab === 'dossier' && `Scouting Dossier: ${selectedOpponent?.display_name || ''}`}
              {activeTab === 'picks' && `Historical Picks: ${selectedOpponent?.display_name || ''}`}
              {activeTab === 'draftboard' && `${selectedLeague?.name || ''} Draft Board`}
            </h2>
          </div>

          <div className="board-tools">
            <div className="search-box">
              <Search size={14} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter managers…"
              />
            </div>

            <div className="view-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('opponents')}
                className={activeTab === 'opponents' ? 'selected' : ''}
              >
                <Users size={12} />
                <span>Opponents</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dossier')}
                className={activeTab === 'dossier' ? 'selected' : ''}
              >
                <Target size={12} />
                <span>Dossier</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('picks')}
                className={activeTab === 'picks' ? 'selected' : ''}
              >
                <History size={12} />
                <span>Pick Log</span>
              </button>
              {selectedLeague?.draft_id && (
                <button
                  type="button"
                  onClick={() => setIsDraftBoardModalOpen(true)}
                  className="selected"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--accent-border)' }}
                >
                  <LayoutGrid size={12} />
                  <span>Draft Board</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: OPPONENTS */}
        {activeTab === 'opponents' && (
          <>
            {/* Desktop Full Table View (>= 820px) */}
            <div className="desktop-table-view">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="th-rank">#</th>
                      <th>MANAGER / FRANCHISE</th>
                      <th>RECORD</th>
                      <th>SCOUTING ACTION</th>
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
                                loading="lazy"
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
                            {roster ? `${roster.settings.wins}–${roster.settings.losses}` : '—'}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                handleScoutOpponent(u);
                                setActiveTab('dossier');
                              }}
                              className={`action-btn ${isSelected ? 'active' : ''}`}
                            >
                              {isScoutingOpponent && isSelected ? (
                                <>
                                  <Loader2 size={12} className="spin" />
                                  <span>Analyzing…</span>
                                </>
                              ) : (
                                <>
                                  <Target size={12} />
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
            </div>

            {/* Mobile Adaptive Cards View (<= 820px, NO HORIZONTAL SCROLLING) */}
            <div className="mobile-cards-view">
              <div className="m-standings-card-list">
                {filteredUsers.map((u, idx) => {
                  const roster = rosterMap.get(u.user_id);
                  const isSelected = u.user_id === selectedOpponent?.user_id;

                  return (
                    <div key={u.user_id} className="m-standings-card">
                      <div className="m-card-header">
                        <div className="m-card-identity">
                          <span className="m-card-rank">#{idx + 1}</span>
                          <img
                            src={getAvatarUrl(u.avatar)}
                            alt={u.display_name}
                            className="team-avatar"
                            loading="lazy"
                          />
                          <div className="team-meta">
                            <span className="team-title">{u.display_name}</span>
                            <span className="team-sub">@{u.username || 'user'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleScoutOpponent(u);
                            setActiveTab('dossier');
                          }}
                          className={`action-btn ${isSelected ? 'active' : ''}`}
                        >
                          <Target size={12} />
                          <span>Scout</span>
                        </button>
                      </div>

                      <div className="m-card-metrics-grid">
                        <div className="m-metric-cell">
                          <span className="m-metric-label">RECORD</span>
                          <span className="m-metric-val">
                            {roster ? `${roster.settings.wins}–${roster.settings.losses}` : '—'}
                          </span>
                        </div>
                        <div className="m-metric-cell">
                          <span className="m-metric-label">TEAM</span>
                          <span className="m-metric-val">{u.metadata?.team_name || 'Team'}</span>
                        </div>
                        <div className="m-metric-cell">
                          <span className="m-metric-label">STATUS</span>
                          <span className="m-metric-val">{isSelected ? 'Active Target' : 'Ready'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
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
                      <Target size={14} style={{ color: 'var(--lucky-text)' }} />
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
                    <Compass size={13} />
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
                      <Sparkles size={14} style={{ color: '#fbbf24' }} />
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
                    <ShieldAlert size={13} style={{ color: 'var(--accent-text)' }} />
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
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-view">
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
            </div>

            {/* Mobile Cards View (NO HORIZONTAL SCROLL) */}
            <div className="mobile-cards-view">
              <div className="m-standings-card-list">
                {scoutProfile.draftHistory.slice(0, 30).map((pick, pIdx) => {
                  const fullName = `${pick.metadata?.first_name || ''} ${pick.metadata?.last_name || ''}`.trim() || 'Unknown';
                  const pos = (pick.metadata?.position || 'FLEX').toUpperCase();

                  return (
                    <div key={`${pick.draft_id}-${pick.pick_no}-${pIdx}`} className="m-standings-card">
                      <div className="m-card-header">
                        <div>
                          <span style={{ font: '700 13px var(--mono)', color: 'var(--accent-text)', marginRight: '8px' }}>
                            R{pick.round}.{pick.pick_no}
                          </span>
                          <strong style={{ font: '600 13px var(--display)', color: 'var(--ink)' }}>{fullName}</strong>
                        </div>
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
                      </div>

                      <div className="m-card-metrics-grid">
                        <div className="m-metric-cell">
                          <span className="m-metric-label">TEAM</span>
                          <span className="m-metric-val">{pick.metadata?.team || 'FA'}</span>
                        </div>
                        <div className="m-metric-cell">
                          <span className="m-metric-label">SEASON</span>
                          <span className="m-metric-val">{pick.season || selectedSeason}</span>
                        </div>
                        <div className="m-metric-cell">
                          <span className="m-metric-label">DRAFT</span>
                          <span className="m-metric-val" title={pick.draftName || 'Draft'}>
                            {pick.draftName ? pick.draftName.slice(0, 10) : 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
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
    </main>
  );
}

export default App;
