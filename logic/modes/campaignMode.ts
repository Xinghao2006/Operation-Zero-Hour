
import { GameState, FactionId, Card, CardType, Rarity } from '../../types';
import { getCompendiumCards } from '../../constants';
import { applyDamage } from '../gameRules';

// --- HELPER ---
const checkWinCondition = (state: GameState) => {
    if (!state.campaignState) return;
    if (state.campaignState.isVictory) {
        state.gameOver = true;
        state.winnerId = 'player';
        state.logs.push(">>> 战役目标达成！");
    }
};

// --- SCRIPT ENGINE ---

export const processCampaignEvent = (state: GameState): GameState => {
    if (!state.isCampaign || !state.campaignLevelId) return state;
    
    // Init Campaign State if missing
    if (!state.campaignState) {
        state.campaignState = {
            levelId: state.campaignLevelId,
            stage: 0,
            turnCount: 1,
            flags: {},
            scriptTick: 0
        };
        // Disable AI for Level 1 as it is strictly scripted
        if (state.campaignLevelId === 'LVL_01') {
            state.campaignState.isScriptedAI = true;
        }
    }

    const scriptId = state.campaignLevelId;
    
    // Reset scripted attack ID every cycle to ensure animation cleans up
    if (state.campaignState.scriptedAttackId) {
        state.campaignState.scriptedAttackId = undefined;
    }
    
    // Dispatcher
    if (scriptId === 'LVL_01') return scriptTutorialBasics(state);
    if (scriptId === 'LVL_02') return scriptSurvival(state);
    if (scriptId === 'LVL_03') return scriptEscort(state);
    if (scriptId === 'LVL_04') return scriptNuclearCountdown(state);
    if (scriptId === 'LVL_05') return scriptBossKerrigan(state);

    return state;
};

