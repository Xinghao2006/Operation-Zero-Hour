

import { Card, CardType, FactionId, Rarity, TechDefinition } from './types';

// --- FACTION DESCRIPTIONS ---
export const FACTION_DESCRIPTIONS: Record<FactionId, string> = {
  [FactionId.NATO]: "空中优势与特种作战。NATO 拥有大量的[飞行]单位和[支援]单位，依靠空中火力压制敌人。",
  [FactionId.WARSAW]: "钢铁洪流与闪电战。WARSAW 拥有强大的[闪击]装甲单位，擅长快速抢占交战区。",
  [FactionId.PACIFIC]: "高能科技与防御阵线。PACIFIC 擅长阵地战，利用[支援]和[护盾]在后方建立坚不可摧的防线。",
  [FactionId.ZERG]: "生物突变与虫群意志。ZERG 依靠[再生]回复生命，利用[剧毒]和无尽的虫群吞噬一切。"
};

// --- KEYWORDS SYSTEM ---
export interface KeywordDef {
    id: string;
    name: string;
    description: string;
    color: string;
}

export const KEYWORDS: Record<string, KeywordDef> = {
    BLITZ: { id: 'BLITZ', name: '闪击', description: '部署后可以立即移动或攻击。', color: 'text-yellow-400 border-yellow-500' },
    FLYING: { id: 'FLYING', name: '飞行', description: '可在后排攻击。攻击指挥部时无视交战区阻挡。', color: 'text-sky-400 border-sky-500' },
    SUPPORT: { id: 'SUPPORT', name: '支援', description: '可在后排发动攻击。', color: 'text-orange-400 border-orange-500' },
    TAUNT: { id: 'TAUNT', name: '嘲讽', description: '敌人必须优先攻击该单位。', color: 'text-gray-300 border-gray-400' },
    SHIELD: { id: 'SHIELD', name: '护盾', description: '抵挡一次受到的伤害。', color: 'text-cyan-400 border-cyan-500' },
    DEPLOY: { id: 'DEPLOY', name: '部署', description: '卡牌打出时立即触发的效果。', color: 'text-green-400 border-green-500' },
    DEATHRATTLE: { id: 'DEATHRATTLE', name: '亡语', description: '单位死亡时触发的效果。', color: 'text-purple-400 border-purple-500' },
    SYNERGY: { id: 'SYNERGY', name: '联动', description: '当满足特定条件（如使用事件卡）时触发。', color: 'text-blue-400 border-blue-500' },
    STRATEGIC: { id: 'STRATEGIC', name: '战略', description: '战略级高价值目标。部署此单位会降低 DEFCON 等级。', color: 'text-red-500 border-red-600' },
    FREEZE: { id: 'FREEZE', name: '冻结', description: '使目标下回合无法行动。', color: 'text-blue-200 border-blue-300' },
    SILENCE: { id: 'SILENCE', name: '沉默', description: '移除目标所有的 Buff 和特殊效果。', color: 'text-pink-400 border-pink-500' },
    WINDFURY: { id: 'WINDFURY', name: '风怒', description: '该单位每回合可以攻击两次。', color: 'text-emerald-400 border-emerald-500' },
    STEALTH: { id: 'STEALTH', name: '隐形', description: '无法成为攻击或法术的目标，直到该单位发动攻击。', color: 'text-gray-500 border-gray-600' },
    AURA: { id: 'AURA', name: '光环', description: '只要该单位在场就持续生效的效果。', color: 'text-indigo-400 border-indigo-500' },
    REGEN: { id: 'REGEN', name: '再生', description: '回合结束时，恢复 2 点生命值。', color: 'text-lime-400 border-lime-500' },
    POISON: { id: 'POISON', name: '剧毒', description: '消灭任何受到该单位伤害的单位。', color: 'text-green-600 border-green-700' }
};

export const getCardKeywords = (card: Card): KeywordDef[] => {
    const list: KeywordDef[] = [];
    
    // Explicit Properties
    if (card.hasBlitz || card.hasRush) list.push(KEYWORDS.BLITZ);
    if (card.isFlying) list.push(KEYWORDS.FLYING);
    if (card.isSupport) list.push(KEYWORDS.SUPPORT);
    if (card.hasTaunt) list.push(KEYWORDS.TAUNT);
    if (card.hasShield) list.push(KEYWORDS.SHIELD);
    if (card.isRegen) list.push(KEYWORDS.REGEN);
    if (card.isPoisonous) list.push(KEYWORDS.POISON);
    if ((card.defconImpact || 0) < 0) list.push(KEYWORDS.STRATEGIC);

    // Text Analysis
    const desc = card.description;
    if (desc.includes('[部署]')) list.push(KEYWORDS.DEPLOY);
    if (desc.includes('[亡语]')) list.push(KEYWORDS.DEATHRATTLE);
    if (desc.includes('[联动]')) list.push(KEYWORDS.SYNERGY);
    if (desc.includes('冻结')) list.push(KEYWORDS.FREEZE);
    if (desc.includes('沉默')) list.push(KEYWORDS.SILENCE);
    if (desc.includes('风怒')) list.push(KEYWORDS.WINDFURY);
    if (desc.includes('隐形') || desc.includes('无法成为目标')) list.push(KEYWORDS.STEALTH);
    if (desc.includes('[光环]')) list.push(KEYWORDS.AURA);

    return list.filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);
};

