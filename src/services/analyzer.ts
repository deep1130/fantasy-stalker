import { SleeperLeagueUser, SleeperDraftPick, SleeperDraft, ManagerScoutProfile, PositionStat, PositionTiming, ReachItem } from '../types/sleeper';

const POSITION_COLORS: Record<string, string> = {
  RB: '#3b82f6', // blue
  WR: '#10b981', // emerald
  QB: '#f59e0b', // amber
  TE: '#f97316', // orange
  K: '#a855f7',  // purple
  DEF: '#ec4899', // pink
};

export function isDraftDynasty(draft: SleeperDraft): boolean {
  if (draft.settings?.player_type === 1) return true; // rookie draft
  if (draft.type === 'linear') return true;
  const scoring = (draft.metadata?.scoring_type || '').toLowerCase();
  const name = (draft.metadata?.name || '').toLowerCase();
  return scoring.includes('dynasty') || name.includes('dynasty');
}

export function buildManagerDossier(
  targetUser: SleeperLeagueUser,
  draftsWithPicks: { draft: SleeperDraft; picks: SleeperDraftPick[] }[],
  globalPlayerAdpMap?: Map<string, number>,
  formatFilter: 'all' | 'redraft' | 'dynasty' = 'all'
): ManagerScoutProfile {
  // If no global ADP map provided, build an in-sample ADP map from the drafts provided
  const adpMap = globalPlayerAdpMap || new Map<string, number>();
  if (!globalPlayerAdpMap) {
    const playerPicksSum = new Map<string, { totalPick: number; count: number }>();
    for (const { picks } of draftsWithPicks) {
      for (const p of picks) {
        if (!p.player_id) continue;
        const cur = playerPicksSum.get(p.player_id) || { totalPick: 0, count: 0 };
        cur.totalPick += p.pick_no;
        cur.count += 1;
        playerPicksSum.set(p.player_id, cur);
      }
    }
    for (const [pid, data] of playerPicksSum.entries()) {
      adpMap.set(pid, Math.round(data.totalPick / data.count));
    }
  }

  // Filter drafts based on format filter
  const filteredDrafts = draftsWithPicks.filter(({ draft }) => {
    const isDyn = isDraftDynasty(draft);
    if (formatFilter === 'redraft') return !isDyn;
    if (formatFilter === 'dynasty') return isDyn;
    return true;
  });

  const userPicks: (SleeperDraftPick & { draftName?: string; season?: string; isDynasty?: boolean; adp?: number })[] = [];
  let redraftCount = 0;
  let dynastyCount = 0;

  // Track position timing per draft
  const qb1List: number[] = [];
  const rb1List: number[] = [];
  const rb2List: number[] = [];
  const wr1List: number[] = [];
  const wr2List: number[] = [];
  const te1List: number[] = [];

  for (const { draft, picks } of filteredDrafts) {
    const isDyn = isDraftDynasty(draft);
    if (isDyn) dynastyCount += 1;
    else redraftCount += 1;

    const dName = draft.metadata?.name || `Draft ${draft.season}`;
    const draftUserPicks = picks
      .filter((p) => p.picked_by === targetUser.user_id)
      .sort((a, b) => a.pick_no - b.pick_no);

    // Compute timing for this draft
    let foundQb1 = false;
    let foundRb1 = false;
    let foundRb2 = false;
    let foundWr1 = false;
    let foundWr2 = false;
    let foundTe1 = false;

    for (const p of draftUserPicks) {
      const pos = (p.metadata.position || 'FLEX').toUpperCase();
      const expectedAdp = adpMap.get(p.player_id) || p.pick_no;

      userPicks.push({
        ...p,
        draftName: dName,
        season: draft.season,
        isDynasty: isDyn,
        adp: expectedAdp,
      });

      if (pos === 'QB' && !foundQb1) {
        qb1List.push(p.round);
        foundQb1 = true;
      } else if (pos === 'RB') {
        if (!foundRb1) {
          rb1List.push(p.round);
          foundRb1 = true;
        } else if (!foundRb2) {
          rb2List.push(p.round);
          foundRb2 = true;
        }
      } else if (pos === 'WR') {
        if (!foundWr1) {
          wr1List.push(p.round);
          foundWr1 = true;
        } else if (!foundWr2) {
          wr2List.push(p.round);
          foundWr2 = true;
        }
      } else if (pos === 'TE' && !foundTe1) {
        te1List.push(p.round);
        foundTe1 = true;
      }
    }
  }

  const totalPicks = userPicks.length;
  const completedDraftsCount = filteredDrafts.filter((d) => d.picks.length > 0).length;

  // 1. Positional counts
  const posCounts: Record<string, number> = { RB: 0, WR: 0, QB: 0, TE: 0, K: 0, DEF: 0 };
  const teamCounts: Record<string, number> = {};
  const playerCounts: Record<string, { count: number; position: string; team: string }> = {};
  const earlyPicksList: { round: number; position: string; player: string; team: string; isDynasty?: boolean }[] = [];

  const reaches: ReachItem[] = [];
  const steals: ReachItem[] = [];

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
        isDynasty: p.isDynasty,
      });

      if (pos === 'QB') earlyQBs += 1;
      if (pos === 'RB') earlyRBs += 1;
      if (pos === 'WR') earlyWRs += 1;
      if (pos === 'TE') earlyTEs += 1;
    }

    // Reach vs Value calculation against consensus ADP
    const expectedAdp = p.adp || p.pick_no;
    const diff = expectedAdp - p.pick_no; // > 0 means drafted earlier than ADP (reach)
    if (diff >= 5) {
      reaches.push({
        player: playerName,
        position: pos,
        team,
        pickNo: p.pick_no,
        adp: expectedAdp,
        diff,
        round: p.round,
        draftName: p.draftName,
      });
    } else if (diff <= -5) {
      steals.push({
        player: playerName,
        position: pos,
        team,
        pickNo: p.pick_no,
        adp: expectedAdp,
        diff: Math.abs(diff),
        round: p.round,
        draftName: p.draftName,
      });
    }
  }

  // Average position timing helper
  const avg = (arr: number[]): number | null => (arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null);
  const positionTiming: PositionTiming = {
    qb1Round: avg(qb1List),
    rb1Round: avg(rb1List),
    rb2Round: avg(rb2List),
    wr1Round: avg(wr1List),
    wr2Round: avg(wr2List),
    te1Round: avg(te1List),
  };

  // Positional Stats with percentages
  const positionStats: PositionStat[] = Object.entries(posCounts)
    .filter(([pos]) => ['RB', 'WR', 'QB', 'TE', 'K', 'DEF'].includes(pos))
    .map(([position, count]) => ({
      position,
      count,
      percentage: totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0,
      color: POSITION_COLORS[position] || '#94a3b8',
    }))
    .sort((a, b) => b.count - a.count);

  const favoriteTeams = Object.entries(teamCounts)
    .map(([team, count]) => ({
      team,
      count,
      percentage: totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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

  // Reach Statistics
  const reachRatePct = totalPicks > 0 ? Math.round((reaches.length / totalPicks) * 100) : 0;
  const topReaches = reaches.sort((a, b) => b.diff - a.diff).slice(0, 4);
  const topSteals = steals.sort((a, b) => b.diff - a.diff).slice(0, 4);

  // DNA Badges & Tactical Notes
  const dnaBadges: { title: string; desc: string; icon: string }[] = [];
  const scoutingNotes: string[] = [];

  // Reach Tendency Archetype
  if (reachRatePct >= 28) {
    dnaBadges.push({
      title: 'Aggressive Reacher',
      desc: `Reaches on ${reachRatePct}% of picks ahead of consensus ADP. Unafraid to grab "their guys".`,
      icon: 'Zap',
    });
    scoutingNotes.push(`High reach propensity (${reachRatePct}% reaches). If there is a buzz player they like, do not wait for standard ADP; take them a round earlier.`);
  } else if (steals.length >= reaches.length + 3) {
    dnaBadges.push({
      title: 'Value Opportunist',
      desc: 'Rarely reaches; capitalizes consistently on tumbling draft board value.',
      icon: 'Crosshair',
    });
    scoutingNotes.push('Disciplined board stalker. Does not force positional needs and scoops up sliding talent.');
  }

  // Positional Target Timing Insights
  if (positionTiming.qb1Round !== null) {
    if (positionTiming.qb1Round <= 3.5) {
      dnaBadges.push({
        title: 'Early QB Hunter',
        desc: `Locks down QB1 early (Avg Round ${positionTiming.qb1Round}).`,
        icon: 'Zap',
      });
      scoutingNotes.push(`Targets QB1 early (Avg Round ${positionTiming.qb1Round}). Jump ahead of them in round 3 if targeting elite tier QBs.`);
    } else if (positionTiming.qb1Round >= 8) {
      scoutingNotes.push(`Late QB streamer (Avg QB1 in Round ${positionTiming.qb1Round}). You can safely wait on QB when picking before them.`);
    }
  }

  if (positionTiming.rb1Round !== null && positionTiming.rb2Round !== null) {
    if (positionTiming.rb1Round <= 2 && positionTiming.rb2Round <= 3) {
      dnaBadges.push({
        title: 'Bellcow Hoarder',
        desc: `Secures RB1 & RB2 within the first 3 rounds (Avg R${positionTiming.rb1Round} & R${positionTiming.rb2Round}).`,
        icon: 'Shield',
      });
      scoutingNotes.push(`RB Heavy opening (Avg RB1: R${positionTiming.rb1Round}, RB2: R${positionTiming.rb2Round}). Expect early RB runs.`);
    }
  }

  if (positionTiming.te1Round !== null && positionTiming.te1Round <= 4) {
    dnaBadges.push({
      title: 'Elite TE Chaser',
      desc: `Drafts top-tier tight end early (Avg Round ${positionTiming.te1Round}).`,
      icon: 'Crown',
    });
  }

  // Dynasty Specific Insights
  if (dynastyCount > 0) {
    if (rookieCount >= 4) {
      dnaBadges.push({
        title: 'Dynasty Rookie Addict',
        desc: `Accumulates young talent (${rookieCount} rookies/sophomores drafted in dynasty leagues).`,
        icon: 'Sparkles',
      });
      scoutingNotes.push('High dynasty appetite for rookie upside. Expect them to trade up or reach on young playmakers.');
    } else {
      dnaBadges.push({
        title: 'Win-Now Dynasty Builder',
        desc: 'Prioritizes proven veteran production over raw rookie speculation in dynasty formats.',
        icon: 'Trophy',
      });
    }
  }

  if (favoriteTeams.length > 0 && favoriteTeams[0].count >= 3) {
    dnaBadges.push({
      title: `Team Bias: ${favoriteTeams[0].team}`,
      desc: `Drafted ${favoriteTeams[0].count} players from ${favoriteTeams[0].team}. Possible home team loyalty.`,
      icon: 'Flame',
    });
    scoutingNotes.push(`Strong loyalty to ${favoriteTeams[0].team} (${favoriteTeams[0].count} picks). Anticipate reaches on their key starters.`);
  }

  if (dnaBadges.length === 0) {
    dnaBadges.push({
      title: 'Balanced Drafter',
      desc: 'Balances positional needs flexibly without rigid biases.',
      icon: 'Crosshair',
    });
  }

  let threatLevel: ManagerScoutProfile['threatLevel'] = 'VALUE HUNTER';
  let threatColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  if (completedDraftsCount >= 4 || reachRatePct <= 15) {
    threatLevel = 'TACTICAL MASTERMIND';
    threatColor = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  } else if (reachRatePct >= 30) {
    threatLevel = 'WILDCARD';
    threatColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else if (completedDraftsCount >= 2) {
    threatLevel = 'HIGH THREAT';
    threatColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  } else {
    threatLevel = 'CASUAL';
    threatColor = 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  }

  return {
    user: targetUser,
    totalDraftsAnalyzed: completedDraftsCount,
    totalPicksAnalyzed: totalPicks,
    redraftDraftsCount: redraftCount,
    dynastyDraftsCount: dynastyCount,
    threatLevel,
    threatColor,
    dnaBadges,
    positionStats,
    positionTiming,
    reachStats: {
      reachCount: reaches.length,
      valueCount: steals.length,
      reachRatePct,
      topReaches,
      topSteals,
    },
    earlyRoundPicks: earlyPicksList,
    favoriteTeams,
    repeatPlayers,
    scoutingNotes,
    draftHistory: userPicks.sort((a, b) => (a.season === b.season ? a.pick_no - b.pick_no : (b.season || '').localeCompare(a.season || ''))),
  };
}
