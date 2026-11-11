import {
  SleeperLeagueUser,
  SleeperDraftPick,
  SleeperDraft,
  ManagerScoutProfile,
  PositionStat,
  PositionTiming,
  ReachItem,
} from '../types/sleeper';

const POSITION_COLORS: Record<string, string> = {
  RB: '#3b82f6', // blue
  WR: '#10b981', // emerald
  QB: '#f59e0b', // amber
  TE: '#f97316', // orange
  K: '#a855f7', // purple
  DEF: '#ec4899', // pink
};

export function isDraftDynasty(draft: SleeperDraft): boolean {
  if (draft.settings?.player_type === 1) return true; // rookie draft
  if (draft.type === 'linear') return true;
  const scoring = (draft.metadata?.scoring_type || '').toLowerCase();
  const name = (draft.metadata?.name || '').toLowerCase();
  return scoring.includes('dynasty') || name.includes('dynasty') || name.includes('rookie');
}

/**
 * Builds separate consensus ADP maps for redraft and dynasty rookie drafts
 */
export function buildConsensusAdpMaps(draftsWithPicks: { draft: SleeperDraft; picks: SleeperDraftPick[] }[]) {
  const redraftSums = new Map<string, { total: number; count: number }>();
  const dynastySums = new Map<string, { total: number; count: number }>();

  for (const { draft, picks } of draftsWithPicks) {
    const isDyn = isDraftDynasty(draft);
    const targetMap = isDyn ? dynastySums : redraftSums;

    for (const p of picks) {
      if (!p.player_id) continue;
      const cur = targetMap.get(p.player_id) || { total: 0, count: 0 };
      cur.total += p.pick_no;
      cur.count += 1;
      targetMap.set(p.player_id, cur);
    }
  }

  const redraftAdp = new Map<string, number>();
  for (const [pid, data] of redraftSums.entries()) {
    redraftAdp.set(pid, Math.round(data.total / data.count));
  }

  const dynastyAdp = new Map<string, number>();
  for (const [pid, data] of dynastySums.entries()) {
    dynastyAdp.set(pid, Math.round(data.total / data.count));
  }

  return { redraftAdp, dynastyAdp };
}

