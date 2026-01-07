
import { Card, CardType, PlayerState, GameMode } from '../types';
import { FACTION_TECHS } from '../constants';
import { getCardCost, hasTech } from './gameRules';

export interface AIAction {
    type: 'UPGRADE' | 'PLAY_CARD' | 'MOVE_UNIT' | 'ATTACK' | 'END_TURN';
    payload?: any;
}

/**
 * Validates if a target can be attacked by the specific attacker based on game rules.
 * Matches logic in App.tsx handleCombat to prevent AI Logic Locks.
 */
const isValidTarget = (attacker: Card, target: Card, allDefenders: Card[], ignoreTaunt: boolean): boolean => {
    // 1. Check Stealth / Untargetable
    const isStealth = target.description.includes('隐形') || target.description.includes('无法成为');
    const isFlyingAttacker = attacker.isFlying || false;
    
    if (isStealth) {
        // Exception: Some stealth units can be attacked by Flying (e.g. F-22, SEALs)
        if (target.description.includes('只能被 [飞行] 单位攻击')) {
            if (!isFlyingAttacker) return false;
        } else {
            return false;
        }
    }

    // 2. Specific Unit Counters
    // MiG-31 / Patriot only hit Air
    if ((attacker.name === '米格-31 猎狐犬' || attacker.name === '爱国者导弹连') && !target.isFlying) return false;

    // 3. Reachability / Zone Blocking Check (CRITICAL FIX for Infinite Loop)
    const isMelee = !attacker.isFlying && !attacker.isSupport;
    const hasFrontlineBlockers = allDefenders.some(c => c.zone === 'frontline');

    if (isMelee && hasFrontlineBlockers && target.zone === 'backrow') {
        return false;
    }

    // 4. Taunt Check
    if (!ignoreTaunt && !target.hasTaunt) {
        const reachableTaunts = allDefenders.filter(c => {
            if (!c.hasTaunt || (c.currentHealth || 0) <= 0) return false;
            // Can attacker reach this taunt?
            if (attacker.isFlying) return true; // Flying reaches all
            if (hasFrontlineBlockers && c.zone === 'backrow') return false; // Melee blocked by front
            return true;
        });

        if (reachableTaunts.length > 0) return false; // Must attack taunt instead
    }

    return true;
};

/**
 * Checks if playing a card triggers Nuclear Winter prematurely.
 */
const isSafeToPlay = (card: Card, currentDefcon: number, currentTurn: number): boolean => {
    // Nuclear Protection Protocol: Do not trigger DEFCON 0 before Turn 35 (Updated)
    if (currentTurn < 35) {
        const impact = card.defconImpact || 0;
        if (impact < 0 && (currentDefcon + impact <= 0)) {
            return false;
        }
    }
    return true;
};

