
import React from 'react';
import { GameState } from '../../types';
import { Radiation, AlertOctagon, ShieldCheck, Skull, RefreshCw, ArrowRight } from 'lucide-react';

interface GameOverScreenProps {
  gameState: GameState;
  onRestart: () => void;
  onNextLevel?: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ gameState, onRestart, onNextLevel }) => {
    const isCampaignWin = gameState.isCampaign && gameState.winnerId === 'player';

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-1000 ${gameState.defcon <= 0 ? 'bg-[#1a0500]/95' : 'bg-black/95'}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-20 pointer-events-none"></div>
            
            {/* DEFCON 0 / NUCLEAR ENDING */}
            {gameState.defcon <= 0 ? (
                <div className="relative z-10 flex flex-col items-center text-center px-4">
                     <Radiation size={120} className="text-orange-600 animate-[spin_10s_linear_infinite] mb-8" />
                     <h1 className="text-7xl font-black mb-2 tracking-tighter text-orange-500 glitch-text" style={{ fontFamily: 'Black Ops One' }}>
                        {gameState.winnerId === 'player' ? '避难所已封锁' : '相互保证毁灭'}
                     </h1>
                     <div className="h-1 w-32 bg-orange-800 mb-6"></div>
                     <p className="text-orange-200/80 mb-8 max-w-2xl font-mono text-lg leading-relaxed">
                        {gameState.winnerId === 'player' 
                            ? "敌方启动了发射程序。虽然我们拦截了大部分弹头，但地表已经沦陷。避难所大门已关闭，文明进入了新的黑暗时代。"
                            : "你启动了终极协议。废土之上没有赢家。世界陷入了死寂。"}
                     </p>
                     <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-black/50 px-4 py-2 border border-red-900 animate-pulse">
                         <AlertOctagon size={16} /> 辐射水平: 极度危险 (CRITICAL)
                     </div>
                </div>
            ) : (
                /* STANDARD MILITARY ENDING */
                <div className="relative z-10 flex flex-col items-center text-center px-4">
                     {gameState.winnerId === 'player' ? (
                         <ShieldCheck size={120} className="text-green-500 mb-8 drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                     ) : (
                         <Skull size={120} className="text-red-600 mb-8 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
                     )}
                     
                     <h1 className={`text-8xl font-black mb-4 tracking-tighter ${gameState.winnerId === 'player' ? 'text-green-500' : 'text-red-600'}`} style={{ fontFamily: 'Black Ops One' }}>
                        {gameState.winnerId === 'player' ? '任务完成' : '信号丢失'}
                     </h1>
                     
                     <p className="text-gray-400 mb-8 max-w-md text-center font-mono text-lg">
                        {gameState.winnerId === 'player' 
                            ? (gameState.isCampaign ? '目标已清除。准备接受下一阶段指令。' : '敌方指挥体系已瓦解。全球和平已恢复。')
                            : '指挥链路中断。HQ 已被攻陷。行动失败。'}
                     </p>
                </div>
            )}

            <div className="mt-12 flex gap-4">
                <button onClick={onRestart} className={`flex items-center gap-2 px-10 py-4 font-black tracking-widest text-xl border transition-all hover:scale-105 ${gameState.defcon <= 0 ? 'bg-orange-950 text-orange-500 border-orange-800 hover:bg-orange-900' : 'bg-gray-900 text-white border-gray-700 hover:bg-gray-800'}`}>
                    <RefreshCw size={24} /> {gameState.isCampaign && gameState.winnerId === 'player' ? '重玩本关' : '重启系统'}
                </button>
                
                {isCampaignWin && onNextLevel && (
                    <button onClick={onNextLevel} className="flex items-center gap-2 px-10 py-4 font-black tracking-widest text-xl border border-yellow-500 bg-yellow-900/40 text-yellow-500 hover:bg-yellow-900/60 hover:scale-105 transition-all">
                        <ArrowRight size={24} /> 下一任务
                    </button>
                )}
            </div>
        </div>
    );
};
