import React from 'react';
import { Target, ExternalLink } from 'lucide-react';
import { SleeperLeagueUser, ManagerScoutProfile } from '../types/sleeper';
import { getAvatarUrl } from '../services/sleeperApi';

interface LeagueReportViewProps {
  filteredUsers: SleeperLeagueUser[];
  leagueProfiles: Map<string, ManagerScoutProfile>;
  selectedOpponent: SleeperLeagueUser | null;
  isAnalyzingLeague: boolean;
  onSelectOpponent: (user: SleeperLeagueUser, tab?: 'dossier' | 'activity') => void;
}

export const LeagueReportView: React.FC<LeagueReportViewProps> = ({
  filteredUsers,
  leagueProfiles,
  selectedOpponent,
  isAnalyzingLeague,
  onSelectOpponent,
}) => {
  return (
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
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
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
                  <tr
                    key={u.user_id}
                    className={isSelected ? 'selected-row' : ''}
                    onClick={() => onSelectOpponent(u)}
                    style={{ cursor: 'pointer' }}
                  >
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
                          {isAnalyzingLeague ? 'Analyzing…' : 'Pending Scout'}
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
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOpponent(u, 'dossier');
                          }}
                          className={`action-btn ${isSelected ? 'active' : ''}`}
                          title="View Draft DNA Dossier"
                        >
                          <Target size={12} />
                          <span>Dossier</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOpponent(u, 'activity');
                          }}
                          className="action-btn"
                          title="Inspect their draft boards, teams, trades in other leagues"
                        >
                          <ExternalLink size={12} />
                          <span>Other Leagues</span>
                        </button>
                      </div>
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
              <div
                key={u.user_id}
                className="m-standings-card"
                onClick={() => onSelectOpponent(u)}
                style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--accent-border)' : 'var(--line)' }}
              >
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
                      <span className="team-sub">@{u.username || 'user'} · {u.metadata?.team_name || 'Team'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOpponent(u, 'dossier');
                      }}
                      className="action-btn"
                    >
                      <Target size={11} />
                      <span>DNA</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOpponent(u, 'activity');
                      }}
                      className="action-btn active"
                    >
                      <ExternalLink size={11} />
                      <span>Stalk</span>
                    </button>
                  </div>
                </div>

                <div className="m-card-metrics-grid">
                  <div className="m-metric-cell">
                    <span className="m-metric-label">DNA</span>
                    <span className="m-metric-val">{profile?.dnaBadges[0]?.title || 'Pending'}</span>
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
