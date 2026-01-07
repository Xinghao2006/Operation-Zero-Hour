
import React, { useState } from 'react';
import { Card, FactionId, CardType, Rarity } from '../../types';
import { audioEngine } from '../../services/audioEngine';
import { CardComponent } from '../CardComponent';
import { Projector, X, PlayCircle } from 'lucide-react';

interface ExhibitionProps {
    onClose: () => void;
}

export const ExhibitionOverlay: React.FC<ExhibitionProps> = ({ onClose }) => {
    // Defines dummy cards to trigger specific animations
    const demoCards: Record<string, Card> = {
        'AIR': { id: 'demo_air', name: 'B-2 幽灵', faction: FactionId.NATO, type: CardType.UNIT, rarity: Rarity.LEGENDARY, cost: 8, attack: 8, defense: 6, currentHealth: 6, description: '[飞行] 空中单位演示', isFlying: true, zone: 'backrow' },
        'EMERGE': { id: 'demo_emerge', name: '俄亥俄级核潜艇', faction: FactionId.WARSAW, type: CardType.UNIT, rarity: Rarity.RARE, cost: 7, attack: 4, defense: 10, currentHealth: 10, description: '[潜行] 浮出水面演示', zone: 'backrow' },
        'ORBITAL': { id: 'demo_orbital', name: '天基离子炮', faction: FactionId.PACIFIC, type: CardType.UNIT, rarity: Rarity.LEGENDARY, cost: 10, attack: 0, defense: 10, currentHealth: 10, description: '[轨道] 天基打击演示', zone: 'backrow' },
        'HEAVY': { id: 'demo_heavy', name: '末日列车', faction: FactionId.WARSAW, type: CardType.UNIT, rarity: Rarity.LEGENDARY, cost: 10, attack: 0, defense: 20, currentHealth: 20, description: '[重型] 巨物部署演示', zone: 'backrow' },
        'STANDARD': { id: 'demo_std', name: '动员兵', faction: FactionId.WARSAW, type: CardType.UNIT, rarity: Rarity.COMMON, cost: 1, attack: 1, defense: 1, currentHealth: 1, description: '普通入场演示', zone: 'backrow' }
    };

    const [activeAnim, setActiveAnim] = useState<string>('AIR');
    const [replayKey, setReplayKey] = useState(0);

    const handleSelect = (type: string) => {
        setActiveAnim(type);
        setReplayKey(k => k + 1);
        audioEngine.playClick();
    };

    const replay = () => {
        setReplayKey(k => k + 1);
        audioEngine.playClick();
    };

    return (
        <div className="fixed inset-0 z-[150] bg-zinc-950 text-gray-200 font-mono flex flex-col animate-in zoom-in-95 duration-300">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            
            {/* Header */}
            <div className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-black/80 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Projector size={32} className="text-purple-500" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: 'Black Ops One' }}>模拟演练档案</h1>
                        <div className="text-xs text-purple-600 font-bold tracking-[0.5em]">视觉回放系统</div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded border border-gray-700 hover:border-gray-500 transition-all">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Controls */}
                <div className="w-80 p-6 border-r border-gray-800 bg-black/40 flex flex-col gap-4">
                    <div className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-2">部署序列 (DEPLOY SEQUENCE)</div>
                    
                    <button onClick={() => handleSelect('AIR')} className={`p-4 border text-left transition-all ${activeAnim === 'AIR' ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-gray-900/20 border-gray-800 hover:bg-gray-800'}`}>
                        <div className="font-black text-lg">空降部署</div>
                        <div className="text-[10px] opacity-70">高空突入 (Airborne)</div>
                    </button>
                    
                    <button onClick={() => handleSelect('EMERGE')} className={`p-4 border text-left transition-all ${activeAnim === 'EMERGE' ? 'bg-teal-900/30 border-teal-500 text-teal-400' : 'bg-gray-900/20 border-gray-800 hover:bg-gray-800'}`}>
                        <div className="font-black text-lg">潜行突袭</div>
                        <div className="text-[10px] opacity-70">隐秘潜入 (Submerge)</div>
                    </button>

                    <button onClick={() => handleSelect('ORBITAL')} className={`p-4 border text-left transition-all ${activeAnim === 'ORBITAL' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-gray-900/20 border-gray-800 hover:bg-gray-800'}`}>
                        <div className="font-black text-lg">轨道打击</div>
                        <div className="text-[10px] opacity-70">动能轰炸 (Orbital)</div>
                    </button>

                    <button onClick={() => handleSelect('HEAVY')} className={`p-4 border text-left transition-all ${activeAnim === 'HEAVY' ? 'bg-orange-900/30 border-orange-500 text-orange-400' : 'bg-gray-900/20 border-gray-800 hover:bg-gray-800'}`}>
                        <div className="font-black text-lg">重型空投</div>
                        <div className="text-[10px] opacity-70">重型部署 (Heavy - 2.5s)</div>
                    </button>

                    <button onClick={() => handleSelect('STANDARD')} className={`p-4 border text-left transition-all ${activeAnim === 'STANDARD' ? 'bg-gray-800 border-gray-500 text-gray-300' : 'bg-gray-900/20 border-gray-800 hover:bg-gray-800'}`}>
                        <div className="font-black text-lg">标准部署</div>
                        <div className="text-[10px] opacity-70">常规战术 (Standard)</div>
                    </button>
                </div>

                {/* Right: Stage */}
                <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Grid floor illusion */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] perspective-[1000px] transform-gpu rotate-x-60"></div>
                    
                    <div className="relative z-10 transform scale-150">
                        {/* Key forces remount -> animation replay */}
                        <CardComponent 
                            key={`${activeAnim}_${replayKey}`} 
                            card={{...demoCards[activeAnim], isCustom: true}} // isCustom to bypass compendium check if reused
                            isPlayed={true} 
                            disabled={true} 
                            isCompendium={false} // Treat as 'on board' to trigger animation logic
                        />
                    </div>

                    <button onClick={replay} className="absolute bottom-10 px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                        <PlayCircle size={20} /> 重播演示 (REPLAY)
                    </button>
                    
                    <div className="absolute bottom-2 right-4 text-[10px] text-gray-600 font-mono">
                        渲染引擎: V2.0 // 动画ID: {activeAnim}
                    </div>
                </div>
            </div>
        </div>
    );
};
