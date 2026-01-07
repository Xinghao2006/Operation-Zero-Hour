



import { FactionId, GameState, PlayerState, INITIAL_DEFCON, STARTING_AP, Card, ScenarioDef, MAX_HAND_SIZE, GameMode, CardType, Rarity } from '../types';
import { INIT_DECKS, getCompendiumCards, FACTION_TECHS } from '../constants';
import { audioEngine } from '../services/audioEngine';
import { processCampaignEvent } from './modes/campaignMode';

export const createInitialGameState = (playerFaction: FactionId, customCards: Card[], scenario?: ScenarioDef, gameMode: GameMode = 'STANDARD'): GameState => {
    audioEngine.init();
    audioEngine.playClick();
    
    // Scenario Logic: Override factions
    const pFaction = scenario ? scenario.playerFaction : playerFaction;
    
    // Enemy Selection
    let eFaction = FactionId.WARSAW; // Default fallback
    if (scenario) {
        eFaction = scenario.enemyFaction;
    } else {
        const factions = Object.values(FactionId);
        eFaction = factions[Math.floor(Math.random() * factions.length)];
        while(eFaction === pFaction) {
           eFaction = factions[Math.floor(Math.random() * factions.length)];
        }
    }

    // --- DECK CREATION HELPER ---
    // Helper to get ALL cards from ALL factions for Chaos mode
    const getAllCards = (): Card[] => {
        let all: Card[] = [];
        Object.values(FactionId).forEach(f => {
            all = all.concat(getCompendiumCards(f));
        });
        // Add all custom cards too
        all = all.concat(customCards);
        return all;
    };

    const getCardByName = (name: string, fid: FactionId): Card => {
        // Handle "Cross-Faction" cards for puzzle levels (e.g. NATO player using Warsaw tanks)
        // We search ALL factions in compendium
        let standard: Card | undefined;
        // First try the requested faction
        standard = getCompendiumCards(fid).find(c => c.name === name);
        
        // If not found (e.g. Mixed Alliance Level), search all factions
        if (!standard) {
            for (const f of Object.values(FactionId)) {
                standard = getCompendiumCards(f).find(c => c.name === name);
                if (standard) break;
            }
        }

        if (standard) {
            // Special Nerf for B-2 in Level 1 to match tutorial math
            let atk = standard.attack;
            if (scenario?.id === 'LVL_01' && standard.name === 'B-2 幽灵') {
                atk = 2;
            }

            return { ...standard, id: `${fid}_${name}_${Date.now()}_${Math.random()}`, attack: atk, currentHealth: standard.defense, canAttack: false, isExhausted: true, zone: 'backrow' };
        }
        
        // Search custom
        const custom = customCards.find(c => c.name === name);
        if (custom) return { ...custom, id: `${fid}_${name}_${Date.now()}_${Math.random()}`, currentHealth: custom.defense, canAttack: false, isExhausted: true, zone: 'backrow' };

        // Fallback
        return { ...INIT_DECKS[fid][0], id: `fallback_${Date.now()}` }; 
    };

    // --- DECK BUILDING ---
    let playerDeck: Card[] = [];
    let enemyDeck: Card[] = [];

    if (scenario) {
        // SCENARIO MODE: Use fixed decks
        if (scenario.fixedPlayerDeck) {
            playerDeck = scenario.fixedPlayerDeck.map(name => getCardByName(name, pFaction));
        } else {
            // Fallback for campaign without fixed deck
            playerDeck = [...INIT_DECKS[pFaction]].map(c => ({...c}));
        }
        
        if (scenario.fixedEnemyDeck) {
            enemyDeck = scenario.fixedEnemyDeck.map(name => getCardByName(name, eFaction));
        } else {
             enemyDeck = [...INIT_DECKS[eFaction]].map(c => ({...c})).sort(() => Math.random() - 0.5);
        }
    } else {
        // SKIRMISH MODES
        if (gameMode === 'CHAOS') {
            const pool = getAllCards();
            const buildRandomDeck = (fid: FactionId) => {
                const deck: Card[] = [];
                for(let i=0; i<30; i++) {
                    const template = pool[Math.floor(Math.random() * pool.length)];
                    deck.push({
                        ...template,
                        id: `chaos_${fid}_${i}_${Date.now()}`,
                        currentHealth: template.defense,
                        canAttack: false,
                        isExhausted: true,
                        zone: 'backrow',
                        // IMPORTANT: For Chaos mode visual fix, we DO NOT force faction to fid.
                        // We keep template.faction so CardComponent renders correct colors.
                        // Logic must handle tech requirements or we assume "mercenary rules" apply.
                        // In gameRules, 'hasTech' checks player.activeTechs against card.reqId. 
                        // If card is ZERG but player is NATO, they won't have ZERG tech tree.
                        // We rely on 'reqTechLevel' mostly, which is generic (1-6).
                    });
                }
                return deck;
            };
            playerDeck = buildRandomDeck(pFaction);
            enemyDeck = buildRandomDeck(eFaction);
        } else {
            // STANDARD / DEFCON 1 / BLOOD_MONEY
            const buildStandardDeck = (fid: FactionId) => {
                const standardDeck = [...INIT_DECKS[fid]].map(c => ({...c}));
                const factionCustoms = customCards.filter(c => c.faction === fid).map(c => ({
                    ...c, 
                    currentHealth: c.defense, 
                    canAttack: false, 
                    isExhausted: true,
                    zone: 'backrow' as const,
                    id: `${c.id}_game_${Date.now()}` 
                }));
                const customInjection: Card[] = [];
                factionCustoms.forEach(c => {
                    customInjection.push({...c, id: c.id + '_1'});
                    customInjection.push({...c, id: c.id + '_2'});
                });
                return [...standardDeck, ...customInjection].sort(() => Math.random() - 0.5);
            }
            playerDeck = buildStandardDeck(pFaction);
            enemyDeck = buildStandardDeck(eFaction);
        }
    }

    const draw = (deck: Card[], n: number) => {
      const drawn = deck.splice(0, n);
      return { remaining: deck, hand: drawn };
    };
    
    let pHand: Card[] = [];
    let pRemaining: Card[] = [];
    
    if (scenario && scenario.isPuzzle) {
        pHand = playerDeck.splice(0, MAX_HAND_SIZE + 2); 
        pRemaining = playerDeck;
    } else {
        const pDraw = draw(playerDeck, 4);
        pHand = pDraw.hand;
        pRemaining = pDraw.remaining;
    }

    const eDraw = draw(enemyDeck, 4);

    // --- STARTING BOARD ---
    const pBoard: Card[] = [];
    const eBoard: Card[] = [];

    if (scenario && scenario.startingBoard) {
        scenario.startingBoard.forEach(def => {
            const faction = def.owner === 'player' ? pFaction : eFaction;
            const card = getCardByName(def.cardName, faction);
            card.zone = def.zone;
            if (def.currentHealth) card.currentHealth = def.currentHealth;
            if (def.customId) card.id = def.customId; 
            if (def.owner === 'player') pBoard.push(card);
            else eBoard.push(card);
        });
    }

    // --- MODE SPECIFIC SETUP ---
    let startAp = scenario?.playerStartingAp ?? STARTING_AP;
    let maxAp = startAp;
    let startHp = 30;
    
    let pStartTechLevel = scenario?.startingTechLevel ?? 0;
    let eStartTechLevel = scenario?.enemyStartingTechLevel ?? 0;
    let initialDefcon = INITIAL_DEFCON;
    let logs = [`>>> 战争爆发。`, `>>> 模式: ${gameMode}`];

    if (gameMode === 'DEFCON_1') {
        initialDefcon = 2;
        logs.push(`>>> 警告：核子危机！DEFCON 2`);
    }

    if (gameMode === 'BLOOD_MONEY') {
        startHp = 40; // Reduced from 50 for tension
        startAp = 50; // High AP cap to signify no limit essentially
        maxAp = 50;
        logs.push(`>>> 鲜血筹码协议已启动。生命即货币。`);
    }

    // --- TECH AUTO-GRANT LOGIC ---
    const getStarterTechs = (fId: FactionId, lvl: number) => {
        const techs: string[] = [];
        if (lvl <= 0) return techs;
        for (let i = 1; i <= lvl; i++) {
            const tierTechs = FACTION_TECHS[fId][i];
            if (tierTechs && tierTechs.length > 0) {
                techs.push(tierTechs[0].id);
            }
        }
        return techs;
    };

    const player: PlayerState = {
      id: 'player',
      faction: pFaction,
      hp: startHp,
      maxHp: startHp,
      ap: startAp,
      maxAp: maxAp, 
      deck: pRemaining,
      hand: pHand,
      board: pBoard,
      graveyard: [],
      techLevel: pStartTechLevel,
      activeTechs: getStarterTechs(pFaction, pStartTechLevel),
      unitsDeployedThisTurn: 0,
      eventsPlayedThisTurn: 0
    };

    const enemy: PlayerState = {
      id: 'enemy',
      faction: eFaction,
      hp: scenario?.enemyStartingHp ?? startHp, 
      maxHp: scenario?.enemyStartingHp ?? startHp,
      ap: startAp, // Enemy gets same AP advantage in modes
      maxAp: maxAp,
      deck: eDraw.remaining,
      hand: eDraw.hand,
      board: eBoard,
      graveyard: [],
      techLevel: eStartTechLevel,
      activeTechs: getStarterTechs(eFaction, eStartTechLevel),
      unitsDeployedThisTurn: 0,
      eventsPlayedThisTurn: 0
    };

    let state: GameState = {
      turn: 1,
      currentPlayerId: 'player',
      defcon: initialDefcon,
      gameMode: gameMode,
      players: [player, enemy],
      gameOver: false,
      winnerId: null,
      logs: logs,
      isCampaign: !!scenario,
      campaignLevelId: scenario?.id,
      isPuzzle: scenario?.isPuzzle
    };
    
    // Initial Campaign Process (Set up Stage 0)
    state = processCampaignEvent(state);
    
    audioEngine.playRadioStart();
    return state;
};
