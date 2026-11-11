import React from 'react';
import { Loader2 } from 'lucide-react';
import { SleeperLeague, SleeperLeagueUser, ManagerScoutProfile } from '../types/sleeper';

interface SummaryStripProps {
  selectedLeague: SleeperLeague | null;
  selectedSeason: string;
  isAnalyzingLeague: boolean;
  leagueProfilesCount: number;
  leagueUsersCount: number;
  selectedOpponent: SleeperLeagueUser | null;
  scoutProfile: ManagerScoutProfile | null;
}

export const SummaryStrip: React.FC<SummaryStripProps> = ({
  selectedLeague,
  selectedSeason,
  isAnalyzingLeague,
  leagueProfilesCount,
  leagueUsersCount,
  selectedOpponent,
  scoutProfile,
}) => {
  const isCurrentLeagueDynasty = selectedLeague?.settings?.type === 2;

  return (
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
              <Loader2 size={14} className="spin" /> Scouting {leagueUsersCount} Mates…
            </span>
          ) : leagueProfilesCount > 0 ? (
            `${leagueProfilesCount} Managers Profiled`
          ) : (
            <span className="summary-muted">Ready to Analyze</span>
          )}
        </strong>
        <span className="summary-note">
          {leagueProfilesCount > 0 ? 'Scouted across all their drafts' : 'Click "Analyze League Mates" below'}
        </span>
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
  );
};
