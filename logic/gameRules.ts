
import { Card, CardType, PlayerState, FactionId, MAX_AP, Rarity, GameMode } from '../types';
import { FACTION_TECHS } from '../constants';
import { audioEngine } from '../services/audioEngine';

// --- HELPER CHECKS ---
export const hasTech = (p: PlayerState, tid: string) => p.activeTechs.includes(tid);

// --- GLOBAL BUFF APPLICATION ---
export const applyGlobalBuffs = (unit: Card, player: PlayerState, gameMode?: GameMode) => {
    // 1. Tech Buffs (Static Passives)
    if (hasTech(player, 'ZERG_1')) unit.isRegen = true;
    if (hasTech(player, 'ZERG_2A')) { 
        unit.defense = (unit.defense || 0) + 2; 
        unit.currentHealth = (unit.currentHealth || 0) + 2; 
    }
    if (hasTech(player, 'ZERG_2B')) unit.attack = (unit.attack || 0) + 1;
    if (hasTech(player, 'ZERG_5B')) unit.isPoisonous = true;
    
    if (hasTech(player, 'WAR_2A')) { // Composite Armor: HP +2
         unit.defense = (unit.defense || 0) + 2; 
         unit.currentHealth = (unit.currentHealth || 0) + 2; 
    }
    
    if (hasTech(player, 'NATO_5A_2') && unit.isFlying) {
        unit.attack = (unit.attack || 0) + 2;
        unit.defense = (unit.defense || 0) + 2;
        unit.currentHealth = (unit.currentHealth || 0) + 2;
    }

    // 2. Deploy/Summon Techs
    if (hasTech(player, 'WAR_3C')) { // War Production
        unit.attack = (unit.attack || 0) + 1;
        unit.defense = (unit.defense || 0) + 1;
        unit.currentHealth = (unit.currentHealth || 0) + 1;
    }
    if (hasTech(player, 'PAC_1')) unit.hasShield = true;
    if (hasTech(player, 'NATO_4B_1')) { unit.hasShield = true; unit.hasBlitz = true; }
    if (hasTech(player, 'ZERG_3A')) { 
        unit.hasBlitz = true; 
        if (!unit.description.includes('[隐形]')) unit.description += " [隐形]"; 
    }

    // 3. BLOOD MONEY EXCLUSIVE BALANCING
    if (gameMode === 'BLOOD_MONEY') {
        // PACIFIC: Energy Overload (Shields = Damage)
        if (player.faction === FactionId.PACIFIC && unit.hasShield) {
            unit.attack = (unit.attack || 0) + 2;
        }
        // ZERG: Metabolic Frenzy (High Damage, but costs HP in TurnManager)
        if (player.faction === FactionId.ZERG) {
            unit.attack = (unit.attack || 0) + 1;
        }
    }

    // 4. Dynamic Turn Auras (Inferred from board state)
    const sampleUnit = player.board.find(u => u.currentHealth! > 0);
    if (sampleUnit) {
        if (sampleUnit.description.includes('[黑暗蜂群保护]') && !unit.description.includes('[黑暗蜂群保护]')) {
             unit.description += ' [黑暗蜂群保护]';
        }
    }

    return unit;
};

