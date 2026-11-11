import React from 'react';
import {
  Zap,
  Target,
  Compass,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';
import { ManagerScoutProfile } from '../types/sleeper';

interface ScoutDossierViewProps {
  scoutProfile: ManagerScoutProfile;
}

export const ScoutDossierView: React.FC<ScoutDossierViewProps> = ({ scoutProfile }) => {
  return (
    <div className="dossier-grid">
      {/* Card 1: Reach vs Value & Positional Timing */}
      <div className="dossier-card">
        <div>
          <div className="dossier-card-title">
            <h3>
              <Zap size={14} style={{ color: '#fbbf24' }} />
              <span>Reach Frequency &amp; Target Timing</span>
            </h3>
            <span>{scoutProfile.totalDraftsAnalyzed} Drafts Analyzed</span>
          </div>

          {/* Timing Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <div className="timing-chip">
              <div style={{ color: 'var(--muted)', fontSize: '9px' }}>QB1 ROUND</div>
              <div style={{ font: '700 13px var(--mono)', color: '#fbbf24' }}>
                {scoutProfile.positionTiming.qb1Round ? `R${scoutProfile.positionTiming.qb1Round}` : '—'}
              </div>
            </div>
            <div className="timing-chip">
              <div style={{ color: 'var(--muted)', fontSize: '9px' }}>RB1 ROUND</div>
              <div style={{ font: '700 13px var(--mono)', color: '#60a5fa' }}>
                {scoutProfile.positionTiming.rb1Round ? `R${scoutProfile.positionTiming.rb1Round}` : '—'}
              </div>
            </div>
            <div className="timing-chip">
              <div style={{ color: 'var(--muted)', fontSize: '9px' }}>WR1 ROUND</div>
              <div style={{ font: '700 13px var(--mono)', color: '#34d399' }}>
                {scoutProfile.positionTiming.wr1Round ? `R${scoutProfile.positionTiming.wr1Round}` : '—'}
              </div>
            </div>
            <div className="timing-chip">
              <div style={{ color: 'var(--muted)', fontSize: '9px' }}>TE1 ROUND</div>
              <div style={{ font: '700 13px var(--mono)', color: '#fb923c' }}>
                {scoutProfile.positionTiming.te1Round ? `R${scoutProfile.positionTiming.te1Round}` : '—'}
              </div>
            </div>
          </div>

          {/* Top Reaches vs Steals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div>
              <div style={{ font: '600 11px var(--mono)', color: 'var(--unlucky-text)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <TrendingUp size={12} />
                <span>Biggest Reaches (Ahead of ADP)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scoutProfile.reachStats.topReaches.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ padding: '6px 8px', background: 'var(--surface-raised)', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.player}</span>
                    <span style={{ color: 'var(--unlucky-text)', fontFamily: 'var(--mono)' }}>+{r.diff} early</span>
                  </div>
                ))}
                {scoutProfile.reachStats.topReaches.length === 0 && (
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>No aggressive reaches logged.</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ font: '600 11px var(--mono)', color: 'var(--lucky-text)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <TrendingDown size={12} />
                <span>Biggest Value Steals</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scoutProfile.reachStats.topSteals.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ padding: '6px 8px', background: 'var(--surface-raised)', borderRadius: '5px', border: '1px solid var(--line)', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.player}</span>
                    <span style={{ color: 'var(--lucky-text)', fontFamily: 'var(--mono)' }}>-{s.diff} late</span>
                  </div>
                ))}
                {scoutProfile.reachStats.topSteals.length === 0 && (
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Follows standard board flow.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="tactical-box">
          <div className="tactical-box-header">
            <Compass size={13} />
            <span>Tactical Exploitation Advice</span>
          </div>
          <ul>
            {scoutProfile.scoutingNotes.map((note, nIdx) => (
              <li key={nIdx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Card 2: Positional Allocation & Format Breakdown */}
      <div className="dossier-card">
        <div>
          <div className="dossier-card-title">
            <h3>
              <Target size={14} style={{ color: 'var(--lucky-text)' }} />
              <span>Positional Allocation &amp; Format Split</span>
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className="badge-redraft">{scoutProfile.redraftDraftsCount} Redraft</span>
              <span className="badge-dynasty">{scoutProfile.dynastyDraftsCount} Dynasty</span>
            </div>
          </div>

          <div className="position-bar-wrap">
            {scoutProfile.positionStats.map((s) => (
              <div
                key={s.position}
                style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                title={`${s.position}: ${s.percentage}%`}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {scoutProfile.positionStats.map((st) => (
              <div
                key={st.position}
                style={{
                  padding: '8px',
                  background: 'var(--surface-raised)',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                }}
              >
                <span style={{ fontWeight: 700, color: st.color }}>{st.position}</span>
                <span style={{ color: 'var(--ink)' }}>{st.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team bias */}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <ShieldAlert size={13} style={{ color: 'var(--accent-text)' }} />
            <span style={{ font: '600 12px var(--display)', color: 'var(--ink)' }}>Favorite NFL Franchises:</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {scoutProfile.favoriteTeams.map((ft) => (
              <span
                key={ft.team}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--line)',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--ink-secondary)',
                }}
              >
                {ft.team} ({ft.count} picks)
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
