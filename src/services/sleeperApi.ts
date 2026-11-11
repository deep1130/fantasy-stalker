import { SleeperUser, SleeperLeague, SleeperLeagueUser, SleeperRoster, SleeperDraft, SleeperDraftPick } from '../types/sleeper';

const BASE_URL = 'https://api.sleeper.app/v1';

// In-memory cache to prevent redundant network hits and rate-limiting
const cache = new Map<string, unknown>();

async function fetchWithCache<T>(url: string): Promise<T> {
  if (cache.has(url)) {
    return cache.get(url) as T;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sleeper API error (${response.status}): ${response.statusText}`);
  }
  const data = await response.json();
  cache.set(url, data);
  return data as T;
}

export function getAvatarUrl(avatarId: string | null | undefined): string {
  if (!avatarId) {
    return 'https://sleepercdn.com/images/v2/icons/player_default.webp';
  }
  if (avatarId.startsWith('nfl_')) {
    return `https://sleepercdn.com/images/team_logos/nfl/${avatarId.replace('nfl_', '')}.png`;
  }
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
}

export async function getSleeperUser(usernameOrId: string): Promise<SleeperUser> {
  const clean = usernameOrId.trim();
  const data = await fetchWithCache<SleeperUser | null>(`${BASE_URL}/user/${clean}`);
  if (!data || !data.user_id) {
    throw new Error(`User "${clean}" not found on Sleeper. Check the username and try again.`);
  }
  return data;
}

export async function getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
  const data = await fetchWithCache<SleeperLeague[]>(`${BASE_URL}/user/${userId}/leagues/nfl/${season}`);
  return data || [];
}

export async function getLeagueUsers(leagueId: string): Promise<SleeperLeagueUser[]> {
  const data = await fetchWithCache<SleeperLeagueUser[]>(`${BASE_URL}/league/${leagueId}/users`);
  return data || [];
}

export async function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  const data = await fetchWithCache<SleeperRoster[]>(`${BASE_URL}/league/${leagueId}/rosters`);
  return data || [];
}

export async function getUserDrafts(userId: string, season: string): Promise<SleeperDraft[]> {
  const data = await fetchWithCache<SleeperDraft[]>(`${BASE_URL}/user/${userId}/drafts/nfl/${season}`);
  return data || [];
}

export async function getLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  const data = await fetchWithCache<SleeperDraft[]>(`${BASE_URL}/league/${leagueId}/drafts`);
  return data || [];
}

export async function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  const data = await fetchWithCache<SleeperDraftPick[]>(`${BASE_URL}/draft/${draftId}/picks`);
  return data || [];
}

export async function getLeagueTransactions(leagueId: string, round: number): Promise<any[]> {
  const data = await fetchWithCache<any[]>(`${BASE_URL}/league/${leagueId}/transactions/${round}`);
  return data || [];
}

export interface SleeperNFLState {
  week: number;
  season: string;
  season_type: string;
  league_season?: string;
  previous_season?: string;
}

export async function getNFLState(): Promise<SleeperNFLState> {
  const data = await fetchWithCache<SleeperNFLState>(`${BASE_URL}/state/nfl`);
  return data;
}
