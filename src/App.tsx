import { useState, useEffect } from 'react';
import { AlertCircle, ArrowLeft, Crosshair } from 'lucide-react';
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
} from './services/sleeperApi';
import { buildManagerDossier } from './services/analyzer';
import { Header } from './components/Header';
import { SearchSection } from './components/SearchSection';
import { LeagueList } from './components/LeagueList';
import { OpponentGrid } from './components/OpponentGrid';
import { DossierHeader } from './components/ScoutDossier/DossierHeader';
import { PositionalBreakdown } from './components/ScoutDossier/PositionalBreakdown';
import { EarlyRoundTendencies } from './components/ScoutDossier/EarlyRoundTendencies';
import { FavoriteTeamsCard } from './components/ScoutDossier/FavoriteTeamsCard';
import { DraftPicksHistory } from './components/ScoutDossier/DraftPicksHistory';
import { DraftBoardModal } from './components/DraftBoardModal';

export function App() {
  const [currentUser, setCurrentUser] = useState<SleeperUser | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('2024');
  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<SleeperLeague | null>(null);

  const [leagueUsers, setLeagueUsers] = useState<SleeperLeagueUser[]>([]);
  const [leagueRosters, setLeagueRosters] = useState<SleeperRoster[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<SleeperLeagueUser | null>(null);
  const [scoutProfile, setScoutProfile] = useState<ManagerScoutProfile | null>(null);

  const [isDraftBoardOpen, setIsDraftBoardOpen] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingLeagueData, setIsLoadingLeagueData] = useState(false);
  const [isScoutingOpponent, setIsScoutingOpponent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load a default user on start for an immediate rich preview
  useEffect(() => {
    handleSearchUser('matt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchUser = async (username: string) => {
    try {
      setErrorMsg(null);
      setIsLoadingUser(true);
      setSelectedLeague(null);
      setSelectedOpponent(null);
      setScoutProfile(null);

      const user = await getSleeperUser(username);
      setCurrentUser(user);

      const userLeagues = await getUserLeagues(user.user_id, selectedSeason);
      setLeagues(userLeagues);

      if (userLeagues.length > 0) {
        handleSelectLeague(userLeagues[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search user';
      setErrorMsg(msg);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleSeasonChange = async (season: string) => {
    setSelectedSeason(season);
    if (!currentUser) return;
    try {
      setIsLoadingUser(true);
      setErrorMsg(null);
      setSelectedLeague(null);
      setSelectedOpponent(null);
      setScoutProfile(null);
      const userLeagues = await getUserLeagues(currentUser.user_id, season);
      setLeagues(userLeagues);
      if (userLeagues.length > 0) {
        handleSelectLeague(userLeagues[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch season';
      setErrorMsg(msg);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleSelectLeague = async (league: SleeperLeague) => {
    try {
      setSelectedLeague(league);
      setSelectedOpponent(null);
      setScoutProfile(null);
      setIsLoadingLeagueData(true);

      const [users, rosters] = await Promise.all([
        getLeagueUsers(league.league_id),
        getLeagueRosters(league.league_id),
      ]);

      setLeagueUsers(users);
      setLeagueRosters(rosters);

      // Auto-scout the first opponent that isn't the logged in user
      const opponentToScout = users.find((u) => u.user_id !== currentUser?.user_id) || users[0];
      if (opponentToScout) {
        handleScoutOpponent(opponentToScout);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch league members';
      setErrorMsg(msg);
    } finally {
      setIsLoadingLeagueData(false);
    }
  };

  const handleScoutOpponent = async (targetUser: SleeperLeagueUser) => {
    try {
      setSelectedOpponent(targetUser);
      setIsScoutingOpponent(true);
      setErrorMsg(null);

      // Fetch target's drafts across 2024 and 2023
      const [drafts2024, drafts2023] = await Promise.all([
        getUserDrafts(targetUser.user_id, '2024').catch(() => [] as SleeperDraft[]),
        getUserDrafts(targetUser.user_id, '2023').catch(() => [] as SleeperDraft[]),
      ]);

      const allDrafts = [...drafts2024, ...drafts2023].filter(
        (d) => d.status === 'complete' || d.status === 'drafting'
      );

      // Fetch picks for the drafts (limit to top 5 drafts to keep analysis fast and responsive)
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
      const msg = err instanceof Error ? err.message : 'Failed to analyze manager draft data';
      setErrorMsg(msg);
    } finally {
      setIsScoutingOpponent(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-16">
      <Header onSelectDemo={handleSearchUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Search & Season Selection */}
        <SearchSection
          onSearch={handleSearchUser}
          isLoading={isLoadingUser}
          selectedSeason={selectedSeason}
          onSeasonChange={handleSeasonChange}
          currentUser={currentUser}
        />

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* League Selector */}
        {currentUser && (
          <LeagueList
            leagues={leagues}
            selectedLeagueId={selectedLeague?.league_id || null}
            onSelectLeague={handleSelectLeague}
            isLoading={isLoadingUser}
            season={selectedSeason}
          />
        )}

        {/* Opponent Roster Grid for Selected League */}
        {selectedLeague && (
          <OpponentGrid
            league={selectedLeague}
            users={leagueUsers}
            rosters={leagueRosters}
            selectedUserId={selectedOpponent?.user_id || null}
            onSelectOpponent={handleScoutOpponent}
            onOpenDraftBoard={() => setIsDraftBoardOpen(true)}
            isLoadingUsers={isLoadingLeagueData}
            isScouting={isScoutingOpponent}
          />
        )}

        {/* Manager Scouting Dossier */}
        {scoutProfile && (
          <div className="space-y-6 pt-4 border-t border-slate-800 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Target Dossier: {scoutProfile.user.display_name}
                </h2>
              </div>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                <span>Back to League Targets</span>
              </button>
            </div>

            <DossierHeader profile={scoutProfile} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PositionalBreakdown
                stats={scoutProfile.positionStats}
                totalPicks={scoutProfile.totalPicksAnalyzed}
              />
              <EarlyRoundTendencies
                earlyPicks={scoutProfile.earlyRoundPicks}
                scoutingNotes={scoutProfile.scoutingNotes}
              />
            </div>

            <FavoriteTeamsCard
              favoriteTeams={scoutProfile.favoriteTeams}
              repeatPlayers={scoutProfile.repeatPlayers}
            />

            <DraftPicksHistory picks={scoutProfile.draftHistory} />
          </div>
        )}
      </main>

      {/* Full Draft Board Modal */}
      {isDraftBoardOpen && selectedLeague && (
        <DraftBoardModal
          league={selectedLeague}
          users={leagueUsers}
          highlightUserId={selectedOpponent?.user_id || null}
          onClose={() => setIsDraftBoardOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
