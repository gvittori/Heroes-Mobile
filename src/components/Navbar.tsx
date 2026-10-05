/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Upload, Map as MapIcon, ChevronDown } from 'lucide-react';
import { HeroClass } from '../types';

const HEROES: { id: HeroClass; name: string; icon: string }[] = [
  { id: 'knight', name: 'Knight', icon: '🛡️' },
  { id: 'barbarian', name: 'Barbarian', icon: '🪓' },
  { id: 'sorceress', name: 'Sorceress', icon: '✨' },
  { id: 'warlock', name: 'Warlock', icon: '🔮' },
];

interface NavbarProps {
  turnCount: number;
  selectedHero: HeroClass;
  onSelectHero: (hero: HeroClass) => void;
  onUploadMap: (file: File) => void;
  onLoadDefaultMap: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  turnCount,
  selectedHero,
  onSelectHero,
  onUploadMap,
  onLoadDefaultMap,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadMap(file);
    }
    if (e.target) e.target.value = '';
    setIsMenuOpen(false);
  };

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-100 z-50">
      {/* Left: Hero Faction Selector + Turn Count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {HEROES.map((h) => {
            const isActive = selectedHero === h.id;
            return (
              <button
                key={h.id}
                onClick={() => onSelectHero(h.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={`Switch hero to ${h.name}`}
              >
                <span>{h.icon}</span>
                <span className="hidden sm:inline">{h.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 px-2 border-l border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Turn <strong className="text-slate-200 tabular-nums">{turnCount}</strong>
        </div>
      </div>

      {/* Right: Map Menu (Default vs Upload) */}
      <div className="relative" ref={menuRef}>
        <input
          type="file"
          accept=".map,.mp1,.json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap shadow-sm"
          title="Map options"
        >
          <MapIcon className="w-4 h-4 text-amber-400" />
          <span>Map</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onLoadDefaultMap();
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
            >
              <span className="text-amber-400">⭐</span> Load Default Map
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors border-t border-slate-800"
            >
              <Upload className="w-4 h-4 text-emerald-400" /> Upload Custom Map...
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
