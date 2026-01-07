
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, GameState, PlayerState, TechDefinition, MAX_HAND_SIZE } from '../../types';
import { FACTION_TECHS } from '../../constants';
import { getBranchIcon, TechPanel, TechTreeOverlay } from '../TechPanel';
import { CardComponent } from '../CardComponent';
import { HQComponent } from '../HQComponent';
import { DefconDisplay } from '../DefconDisplay';
import { Volume2, VolumeX, FileText, LogOut, Radio } from 'lucide-react';
import { getCardCost } from '../../logic/gameRules';
import { DragArrow } from './DragArrow';
import { CAMPAIGN_LEVELS } from '../../logic/campaignData';
import { TutorialHighlighter } from './TutorialHighlighter';

interface GameInterfaceProps {
    gameState: GameState;
    isAudioEnabled: boolean;
    toggleAudio: () => void;
    isScreenShaking: boolean;
    logsEndRef: React.RefObject<HTMLDivElement>;
    
    // Actions
    playCard: (playerIndex: number, cardIndex: number, targetId?: string) => void;
    endTurn: () => void;
    upgradeTech: (choiceId?: string) => void;
    onExit: () => void; // New prop
    
    // Interaction State
    dragSourceId: string | null;
    dragStartPos: { x: number, y: number } | null;
    mousePos: { x: number, y: number } | null;
    hoverTargetId: string | null;
    handleMouseDown: (e: React.MouseEvent, card: Card, type: 'hand' | 'board') => void; 
    
    // Animation State
    attackingCardId: string | null;
    damagedCardId: string | null;
}

const MissionBriefing: React.FC<{ levelId: string, onClose: () => void }> = ({ levelId, onClose }) => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === levelId);
    if (!level) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 font-mono animate-in zoom-in-95 duration-300">
             <div className="max-w-2xl w-full bg-[#0a0a0a] border-2 border-yellow-600/50 p-8 shadow-[0_0_50px_rgba(234,179,8,0.1)] relative">
                 <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-600"></div>
                 <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-yellow-600"></div>
                 <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-yellow-600"></div>
                 <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-600"></div>

                 <div className="text-center mb-8">
                     <div className="text-yellow-600 font-bold tracking-[0.5em] text-xs uppercase mb-2">绝密 // 仅供阅览</div>
                     <h2 className="text-3xl font-black text-white uppercase">{level.title}</h2>
                 </div>

                 <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-8 font-medium">
                     {level.briefing}
                 </div>

                 <button onClick={onClose} className="w-full py-4 bg-yellow-700 hover:bg-yellow-600 text-black font-black tracking-widest uppercase transition-colors">
                     确认指令并部署
                 </button>
             </div>
        </div>
    );
};