// --- TECH TREES ---
const t = (id: string, branch: string, name: string, description: string, cost: number, reqId?: string): TechDefinition => ({
    id, branch, name, description, cost, reqId
});

export const FACTION_TECHS: Record<FactionId, Record<number, TechDefinition[]>> = {
  [FactionId.NATO]: {
    1: [t('NATO_1', 'CORE', '战场情报', '回合开始时：60% 几率额外抽 1 张牌。', 2)],
    2: [
        t('NATO_2A', 'AIR', '空中优势', '[事件卡] 伤害 +1。', 3, 'NATO_1'),
        t('NATO_2B', 'OPS', '特种作战', '首个部署的单位费用 -1 AP。', 3, 'NATO_1')
    ],
    3: [
        t('NATO_3A', 'AIR', '火控雷达', '使用事件卡后，随机对敌方造成 2 点伤害。', 4, 'NATO_2A'),
        t('NATO_3B', 'OPS', '战地医疗', '部署单位时：回复其 2 点生命值并抽 1 张牌。', 4, 'NATO_2B')
    ],
    4: [
        t('NATO_4A_1', 'BOMBER', '地毯式轰炸', '[事件卡] 同时对敌方指挥部造成伤害。', 5, 'NATO_3A'),
        t('NATO_4A_2', 'INTERCEPTOR', '空中截击', '敌方无法使用 [闪击] 单位，且 [飞行] 单位费用 +2。', 5, 'NATO_3A'),
        t('NATO_4B_1', 'GHOST', '隐形迷彩', '友方单位部署回合获得 [护盾] 和 [闪击]。', 5, 'NATO_3B'),
        t('NATO_4B_2', 'LOGISTICS', '战争债券', '回合开始时获得 2 AP。', 5, 'NATO_3B')
    ],
    5: [
        t('NATO_5A_1', 'BOMBER', '重型载弹', '[事件卡] 消耗减少 1 点。', 6, 'NATO_4A_1'),
        t('NATO_5A_2', 'INTERCEPTOR', '王牌飞行员', '所有 [飞行] 单位 +2/+2。', 6, 'NATO_5A_2'), // Fixed reqId
        t('NATO_5B_1', 'GHOST', '斩首行动', '单位攻击时忽略 [嘲讽] 和 [护盾]。', 6, 'NATO_4B_1'),
        t('NATO_5B_2', 'LOGISTICS', '军工复合体', '抽牌时，使该牌费用 -1。', 6, 'NATO_4B_2')
    ],
    6: [
        t('NATO_6A', 'CMD', '上帝之杖', '[终极] 每回合结束时，对所有敌方单位造成 5 点伤害。', 10, 'NATO_5A_1'),
        t('NATO_6B', 'CMD', '制空霸主', '[终极] 你的所有单位获得风怒（攻击两次）。', 10, 'NATO_5A_2'),
        t('NATO_6C', 'CMD', '幽灵协议', '[终极] 所有单位获得 [剧毒]。', 9, 'NATO_5B_1'),
        t('NATO_6D', 'CMD', '无限战争', '[终极] 手牌上限 10，每回合抽满手牌。', 9, 'NATO_5B_2')
    ]
  },
  [FactionId.WARSAW]: {
    1: [t('WAR_1', 'CORE', '强制征召', '回合结束：召唤 1/1 动员兵到后排。', 2)],
    2: [
        t('WAR_2A', 'ARMOR', '复合装甲', '单位生命值 +2。', 3, 'WAR_1'),
        t('WAR_2B', 'INFANTRY', '光荣牺牲', '单位死亡时对敌方造成 1 点伤害。', 3, 'WAR_1'),
        t('WAR_2C', 'INDUSTRY', '回收利用', '单位死亡获得 1 AP。', 3, 'WAR_1')
    ],
    3: [
        t('WAR_3A', 'ARMOR', '反应装甲', '单位受到的伤害 -1。', 4, 'WAR_2A'),
        t('WAR_3B', 'INFANTRY', '人海战术', '[强制征召] 数量变为 3 个。', 4, 'WAR_2B'),
        t('WAR_3C', 'INDUSTRY', '战时生产', '部署单位时获得 +1/+1。', 4, 'WAR_2C')
    ],
    4: [
        t('WAR_4A', 'ARMOR', '纳米维修', '回合结束：修复所有受损单位。', 5, 'WAR_3A'),
        t('WAR_4B', 'INFANTRY', '狂热', '单位死亡回复指挥部 2 血。', 5, 'WAR_3B'),
        t('WAR_4C', 'INDUSTRY', '量产协议', '高费单位 (5+) 费用减少 2。', 5, 'WAR_3C')
    ],
    5: [
        t('WAR_5A', 'ARMOR', '钢铁意志', '全员 [嘲讽] 和法术抗性。', 6, 'WAR_4A'),
        t('WAR_5B', 'INFANTRY', '复仇', '单位死亡时，随机友军 +2/+2。', 6, 'WAR_4B'),
        t('WAR_5C', 'INDUSTRY', '天启降临', '回合开始：召唤 6/6 天启坦克。', 6, 'WAR_4C')
    ],
    6: [
        t('WAR_6A', 'SUPREME', '不朽堡垒', '[终极] 指挥部免疫伤害（场上有单位时）。', 9, 'WAR_5A'),
        t('WAR_6B', 'SUPREME', '红色黎明', '[终极] 所有单位亡语：召唤自身的 1/1 复制。', 9, 'WAR_5B'),
        t('WAR_6C', 'SUPREME', '核子冬天', '[终极] 部署单位时：消灭所有敌方单位。', 10, 'WAR_5C')
    ]
  },
  [FactionId.PACIFIC]: {
    1: [t('PAC_1', 'CORE', '护盾发生器', '部署单位获得 [护盾]。', 2)],
    2: [t('PAC_2', 'CORE', '聚变反应堆', 'AP 上限 +2，回合结束抽 1 牌。', 3, 'PAC_1')],
    3: [
        t('PAC_3A', 'CYBER', '电子战', '敌方卡牌费用 +1。', 4, 'PAC_2'),
        t('PAC_3B', 'PHASE', '相位装甲', '指挥部单次受伤上限 3 点。', 4, 'PAC_2')
    ],
    4: [
        t('PAC_4A', 'CYBER', '逻辑锁', '敌方回合开始 AP -1 (永久)。', 5, 'PAC_3A'),
        t('PAC_4B', 'PHASE', '荆棘协议', '受到攻击反弹 2 点伤害。', 5, 'PAC_3B')
    ],
    5: [
        t('PAC_5A', 'CYBER', '系统瘫痪', '敌方部署的单位 [冻结] 一回合。', 6, 'PAC_4A'),
        t('PAC_5B', 'PHASE', '镜像实体', '强制敌方攻击 [护盾] 单位。', 6, 'PAC_5B')
    ],
    6: [
        t('PAC_6A', 'OMEGA', '奇点', '[终极] 敌方所有卡牌费用 +3。', 9, 'PAC_5A'),
        t('PAC_6B', 'OMEGA', '绝对防御', '[终极] 友方护盾每回合刷新。', 9, 'PAC_5B')
    ]
  },
  [FactionId.ZERG]: {
      1: [t('ZERG_1', 'CORE', '高速代谢', '所有友方单位获得 [再生]（回合结束回复 2 点生命值）。', 2)],
      2: [
          t('ZERG_2A', 'CARAPACE', '甲壳硬化', '所有单位生命值 +2。', 3, 'ZERG_1'),
          t('ZERG_2B', 'ADRENAL', '肾上腺素', '所有单位攻击力 +1。', 3, 'ZERG_1')
      ],
      3: [
          t('ZERG_3A', 'BURROW', '潜地突袭', '部署的单位获得 [隐形] 和 [闪击]。', 4, 'ZERG_2A'),
          t('ZERG_3B', 'SPORES', '酸性孢子', '[支援] 单位造成双倍伤害。', 4, 'ZERG_2B')
      ],
      4: [
          t('ZERG_4A', 'INFEST', '感染源', '当一个单位死亡时，召唤一个 1/1 变异虫。', 5, 'ZERG_3A'),
          t('ZERG_4B', 'NYDUS', '坑道网络', '单位部署费用减少 1 点。', 5, 'ZERG_3B')
      ],
      5: [
          t('ZERG_5A', 'EVO', '基因飞升', '回合开始时，随机使一个友方单位 +2/+2。', 6, 'ZERG_4A'),
          t('ZERG_5B', 'TOXIN', '致命毒素', '所有单位获得 [剧毒]（消灭受到伤害的单位）。', 6, 'ZERG_4B')
      ],
      6: [
          t('ZERG_6A', 'SWARM', '吞噬', '[终极] 部署单位时：消灭随机一个敌方单位。', 9, 'ZERG_5A'),
          t('ZERG_6B', 'SWARM', '虫潮', '[终极] 回合结束时：填满后排空位（召唤 2/2 蟑螂）。', 10, 'ZERG_5B')
      ]
  }
};

