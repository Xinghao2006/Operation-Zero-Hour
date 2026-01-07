








import { useState, useEffect } from 'react';
import { Card, FactionId, GameMode, GameState } from '../types';
import { audioEngine } from '../services/audioEngine';
import { calculateAIMove } from '../logic/aiLogic';
import { createInitialGameState } from '../logic/initialization';
import { executeUpgradeTech, executePlayCard, executeEndTurn } from '../logic/turnManager';
import { executeMoveToCombat, executeCombat } from '../logic/combatManager';
import { CAMPAIGN_LEVELS } from '../logic/campaignData';
import { processCampaignEvent } from '../logic/modes/campaignMode';

export const useGameController = () => {
    const [gameStarted, setGameStarted] = useState(false);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [customCards, setCustomCards] = useState<Card[]>([]);
    
    // Animation States
    const [attackingCardId, setAttackingCardId] = useState<string | null>(null);
    const [damagedCardId, setDamagedCardId] = useState<string | null>(null);

    // Audio toggle
    useEffect(() => {
        audioEngine.toggleAudio(isAudioEnabled);
    }, [isAudioEnabled]);

    // Background Music
    useEffect(() => {
        if (gameState && !gameState.gameOver && gameStarted) {
            audioEngine.setDefcon(gameState.defcon);
            audioEngine.startBgm();
        } else {
            audioEngine.stopBgm();
        }
        return () => audioEngine.stopBgm();
    }, [gameState?.defcon, gameStarted, gameState?.gameOver]);

    // Load Custom Cards
    useEffect(() => {
        const saved = localStorage.getItem('ozh_custom_cards');
        if (saved) {
            try { setCustomCards(JSON.parse(saved)); } catch (e) { console.error(e); }
        }
    }, []);

    const saveCustomCard = (card: Card) => {
        const updated = [...customCards, card];
        setCustomCards(updated);
        localStorage.setItem('ozh_custom_cards', JSON.stringify(updated));
    };

    const deleteCustomCard = (cardId: string) => {
        const updated = customCards.filter(c => c.id !== cardId);
        setCustomCards(updated);
        localStorage.setItem('ozh_custom_cards', JSON.stringify(updated));
    };

    const initGame = (faction: FactionId, mode: GameMode = 'STANDARD') => {
        const newState = createInitialGameState(faction, customCards, undefined, mode);
        setGameState(newState);
        setGameStarted(true);
    };

    const startCampaignLevel = (levelId: string) => {
        const scenario = CAMPAIGN_LEVELS.find(l => l.id === levelId);
        if (!scenario) return;
        
        // Pass the player faction from scenario, ignore selection
        const newState = createInitialGameState(scenario.playerFaction, customCards, scenario);
        setGameState(newState);
        setGameStarted(true);
    };
    
    const nextLevel = () => {
        if (!gameState || !gameState.campaignLevelId) return;
        const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === gameState.campaignLevelId);
        if (idx >= 0 && idx < CAMPAIGN_LEVELS.length - 1) {
            const nextScenario = CAMPAIGN_LEVELS[idx + 1];
            setGameState(null); // Force reset
            setTimeout(() => {
                startCampaignLevel(nextScenario.id);
            }, 100);
        } else {
            // End of campaign
            setGameStarted(false);
        }
    };

    const upgradeTech = (choiceId?: string) => {
        if (!gameState) return;
        // Campaign Tech Lock Logic could be here, but simpler to rely on scenario config or AI check
        setGameState(executeUpgradeTech(gameState, choiceId));
    };

    const playCard = (playerIndex: number, cardIndex: number, targetId?: string) => {
        if (!gameState) return;
        setGameState(executePlayCard(gameState, playerIndex, cardIndex, targetId));
    };

    const endTurn = () => {
        if (!gameState) return;
        setGameState(executeEndTurn(gameState));
    };

    const handleMoveToCombat = (unitId: string) => {
        if (!gameState) return;
        setGameState(executeMoveToCombat(gameState, unitId));
    };

    const handleCombat = (attackerId: string, targetType: 'unit' | 'hq', targetId?: string) => {
        if (!gameState) return;
        
        // Trigger Animations
        setAttackingCardId(attackerId);
        if (targetId) setDamagedCardId(targetId);
        if (targetType === 'hq') setDamagedCardId('enemy_hq');
        
        // Execute Logic
        setGameState(executeCombat(gameState, attackerId, targetType, targetId));

        setTimeout(() => {
            setAttackingCardId(null);
            setDamagedCardId(null);
        }, 500);
    };
    
    // Monitor Scripted Attacks (from campaign mode)
    useEffect(() => {
        if (gameState?.campaignState?.scriptedAttackId) {
            setAttackingCardId(gameState.campaignState.scriptedAttackId);
            setTimeout(() => {
                setAttackingCardId(null);
            }, 500);
        }
    }, [gameState?.campaignState?.scriptedAttackId]);

    // AI Loop
    useEffect(() => {
         if (gameState?.currentPlayerId === 'enemy' && !gameState.gameOver) {
             
             // SCRIPTED AI MODE
             if (gameState.campaignState?.isScriptedAI) {
                 const timer = setInterval(() => {
                     // We need to re-fetch the latest state if we were inside a closure, 
                     // but React state updates might be batched. 
                     // Since we depend on `gameState` in the useEffect array, this timer is recreated on every state change.
                     // So one-off execution per state update is safer, or checking flags.
                     
                     // Instead of complex interval logic, we just trigger "Next Script Tick" every 1.5s
                     // processCampaignEvent handles the logic based on tick count.
                     
                     if (gameState.currentPlayerId !== 'enemy') {
                         clearInterval(timer);
                         return;
                     }
                     
                     setGameState(prevState => {
                         if (!prevState) return null;
                         const nextState = { ...prevState };
                         if (!nextState.campaignState) return nextState;
                         
                         // Increment script tick
                         nextState.campaignState.scriptTick = (nextState.campaignState.scriptTick || 0) + 1;
                         
                         // Run script processor
                         return processCampaignEvent(nextState);
                     });

                 }, 1500); // 1.5s per action
                 
                 return () => clearInterval(timer);
             }

             // STANDARD AI MODE
             const timer = setTimeout(() => {
                const ai = gameState.players.find(p => p.id === 'enemy')!;
                const player = gameState.players.find(p => p.id === 'player')!;

                const action = calculateAIMove(ai, player, gameState.defcon, gameState.turn, gameState.gameMode);

                switch(action.type) {
                    case 'UPGRADE': upgradeTech(action.payload.techId); break;
                    case 'PLAY_CARD': playCard(1, action.payload.cardIndex); break;
                    case 'MOVE_UNIT': handleMoveToCombat(action.payload.unitId); break;
                    case 'ATTACK': handleCombat(action.payload.attackerId, action.payload.targetType, action.payload.targetId); break;
                    case 'END_TURN': default: endTurn(); break;
                }
             }, 1000);
             return () => clearTimeout(timer);
         }
    }, [gameState]); // Dependency ensures we run on state updates

    return {
        gameStarted, setGameStarted,
        gameState,
        isAudioEnabled, setIsAudioEnabled,
        customCards, saveCustomCard, deleteCustomCard,
        initGame, startCampaignLevel, nextLevel,
        playCard, upgradeTech, endTurn,
        handleMoveToCombat, handleCombat,
        attackingCardId, damagedCardId
    };
};
