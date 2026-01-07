
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Card, CardType, FactionId } from '../types';
import { getCardKeywords, KEYWORDS } from '../constants';
import { Shield, Swords, Zap, Target, Crosshair, AlertTriangle, Hexagon, Plane, Rocket, Zap as Lightning, Lock, Dna, Skull, FileWarning, Radiation } from 'lucide-react';

interface CardProps {
  card: Card;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  isPlayed?: boolean; 
  isAttacking?: boolean;
  isDamaged?: boolean;
  isSelected?: boolean; 
  canAttack?: boolean;
  isTargetable?: boolean; 
  isEnemy?: boolean; 
  displayCost?: number; 
  isCompendium?: boolean;
  showKeywords?: boolean;
  currentTechLevel?: number;
}

export const CardComponent: React.FC<CardProps> = ({ 
    card, onClick, onMouseDown, disabled, isPlayed, isAttacking, isDamaged, isSelected, canAttack, isTargetable, isEnemy, displayCost, isCompendium, showKeywords, currentTechLevel 
}) => {
  
  const [entranceAnim, setEntranceAnim] = useState('');
  const [isOrbital, setIsOrbital] = useState(false);

  // Initialize animation state on layout effect to ensure class is applied before paint
  useLayoutEffect(() => {
    // Skip if not played (in hand) or if it's a static compendium view
    if (!isPlayed || (isCompendium && !card.isCustom)) return;
    
    const name = card.name;
    let animClass = '';
    let shakeTimer: ReturnType<typeof setTimeout> | null = null;
    
    // --- ANIMATION CATEGORIES ---

    const flyingUnits = [
        'B-2 幽灵', '图-160 白天鹅', 'B-1 枪骑兵', // Strategic Bombers
        'F-22 猛禽', 'F-16 战隼', '米格-31 猎狐犬', // Fighters
        'MQ-9 死神无人机', '干扰无人机', 'U-2 侦察机', // Drones/Recon
        '支奴干运输机', 'AH-64 阿帕奇', '双刃直升机', // Rotors
        '基洛夫飞艇', '火箭天使', // Special Air
        '利维坦', '飞龙', '腐化者', '飞蛇' // Zerg Flyers
    ];

    const emergeUnits = [
        '俄亥俄级核潜艇', '台风级弹道潜艇', '波塞冬核鱼雷', // Subs
        '纳米虫群母舰', // Nanites swarming out
        '海豹突击队', '帝国忍者', 'KGB 特工', // Stealth Infantry
        '辐射工兵', // Hazard/Underground
        '迅雷运输艇', // Amphibious
        '潜伏者', '坑道虫', '感染者' // Zerg Burrow
    ];

    const orbitalUnits = [
        '天基离子炮', '天基动能站', // Space Weapons
        '百合子克隆体' // Psionic / Levitation
    ];

    const heavyUnits = [
        // Super Heavy / Strategic
        '末日列车', '和平卫士洲际导弹', '“撒旦”导弹井', '将军战列舰', 
        // MBTs & Armor
        '天启坦克', '天启原型机', 'M1A2 艾布拉姆斯', 'T-90 主战坦克', '守护者坦克', '波能坦克', '海啸坦克', '鬼王机甲', '地狱火机甲',
        // Support Vehicles
        '爱国者导弹连', 'V3 火箭发射车', '战斧巡航导弹连', 'ZSU 防空履带车', '宣传车',
        // Static Defense
        '哨戒炮',
        // Zerg Heavy
        '雷兽', '莽兽', '虫后凯瑞甘'
    ];

    // Check tech level for special animations
    // Custom cards in exhibition should always animate
    const isHighTech = (card.reqTechLevel || 1) >= 3 || card.isCustom;

    // 1. FLYING UNITS (Always Animate)
    if (flyingUnits.some(n => name.includes(n))) {
        animClass = isEnemy ? 'entrance-fly-enemy' : 'entrance-fly-player';
    }
    
    // 2. EMERGE (Submarines, Stealth, Nanotech) - Only High Tech
    else if (isHighTech && emergeUnits.some(n => name.includes(n))) {
        animClass = 'entrance-emerge';
    }
    
    // 3. ORBITAL / HIGH TECH / PSIONIC - Only High Tech
    else if (isHighTech && orbitalUnits.some(n => name.includes(n))) {
        animClass = 'entrance-orbital';
        setIsOrbital(true);
    }
    
    // 4. HEAVY SLAM - Only High Tech
    else if (isHighTech && heavyUnits.some(n => name.includes(n))) {
        animClass = 'entrance-heavy';
        
        // Trigger global screen shake near the end of the animation (2.5s duration -> trigger at 2.1s for impact)
        shakeTimer = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('screen-shake'));
        }, 2100);
    } 
    
    // 5. STANDARD (Infantry, Light Vehicles, Low Tech)
    else {
        animClass = 'entrance-standard';
    }

    setEntranceAnim(animClass);
    
    // Cleanup function
    return () => {
        if (shakeTimer) clearTimeout(shakeTimer);
    };
  }, [isPlayed, isCompendium, card.name, isEnemy, card.zone]); // Added card.zone to re-trigger on move

  const handleAnimationEnd = () => {
      // Vital: Remove the animation class so CSS transforms (like hover scale) work again
      setEntranceAnim('');
      setIsOrbital(false);
  };

  const factionColors = {
    [FactionId.NATO]: 'border-blue-800 bg-blue-50 text-blue-900',
    [FactionId.WARSAW]: 'border-red-900 bg-red-50 text-red-900',
    [FactionId.PACIFIC]: 'border-yellow-800 bg-yellow-50 text-yellow-900',
    [FactionId.ZERG]: 'border-purple-800 bg-fuchsia-50 text-purple-900',
  };

  const factionUnitBg = {
    [FactionId.NATO]: 'bg-slate-900 border-blue-500 text-blue-100 shadow-blue-900/40',
    [FactionId.WARSAW]: 'bg-stone-900 border-red-600 text-red-100 shadow-red-900/40',
    [FactionId.PACIFIC]: 'bg-zinc-900 border-yellow-600 text-yellow-100 shadow-yellow-900/40',
    [FactionId.ZERG]: 'bg-purple-950 border-purple-600 text-purple-100 shadow-purple-900/40',
  };

  const getTypeLabel = (type: CardType) => {
      if (type === CardType.UNIT) return "UNIT // 单位";
      if (type === CardType.EVENT) return "EVENT // 事件";
      return type;
  }

  // Improved description cleaning: Only remove known keywords from the start of the text
  const getCleanDescription = (text: string) => {
      let currentText = text;
      // Get all valid keyword names to check against
      const validKeywords = new Set(Object.values(KEYWORDS).map(k => k.name));
      
      while (true) {
          // Match [Keyword] or [Keyword]: at start, allowing whitespace
          const match = currentText.match(/^\s*\[([^\]]+)\]:?\s*/);
          
          if (match) {
              const content = match[1];
              if (validKeywords.has(content)) {
                  // It is a known keyword (e.g. [飞行]), remove it and continue loop
                  currentText = currentText.substring(match[0].length);
              } else {
                  // Found a bracket tag but it's not a known keyword (e.g. [回合结束] or embedded tag), stop
                  break;
              }
          } else {
              // No bracket tag at start, stop
              break;
          }
      }
      return currentText.trim();
  };

  const defconImpact = card.defconImpact || 0;
  // Risk Level 1: Impact -1 (Strategic)
  const isRiskLevel1 = defconImpact === -1;
  // Risk Level 2: Impact -2 or lower (Doomsday)
  const isRiskLevel2 = defconImpact <= -2;
  const isDefconRisk = isRiskLevel1 || isRiskLevel2;

  const currentCost = displayCost !== undefined ? displayCost : card.cost;
  const isCostReduced = currentCost < card.cost;
  const isEvent = card.type === CardType.EVENT;
  
  // Tech Lock Logic
  const reqTech = card.reqTechLevel || 1;
  const isTechLocked = currentTechLevel !== undefined && currentTechLevel < reqTech && !isPlayed && !isCompendium && !isEnemy;

  const getTechColor = (level: number) => {
      if (level >= 5) return 'text-orange-500 border-orange-500';
      if (level === 4) return 'text-purple-400 border-purple-400';
      if (level === 3) return 'text-blue-400 border-blue-400';
      if (level === 2) return 'text-green-400 border-green-400';
      return 'text-gray-400 border-gray-500';
  };

  const keywords = showKeywords ? getCardKeywords(card) : [];
  
  // Logic to split keywords into columns of 3
  const columns: typeof keywords[] = [];
  for (let i = 0; i < keywords.length; i += 3) {
      columns.push(keywords.slice(i, i + 3));
  }
  
  // Updated Tooltip: Positioned to the LEFT (right-full), expanding leftwards (flex-row-reverse)
  // Max 3 items per column (handled by columns array)
  // Hidden by default to prevent layout shifts (fixes "rising interface" bug)
  const Tooltip = (
    <div className="absolute right-full top-0 mr-2 h-auto flex flex-row-reverse items-start gap-2 hidden group-hover:flex z-[100] pointer-events-none w-max">
        {columns.map((col, idx) => (
            <div key={idx} className="flex flex-col gap-2 w-40">
                {col.map(kw => (
                    <div key={kw.id} className={`bg-black/95 border-l-4 p-2 rounded shadow-2xl backdrop-blur-md ${kw.color.replace('text-', 'border-')}`}>
                        <div className={`font-black text-xs uppercase mb-0.5 ${kw.color.split(' ')[0]}`}>{kw.name}</div>
                        <div className="text-[10px] text-gray-300 leading-tight font-bold shadow-black drop-shadow-md">{kw.description}</div>
                    </div>
                ))}
            </div>
        ))}
    </div>
  );

  // --- PLAYED UNIT ON BOARD ---
  if (isPlayed) {
    const healthPercent = ((card.currentHealth || 1) / (card.defense || 1)) * 100;
    const isReady = canAttack && !card.isExhausted;
    
    // Determine Attack Animation Class based on side (Player attacks Up, Enemy attacks Down)
    let attackAnimClass = '';
    if (isAttacking) {
        attackAnimClass = isEnemy ? 'attack-lunge-down' : 'attack-lunge-up';
    }

    // Board visual for Defcon units
    let boardBorderClass = factionUnitBg[card.faction];
    if (isRiskLevel1) boardBorderClass = 'bg-orange-950/80 border-orange-500 text-orange-100 shadow-orange-900/40';
    if (isRiskLevel2) boardBorderClass = 'bg-red-950/90 border-red-600 text-red-100 shadow-red-900/60 animate-pulse-slow';

    return (
      <div 
        onClick={onClick}
        onMouseDown={!disabled && isReady ? onMouseDown : undefined}
        onAnimationEnd={handleAnimationEnd}
        data-id={card.id}
        data-type="unit"
        data-side={isEnemy ? 'enemy' : 'player'}
        data-zone={card.zone}
        className={`
            relative w-24 h-32 
            ${boardBorderClass} border-[2px] rounded-lg
            flex flex-col items-center justify-between p-1 select-none
            shadow-lg backdrop-blur-sm
            ${entranceAnim} 
            ${isOrbital ? 'orbital-rings-fx orbital-emi-fx' : ''}
            ${!entranceAnim ? 'transition-all duration-200' : ''} 
            ${isAttacking ? `${attackAnimClass} z-50 shadow-[0_0_30px_rgba(255,50,50,0.8)]` : ''}
            ${isDamaged ? 'animate-pulse bg-red-500/30 border-red-500' : ''}
            ${isSelected ? 'ring-2 ring-green-400 scale-105 z-30 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : ''}
            ${isTargetable ? 'ring-2 ring-red-500 scale-105 z-20 cursor-crosshair' : ''}
            ${isReady && !disabled && !entranceAnim && !isAttacking ? 'cursor-grab hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:cursor-grabbing' : ''}
            ${card.isExhausted && !disabled ? 'opacity-60 grayscale-[0.8] cursor-default' : ''}
            group
        `}
        title={card.description}
      >
        {showKeywords && keywords.length > 0 && Tooltip}

        <div className="pointer-events-none w-full h-full flex flex-col">
            
            {/* Trait Visuals */}
            <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                 {card.isFlying && <div className="bg-sky-600 rounded-full p-0.5 border border-sky-300 shadow-lg"><Plane size={10} className="text-white" /></div>}
                 {card.isSupport && <div className="bg-orange-600 rounded-full p-0.5 border border-orange-300 shadow-lg"><Rocket size={10} className="text-white" /></div>}
                 {(card.hasBlitz || card.hasRush) && <div className="bg-yellow-600 rounded-full p-0.5 border border-yellow-300 shadow-lg"><Lightning size={10} className="text-white" /></div>}
                 {card.isPoisonous && <div className="bg-green-700 rounded-full p-0.5 border border-green-400 shadow-lg"><Skull size={10} className="text-white" /></div>}
                 {card.isRegen && <div className="bg-lime-600 rounded-full p-0.5 border border-lime-300 shadow-lg"><Dna size={10} className="text-white" /></div>}
            </div>

            {/* Taunt Visual */}
            {card.hasTaunt && (
                <div className="absolute -inset-1 border-2 border-gray-400/50 rounded-xl bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] pointer-events-none"></div>
            )}
            
            {/* Shield Visual */}
            {card.hasShield && (
                <div className="absolute -inset-2 border-2 border-cyan-400/80 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.4)] pointer-events-none z-50"></div>
            )}

            {/* Header */}
            <div className={`w-full flex justify-between items-center border-b ${isDefconRisk ? 'border-red-500/50' : 'border-white/10'} pb-0.5 mb-1`}>
                <div className={`text-[10px] font-black uppercase tracking-tight truncate w-full text-center ${isDefconRisk ? 'text-red-400' : ''}`}>{card.name}</div>
            </div>

            {/* Unit Graphics */}
            <div className={`flex-1 w-full flex items-center justify-center relative bg-black/40 rounded mb-1 border border-white/5 overflow-hidden ${(card.hasRush || card.hasBlitz) ? 'bg-yellow-900/10' : ''}`}>
                {card.hasTaunt && <Shield size={32} className="absolute text-gray-500/20" />}
                {isRiskLevel1 && <AlertTriangle size={32} className="absolute text-orange-500/30 animate-pulse" />}
                {isRiskLevel2 && <Radiation size={32} className="absolute text-red-600/40 animate-[spin_10s_linear_infinite]" />}
                
                {card.isFlying ? <Plane size={20} className="drop-shadow-lg z-10 opacity-80" /> : 
                 card.isSupport ? <Rocket size={20} className="drop-shadow-lg z-10 opacity-80" /> :
                 card.faction === FactionId.ZERG ? <Dna size={20} className="drop-shadow-lg z-10 opacity-80 text-purple-400" /> :
                 <Swords size={20} className={`drop-shadow-lg z-10 opacity-80 ${isDefconRisk ? 'text-red-400' : ''}`} />}
                
                {isReady && !disabled && (
                    <div className="absolute top-1 right-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                    </div>
                )}
                
                {isTargetable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                        <Crosshair className="text-red-500 animate-spin-slow" size={24} />
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            <div className="w-full flex justify-between items-center gap-1 px-0.5">
                <div className="bg-black/60 rounded px-1 py-0.5 border border-yellow-900/50 flex items-center gap-0.5 text-yellow-500 min-w-[24px] justify-center">
                    <Target size={8} />
                    <span className="font-black text-xs">{card.attack}</span>
                </div>
                <div className="bg-black/60 rounded px-1 py-0.5 border border-green-900/50 flex items-center gap-0.5 text-green-500 min-w-[24px] justify-center relative">
                    {card.hasShield ? <Hexagon size={8} className="text-cyan-400"/> : <Shield size={8} />}
                    <span className={`font-black text-xs ${(card.currentHealth || 0) < (card.defense || 0) ? 'text-red-400' : ''}`}>
                        {card.currentHealth}
                    </span>
                </div>
            </div>

            {/* HP Bar */}
            <div className="absolute -bottom-1.5 left-1 right-1 h-1 bg-gray-800 rounded-full overflow-hidden border border-black/50">
                <div className="h-full bg-gradient-to-r from-green-600 to-green-400" style={{ width: `${healthPercent}%` }}></div>
            </div>
        </div>
      </div>
    );
  }

  // --- HAND CARD (and Compendium) ---
  
  // Base Style
  let cardStyle = factionColors[card.faction];
  if (isRiskLevel1) cardStyle = 'border-orange-600 bg-amber-50 text-orange-900 shadow-[0_0_20px_rgba(249,115,22,0.4)]';
  if (isRiskLevel2) cardStyle = 'border-red-900 bg-black text-red-700 shadow-[0_0_30px_rgba(220,38,38,0.7)] animate-pulse-slow border-[3px]';

  // Custom Style for Events - "Tactical Folder" look (Overrides normal, but Defcon overrides event slightly for border)
  const eventStyle = isEvent 
      ? `bg-[#d8d5c4] border-gray-600 text-gray-900 paper-texture shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5)] ${isDefconRisk ? 'border-red-500' : ''}`
      : cardStyle;

  const getBadgeBorderColor = () => {
    if (isTechLocked) return 'border-gray-500 bg-gray-700 text-gray-400';
    if (isCostReduced) return 'border-green-400';
    if (isRiskLevel2) return 'border-red-900 bg-red-950 text-red-500';
    if (isRiskLevel1) return 'border-orange-500 bg-orange-900 text-orange-200';
    if (isEvent) return 'border-gray-700 bg-gray-800 text-gray-200';
    switch (card.faction) {
        case FactionId.NATO: return 'border-blue-600';
        case FactionId.WARSAW: return 'border-red-600';
        case FactionId.PACIFIC: return 'border-yellow-600';
        case FactionId.ZERG: return 'border-purple-600';
        default: return 'border-gray-500';
    }
  };
  
  const techColorClass = getTechColor(reqTech);

  return (
    <div 
      onClick={!disabled && !isTechLocked ? onClick : undefined}
      onMouseDown={!disabled && !isTechLocked ? onMouseDown : undefined}
      className={`
        relative w-36 h-48 select-none group
        ${(disabled || isTechLocked) && !isCompendium ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
        {/* Keywords Tooltip */}
        {showKeywords && keywords.length > 0 && Tooltip}

        <div className={`
            absolute -top-3 -left-3 w-9 h-9 rounded-full border-[3px] bg-gray-900 flex items-center justify-center font-black text-lg shadow-lg z-50
            transition-transform duration-200 group-hover:scale-110
            ${getBadgeBorderColor()}
            ${isDefconRisk ? 'text-red-500' : (isCostReduced ? 'text-green-400' : isEvent ? 'text-white' : 'text-white')}
        `}>
            {isTechLocked ? <Lock size={14} /> : currentCost}
        </div>

        <div className={`
            w-full h-full border-[3px] rounded-xl flex flex-col justify-between p-2 shadow-2xl overflow-hidden relative
            transition-all duration-200
            ${isEvent ? eventStyle : cardStyle}
        `}>
            {/* Paper texture for events */}
            {isEvent && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')] opacity-10 pointer-events-none"></div>}

            {/* TECH LOCK OVERLAY */}
            {isTechLocked && (
                <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-2 text-center backdrop-blur-[1px] border-2 border-red-500/50">
                    <Lock size={32} className="text-red-500 mb-2" />
                    <div className="text-red-500 font-black text-sm tracking-widest uppercase">
                        CLASSIFIED
                    </div>
                    <div className="text-gray-400 text-[10px] font-bold mt-1">
                        REQ: TECH LVL {reqTech}
                    </div>
                </div>
            )}

            {isDefconRisk && (
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.05)_10px,rgba(255,0,0,0.05)_20px)] pointer-events-none z-0"></div>
            )}
            
            {/* Folder Tab Visual for Event */}
            {isEvent && (
                 <div className="absolute -top-[2px] right-2 w-16 h-4 bg-[#c8c5b4] border-b border-l border-r border-gray-400 rounded-b-md z-0"></div>
            )}

            {isEvent && !isDefconRisk && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-[3px] border-gray-600/20 text-gray-600/20 font-black text-[10px] px-2 py-1 rounded rotate-[-15deg] pointer-events-none z-0 whitespace-nowrap">
                    TOP SECRET // FILE
                </div>
            )}

            <div className="absolute top-8 right-1 transform rotate-12 opacity-30 border border-double p-0.5 rounded font-black text-[6px] tracking-widest uppercase text-red-800 pointer-events-none z-0">
                CONFIDENTIAL
            </div>

            {/* HEADER: Type (Cleaned) */}
            <div className="z-10 border-b border-current pb-1 mb-1 pl-4 relative flex justify-start items-end">
                <span className="text-[10px] font-black uppercase tracking-tighter opacity-90 scale-y-110">{getTypeLabel(card.type)}</span>
            </div>

            <div className={`
                h-20 bg-gray-900/10 border border-current mb-1 flex items-center justify-center overflow-hidden grayscale contrast-125 relative shadow-inner rounded-md
                ${isDefconRisk ? 'border-red-500' : ''}
                ${isEvent ? 'border-dotted opacity-80' : ''}
            `}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-30"></div>
                {card.type === CardType.UNIT && (
                    <>
                        {card.isFlying && <Plane size={24} className="opacity-60" />}
                        {card.isSupport && <Rocket size={24} className="opacity-60" />}
                        {card.faction === FactionId.ZERG && !card.isFlying && !card.isSupport && <Dna size={24} className="opacity-60" />}
                        {card.faction !== FactionId.ZERG && !card.isFlying && !card.isSupport && <Swords size={24} className="opacity-60" />}
                    </>
                )}
                {card.type === CardType.EVENT && <FileWarning size={32} className="opacity-60" />}
                
                {isRiskLevel1 && (<div className="absolute inset-0 flex items-center justify-center opacity-30"><AlertTriangle size={48} className="text-orange-900" /></div>)}
                {isRiskLevel2 && (<div className="absolute inset-0 flex items-center justify-center opacity-50 animate-pulse-slow"><Radiation size={48} className="text-red-600" /></div>)}
                
                {/* Defcon Risk Label Moved INSIDE Image Container to prevent obstruction of text below */}
                {isDefconRisk && (
                    <div className={`
                        absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-[2px] font-black text-[10px] px-2 py-0.5 rounded rotate-[-15deg] pointer-events-none z-30 whitespace-nowrap shadow-lg backdrop-blur-sm
                        ${isRiskLevel2 ? 'border-red-500 text-red-100 bg-red-900/40 animate-pulse-slow' : 'border-orange-500 text-orange-100 bg-orange-900/40'}
                    `}>
                        {isRiskLevel2 ? 'DOOMSDAY // 末日' : 'STRATEGIC // 战略'}
                    </div>
                )}

                {/* Tech Level Badge */}
                <div className={`
                    absolute bottom-0 right-0 bg-black/90 border-t border-l px-2 py-0.5 rounded-tl-lg flex items-center gap-1 z-20
                    ${techColorClass.split(' ')[1]}
                `}>
                    <div className="flex items-center gap-1">
                         <span className={`text-[6px] font-bold uppercase tracking-widest opacity-60 ${techColorClass.split(' ')[0]}`}>TECH</span>
                         <span className={`text-sm font-black font-mono leading-none ${techColorClass.split(' ')[0]}`}>
                            {reqTech}
                         </span>
                    </div>
                </div>

            </div>

            <div className="flex-grow flex flex-col relative z-10">
                <h3 className="font-black text-[11px] uppercase mb-1 leading-tight">{card.name}</h3>
                <p className={`text-[9px] leading-tight font-bold opacity-90 ${isRiskLevel2 ? 'text-red-500' : ''}`}>
                    {getCleanDescription(card.description)}
                </p>
            </div>

            {card.type === CardType.UNIT && (
                <div className="flex justify-between items-center border-t border-current pt-1 mt-auto bg-black/5 mx-[-4px] px-2 pb-1 relative z-10">
                    <div className="flex items-center gap-1">
                        <Target size={12} />
                        <span className="text-base font-black">{card.attack}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {card.hasShield ? <Hexagon size={12} className="text-cyan-600"/> : <Shield size={12} />}
                        <span className="text-base font-black">{card.defense || 0}</span>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
