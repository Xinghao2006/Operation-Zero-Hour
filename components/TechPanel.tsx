
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlayerState, TechDefinition, FactionId } from '../types';
import { FACTION_TECHS } from '../constants';
import { Cpu, Lock, Shield, Crosshair, Zap, FlaskConical, X, Check, Activity, Terminal, Database, Radio } from 'lucide-react';
import { CAMPAIGN_LEVELS } from '../logic/campaignData';

interface TechPanelProps {
  player: PlayerState;
  onUpgrade: (choiceId?: string) => void;
  canUpgrade: boolean;
  nextCost: number | null;
  disableTech?: boolean; // New Prop
}

interface TechTreeOverlayProps {
  faction: FactionId;
  techLevel: number;
  activeTechs: string[];
  ap: number;
  onClose: () => void;
  onUpgrade?: (choiceId: string) => void; 
  isEnemyView?: boolean;
}

export const getBranchIcon = (branch: string) => {
  if (branch.includes('AIR') || branch.includes('BOMBER') || branch.includes('INTERCEPTOR')) return <Crosshair size={24} />;
  if (branch.includes('OPS') || branch.includes('GHOST') || branch.includes('LOGISTICS')) return <Database size={24} />;
  if (branch.includes('ARMOR') || branch.includes('PHASE')) return <Shield size={24} />;
  if (branch.includes('INFANTRY') || branch.includes('CYBER')) return <Terminal size={24} />;
  if (branch.includes('INDUSTRY')) return <Zap size={24} />;
  return <Radio size={24} />;
};

