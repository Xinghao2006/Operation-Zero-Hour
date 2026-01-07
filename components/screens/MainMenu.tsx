

import React, { useState, useEffect } from 'react';
import { FactionId, Card, CardType, Rarity, GameMode } from '../../types';
import { FACTION_DESCRIPTIONS, getCompendiumCards } from '../../constants';
import { CAMPAIGN_LEVELS } from '../../logic/campaignData';
import { audioEngine } from '../../services/audioEngine';
import { Database, Hammer, Projector, Swords, Map, ChevronLeft, Play, Star, Crosshair, Cpu, Activity, ScanLine, Shield, Zap, Radiation, Shuffle, ArrowRight, Factory, Droplet, Info } from 'lucide-react';
import { CardComponent } from '../CardComponent';

interface MainMenuProps {
  selectedFaction: FactionId;
  setSelectedFaction: (f: FactionId) => void;
  onStartGame: (f: FactionId, mode: GameMode) => void; // Updated
  onStartCampaignLevel?: (id: string) => void; 
  onOpenCompendium: () => void;
  onOpenWorkshop: () => void;
  onOpenExhibition: () => void;
}

type MenuSection = 'MAIN' | 'SKIRMISH' | 'CAMPAIGN';

// Define Modes
const GAME_MODES: { id: GameMode; name: string; desc: string; icon: any; color: string, bg: string }[] = [
    { id: 'STANDARD', name: '标准交战', desc: '经典规则。平衡的资源与科技发展，从零开始建立你的军队。', icon: Shield, color: 'text-gray-300', bg: 'bg-gray-800' },
    { id: 'DEFCON_1', name: '核子危机', desc: '高压生存模式。初始 DEFCON 2，任何战略误判都将导致核毁灭。', icon: Radiation, color: 'text-red-600', bg: 'bg-red-950/40' },
    { id: 'CHAOS', name: '混乱轮盘', desc: '全阵营随机卡组。北约空军配合异虫大军？一切皆有可能。', icon: Shuffle, color: 'text-purple-500', bg: 'bg-purple-950/40' },
    { id: 'BLOOD_MONEY', name: '鲜血筹码', desc: '生命即货币。使用 HP 支付卡牌费用。造成伤害可治疗指挥部。', icon: Droplet, color: 'text-rose-500', bg: 'bg-rose-950/40' },
];

const BLOOD_MONEY_TRAITS: Record<FactionId, { name: string, desc: string }> = {
    [FactionId.NATO]: { name: '隐秘行动', desc: '情报优势：所有 [事件卡] 不消耗生命值。' },
    [FactionId.WARSAW]: { name: '战争债券', desc: '重型补贴：费用 4+ 的单位 HP消耗减少 2 点。' },
    [FactionId.PACIFIC]: { name: '能量过载', desc: '护盾转攻：拥有 [护盾] 的单位获得 +2 攻击力。' },
    [FactionId.ZERG]: { name: '极度饥渴', desc: '代谢增强：全员 +1 攻击力。回合结束受代谢伤害 (1点/2单位)。' }
};