export const calculateAIMove = (ai: PlayerState, player: PlayerState, defcon: number, turn: number, gameMode: GameMode): AIAction => {
    
    // --- 0. WIN CONDITION CHECK (Lethal) ---
    // If we have units that can hit HQ and kill player, DO IT.
    const enemyFrontline = player.board.filter(c => c.zone === 'frontline');
    const hasFrontlineBlockers = enemyFrontline.length > 0;
    const ignoreTauntGlobal = hasTech(ai, 'NATO_5B_1');

    const lethalAttackers = ai.board.filter(u => {
        if (!u.canAttack || u.isExhausted) return false;
        if (u.description.includes('无法攻击')) return false;
        
        // Can reach HQ?
        if (u.isFlying) return true;
        if (!hasFrontlineBlockers) return true;
        return false;
    });

    let totalLethalDmg = 0;
    for (const u of lethalAttackers) {
        // Check if taunt blocks HQ
        const activeTaunts = player.board.filter(c => c.hasTaunt && (c.currentHealth || 0) > 0);
        let blockedByTaunt = false;
        if (activeTaunts.length > 0 && !ignoreTauntGlobal) {
             blockedByTaunt = true;
        }

        if (!blockedByTaunt) {
            totalLethalDmg += (u.attack || 0);
        }
    }

    if (totalLethalDmg >= player.hp) {
        // Find the first unit that can hit HQ and send it
        const killer = lethalAttackers.find(u => {
             const activeTaunts = player.board.filter(c => c.hasTaunt && (c.currentHealth || 0) > 0);
             return activeTaunts.length === 0 || ignoreTauntGlobal;
        });
        if (killer) {
            return { type: 'ATTACK', payload: { attackerId: killer.id, targetType: 'hq' } };
        }
    }

    // --- 1. UPGRADE TECH (Strategic) ---
    const nextLvl = ai.techLevel + 1;
    const availableTechs = FACTION_TECHS[ai.faction][nextLvl];
    
    let canAffordUpgrade = false;
    if (availableTechs) {
        const cost = availableTechs[0].cost;
        if (gameMode === 'BLOOD_MONEY') {
            canAffordUpgrade = ai.hp > cost + 10; // Reserve HP
        } else {
            canAffordUpgrade = ai.ap >= cost;
        }
    }

    if (availableTechs && canAffordUpgrade) {
        const lockedCards = ai.hand.filter(c => (c.reqTechLevel || 0) > ai.techLevel);
        const shouldUpgrade = (gameMode === 'BLOOD_MONEY' ? true : ai.ap >= 6 && ai.hand.length > 0) || lockedCards.length > 0 || (turn > 5 && Math.random() > 0.6);
        
        if (shouldUpgrade) {
             const validOptions = availableTechs.filter(t => !t.reqId || ai.activeTechs.includes(t.reqId));
             if (validOptions.length > 0) {
                 const techToBuy = validOptions[Math.floor(Math.random() * validOptions.length)];
                 return { type: 'UPGRADE', payload: { techId: techToBuy.id } };
             }
        }
    }

    // --- 2. PLAY UNITS / CARDS ---
    // Filter playable cards
    const playableCards = ai.hand.filter(c => {
        const cost = getCardCost(c, ai, player, gameMode);
        const techReq = c.reqTechLevel || 0;
        
        // Basic Checks
        if (ai.techLevel < techReq) return false;
        
        // COST CHECK (Fix for Blood Money)
        if (gameMode === 'BLOOD_MONEY') {
             // MUST have more HP than cost, preventing suicide (hp <= cost is death)
             if (ai.hp <= cost) return false;
             
             // AI Safety: Don't play high cost cards if HP is critical (< 10), unless it has Taunt or is cheap
             if (ai.hp < 15 && cost > 5 && !c.hasTaunt && !c.isRegen) return false;
        } else {
             if (cost > ai.ap) return false;
        }

        // Nuclear Safety Check
        if (!isSafeToPlay(c, defcon, turn)) return false;

        // Space Check
        if (c.type === CardType.UNIT && ai.board.length >= 10) return false;

        return true;
    });

    if (playableCards.length > 0) {
        playableCards.sort((a, b) => {
            let scoreA = a.cost;
            let scoreB = b.cost;
            
            if (a.type === CardType.UNIT) scoreA += 2;
            if (b.type === CardType.UNIT) scoreB += 2;
            
            if (ai.hp < 15 && a.hasTaunt) scoreA += 10;
            if (ai.hp < 15 && b.hasTaunt) scoreB += 10;
            
            // In Blood Money, cheap units are safer when low HP
            if (gameMode === 'BLOOD_MONEY' && ai.hp < 15) {
                return a.cost - b.cost; // ascending cost
            }

            return scoreB - scoreA;
        });

        const bestCard = playableCards[0];
        const index = ai.hand.findIndex(x => x.id === bestCard.id);
        return { type: 'PLAY_CARD', payload: { cardIndex: index } };
    }
    
    // --- 3. MOVE UNITS TO FRONTLINE ---
    const backrowUnits = ai.board.filter(u => u.zone === 'backrow' && u.canAttack && !u.isExhausted);
    const myFront = ai.board.filter(u => u.zone === 'frontline').length;
    const enemyFront = player.board.filter(u => u.zone === 'frontline').length;
    const combatZoneFull = (myFront + enemyFront) >= 6;
    
    if (backrowUnits.length > 0 && !combatZoneFull) {
        const melee = backrowUnits.find(u => !u.isFlying && !u.isSupport);
        if (melee) {
            return { type: 'MOVE_UNIT', payload: { unitId: melee.id } };
        }
        const backTaunt = backrowUnits.find(u => u.hasTaunt);
        if (backTaunt && ai.hp < 15) {
            return { type: 'MOVE_UNIT', payload: { unitId: backTaunt.id } };
        }
        
        if (Math.random() > 0.7) {
             return { type: 'MOVE_UNIT', payload: { unitId: backrowUnits[0].id } };
        }
    }

    // --- 4. ATTACK ---
    const readyAttackers = ai.board.filter(u => {
        if (!u.canAttack || u.isExhausted) return false;
        if (u.description.includes('无法攻击')) return false;

        const isMelee = !u.isFlying && !u.isSupport;
        if (isMelee && u.zone === 'backrow') return false;
        
        return true;
    });

    for (const attacker of readyAttackers) {
        const validTargets = player.board.filter(target => isValidTarget(attacker, target, player.board, ignoreTauntGlobal));
        
        let canHitHQ = false;
        if (attacker.isFlying) {
            canHitHQ = true;
        } else {
            if (!hasFrontlineBlockers) canHitHQ = true;
        }
        
        const activeTaunts = player.board.filter(c => c.hasTaunt && (c.currentHealth || 0) > 0);
        const reachableTaunts = activeTaunts.filter(t => isValidTarget(attacker, t, player.board, ignoreTauntGlobal));
        
        if (reachableTaunts.length > 0 && !ignoreTauntGlobal) {
            canHitHQ = false; // Must hit taunt
        }

        // --- Scoring Targets ---
        let bestTargetId: string | null = null;
        let bestTargetScore = -999;

        validTargets.forEach(t => {
            let score = 0;
            const dmg = attacker.attack || 0;
            const hp = t.currentHealth || 0;
            
            if (dmg >= hp) score += 50; 
            score += (t.attack || 0) * 2;
            if (t.hasTaunt) score += 20;

            if (dmg === 1 && hp > 10) score -= 10;
            if (gameMode === 'BLOOD_MONEY' && ai.hp < 20) score += 10;
            
            if (hasTech(player, 'PAC_5B')) {
                const shieldUnit = player.board.find(c => c.hasShield);
                if (shieldUnit && t.id !== shieldUnit.id) score = -9999;
            }

            if (score > bestTargetScore) {
                bestTargetScore = score;
                bestTargetId = t.id;
            }
        });

        if (canHitHQ) {
            let hqScore = 15; // Base pressure
            if (player.hp <= (attacker.attack || 0)) hqScore = 1000; // Lethal
            
            if (hqScore > bestTargetScore) {
                return { type: 'ATTACK', payload: { attackerId: attacker.id, targetType: 'hq' } };
            }
        }

        if (bestTargetId) {
            return { type: 'ATTACK', payload: { attackerId: attacker.id, targetType: 'unit', targetId: bestTargetId } };
        }
    }

    return { type: 'END_TURN' };
};
