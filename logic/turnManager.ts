
import { GameState, PlayerState, Card, CardType, FactionId, MAX_AP, MAX_HAND_SIZE, Rarity } from '../types';
import { FACTION_TECHS } from '../constants';
import { getCardCost, processCardEffect, applyDamage, handleDeathTriggers, hasTech, applyGlobalBuffs } from './gameRules';
import { audioEngine } from '../services/audioEngine';
import { cloneState, finalizeGameState } from './stateHelpers';
import { processCampaignEvent } from './modes/campaignMode';

export const executeUpgradeTech = (gameState: GameState, choiceId?: string): GameState => {
    
    let newState = cloneState(gameState);
    const playerIdx = newState.players.findIndex(p => p.id === newState.currentPlayerId);
    const player = newState.players[playerIdx];

    const nextLevel = player.techLevel + 1;
    const availableTechs = FACTION_TECHS[player.faction][nextLevel];
    
    if (!availableTechs) return gameState;

    let techToUnlock: any = null;

    if (choiceId) {
        techToUnlock = availableTechs.find(t => t.id === choiceId);
    } else {
        const validOptions = availableTechs.filter(t => !t.reqId || player.activeTechs.includes(t.reqId));
        if (validOptions.length > 0) {
            techToUnlock = validOptions[Math.floor(Math.random() * validOptions.length)];
        }
    }

    if (!techToUnlock) return gameState;

    let cost = techToUnlock.cost;

    // BLOOD MONEY: Tech Upgrade Costs HP
    if (gameState.gameMode === 'BLOOD_MONEY') {
        if (player.hp <= cost) return gameState; // Cannot suicide to upgrade
        player.hp -= cost;
        // AP check bypassed essentially since AP is high in this mode
    } else {
        if (player.ap < cost) return gameState;
        player.ap -= cost;
    }

    if (techToUnlock.reqId && !player.activeTechs.includes(techToUnlock.reqId)) return gameState;

    player.techLevel = nextLevel;
    player.activeTechs.push(techToUnlock.id);

    // Immediate Tech Effects
    if (techToUnlock.id === 'WAR_2A') player.board.forEach((u:Card) => {u.defense!+=2; u.currentHealth!+=2;});
    if (techToUnlock.id === 'NATO_5A_2') player.board.forEach((u:Card) => {if(u.isFlying) {u.attack!+=2; u.defense!+=2; u.currentHealth!+=2;} });
    
    // ZERG Tech Effects
    if (techToUnlock.id === 'ZERG_2A') player.board.forEach((u:Card) => {u.defense!+=2; u.currentHealth!+=2;});
    if (techToUnlock.id === 'ZERG_2B') player.board.forEach((u:Card) => {u.attack!+=1;});
    if (techToUnlock.id === 'ZERG_1') player.board.forEach((u:Card) => {u.isRegen=true;});
    if (techToUnlock.id === 'ZERG_5B') player.board.forEach((u:Card) => {u.isPoisonous=true;});

    newState.logs.push(`>>> 研发完成: ${techToUnlock.name}`);
    audioEngine.playRadioStart();

    newState = processCampaignEvent(newState);

    return finalizeGameState(newState);
};

