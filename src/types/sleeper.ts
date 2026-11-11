export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  draft_id: string;
  previous_league_id: string | null;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: {
    type?: number;
    draft_rounds?: number;
    best_ball?: number;
    playoff_teams?: number;
    [key: string]: unknown;
  };
  metadata?: {
    name?: string;
    description?: string;
    scoring_type?: string;
    [key: string]: unknown;
  };
}

export interface SleeperLeagueUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata?: {
    team_name?: string;
    team_name_update?: string;
    avatar?: string;
    [key: string]: unknown;
  };
  is_owner?: boolean;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    [key: string]: unknown;
  };
  players: string[] | null;
}

export interface SleeperDraftPick {
  round: number;
  roster_id: number;
  player_id: string;
  picked_by: string;
  pick_no: number;
  draft_slot: number;
  draft_id: string;
  is_keeper?: boolean | null;
  metadata: {
    first_name: string;
    last_name: string;
    position: string;
    team: string;
    status?: string;
    injury_status?: string;
    years_exp?: string;
    number?: string;
    [key: string]: unknown;
  };
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  season: string;
  status: string;
  type: string;
  settings: {
    teams: number;
    rounds: number;
    slots_qb?: number;
    slots_rb?: number;
    slots_wr?: number;
    slots_te?: number;
    slots_flex?: number;
    slots_super_flex?: number;
    [key: string]: unknown;
  };
  metadata?: {
    name?: string;
    scoring_type?: string;
    [key: string]: unknown;
  };
}

export interface PositionStat {
  position: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ManagerScoutProfile {
  user: SleeperLeagueUser;
  totalDraftsAnalyzed: number;
  totalPicksAnalyzed: number;
  threatLevel: 'TACTICAL MASTERMIND' | 'HIGH THREAT' | 'VALUE HUNTER' | 'WILDCARD' | 'CASUAL';
  threatColor: string;
  dnaBadges: { title: string; desc: string; icon: string }[];
  positionStats: PositionStat[];
  earlyRoundPicks: { round: number; position: string; player: string; team: string }[];
  favoriteTeams: { team: string; count: number; percentage: number }[];
  repeatPlayers: { name: string; position: string; team: string; count: number }[];
  scoutingNotes: string[];
  draftHistory: (SleeperDraftPick & { draftName?: string; season?: string })[];
}