// --- LEVEL 1: TUTORIAL ---
const scriptTutorialBasics = (state: GameState): GameState => {
    const p = state.players[0];
    const e = state.players[1];
    const cs = state.campaignState!;

    // FAIL-SAFE: If turn > 8 (Tutorial should be done by Turn 3-4), disable script
    if (state.turn > 8 && cs.stage < 12) {
        if (cs.isScriptedAI) {
            cs.isScriptedAI = false;
            state.tutorialTargetId = undefined;
            state.tutorialDestId = undefined;
            state.tutorialMessage = "系统提示：模拟训练流程中断（超时）。已切换至自由交战模式。";
            state.logs.push(">>> 警告：教程脚本失效，AI接管战场。");
        }
        return state;
    }

    // === PLAYER TURN 1 ===

    // Stage 0: Intro -> Highlight Tech Upgrade (Lvl 1 -> 2)
    if (cs.stage === 0) {
        state.tutorialTargetId = 'tech-upgrade-btn';
        state.tutorialDestId = undefined;
        state.tutorialMessage = "指挥官，欢迎来到战场。\n首先升级科技。\n点击【科技面板】升级到科技等级 2 (空中优势)。";
        
        if (p.techLevel >= 2) {
            cs.stage = 1;
            state.tutorialTargetId = undefined;
        }
    }

    // Stage 1: Deploy M1A2
    if (cs.stage === 1) {
        // Find M1A2 in hand
        const m1a2Idx = p.hand.findIndex(c => c.name.includes('M1A2'));
        if (m1a2Idx !== -1) {
            state.tutorialTargetId = `card-hand-${m1a2Idx}`;
            state.tutorialDestId = 'combat_zone_drop'; // Hint drop zone (or board center)
            state.tutorialMessage = "部署主战坦克。\nM1A2 拥有重型装甲，适合前线抗压。\n将卡牌拖入战场。";
        }
        
        // Check if deployed
        if (p.board.some(c => c.name.includes('M1A2'))) {
            cs.stage = 2;
            state.tutorialTargetId = undefined;
            state.tutorialDestId = undefined;
        }
    }

    // Stage 2: End Player Turn 1
    if (cs.stage === 2) {
        state.tutorialTargetId = 'end-turn-btn';
        state.tutorialDestId = undefined;
        state.tutorialMessage = "部署完成。\n你的坦克目前在【后排】，下回合可移动。\n点击【结束回合】。";
        if (state.currentPlayerId === 'enemy') {
            cs.stage = 3;
            cs.scriptTick = 0; // Reset tick for enemy turn
            state.tutorialTargetId = undefined;
        }
    }

    // === ENEMY TURN 1 (Scripted) ===
    if (cs.stage === 3 && state.currentPlayerId === 'enemy') {
        const tick = cs.scriptTick || 0;
        const conscripts = e.board.filter(u => u.name === '动员兵');
        const playerTank = p.board.find(c => c.name.includes('M1A2'));

        // Tick 1: Log Start
        if (tick === 1) {
             state.logs.push(">>> 敌方回合开始");
        }

        // Tick 2: Move Conscript 1
        if (tick === 2 && conscripts[0]) {
            conscripts[0].zone = 'frontline';
            state.logs.push(">>> 动员兵 A 推进至前线");
        }

        // Tick 3: Move Conscript 2
        if (tick === 3 && conscripts[1]) {
            conscripts[1].zone = 'frontline';
            state.logs.push(">>> 动员兵 B 推进至前线");
        }

        // Tick 4: Move Conscript 3
        if (tick === 4 && conscripts[2]) {
            conscripts[2].zone = 'frontline';
            state.logs.push(">>> 动员兵 C 推进至前线");
        }

        // Tick 5: Spawn T-90
        if (tick === 5) {
            const t90 = {
                 id: `t90_script_${Date.now()}`, name: 'T-90 主战坦克', faction: FactionId.WARSAW, 
                 type: CardType.UNIT, rarity: Rarity.COMMON, cost: 4, attack: 4, defense: 5, currentHealth: 5, 
                 zone: 'frontline' as const, canAttack: false, isExhausted: true, description: '重型坦克'
            };
            e.board.push(t90);
            state.logs.push(">>> 敌方部署了 T-90 主战坦克");
        }

        // Tick 6: Attack 1
        if (tick === 6 && conscripts[0] && playerTank) {
            cs.scriptedAttackId = conscripts[0].id;
            state.logs.push(`${conscripts[0].name} 攻击 M1A2 -> 被装甲弹开 (0伤害)`);
            state.logs.push(`M1A2 反击 -> ${conscripts[0].name} 阵亡`);
            conscripts[0].currentHealth = 0;
            e.board = e.board.filter(c => c.id !== conscripts[0].id); // Clean up
        }

        // Tick 7: Attack 2
        if (tick === 7 && conscripts[1] && playerTank) {
            cs.scriptedAttackId = conscripts[1].id;
            state.logs.push(`${conscripts[1].name} 攻击 M1A2 -> 被装甲弹开 (0伤害)`);
            state.logs.push(`M1A2 反击 -> ${conscripts[1].name} 阵亡`);
            conscripts[1].currentHealth = 0;
            e.board = e.board.filter(c => c.id !== conscripts[1].id);
        }

        // Tick 8: Attack 3
        if (tick === 8 && conscripts[2] && playerTank) {
            cs.scriptedAttackId = conscripts[2].id;
            state.logs.push(`${conscripts[2].name} 攻击 M1A2 -> 被装甲弹开 (0伤害)`);
            state.logs.push(`M1A2 反击 -> ${conscripts[2].name} 阵亡`);
            conscripts[2].currentHealth = 0;
            e.board = e.board.filter(c => c.id !== conscripts[2].id);
        }

        // Tick 9: End Turn
        if (tick >= 9) {
            state.turn++;
            state.currentPlayerId = 'player';
            p.ap = p.maxAp;
            p.board.forEach(c => { c.canAttack = true; c.isExhausted = false; });
            cs.stage = 4;
            cs.scriptTick = 0;
        }
    }

    // === PLAYER TURN 2 ===

    // Stage 4: Move M1A2 to Front
    if (cs.stage === 4) {
        const tank = p.board.find(c => c.name.includes('M1A2'));
        
        if (!tank) return state; 

        if (tank.zone === 'backrow') {
            state.tutorialTargetId = tank.id;
            state.tutorialDestId = 'combat_zone_drop';
            state.tutorialMessage = "敌方 T-90 已进入交战区。\n将 M1A2 拖拽至【前排交战区】（虚线框内）以准备迎击。";
        } else {
            // Moved to front
            cs.stage = 5;
            state.tutorialDestId = undefined;
        }
    }
    
    // Stage 5: Upgrade to Level 3
    if (cs.stage === 5) {
         if (p.techLevel < 3) {
            state.tutorialTargetId = 'tech-upgrade-btn';
            state.tutorialMessage = "单位移动后本回合无法攻击。\n利用剩余资源，升级科技到等级 3。";
         } else {
            cs.stage = 6;
            state.tutorialTargetId = undefined;
         }
    }

    // Stage 6: Upgrade to Level 4 (Pacing adjustment)
    if (cs.stage === 6) {
         if (p.techLevel < 4) {
            state.tutorialTargetId = 'tech-upgrade-btn';
            state.tutorialMessage = "继续升级！\n我们需要达到等级 4 来解锁 B-2 轰炸机。\n再次点击升级。";
         } else {
            cs.stage = 7;
            state.tutorialTargetId = undefined;
         }
    }

    // Stage 7: End Player Turn 2 (Wait for enemy attack)
    if (cs.stage === 7) {
         state.tutorialTargetId = 'end-turn-btn';
         state.tutorialMessage = "科技已就绪。\nT-90 装甲厚重，但我方坦克还能坚持。\n结束回合，等待空军支援。";
         if (state.currentPlayerId === 'enemy') {
             cs.stage = 8;
             cs.scriptTick = 0;
             state.tutorialTargetId = undefined;
         }
    }

    // === ENEMY TURN 2 (Scripted) ===
    if (cs.stage === 8 && state.currentPlayerId === 'enemy') {
        const tick = cs.scriptTick || 0;
        const enemyTank = e.board.find(c => c.name.includes('T-90'));
        const playerTank = p.board.find(c => c.name.includes('M1A2'));

        if (tick === 1) state.logs.push(">>> 敌方回合");

        if (tick === 2 && enemyTank && playerTank) {
            cs.scriptedAttackId = enemyTank.id;
            state.logs.push("T-90 攻击 M1A2 -> 双方装甲受损！");
            enemyTank.currentHealth = 2;
            playerTank.currentHealth = 3;
        }

        if (tick === 3) {
            state.logs.push(">>> 警告：侦测到敌方装甲集群！");
             for(let i=0; i<3; i++) {
                 e.board.push({
                     id: `t90_reinforce_${i}`, name: 'T-90 主战坦克', faction: FactionId.WARSAW, 
                     type: CardType.UNIT, rarity: Rarity.COMMON, cost: 4, attack: 4, defense: 5, currentHealth: 5, 
                     zone: 'backrow' as const, canAttack: false, isExhausted: true, description: '重型坦克' 
                });
            }
        }

        if (tick >= 4) {
            // Add B-2 to player hand
            const b2 = getCompendiumCards(FactionId.NATO).find(c => c.name === 'B-2 幽灵');
            if (b2) {
                 const scriptedB2 = { ...b2, id: `scripted_b2`, reqTechLevel: 4 }; 
                 p.hand.push(scriptedB2);
                 state.logs.push(">>> 空中支援抵达：B-2 幽灵轰炸机");
            }
            
            // Force Unit Refresh for next turn (Fixes bug where unit stays exhausted)
            state.turn++;
            state.currentPlayerId = 'player';
            p.ap = p.maxAp;
            
            p.board.forEach(c => { 
                c.canAttack = true; 
                c.isExhausted = false; 
            });
            
            cs.stage = 9;
            cs.scriptTick = 0;
        }
    }

    // === PLAYER TURN 3 ===
    
    // Stage 9: Counter Attack & B-2 Deploy
    if (cs.stage === 9) {
        // Step 1: Deploy B-2 (Priority)
        const b2Idx = p.hand.findIndex(c => c.name.includes('B-2'));
        if (b2Idx !== -1) {
            state.tutorialTargetId = `card-hand-${b2Idx}`;
            state.tutorialDestId = 'play_drop_zone'; // or combat zone
            state.tutorialMessage = "敌方增援部队正在逼近。\n唯有空军可以拯救局势！\n部署【B-2 幽灵】轰炸机（需要 8 AP）。";
        } else if (p.board.some(c => c.name.includes('B-2'))) {
             // B-2 Deployed, fix stats for tutorial math
             const f22s = p.board.filter(c => c.name.includes('F-22'));
             f22s.forEach(f => { f.attack = 5; });
             cs.stage = 10;
        } else {
             // Fallback if user didn't deploy B-2 (e.g. played something else)
             // Just proceed or fail? Let's proceed to attack stage if B-2 is somehow missing but turn continues
             cs.stage = 10; 
        }
    }

    // Stage 10: Air Attacks
    if (cs.stage === 10) {
        // Find ready air units (B-2 has Blitz now, so it is ready)
        const airUnits = p.board.filter(c => c.isFlying && !c.isExhausted);
        
        if (airUnits.length > 0) {
             state.tutorialTargetId = airUnits[0].id; 
             state.tutorialDestId = 'enemy_hq'; // Explicitly point to HQ
             state.tutorialMessage = "B-2 已投放两架 F-22 僚机。\n飞行单位可以直接越过地面防线。\n无视那些 T-90，直接攻击【敌方指挥部】！";
        } else {
             // All attacked
             cs.stage = 11;
             state.tutorialTargetId = undefined;
             state.tutorialDestId = undefined;
        }
    }

    // Stage 11: Lethal
    if (cs.stage === 11) {
        if (e.hp > 0) {
             const strikeIdx = p.hand.findIndex(c => c.name === '战术空袭');
             if (strikeIdx !== -1) {
                 state.tutorialTargetId = `card-hand-${strikeIdx}`;
                 state.tutorialDestId = 'enemy_hq';
                 state.tutorialMessage = "敌方指挥部已遭受重创。\n使用【战术空袭】完成最后一击！";
             } else {
                 state.tutorialMessage = "消灭敌方指挥部！";
             }
        }
        
        if (e.hp <= 0) {
            cs.stage = 12;
        }
    }

    if (cs.stage === 12) {
        state.tutorialTargetId = undefined;
        state.tutorialDestId = undefined;
        state.tutorialMessage = "目标确认摧毁。演习胜利。";
    }

    return state;
};

