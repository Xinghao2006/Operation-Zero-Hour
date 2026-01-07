



import { GameState, Card } from '../types';
import { applyDamage, handleDeathTriggers, hasTech } from './gameRules';
import { audioEngine } from '../services/audioEngine';
import { cloneState, finalizeGameState } from './stateHelpers';
import { processCampaignEvent } from './modes/campaignMode';

export const executeMoveToCombat = (gameState: GameState, unitId: string): GameState => {
    if (gameState.gameOver) return gameState;
    let newState = cloneState(gameState);
    const activePlayer = newState.players.find(p => p.id === newState.currentPlayerId)!;
    const opponent = newState.players.find(p => p.id !== newState.currentPlayerId)!;

    const unit = activePlayer.board.find((c: Card) => c.id === unitId);
    
    if (!unit || unit.zone !== 'backrow') return gameState;
    if (!unit.canAttack || unit.isExhausted) {
        newState.logs.push(`${unit.name} 尚未准备就绪。`);
        return newState;
    }

    const activeFront = activePlayer.board.filter((c: Card) => c.zone === 'frontline').length;
    const enemyFront = opponent.board.filter((c: Card) => c.zone === 'frontline').length;
    
    if (activeFront + enemyFront >= 8) {
        newState.logs.push(`交战区已满 (8/8)！`);
        return newState;
    }

    unit.zone = 'frontline';
    unit.isExhausted = true;
    newState.logs.push(`${unit.name} 进入交战区。`);
    audioEngine.playCardSlide();

    // Trigger Campaign Event (e.g. Tutorial steps detecting move)
    newState = processCampaignEvent(newState);

    return finalizeGameState(newState);
};

