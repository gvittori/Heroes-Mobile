/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeroState, GameLogEntry } from '../types';
import { Coins, Trees, Gem, Zap, ShieldAlert, Compass, Play } from 'lucide-react';

interface GameHUDProps {
  hero: HeroState;
  logs: GameLogEntry[];
  onEndTurn: () => void;
  turnCount: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({ hero, logs, onEndTurn, turnCount }) => {
  return (
    <aside className="w-full lg:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20">
      {/* Resource Header */}
      <div className="p-4 border-b border-slate-800 grid grid-cols-3 gap-2 bg-slate-950/60">
        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase font-medium text-slate-400">Gold</div>
            <div className="text-sm font-bold text-amber-300 tabular-nums">{hero.gold.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
          <Trees className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase font-medium text-slate-400">Wood</div>
            <div className="text-sm font-bold text-emerald-300 tabular-nums">{hero.wood}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
          <Gem className="w-4 h-4 text-sky-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] uppercase font-medium text-slate-400">Ore</div>
            <div className="text-sm font-bold text-sky-300 tabular-nums">{hero.ore}</div>
          </div>
        </div>
      </div>

      {/* Hero Status Panel */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-950 border border-blue-700 flex items-center justify-center text-lg shadow-inner">
              🛡️
            </div>
            <div>
              <h2 className="text-sm font-bold font-['Cinzel'] text-slate-100">Sir Lord Gallant</h2>
              <p className="text-xs text-slate-400">Paladin Commander</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Scout Radius</span>
            <div className="text-sm font-semibold text-amber-400">3 Tiles</div>
          </div>
        </div>

        {/* MP Bar */}
        <div className="space-y-1 mb-4">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Movement Points
            </span>
            <span className="text-amber-400 tabular-nums font-bold">
              {hero.currentMP} / {hero.maxMP} MP
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (hero.currentMP / hero.maxMP) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
          <div>
            <span className="text-slate-400">Attack:</span> <strong className="text-slate-200">12</strong>
          </div>
          <div>
            <span className="text-slate-400">Defense:</span> <strong className="text-slate-200">10</strong>
          </div>
          <div>
            <span className="text-slate-400">Army Units:</span> <strong className="text-slate-200">50 Swordsmen</strong>
          </div>
          <div>
            <span className="text-slate-400">Position:</span> <strong className="text-slate-200 tabular-nums">({hero.x}, {hero.y})</strong>
          </div>
        </div>

        {/* End Turn Button */}
        <button
          onClick={onEndTurn}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-md hover:from-amber-500 hover:to-amber-400 transition-all shadow-md text-xs font-['Cinzel'] tracking-wide"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          End Turn ({turnCount})
        </button>
      </div>

      {/* Adventure Log / Event Feed */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-950/30">
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-['Cinzel']">
            Adventure Log
          </span>
          <Compass className="w-3.5 h-3.5 text-slate-500" />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-6 italic">Awaiting hero actions...</div>
          ) : (
            logs.map((log) => {
              let badgeColor = 'text-slate-300 bg-slate-900 border-slate-800';
              if (log.type === 'success') badgeColor = 'text-emerald-300 bg-emerald-950/45 border-emerald-800/60';
              if (log.type === 'warning') badgeColor = 'text-amber-300 bg-amber-950/45 border-amber-800/60';
              if (log.type === 'combat') badgeColor = 'text-rose-300 bg-rose-950/45 border-rose-800/60';

              return (
                <div key={log.id} className={`p-2 rounded border ${badgeColor} transition-all`}>
                  <div className="flex items-center justify-between text-[10px] opacity-70 mb-0.5 font-sans">
                    <span>Turn {log.turn}</span>
                  </div>
                  <p className="font-sans leading-relaxed">{log.text}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