// --- LEVEL 2: SURVIVAL ---
const scriptSurvival = (state: GameState): GameState => {
    const cs = state.campaignState!;
    const surviveTurns = 10;
    const current = state.turn;

    // Initial Message
    if (state.turn === 1 && !cs.flags['intro']) {
        cs.flags['intro'] = true;
        state.logs.push(">>> 指挥中心：坚守阵地！援军还有 10 回合到达。");
    }

    // Wave Spawning (Enemy Turn Start)
    if (state.currentPlayerId === 'enemy' && !cs.flags[`wave_${state.turn}`]) {
        cs.flags[`wave_${state.turn}`] = true;
        const e = state.players[1];
        
        if (e.board.length < 8) {
            if (state.turn === 3 || state.turn === 7) {
                 // Minor waves
            } else {
                 state.logs.push("⚠️ 敌方增援抵达！");
            }
        }
    }

    if (current > surviveTurns) {
        cs.isVictory = true;
        checkWinCondition(state);
    } else {
        state.tutorialMessage = `任务倒计时：${Math.max(0, surviveTurns - current + 1)} 回合`;
    }

    return state;
};

// --- LEVEL 3: ESCORT ---
const scriptEscort = (state: GameState): GameState => {
    const cs = state.campaignState!;
    const p = state.players[0];
    const e = state.players[1];
    
    // Check VIP status
    const vip = p.board.find(c => c.id.includes('vip_sub'));
    if (!vip) {
        state.gameOver = true;
        state.winnerId = 'enemy';
        state.logs.push(">>> 任务失败：VIP 潜艇已沉没。");
        return state;
    }

    // Check Target status
    const target = e.board.find(c => c.id.includes('target_battleship'));
    if (!target) {
        cs.isVictory = true;
        checkWinCondition(state);
    } else {
        if (state.currentPlayerId === 'enemy' && !cs.flags[`bombard_${state.turn}`]) {
             cs.flags[`bombard_${state.turn}`] = true;
             if (state.turn % 2 === 0) {
                 state.logs.push(">>> 将军战列舰正在校准主炮...");
             }
        }
    }

    return state;
};