export const executeCombat = (gameState: GameState, attackerId: string, targetType: 'unit' | 'hq', targetId?: string): GameState => {
    let newState = cloneState(gameState);
    const attacker = newState.players.find(p => p.id === newState.currentPlayerId)!;
    const defender = newState.players.find(p => p.id !== newState.currentPlayerId)!;

    const attackingUnit = attacker.board.find((c: Card) => c.id === attackerId);
    if (!attackingUnit || !attackingUnit.canAttack || attackingUnit.isExhausted) return gameState;

    // Doomsday Train / Peacekeeper cannot attack
    if (attackingUnit.description.includes('无法攻击')) {
        newState.logs.push(`${attackingUnit.name} 无法攻击。`);
        return newState;
    }

    // --- ZONE & TRAIT CHECKS ---
    const isMelee = !attackingUnit.isFlying && !attackingUnit.isSupport;
    
    const defenderFrontline = defender.board.filter((c: Card) => c.zone === 'frontline');
    const hasFrontlineBlockers = defenderFrontline.length > 0;
    
    const targetUnit = targetId ? defender.board.find((c: Card) => c.id === targetId) : null;
    
    // --- VALIDATION ---

    if (targetType === 'hq') {
        if (hasFrontlineBlockers && !attackingUnit.isFlying) {
            newState.logs.push(`必须先清除敌方交战区单位！`);
            return newState;
        }
    } else if (targetType === 'unit' && targetUnit) {
        if (targetUnit.zone === 'backrow') {
            if (isMelee && hasFrontlineBlockers) {
                 newState.logs.push(`无法越过交战区攻击后排！`);
                 return newState;
            }
        }
    }

    // --- TAUNT & BLOCKING CHECKS ---
    const ignoreTaunt = hasTech(attacker, 'NATO_5B_1') || attackingUnit.description.includes('忽略 [嘲讽]'); 
    const activeTaunts = defender.board.filter((c: Card) => c.hasTaunt && (c.currentHealth || 0) > 0);
    
    const validTaunts = activeTaunts.filter((c: Card) => {
         if (attackingUnit.isFlying) return true; 
         if (!hasFrontlineBlockers) return true; 
         if (hasFrontlineBlockers && c.zone === 'frontline') return true; 
         return false; 
    });

    const mustAttackTaunt = validTaunts.length > 0 && !ignoreTaunt;

    if (targetUnit && (targetUnit.description.includes('隐形') || targetUnit.description.includes('无法成为')) && !attackingUnit.description.includes('AOE')) {
         if (targetUnit.description.includes('只能被 [飞行] 单位攻击') && attackingUnit.isFlying) {
             // Allowed
         } else {
             newState.logs.push('目标处于隐形/潜伏状态！');
             return newState;
         }
    }
    
    if (targetUnit && targetUnit.description.includes('只能被 [飞行] 单位攻击') && !attackingUnit.isFlying) {
         newState.logs.push('目标只能被飞行单位攻击！');
         return newState;
    }
    
    if (attackingUnit.name === '米格-31 猎狐犬' && targetUnit && !targetUnit.isFlying) {
         newState.logs.push('米格-31 只能攻击飞行单位！');
         return newState;
    }

    if (mustAttackTaunt) {
        if (targetType === 'hq' || (targetType === 'unit' && targetUnit && !targetUnit.hasTaunt)) {
             newState.logs.push("必须先攻击 [嘲讽] 单位！");
             return newState; 
        }
        if (targetType === 'unit' && targetUnit && !validTaunts.some(t => t.id === targetUnit.id)) {
            newState.logs.push("必须先攻击有效 [嘲讽] 单位！");
            return newState;
        }
    }
    
    if (hasTech(defender, 'PAC_5B')) {
        const shieldUnit = defender.board.find((c: Card) => c.hasShield);
        if (shieldUnit && targetId !== shieldUnit.id) {
             newState.logs.push(`[镜像实体] 攻击被偏转!`);
             if (targetType === 'hq') {
                 newState.logs.push("必须先消灭护盾单位！");
                 return newState;
             }
        }
    }

    audioEngine.playAttack();

    // Damage Calculation
    let dmg = attackingUnit.attack || 0;
    
    const hasPropaganda = attacker.board.some((u:Card) => u.name === '宣传车');
    if (hasPropaganda) dmg += 1;

    if (attackingUnit.name === '战熊' && targetUnit && !targetUnit.isFlying && !targetUnit.name.includes('坦克')) dmg *= 2; 

    if ((attackingUnit.name === 'ZSU 防空履带车' || attackingUnit.name === '爱国者导弹连') && targetUnit && targetUnit.isFlying) dmg *= 2;
    if (attackingUnit.name === '腐化者' && targetUnit && targetUnit.isFlying) dmg *= 2;
    if (hasTech(attacker, 'ZERG_3B') && attackingUnit.isSupport) dmg *= 2;
    
    if (attackingUnit.name === 'F-117 夜鹰' && targetType === 'hq') dmg *= 2;
    if (attackingUnit.name === '海啸坦克' && newState.defcon < 3) dmg *= 2;

    let isLethal = attackingUnit.isPoisonous || false;

    if (attackingUnit.name === '台风级弹道潜艇') {
        defender.board.forEach(c => {
            if (c.id !== targetId) { 
                 applyDamage(c, dmg, newState.logs);
                 // Blood Money Vampirism AOE
                 if (gameState.gameMode === 'BLOOD_MONEY') {
                    // Nerfed to 50%
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.ceil(dmg / 2));
                 }
            }
        });
        newState.logs.push('台风级弹幕覆盖');
    }

    if (targetType === 'hq') {
        if (hasTech(defender, 'WAR_6A') && defender.board.length > 0) dmg = 0;
        if (hasTech(defender, 'PAC_3B')) dmg = Math.min(dmg, 3);
        if (hasTech(defender, 'PAC_4B')) applyDamage(attackingUnit, 2, newState.logs);

        defender.hp -= dmg;
        // Blood Money Vampirism HQ Hit
        if (gameState.gameMode === 'BLOOD_MONEY') {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.ceil(dmg / 2));
        }

        newState.logs.push(`[${attackingUnit.name}] 攻击指挥部 (-${dmg})`);
    } else if (targetType === 'unit' && targetUnit) {
        let dmgToTarget = dmg;
        let baseCounterDmg = targetUnit.attack || 0;

        // --- SUPPORT UNIT DAMAGE CAP ---
        if (attackingUnit.isSupport) {
            baseCounterDmg = Math.min(baseCounterDmg, 1);
            newState.logs.push(`${attackingUnit.name} [支援] 远程减伤`);
        }
        let dmgToAttacker = baseCounterDmg;

        if (attackingUnit.name === 'B-2 幽灵') dmgToTarget = 999;
        
        if (isLethal) { 
            dmgToTarget = 999; 
            newState.logs.push('剧毒打击!');
        }
        
        if (hasTech(defender, 'WAR_3A') && !isLethal) dmgToTarget = Math.max(1, dmgToTarget - 1);
        if (hasTech(defender, 'PAC_4B')) dmgToAttacker += 2;

        applyDamage(targetUnit, dmgToTarget, newState.logs);
        applyDamage(attackingUnit, dmgToAttacker, newState.logs);
        
        // Blood Money Vampirism Unit Hit
        if (gameState.gameMode === 'BLOOD_MONEY') {
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.ceil(dmgToTarget / 2));
            // Defender also heals if they survived and countered? Let's say yes, vampirism is global
            defender.hp = Math.min(defender.maxHp, defender.hp + Math.ceil(dmgToAttacker / 2));
        }

        if (attackingUnit.description.includes('攻击时同时') || attackingUnit.description.includes('攻击目标相邻') || attackingUnit.name === '潜伏者') {
            const idx = defender.board.findIndex((c:Card) => c.id === targetUnit.id);
            if (idx > 0) {
                 applyDamage(defender.board[idx-1], 2, newState.logs);
                 if (gameState.gameMode === 'BLOOD_MONEY') attacker.hp = Math.min(attacker.maxHp, attacker.hp + 1); // 50% of 2 is 1
            }
            if (idx < defender.board.length - 1) {
                applyDamage(defender.board[idx+1], 2, newState.logs);
                if (gameState.gameMode === 'BLOOD_MONEY') attacker.hp = Math.min(attacker.maxHp, attacker.hp + 1);
            }
            newState.logs.push('溅射伤害');
        }

        if (attackingUnit.description.includes('对敌方指挥部造成等量伤害')) {
             defender.hp -= dmgToTarget;
             if (gameState.gameMode === 'BLOOD_MONEY') attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.ceil(dmgToTarget / 2));
             newState.logs.push('弹头波及指挥部');
        }

        if ((attackingUnit.name === '鬼王机甲' || attackingUnit.name === '海啸坦克' || attackingUnit.name === '天启原型机') && (targetUnit.currentHealth || 0) <= 0) {
            attackingUnit.currentHealth = attackingUnit.defense;
            newState.logs.push(`${attackingUnit.name} 自我修复`);
        }

        if (attackingUnit.description.includes('冻结')) {
            targetUnit.isExhausted = true;
            newState.logs.push('目标被冻结/麻痹');
        }
        
        if (hasTech(attacker, 'NATO_6C')) targetUnit.currentHealth = 0;
        if (hasTech(attacker, 'NATO_6B')) attackingUnit.canAttack = true; 

        newState.logs.push(`${attackingUnit.name} ⚔️ ${targetUnit.name}`);
    }

    if (attackingUnit.description.includes('风怒') && !attackingUnit.isExhausted) {
        if (!attackingUnit.id.includes('_wf')) {
             attackingUnit.canAttack = true;
             attackingUnit.isExhausted = false;
             attackingUnit.id = attackingUnit.id + '_wf'; 
        } else {
             attackingUnit.canAttack = false;
             attackingUnit.isExhausted = true;
        }
    } else {
        attackingUnit.canAttack = false; 
        attackingUnit.isExhausted = true;
    }

    const defconDropA = handleDeathTriggers(attacker, defender, newState.defcon, newState.logs);
    if(defconDropA > 0) newState.defcon = Math.max(0, newState.defcon - (defconDropA >= 100 ? newState.defcon : defconDropA));

    const defconDropB = handleDeathTriggers(defender, attacker, newState.defcon, newState.logs);
    if(defconDropB > 0) newState.defcon = Math.max(0, newState.defcon - (defconDropB >= 100 ? newState.defcon : defconDropB));

    attacker.board = attacker.board.filter((c: Card) => (c.currentHealth || 0) > 0);
    defender.board = defender.board.filter((c: Card) => (c.currentHealth || 0) > 0);

    // Trigger Campaign Event (e.g. Tutorial steps detecting attack completion)
    newState = processCampaignEvent(newState);

    return finalizeGameState(newState);
};