// --- NEW COMPONENT: SCHEMATIC VIEWER ---
const SchematicViewer: React.FC = () => {
    const [unit, setUnit] = useState<Card | null>(null);
    const [animKey, setAnimKey] = useState(0);

    // Pool of cool units (Memoized to prevent recalc)
    const [pool] = useState(() => {
        const all: Card[] = [];
        [FactionId.NATO, FactionId.WARSAW, FactionId.PACIFIC, FactionId.ZERG].forEach(f => {
            const factionCards = getCompendiumCards(f);
            all.push(...factionCards.filter(c => 
                c.type === CardType.UNIT && 
                (c.rarity === Rarity.LEGENDARY || c.rarity === Rarity.RARE || c.cost >= 4)
            ));
        });
        return all;
    });

    useEffect(() => {
        const pick = () => {
            if (pool.length === 0) return;
            const rnd = pool[Math.floor(Math.random() * pool.length)];
            setUnit(rnd);
            setAnimKey(p => p + 1);
        };
        pick(); // Initial pick
        const interval = setInterval(pick, 8000); // Switch every 8s
        return () => clearInterval(interval);
    }, [pool]);

    if (!unit) return (
        <div className="w-full h-full flex items-center justify-center border-2 border-gray-800 bg-black/40 text-gray-600 font-mono text-xs">
            <Activity className="animate-pulse mr-2" /> CONNECTING TO DATABASE...
        </div>
    );

    // Generate pseudo-tech specs
    const specs = [
        { label: "CLASS", val: unit.rarity === Rarity.LEGENDARY ? "EXPERIMENTAL" : "HEAVY ASSAULT" },
        { label: "MASS", val: `${(unit.cost * 15.2 + (Math.random() * 5)).toFixed(1)} T` },
        { label: "POWER", val: unit.cost > 5 ? "FUSION REACTOR" : "DIESEL HYBRID" },
        { label: "ARMOR", val: `${(unit.defense || 0) * 80}mm RHA` },
        { label: "CALIBER", val: `MK-${unit.attack} ${unit.faction === FactionId.ZERG ? 'BIO-ACID' : 'KINETIC'}` },
        { label: "SPEED", val: `${unit.hasBlitz ? 'HIGH' : 'STD'} / ${unit.isFlying ? 'MACH 2' : 'GROUND'}` },
    ];

    // Faction Color Theme
    const getColor = (f: FactionId) => {
        switch(f) {
            case FactionId.NATO: return 'text-blue-500 border-blue-500/30 bg-blue-500';
            case FactionId.WARSAW: return 'text-red-500 border-red-500/30 bg-red-500';
            case FactionId.PACIFIC: return 'text-yellow-500 border-yellow-500/30 bg-yellow-500';
            case FactionId.ZERG: return 'text-purple-500 border-purple-500/30 bg-purple-500';
        }
    };
    const themeClass = getColor(unit.faction);
    const textClass = themeClass.split(' ')[0];
    const borderClass = themeClass.split(' ')[1];

    return (
        <div key={animKey} className={`relative w-full max-w-lg aspect-square border-2 ${borderClass} bg-black/80 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-700`}>
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                 {/* Corner Brackets */}
                 <div className={`absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 ${borderClass.replace('/30','/80')}`}></div>
                 <div className={`absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 ${borderClass.replace('/30','/80')}`}></div>
            </div>

            {/* Header Info */}
            <div className="absolute top-6 left-8 z-20">
                <div className={`text-[10px] font-black ${textClass} tracking-[0.3em] uppercase animate-pulse flex items-center gap-2`}>
                    <Crosshair size={12} /> TACTICAL BLUEPRINT // {unit.id.split('_')[1] || 'Unknown'}
                </div>
                <div className={`text-3xl font-black text-white uppercase mt-1 tracking-tighter drop-shadow-lg`} style={{ fontFamily: 'Black Ops One' }}>
                    {unit.name}
                </div>
            </div>

            {/* Central Hologram Visualization */}
            <div className="relative z-10 transform scale-[1.6] transition-all duration-500 filter sepia-[0.8] brightness-125 contrast-125 opacity-90">
                 {/* Mix Blend Mode Wrapper to create "Hologram" feel */}
                 <div className="mix-blend-luminosity">
                     <CardComponent card={unit} isPlayed={false} disabled isCompendium />
                 </div>
                 {/* Scanline Overlay on Card */}
                 <div className={`absolute inset-0 z-20 mix-blend-overlay bg-gradient-to-b from-transparent ${themeClass.split(' ')[2].replace('bg-','via-')}/20 to-transparent animate-[pulse_2s_infinite]`}></div>
            </div>

            {/* Scanning Beam Animation */}
            <div className="absolute inset-0 z-30 pointer-events-none animate-[scanVertical_3s_linear_infinite]">
                 <div className={`w-full h-0.5 ${themeClass.split(' ')[2].replace('bg-','bg-')}/80 shadow-[0_0_15px_currentColor]`}></div>
            </div>

            {/* Tech Specs Side Panel */}
            <div className="absolute right-6 top-24 flex flex-col gap-3 text-right z-20">
                {specs.map((s, i) => (
                    <div key={i} className="flex flex-col items-end animate-in slide-in-from-right fade-in duration-500" style={{ animationDelay: `${i * 100 + 300}ms` }}>
                        <span className={`text-[8px] ${textClass} opacity-60 font-bold tracking-widest`}>{s.label}</span>
                        <span className="text-xs text-gray-300 font-mono font-bold">{s.val}</span>
                    </div>
                ))}
            </div>

            {/* Footer Data */}
            <div className={`absolute bottom-6 left-6 right-6 border-t ${borderClass} pt-3 z-20`}>
                <div className={`text-[9px] ${textClass} font-mono leading-relaxed opacity-90 max-w-sm`}>
                    <span className="opacity-50 mr-2">SYS_ANALYSIS:</span>
                    {unit.description.replace(/\[/g, '<').replace(/\]/g, '>')}
                    <br/>
                    <span className="opacity-50 mr-2">FLAVOR_TXT:</span>
                    <span className="text-gray-400 italic">"{unit.flavor}"</span>
                </div>
            </div>
            
            {/* Rotating Rings */}
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border ${borderClass.replace('/30','/10')} rounded-full animate-[spin_20s_linear_infinite] pointer-events-none z-0`}></div>
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border-2 border-dashed ${borderClass.replace('/30','/10')} rounded-full animate-[spin_30s_linear_infinite_reverse] pointer-events-none z-0`}></div>
        </div>
    );
};

