

export enum FactionId {
  NATO = 'NATO', // 北大西洋联合体 (Focus: Air, Intel)
  WARSAW = 'WARSAW', // 红色联盟 (Focus: Armor, Numbers)
  PACIFIC = 'PACIFIC', // 泛亚防卫阵线 (Focus: Tech, Defense)
  ZERG = 'ZERG', // 异虫群落 (Focus: Evolution, Swarm, Regen)
}

export type GameMode = 'STANDARD' | 'DEFCON_1' | 'CHAOS' | 'BLOOD_MONEY';

export enum CardType {
  UNIT = 'UNIT', // Deployment
  EVENT = 'EVENT', // Instant effect
  COUNTER = 'COUNTER', // Anti-DEFCON or Trap
}

export enum Rarity {
  COMMON = '机密',
  RARE = '绝密',
  LEGENDARY = '最高机密',
}

export type Zone = 'backrow' | 'frontline';

export interface Card {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  faction: FactionId;
  rarity: Rarity;
  description: string;
  attack?: number; // For Units
  defense?: number; // For Units, acts as Max HP
  currentHealth?: number; // Tracks current HP on board
  defconImpact?: number; // Negative lowers global DEFCON
  reqTechLevel?: number; // New: Minimum Tech Level required to play
  flavor?: string;
  isCustom?: boolean; // User created card
  
  // State for board units
  zone?: Zone; // New: Current position on board
  canAttack?: boolean; // Can take an action (Move or Attack)
  isExhausted?: boolean; // True if acted this turn
  
  // Special Logic Props
  timer?: number; // For Peacekeeper countdown
  isTransient?: boolean; // For units that should disappear at start of next turn (Nydus)
  
  // Traits
  hasRush?: boolean; // Can attack units immediately (Legacy/Blitz overlap, treated as subset of Blitz behavior in text)
  hasBlitz?: boolean; // New: 闪击 (Can move/act turn played)
  isFlying?: boolean; // New: 飞行 (Can attack from back, bypasses frontline block)
  isSupport?: boolean; // New: 支援 (Can attack from back)
  
  hasTaunt?: boolean; // Must be attacked first
  hasShield?: boolean; // PACIFIC: Divne shield (blocks one instance of damage)
  
  isRegen?: boolean; // New: Regen (Restores HP at turn end)
  isPoisonous?: boolean; // New: Poison (Kills units on damage)

  hasAnimated?: boolean; // Track if initial entrance animation has played (mostly controlled by component mounting, but useful for logic)
}

// New Tech Types
export interface TechDefinition {
  id: string;
  name: string;
  branch: string; // The name of the branch/doctrine
  description: string;
  cost: number; // AP Cost to upgrade TO this level
  reqId?: string; // ID of the required previous tech (null for L1 or L2 choices)
}

export interface PlayerState {
  id: string;
  faction: FactionId;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  deck: Card[];
  hand: Card[];
  board: Card[];
  graveyard: Card[];
  
  // Tech State
  techLevel: number; // 0 to 6
  activeTechs: string[]; // List of Tech IDs acquired
  
  // Turn State
  unitsDeployedThisTurn: number; // Tracks how many units deployed in current turn (for conditional costs)
  eventsPlayedThisTurn: number; // Track events for NATO synergy
}

export interface ScenarioDef {
    id: string;
    title: string;
    description: string;
    briefing: string; // Detailed text shown before start
    playerFaction: FactionId;
    enemyFaction: FactionId;
    
    // Setup Overrides
    startingTechLevel?: number;
    enemyStartingTechLevel?: number;
    fixedPlayerDeck?: string[]; // List of Card Names
    fixedEnemyDeck?: string[]; // List of Card Names
    startingBoard?: { cardName: string, zone: Zone, owner: 'player'|'enemy', currentHealth?: number, customId?: string }[];
    
    // Rules
    isPuzzle?: boolean; // If true, no card draw at end of turn
    disableTech?: boolean; // If true, tech upgrades are disabled
    playerStartingAp?: number; // Override starting AP
    enemyStartingHp?: number; // Override enemy max HP
    
    // Campaign Scripting
    scriptId?: string;
    winConditionText?: string; // Text to display for objective
}

export interface CampaignState {
    levelId: string;
    stage: number; // Used for tracking tutorial steps or phases
    turnCount: number; // Track turns within the level
    flags: Record<string, boolean | number>; // Generic flags for triggers (changed to allow numbers)
    isVictory?: boolean; // Override win state
    isScriptedAI?: boolean; // If true, standard AI Logic is disabled
    scriptTick?: number; // Used for timing actions within a turn during scripted AI
    scriptedAttackId?: string; // ID of the unit currently attacking in a scripted sequence (for visuals)
}

export interface GameState {
  turn: number;
  currentPlayerId: string;
  defcon: number;
  gameMode: GameMode; // New
  players: PlayerState[];
  gameOver: boolean;
  winnerId: string | null;
  logs: string[];
  
  // Campaign State
  isCampaign?: boolean;
  campaignLevelId?: string;
  isPuzzle?: boolean; // Derived from scenario
  
  campaignState?: CampaignState;
  
  // Tutorial / Guidance System
  tutorialTargetId?: string; // The ID of the UI element to highlight (Source)
  tutorialDestId?: string; // The ID of the UI element to drag TO (Destination for ghost animation)
  tutorialMessage?: string; // The instruction to display
  highlightRect?: { x: number, y: number, w: number, h: number }; // Optional override
}

export const MAX_HAND_SIZE = 7;
export const INITIAL_DEFCON = 5;
export const MAX_AP = 15;
export const STARTING_AP = 3;