import { FactionId, ScenarioDef } from '../types';

export const CAMPAIGN_LEVELS: ScenarioDef[] = [
    {
        id: 'LVL_01',
        title: '序章：黎明行动',
        description: '基础战斗训练。手把手教学：AP管理、科技升级、部署、移动、攻击与空军机制。',
        playerFaction: FactionId.NATO,
        enemyFaction: FactionId.WARSAW,
        briefing: "指挥官，欢迎来到模拟系统。\n这是你的第一场实战演习。按照指示行动，你将掌握战场的主动权。\n\n目标：摧毁敌方指挥部。\n情报：敌方主力即将抵达。",
        startingTechLevel: 1, // Start at 1 to allow upgrade to 2
        enemyStartingTechLevel: 0,
        playerStartingAp: 12, // Sufficient for all steps
        enemyStartingHp: 15, // Custom HP for tutorial math
        isPuzzle: true,
        disableTech: false, // Explicitly allow tech for tutorial
        scriptId: 'LVL_01',
        fixedPlayerDeck: [
            'M1A2 艾布拉姆斯', 
            '战术空袭',
            // B-2 will be added by script later
        ],
        fixedEnemyDeck: [],
        startingBoard: [
            { cardName: '动员兵', zone: 'backrow', owner: 'enemy' },
            { cardName: '动员兵', zone: 'backrow', owner: 'enemy' },
            { cardName: '动员兵', zone: 'backrow', owner: 'enemy' }
        ]
    },
    {
        id: 'LVL_02',
        title: '第二章：死守防线',
        description: '你的指挥部已被包围。在装甲集群的冲击下存活10个回合。',
        playerFaction: FactionId.WARSAW,
        enemyFaction: FactionId.NATO,
        briefing: "敌方主力部队正在向我方防线推进。我们的增援部队还在路上。\n\n任务：不惜一切代价，坚守阵地10个回合（双方各行动5次）。\n\n提示：前排单位可以阻挡敌人攻击后排。利用【铁幕装置】保护关键单位。",
        startingTechLevel: 3,
        enemyStartingTechLevel: 3,
        playerStartingAp: 8,
        isPuzzle: false, 
        scriptId: 'LVL_02',
        winConditionText: "在敌军猛攻下生存 10 回合",
        fixedPlayerDeck: [
            '天启坦克', 'T-90 主战坦克', 'V3 火箭发射车', '铁幕装置', '动员兵', '动员兵', '双刃直升机'
        ],
        fixedEnemyDeck: ['M1A2 艾布拉姆斯', 'M1A2 艾布拉姆斯', 'AH-64 阿帕奇', '战术空袭', '集束炸弹'],
        startingBoard: [
             { cardName: 'T-90 主战坦克', zone: 'frontline', owner: 'player', currentHealth: 3 },
             { cardName: '哨戒炮', zone: 'frontline', owner: 'player' }
        ]
    },
    {
        id: 'LVL_03',
        title: '第三章：猎杀潜航',
        description: '护送我方VIP潜艇突破封锁线，并消灭敌方旗舰。',
        playerFaction: FactionId.WARSAW,
        enemyFaction: FactionId.PACIFIC,
        briefing: "我方一艘载有重要情报的【台风级弹道潜艇】需要在这一海域上浮。\n敌方已经部署了反潜网和旗舰【将军战列舰】。\n\n任务：保护台风级潜艇存活，并击沉敌方将军战列舰。\n\n注意：台风级现在拥有[隐形]能力，利用它清理杂兵。",
        startingTechLevel: 4,
        enemyStartingTechLevel: 4,
        playerStartingAp: 9,
        isPuzzle: true,
        scriptId: 'LVL_03',
        winConditionText: "击沉【将军战列舰】并确保【台风级弹道潜艇】存活",
        fixedPlayerDeck: [
            '基洛夫飞艇', '铁幕装置', '双刃直升机', '磁暴步兵'
        ],
        startingBoard: [
            { cardName: '台风级弹道潜艇', zone: 'backrow', owner: 'player', customId: 'vip_sub' }, 
            { cardName: '将军战列舰', zone: 'backrow', owner: 'enemy', customId: 'target_battleship' },
            { cardName: '海啸坦克', zone: 'frontline', owner: 'enemy' },
            { cardName: '迅雷运输艇', zone: 'frontline', owner: 'enemy' }
        ]
    },
    {
        id: 'LVL_04',
        title: '第四章：核子倒计时',
        description: '启动【和平卫士】，并在其发射前保护它3个回合。',
        playerFaction: FactionId.NATO,
        enemyFaction: FactionId.ZERG,
        briefing: "虫群正在逼近发射井。常规武器已无法阻止它们。\n\n任务：保护【和平卫士洲际导弹】直到发射倒计时结束（3回合）。\n\n警告：核弹发射后，将直接造成25点伤害。你需要确保在这之前不被攻破。",
        startingTechLevel: 5,
        enemyStartingTechLevel: 5,
        playerStartingAp: 10,
        enemyStartingHp: 25, // Lower enemy HP so the nuke is lethal
        isPuzzle: true,
        scriptId: 'LVL_04',
        winConditionText: "保护【和平卫士洲际导弹】直至发射 (3回合)",
        fixedPlayerDeck: [
            'B-2 幽灵', '爱国者导弹连', '海豹突击队', '战术空袭', 'M1A2 艾布拉姆斯'
        ],
        startingBoard: [
            { cardName: '和平卫士洲际导弹', zone: 'backrow', owner: 'player' },
            { cardName: '雷兽', zone: 'frontline', owner: 'enemy' },
            { cardName: '飞龙', zone: 'backrow', owner: 'enemy' },
            { cardName: '飞龙', zone: 'backrow', owner: 'enemy' }
        ]
    },
    {
        id: 'LVL_05',
        title: '终章：虚空之遗',
        description: '面对完全体的异虫女王。利用天基武器与她抗衡。',
        playerFaction: FactionId.PACIFIC, // Mixed Tech
        enemyFaction: FactionId.ZERG,
        briefing: "凯瑞甘已经进化到了终极形态。她能够无限召唤坑道虫进行增援。\n我们已经为你准备了原型机【天基离子炮】。\n\n目标：击败虫后凯瑞甘。\n\n情报：离子炮每回合会为你提供【真空内爆弹】，这是你唯一的清场手段。",
        startingTechLevel: 6,
        enemyStartingTechLevel: 6,
        playerStartingAp: 10,
        isPuzzle: true, 
        scriptId: 'LVL_05',
        winConditionText: "击败【虫后凯瑞甘】",
        fixedPlayerDeck: [
            '波塞冬核鱼雷', '纳米虫群母舰', '百合子克隆体', '鬼王机甲'
        ],
        startingBoard: [
            { cardName: '天基离子炮', zone: 'backrow', owner: 'player' },
            { cardName: '虫后凯瑞甘', zone: 'frontline', owner: 'enemy', currentHealth: 50 } 
        ]
    }
];