export function buildManagerDossier(
  targetUser: SleeperLeagueUser,
  draftsWithPicks: { draft: SleeperDraft; picks: SleeperDraftPick[] }[],
  globalAdpMaps?: { redraftAdp: Map<string, number>; dynastyAdp: Map<string, number> } | Map<string, number>,
  formatFilter: 'all' | 'redraft' | 'dynasty' = 'all'
): ManagerScoutProfile {
  // Build in-sample ADP maps if not provided
  let redraftAdp: Map<string, number>;
  let dynastyAdp: Map<string, number>;

  if (globalAdpMaps && 'redraftAdp' in globalAdpMaps) {
    redraftAdp = globalAdpMaps.redraftAdp;
    dynastyAdp = globalAdpMaps.dynastyAdp;
  } else if (globalAdpMaps instanceof Map) {
    redraftAdp = globalAdpMaps;
    dynastyAdp = globalAdpMaps;
  } else {
    const maps = buildConsensusAdpMaps(draftsWithPicks);
    redraftAdp = maps.redraftAdp;
    dynastyAdp = maps.dynastyAdp;
  }

  // Filter drafts based on format filter
  const filteredDrafts = draftsWithPicks.filter(({ draft }) => {
    const isDyn = isDraftDynasty(draft);
    if (formatFilter === 'redraft') return !isDyn;
    if (formatFilter === 'dynasty') return isDyn;
    return true;
  });

  const userPicks: (SleeperDraftPick & {
    draftName?: string;
    season?: string;
    isDynasty?: boolean;
    adp?: number;
  })[] = [];

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

    const relevantAdpMap = isDyn ? dynastyAdp : redraftAdp;

    let foundQb1 = false;
    let foundRb1 = false;
    let foundRb2 = false;
    let foundWr1 = false;
    let foundWr2 = false;
    let foundTe1 = false;

    for (const p of draftUserPicks) {
      const pos = (p.metadata?.position || 'FLEX').toUpperCase();
      const expectedAdp = relevantAdpMap.get(p.player_id) || p.pick_no;

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
    const pos = (p.metadata?.position || 'FLEX').toUpperCase();
    if (pos in posCounts) {
      posCounts[pos] += 1;
    } else {
      posCounts[pos] = (posCounts[pos] || 0) + 1;
    }

    const team = p.metadata?.team || 'FA';
    if (team && team !== 'FA') {
      teamCounts[team] = (teamCounts[team] || 0) + 1;
    }

    const playerName = `${p.metadata?.first_name || ''} ${p.metadata?.last_name || ''}`.trim() || 'Unknown Player';
    if (!playerCounts[playerName]) {
      playerCounts[playerName] = { count: 1, position: pos, team };
    } else {
      playerCounts[playerName].count += 1;
    }

    if (p.metadata?.years_exp === '0' || p.metadata?.years_exp === '1') {
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

    // Context-Aware Reach vs Steal logic:
    // A reach is picking a player significantly ahead of consensus ADP.
    // Early rounds require 8+ spots (almost a full round in 12-team),
    // Middle rounds require 14+ spots, late rounds require 20+ spots.
    const expectedAdp = p.adp || p.pick_no;
    const diff = expectedAdp - p.pick_no; // > 0 means picked earlier than expected ADP

    let reachThreshold = 10;
    if (p.round <= 3) reachThreshold = 8;
    else if (p.round <= 7) reachThreshold = 14;
    else reachThreshold = 20;

    if (diff >= reachThreshold) {
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
    } else if (diff <= -reachThreshold) {
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

  // Positional average rounds
  const avg = (arr: number[]): number | null =>
    arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

  const positionTiming: PositionTiming = {
    qb1Round: avg(qb1List),
    rb1Round: avg(rb1List),
    rb2Round: avg(rb2List),
    wr1Round: avg(wr1List),
    wr2Round: avg(wr2List),
    te1Round: avg(te1List),
  };

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
  const stealRatePct = totalPicks > 0 ? Math.round((steals.length / totalPicks) * 100) : 0;
  const topReaches = reaches.sort((a, b) => b.diff - a.diff).slice(0, 4);
  const topSteals = steals.sort((a, b) => b.diff - a.diff).slice(0, 4);

  // Diverse Draft Archetypes
  const dnaBadges: { title: string; desc: string; icon: string }[] = [];
  const scoutingNotes: string[] = [];

  // 1. Structural Strategy Archetypes
  if (positionTiming.rb1Round !== null && positionTiming.rb2Round !== null) {
    if (positionTiming.rb1Round <= 2.2 && positionTiming.rb2Round >= 6.0) {
      dnaBadges.push({
        title: 'Hero RB Anchor',
        desc: `Locks down an elite RB1 early (R${positionTiming.rb1Round}), then floods WRs before picking RB2 (R${positionTiming.rb2Round}).`,
        icon: 'Shield',
      });
      scoutingNotes.push(`Textbook Hero RB drafter (RB1: R${positionTiming.rb1Round}, RB2: R${positionTiming.rb2Round}). Expect heavy middle-round WR hoarding.`);
    } else if (positionTiming.rb1Round >= 4.5) {
      dnaBadges.push({
        title: 'Zero RB Zealot',
        desc: `Punts RB1 until Round ${positionTiming.rb1Round}, heavily prioritizing early pass-catchers and elite QB.`,
        icon: 'Zap',
      });
      scoutingNotes.push(`Zero RB practitioner (waits until R${positionTiming.rb1Round} for RB1). Will target late-round high-upside backup running backs.`);
    } else if (positionTiming.rb1Round <= 2.0 && positionTiming.rb2Round <= 3.2) {
      dnaBadges.push({
        title: 'Dual Bellcow Bully',
        desc: `Locks in two workhorse RBs in the first 3 rounds (Avg R${positionTiming.rb1Round} & R${positionTiming.rb2Round}).`,
        icon: 'Shield',
      });
      scoutingNotes.push(`Traditional Heavy-RB drafter (2 RBs by R${positionTiming.rb2Round}). Will spark early RB runs.`);
    }
  }

  // 2. QB & TE Priority Archetypes
  if (positionTiming.qb1Round !== null) {
    if (positionTiming.qb1Round <= 3.5) {
      dnaBadges.push({
        title: 'Elite QB Anchor',
        desc: `Pays a premium for top-tier QB early (Avg Round ${positionTiming.qb1Round}).`,
        icon: 'Crown',
      });
      scoutingNotes.push(`Prioritizes elite QB in rounds 2–3 (Avg R${positionTiming.qb1Round}). Jump ahead of them if targeting top QBs.`);
    } else if (positionTiming.qb1Round >= 9.0) {
      dnaBadges.push({
        title: 'Late QB Streamer',
        desc: `Waits until double-digit rounds for QB1 (Avg Round ${positionTiming.qb1Round}).`,
        icon: 'Compass',
      });
      scoutingNotes.push(`Patient on quarterbacks (Avg R${positionTiming.qb1Round}). You can safely wait on QB when picking before them.`);
    }
  }

  if (positionTiming.te1Round !== null) {
    if (positionTiming.te1Round <= 3.8) {
      dnaBadges.push({
        title: 'Elite TE Specialist',
        desc: `Invests high draft capital in difference-maker TE (Avg Round ${positionTiming.te1Round}).`,
        icon: 'Crown',
      });
      scoutingNotes.push(`Aggressive on top tight ends (Avg R${positionTiming.te1Round}). Expect them to pull the trigger on tier 1 TEs.`);
    } else if (positionTiming.te1Round >= 10.0) {
      dnaBadges.push({
        title: 'Late TE Punter',
        desc: `Refuses early TE draft capital; drafts TE1 late (Avg Round ${positionTiming.te1Round}).`,
        icon: 'Compass',
      });
    }
  }

  // 3. Draft Board Discipline / Reach vs Steal Archetype
  if (reachRatePct >= 25 && reachRatePct > stealRatePct + 10) {
    dnaBadges.push({
      title: 'Aggressive Reacher',
      desc: `Reaches on ${reachRatePct}% of picks ahead of market ADP. Drafts 'their guys' without hesitation.`,
      icon: 'Zap',
    });
    scoutingNotes.push(`Genuine reach tendency (${reachRatePct}% reaches). If there is a trending breakout player they like, take them early.`);
  } else if (stealRatePct >= 25 && stealRatePct > reachRatePct + 10) {
    dnaBadges.push({
      title: 'BPA Value Hunter',
      desc: `Consistently capitalizes on tumbling draft value (${stealRatePct}% value steals).`,
      icon: 'Crosshair',
    });
    scoutingNotes.push('Patient board stalker. Does not reach for positions and scoops up sliding ADP value.');
  }

  // 4. Dynasty Specific Insights
  if (dynastyCount > 0) {
    if (rookieCount >= 4) {
      dnaBadges.push({
        title: 'Dynasty Youth Hoarder',
        desc: `High appetite for rookie upside (${rookieCount} rookies drafted across dynasty formats).`,
        icon: 'Sparkles',
      });
    } else {
      dnaBadges.push({
        title: 'Win-Now Dynasty Builder',
        desc: 'Prioritizes battle-tested veteran production over rookie lottery tickets in dynasty formats.',
        icon: 'Trophy',
      });
    }
  }

  // 5. NFL Franchise Bias
  if (favoriteTeams.length > 0 && favoriteTeams[0].count >= 3) {
    dnaBadges.push({
      title: `${favoriteTeams[0].team} Fanatic`,
      desc: `Drafted ${favoriteTeams[0].count} players from ${favoriteTeams[0].team}. Observable NFL franchise loyalty.`,
      icon: 'Flame',
    });
    scoutingNotes.push(`Noteworthy loyalty to ${favoriteTeams[0].team} (${favoriteTeams[0].count} picks). Expect slight reach premium on their starters.`);
  }

  // Fallback if balanced
  if (dnaBadges.length === 0) {
    dnaBadges.push({
      title: 'Balanced Board Stalker',
      desc: 'Maintains fluid draft discipline; responds flexibly to board runs without rigid biases.',
      icon: 'Crosshair',
    });
    scoutingNotes.push('Balanced drafter. Balances positional needs without extreme early reaches or rigid dogma.');
  }

  let threatLevel: ManagerScoutProfile['threatLevel'] = 'VALUE HUNTER';
  let threatColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  if (stealRatePct >= 25 && reachRatePct <= 15) {
    threatLevel = 'TACTICAL MASTERMIND';
    threatColor = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  } else if (reachRatePct >= 28) {
    threatLevel = 'WILDCARD';
    threatColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else if (completedDraftsCount >= 3) {
    threatLevel = 'HIGH THREAT';
    threatColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  } else {
    threatLevel = 'CASUAL';
    threatColor = 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  }

  const otherDrafts = filteredDrafts.map(({ draft }) => ({
    draftId: draft.draft_id,
    name: draft.metadata?.name || `Draft ${draft.season}`,
    season: draft.season,
    type: draft.type,
    isDynasty: isDraftDynasty(draft),
    teams: draft.settings?.teams || 12,
    rounds: draft.settings?.rounds || 15,
  }));

  return {
    user: targetUser,
    totalDraftsAnalyzed: completedDraftsCount,
    totalPicksAnalyzed: totalPicks,
    redraftDraftsCount: redraftCount,
    dynastyDraftsCount: dynastyCount,
    otherDrafts,
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
    draftHistory: userPicks.sort((a, b) =>
      a.season === b.season ? a.pick_no - b.pick_no : (b.season || '').localeCompare(a.season || '')
    ),
  };
}
