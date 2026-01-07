

import React, { useState } from 'react';
import { Card, FactionId, CardType, Rarity } from '../../types';
import { audioEngine } from '../../services/audioEngine';
import { CardComponent } from '../CardComponent';
import { Hammer, X, Save, Trash2 } from 'lucide-react';

interface WorkshopProps {
    onClose: () => void;
    onSave: (card: Card) => void;
    onDelete: (cardId: string) => void;
    existingCustomCards: Card[];
}

export const WorkshopOverlay: React.FC<WorkshopProps> = ({ onClose, onSave, onDelete, existingCustomCards }) => {
    // Form State
    const [name, setName] = useState('PROTOTYPE-01');
    const [faction, setFaction] = useState<FactionId>(FactionId.NATO);
    const [type, setType] = useState<CardType>(CardType.UNIT);
    const [rarity, setRarity] = useState<Rarity>(Rarity.COMMON);
    const [cost, setCost] = useState(3);
    const [attack, setAttack] = useState(3);
    const [defense, setDefense] = useState(3);
    const [reqTechLevel, setReqTechLevel] = useState(1);
    const [desc, setDesc] = useState('');
    const [flavor, setFlavor] = useState('实验单位。');
    
    // Boolean Flags
    const [hasBlitz, setHasBlitz] = useState(false);
    const [isFlying, setIsFlying] = useState(false);
    const [isSupport, setIsSupport] = useState(false);
    const [hasTaunt, setHasTaunt] = useState(false);
    const [hasShield, setHasShield] = useState(false);
    const [isRegen, setIsRegen] = useState(false);
    const [isPoisonous, setIsPoisonous] = useState(false);
    const [defconImpact, setDefconImpact] = useState(0);

    // Preview Object
    const previewCard: Card = {
        id: 'preview',
        name: name || 'UNKNOWN',
        faction,
        type,
        rarity,
        cost,
        attack: type === CardType.UNIT ? attack : 0,
        defense: type === CardType.UNIT ? defense : 0,
        currentHealth: type === CardType.UNIT ? defense : 0,
        description: desc + (hasBlitz ? ' [闪击]' : '') + (isFlying ? ' [飞行]' : '') + (isSupport ? ' [支援]' : '') + (hasTaunt ? ' [嘲讽]' : '') + (hasShield ? ' [护盾]' : '') + (isRegen ? ' [再生]' : '') + (isPoisonous ? ' [剧毒]' : ''),
        flavor,
        hasBlitz,
        isFlying,
        isSupport,
        hasTaunt,
        hasShield,
        isRegen,
        isPoisonous,
        defconImpact: defconImpact !== 0 ? defconImpact : undefined,
        reqTechLevel: reqTechLevel,
        isCustom: true
    };

    const handleSave = () => {
        const newCard: Card = {
            ...previewCard,
            id: `custom_${Date.now()}`,
            description: desc // Store raw description, flags handles keywords
        };
        onSave(newCard);
        audioEngine.playStamp();
        alert('蓝图已保存至数据库。');
    };

    return (
        <div className="fixed inset-0 z-[150] bg-[#0a0a0a] text-gray-200 font-mono flex flex-col animate-in slide-in-from-bottom-10 duration-300">
             {/* Header */}
             <div className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-black/80 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Hammer size={32} className="text-orange-500" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: 'Black Ops One' }}>研发车间</h1>
                        <div className="text-xs text-orange-600 font-bold tracking-[0.5em]">PROTOTYPING LAB</div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded border border-gray-700 hover:border-gray-500 transition-all">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Controls */}
                <div className="w-1/2 p-8 overflow-y-auto border-r border-gray-800 bg-black/40">
                    <div className="max-w-xl mx-auto space-y-6">
                        
                        {/* Basic Info */}
                        <div className="space-y-4 p-4 border border-gray-800 bg-gray-900/20 rounded">
                            <h3 className="text-sm font-bold text-orange-500 tracking-widest uppercase mb-2">基础数据</h3>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">名称 / DESIGNATION</label>
                                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-gray-700 p-2 text-white focus:border-orange-500 outline-none" maxLength={12} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">阵营 / FACTION</label>
                                    <select value={faction} onChange={e => setFaction(e.target.value as FactionId)} className="w-full bg-black border border-gray-700 p-2 text-white">
                                        {Object.values(FactionId).map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">类型 / TYPE</label>
                                    <select value={type} onChange={e => setType(e.target.value as CardType)} className="w-full bg-black border border-gray-700 p-2 text-white">
                                        {Object.values(CardType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">费用 (AP): {cost}</label>
                                    <input type="range" min="0" max="10" value={cost} onChange={e => setCost(parseInt(e.target.value))} className="w-full accent-orange-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">科技需求 (LVL): {reqTechLevel}</label>
                                    <input type="range" min="1" max="5" value={reqTechLevel} onChange={e => setReqTechLevel(parseInt(e.target.value))} className="w-full accent-blue-500" />
                                </div>
                            </div>
                        </div>

                        {/* Unit Stats */}
                        {type === CardType.UNIT && (
                             <div className="space-y-4 p-4 border border-gray-800 bg-gray-900/20 rounded">
                                <h3 className="text-sm font-bold text-green-500 tracking-widest uppercase mb-2">战斗参数</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">攻击力: {attack}</label>
                                        <input type="range" min="0" max="12" value={attack} onChange={e => setAttack(parseInt(e.target.value))} className="w-full accent-green-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">生命值: {defense}</label>
                                        <input type="range" min="1" max="20" value={defense} onChange={e => setDefense(parseInt(e.target.value))} className="w-full accent-green-500" />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-yellow-400">
                                        <input type="checkbox" checked={hasBlitz} onChange={e => setHasBlitz(e.target.checked)} />
                                        闪击 (BLITZ)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-sky-400">
                                        <input type="checkbox" checked={isFlying} onChange={e => setIsFlying(e.target.checked)} />
                                        飞行 (FLYING)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-orange-400">
                                        <input type="checkbox" checked={isSupport} onChange={e => setIsSupport(e.target.checked)} />
                                        支援 (SUPPORT)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-gray-300">
                                        <input type="checkbox" checked={hasTaunt} onChange={e => setHasTaunt(e.target.checked)} />
                                        嘲讽 (TAUNT)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-cyan-400">
                                        <input type="checkbox" checked={hasShield} onChange={e => setHasShield(e.target.checked)} />
                                        护盾 (SHIELD)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-lime-400">
                                        <input type="checkbox" checked={isRegen} onChange={e => setIsRegen(e.target.checked)} />
                                        再生 (REGEN)
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-green-600">
                                        <input type="checkbox" checked={isPoisonous} onChange={e => setIsPoisonous(e.target.checked)} />
                                        剧毒 (POISON)
                                    </label>
                                </div>
                             </div>
                        )}

                        {/* Description */}
                        <div className="space-y-4 p-4 border border-gray-800 bg-gray-900/20 rounded">
                            <h3 className="text-sm font-bold text-blue-500 tracking-widest uppercase mb-2">效果逻辑</h3>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">描述 / DESCRIPTION</label>
                                <textarea 
                                    value={desc} 
                                    onChange={e => setDesc(e.target.value)} 
                                    className="w-full bg-black border border-gray-700 p-2 text-white h-20 text-xs" 
                                    placeholder="例如: [部署]: 造成 2 点伤害。"
                                />
                                <div className="text-[9px] text-gray-500 mt-1">可用触发器: [部署], [亡语], [攻击时], [联动], [事件]</div>
                            </div>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">背景描述 / FLAVOR</label>
                                <input value={flavor} onChange={e => setFlavor(e.target.value)} className="w-full bg-black border border-gray-700 p-2 text-gray-400 italic text-xs" />
                            </div>
                            <div>
                                <label className="block text-xs text-red-500 mb-1 mt-2">DEFCON 影响: {defconImpact}</label>
                                <input type="range" min="-2" max="0" step="1" value={defconImpact} onChange={e => setDefconImpact(parseInt(e.target.value))} className="w-full accent-red-500" />
                            </div>
                        </div>

                        <button onClick={handleSave} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-black font-black tracking-[0.2em] flex items-center justify-center gap-2 transition-all">
                            <Save size={20} /> 生成蓝图
                        </button>

                    </div>
                </div>

                {/* Right: Preview & Library */}
                <div className="w-1/2 flex flex-col bg-[#050505]">
                    <div className="h-1/2 flex flex-col items-center justify-center border-b border-gray-800 p-8 relative">
                        <div className="absolute top-4 left-4 text-xs font-bold text-gray-600 tracking-widest">VISUAL PREVIEW</div>
                        <div className="transform scale-125">
                            <CardComponent card={previewCard} isPlayed={false} disabled={false} isCompendium={true} showKeywords={true} />
                        </div>
                    </div>
                    <div className="h-1/2 flex flex-col">
                        <div className="p-4 border-b border-gray-800 bg-gray-900/30 text-xs font-bold text-gray-400 tracking-widest">
                            本地蓝图 ({existingCustomCards.length})
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {existingCustomCards.map(c => (
                                <div key={c.id} className="relative group">
                                     <div className="transform scale-75 origin-top-left">
                                         <CardComponent card={c} isPlayed={false} disabled={true} isCompendium={true} />
                                     </div>
                                     <button 
                                        onClick={() => onDelete(c.id)}
                                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Blueprint"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                     <div className="absolute bottom-4 left-2 text-[10px] text-gray-500 font-mono">{c.name}</div>
                                </div>
                            ))}
                            {existingCustomCards.length === 0 && <div className="col-span-3 text-center text-gray-600 text-xs py-10">暂无自定义蓝图。</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};