export const executePlayCard = (gameState: GameState, playerIndex: number, cardIndex: number, targetId?: string): GameState => {
    if (gameState.gameOver) return gameState;
    
    let newState = cloneState(gameState);
    const activePlayer = newState.players[playerIndex];
    if (newState.currentPlayerId !== activePlayer.id) return gameState;
    
    const card = activePlayer.hand[cardIndex];
    const opponentIdx = playerIndex === 0 ? 1 : 0;
    const enemyPlayer = newState.players[opponentIdx];

    // Pass gameMode for Blood Money cost balancing
    let actualCost = getCardCost(card, activePlayer, enemyPlayer, gameState.gameMode);
    
    // BLOOD MONEY LOGIC
    if (gameState.gameMode === 'BLOOD_MONEY') {
        if (activePlayer.hp <= actualCost) {
            newState.logs.push("生命值不足！无法支付鲜血代价。");
            return newState;
        }
        activePlayer.hp -= actualCost;
    } else {
        if (activePlayer.ap < actualCost) return gameState; 
        activePlayer.ap -= actualCost;
    }
    
    // Bypass Tech Lock for Scripted B-2 in LVL_01
    const isLevel1B2 = gameState.campaignLevelId === 'LVL_01' && card.name === 'B-2 幽灵';
    
    if (card.reqTechLevel && activePlayer.techLevel < card.reqTechLevel && !isLevel1B2) {
        return gameState; // Locked
    }

    activePlayer.hand.splice(cardIndex, 1);
    
    audioEngine.playStamp();
    newState.logs.push(`${activePlayer.id === 'player' ? '你' : '敌方'} 部署: ${card.name}`);

    if (card.type === CardType.UNIT) {
        activePlayer.unitsDeployedThisTurn = (activePlayer.unitsDeployedThisTurn || 0) + 1;
        
        card.currentHealth = card.defense;
        card.zone = 'backrow';

        if (card.defconImpact) {
            newState.defcon += card.defconImpact;
            if (card.defconImpact < 0) {
                audioEngine.playAlarm();
                newState.logs.push(`⚠️ DEFCON 降低至 ${newState.defcon}`);
            }
        }

        const buffedCard = applyGlobalBuffs(card, activePlayer, gameState.gameMode);

        if (hasTech(activePlayer, 'ZERG_3B') && (buffedCard.cost === 1 || buffedCard.isSupport)) { 
            if(buffedCard.cost===1) buffedCard.hasBlitz=true; 
        }
        
        if (hasTech(activePlayer, 'WAR_6C')) {
            enemyPlayer.board.forEach((u:Card) => u.currentHealth = 0);
            newState.logs.push(`[核子冬天] 清场`);
        }
        if (hasTech(activePlayer, 'ZERG_6A')) {
             if (enemyPlayer.board.length > 0) {
                 const t = enemyPlayer.board[Math.floor(Math.random() * enemyPlayer.board.length)];
                 t.currentHealth = 0;
                 newState.logs.push(`[吞噬] 消灭了 ${t.name}`);
             }
        }

        if (hasTech(activePlayer, 'NATO_3B')) {
            buffedCard.currentHealth = (buffedCard.currentHealth || 1) + 2; 
            if (activePlayer.deck.length > 0) activePlayer.hand.push(activePlayer.deck.shift()!);
        }

        const desc = buffedCard.description;

        if (buffedCard.name === 'U-2 侦察机') {
             if (activePlayer.deck.length) activePlayer.hand.push(activePlayer.deck.shift()!);
             if (newState.defcon < 3 && activePlayer.deck.length) activePlayer.hand.push(activePlayer.deck.shift()!);
        }

        if (buffedCard.name === 'B-2 幽灵') {
            for(let i=0; i<2; i++) {
                if(activePlayer.board.length < 10) {
                    let f22: Card = {
                        id: `f22_spawn_${Date.now()}_${i}`,
                        name: 'F-22 猛禽',
                        type: CardType.UNIT,
                        faction: FactionId.NATO,
                        rarity: Rarity.RARE,
                        cost: 0,
                        attack: 6,
                        defense: 4,
                        currentHealth: 4,
                        description: '[飞行] [隐形]',
                        isFlying: true,
                        zone: 'backrow',
                        canAttack: true,
                        hasBlitz: true,
                        isExhausted: false
                    };
                    f22 = applyGlobalBuffs(f22, activePlayer, gameState.gameMode);
                    activePlayer.board.push(f22);
                }
            }
            newState.logs.push('幽灵轰炸机部署 F-22 护航编队');
        }
        
        if (buffedCard.name === '工蜂') activePlayer.ap = Math.min(activePlayer.maxAp, activePlayer.ap + 1);
        
        if (buffedCard.name === '感染者') {
             const weakEnemies = enemyPlayer.board.filter((u:Card) => (u.attack || 0) < 3 && (u.reqTechLevel || 0) < 3);
             let target: Card | undefined;
             
             if (targetId && weakEnemies.some(u => u.id === targetId)) {
                 target = weakEnemies.find(u => u.id === targetId);
             } else if (weakEnemies.length > 0) {
                 target = weakEnemies[Math.floor(Math.random() * weakEnemies.length)];
             }

             if (target) {
                 enemyPlayer.board = enemyPlayer.board.filter((u:Card) => u.id !== target!.id);
                 activePlayer.board.push(target);
                 target.canAttack = false; 
                 target.isExhausted = true;
                 newState.logs.push(`[感染者] 控制了 ${target.name}`);
             } else {
                 newState.logs.push(`[感染者] 技能失效 (无有效目标)`);
             }
        }
        
        if (buffedCard.name === '飞蛇') {
             const backrow = enemyPlayer.board.filter((u:Card) => u.zone === 'backrow');
             let target: Card | undefined;

             if (targetId && backrow.some(u => u.id === targetId)) {
                 target = backrow.find(u => u.id === targetId);
             } else if (backrow.length > 0) {
                 target = backrow[Math.floor(Math.random() * backrow.length)];
             }

             if (target) {
                 target.zone = 'frontline';
                 target.hasTaunt = true;
                 target.description = target.description.replace('[隐形]', '');
                 newState.logs.push(`[飞蛇] 拉拽 ${target.name}`);
             }
        }
        
        if (buffedCard.name === '坑道虫') {
             for(let i=0; i<2; i++) {
                 if(activePlayer.deck.length > 0 && activePlayer.board.length < 10) {
                     let u = activePlayer.deck.filter((c:Card) => c.type === CardType.UNIT)[0];
                     if (u) {
                         const idx = activePlayer.deck.indexOf(u);
                         activePlayer.deck.splice(idx, 1);
                         u.zone = 'backrow';
                         u.canAttack = false; u.isExhausted = true; u.currentHealth = u.defense;
                         u = applyGlobalBuffs(u, activePlayer, gameState.gameMode);
                         activePlayer.board.push(u);
                         newState.logs.push(`[坑道虫] 召唤 ${u.name}`);
                     }
                 }
             }
        }
        
        if (buffedCard.name === '百合子克隆体') {
            let target: Card | undefined;
            if (targetId) target = enemyPlayer.board.find(u => u.id === targetId);
            if (!target && enemyPlayer.board.length > 0) target = enemyPlayer.board[Math.floor(Math.random() * enemyPlayer.board.length)];

            if (target) {
                target.attack = 0;
                newState.logs.push(`${target.name} 攻击力被清零`);
            }
        }

        if (buffedCard.name === '守护者坦克') buffedCard.hasShield = true;
        
        if (buffedCard.name === '弓箭少女') {
            enemyPlayer.board.forEach((u: Card) => {
                if (u.isFlying) applyDamage(u, 2, newState.logs);
            });
        }
        
        if (desc.includes('[部署]: 对一个敌方单位造成') || desc.includes('对随机敌方造成')) {
             const dmgMatch = desc.match(/造成 (\d+) 点伤害/);
             if (dmgMatch) {
                 const d = parseInt(dmgMatch[1]);
                 if (targetId && !desc.includes('对随机敌方')) {
                      const t = enemyPlayer.board.find(c => c.id === targetId);
                      if (t) {
                          applyDamage(t, d, newState.logs);
                      } else if (enemyPlayer.board.length > 0) {
                          const t = enemyPlayer.board[Math.floor(Math.random() * enemyPlayer.board.length)];
                          applyDamage(t, d, newState.logs);
                      }
                 } else if (enemyPlayer.board.length > 0) {
                     const t = enemyPlayer.board[Math.floor(Math.random() * enemyPlayer.board.length)];
                     applyDamage(t, d, newState.logs);
                 } else if (desc.includes('对随机敌方')) { 
                     enemyPlayer.hp -= d;
                 }
             }
        }

        if (desc.includes('消灭一个友方单位')) {
            let target: Card | undefined;
            if (targetId) target = activePlayer.board.find(u => u.id === targetId);
            if (!target && activePlayer.board.length > 0) target = activePlayer.board[0];

            if (target) {
                target.currentHealth = 0; 
                newState.logs.push(`${buffedCard.name} 献祭了 ${target.name}`);
                buffedCard.attack! += 2; buffedCard.defense! += 2; buffedCard.currentHealth! += 2;
            }
        }
        
        if (desc.includes('[部署]')) {
             if (buffedCard.name === '天基离子炮' || desc.includes('消灭所有敌方单位')) {
                 enemyPlayer.board.forEach((u: Card) => u.currentHealth = 0);
                 newState.logs.push('离子光束清除战场');
             }
             if (desc.includes('所有敌方单位造成')) {
                  const dmgMatch = desc.match(/造成 (\d+) 点伤害/);
                  if (dmgMatch) {
                      const dmg = parseInt(dmgMatch[1]);
                      enemyPlayer.board.forEach((u: Card) => applyDamage(u, dmg, newState.logs));
                      newState.logs.push(`轰炸 (-${dmg})`);
                  }
             }
        }

        const canAct = buffedCard.hasBlitz || buffedCard.hasRush || false;
        buffedCard.canAttack = canAct;
        buffedCard.isExhausted = false;
        
        activePlayer.board.push(buffedCard);
    } else {
        activePlayer.eventsPlayedThisTurn = (activePlayer.eventsPlayedThisTurn || 0) + 1;
        const res = processCardEffect(card, activePlayer, enemyPlayer, newState.defcon, targetId, gameState.gameMode);
        newState.defcon = res.defcon;
        newState.logs = [...newState.logs, ...res.logs];
        activePlayer.graveyard.push(card);
    }

    const defconDropA = handleDeathTriggers(activePlayer, enemyPlayer, newState.defcon, newState.logs, gameState.gameMode);
    if(defconDropA > 0) newState.defcon = Math.max(0, newState.defcon - (defconDropA >= 100 ? newState.defcon : defconDropA));
    
    const defconDropB = handleDeathTriggers(enemyPlayer, activePlayer, newState.defcon, newState.logs, gameState.gameMode);
    if(defconDropB > 0) newState.defcon = Math.max(0, newState.defcon - (defconDropB >= 100 ? newState.defcon : defconDropB));
    
    activePlayer.board = activePlayer.board.filter((c: Card) => (c.currentHealth || 0) > 0);
    enemyPlayer.board = enemyPlayer.board.filter((c: Card) => (c.currentHealth || 0) > 0);

    newState = processCampaignEvent(newState);

    return finalizeGameState(newState);
};

