


import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FactionId } from './types';
import { audioEngine } from './services/audioEngine';
import { ExhibitionOverlay } from './components/overlays/ExhibitionOverlay';
import { CompendiumOverlay } from './components/overlays/CompendiumOverlay';
import { WorkshopOverlay } from './components/overlays/WorkshopOverlay';
import { MainMenu } from './components/screens/MainMenu';
import { GameOverScreen } from './components/screens/GameOverScreen';
import { GameInterface } from './components/game/GameInterface';

// New Hook Architecture
import { useGameController } from './hooks/useGameController';
import { useDragAndDrop } from './hooks/useDragAndDrop';

const App: React.FC = () => {
  const {
      gameStarted, setGameStarted,
      gameState,
      isAudioEnabled, setIsAudioEnabled,
      customCards, saveCustomCard, deleteCustomCard,
      initGame, startCampaignLevel, nextLevel,
      playCard, upgradeTech, endTurn,
      handleMoveToCombat, handleCombat,
      attackingCardId, damagedCardId
  } = useGameController();

  const handlePlayCardById = (cardId: string, targetId?: string) => {
      if (!gameState) return;
      const player = gameState.players.find(p => p.id === 'player');
      if (!player) return;
      const index = player.hand.findIndex(c => c.id === cardId);
      if (index !== -1) {
          playCard(0, index, targetId);
      }
  };

  const { dragState, startDrag } = useDragAndDrop(gameState, handleCombat, handleMoveToCombat, handlePlayCardById);

  // UI State
  const [selectedFaction, setSelectedFaction] = useState<FactionId>(FactionId.NATO);
  const [showCompendium, setShowCompendium] = useState(false);
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [showExhibition, setShowExhibition] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Global Init
  useEffect(() => {
    const initAudio = () => { audioEngine.init(); };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
        window.removeEventListener('click', initAudio);
        window.removeEventListener('keydown', initAudio);
    };
  }, []);

  useEffect(() => {
    const triggerShake = () => {
        setIsScreenShaking(true);
        audioEngine.playAttack();
        setTimeout(() => setIsScreenShaking(false), 500);
    };
    window.addEventListener('screen-shake', triggerShake);
    return () => window.removeEventListener('screen-shake', triggerShake);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.logs]);

  // Main Render Logic
  if (!gameStarted) {
     return (
        <>
            {showCompendium && createPortal(<CompendiumOverlay onClose={() => setShowCompendium(false)} customCards={customCards} />, document.body)}
            {showWorkshop && createPortal(<WorkshopOverlay onClose={() => setShowWorkshop(false)} onSave={saveCustomCard} onDelete={deleteCustomCard} existingCustomCards={customCards} />, document.body)}
            {showExhibition && createPortal(<ExhibitionOverlay onClose={() => setShowExhibition(false)} />, document.body)}
            <MainMenu 
                selectedFaction={selectedFaction}
                setSelectedFaction={setSelectedFaction}
                onStartGame={initGame}
                onStartCampaignLevel={startCampaignLevel}
                onOpenCompendium={() => setShowCompendium(true)}
                onOpenWorkshop={() => setShowWorkshop(true)}
                onOpenExhibition={() => setShowExhibition(true)}
            />
        </>
     );
  }

  if (!gameState) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black font-mono">
            <div className="text-green-500 animate-pulse text-2xl font-black tracking-widest">LOADING BATTLEFIELD DATA...</div>
            <div className="fixed bottom-1 right-2 text-[10px] text-gray-700 font-bold z-50 pointer-events-none opacity-50">By 邢证道</div>
        </div>
      );
  }

  return (
    <>
        <GameInterface 
            gameState={gameState}
            isAudioEnabled={isAudioEnabled}
            toggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
            isScreenShaking={isScreenShaking}
            logsEndRef={logsEndRef}
            playCard={playCard}
            endTurn={endTurn}
            upgradeTech={upgradeTech}
            onExit={() => setGameStarted(false)} // Pass exit handler
            
            // Drag Props
            dragSourceId={dragState.dragSourceId}
            dragStartPos={dragState.dragStartPos}
            mousePos={dragState.mousePos}
            hoverTargetId={dragState.hoverTargetId}
            handleMouseDown={(e, card, type) => startDrag(e, card.id, type)}
            
            // Anim Props
            attackingCardId={attackingCardId}
            damagedCardId={damagedCardId}
        />

        {gameState.gameOver && (
            <GameOverScreen gameState={gameState} onRestart={() => setGameStarted(false)} onNextLevel={nextLevel} />
        )}
    </>
  );
};

export default App;