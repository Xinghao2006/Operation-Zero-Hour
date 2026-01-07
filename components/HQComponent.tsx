


import React from 'react';
import { FactionId } from '../types';
import { Building2, Radio, ShieldAlert, Crosshair, Hexagon, Biohazard } from 'lucide-react';

interface HQProps {
  faction: FactionId;
  hp: number;
  maxHp: number;
  isEnemy: boolean;
  isDamaged?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  canTarget?: boolean; // For visual feedback during drag
}

export const HQComponent: React.FC<HQProps> = ({ 
  faction, hp, maxHp, isEnemy, isDamaged, onMouseDown, canTarget
}) => {
  
  const getFactionStyles = () => {
    switch (faction) {
      case FactionId.NATO:
        return {
          bg: 'bg-blue-950',
          border: 'border-blue-500',
          text: 'text-blue-100',
          glow: 'shadow-blue-500/30',
          icon: <Building2 size={32} />
        };
      case FactionId.WARSAW:
        return {
          bg: 'bg-red-950',
          border: 'border-red-500',
          text: 'text-red-100',
          glow: 'shadow-red-500/30',
          icon: <Hexagon size={32} />
        };
      case FactionId.PACIFIC:
        return {
          bg: 'bg-yellow-950',
          border: 'border-yellow-500',
          text: 'text-yellow-100',
          glow: 'shadow-yellow-500/30',
          icon: <Radio size={32} />
        };
      case FactionId.ZERG:
        return {
          bg: 'bg-purple-950',
          border: 'border-purple-500',
          text: 'text-purple-100',
          glow: 'shadow-purple-500/30',
          icon: <Biohazard size={32} />
        };
    }
  };

  const style = getFactionStyles();
  const hpPercent = (hp / maxHp) * 100;

  return (
    <div 
      className={`
        relative w-48 h-32 flex flex-col items-center justify-between p-2
        border-4 rounded-xl transition-all duration-300 select-none
        ${style.bg} ${style.border} ${style.text} ${style.glow}
        ${isDamaged ? 'animate-bounce shadow-[0_0_50px_rgba(255,0,0,0.8)] border-red-500' : 'shadow-lg'}
        ${canTarget ? 'scale-105 ring-4 ring-red-500 cursor-crosshair' : ''}
        group
      `}
      data-type="hq"
      data-side={isEnemy ? "enemy" : "player"}
      data-id={isEnemy ? "enemy_hq" : "player_hq"} // Added ID for strict targeting
      onMouseDown={onMouseDown} // Allowed if we want to target friendly HQ with buffs later
    >
      {/* Target Overlay for Drag */}
      {canTarget && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none opacity-50">
           <Crosshair size={64} className="text-red-500 animate-spin-slow" />
        </div>
      )}

      {/* HP Bar */}
      <div className="w-full h-4 bg-black/50 rounded-full border border-white/20 overflow-hidden relative mb-2">
        <div 
          className={`h-full transition-all duration-500 ${hp < 10 ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`} 
          style={{ width: `${hpPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-widest drop-shadow-md text-white shadow-black">
          INTEGRITY: {hp}/{maxHp}
        </div>
      </div>

      {/* Main Structure Graphic */}
      <div className="flex-1 w-full flex items-center justify-center relative bg-black/20 rounded border border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
        <div className={`transform transition-transform duration-500 ${isDamaged ? 'scale-90 rotate-3' : 'group-hover:scale-110'}`}>
           {style.icon}
        </div>
        
        {/* Faction Label */}
        <div className="absolute bottom-1 right-2 text-xs opacity-70 font-black tracking-tighter">
            {faction} CMD
        </div>
      </div>

      {/* Status Lights */}
      <div className="absolute top-1/2 -right-3 flex flex-col gap-1">
          <div className={`w-2 h-2 rounded-full ${hp > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-800'}`}></div>
          <div className={`w-2 h-2 rounded-full ${hp < 10 ? 'bg-red-500 animate-ping' : 'bg-gray-800'}`}></div>
      </div>

      {isEnemy && <ShieldAlert className="absolute -top-4 -left-4 text-red-500/80 animate-pulse" size={24} />}
    </div>
  );
};