export const getCardCost = (card: Card, player: PlayerState, enemy: PlayerState, gameMode?: GameMode): number => {
    let cost = card.cost;
    
    // NATO L2B: First Unit -1 Cost
    if (hasTech(player, 'NATO_2B') && card.type === CardType.UNIT && player.unitsDeployedThisTurn === 0) {
        cost -= 1;
    }
    // NATO L5A_1: Events -1
    if (hasTech(player, 'NATO_5A_1') && card.type === CardType.EVENT) cost -= 1;
    // WARSAW L4C: High cost units -2
    if (hasTech(player, 'WAR_4C') && card.type === CardType.UNIT && card.cost >= 5) cost -= 2;
    // ZERG L4B: Nydus (-1 Cost)
    if (hasTech(player, 'ZERG_4B') && card.type === CardType.UNIT) cost -= 1;

    // Unit Aura: Forward Observer (Event cost -1)
    player.board.forEach(u => {
        if (u.name === '前线观察员' && card.type === CardType.EVENT) cost -= 1;
    });

    // PACIFIC L3A: Enemy cards +1
    if (hasTech(enemy, 'PAC_3A')) cost += 1;
    // PACIFIC L6A: Singularity (Enemy cards +3)
    if (hasTech(enemy, 'PAC_6A')) cost += 3;
    // NATO L4A_2: Enemy Flight +2
    if (hasTech(enemy, 'NATO_4A_2') && card.type === CardType.UNIT && card.isFlying) cost += 2;

    // --- BLOOD MONEY BALANCING ---
    if (gameMode === 'BLOOD_MONEY') {
        // WARSAW: War Bonds (Heavy units are cheaper)
        if (player.faction === FactionId.WARSAW && card.type === CardType.UNIT && card.cost >= 4) {
            cost -= 2;
        }
        // NATO: Covert Ops (Events are free)
        if (player.faction === FactionId.NATO && card.type === CardType.EVENT) {
            cost = 0;
        }
    }

    return Math.max(0, cost);
};

export const applyDamage = (target: Card, dmg: number, logs: string[]) => {
    // M1A2 Armor: Reduce damage by 1
    if (target.name.includes('M1A2') && dmg > 0) {
        dmg = Math.max(0, dmg - 1);
        if (dmg === 0) { logs.push(`${target.name} 装甲弹开攻击`); return; }
    }

    if (target.hasShield) {
        target.hasShield = false;
        logs.push(`${target.name} 护盾破碎!`);
        return;
    }
    
    if (target.name === '核能自爆卡车' && dmg < 20) { 
        // Semi-resistant
    }

    target.currentHealth = (target.currentHealth || 1) - dmg;
};