export const executeEndTurn = (gameState: GameState): GameState => {
    if (gameState.gameOver) return gameState;
    audioEngine.playClick();
    
    let newState = cloneState(gameState);
    const currentP = newState.players.find(p => p.id === newState.currentPlayerId)!;
    const nextP = newState.players.find(p => p.id !== newState.currentPlayerId)!;
    
    // --- BLOOD MONEY ZERG UPKEEP ---
    if (gameState.gameMode === 'BLOOD_MONEY' && currentP.faction === FactionId.ZERG) {
        const swarmCount = currentP.board.length;
        if (swarmCount > 0) {
            // Pay 1 HP per 2 units (rounded up)
            const upkeep = Math.ceil(swarmCount / 2);
            currentP.hp -= upkeep;
            newState.logs.push(`异虫代谢消耗: -${upkeep} HP`);
        }
    }

    if (currentP.board.some(c => c.isTransient)) {
        currentP.board = currentP.board.filter(c => !c.isTransient);
        newState.logs.push('临时单位已撤退');
    }

    currentP.board.forEach(u => {
        if (u.isRegen) {
            const heal = 2;
            if ((u.currentHealth || 0) < (u.defense || 0)) {
                u.currentHealth = Math.min(u.defense || 1, (u.currentHealth || 0) + heal);
            }
        }

        if (u.name === '利维坦') {
             for(let k=0; k<2; k++) {
                 if(currentP.board.length < 10) {
                     let spawn: Card = {
                         id: `muta_spawn_${Date.now()}_${k}`, name: '飞龙', type: CardType.UNIT, faction: FactionId.ZERG, rarity: Rarity.COMMON,
                         cost: 0, attack: 2, defense: 1, currentHealth: 1, zone: 'backrow', canAttack: false, isExhausted: true, description: 'Spawn', isFlying: true
                     };
                     spawn = applyGlobalBuffs(spawn, currentP, gameState.gameMode);
                     currentP.board.push(spawn);
                 }
             }
             newState.logs.push('利维坦释放飞龙群');
        }

        if (u.name === '俄亥俄级核潜艇') {
            let hits = 0;
            for(let i=0; i<10; i++) {
                const targets = [...nextP.board]; 
                const roll = Math.random();
                if (targets.length > 0 && roll > 0.3) { 
                    const t = targets[Math.floor(Math.random() * targets.length)];
                    applyDamage(t, 1, newState.logs);
                } else {
                    nextP.hp -= 1;
                }
                hits++;
            }
            newState.logs.push(`俄亥俄级倾泻火力 (${hits}发)`);
        }
        
        if (u.name === '虫后凯瑞甘') {
            if (currentP.board.length < 10) {
                 let nydus: Card = {
                     id: `nydus_summon_${Date.now()}`, name: '坑道虫', type: CardType.UNIT, faction: FactionId.ZERG, rarity: Rarity.RARE,
                     cost: 0, attack: 0, defense: 5, currentHealth: 5, zone: 'frontline', canAttack: false, isExhausted: true, 
                     description: 'Tunneling...', isTransient: true
                 };
                 currentP.board.push(nydus);
                 
                 for(let k=0; k<2; k++) {
                     if (currentP.board.length < 10) {
                        const isHydra = Math.random() > 0.5;
                        let minion: Card = {
                            id: `minion_${Date.now()}_${k}`, 
                            name: isHydra ? '刺蛇' : '蟑螂', 
                            type: CardType.UNIT, faction: FactionId.ZERG, rarity: Rarity.COMMON,
                            cost: 0, 
                            attack: isHydra ? 4 : 2, 
                            defense: isHydra ? 2 : 4, 
                            currentHealth: isHydra ? 2 : 4, 
                            zone: 'frontline', canAttack: false, isExhausted: true, description: 'Swarm'
                        };
                        if (!isHydra) minion.isRegen = true;
                        if (isHydra) minion.isSupport = true;
                        
                        minion = applyGlobalBuffs(minion, currentP, gameState.gameMode);
                        currentP.board.push(minion);
                     }
                 }
            }
            newState.logs.push('凯瑞甘召唤坑道虫增援');
        }

        if (u.name === '“撒旦”导弹井' || u.name === 'V3 火箭发射车') {
             if (nextP.board.length > 0) {
                 const t = nextP.board[Math.floor(Math.random() * nextP.board.length)];
                 applyDamage(t, 2, newState.logs);
             } else {
                 nextP.hp -= 2;
             }
        }
        if (u.name === '支奴干运输机') {
            currentP.board.forEach(f => {
                f.currentHealth = Math.min(f.defense || 1, (f.currentHealth || 0) + 2);
            });
            newState.logs.push('医疗支援');
        }
        if (u.name === '辐射工兵') {
            const allOthers = [...currentP.board, ...nextP.board].filter(x => x.id !== u.id);
            allOthers.forEach(x => applyDamage(x, 1, newState.logs));
            newState.logs.push('辐射泄漏');
        }
        if (u.name === '基洛夫飞艇') {
            nextP.hp -= 3;
            newState.logs.push('基洛夫投弹');
        }
        if (u.name === '将军战列舰') {
            for(let k=0; k<3; k++) {
                if(nextP.board.length > 0) applyDamage(nextP.board[Math.floor(Math.random() * nextP.board.length)], 1, newState.logs);
            }
        }
        if (u.name === '纳米虫群母舰') {
             if (currentP.board.length < 10) {
                 for(let k=0; k<3; k++) {
                     let nanite: Card = {
                         id: `nano_${Date.now()}_${k}`, name: '纳米虫', type: CardType.UNIT, faction: FactionId.PACIFIC, rarity: Rarity.COMMON,
                         cost: 0, attack: 1, defense: 1, currentHealth: 1, zone: 'backrow', canAttack: false, isExhausted: true, description: ''
                     };
                     nanite = applyGlobalBuffs(nanite, currentP, gameState.gameMode);
                     currentP.board.push(nanite);
                 }
             }
        }
        
        if (u.id.includes('_wf')) {
            u.id = u.id.replace('_wf', '');
        }
    });

    if (hasTech(currentP, 'WAR_1')) {
        let count = hasTech(currentP, 'WAR_3B') ? 3 : 1; 
        for(let i=0; i<count; i++) {
            if (currentP.board.length < 10) {
                let conscript: Card = {
                    id: `conscript_${Date.now()}_${i}`, name: '动员兵', type: CardType.UNIT, faction: FactionId.WARSAW, rarity: Rarity.COMMON,
                    cost: 0, attack: 1, defense: 1, currentHealth: 1, canAttack: false, isExhausted: true, description: 'Token', zone: 'backrow'
                };
                conscript = applyGlobalBuffs(conscript, currentP, gameState.gameMode);
                currentP.board.push(conscript);
            }
        }
        newState.logs.push('[强制征召] 触发');
    }

    if (hasTech(currentP, 'ZERG_6B')) {
         while(currentP.board.length < 10) {
             let roach: Card = {
                 id: `roach_spawn_${Date.now()}_${Math.random()}`, name: '蟑螂', type: CardType.UNIT, faction: FactionId.ZERG, rarity: Rarity.COMMON,
                 cost: 0, attack: 2, defense: 2, currentHealth: 2, isRegen: true, canAttack: false, isExhausted: true, description: 'Swarm Spawn', zone: 'backrow'
             };
             roach = applyGlobalBuffs(roach, currentP, gameState.gameMode);
             currentP.board.push(roach);
         }
         newState.logs.push('[虫潮] 席卷战场');
    }
    
    if (hasTech(currentP, 'WAR_4A')) {
        currentP.board.forEach(u => u.currentHealth = u.defense);
    }
    
    if (hasTech(currentP, 'WAR_5C')) {
         let apoc: Card = { id: `apoc_${Date.now()}`, name: '天启坦克', type: CardType.UNIT, faction: FactionId.WARSAW, rarity: Rarity.LEGENDARY,
         cost: 6, attack: 6, defense: 6, currentHealth: 6, description: 'Summoned', zone: 'backrow', canAttack: false, isExhausted: true };
         apoc = applyGlobalBuffs(apoc, currentP, gameState.gameMode);
         currentP.board.push(apoc);
    }

    if (hasTech(currentP, 'PAC_2') && currentP.ap > 0 && !gameState.isPuzzle) {
        if (currentP.deck.length) currentP.hand.push(currentP.deck.shift()!);
    }

    if (hasTech(currentP, 'NATO_6A')) {
        nextP.board.forEach(u => applyDamage(u, 5, newState.logs));
        newState.logs.push('[上帝之杖] 轨道打击 (全场5)');
    }

    const handleEndTurnDeaths = (p: PlayerState) => {
        const dead = p.board.filter(c => (c.currentHealth || 0) <= 0);
        if (dead.length > 0) {
             p.board = p.board.filter(c => (c.currentHealth || 0) > 0);
        }
    };
    handleEndTurnDeaths(nextP);
    handleEndTurnDeaths(currentP);
    
    // Calculate AP for next turn
    // If BLOOD MONEY, AP is basically infinite/locked, but we might regen HP
    if (gameState.gameMode === 'BLOOD_MONEY') {
         nextP.hp = Math.min(nextP.maxHp, nextP.hp + 2); // Small regen
         nextP.ap = 50; // Ensure cap
    } else {
        let nextMaxAp = Math.min(nextP.maxAp + 1, MAX_AP);
        if (hasTech(nextP, 'PAC_2')) nextMaxAp = Math.min(nextMaxAp + 2, MAX_AP + 2); 

        let nextStartingAp = nextMaxAp;

        if (hasTech(nextP, 'NATO_4B_2')) nextStartingAp += 2;
        
        if (hasTech(currentP, 'PAC_4A')) {
            nextStartingAp = Math.max(0, nextStartingAp - 1);
            newState.logs.push('[逻辑锁] 限制了敌方行动力');
        }
        
        nextP.ap = nextStartingAp;
        nextP.maxAp = nextMaxAp;
    }

    const ionCannon = nextP.board.find(c => c.name === '天基离子炮');
    if (ionCannon) {
        if (nextP.hand.length < MAX_HAND_SIZE) {
            let implosion: Card = {
                id: `generated_imp_${Date.now()}`,
                name: '真空内爆弹',
                type: CardType.EVENT,
                faction: FactionId.PACIFIC,
                rarity: Rarity.RARE,
                cost: 0, 
                description: '[事件] 对一个敌方单位造成 8 点伤害。',
            };
            nextP.hand.push(implosion);
            newState.logs.push('离子炮充能完毕: 获得内爆弹');
        }
    }

    const peacekeeper = nextP.board.find(c => c.name === '和平卫士洲际导弹');
    if (peacekeeper && peacekeeper.timer !== undefined) {
        peacekeeper.timer -= 1;
        newState.logs.push(`和平卫士倒计时: ${peacekeeper.timer}`);
        if (peacekeeper.timer <= 0) {
            const enemyOfNext = newState.players.find(p => p.id !== nextP.id)!;
            enemyOfNext.hp -= 25;
            newState.logs.push('☢️ 和平卫士发射！目标：敌方指挥部 (-25)');
            nextP.board = nextP.board.filter(c => c.id !== peacekeeper.id);
        }
    }

    if (hasTech(nextP, 'PAC_6B')) {
        nextP.board.forEach(u => u.hasShield = true);
    }
    
    if (hasTech(nextP, 'ZERG_5A') && nextP.board.length > 0) {
        const t = nextP.board[Math.floor(Math.random() * nextP.board.length)];
        t.attack = (t.attack||0) + 2;
        t.defense = (t.defense||0) + 2;
        t.currentHealth = (t.currentHealth||0) + 2;
        newState.logs.push(`${t.name} 基因飞升`);
    }

    if (!gameState.isPuzzle) {
        if (hasTech(nextP, 'NATO_1') && Math.random() > 0.4) {
            if (nextP.deck.length) nextP.hand.push(nextP.deck.shift()!);
        }
        
        let drawCount = 1;
        if (hasTech(nextP, 'NATO_6D')) {
            drawCount = 10 - nextP.hand.length;
        }

        // BLOOD MONEY EXTRA DRAW
        if (gameState.gameMode === 'BLOOD_MONEY') {
            drawCount += 1;
        }

        for(let i=0; i<drawCount; i++) {
            if (nextP.deck.length > 0 && nextP.hand.length < MAX_HAND_SIZE) {
                nextP.hand.push(nextP.deck.shift()!);
            }
        }
    }

    nextP.unitsDeployedThisTurn = 0;
    nextP.eventsPlayedThisTurn = 0;

    nextP.board.forEach(u => {
        u.canAttack = true;
        u.isExhausted = false;
    });

    newState.turn += 1;
    newState.currentPlayerId = nextP.id;
    newState.logs.push(`>>> 第 ${newState.turn} 回合`);

    newState = processCampaignEvent(newState);

    return finalizeGameState(newState);
};
