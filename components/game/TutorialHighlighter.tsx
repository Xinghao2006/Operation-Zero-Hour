
import React, { useEffect, useState, useRef } from 'react';
import { MousePointer2 } from 'lucide-react';

interface TutorialHighlighterProps {
    targetId?: string;
    destId?: string; // New: Destination ID for ghost animation
    message?: string;
}

export const TutorialHighlighter: React.FC<TutorialHighlighterProps> = ({ targetId, destId, message }) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [destRect, setDestRect] = useState<DOMRect | null>(null);

    const getElement = (id: string) => {
         let el = document.getElementById(id);
         if (!el) el = document.querySelector(`[data-id="${id}"]`);
         if (!el) el = document.querySelector(`[data-tech-id="${id}"]`);
         if (!el && id.startsWith('card-hand-')) {
             // Try strict id matching again if component updated
             el = document.getElementById(id);
         }
         return el;
    };

    const updateRects = () => {
        if (targetId) {
            const el = getElement(targetId);
            if (el) setTargetRect(el.getBoundingClientRect());
            else setTargetRect(null);
        } else {
            setTargetRect(null);
        }

        if (destId) {
            const el = getElement(destId);
            if (el) setDestRect(el.getBoundingClientRect());
            else setDestRect(null);
        } else {
            setDestRect(null);
        }
    };

    useEffect(() => {
        updateRects();
        const interval = setInterval(updateRects, 100);
        window.addEventListener('resize', updateRects);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateRects);
        };
    }, [targetId, destId]);

    if (!targetId || !targetRect) return null;

    // Fixed Position for Tutorial Box 
    // Top right, but to the left of the 16rem (approx 256px) sidebar
    const boxStyle = {
        top: '6rem', 
        right: '18rem', // 16rem sidebar + 2rem spacing
    };

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
            
            {/* Highlight Box on Source */}
            <div 
                className="absolute border-4 border-yellow-500 rounded-lg animate-pulse shadow-[0_0_30px_rgba(234,179,8,0.8)] transition-all duration-300"
                style={{
                    top: targetRect.top - 4,
                    left: targetRect.left - 4,
                    width: targetRect.width + 8,
                    height: targetRect.height + 8
                }}
            >
                {/* Arrow (Only if no ghost animation to avoid clutter) */}
                {!destId && (
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
                        <div className="text-yellow-500 font-black text-2xl rotate-180">V</div>
                        <div className="w-1 h-8 bg-yellow-500"></div>
                    </div>
                )}
            </div>

            {/* Highlight Box on Dest */}
            {destId && destRect && (
                 <div 
                    className="absolute border-4 border-green-500 border-dashed rounded-lg opacity-50"
                    style={{
                        top: destRect.top - 4,
                        left: destRect.left - 4,
                        width: destRect.width + 8,
                        height: destRect.height + 8
                    }}
                />
            )}

            {/* Ghost Hand Animation */}
            {destId && destRect && (
                <div 
                    className="absolute z-50 drop-shadow-2xl pointer-events-none"
                    style={{
                        // Initial position (will be animated)
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        animation: 'ghost-drag 2s infinite ease-in-out forwards'
                    }}>
                         <MousePointer2 size={48} className="text-white fill-white drop-shadow-[0_0_10px_black] stroke-black stroke-2" />
                    </div>

                    <style>{`
                        @keyframes ghost-drag {
                            0% { top: ${targetRect.top + targetRect.height/2}px; left: ${targetRect.left + targetRect.width/2}px; transform: scale(1); opacity: 0; }
                            10% { opacity: 1; transform: scale(1); }
                            20% { top: ${targetRect.top + targetRect.height/2}px; left: ${targetRect.left + targetRect.width/2}px; transform: scale(0.9); } /* Click down */
                            80% { top: ${destRect.top + destRect.height/2}px; left: ${destRect.left + destRect.width/2}px; transform: scale(0.9); opacity: 1; } /* Drag to dest */
                            100% { top: ${destRect.top + destRect.height/2}px; left: ${destRect.left + destRect.width/2}px; transform: scale(1); opacity: 0; } /* Release */
                        }
                    `}</style>
                </div>
            )}

            {/* Message Box - Fixed Position */}
            {message && (
                <div 
                    className="absolute bg-blue-900/90 border-2 border-yellow-500 text-white p-4 rounded-xl shadow-2xl max-w-sm backdrop-blur-md animate-in slide-in-from-right duration-500 pointer-events-auto"
                    style={boxStyle}
                >
                    <div className="text-xs text-yellow-500 font-bold uppercase tracking-widest mb-2">TUTORIAL UPLINK</div>
                    <div className="text-sm font-medium whitespace-pre-line leading-relaxed">
                        {message}
                    </div>
                </div>
            )}
        </div>
    );
};