export const TechTreeOverlay: React.FC<TechTreeOverlayProps> = ({ 
  faction, techLevel, activeTechs, ap, onClose, onUpgrade, isEnemyView = false 
}) => {
    const factionTechs = FACTION_TECHS[faction];
    const treeRef = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<React.ReactElement[]>([]);

    const theme = isEnemyView ? {
        primary: 'text-red-500',
        border: 'border-red-500',
        borderDim: 'border-red-900/30',
        bgActive: 'bg-red-900/20',
        shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]',
        lineStroke: '#ef4444',
        textDim: 'text-red-900',
        dot: 'bg-red-500'
    } : {
        primary: 'text-green-500',
        border: 'border-green-500',
        borderDim: 'border-green-900/30',
        bgActive: 'bg-green-900/20',
        shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.2)]',
        lineStroke: '#22c55e',
        textDim: 'text-green-900',
        dot: 'bg-green-500'
    };

    // Use useLayoutEffect to calculate positions after DOM updates but before paint
    useLayoutEffect(() => {
        if (!treeRef.current) return;
        
        const updateLines = () => {
            if (!treeRef.current) return;
            const newLines: React.ReactElement[] = [];
            
            const getEl = (id: string) => treeRef.current?.querySelector(`[data-tech-id="${id}"]`);
            const containerRect = treeRef.current.getBoundingClientRect();

            // Iterate all techs (L2 to L6) and draw line to reqId
            [2,3,4,5,6].forEach(lvl => {
                const techs = factionTechs[lvl];
                if (!techs) return;
                techs.forEach(t => {
                    if (!t.reqId) return;
                    const startEl = getEl(t.reqId);
                    const endEl = getEl(t.id);
                    if (startEl && endEl) {
                        const startRect = startEl.getBoundingClientRect();
                        const endRect = endEl.getBoundingClientRect();

                        // Calculate relative to container
                        const x1 = startRect.left + startRect.width / 2 - containerRect.left;
                        const y1 = startRect.bottom - containerRect.top;
                        const x2 = endRect.left + endRect.width / 2 - containerRect.left;
                        const y2 = endRect.top - containerRect.top;

                        const isAcquired = activeTechs.includes(t.id);
                        const isReqAcquired = activeTechs.includes(t.reqId);
                        
                        const opacity = isAcquired ? 0.8 : (isReqAcquired ? 0.4 : 0.1);
                        const strokeWidth = isAcquired ? 3 : 2;

                        newLines.push(
                            <path 
                                key={`${t.reqId}-${t.id}`}
                                d={`M ${x1} ${y1} C ${x1} ${y1 + 20}, ${x2} ${y2 - 20}, ${x2} ${y2}`}
                                stroke={theme.lineStroke}
                                strokeWidth={strokeWidth}
                                fill="none"
                                opacity={opacity}
                                className="transition-all duration-500"
                            />
                        );
                    }
                });
            });
            setLines(newLines);
        };

        // Initial draw
        updateLines();
        
        // Redraw on resize
        window.addEventListener('resize', updateLines);
        
        // Small timeout to catch any layout shifts (e.g. font loading)
        const timer = setTimeout(updateLines, 100);

        return () => {
            window.removeEventListener('resize', updateLines);
            clearTimeout(timer);
        };
    }, [faction, techLevel, activeTechs, isEnemyView]); 

    const renderNode = (tech: TechDefinition, level: number) => {
      const isAcquired = activeTechs.includes(tech.id);
      
      const isNextLevel = techLevel === level - 1;
      const reqMet = !tech.reqId || activeTechs.includes(tech.reqId);
      const siblingAcquired = factionTechs[level]?.some(t => activeTechs.includes(t.id));
      
      let status = 'locked';
      if (isAcquired) status = 'acquired';
      else if (siblingAcquired) status = 'restricted'; 
      else if (isNextLevel && reqMet) status = 'available';
      else if (isNextLevel && reqMet && ap < tech.cost) status = 'expensive';
      
      // Fix visual logic: 'available' means can buy NOW. 'expensive' means next but can't buy.
      if (status === 'available' && ap < tech.cost) status = 'expensive';

      if (isEnemyView && status === 'available') status = 'expensive';

      return (
        <button
          key={tech.id}
          data-tech-id={tech.id}
          onClick={() => {
            if (status === 'available' && onUpgrade) {
               onUpgrade(tech.id);
            }
          }}
          disabled={status !== 'available' || !onUpgrade}
          className={`
            relative w-72 group transition-all duration-300 text-left shrink-0
            ${status === 'restricted' ? 'opacity-30 blur-[1px] grayscale pointer-events-none' : 'opacity-100'}
            ${status === 'available' ? 'hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]' : ''}
          `}
        >
            <div 
                className={`
                    relative min-h-[160px] rounded border backdrop-blur-sm overflow-hidden flex flex-col justify-between
                    ${status === 'acquired' ? `${theme.border} ${theme.bgActive} ${theme.shadow}` : ''}
                    ${status === 'available' ? `${theme.border} border-dashed bg-black/60` : ''}
                    ${status === 'expensive' ? 'border-gray-800 bg-black/60' : ''}
                    ${status === 'locked' || status === 'restricted' ? 'border-gray-900 bg-black/40' : ''}
                `}
            >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none opacity-50"></div>

                <div className="p-4 relative z-10 h-full flex flex-col">
                    <div className="flex items-start gap-4 mb-3">
                        <div className={`
                            w-12 h-12 border flex items-center justify-center shrink-0
                            ${status === 'acquired' || status === 'available' ? `${theme.border} ${theme.primary}` : 'border-gray-800 text-gray-700'}
                        `}>
                            {getBranchIcon(tech.branch)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[11px] font-bold uppercase tracking-widest ${status === 'locked' ? 'text-gray-700' : theme.primary} opacity-80`}>
                                    {tech.branch}
                                </span>
                                {status === 'acquired' && <Check size={18} className={theme.primary} />}
                            </div>
                            
                            <div className={`text-xl font-black uppercase truncate leading-none ${status === 'locked' || status === 'restricted' ? 'text-gray-600' : 'text-gray-100'}`}>
                                {tech.name}
                            </div>
                        </div>
                    </div>

                    <div className={`text-sm font-medium leading-relaxed mb-4 ${status === 'locked' || status === 'restricted' ? 'text-gray-700' : 'text-gray-300'}`}>
                        {tech.description}
                    </div>

                    <div className={`mt-auto pt-2 border-t flex items-center justify-between ${status === 'acquired' ? theme.borderDim : 'border-gray-900'}`}>
                         <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-gray-500 tracking-wider">花费</span>
                            <span className={`text-sm font-mono font-bold ${status === 'available' ? theme.primary : 'text-gray-400'}`}>
                                {status === 'acquired' ? '已购' : `${tech.cost} AP`}
                            </span>
                         </div>
                         {status === 'available' && <span className={`text-[11px] font-bold ${theme.primary} animate-pulse`}>[ 点击上传 ]</span>}
                    </div>
                </div>
            </div>
        </button>
      );
    };

    return (
      <div className="fixed inset-0 z-[9999] bg-[#050505] font-mono overflow-hidden select-none text-gray-300">
        {/* Header */}
        <div className={`relative h-24 border-b ${theme.borderDim} bg-black/80 backdrop-blur-md z-30 flex items-center justify-between px-8`}>
            <div className="flex items-center gap-6">
                <div className={`w-14 h-14 border ${theme.border} flex items-center justify-center bg-black`}>
                    <Terminal size={32} className={theme.primary} />
                </div>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter mb-1" style={{ fontFamily: 'Black Ops One', color: isEnemyView ? '#ef4444' : '#22c55e' }}>
                        研发实验室
                    </h1>
                    <div className={`text-sm font-bold tracking-[0.3em] ${theme.textDim}`}>
                         // {faction} // 等级.0{techLevel}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-12">
                 <div className={`text-3xl font-black font-mono flex items-center gap-3 ${theme.primary}`}>
                     <Zap size={24} fill="currentColor" /> {ap} <span className="text-xs text-gray-500 font-bold tracking-widest mt-2">可用能量</span>
                 </div>
                 <button onClick={onClose} className="px-8 py-3 border border-gray-800 text-sm font-bold hover:bg-white/5 hover:text-white transition-colors tracking-widest uppercase">
                     <X size={18} className="inline mr-2" /> 取消
                 </button>
            </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 h-[calc(100vh-6rem)] overflow-auto bg-black relative scrollbar-hide">
            <div className="min-w-max min-h-full p-16 flex flex-col items-center relative" ref={treeRef}>
                {/* SVG Layer for Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {lines}
                </svg>
                
                {/* Level 1 */}
                <div className="flex justify-center mb-24 relative z-10">
                    {factionTechs[1] && renderNode(factionTechs[1][0], 1)}
                </div>

                {/* Level 2 */}
                <div className="flex justify-center gap-24 mb-24 relative z-10">
                    {factionTechs[2]?.map(t => renderNode(t, 2))}
                </div>

                {/* Level 3 */}
                <div className="flex justify-center gap-24 mb-24 relative z-10">
                    {factionTechs[3]?.map(t => renderNode(t, 3))}
                </div>

                {/* Level 4 (Complex Splits) */}
                <div className="flex justify-center gap-16 mb-24 relative z-10">
                    {factionTechs[4]?.map(t => renderNode(t, 4))}
                </div>

                {/* Level 5 */}
                <div className="flex justify-center gap-16 mb-24 relative z-10">
                    {factionTechs[5]?.map(t => renderNode(t, 5))}
                </div>

                {/* Level 6 */}
                <div className="flex justify-center gap-16 relative z-10">
                    {factionTechs[6]?.map(t => renderNode(t, 6))}
                </div>
            </div>
        </div>
      </div>
    );
};

export const TechPanel: React.FC<TechPanelProps> = ({ player, onUpgrade, canUpgrade, nextCost, disableTech }) => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const activeTechs = player.activeTechs;
  const currentLevel = player.techLevel;

  return (
    <>
      {isOverlayOpen && createPortal(
          <TechTreeOverlay 
            faction={player.faction}
            techLevel={player.techLevel}
            activeTechs={player.activeTechs}
            ap={player.ap}
            onClose={() => setIsOverlayOpen(false)}
            onUpgrade={onUpgrade}
            isEnemyView={false}
          />, 
          document.body
      )}
      
      <div className="w-full h-full flex flex-col bg-black/20 text-[10px] select-none">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-2 text-green-500">
            <Cpu size={14} />
            <span className="font-bold tracking-widest text-xs">科技等级 {currentLevel}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-2">
            {currentLevel === 0 && (
                <div className="text-gray-500 text-center mt-4 px-4 flex flex-col items-center gap-2">
                    <Activity size={24} className="opacity-20" />
                    <span>研发系统已上线。</span>
                </div>
            )}
            
            {activeTechs.map(tid => {
                // Find tech definition
                let tech: TechDefinition | undefined;
                Object.values(FACTION_TECHS[player.faction]).forEach((list: TechDefinition[]) => {
                    const found = list.find(t => t.id === tid);
                    if(found) tech = found;
                });
                if (!tech) return null;
                return (
                     <div key={tech.id} className="bg-green-950/20 border border-green-900/40 p-2 rounded flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                            <div className="text-green-500">{getBranchIcon(tech.branch)}</div>
                            <div className="font-bold text-green-400 text-[10px] uppercase">{tech.name}</div>
                         </div>
                     </div>
                );
            })}
        </div>

        <div className="p-3 border-t border-gray-800">
            {disableTech ? (
                <div className="w-full py-4 bg-gray-900/50 border border-gray-800 flex flex-col items-center justify-center text-gray-600">
                    <Lock size={16} className="mb-1 opacity-50" />
                    <span className="text-[10px] font-bold tracking-widest">任务中锁定</span>
                </div>
            ) : (
                <button 
                    id="tech-upgrade-btn" // ID for Tutorial Targeting
                    onClick={() => setIsOverlayOpen(true)}
                    className={`
                        w-full py-4 relative overflow-hidden group border transition-all duration-200 rounded
                        ${canUpgrade ? 'border-green-500/50 bg-green-900/20 hover:bg-green-900/30' : 'border-gray-800 bg-gray-900/20 hover:bg-gray-800/30'}
                    `}
                >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                        <FlaskConical size={16} className={canUpgrade ? 'text-green-400' : 'text-gray-500'} />
                        <span className={`text-xs font-black tracking-[0.2em] ${canUpgrade ? 'text-green-100' : 'text-gray-500'}`}>
                            研发实验室
                        </span>
                        {canUpgrade && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-1"></div>}
                    </div>
                </button>
            )}
        </div>
      </div>
    </>
  );
};
