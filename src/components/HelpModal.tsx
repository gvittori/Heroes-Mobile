/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Shield, Zap, Footprints, Flag } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold font-['Cinzel'] text-amber-400">Adventure Guide & Manual</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300 font-sans">
          <div>
            <h3 className="text-base font-semibold text-amber-300 mb-2 font-['Cinzel']">
              1. Overworld Node Movement & Terrain Costs
            </h3>
            <p className="text-slate-400 leading-relaxed mb-3">
              Inspired by Heroes of Might and Magic I, your hero traverses a grid where each tile has a specific Movement Point (MP) cost. Diagonal moves factor in Pythagorean distance (1.414 × terrain cost).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-bold text-amber-400">Road</div>
                <div className="text-xs text-slate-400">0.75 MP per step</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-bold text-emerald-400">Grassland / Dirt</div>
                <div className="text-xs text-slate-400">1.0 MP per step</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-bold text-sky-400">Rough Terrain</div>
                <div className="text-xs text-slate-400">1.5 MP per step</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-bold text-teal-400">Swamp</div>
                <div className="text-xs text-slate-400">2.0 MP per step</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="font-bold text-rose-400">Water / Mountain</div>
                <div className="text-xs text-slate-400">Impassable (Infinity)</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-amber-300 mb-2 font-['Cinzel']">
              2. Pathfinding & Path Preview
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Hover over any tile to preview the optimal A* path.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li><strong className="text-emerald-400">Green Dots:</strong> Steps reachable within your remaining MP this turn.</li>
              <li><strong className="text-rose-400">Red Dots:</strong> Steps requiring future turns (movement will pause when MP hits 0).</li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-amber-300 mb-2 font-['Cinzel']">
              3. Fog of War & Objectives
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Your hero has a scouting radius of 3 tiles. Unexplored areas are shrouded in darkness. Explore the map to discover Gold Mines, Sawmills, Treasure Chests, and Monster Camps. Defeat the enemy stronghold in the eastern reaches to claim victory!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors font-['Cinzel']"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
