import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  Users,
  Target,
  History,
  LayoutGrid,
  Loader2,
  Compass,
  ShieldAlert,
  RefreshCw,
  Zap,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  SleeperUser,
  SleeperLeague,
  SleeperLeagueUser,
  ManagerScoutProfile,
  SleeperDraft,
  SleeperDraftPick,
} from './types/sleeper';
import {
  getSleeperUser,
  getUserLeagues,
  getLeagueUsers,
  getUserDrafts,
  getDraftPicks,
  getAvatarUrl,
  getNFLState,
} from './services/sleeperApi';
import { buildManagerDossier } from './services/analyzer';
import { DraftBoardModal } from './components/DraftBoardModal';
import './App.css';

const SAMPLE_USERS = ['deep93', 'matt', 'andy', 'jason'];

export function App() {
  const [usernameInput, setUsernameInput] = useState('deep93');
  const [currentUser, setCurrentUser] = useState<SleeperUser | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['2025', '2024', '2023', '2022']);
  const [selectedSeason, setSelectedSeason] = useState('2024');
  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<SleeperLeague | null>(null);

  const [leagueUsers, setLeagueUsers] = useState<SleeperLeagueUser[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<SleeperLeagueUser | null>(null);
  const [scoutProfile, setScoutProfile] = useState<ManagerScoutProfile | null>(null);

  // League-wide map of scout profiles
  const [leagueProfiles, setLeagueProfiles] = useState<Map<string, ManagerScoutProfile>>(new Map());
  const [isAnalyzingLeague, setIsAnalyzingLeague] = useState(false);

  // Format filter: All, Redraft only, Dynasty only
  const [formatFilter, setFormatFilter] = useState<'all' | 'redraft' | 'dynasty'>('all');

  const [activeTab, setActiveTab] = useState<'league_report' | 'dossier' | 'picks' | 'draftboard'>('league_report');
  const [searchFilter, setSearchFilter] = useState('');
  const [isDraftBoardModalOpen, setIsDraftBoardModalOpen] = useState(false);

  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial load
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
        // Default to 2024 where Sunday Funday and completed leagues reside
        setSelectedSeason('2024');
        await handleSearch('deep93', '2024', unique);
      } catch {
        handleSearch('deep93', '2024', ['2025', '2024', '2023', '2022']);
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
      setLeagueProfiles(new Map());

      const user = await getSleeperUser(username);
      setCurrentUser(user);

      let userLeagues = await getUserLeagues(user.user_id, season);

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
        // Prioritize Sunday Funday if found
        const sundayFunday = userLeagues.find((l) => l.name.toLowerCase().includes('sunday funday')) || userLeagues[0];
        await handleSelectLeague(sundayFunday, user.user_id);
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
      setLeagueProfiles(new Map());
      const users = await getLeagueUsers(league.league_id);
      setLeagueUsers(users);

      // Select target opponent
      const target = users.find((u) => u.user_id !== (currentUserId || currentUser?.user_id)) || users[0];
      if (target) {
        setSelectedOpponent(target);
      }

      // Trigger league-wide intelligence analysis across all league members!
      analyzeEntireLeague(users);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading league details');
    }
  };

  // Analyze all league mates across all their drafts in parallel
  const analyzeEntireLeague = async (users: SleeperLeagueUser[]) => {
    try {
      setIsAnalyzingLeague(true);
      const seasonsToScan = availableSeasons.slice(0, 4);

      // 1. Gather all drafts for all users
      const userDraftsMap = new Map<string, SleeperDraft[]>();
      await Promise.all(
        users.map(async (u) => {
          try {
            const draftArrays = await Promise.all(
              seasonsToScan.map((s) => getUserDrafts(u.user_id, s).catch(() => [] as SleeperDraft[]))
            );
            const flat = draftArrays.flat().filter((d) => d.status === 'complete' || d.status === 'drafting');
            userDraftsMap.set(u.user_id, flat);
          } catch {
            userDraftsMap.set(u.user_id, []);
          }
        })
      );

      // 2. Fetch picks for the drafts & build a global consensus ADP map
      const draftPicksCache = new Map<string, SleeperDraftPick[]>();
      const allDraftIds = new Set<string>();
      for (const drafts of userDraftsMap.values()) {
        for (const d of drafts.slice(0, 4)) {
          allDraftIds.add(d.draft_id);
        }
      }

      await Promise.all(
        Array.from(allDraftIds).map(async (draftId) => {
          try {
            const picks = await getDraftPicks(draftId);
            draftPicksCache.set(draftId, picks);
          } catch {
            draftPicksCache.set(draftId, []);
          }
        })
      );

      // Calculate global consensus ADP
      const playerPicksSum = new Map<string, { total: number; count: number }>();
      for (const picks of draftPicksCache.values()) {
        for (const p of picks) {
          if (!p.player_id) continue;
          const cur = playerPicksSum.get(p.player_id) || { total: 0, count: 0 };
          cur.total += p.pick_no;
          cur.count += 1;
          playerPicksSum.set(p.player_id, cur);
        }
      }
      const globalAdp = new Map<string, number>();
      for (const [pid, data] of playerPicksSum.entries()) {
        globalAdp.set(pid, Math.round(data.total / data.count));
      }

      // 3. Build dossiers for each manager
      const profiles = new Map<string, ManagerScoutProfile>();
      for (const u of users) {
        const uDrafts = userDraftsMap.get(u.user_id) || [];
        const draftsWithPicks = uDrafts.slice(0, 5).map((d) => ({
          draft: d,
          picks: draftPicksCache.get(d.draft_id) || [],
        }));
        const profile = buildManagerDossier(u, draftsWithPicks, globalAdp, formatFilter);
        profiles.set(u.user_id, profile);
      }

      setLeagueProfiles(profiles);

      // Also set the single selected opponent dossier
      const firstTarget = users.find((u) => u.user_id !== currentUser?.user_id) || users[0];
      if (firstTarget && profiles.has(firstTarget.user_id)) {
        setScoutProfile(profiles.get(firstTarget.user_id)!);
      }
    } catch (err) {
      console.error('Failed league-wide analysis', err);
    } finally {
      setIsAnalyzingLeague(false);
    }
  };

  const handleScoutOpponent = async (targetUser: SleeperLeagueUser) => {
    setSelectedOpponent(targetUser);
    const existing = leagueProfiles.get(targetUser.user_id);
    if (existing) {
      setScoutProfile(existing);
      return;
    }

    try {
      setErrorMsg(null);
      const seasonsToScan = availableSeasons.slice(0, 4);
      const draftFetches = seasonsToScan.map((s) =>
        getUserDrafts(targetUser.user_id, s).catch(() => [] as SleeperDraft[])
      );
      const draftsBySeason = await Promise.all(draftFetches);
      const allDrafts = draftsBySeason.flat().filter((d) => d.status === 'complete' || d.status === 'drafting');
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
      const profile = buildManagerDossier(targetUser, draftsWithPicks, undefined, formatFilter);
      setScoutProfile(profile);
      setLeagueProfiles((prev) => new Map(prev).set(targetUser.user_id, profile));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to scout manager');
    }
  };

  const filteredUsers = useMemo(() => {
    return leagueUsers.filter((u) => {
      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase();
      const name = u.display_name.toLowerCase();
      const handle = (u.username || '').toLowerCase();
      const team = (u.metadata?.team_name || '').toLowerCase();
      return name.includes(term) || handle.includes(term) || team.includes(term);
    });
  }, [leagueUsers, searchFilter]);

  const isCurrentLeagueDynasty = selectedLeague?.settings?.type === 2;

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
            LEAGUE-WIDE DRAFT SCOUT <span>·</span> {selectedLeague ? selectedLeague.name.toUpperCase() : 'SCOUTING REPORT'}
          </p>
          <h1>
            Who did they draft? <em>How do they draft?</em>
          </h1>
          <p className="intro-copy">
            Analyze every manager in your league across all their Sleeper leagues. Uncover reach frequency against ADP, position timing, and Dynasty vs. Redraft habits.
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
              placeholder="e.g. deep93"
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
          <span className="summary-label">LEAGUE &amp; FORMAT</span>
          <strong>
            {selectedLeague?.name || 'No League Loaded'}
            {isCurrentLeagueDynasty ? (
              <span className="badge-dynasty">Dynasty</span>
            ) : (
              <span className="badge-redraft">Redraft</span>
            )}
          </strong>
          <span className="summary-note">
            {selectedLeague ? `${selectedLeague.total_rosters} Teams · Season ${selectedSeason}` : 'Enter Sleeper username'}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">LEAGUE-WIDE SCOUT STATUS</span>
          <strong>
            {isAnalyzingLeague ? (
              <span style={{ color: 'var(--accent-text)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={14} className="spin" /> Scanning all members…
              </span>
            ) : (
              `${leagueProfiles.size} Managers Profiled`
            )}
          </strong>
          <span className="summary-note">Scouted across all their past drafts</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">FOCUSED OPPONENT</span>
          <strong>{selectedOpponent ? selectedOpponent.display_name : 'Select Manager'}</strong>
          <span className="summary-note">
            {scoutProfile?.dnaBadges[0]?.title || 'Select a manager below'}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">REACH VS ADP FREQUENCY</span>
          <strong>
            {scoutProfile ? (
              <>
                <span className={`reach-pill ${scoutProfile.reachStats.reachRatePct >= 25 ? 'reach' : 'steal'}`}>
                  {scoutProfile.reachStats.reachRatePct}% Reaches
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  ({scoutProfile.reachStats.reachCount} reaches / {scoutProfile.reachStats.valueCount} steals)
                </span>
              </>
            ) : (
              <span className="summary-muted">—</span>
            )}
          </strong>
          <span className="summary-note">Based on consensus draft capital</span>
        </div>
      </section>

      {/* LEAGUE SELECTOR PILLS */}
      {leagues.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>SELECT LEAGUE:</span>
          {leagues.map((l) => {
            const isDyn = l.settings?.type === 2;
            const isSel = l.league_id === selectedLeague?.league_id;
            return (
              <button
                key={l.league_id}
                type="button"
                onClick={() => handleSelectLeague(l)}
                className={`action-btn ${isSel ? 'active' : ''}`}
              >
                <span>{l.name}</span>
                <span style={{ fontSize: '9px', opacity: 0.8 }}>({isDyn ? 'Dynasty' : 'Redraft'})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* FORMAT FILTER STRIP (REDRAFT VS DYNASTY) */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>EVALUATION SCOPE:</span>
        <div className="view-tabs">
          <button
            type="button"
            className={formatFilter === 'all' ? 'selected' : ''}
            onClick={() => {
              setFormatFilter('all');
              if (selectedOpponent) handleScoutOpponent(selectedOpponent);
            }}
          >
            All Formats
          </button>
          <button
            type="button"
            className={formatFilter === 'redraft' ? 'selected' : ''}
            onClick={() => {
              setFormatFilter('redraft');
              if (selectedOpponent) handleScoutOpponent(selectedOpponent);
            }}
          >
            Redraft Only
          </button>
          <button
            type="button"
            className={formatFilter === 'dynasty' ? 'selected' : ''}
            onClick={() => {
              setFormatFilter('dynasty');
              if (selectedOpponent) handleScoutOpponent(selectedOpponent);
            }}
          >
            Dynasty Only
          </button>
        </div>
      </div>

      {/* MAIN BOARD SECTION */}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {activeTab === 'league_report' && 'LEAGUE SCOUTING INTEL BOARD'}
              {activeTab === 'dossier' && 'MANAGER SCOUTING DOSSIER'}
              {activeTab === 'picks' && 'HISTORICAL PICK LOG'}
              <span>·</span> {selectedLeague ? `${selectedLeague.total_rosters} TEAMS` : 'SCOUTING'}
            </p>
            <h2>
              {activeTab === 'league_report' && `${selectedLeague?.name || 'League'} · Complete Scouting Report`}
              {activeTab === 'dossier' && `Deep Dossier: ${selectedOpponent?.display_name || ''}`}
              {activeTab === 'picks' && `Historical Picks: ${selectedOpponent?.display_name || ''}`}
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
                onClick={() => setActiveTab('league_report')}
                className={activeTab === 'league_report' ? 'selected' : ''}
              >
                <Users size={12} />
                <span>League Report</span>
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

        {/* TAB 1: LEAGUE-WIDE REPORT (ALL MANAGERS SCOUTED) */}
        {activeTab === 'league_report' && (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-view">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th className="th-rank">#</th>
                      <th>MANAGER / TEAM</th>
                      <th>DRAFT DNA ARCHETYPE</th>
                      <th>AVG QB1</th>
                      <th>AVG RB1</th>
                      <th>AVG TE1</th>
                      <th>REACH VS ADP</th>
                      <th>BIGGEST REACH</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => {
                      const profile = leagueProfiles.get(u.user_id);
                      const isSelected = u.user_id === selectedOpponent?.user_id;
                      const qb1 = profile?.positionTiming.qb1Round;
                      const rb1 = profile?.positionTiming.rb1Round;
                      const te1 = profile?.positionTiming.te1Round;
                      const topReach = profile?.reachStats.topReaches[0];

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
                          <td>
                            {profile?.dnaBadges[0] ? (
                              <span className="kpi-luck-badge accent">{profile.dnaBadges[0].title}</span>
                            ) : (
                              <span style={{ color: 'var(--muted)', fontSize: '11px', fontFamily: 'var(--mono)' }}>
                                {isAnalyzingLeague ? 'Analyzing…' : 'Balanced'}
                              </span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: qb1 && qb1 <= 3.5 ? '#fbbf24' : 'var(--ink)' }}>
                            {qb1 ? `R${qb1}` : '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: rb1 && rb1 <= 2 ? '#60a5fa' : 'var(--ink)' }}>
                            {rb1 ? `R${rb1}` : '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: te1 && te1 <= 4 ? '#fb923c' : 'var(--ink)' }}>
                            {te1 ? `R${te1}` : '—'}
                          </td>
                          <td>
                            {profile ? (
                              <span className={`reach-pill ${profile.reachStats.reachRatePct >= 25 ? 'reach' : 'steal'}`}>
                                {profile.reachStats.reachRatePct}% reaches
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-secondary)' }}>
                            {topReach ? (
                              <span title={`ADP ${topReach.adp} vs Pick ${topReach.pickNo}`}>
                                {topReach.player} (+{topReach.diff})
                              </span>
                            ) : (
                              '—'
                            )}
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
                              <Target size={12} />
                              <span>{isSelected ? 'View Dossier' : 'Scout'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View (Zero horizontal scrolling) */}
            <div className="mobile-cards-view">
              <div className="m-standings-card-list">
                {filteredUsers.map((u, idx) => {
                  const profile = leagueProfiles.get(u.user_id);
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
                          <span>Dossier</span>
                        </button>
                      </div>

                      <div className="m-card-metrics-grid">
                        <div className="m-metric-cell">
                          <span className="m-metric-label">DNA</span>
                          <span className="m-metric-val">{profile?.dnaBadges[0]?.title || 'Balanced'}</span>
                        </div>
                        <div className="m-metric-cell">
                          <span className="m-metric-label">QB1 / RB1</span>
                          <span className="m-metric-val">
                            {profile?.positionTiming.qb1Round ? `R${profile.positionTiming.qb1Round}` : '—'} /{' '}
                            {profile?.positionTiming.rb1Round ? `R${profile.positionTiming.rb1Round}` : '—'}
                          </span>
                        </div>
                        <div className="m-metric-cell">
                          <span className="m-metric-label">REACH %</span>
                          <span className="m-metric-val">{profile ? `${profile.reachStats.reachRatePct}%` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: DEEP DOSSIER */}
        {activeTab === 'dossier' && scoutProfile && (
          <div>
            <div className="dossier-grid">
              {/* Card 1: Reach vs Value & Positional Timing */}
              <div className="dossier-card">
                <div>
                  <div className="dossier-card-title">
                    <h3>
                      <Zap size={14} style={{ color: '#fbbf24' }} />
                      <span>Reach Frequency &amp; Target Timing</span>
                    </h3>
                    <span>{scoutProfile.totalDraftsAnalyzed} Drafts Analyzed</span>
                  </div>

                  {/* Timing Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    <div className="timing-chip">
                      <div style={{ color: 'var(--muted)', fontSize: '9px' }}>QB1 ROUND</div>
                      <div style={{ font: '700 13px var(--mono)', color: '#fbbf24' }}>
                        {scoutProfile.positionTiming.qb1Round ? `R${scoutProfile.positionTiming.qb1Round}` : '—'}
                      </div>
                    </div>
                    <div className="timing-chip">
                      <div style={{ color: 'var(--muted)', fontSize: '9px' }}>RB1 ROUND</div>
                      <div style={{ font: '700 13px var(--mono)', color: '#60a5fa' }}>
                        {scoutProfile.positionTiming.rb1Round ? `R${scoutProfile.positionTiming.rb1Round}` : '—'}
                      </div>
                    </div>
                    <div className="timing-chip">
                      <div style={{ color: 'var(--muted)', fontSize: '9px' }}>WR1 ROUND</div>
                      <div style={{ font: '700 13px var(--mono)', color: '#34d399' }}>
                        {scoutProfile.positionTiming.wr1Round ? `R${scoutProfile.positionTiming.wr1Round}` : '—'}
                      </div>
                    </div>
                    <div className="timing-chip">
                      <div style={{ color: 'var(--muted)', fontSize: '9px' }}>TE1 ROUND</div>
                      <div style={{ font: '700 13px var(--mono)', color: '#fb923c' }}>
                        {scoutProfile.positionTiming.te1Round ? `R${scoutProfile.positionTiming.te1Round}` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Top Reaches vs Steals */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div>
                      <div style={{ font: '600 11px var(--mono)', color: 'var(--unlucky-text)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <TrendingUp size={12} />
                        <span>Biggest Reaches (Ahead of ADP)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {scoutProfile.reachStats.topReaches.slice(0, 3).map((r, i) => (
                          <div key={i} style={{ padding: '6px 8px', background: 'var(--surface-raised)', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.player}</span>
                            <span style={{ color: 'var(--unlucky-text)', fontFamily: 'var(--mono)' }}>+{r.diff} early</span>
                          </div>
                        ))}
                        {scoutProfile.reachStats.topReaches.length === 0 && (
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>No aggressive reaches logged.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ font: '600 11px var(--mono)', color: 'var(--lucky-text)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                        <TrendingDown size={12} />
                        <span>Biggest Value Steals</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {scoutProfile.reachStats.topSteals.slice(0, 3).map((s, i) => (
                          <div key={i} style={{ padding: '6px 8px', background: 'var(--surface-raised)', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.player}</span>
                            <span style={{ color: 'var(--lucky-text)', fontFamily: 'var(--mono)' }}>-{s.diff} late</span>
                          </div>
                        ))}
                        {scoutProfile.reachStats.topSteals.length === 0 && (
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Follows standard board flow.</span>
                        )}
                      </div>
                    </div>
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

              {/* Card 2: Positional Allocation & Format Breakdown */}
              <div className="dossier-card">
                <div>
                  <div className="dossier-card-title">
                    <h3>
                      <Target size={14} style={{ color: 'var(--lucky-text)' }} />
                      <span>Positional Allocation &amp; Format Split</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className="badge-redraft">{scoutProfile.redraftDraftsCount} Redraft</span>
                      <span className="badge-dynasty">{scoutProfile.dynastyDraftsCount} Dynasty</span>
                    </div>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {scoutProfile.positionStats.map((st) => (
                      <div
                        key={st.position}
                        style={{
                          padding: '8px',
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th-rank">Round / Pick</th>
                  <th>Player</th>
                  <th>Position</th>
                  <th>Format</th>
                  <th>ADP vs Pick</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'right' }}>Season</th>
                </tr>
              </thead>
              <tbody>
                {scoutProfile.draftHistory.map((pick, pIdx) => {
                  const fullName = `${pick.metadata?.first_name || ''} ${pick.metadata?.last_name || ''}`.trim() || 'Unknown';
                  const pos = (pick.metadata?.position || 'FLEX').toUpperCase();
                  const expectedAdp = pick.adp || pick.pick_no;
                  const diff = expectedAdp - pick.pick_no;

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
                      <td>
                        {pick.isDynasty ? (
                          <span className="badge-dynasty">Dynasty</span>
                        ) : (
                          <span className="badge-redraft">Redraft</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>
                        {diff >= 5 ? (
                          <span style={{ color: 'var(--unlucky-text)' }}>Reach (+{diff})</span>
                        ) : diff <= -5 ? (
                          <span style={{ color: 'var(--lucky-text)' }}>Steal (-{Math.abs(diff)})</span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>At ADP</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--ink-secondary)' }}>
                        {pick.metadata?.team || 'FA'}
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
    </main>
  );
}

export default App;
