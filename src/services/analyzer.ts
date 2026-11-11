import { SleeperLeagueUser, SleeperDraftPick, SleeperDraft, ManagerScoutProfile, PositionStat } from '../types/sleeper';

const POSITION_COLORS: Record<string, string> = {
  RB: '#3b82f6', // blue
  WR: '#10b981', // emerald
  QB: '#f59e0b', // amber
  TE: '#f97316', // orange
  K: '#a855f7',  // purple
  DEF: '#ec4899', // pink
};

export function buildManagerDossier(
  targetUser: SleeperLeagueUser,
  draftsWithPicks: { draft: SleeperDraft; picks: SleeperDraftPick[] }[]
): ManagerScoutProfile {
  // Filter picks specifically made by or belonging to this target manager
  const userPicks: (SleeperDraftPick & { draftName?: string; season?: string })[] = [];

  for (const { draft, picks } of draftsWithPicks) {
    const dName = draft.metadata?.name || `Draft ${draft.season}`;
    for (const p of picks) {
      if (p.picked_by === targetUser.user_id) {
        userPicks.push({
          ...p,
          draftName: dName,
          season: draft.season,
        });
      }
    }
  }

  const totalPicks = userPicks.length;
  const completedDraftsCount = draftsWithPicks.filter(d => d.picks.length > 0).length;

  // 1. Positional counts
  const posCounts: Record<string, number> = { RB: 0, WR: 0, QB: 0, TE: 0, K: 0, DEF: 0 };
  const teamCounts: Record<string, number> = {};
  const playerCounts: Record<string, { count: number; position: string; team: string }> = {};
  const earlyPicksList: { round: number; position: string; player: string; team: string }[] = [];

  let earlyQBs = 0;
  let earlyRBs = 0;
  let earlyWRs = 0;
  let earlyTEs = 0;
  let rookieCount = 0;

  for (const p of userPicks) {
    const pos = (p.metadata.position || 'FLEX').toUpperCase();
    if (pos in posCounts) {
      posCounts[pos] += 1;
    } else {
      posCounts[pos] = (posCounts[pos] || 0) + 1;
    }

    const team = p.metadata.team || 'FA';
    if (team && team !== 'FA') {
      teamCounts[team] = (teamCounts[team] || 0) + 1;
    }

    const playerName = `${p.metadata.first_name || ''} ${p.metadata.last_name || ''}`.trim() || 'Unknown Player';
    if (!playerCounts[playerName]) {
      playerCounts[playerName] = { count: 1, position: pos, team };
    } else {
      playerCounts[playerName].count += 1;
    }

    if (p.metadata.years_exp === '0' || p.metadata.years_exp === '1') {
      rookieCount += 1;
    }

    if (p.round <= 3) {
      earlyPicksList.push({
        round: p.round,
        position: pos,
        player: playerName,
        team,
      });

      if (pos === 'QB') earlyQBs += 1;
      if (pos === 'RB') earlyRBs += 1;
      if (pos === 'WR') earlyWRs += 1;
      if (pos === 'TE') earlyTEs += 1;
    }
  }

  // 2. Position stats with percentages
  const positionStats: PositionStat[] = Object.entries(posCounts)
    .filter(([pos]) => ['RB', 'WR', 'QB', 'TE', 'K', 'DEF'].includes(pos))
    .map(([position, count]) => ({
      position,
      count,
      percentage: totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0,
      color: POSITION_COLORS[position] || '#94a3b8',
    }))
    .sort((a, b) => b.count - a.count);

  // 3. Favorite Teams
  const favoriteTeams = Object.entries(teamCounts)
    .map(([team, count]) => ({
      team,
      count,
      percentage: totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 4. Repeat drafted players
  const repeatPlayers = Object.entries(playerCounts)
    .filter(([, data]) => data.count > 1)
    .map(([name, data]) => ({
      name,
      position: data.position,
      team: data.team,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 5. DNA Badges & Threat Assessment
  const dnaBadges: { title: string; desc: string; icon: string }[] = [];
  const scoutingNotes: string[] = [];

  // Early Round Archetypes
  if (earlyRBs >= 2) {
    dnaBadges.push({
      title: 'Bellcow Hoarder',
      desc: 'Repeatedly secures 2+ RBs in the opening 3 rounds.',
      icon: 'Shield',
    });
    scoutingNotes.push('Heavily prioritizes early running backs. Expect them to trigger or join early RB runs.');
  } else if (earlyWRs >= 2) {
    dnaBadges.push({
      title: 'Air Raid Strategist',
      desc: 'Builds foundation through WR-heavy start in early rounds.',
      icon: 'Wind',
    });
    scoutingNotes.push('Locks down receiver depth early, betting on wideout stability over RB volatility.');
  }

  if (earlyQBs >= 1) {
    dnaBadges.push({
      title: 'Early QB Hunter',
      desc: 'Invests premium draft capital on elite quarterbacks.',
      icon: 'Zap',
    });
    scoutingNotes.push('Willing to reach on top-tier signal callers before Round 4. Jump them early if targeting top QBs.');
  }

  if (earlyTEs >= 1) {
    dnaBadges.push({
      title: 'Elite TE Chaser',
      desc: 'Refuses the TE streaming wasteland; invests high capital early.',
      icon: 'Crown',
    });
  }

  if (favoriteTeams.length > 0 && favoriteTeams[0].count >= 3) {
    dnaBadges.push({
      title: `Team Bias: ${favoriteTeams[0].team}`,
      desc: `Drafted ${favoriteTeams[0].count} players from ${favoriteTeams[0].team}. Possible home team loyalty.`,
      icon: 'Flame',
    });
    scoutingNotes.push(`Strong affiliation for the ${favoriteTeams[0].team}. You can anticipate them targeting their key starters.`);
  }

  if (rookieCount >= 3) {
    dnaBadges.push({
      title: 'Rookie Chaser',
      desc: 'High appetite for upside year-1 and year-2 breakout prospects.',
      icon: 'Sparkles',
    });
    scoutingNotes.push('Prone to drafting high-upside rookies over seasoned veteran floor plays in middle rounds.');
  }

  if (dnaBadges.length === 0) {
    dnaBadges.push({
      title: 'Value Opportunist',
      desc: 'Drafts best player available without rigid positional lock-in.',
      icon: 'Crosshair',
    });
    scoutingNotes.push('Adapts flexibly to the draft board and scoops up tumbling value picks.');
  }

  // Threat Level calculation
  let threatLevel: ManagerScoutProfile['threatLevel'] = 'VALUE HUNTER';
  let threatColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  if (completedDraftsCount >= 4) {
    threatLevel = 'TACTICAL MASTERMIND';
    threatColor = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  } else if (earlyQBs > 0 && earlyRBs > 0 && earlyWRs > 0) {
    threatLevel = 'WILDCARD';
    threatColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else if (completedDraftsCount >= 2) {
    threatLevel = 'HIGH THREAT';
    threatColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  } else if (completedDraftsCount === 0) {
    threatLevel = 'CASUAL';
    threatColor = 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  }

  return {
    user: targetUser,
    totalDraftsAnalyzed: completedDraftsCount,
    totalPicksAnalyzed: totalPicks,
    threatLevel,
    threatColor,
    dnaBadges,
    positionStats,
    earlyRoundPicks: earlyPicksList,
    favoriteTeams,
    repeatPlayers,
    scoutingNotes,
    draftHistory: userPicks.sort((a, b) => (a.season === b.season ? a.pick_no - b.pick_no : (b.season || '').localeCompare(a.season || ''))),
  };
}
