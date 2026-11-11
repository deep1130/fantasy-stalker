import React from 'react';
import { ManagerScoutProfile } from '../types/sleeper';

interface PickLogViewProps {
  scoutProfile: ManagerScoutProfile;
  selectedSeason: string;
}

export const PickLogView: React.FC<PickLogViewProps> = ({ scoutProfile, selectedSeason }) => {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="th-rank">Round / Pick</th>
            <th>Player</th>
            <th>Position</th>
            <th>Format</th>
            <th>ADP vs Pick</th>
            <th>Team</th>
            <th style={{ textAlign: 'right' }}>Season</th>
          </tr>
        </thead>
        <tbody>
          {scoutProfile.draftHistory.map((pick, pIdx) => {
            const fullName =
              `${pick.metadata?.first_name || ''} ${pick.metadata?.last_name || ''}`.trim() || 'Unknown';
            const pos = (pick.metadata?.position || 'FLEX').toUpperCase();
            const expectedAdp = pick.adp || pick.pick_no;
            const diff = expectedAdp - pick.pick_no;

            return (
              <tr key={`${pick.draft_id}-${pick.pick_no}-${pIdx}`}>
                <td className="th-rank" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                  R{pick.round} (#{pick.pick_no})
                </td>
                <td style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {fullName}
                  {pick.is_keeper && (
                    <span
                      style={{
                        marginLeft: '6px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-text)',
                        fontSize: '9px',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      KEEPER
                    </span>
                  )}
                </td>
                <td>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      color:
                        pos === 'RB'
                          ? '#60a5fa'
                          : pos === 'WR'
                          ? '#34d399'
                          : pos === 'QB'
                          ? '#fbbf24'
                          : '#f97316',
                    }}
                  >
                    {pos}
                  </span>
                </td>
                <td>
                  {pick.isDynasty ? (
                    <span className="badge-dynasty">Dynasty</span>
                  ) : (
                    <span className="badge-redraft">Redraft</span>
                  )}
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>
                  {diff >= 5 ? (
                    <span style={{ color: 'var(--unlucky-text)' }}>Reach (+{diff})</span>
                  ) : diff <= -5 ? (
                    <span style={{ color: 'var(--lucky-text)' }}>Steal (-{Math.abs(diff)})</span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>At ADP</span>
                  )}
                </td>
                <td style={{ fontFamily: 'var(--mono)', color: 'var(--ink-secondary)' }}>
                  {pick.metadata?.team || 'FA'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                  {pick.season || selectedSeason}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