export const GameInterface: React.FC<GameInterfaceProps> = ({
    gameState, isAudioEnabled, toggleAudio, isScreenShaking, logsEndRef,
    playCard, endTurn, upgradeTech, onExit,
    dragSourceId, dragStartPos, mousePos, hoverTargetId, handleMouseDown,
    attackingCardId, damagedCardId
}) => {
    const [hoveredHandIndex, setHoveredHandIndex] = useState<number | null>(null);
    const [showEnemyTech, setShowEnemyTech] = useState(false);
    const [showBriefing, setShowBriefing] = useState(!!gameState.isCampaign);
    
    // Derived Tutorial State
    const tutorialTargetId = gameState.tutorialTargetId;
    const tutorialDestId = gameState.tutorialDestId;
    const tutorialMessage = gameState.tutorialMessage;

    const player = gameState.players.find(p => p.id === 'player')!;
    const enemy = gameState.players.find(p => p.id === 'enemy')!;
    
    const scenario = gameState.campaignLevelId ? CAMPAIGN_LEVELS.find(l => l.id === gameState.campaignLevelId) : null;
    const isTechDisabled = scenario?.disableTech || false;

    const enemyBackrow = enemy.board.filter(c => c.zone === 'backrow');
    const enemyFrontline = enemy.board.filter(c => c.zone === 'frontline');
    const playerFrontline = player.board.filter(c => c.zone === 'frontline');
    const playerBackrow = player.board.filter(c => c.zone === 'backrow');
    
    const combatZoneCount = enemyFrontline.length + playerFrontline.length;

    let enemyDoctrine = null;
    const lastEnemyTech = enemy.activeTechs.length > 0 ? enemy.activeTechs[enemy.activeTechs.length-1] : null;
    if(lastEnemyTech) {
        Object.values(FACTION_TECHS[enemy.faction]).forEach((l: TechDefinition[]) => {
            const t = l.find(x => x.id === lastEnemyTech);
            if(t) enemyDoctrine = t;
        });
    }

    return (
        <div id="app-container" className={`relative h-screen w-screen bg-[#080808] overflow-hidden flex flex-col font-mono select-none text-gray-300 ${isScreenShaking ? 'screen-shake-active' : ''}`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]"></div>
          
          <DragArrow dragSourceId={dragSourceId} dragStartPos={dragStartPos} mousePos={mousePos} hoverTargetId={hoverTargetId} />
          
          {/* TUTORIAL HIGHLIGHTER */}
          <TutorialHighlighter targetId={tutorialTargetId} destId={tutorialDestId} message={tutorialMessage} />

          {showEnemyTech && createPortal(<TechTreeOverlay faction={enemy.faction} techLevel={enemy.techLevel} activeTechs={enemy.activeTechs} ap={enemy.ap} onClose={() => setShowEnemyTech(false)} isEnemyView={true} />, document.body)}

          {showBriefing && gameState.campaignLevelId && createPortal(<MissionBriefing levelId={gameState.campaignLevelId} onClose={() => setShowBriefing(false)} />, document.body)}

          {/* TOP BAR */}
          <div className="h-16 w-full bg-black/60 border-b border-gray-800 flex items-center justify-between px-6 z-40 backdrop-blur-md relative">
              <div className="flex items-center gap-4">
                   <h1 className="font-black text-xl text-gray-200 tracking-tighter" style={{ fontFamily: 'Black Ops One' }}>代号：零点</h1>
                   <div className="h-4 w-[1px] bg-gray-700"></div>
                   <div className="text-sm text-green-500 font-black tracking-widest animate-pulse">回合 {gameState.turn}</div>
                   
                   {/* Abort Button */}
                   <button 
                       onClick={onExit}
                       className="ml-4 flex items-center gap-2 px-3 py-1 border border-red-900/50 bg-red-950/20 text-red-500 hover:bg-red-900/50 hover:text-red-400 text-xs font-bold tracking-widest uppercase transition-all rounded"
                   >
                       <LogOut size={12} /> 撤退
                   </button>
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 top-1"><DefconDisplay level={gameState.defcon} /></div>
              <button onClick={toggleAudio} className="text-gray-500 hover:text-green-500 transition-colors">{isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
          </div>

          <div className="flex-1 flex flex-row overflow-hidden relative">
              
              {/* LEFT PANEL (PLAYER STATUS) */}
              <div className="w-64 bg-black/40 border-r border-gray-800 flex flex-col relative z-20 backdrop-blur-sm">
                   <div className="p-3 border-b border-gray-800 flex flex-col items-center bg-gray-900/30">
                       <HQComponent faction={player.faction} hp={player.hp} maxHp={player.maxHp} isEnemy={false} isDamaged={damagedCardId === 'player_hq'} />
                       <div className="mt-2 w-full px-2"><div className="flex justify-between text-xs text-gray-400 font-bold mb-1"><span>AP: {player.ap}/{player.maxAp}</span></div><div className="flex flex-wrap gap-1">{[...Array(player.maxAp)].map((_, i) => (<div key={i} className={`w-3 h-2 rounded-sm ${i < player.ap ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'bg-gray-800'}`}></div>))}</div></div>
                   </div>
                   <div className="flex-1 overflow-hidden relative">
                       <TechPanel 
                           player={player} 
                           onUpgrade={upgradeTech} 
                           canUpgrade={gameState.currentPlayerId === 'player' && player.ap >= (FACTION_TECHS[player.faction][player.techLevel+1]?.[0]?.cost || 99) && !isTechDisabled} 
                           nextCost={FACTION_TECHS[player.faction][player.techLevel+1]?.[0]?.cost || null}
                           disableTech={isTechDisabled}
                       />
                   </div>
                   <div className="p-3 border-t border-gray-800">
                       <button 
                           id="end-turn-btn"
                           onClick={endTurn} 
                           disabled={gameState.currentPlayerId !== 'player'} 
                           className={`w-full py-3 border-2 flex flex-col items-center justify-center transition-all duration-200 clip-path-polygon ${gameState.currentPlayerId === 'player' ? 'border-green-600 bg-green-900/20 text-green-400 hover:bg-green-900/40 hover:scale-[1.02] shadow-[0_0_15px_rgba(22,163,74,0.2)]' : 'border-red-900/30 bg-gray-900/50 text-gray-600 cursor-not-allowed'}`}
                        >
                           <span className="text-lg font-black tracking-widest">{gameState.currentPlayerId === 'player' ? '结束回合' : '等待'}</span>
                       </button>
                   </div>
              </div>

              {/* CENTER BOARD */}
              <div className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0c0c0c] to-[#050505]" data-type="play-area">
                  
                  {/* ENEMY REAR */}
                  <div className="flex-1 flex flex-col items-center justify-center border-b border-gray-800/30 relative">
                        <div className="absolute top-2 left-4 text-[10px] text-red-900 font-bold tracking-widest uppercase">敌方后排</div>
                        <div className="flex justify-center gap-4 px-8 w-full min-h-[140px]">
                            {enemyBackrow.map(card => (<CardComponent key={card.id} card={card} isPlayed disabled isDamaged={damagedCardId === card.id} isAttacking={attackingCardId === card.id} isTargetable={dragSourceId !== null} isEnemy={true} showKeywords={true} />))}
                        </div>
                  </div>

                  {/* COMBAT ZONE (Two Layers) */}
                  <div id="combat_zone_drop" className={`
                        flex-1 flex flex-col items-center justify-center relative border-y-2 border-dashed transition-colors duration-300
                        ${hoverTargetId === 'combat_zone_drop' || hoverTargetId === 'play_drop_zone' ? 'border-yellow-500 bg-yellow-900/10' : 'border-gray-800 bg-gray-900/10'}
                  `} data-type="combat-zone">
                       <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-[10px] font-bold tracking-widest text-gray-500 rotate-180" style={{ writingMode: 'vertical-rl' }}>
                           交战区 ({combatZoneCount}/8)
                       </div>
                       
                       {/* Layer 1: Enemy Frontline */}
                       <div className="flex-1 w-full flex items-center justify-center border-b border-gray-800/50 relative z-10">
                            {enemyFrontline.map(card => (<div key={card.id} className="relative mx-2"><CardComponent card={card} isPlayed disabled isDamaged={damagedCardId === card.id} isAttacking={attackingCardId === card.id} isTargetable={dragSourceId !== null} isEnemy={true} showKeywords={true} /><div className="absolute -bottom-3 w-full text-center text-[8px] bg-red-900/80 text-white font-bold">前线</div></div>))}
                       </div>
                       
                       {/* Layer 2: Player Frontline */}
                       <div className="flex-1 w-full flex items-center justify-center relative z-10">
                            {playerFrontline.map(card => (<div key={card.id} className="relative mx-2"><CardComponent card={card} isPlayed isAttacking={attackingCardId === card.id} isDamaged={damagedCardId === card.id} canAttack={card.canAttack && !card.isExhausted && gameState.currentPlayerId === 'player'} isSelected={dragSourceId === card.id} onMouseDown={(e) => handleMouseDown(e, card, 'board')} isEnemy={false} showKeywords={true} /><div className="absolute -bottom-3 w-full text-center text-[8px] bg-green-900/80 text-white font-bold">前线</div></div>))}
                       </div>
                  </div>

                  {/* PLAYER REAR */}
                  <div className="flex-1 flex flex-col items-center justify-center relative border-t border-gray-800/30">
                       <div className="absolute bottom-2 right-4 text-[10px] text-green-900 font-bold tracking-widest uppercase">我方后排</div>
                       <div className="flex justify-center gap-4 px-8 w-full min-h-[140px]">
                           {playerBackrow.map(card => (<CardComponent key={card.id} card={card} isPlayed isAttacking={attackingCardId === card.id} isDamaged={damagedCardId === card.id} canAttack={card.canAttack && !card.isExhausted && gameState.currentPlayerId === 'player'} isSelected={dragSourceId === card.id} onMouseDown={(e) => handleMouseDown(e, card, 'board')} isEnemy={false} showKeywords={true} />))}
                       </div>
                  </div>
                  
                  {/* HAND */}
                  <div className="h-40 relative z-30 flex justify-center items-end pb-2 overflow-visible">
                        <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"></div>
                        <div className="flex flex-row -space-x-12 items-end justify-center px-12 pb-4">
                            {player.hand.map((card, i) => { 
                                const currentCost = getCardCost(card, player, enemy, gameState.gameMode); 
                                return (
                                    <div 
                                        key={card.id} 
                                        id={`card-hand-${i}`} // ID for Tutorial Targeting
                                        onMouseEnter={() => setHoveredHandIndex(i)} 
                                        onMouseLeave={() => setHoveredHandIndex(null)} 
                                        className="transition-all duration-300 ease-out origin-bottom relative cursor-grab active:cursor-grabbing group hover:scale-125 hover:bottom-12 hover:rotate-0" 
                                        style={{ zIndex: hoveredHandIndex === i ? 100 : i }}
                                    >
                                        <CardComponent 
                                            card={card} 
                                            displayCost={currentCost} 
                                            onClick={() => playCard(0, i)} 
                                            onMouseDown={(e) => handleMouseDown(e, card, 'hand')}
                                            disabled={currentCost > (gameState.gameMode === 'BLOOD_MONEY' ? player.hp : player.ap) || gameState.currentPlayerId !== 'player'} 
                                            currentTechLevel={player.techLevel} 
                                            showKeywords={true} 
                                        />
                                    </div>
                                ); 
                            })}
                        </div>
                        <div className="absolute bottom-1 right-2 text-[10px] font-bold text-gray-400 bg-black/80 px-2 py-1 rounded">手牌: {player.hand.length}/{MAX_HAND_SIZE}</div>
                  </div>
              </div>

              {/* RIGHT PANEL (ENEMY STATUS & LOGS) */}
              <div className="w-64 bg-black/40 border-l border-gray-800 flex flex-col z-20 backdrop-blur-sm">
                   <div className="p-4 border-b border-gray-800 flex flex-col items-center bg-red-950/10">
                       <div className="mb-2 text-[10px] font-bold text-red-600 tracking-widest">敌对目标</div>
                       <HQComponent faction={enemy.faction} hp={enemy.hp} maxHp={enemy.maxHp} isEnemy={true} isDamaged={damagedCardId === 'enemy_hq'} canTarget={dragSourceId !== null} />
                        <div className="mt-2 w-full flex flex-col gap-1"><div className="flex justify-center gap-0.5">{[...Array(enemy.maxAp)].map((_, i) => (<div key={i} className={`w-2 h-1.5 ${i < enemy.ap ? 'bg-red-600' : 'bg-gray-800'}`}></div>))}</div><div className="text-center text-[9px] text-red-800 font-mono">科技等级 {enemy.techLevel}</div>{enemyDoctrine && (<div onClick={() => setShowEnemyTech(true)} className="mt-2 flex items-center gap-2 bg-red-900/20 px-3 py-1 rounded border border-red-900/30 animate-pulse cursor-pointer hover:bg-red-900/40 transition-colors"><div className="text-red-500">{getBranchIcon(enemyDoctrine.branch)}</div><div className="flex flex-col"><span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">战术信条</span><span className="text-xs text-red-300 font-black truncate max-w-[100px]">{enemyDoctrine.branch}</span></div></div>)}</div>
                   </div>
                   <div className="p-2 bg-gray-900 border-b border-gray-800 flex items-center gap-2"><FileText size={12} className="text-gray-500"/><span className="text-[10px] font-bold text-gray-400 tracking-widest">情报日志</span></div>
                   <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono font-medium bg-black/20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                       {gameState.logs.map((log, i) => (<div key={i} className="border-l-2 border-green-900 pl-2 py-1 text-green-400/80 leading-tight"><span className="opacity-40 mr-1 select-none">[{i+1}]</span>{log}</div>))}
                       <div ref={logsEndRef} />
                   </div>
              </div>
          </div>
          
          <div className="fixed bottom-1 right-2 text-[10px] text-gray-700 font-bold z-50 pointer-events-none opacity-50">By 邢证道</div>
        </div>
    );
};
