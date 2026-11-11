import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  Users,
  Target,
  History,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Zap,
  Crosshair,
  ExternalLink,
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
  getNFLState,
} from './services/sleeperApi';
import { buildManagerDossier } from './services/analyzer';
import { SummaryStrip } from './components/SummaryStrip';
import { LeagueReportView } from './components/LeagueReportView';
import { ScoutDossierView } from './components/ScoutDossierView';
import { PickLogView } from './components/PickLogView';
import { SleeperStalkerIntel } from './components/SleeperStalkerIntel';
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

  const [activeTab, setActiveTab] = useState<'league_report' | 'dossier' | 'activity' | 'picks'>('league_report');
  const [searchFilter, setSearchFilter] = useState('');
  const [isDraftBoardModalOpen, setIsDraftBoardModalOpen] = useState(false);
  const [modalDraftData, setModalDraftData] = useState<{
    draftId: string;
    title: string;
    teams?: number;
    rounds?: number;
  } | null>(null);

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
        const sundayFunday =
          userLeagues.find((l) => l.name.toLowerCase().includes('sunday funday')) || userLeagues[0];
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

      const target = users.find((u) => u.user_id !== (currentUserId || currentUser?.user_id)) || users[0];
      if (target) {
        setSelectedOpponent(target);
      }
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

      // 2. Fetch picks for drafts & build consensus ADP
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

  const handleScoutOpponent = async (targetUser: SleeperLeagueUser, preferredTab?: 'dossier' | 'activity') => {
    setSelectedOpponent(targetUser);
    if (preferredTab) {
      setActiveTab(preferredTab);
    }

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

  return (
    <main className="app-shell">
      {/* TOPBAR */}
      <header className="topbar">
        <a href="./" className="brand" title="Fantasy Stalker">
          <span className="brand-mark">
            <Crosshair size={15} />
          </span>
          <span>
            FANTASY<span className="brand-light">STALKER</span>
          </span>
        </a>

        <div className="topbar-right">
          <span className="season-label">NFL &apos;{selectedSeason.slice(-2)}</span>
          <span className="live-dot" />
          <span className="live-label">LIVE DATA</span>
        </div>
      </header>

      {/* INTRO HERO */}
      <section className="intro">
        <div>
          <p className="eyebrow">
            CROSS-LEAGUE DRAFT SCOUT <span>·</span>{' '}
            {selectedLeague ? selectedLeague.name.toUpperCase() : 'SCOUTING REPORT'}
          </p>
          <h1>
            Who did they draft?<br />
            <em>How do they draft?</em>
          </h1>
          <p className="intro-copy">
            Analyze every manager in your league across all their Sleeper leagues. Uncover reach frequency against
            ADP, position timing, and Dynasty vs. Redraft habits.
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
              <span>{isLoadingUser ? 'Wait…' : 'Scan'}</span>
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
          <button type="button" onClick={() => setErrorMsg(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* LEAGUE SELECTOR BAR */}
      {leagues.length > 0 && (
        <div className="league-nav-strip">
          <span className="league-nav-label">YOUR LEAGUES:</span>
          <div className="league-pill-group">
            {leagues.map((l) => {
              const isDyn = l.settings?.type === 2;
              const isSel = l.league_id === selectedLeague?.league_id;
              return (
                <button
                  key={l.league_id}
                  type="button"
                  onClick={() => handleSelectLeague(l)}
                  className={`league-pill ${isSel ? 'active' : ''}`}
                >
                  <span>{l.name}</span>
                  <span className="pill-type-tag">({isDyn ? 'Dynasty' : 'Redraft'})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUMMARY STRIP (4 KPIS) */}
      <SummaryStrip
        selectedLeague={selectedLeague}
        selectedSeason={selectedSeason}
        isAnalyzingLeague={isAnalyzingLeague}
        leagueProfilesCount={leagueProfiles.size}
        leagueUsersCount={leagueUsers.length}
        selectedOpponent={selectedOpponent}
        scoutProfile={scoutProfile}
      />

      {/* MAIN BOARD SECTION */}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {activeTab === 'league_report' && 'LEAGUE SCOUTING INTEL BOARD'}
              {activeTab === 'dossier' && 'MANAGER SCOUTING DOSSIER'}
              {activeTab === 'activity' && 'CROSS-LEAGUE SLEEPER STALKER'}
              {activeTab === 'picks' && 'HISTORICAL PICK LOG'}
              <span>·</span> {selectedLeague ? `${selectedLeague.total_rosters} TEAMS` : 'SCOUTING'}
            </p>
            <h2>
              {activeTab === 'league_report' && `${selectedLeague?.name || 'League'} · Complete Scouting Report`}
              {activeTab === 'dossier' && `Deep Dossier: ${selectedOpponent?.display_name || ''}`}
              {activeTab === 'activity' && `Cross-League Intel: ${selectedOpponent?.display_name || ''}`}
              {activeTab === 'picks' && `Historical Picks: ${selectedOpponent?.display_name || ''}`}
            </h2>
          </div>

          <div className="board-tools">
            <button
              type="button"
              onClick={() => analyzeEntireLeague(leagueUsers)}
              disabled={isAnalyzingLeague || leagueUsers.length === 0}
              className="action-btn active"
              title="Scout all league members across their Sleeper drafts"
            >
              {isAnalyzingLeague ? <Loader2 size={12} className="spin" /> : <Zap size={12} />}
              <span>{isAnalyzingLeague ? 'Analyzing…' : 'Analyze League Mates'}</span>
            </button>

            {/* Scope Filter Segment */}
            <div className="view-tabs" title="Evaluation Scope">
              <button
                type="button"
                className={formatFilter === 'all' ? 'selected' : ''}
                onClick={() => {
                  setFormatFilter('all');
                  if (selectedOpponent) handleScoutOpponent(selectedOpponent);
                }}
              >
                All
              </button>
              <button
                type="button"
                className={formatFilter === 'redraft' ? 'selected' : ''}
                onClick={() => {
                  setFormatFilter('redraft');
                  if (selectedOpponent) handleScoutOpponent(selectedOpponent);
                }}
              >
                Redraft
              </button>
              <button
                type="button"
                className={formatFilter === 'dynasty' ? 'selected' : ''}
                onClick={() => {
                  setFormatFilter('dynasty');
                  if (selectedOpponent) handleScoutOpponent(selectedOpponent);
                }}
              >
                Dynasty
              </button>
            </div>

            <div className="search-box">
              <Search size={13} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter managers…"
              />
            </div>

            {/* Primary Navigation Tabs */}
            <div className="view-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('league_report')}
                className={activeTab === 'league_report' ? 'selected' : ''}
              >
                <Users size={12} />
                <span>League Mates</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={activeTab === 'activity' ? 'selected' : ''}
              >
                <ExternalLink size={12} />
                <span>Other Leagues &amp; Boards</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dossier')}
                className={activeTab === 'dossier' ? 'selected' : ''}
              >
                <Target size={12} />
                <span>Draft DNA</span>
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
                  style={{
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-text)',
                    border: '1px solid var(--accent-border)',
                  }}
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
          <LeagueReportView
            filteredUsers={filteredUsers}
            leagueProfiles={leagueProfiles}
            selectedOpponent={selectedOpponent}
            isAnalyzingLeague={isAnalyzingLeague}
            onSelectOpponent={(u, tab) => handleScoutOpponent(u, tab)}
          />
        )}

        {/* TAB 2: DEEP DOSSIER */}
        {activeTab === 'dossier' && scoutProfile && <ScoutDossierView scoutProfile={scoutProfile} />}

        {/* TAB 3: SLEEPER STALKER (THEIR OTHER LEAGUES' DRAFT BOARDS, TEAMS, TRADES, WAIVERS) */}
        {activeTab === 'activity' && (
          <div>
            {selectedOpponent ? (
              <SleeperStalkerIntel
                targetUser={selectedOpponent}
                currentLeagueId={selectedLeague?.league_id || ''}
                availableSeasons={availableSeasons}
                leagueUsers={leagueUsers}
                onSelectTargetUser={(u) => handleScoutOpponent(u, 'activity')}
                onOpenDraftBoard={(draftId, title, teams, rounds) =>
                  setModalDraftData({ draftId, title, teams, rounds })
                }
              />
            ) : (
              <div
                style={{
                  padding: '30px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  background: 'var(--surface)',
                  borderRadius: '8px',
                }}
              >
                Select a manager to inspect their other draft boards, teams, trades, and waiver wire activity.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: COMPLETE PICK LOG */}
        {activeTab === 'picks' && scoutProfile && (
          <PickLogView scoutProfile={scoutProfile} selectedSeason={selectedSeason} />
        )}
      </section>

      {/* DRAFT BOARD MODAL (FOR CURRENT OR OTHER LEAGUES) */}
      {(modalDraftData || isDraftBoardModalOpen) && (
        <DraftBoardModal
          draftId={modalDraftData?.draftId || selectedLeague?.draft_id || ''}
          title={modalDraftData?.title || selectedLeague?.name || 'Draft Board'}
          totalTeams={modalDraftData?.teams || selectedLeague?.total_rosters || 12}
          totalRounds={modalDraftData?.rounds}
          highlightUserId={selectedOpponent?.user_id || null}
          onClose={() => {
            setModalDraftData(null);
            setIsDraftBoardModalOpen(false);
          }}
        />
      )}
    </main>
  );
}

export default App;