// Helper for both Deck Creation and Compendium
const populateCards = (faction: FactionId, addCard: (template: Omit<Card, 'id' | 'faction' | 'currentHealth'>, count: number) => void) => {
  if (faction === FactionId.NATO) {
    // Basic Units
    addCard({ name: '三角洲特种兵', cost: 1, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 1, defense: 2, hasBlitz: true, description: '[闪击] [联动]: 使用事件卡后，获得 +1/+1。', flavor: '地面行动迅速。' }, 3);
    addCard({ name: 'F-16 战隼', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 3, defense: 2, isFlying: true, description: '[飞行] 空中格斗专家，可跨越防线。', flavor: '猎狐一号就位。' }, 3);
    
    // NEW T2/T1 Units (Balance Update)
    addCard({ name: '前线观察员', cost: 1, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 0, defense: 3, isSupport: true, description: '[支援] [光环]: 你的事件卡费用 -1。', flavor: '坐标已确认，等待开火。' }, 2);
    addCard({ name: 'MQ-9 死神无人机', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 2, defense: 1, isFlying: true, description: '[飞行] [亡语]: 对随机敌方单位造成 2 点伤害。', flavor: '沉默的杀手。' }, 2);
    addCard({ name: '支奴干运输机', cost: 3, type: CardType.UNIT, rarity: Rarity.RARE, attack: 1, defense: 5, isFlying: true, reqTechLevel: 2, description: '[飞行] [回合结束]: 为所有友方单位恢复 2 点生命值。', flavor: '医疗后送已就绪。' }, 2);
    addCard({ name: '海豹突击队', cost: 3, type: CardType.UNIT, rarity: Rarity.RARE, attack: 4, defense: 2, hasBlitz: true, reqTechLevel: 2, description: '[闪击] [隐形] 只能被 [飞行] 单位攻击。', flavor: '只有死人见过我们。' }, 2);
    addCard({ name: 'M1A2 艾布拉姆斯', cost: 4, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 3, defense: 6, hasTaunt: true, reqTechLevel: 2, description: '[嘲讽] 受到的战斗伤害 -1。', flavor: '陆战之王。' }, 2);
    addCard({ name: '爱国者导弹连', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 2, defense: 4, isSupport: true, reqTechLevel: 2, description: '[支援] 对 [飞行] 单位造成双倍伤害。', flavor: '禁飞区已建立。' }, 2);
    addCard({ name: 'AH-64 阿帕奇', cost: 5, type: CardType.UNIT, rarity: Rarity.RARE, attack: 4, defense: 4, isFlying: true, reqTechLevel: 3, description: '[飞行] [部署]: 对一个敌方单位造成 2 点伤害。', flavor: '坦克杀手。' }, 2);
    addCard({ name: '地狱火机甲', cost: 5, type: CardType.UNIT, rarity: Rarity.RARE, attack: 4, defense: 5, reqTechLevel: 3, description: '攻击时同时也攻击目标相邻的单位。', flavor: '燃烧一切。' }, 2);

    // T1 - New DEFCON / Tactical
    addCard({ name: 'U-2 侦察机', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 0, defense: 4, isFlying: true, description: '[飞行] [部署]: 抽 1 张牌。如果 DEFCON < 3，额外抽 1 张。', flavor: '天眼已开启。' }, 2);
    addCard({ name: '陆军游骑兵', cost: 3, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 3, defense: 3, hasBlitz: true, description: '[闪击] [攻击后]: 恢复 2 点生命值。', flavor: '游骑兵做先锋！' }, 2);

    // T2 - Strategic & Heavy Hitters
    addCard({ name: 'F-22 猛禽', cost: 6, type: CardType.UNIT, rarity: Rarity.RARE, attack: 6, defense: 4, isFlying: true, reqTechLevel: 4, description: '[飞行] [隐形] 只能被 [飞行] 单位攻击。', flavor: '首日打击。' }, 2);
    addCard({ name: '战斧巡航导弹连', cost: 5, type: CardType.UNIT, rarity: Rarity.RARE, attack: 4, defense: 4, isSupport: true, reqTechLevel: 3, description: '[支援] [部署]: 对随机敌方造成 4 点伤害。', flavor: '精确制导。' }, 2);
    
    // UPDATED: Ohio Class Submarine
    addCard({ name: '俄亥俄级核潜艇', cost: 7, type: CardType.UNIT, rarity: Rarity.RARE, attack: 3, defense: 8, isSupport: true, defconImpact: -1, reqTechLevel: 4, description: '[支援] [战略] [回合结束]: 对敌方随机目标造成共计 10 点伤害 (随机分配)。', flavor: '末日裁决者。' }, 2);
    
    // UPDATED: B-2 Spirit - NOW HAS BLITZ
    addCard({ name: 'B-2 幽灵', cost: 8, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 4, defense: 6, isFlying: true, hasBlitz: true, defconImpact: -1, reqTechLevel: 4, description: '[飞行] [闪击] [隐形] [部署]: 召唤两架 6/4 的 F-22 猛禽。', flavor: '空中霸主降临。' }, 2);

    // UPDATED: Peacekeeper ICBM
    addCard({ name: '和平卫士洲际导弹', cost: 10, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 0, defense: 15, isSupport: true, hasTaunt: true, defconImpact: -2, reqTechLevel: 5, description: '[支援] [战略] 无法攻击。[倒计时(3)]: 对敌方指挥部造成 25 点伤害。', timer: 3, flavor: '终极威慑。' }, 1);

    // Events
    addCard({ name: '战术空袭', cost: 1, type: CardType.EVENT, rarity: Rarity.COMMON, description: '[事件]: 造成 2 点伤害。', flavor: '确认击中。' }, 2);
    addCard({ name: '集束炸弹', cost: 3, type: CardType.EVENT, rarity: Rarity.RARE, description: '[事件]: 对所有敌方单位造成 2 点伤害。', flavor: '清理跑道。' }, 2);
    addCard({ name: '末日指令', cost: 4, type: CardType.EVENT, rarity: Rarity.RARE, defconImpact: -1, reqTechLevel: 4, description: '[事件] 抽 3 张牌。', flavor: '总统已离开白宫。' }, 1);
  }

  if (faction === FactionId.WARSAW) {
    // Basic Units
    addCard({ name: '动员兵', cost: 1, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 1, defense: 2, description: '[亡语]: 对随机敌方造成 1 点伤害。', flavor: '为了联盟！' }, 4);
    addCard({ name: '政治委员', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 2, defense: 3, isSupport: true, description: '[支援] [部署]: 消灭一个友方单位，获得 +2/+2。', flavor: '不许后退！' }, 2);
    
    // NEW T2/T1 Units (Balance Update)
    addCard({ name: '战熊', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 3, defense: 2, hasBlitz: true, description: '[闪击] 对步兵单位造成双倍伤害。', flavor: '咆哮吧！' }, 2);
    addCard({ name: '宣传车', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 0, defense: 4, isSupport: true, description: '[支援] [光环]: 相邻单位获得 +1 攻击力。', flavor: '广播真理。' }, 2);
    addCard({ name: '辐射工兵', cost: 2, type: CardType.UNIT, rarity: Rarity.RARE, attack: 2, defense: 3, reqTechLevel: 2, description: '[回合结束]: 对所有其他单位造成 1 点伤害。', flavor: '这片土地是我的了。' }, 2);
    addCard({ name: '磁暴步兵', cost: 3, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 3, defense: 3, description: '攻击时使目标 [冻结]。', flavor: '高压充电中。' }, 2);
    addCard({ name: '双刃直升机', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 3, defense: 4, isFlying: true, reqTechLevel: 2, description: '[飞行] [风怒]。', flavor: '双倍的火力。' }, 2);
    addCard({ name: 'T-90 主战坦克', cost: 4, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 4, defense: 5, hasTaunt: true, reqTechLevel: 2, description: '[嘲讽] 坚不可摧。', flavor: '钢铁防线。' }, 2);
    addCard({ name: 'V3 火箭发射车', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 1, defense: 4, isSupport: true, reqTechLevel: 2, description: '[支援] [回合结束]: 对随机敌方造成 2 点伤害。', flavor: '远程投送。' }, 2);
    addCard({ name: '天启原型机', cost: 5, type: CardType.UNIT, rarity: Rarity.RARE, attack: 5, defense: 6, reqTechLevel: 3, description: '能够自我修复。 [攻击后]: 恢复 2 点生命值。', flavor: '这只是原型。' }, 2);

    // T1 - Tactical
    addCard({ name: 'KGB 特工', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 2, defense: 2, description: '[隐形] [部署]: 敌方下一张牌费用 +2。', flavor: '我们无处不在。' }, 2);
    addCard({ name: 'ZSU 防空履带车', cost: 3, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 2, defense: 4, isSupport: true, description: '[支援] 对 [飞行] 单位造成双倍伤害。', flavor: '苍蝇拍。' }, 2);

    // T2 - Strategic & Heavy Hitters
    // UPDATED: Typhoon Submarine
    addCard({ name: '台风级弹道潜艇', cost: 7, type: CardType.UNIT, rarity: Rarity.RARE, attack: 4, defense: 10, isSupport: true, defconImpact: -1, reqTechLevel: 4, description: '[支援] [战略] [隐形] 攻击时同时也攻击所有敌方单位。', flavor: '红色十月。' }, 2);
    
    addCard({ name: '图-160 白天鹅', cost: 7, type: CardType.UNIT, rarity: Rarity.RARE, attack: 6, defense: 6, isFlying: true, defconImpact: -1, reqTechLevel: 4, description: '[飞行] [战略] 攻击时同时也攻击目标相邻的单位。', flavor: '优雅的毁灭者。' }, 2);
    addCard({ name: '“撒旦”导弹井', cost: 6, type: CardType.UNIT, rarity: Rarity.RARE, attack: 0, defense: 8, isSupport: true, hasTaunt: true, defconImpact: -1, reqTechLevel: 3, description: '[支援] [战略] [回合结束]: 对随机敌方造成 3 点伤害。', flavor: '不可阻挡。' }, 2);
    addCard({ name: '基洛夫飞艇', cost: 8, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 7, defense: 12, isFlying: true, reqTechLevel: 3, description: '[飞行] [回合结束]: 对敌方指挥部造成 3 点伤害。', flavor: 'Kirov Reporting.' }, 1);

    // T0 - Ultimate
    // UPDATED: Doomsday Train -> Nuclear Truck
    addCard({ name: '核能自爆卡车', cost: 10, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 0, defense: 20, isSupport: true, hasTaunt: true, defconImpact: -1, reqTechLevel: 5, description: '[支援] [战略] [嘲讽] 无法攻击。[亡语]: 对所有敌方角色造成 15 点伤害。', flavor: '特别快递。' }, 1);

    // Events
    addCard({ name: '铁幕装置', cost: 1, type: CardType.EVENT, rarity: Rarity.COMMON, description: '[事件]: 使一个友方单位获得 [免疫] 直到下个回合。', flavor: '无法穿透。' }, 2);
    addCard({ name: '乌拉冲锋', cost: 3, type: CardType.EVENT, rarity: Rarity.RARE, description: '[事件]: 召唤 3 个 1/1 动员兵，并赋予 [闪击]。', flavor: '人山人海。' }, 2);
  }

  if (faction === FactionId.PACIFIC) {
    // Basic Units
    addCard({ name: '哨戒炮', cost: 1, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 1, defense: 3, isSupport: true, hasTaunt: true, description: '[支援] [嘲讽] [部署]: 获得 [护盾]。', flavor: '侦测到敌意。' }, 3);
    addCard({ name: '黑客', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 1, defense: 3, isSupport: true, description: '[支援] [部署]: 使敌方下一张牌费用 +1。', flavor: '你的系统是我的了。' }, 2);
    
    // NEW T2/T1 Units (Balance Update)
    addCard({ name: '迅雷运输艇', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 1, defense: 4, hasTaunt: true, hasShield: true, description: '[嘲讽] [护盾]。', flavor: '伪装完成。' }, 2);
    addCard({ name: '帝国忍者', cost: 2, type: CardType.UNIT, rarity: Rarity.RARE, attack: 3, defense: 2, description: '[隐形] 只能被 [飞行] 单位攻击。[闪击]。', flavor: '暗影中的利刃。' }, 2);
    addCard({ name: '守护者坦克', cost: 3, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 3, defense: 4, hasShield: true, description: '[护盾] 部署时获得护盾。', flavor: '坚守阵地。' }, 2);
    addCard({ name: '弓箭少女', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 3, defense: 4, isSupport: true, reqTechLevel: 2, description: '[支援] [部署]: 对所有 [飞行] 单位造成 2 点伤害。', flavor: '天空不再安全。' }, 2);
    addCard({ name: '海啸坦克', cost: 4, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 4, defense: 4, hasBlitz: true, reqTechLevel: 2, description: '[闪击] 消灭单位后，恢复所有生命值。', flavor: '像水一样流动。' }, 2);
    addCard({ name: '火箭天使', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 3, defense: 4, isFlying: true, reqTechLevel: 2, description: '[飞行] 攻击时使目标 [冻结]。', flavor: '天使降临。' }, 2);
    addCard({ name: '波能坦克', cost: 5, type: CardType.UNIT, rarity: Rarity.RARE, attack: 6, defense: 3, isSupport: true, reqTechLevel: 3, description: '[支援] 玻璃大炮。', flavor: '充能完毕。' }, 2);
    addCard({ name: '百合子克隆体', cost: 5, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 4, defense: 5, isSupport: true, reqTechLevel: 3, description: '[支援] [部署]: 使一个敌方单位本回合攻击力变为 0。', flavor: '这是意念的力量。' }, 1);

    // T1 - Tactical
    addCard({ name: '干扰无人机', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 1, defense: 3, isFlying: true, description: '[飞行] [亡语]: 沉默消灭此单位的敌方单位。', flavor: '嗡嗡声是最后的警告。' }, 2);
    addCard({ name: '电磁线圈兵', cost: 3, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 3, defense: 3, isSupport: true, reqTechLevel: 2, description: '[支援] 攻击时使目标 [冻结]。', flavor: '高压危险。' }, 2);

    // T2 - Strategic & Heavy Hitters
    // UPDATED: Poseidon Cost 6
    addCard({ name: '波塞冬核鱼雷', cost: 6, type: CardType.UNIT, rarity: Rarity.RARE, attack: 5, defense: 5, isSupport: true, defconImpact: -1, reqTechLevel: 4, description: '[支援] [战略] [隐形] [亡语]: 对所有非飞行单位造成 3 点伤害。', flavor: '深海海啸。' }, 2);
    
    addCard({ name: '鬼王机甲', cost: 6, type: CardType.UNIT, rarity: Rarity.RARE, attack: 5, defense: 6, hasBlitz: true, reqTechLevel: 3, description: '[闪击] 消灭敌方单位后：恢复所有生命值。', flavor: '像苍蝇一样。' }, 2);
    addCard({ name: '纳米虫群母舰', cost: 7, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 4, defense: 12, isSupport: true, hasShield: true, defconImpact: -1, reqTechLevel: 4, description: '[支援] [护盾] [战略] [回合结束]: 召唤 3 个 1/1 纳米虫。', flavor: '吞噬，复制，进化。' }, 2);
    addCard({ name: '将军战列舰', cost: 8, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 5, defense: 12, isSupport: true, reqTechLevel: 3, description: '[支援] [回合结束]: 对随机 3 个敌方单位造成 3 点伤害。', flavor: '海平面的主宰。' }, 1);
    
    // T0 - Ultimate
    // UPDATED: Space Ion Cannon
    addCard({ name: '天基离子炮', cost: 10, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 0, defense: 20, isSupport: true, hasShield: true, defconImpact: -2, reqTechLevel: 5, description: '[支援] [战略] [护盾] [回合开始]: 将一张【真空内爆弹】置入你的手牌。', flavor: '达摩克利斯之剑。' }, 1);

    // Events
    addCard({ name: '纳米护盾', cost: 1, type: CardType.EVENT, rarity: Rarity.COMMON, description: '[事件]: 使一个单位获得 [护盾]。', flavor: '防御强化。' }, 2);
    addCard({ name: '电磁脉冲', cost: 3, type: CardType.EVENT, rarity: Rarity.RARE, description: '[事件]: 沉默所有敌方单位，并抽一张牌。', flavor: '系统离线。' }, 2);
    addCard({ name: '纳米虫群', cost: 4, type: CardType.EVENT, rarity: Rarity.RARE, reqTechLevel: 4, description: '[事件] 对所有敌方单位造成 1 点伤害。本回合每死一个单位，DEFCON -1。', flavor: '吞噬一切。' }, 1);
    
    // UPDATED: Vacuum Implosion
    addCard({ name: '真空内爆弹', cost: 5, type: CardType.EVENT, rarity: Rarity.RARE, reqTechLevel: 4, description: '[事件] 对一个敌方单位造成 8 点伤害。', flavor: '空气被瞬间抽离。' }, 1);
  }

  if (faction === FactionId.ZERG) {
      // Basic Units
      addCard({ name: '异虫幼体', cost: 1, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 2, defense: 1, hasBlitz: true, description: '[闪击] [再生]。', flavor: '千万别被咬到。', isRegen: true }, 4);
      addCard({ name: '工蜂', cost: 1, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 1, defense: 2, isSupport: true, description: '[支援] [部署]: 获得 1 AP。', flavor: '采集更多晶体矿。' }, 3);
      
      // Core Units
      addCard({ name: '蟑螂', cost: 2, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 2, defense: 4, description: '[再生] 高速回复生命。', isRegen: true, flavor: '难以杀死。' }, 2);
      addCard({ name: '刺蛇', cost: 3, type: CardType.UNIT, rarity: Rarity.COMMON, attack: 4, defense: 2, isSupport: true, description: '[支援] 远程骨针打击。', flavor: '死亡之雨。' }, 3);
      addCard({ name: '爆虫', cost: 2, type: CardType.UNIT, rarity: Rarity.RARE, attack: 0, defense: 2, hasBlitz: true, description: '[闪击] [亡语]: 对所有敌方单位造成 2 点伤害。', flavor: '为了虫群！' }, 2);
      
      // Advanced Units
      addCard({ name: '飞龙', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 3, defense: 3, isFlying: true, description: '[飞行] [风怒]。', flavor: '刃虫弹射。' }, 2);
      addCard({ name: '感染者', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 1, defense: 5, isSupport: true, reqTechLevel: 3, description: '[支援] [部署]: 控制一个攻击力小于 3 的敌方单位。', flavor: '服从主宰。' }, 2);
      addCard({ name: '潜伏者', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 4, defense: 4, reqTechLevel: 3, description: '[隐形] 只能被 [飞行] 单位攻击。[攻击后]: 对相邻单位造成 2 点伤害。', flavor: '地刺突袭。' }, 2);
      addCard({ name: '雷兽', cost: 6, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 6, defense: 8, hasTaunt: true, reqTechLevel: 4, description: '[嘲讽] [再生] 攻击同时伤害相邻单位。', isRegen: true, flavor: '活体攻城锤。' }, 2);
      
      // Air Support
      addCard({ name: '腐化者', cost: 4, type: CardType.UNIT, rarity: Rarity.RARE, attack: 3, defense: 5, isFlying: true, reqTechLevel: 3, description: '[飞行] 对 [飞行] 单位造成双倍伤害。', flavor: '天空的腐化。' }, 2);
      addCard({ name: '飞蛇', cost: 3, type: CardType.UNIT, rarity: Rarity.RARE, attack: 1, defense: 4, isFlying: true, isSupport: true, description: '[飞行] [支援] [部署]: 将一个敌方单位拉入前排（使其获得[嘲讽]且失去[隐形]）。', flavor: '别想逃。' }, 2);

      // Strategic Units (4)
      addCard({ name: '利维坦', cost: 8, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 6, defense: 12, isFlying: true, defconImpact: -1, reqTechLevel: 4, description: '[飞行] [战略] [再生] [回合结束]: 召唤 2 个 2/1 飞龙。', isRegen: true, flavor: '遮天蔽日。' }, 2);
      addCard({ name: '坑道虫', cost: 6, type: CardType.UNIT, rarity: Rarity.RARE, attack: 0, defense: 8, isSupport: true, defconImpact: -1, reqTechLevel: 4, description: '[支援] [战略] [部署]: 从牌库召唤 2 个随机异虫单位。', flavor: '虫群无处不在。' }, 2);
      
      // UPDATED: Queen of Blades
      addCard({ name: '虫后凯瑞甘', cost: 10, type: CardType.UNIT, rarity: Rarity.LEGENDARY, attack: 10, defense: 30, defconImpact: -2, reqTechLevel: 5, description: '[战略] [回合结束]: 召唤 1 个坑道虫，坑道虫召唤单位后退场。', flavor: '我是刀锋女王。' }, 1);
      
      addCard({ name: '莽兽', cost: 7, type: CardType.UNIT, rarity: Rarity.RARE, attack: 8, defense: 10, hasTaunt: true, defconImpact: -1, reqTechLevel: 3, description: '[嘲讽] [战略] [亡语]: 对敌方指挥部造成 5 点伤害。', flavor: '为了毁灭而生。' }, 2);

      // Events
      addCard({ name: '分裂池', cost: 2, type: CardType.EVENT, rarity: Rarity.COMMON, description: '[事件]: 所有友方单位获得 +1/+1 和 [再生]。', flavor: '基因进化。' }, 2);
      addCard({ name: '真菌增生', cost: 3, type: CardType.EVENT, rarity: Rarity.RARE, description: '[事件]: 对所有敌方单位造成 2 点伤害并 [冻结] 它们。', flavor: '定身孢子。' }, 2);
      addCard({ name: '黑暗蜂群', cost: 4, type: CardType.EVENT, rarity: Rarity.RARE, description: '[事件]: 本回合友方单位免疫远程伤害（支援/飞行攻击）。', flavor: '掩护冲锋。' }, 1);
  }
};

