import React from 'react';
import { Shield, Sparkles, Activity, Award } from 'lucide-react';
import { ManagerScoutProfile } from '../../types/sleeper';
import { getAvatarUrl } from '../../services/sleeperApi';

interface DossierHeaderProps {
  profile: ManagerScoutProfile;
}

export const DossierHeader: React.FC<DossierHeaderProps> = ({ profile }) => {
  const { user, threatLevel, threatColor, totalDraftsAnalyzed, totalPicksAnalyzed, dnaBadges } = profile;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Manager Details */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src={getAvatarUrl(user.avatar)}
              alt={user.display_name}
              className="w-16 h-16 rounded-2xl object-cover bg-slate-800 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
            />
            <div className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {user.display_name}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${threatColor}`}>
                {threatLevel}
              </span>
            </div>
            <p className="text-sm text-slate-400">@{user.username || 'sleeper_user'}</p>
            {user.metadata?.team_name && (
              <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
                {user.metadata.team_name}
              </p>
            )}
          </div>
        </div>

        {/* Quick Intel Stats */}
        <div className="flex items-center gap-4 text-center">
          <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-center space-x-1 text-slate-400 text-xs mb-0.5">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Drafts Analyzed</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {totalDraftsAnalyzed}
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-center space-x-1 text-slate-400 text-xs mb-0.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Picks Tracked</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {totalPicksAnalyzed}
            </div>
          </div>
        </div>
      </div>

      {/* DNA Archetype Badges */}
      {dnaBadges.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="text-xs text-slate-400 font-semibold mb-2 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Identified Draft DNA & Behavioral Patterns:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dnaBadges.map((badge, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center space-x-2"
              >
                <span className="font-bold text-slate-200">{badge.title}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-[11px]">{badge.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