// --- LEVEL 4: NUCLEAR COUNTDOWN ---
const scriptNuclearCountdown = (state: GameState): GameState => {
    const cs = state.campaignState!;
    const p = state.players[0];
    
    const peacekeeper = p.board.find(c => c.name === '和平卫士洲际导弹');
    
    if (cs.flags['launched']) {
        if (!state.gameOver) {
             state.tutorialMessage = "核打击确认。清除剩余敌军。";
        }
        return state;
    }

    if (peacekeeper) {
        state.tutorialMessage = `发射倒计时：${peacekeeper.timer} 回合`;
        if (peacekeeper.timer === 0) {
             cs.flags['launched'] = true;
        }
    } else {
        const inHand = p.hand.find(c => c.name === '和平卫士洲际导弹');
        const inDeck = p.deck.find(c => c.name === '和平卫士洲际导弹');
        
        if (!inHand && !inDeck && !cs.flags['launched']) {
             state.gameOver = true;
             state.winnerId = 'enemy';
             state.logs.push(">>> 任务失败：发射井被摧毁。");
        } else if (inHand) {
             state.tutorialMessage = "部署【和平卫士洲际导弹】以开始倒计时！";
        }
    }

    return state;
};

// --- LEVEL 5: BOSS KERRIGAN ---
const scriptBossKerrigan = (state: GameState): GameState => {
    const cs = state.campaignState!;
    const e = state.players[1];
    const boss = e.board.find(c => c.name === '虫后凯瑞甘');

    if (!boss && !cs.flags['boss_killed']) {
        cs.flags['boss_killed'] = true;
        cs.isVictory = true;
        checkWinCondition(state);
        return state;
    }
    
    if (boss) {
        state.tutorialMessage = `BOSS 状态: ${boss.currentHealth} HP\n每回合获得真空内爆弹。`;
        if (state.turn === 1 && !cs.flags['intro']) {
             cs.flags['intro'] = true;
             state.logs.push(">>> 凯瑞甘：你们这是自寻死路。");
        }
    }

    return state;
};
