import React from 'react';
import { Zap, Target } from 'lucide-react';
import { SleeperLeagueUser, ManagerScoutProfile } from '../types/sleeper';
import { getAvatarUrl } from '../services/sleeperApi';

interface LeagueReportViewProps {
  filteredUsers: SleeperLeagueUser[];
  leagueProfiles: Map<string, ManagerScoutProfile>;
  selectedOpponent: SleeperLeagueUser | null;
  isAnalyzingLeague: boolean;
  onAnalyzeLeague: () => void;
  onScoutOpponent: (user: SleeperLeagueUser) => void;
}

export const LeagueReportView: React.FC<LeagueReportViewProps> = ({
  filteredUsers,
  leagueProfiles,
  selectedOpponent,
  isAnalyzingLeague,
  onAnalyzeLeague,
  onScoutOpponent,
}) => {
  return (
    <>
      {leagueProfiles.size === 0 && !isAnalyzingLeague && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong style={{ font: '600 14px var(--display)', color: 'var(--ink)' }}>
              Ready to scout all {filteredUsers.length} league mates across all their drafts?
            </strong>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Click &quot;Analyze League Mates&quot; to uncover reach frequencies against ADP, positional timing, and draft archetypes for every manager.
            </p>
          </div>
          <button
            type="button"
            onClick={onAnalyzeLeague}
            disabled={isAnalyzingLeague || filteredUsers.length === 0}
            className="action-btn active"
            style={{ padding: '8px 16px', fontWeight: 700 }}
          >
            <Zap size={13} />
            <span>Analyze League Mates</span>
          </button>
        </div>
      )}

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
                        onClick={() => onScoutOpponent(u)}
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
                    onClick={() => onScoutOpponent(u)}
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
  );
};