const createDeck = (faction: FactionId): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;

  const addCard = (template: Omit<Card, 'id' | 'faction' | 'currentHealth'>, count: number) => {
    for (let i = 0; i < count; i++) {
      deck.push({
        ...template,
        id: `${faction}_${template.type}_${idCounter++}`,
        faction,
        currentHealth: template.defense,
        canAttack: false,
        isExhausted: true,
        zone: 'backrow'
      });
    }
  };

  populateCards(faction, addCard);
  return deck.sort(() => Math.random() - 0.5);
};

export const getCompendiumCards = (faction: FactionId): Card[] => {
    const list: Card[] = [];
    const addCard = (template: Omit<Card, 'id' | 'faction' | 'currentHealth'>, count: number) => {
        // Only add one instance per card type for compendium
        list.push({
            ...template,
            id: `compendium_${faction}_${template.name}`,
            faction,
            currentHealth: template.defense,
            canAttack: false,
            isExhausted: false,
            zone: 'backrow'
        });
    };
    populateCards(faction, addCard);
    return list;
}

export const INIT_DECKS = {
  [FactionId.NATO]: createDeck(FactionId.NATO),
  [FactionId.WARSAW]: createDeck(FactionId.WARSAW),
  [FactionId.PACIFIC]: createDeck(FactionId.PACIFIC),
  [FactionId.ZERG]: createDeck(FactionId.ZERG),
};
