import React, { useState } from 'react';
import { Search, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { SleeperUser } from '../types/sleeper';
import { getAvatarUrl } from '../services/sleeperApi';

interface SearchSectionProps {
  onSearch: (username: string) => void;
  isLoading: boolean;
  selectedSeason: string;
  onSeasonChange: (season: string) => void;
  currentUser: SleeperUser | null;
}

const AVAILABLE_SEASONS = ['2024', '2023', '2022'];
const POPULAR_SEARCHES = ['matt', 'andy', 'jason'];

export const SearchSection: React.FC<SearchSectionProps> = ({
  onSearch,
  isLoading,
  selectedSeason,
  onSeasonChange,
  currentUser,
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sleeper Competitive Intelligence Network</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Infiltrate Your League. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Scout Opponents' Draft DNA.
          </span>
        </h1>

        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Enter your Sleeper username to locate your leagues, unmask your opponents, and discover their draft habits, reaches, and positional tendencies.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row items-center gap-2 max-w-lg mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter Sleeper username (e.g. matt)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Scan Sleeper</span>}
          </button>
        </form>

        {/* Controls: Season selector & Quick tags */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <span className="text-slate-500 px-2 font-medium">Season:</span>
            {AVAILABLE_SEASONS.map((season) => (
              <button
                key={season}
                onClick={() => onSeasonChange(season)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                  selectedSeason === season
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {season}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1.5 text-slate-500">
            <span>Quick:</span>
            {POPULAR_SEARCHES.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setInputVal(name);
                  onSearch(name);
                }}
                className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
              >
                @{name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Active User pill */}
        {currentUser && (
          <div className="pt-2 inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-300">
            <img
              src={getAvatarUrl(currentUser.avatar)}
              alt={currentUser.display_name}
              className="w-4 h-4 rounded-full object-cover"
            />
            <span className="font-semibold text-white">{currentUser.display_name}</span>
            <span className="text-slate-400">(@{currentUser.username})</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        )}
      </div>
    </div>
  );
};