export const MainMenu: React.FC<MainMenuProps> = ({ 
    selectedFaction, setSelectedFaction, onStartGame, onStartCampaignLevel, onOpenCompendium, onOpenWorkshop, onOpenExhibition 
}) => {
    const [currentView, setCurrentView] = useState<MenuSection>('MAIN');
    const [skirmishStep, setSkirmishStep] = useState<'MODE' | 'FACTION'>('MODE');
    const [selectedMode, setSelectedMode] = useState<GameMode>('STANDARD');

    const handleNav = (view: MenuSection) => {
        audioEngine.playClick();
        setCurrentView(view);
        setSkirmishStep('MODE'); // Reset skirmish flow
    };

    const getFactionDisplayName = (fid: FactionId) => {
        switch(fid) {
            case FactionId.NATO: return "NATO / 北大西洋联合体";
            case FactionId.WARSAW: return "WARSAW / 红色联盟";
            case FactionId.PACIFIC: return "PACIFIC / 泛亚防卫阵线";
            case FactionId.ZERG: return "ZERG / 异虫群落";
            default: return fid;
        }
    };

    const getFactionStyle = (f: FactionId) => {
        if (selectedFaction === f) {
            switch(f) {
                case FactionId.NATO: return 'bg-blue-900/40 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] ring-1 ring-blue-400';
                case FactionId.WARSAW: return 'bg-red-900/40 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] ring-1 ring-red-400';
                case FactionId.PACIFIC: return 'bg-yellow-900/40 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] ring-1 ring-yellow-400';
                case FactionId.ZERG: return 'bg-purple-900/40 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] ring-1 ring-purple-400';
            }
        }
        return 'bg-black/60 border-gray-800 hover:bg-gray-800 hover:border-gray-500 hover:scale-[1.02] opacity-80 hover:opacity-100';
    };

    // --- SUB-COMPONENTS ---

    const MenuButton = ({ onClick, label, subLabel, icon: Icon, colorClass = "text-white" }: any) => (
        <button 
            onClick={onClick} 
            className="group relative w-full h-20 flex items-center overflow-hidden transition-all duration-300"
        >
            {/* RA3 Button Shape Background */}
            <div className="absolute inset-0 bg-gray-900/80 transform -skew-x-12 border-l-4 border-r-4 border-gray-600 group-hover:bg-red-900/80 group-hover:border-red-500 transition-colors duration-300"></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center justify-between w-full px-8 transform -skew-x-0">
                <div className="flex items-center gap-4">
                     <div className={`p-2 bg-black/50 border border-gray-700 group-hover:border-red-400 group-hover:text-red-400 transition-colors ${colorClass}`}>
                        <Icon size={24} />
                     </div>
                     <div className="text-left">
                        <div className={`text-xl font-black tracking-widest uppercase group-hover:text-white transition-colors ${colorClass}`} style={{ fontFamily: 'Black Ops One' }}>
                            {label}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 tracking-[0.2em] group-hover:text-red-200">
                            {subLabel}
                        </div>
                     </div>
                </div>
                {/* Arrow Decoration */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                    <Play size={16} className="fill-current text-red-500" />
                </div>
            </div>
        </button>
    );

    // --- VIEWS ---

    const renderMainView = () => (
        <div className="w-full h-full flex items-center justify-between px-16">
             {/* Left Column: Menu - Reverted to cleaner style */}
             <div className="flex flex-col justify-center gap-4 w-96 animate-in slide-in-from-left duration-700 z-20">
                <div className="mb-10">
                     <h1 className="text-7xl font-black text-white tracking-tighter mb-2" style={{ fontFamily: 'Black Ops One' }}>
                         代号：零点
                     </h1>
                     <div className="text-lg text-red-600 font-bold tracking-[0.5em] uppercase">
                         Operation: Zero Hour
                     </div>
                     <div className="h-1 w-24 bg-red-600 mt-4"></div>
                </div>

                <MenuButton 
                    onClick={() => handleNav('CAMPAIGN')} 
                    label="战役模式" 
                    subLabel="CAMPAIGN" 
                    icon={Map} 
                    colorClass="text-yellow-500"
                />
                <MenuButton 
                    onClick={() => handleNav('SKIRMISH')} 
                    label="遭遇战" 
                    subLabel="SKIRMISH" 
                    icon={Swords} 
                    colorClass="text-red-500"
                />
                <MenuButton 
                    onClick={() => { audioEngine.playClick(); onOpenWorkshop(); }} 
                    label="研发车间" 
                    subLabel="WORKSHOP" 
                    icon={Hammer} 
                    colorClass="text-orange-500"
                />
                 <MenuButton 
                    onClick={() => { audioEngine.playClick(); onOpenCompendium(); }} 
                    label="数据库" 
                    subLabel="DATABASE" 
                    icon={Database} 
                    colorClass="text-blue-400"
                />
                 <MenuButton 
                    onClick={() => { audioEngine.playClick(); onOpenExhibition(); }} 
                    label="展览馆" 
                    subLabel="EXHIBITION" 
                    icon={Projector} 
                    colorClass="text-purple-500"
                />
                 
                 <div className="mt-8 text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-50">
                     v1.0.4 // System Ready
                 </div>
            </div>

            {/* Right Column: Dynamic Content - KEPT AS REQUESTED */}
            <div className="flex-1 flex items-center justify-center pl-12 animate-in slide-in-from-right duration-1000">
                 <SchematicViewer />
            </div>
        </div>
    );

    const renderSkirmishView = () => (
        <div className="w-full max-w-6xl flex flex-col items-center animate-in zoom-in-95 duration-500 max-h-full overflow-y-auto scrollbar-hide">
            {/* Header */}
            <div className="flex items-center justify-between w-full mb-4 border-b-2 border-red-900/50 pb-2 bg-black/40 px-6 py-3 backdrop-blur-sm shrink-0 sticky top-0 z-50">
                <div>
                    <h2 className="text-3xl font-black text-red-500 tracking-tighter" style={{ fontFamily: 'Black Ops One' }}>
                        遭遇战配置 // {skirmishStep === 'MODE' ? '第一步：选择交战规则' : '第二步：选择指挥官'}
                    </h2>
                    <div className="text-xs text-red-800 font-bold tracking-[0.5em] uppercase">CUSTOM BATTLE CONFIGURATION</div>
                </div>
                <button 
                    onClick={() => {
                        audioEngine.playClick();
                        if (skirmishStep === 'FACTION') setSkirmishStep('MODE');
                        else handleNav('MAIN');
                    }}
                    className="flex items-center gap-2 px-6 py-2 border border-gray-600 hover:border-red-500 hover:text-red-500 hover:bg-red-900/20 transition-all uppercase font-bold text-sm tracking-widest"
                >
                    <ChevronLeft size={16} /> {skirmishStep === 'FACTION' ? '上一步' : '返回'}
                </button>
            </div>
            
            <div className="flex-1 w-full relative min-h-[500px] flex flex-col items-center">
                {/* STEP 1: MODE SELECTION */}
                {skirmishStep === 'MODE' && (
                    <div className="grid grid-cols-2 gap-6 w-full px-4 mb-8 animate-in slide-in-from-right duration-300">
                        {GAME_MODES.map(mode => (
                             <button
                                key={mode.id}
                                onClick={() => { 
                                    audioEngine.playClick(); 
                                    setSelectedMode(mode.id); 
                                    setSkirmishStep('FACTION');
                                }}
                                className={`
                                    relative h-60 border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:scale-[1.02] text-left p-6
                                    ${mode.bg} border-gray-700 hover:border-white/50
                                `}
                             >
                                 <div className="absolute inset-0 bg-gradient-to-br from-black/0 to-black/80"></div>
                                 <div className="relative z-10 flex items-start justify-between">
                                     <div className={`p-3 rounded bg-black/50 border border-gray-600 ${mode.color}`}>
                                         <mode.icon size={32} />
                                     </div>
                                     <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-xs font-black px-3 py-1 uppercase tracking-widest">
                                         选择模式
                                     </div>
                                 </div>

                                 <div className="relative z-10">
                                     <div className={`text-3xl font-black uppercase mb-2 ${mode.color}`} style={{ fontFamily: 'Black Ops One' }}>
                                         {mode.name}
                                     </div>
                                     <div className="text-sm text-gray-400 font-medium leading-relaxed max-w-md">
                                         {mode.desc}
                                     </div>
                                 </div>
                             </button>
                        ))}
                    </div>
                )}

                {/* STEP 2: FACTION SELECTION */}
                {skirmishStep === 'FACTION' && (
                    <div className="w-full flex flex-col items-center animate-in slide-in-from-right duration-300 pb-8">
                        <div className="mb-4 text-gray-500 text-sm font-bold tracking-widest uppercase">
                            当前模式: <span className="text-white ml-2 border-b border-red-500">{GAME_MODES.find(m => m.id === selectedMode)?.name}</span>
                        </div>
                        
                        {/* Blood Money Rules Banner - Compact Version */}
                        {selectedMode === 'BLOOD_MONEY' && (
                            <div className="w-full max-w-5xl mb-4 p-4 border-l-4 border-rose-600 bg-gradient-to-r from-rose-950/60 to-black/60 rounded text-rose-100 shadow-[0_0_20px_rgba(225,29,72,0.15)] animate-in fade-in slide-in-from-top duration-500 relative overflow-hidden">
                                <div className="absolute -top-2 -right-2 opacity-10">
                                     <Droplet size={80} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-1.5 bg-rose-900/50 rounded-full border border-rose-500 text-rose-400">
                                            <Droplet size={16} />
                                        </div>
                                        <h3 className="text-lg font-black text-rose-500 uppercase tracking-widest" style={{ fontFamily: 'Black Ops One' }}>鲜血筹码 // 规则</h3>
                                        <div className="text-[10px] text-rose-400/60 italic ml-auto border-l border-rose-800 pl-2">
                                            * 阵营专属 [鲜血特质] 见下方卡片
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-xs font-mono">
                                         <div className="flex flex-col gap-0.5">
                                             <div className="text-rose-400 font-bold">生命即货币</div>
                                             <span className="text-gray-400 text-[10px]">卡牌消耗 HP 支付</span>
                                         </div>
                                         <div className="flex flex-col gap-0.5">
                                             <div className="text-rose-400 font-bold">吸血机制</div>
                                             <span className="text-gray-400 text-[10px]">造成伤害的 50% 治疗指挥部</span>
                                         </div>
                                         <div className="flex flex-col gap-0.5">
                                             <div className="text-rose-400 font-bold">无限火力</div>
                                             <span className="text-gray-400 text-[10px]">AP 锁定 50，无行动限制</span>
                                         </div>
                                         <div className="flex flex-col gap-0.5">
                                             <div className="text-rose-400 font-bold">极速补给</div>
                                             <span className="text-gray-400 text-[10px]">回合结束额外抽 1 张牌</span>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-4 w-full px-4 mb-8">
                            {[FactionId.NATO, FactionId.WARSAW, FactionId.PACIFIC, FactionId.ZERG].map(f => {
                              const bmTrait = selectedMode === 'BLOOD_MONEY' ? BLOOD_MONEY_TRAITS[f] : null;
                              return (
                              <button 
                                key={f} 
                                onClick={() => { audioEngine.playClick(); setSelectedFaction(f); }} 
                                className={`
                                    relative group h-[320px] transition-all duration-300 flex flex-col overflow-hidden clip-path-polygon
                                    ${getFactionStyle(f)}
                                `}
                                style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%)' }}
                              >
                                {/* Faction Background Image Placeholder / Tint */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80"></div>
                                
                                <div className="p-4 flex-1 flex flex-col items-center text-center relative z-10 w-full">
                                     <div className={`text-xl font-black mb-3 mt-2 ${f === FactionId.NATO ? 'text-blue-500' : f === FactionId.WARSAW ? 'text-red-500' : f === FactionId.PACIFIC ? 'text-yellow-500' : 'text-purple-500'}`} style={{ fontFamily: 'Black Ops One' }}>
                                         {getFactionDisplayName(f).split(' / ')[0]}
                                     </div>
                                     <div className="h-[1px] w-8 bg-current mb-3 opacity-50"></div>
                                     <div className="text-[10px] text-gray-300 font-medium leading-relaxed px-2 opacity-80 group-hover:opacity-100 transition-opacity mb-auto">
                                         {FACTION_DESCRIPTIONS[f]}
                                     </div>
                                     
                                     {/* Blood Money Trait Card */}
                                     {bmTrait && (
                                         <div className="mt-2 w-full bg-rose-950/40 border border-rose-500/30 p-1.5 rounded text-rose-200">
                                            <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-0.5 flex items-center justify-center gap-1">
                                                <Zap size={8} /> {bmTrait.name}
                                            </div>
                                            <div className="text-[9px] leading-tight opacity-90 scale-90 origin-top">{bmTrait.desc}</div>
                                         </div>
                                     )}
                                </div>
                                
                                <div className={`w-full py-2 text-center text-[9px] tracking-[0.3em] uppercase font-black transition-colors ${selectedFaction === f ? 'bg-white text-black' : 'bg-black/50 text-gray-500'}`}>
                                    {selectedFaction === f ? '已就绪' : '点击选择'}
                                </div>
                              </button>
                            );})}
                        </div>

                        <button 
                            onClick={() => onStartGame(selectedFaction, selectedMode)} 
                            className="px-24 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg tracking-[0.2em] transition-all hover:shadow-[0_0_50px_rgba(220,38,38,0.6)] transform hover:-translate-y-1 relative overflow-hidden group"
                            style={{ clipPath: 'polygon(5% 0, 100% 0, 100% 80%, 95% 100%, 0 100%, 0 20%)' }}
                        >
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                            <div className="relative z-10 flex items-center gap-4 group-hover:gap-6 transition-all">
                                <Swords size={20} />
                                初始化战场
                                <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCampaignView = () => (
        <div className="w-full max-w-6xl flex flex-col items-center animate-in fade-in duration-500 h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between w-full mb-4 border-b border-yellow-900/50 pb-4 bg-black/60 px-8 py-4 backdrop-blur-sm">
                <div>
                    <h2 className="text-4xl font-black text-yellow-500 tracking-tighter" style={{ fontFamily: 'Black Ops One' }}>铁幕史诗</h2>
                    <div className="text-xs text-yellow-800 font-bold tracking-[0.5em] uppercase">机密行动</div>
                </div>
                <button 
                    onClick={() => handleNav('MAIN')}
                    className="flex items-center gap-2 px-6 py-2 border border-gray-600 hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-900/20 transition-all uppercase font-bold text-sm tracking-widest"
                >
                    <ChevronLeft size={16} /> 返回指挥部
                </button>
            </div>

            {/* Campaign Map / Level List */}
            <div className="flex-1 w-full overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 scrollbar-hide">
                {CAMPAIGN_LEVELS.map((level, idx) => (
                    <button 
                        key={level.id}
                        onClick={() => { if(onStartCampaignLevel) onStartCampaignLevel(level.id); }}
                        className="relative group bg-black/60 border border-gray-800 hover:border-yellow-500 hover:bg-yellow-900/10 transition-all text-left p-6 flex flex-col h-64"
                    >
                        {/* Map or Image Placeholder */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] opacity-10 group-hover:opacity-20 transition-opacity"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-4xl font-black text-gray-800 group-hover:text-yellow-500/50 transition-colors">0{idx + 1}</div>
                                <div className="bg-yellow-900/30 text-yellow-500 text-[10px] font-bold px-2 py-1 border border-yellow-700/50">
                                    {level.playerFaction} 行动
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-200 group-hover:text-white mb-2">{level.title}</h3>
                            <p className="text-xs text-gray-500 group-hover:text-gray-400 leading-relaxed mb-4 min-h-[3rem]">{level.description}</p>
                            
                            <div className="mt-auto flex items-center gap-2 text-xs font-mono text-gray-600 group-hover:text-yellow-500">
                                <Star size={12} fill="currentColor" />
                                <span>任务简报可用</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#050505] font-mono relative z-50 overflow-hidden">
          {/* Background Layers */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-40"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black opacity-80 pointer-events-none"></div>
          <div className="scanlines"></div>
          
          {/* Main Layout Container */}
          <div className="relative z-10 w-full h-screen flex items-center">
             
             {/* Main View Split (Left: Menu, Right: Schematics) */}
             {currentView === 'MAIN' && renderMainView()}

             {/* Full Screen Content (Skirmish / Campaign) */}
             {currentView !== 'MAIN' && (
                 <div className="w-full h-full flex items-center justify-center p-8 bg-black/60">
                     {currentView === 'SKIRMISH' && renderSkirmishView()}
                     {currentView === 'CAMPAIGN' && renderCampaignView()}
                 </div>
             )}
          </div>
        </div>
     );
};