export const handleDeathTriggers = (active: PlayerState, opponent: PlayerState, defcon: number, logs: string[], gameMode?: GameMode): number => {
    const deadUnits = active.board.filter(c => (c.currentHealth || 0) <= 0);
    let defconDrop = 0;
    
    deadUnits.forEach(u => {
         // Unit specific deathrattles
         const desc = u.description;
         if (desc.includes('[亡语]') || desc.includes('亡语')) {
             if (desc.includes('造成 1 点伤害')) {
                 const t = opponent.board.length > 0 ? opponent.board[Math.floor(Math.random()*opponent.board.length)] : null;
                 if (t) { applyDamage(t, 1, logs); logs.push(`${u.name} 亡语伤害`); }
                 else { opponent.hp -= 1; }
             }
             // MQ-9 Reaper Deathrattle
             if (u.name === 'MQ-9 死神无人机' || desc.includes('造成 2 点伤害')) {
                  const t = opponent.board.length > 0 ? opponent.board[Math.floor(Math.random()*opponent.board.length)] : null;
                  if (t) { applyDamage(t, 2, logs); logs.push(`${u.name} 亡语伤害`); }
                  else if (u.name === 'MQ-9 死神无人机') { opponent.hp -= 2; }
             }

             if (u.name === '核能自爆卡车' || desc.includes('造成 20 点伤害') || desc.includes('造成 15 点伤害')) {
                 logs.push('☢️ 核能卡车殉爆！敌方全场 AOE 15！');
                 opponent.board.forEach(c => applyDamage(c, 15, logs));
                 opponent.hp -= 15;
                 defconDrop = 1; 
             }
             
             if (u.name === '莽兽' || (desc.includes('敌方指挥部造成 5 点伤害'))) {
                 opponent.hp -= 5;
                 logs.push('莽兽死亡震击');
             }
             
             if (desc.includes('对所有敌方单位造成 2 点伤害')) {
                 opponent.board.forEach(e => applyDamage(e, 2, logs));
             }
             if (desc.includes('全场打3') || desc.includes('造成 3 点伤害')) {
                 opponent.board.forEach(e => {
                     if(!e.isFlying) applyDamage(e, 3, logs);
                 });
             }
             
             if (desc.includes('DEFCON -1')) {
                 defconDrop++;
             }

             if (desc.includes('沉默')) {
                 opponent.board.forEach(e => { e.description = ''; e.hasTaunt=false; e.hasShield=false; });
             }

             if (desc.includes('召唤')) {
                 if (!u.id.includes('dr_')) {
                     let token: Card = { ...u, id: `dr_${Date.now()}_${Math.random()}`, currentHealth: 1, defense: 1, attack: 1, name: '驾驶员', description: '', zone: 'backrow', canAttack: false, isExhausted: true, faction: active.faction, rarity: Rarity.COMMON, type: CardType.UNIT, cost: 0 };
                     token = applyGlobalBuffs(token, active, gameMode);
                     active.board.push(token);
                 }
             }
         }

         // Tech Deathrattles
         if (hasTech(active, 'WAR_2B')) {
             const t = opponent.board.length > 0 ? opponent.board[Math.floor(Math.random()*opponent.board.length)] : null;
             if (t) applyDamage(t, 1, logs); else opponent.hp -= 1;
         }
         if (hasTech(active, 'WAR_2C')) {
             active.ap = Math.min(active.ap + 1, MAX_AP);
         }
         if (hasTech(active, 'WAR_4B')) {
             active.hp = Math.min(active.hp + 2, active.maxHp);
         }
         if (hasTech(active, 'WAR_5B') && active.board.length > 0) {
             const t = active.board.find(c => (c.currentHealth || 0) > 0);
             if (t) { t.attack! += 2; t.defense! += 2; t.currentHealth! += 2; }
         }
         if (hasTech(active, 'WAR_6B') && !u.id.includes('red_dawn_copy')) {
             let copy: Card = { ...u, id: `red_dawn_copy_${Date.now()}_${Math.random()}`, currentHealth: 1, defense: 1, attack: u.attack, description: 'Clone', canAttack: false, isExhausted: true, zone: 'backrow' as const };
             copy = applyGlobalBuffs(copy, active, gameMode);
             if (active.board.length < 10) active.board.push(copy);
         }

         if (hasTech(opponent, 'ZERG_4A') && opponent.board.length < 10) {
             let broodling: Card = {
                 id: `broodling_${Date.now()}_${Math.random()}`,
                 name: '变异虫',
                 faction: FactionId.ZERG,
                 type: CardType.UNIT,
                 rarity: Rarity.COMMON,
                 cost: 0,
                 attack: 1,
                 defense: 1,
                 currentHealth: 1,
                 description: 'Infestation Spawn',
                 zone: 'backrow',
                 canAttack: false,
                 isExhausted: true
             };
             broodling = applyGlobalBuffs(broodling, opponent, gameMode);
             opponent.board.push(broodling);
             logs.push('感染源孵化变异虫');
         }
    });
    
    return defconDrop;
};

