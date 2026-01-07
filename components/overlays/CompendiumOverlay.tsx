
import React, { useState } from 'react';
import { Card, FactionId } from '../../types';
import { getCompendiumCards } from '../../constants';
import { CardComponent } from '../CardComponent';
import { Database, X } from 'lucide-react';

interface CompendiumProps {
    onClose: () => void;
    customCards: Card[];
}

export const CompendiumOverlay: React.FC<CompendiumProps> = ({ onClose, customCards }) => {
    const [activeTab, setActiveTab] = useState<FactionId>(FactionId.NATO);
    // Merge standard compendium cards with custom cards for the selected faction
    const standardCards = getCompendiumCards(activeTab);
    const factionCustomCards = customCards.filter(c => c.faction === activeTab).map(c => ({...c, id: `view_${c.id}`}));
    const cards = [...factionCustomCards, ...standardCards];

    const getFactionLabel = (f: FactionId) => {
        switch(f) {
            case FactionId.NATO: return '北大西洋';
            case FactionId.WARSAW: return '红色联盟';
            case FactionId.PACIFIC: return '泛亚防卫';
            case FactionId.ZERG: return '异虫群落';
            default: return f;
        }
    }

    return (
        <div className="fixed inset-0 z-[150] bg-black/95 text-gray-200 font-mono flex flex-col animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10 pointer-events-none"></div>
            
            {/* Header */}
            <div className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-black/80 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Database size={32} className="text-green-500" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: 'Black Ops One' }}>单位数据库</h1>
                        <div className="text-xs text-green-600 font-bold tracking-[0.5em]">机密档案</div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded border border-gray-700 hover:border-gray-500 transition-all">
                    <X size={24} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-8 py-6 bg-black/60 border-b border-gray-800 overflow-x-auto">
                {Object.values(FactionId).map(f => (
                    <button
                        key={f}
                        onClick={() => setActiveTab(f)}
                        className={`
                            px-8 py-2 text-sm font-black tracking-widest uppercase transition-all clip-path-polygon border-b-2
                            ${activeTab === f 
                                ? (f === FactionId.NATO ? 'border-blue-500 text-blue-500 bg-blue-900/20' : f === FactionId.WARSAW ? 'border-red-500 text-red-500 bg-red-900/20' : f === FactionId.PACIFIC ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20' : 'border-purple-500 text-purple-500 bg-purple-900/20') 
                                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'}
                        `}
                    >
                        {getFactionLabel(f)}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8 bg-black/40 scrollbar-hide">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                    {cards.map(card => (
                        <div key={card.id} className="flex justify-center transform hover:scale-110 transition-transform duration-200 hover:z-50 relative">
                            <CardComponent card={card} isPlayed={false} disabled={true} isCompendium={true} showKeywords={true} />
                            {card.isCustom && <div className="absolute -bottom-6 text-[10px] text-blue-400 font-bold tracking-widest bg-blue-900/30 px-2 py-0.5 rounded border border-blue-500/50">CUSTOM</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
