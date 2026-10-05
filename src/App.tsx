/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createGame } from './game/gameInstance';
import { MainScene } from './game/scenes/MainScene';
import { parseMapFile } from './game/MapParser';
import { HeroClass } from './types';
import { Play } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HelpModal } from './components/HelpModal';

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [currentMP, setCurrentMP] = useState(10);
  const [maxMP, setMaxMP] = useState(10);
  const [turnCount, setTurnCount] = useState(1);
  const [selectedHero, setSelectedHero] = useState<HeroClass>('knight');
  const [hasSelectedDestination, setHasSelectedDestination] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = createGame('phaser-game-container', {
        onStateUpdate: (state: any) => {
          setCurrentMP(state.currentMP);
          setMaxMP(state.maxMP);
          if (state.heroClass) {
            setSelectedHero(state.heroClass);
          }
          if (typeof state.hasSelectedDestination === 'boolean') {
            setHasSelectedDestination(state.hasSelectedDestination);
          }
        },
        onLogEvent: () => {},
        onInteraction: () => {},
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const handleSelectHero = (hero: HeroClass) => {
    setSelectedHero(hero);
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene('MainScene') as MainScene;
      if (mainScene) {
        mainScene.setHeroClass(hero);
      }
    }
  };

  const handleConfirmMove = () => {
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene('MainScene') as MainScene;
      if (mainScene) {
        mainScene.confirmMove();
        setHasSelectedDestination(false);
      }
    }
  };

  const handleEndTurn = () => {
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene('MainScene') as MainScene;
      if (mainScene) {
        mainScene.endTurn();
        setTurnCount((prev) => prev + 1);
        setCurrentMP(maxMP);
        setHasSelectedDestination(false);
      }
    }
  };

  const handleRestart = (customMapData?: any) => {
    if (gameRef.current) {
      const mainScene = gameRef.current.scene.getScene('MainScene') as MainScene;
      if (mainScene) {
        mainScene.scene.restart({
          heroClass: selectedHero,
          customMapData,
          onStateUpdate: (state: any) => {
            setCurrentMP(state.currentMP);
            setMaxMP(state.maxMP);
            if (state.heroClass) {
              setSelectedHero(state.heroClass);
            }
            if (typeof state.hasSelectedDestination === 'boolean') {
              setHasSelectedDestination(state.hasSelectedDestination);
            }
          },
          onLogEvent: () => {},
          onInteraction: () => {},
        });
        setTurnCount(1);
        setCurrentMP(10);
        setHasSelectedDestination(false);
      }
    }
  };

  const handleUploadMap = async (file: File) => {
    try {
      const parsedMap = await parseMapFile(file);
      if (parsedMap && parsedMap.grid) {
        handleRestart(parsedMap);
      } else {
        alert('Could not parse map file.');
      }
    } catch (err) {
      console.error(err);
      alert('Error reading or decoding map file.');
    }
  };

  const handleLoadDefaultMap = async () => {
    try {
      // Try loading from /Levels/Viox1234.map or /levels/Viox1234.map
      let res = await fetch('/Levels/Viox1234.map');
      if (!res.ok) {
        res = await fetch('/levels/Viox1234.map');
      }
      if (!res.ok) {
        throw new Error('Default map file not found');
      }
      const blob = await res.blob();
      const file = new File([blob], 'Viox1234.map', { type: 'application/octet-stream' });
      await handleUploadMap(file);
    } catch (err) {
      console.warn('Could not load default map from /Levels/Viox1234.map, loading default scenario.', err);
      handleRestart(undefined);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none flex flex-col">
      <Navbar
        turnCount={turnCount}
        selectedHero={selectedHero}
        onSelectHero={handleSelectHero}
        onUploadMap={handleUploadMap}
        onLoadDefaultMap={handleLoadDefaultMap}
      />

      {/* Map Viewport Container */}
      <div id="phaser-game-container" className="flex-1 w-full h-full relative"></div>

      {/* Bottom Right Floating Action Bar (End Turn Icon + Move Here Icon) */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3">
        {hasSelectedDestination && (
          <button
            onClick={handleConfirmMove}
            className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl transition-all animate-pulse border-2 border-emerald-400"
            title="Confirm Move"
          >
            <span className="text-xl">🎯</span>
          </button>
        )}

        <button
          onClick={handleEndTurn}
          className="w-12 h-12 bg-amber-600 hover:bg-amber-500 text-white rounded-full flex items-center justify-center shadow-2xl transition-all border-2 border-amber-400"
          title={`End Turn (${turnCount})`}
        >
          <Play className="w-5 h-5 fill-white" />
        </button>
      </div>

      <HelpModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