export const processCardEffect = (card: Card, activePlayer: PlayerState, opponent: PlayerState, defcon: number, targetId?: string, gameMode?: GameMode): { active: PlayerState, opponent: PlayerState, defcon: number, logs: string[] } => {
    const logs: string[] = [];
    let newDefcon = defcon;

    if (card.defconImpact) {
        newDefcon += card.defconImpact;
        if (card.defconImpact < 0) {
            audioEngine.playAlarm();
            logs.push(`⚠️ DEFCON 降低至 ${newDefcon}`);
        }
    }
    
    if (card.name === '纳米虫群') {
        let deathCount = 0;
        opponent.board.forEach(u => {
            u.currentHealth = (u.currentHealth || 1) - 1;
            if (u.currentHealth <= 0) deathCount++;
        });
        if (deathCount > 0) {
            newDefcon -= deathCount;
            logs.push(`虫群吞噬: 消灭 ${deathCount} 单位，DEFCON -${deathCount}`);
        }
    }
    
    if (card.name === '电磁脉冲') {
        opponent.board.forEach(u => {
            u.hasTaunt = false; u.hasShield = false; u.hasBlitz = false; u.isFlying = false; u.isSupport = false; u.description = '';
        });
        logs.push('敌方全员沉默');
        if (activePlayer.deck.length > 0) activePlayer.hand.push(activePlayer.deck.shift()!);
    }
    
    if (card.name === '分裂池') {
        activePlayer.board.forEach(u => {
            u.attack = (u.attack || 0) + 1;
            u.defense = (u.defense || 0) + 1;
            u.currentHealth = (u.currentHealth || 0) + 1;
            u.isRegen = true;
        });
        logs.push('全军强化');
    }

    if (card.name === '真菌增生') {
        opponent.board.forEach(u => {
            applyDamage(u, 2, logs);
            u.isExhausted = true; 
        });
        logs.push('真菌定身');
    }
    
    if (card.name === '黑暗蜂群') {
        activePlayer.board.forEach(u => {
            u.description += ' [黑暗蜂群保护]';
        });
        logs.push('黑暗蜂群掩护');
    }

    const desc = card.description;

    const dmgMatch = desc.match(/造成 (\d+) 点伤害/);
    if (dmgMatch) {
        let dmg = parseInt(dmgMatch[1]);
        if (card.type === CardType.EVENT && hasTech(activePlayer, 'NATO_2A')) {
            dmg += 1;
            logs.push(`[制空权] 伤害加成`);
        }

        if (desc.includes('所有敌方单位') || desc.includes('所有角色')) {
             if (card.name !== '纳米虫群') { 
                 opponent.board.forEach(u => applyDamage(u, dmg, logs));
             }
             if (desc.includes('所有角色')) {
                 activePlayer.board.forEach(u => applyDamage(u, dmg, logs));
                 activePlayer.hp -= dmg;
                 opponent.hp -= dmg;
             }
             if (card.name !== '纳米虫群') logs.push(`AOE 打击 (-${dmg})`);
             audioEngine.playAttack();
        } else if (desc.includes('敌方指挥部')) {
            if (hasTech(opponent, 'PAC_3B')) dmg = Math.min(dmg, 3);
            opponent.hp -= dmg;
            logs.push(`轰炸指挥部 (-${dmg})`);
        } else if (targetId) {
             let found = false;
             const tUnit = opponent.board.find(c => c.id === targetId);
             if (tUnit) {
                 applyDamage(tUnit, dmg, logs);
                 logs.push(`${tUnit.name} 受击 (-${dmg})`);
                 found = true;
             }
             if (!found && targetId === 'enemy_hq') {
                  if (hasTech(opponent, 'PAC_3B')) dmg = Math.min(dmg, 3);
                  opponent.hp -= dmg;
                  logs.push(`指挥部受击 (-${dmg})`);
                  found = true;
             }
             
             if (!found && opponent.board.length > 0) {
                 const target = opponent.board[Math.floor(Math.random() * opponent.board.length)];
                 applyDamage(target, dmg, logs);
                 logs.push(`随机目标: ${target.name} (-${dmg})`);
             }
        } else if (opponent.board.length > 0) {
             const target = opponent.board[Math.floor(Math.random() * opponent.board.length)];
             applyDamage(target, dmg, logs);
             logs.push(`${target.name} 受击 (-${dmg})`);
        }
    }

    const drawMatch = desc.match(/抽 (\d+) 张/);
    if (drawMatch) {
        const count = parseInt(drawMatch[1]);
        for(let i=0; i<count; i++) {
            if (activePlayer.deck.length > 0) activePlayer.hand.push(activePlayer.deck.shift()!);
        }
        logs.push(`抽牌 (${count})`);
    }

    if (desc.includes('获得 +')) {
        const attackBuff = desc.includes('+1/+1') || desc.includes('+2/+2') ? (desc.includes('+2/+2')?2:1) : 0;
        const hpBuff = attackBuff;
        if (desc.includes('所有单位')) {
            activePlayer.board.forEach(u => {
                u.attack = (u.attack||0) + attackBuff;
                u.defense = (u.defense||0) + hpBuff;
                u.currentHealth = (u.currentHealth||0) + hpBuff;
            });
        } else if (targetId) {
            const tUnit = activePlayer.board.find(c => c.id === targetId);
            if (tUnit) {
                 tUnit.attack = (tUnit.attack||0) + attackBuff;
                 tUnit.defense = (tUnit.defense||0) + hpBuff;
                 tUnit.currentHealth = (tUnit.currentHealth||0) + hpBuff;
                 logs.push(`${tUnit.name} 获得强化`);
            }
        }
    }

    const summonMatch = desc.match(/召唤 (\d+) 个/);
    if (summonMatch) {
        const count = parseInt(summonMatch[1]);
        const nameMatch = desc.match(/召唤 \d+ 个 \d+\/\d+ 的(.*?)，/);
        const name = nameMatch ? nameMatch[1] : '动员兵';
        
        for(let i=0; i<count; i++) {
            let token: Card = {
                id: `token_${Date.now()}_${i}`, name: name, type: CardType.UNIT, faction: activePlayer.faction, rarity: Rarity.COMMON,
                cost: 0, attack: 1, defense: 1, currentHealth: 1, canAttack: false, isExhausted: true, description: 'Token',
                zone: 'backrow'
            };
            if (desc.includes('闪击')) { token.hasBlitz = true; token.canAttack = true; token.isExhausted = false; }
            
            token = applyGlobalBuffs(token, activePlayer, gameMode);
            
            if (activePlayer.board.length < 10) {
                 activePlayer.board.push(token);
            }
        }
        logs.push('增援抵达');
    }

    if (desc.includes('获得 [护盾]')) {
        if (targetId) {
             const tUnit = activePlayer.board.find(c => c.id === targetId);
             if (tUnit) {
                 tUnit.hasShield = true;
                 // Pacific Bonus in Blood Money applied retroactively if shield gained? 
                 // It's cleaner in applyGlobalBuffs, but playCard calls it. 
                 // If we gain shield via event, we might need to manually check.
                 if (gameMode === 'BLOOD_MONEY' && activePlayer.faction === FactionId.PACIFIC) {
                     tUnit.attack = (tUnit.attack || 0) + 2;
                 }
                 logs.push(`${tUnit.name} 获得护盾`);
             }
        } else if (activePlayer.board.length > 0) {
            const target = activePlayer.board[Math.floor(Math.random() * activePlayer.board.length)];
            target.hasShield = true;
            if (gameMode === 'BLOOD_MONEY' && activePlayer.faction === FactionId.PACIFIC) {
                target.attack = (target.attack || 0) + 2;
            }
            logs.push(`${target.name} 获得护盾`);
        }
    }

    if (card.type === CardType.EVENT && hasTech(activePlayer, 'NATO_4A_1') && dmgMatch) {
         let dmg = parseInt(dmgMatch[1]);
         if (hasTech(activePlayer, 'NATO_2A')) dmg += 1;
         opponent.hp -= dmg;
         logs.push(`[地毯式轰炸] 波及指挥部 (-${dmg})`);
    }

    if (card.type === CardType.EVENT && hasTech(activePlayer, 'NATO_3A')) {
        if (opponent.board.length > 0) {
             const t = opponent.board[Math.floor(Math.random() * opponent.board.length)];
             applyDamage(t, 2, logs);
             logs.push(`[火控雷达] 追击 ${t.name} (-2)`);
        } else {
             opponent.hp -= 2;
        }
    }

    if (card.type === CardType.EVENT) {
        activePlayer.board.forEach(u => {
            if (u.description.includes('使用一张事件卡') || u.description.includes('使用事件卡')) {
                 if (u.description.includes('+1/+1')) {
                     u.attack = (u.attack||0) + 1;
                     u.defense = (u.defense||0) + 1;
                     u.currentHealth = (u.currentHealth||0) + 1;
                     logs.push(`${u.name} 获得 Buff`);
                 }
                 if (u.description.includes('造成 2 点伤害')) {
                     const target = opponent.board.length > 0 ? opponent.board[Math.floor(Math.random()*opponent.board.length)] : null;
                     if (target) applyDamage(target, 2, logs); else opponent.hp -= 2;
                 }
            }
        });
    }

    return { active: activePlayer, opponent, defcon: newDefcon, logs };
};
