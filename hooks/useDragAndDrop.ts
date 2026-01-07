import React, { useState, useEffect } from 'react';
import { GameState } from '../types';

interface DragState {
    dragSourceId: string | null;
    dragSourceType: 'hand' | 'board' | null;
    dragStartPos: { x: number, y: number } | null;
    mousePos: { x: number, y: number } | null;
    hoverTargetId: string | null;
}

export const useDragAndDrop = (
    gameState: GameState | null, 
    handleCombat: (attackerId: string, targetType: 'unit' | 'hq', targetId?: string) => void,
    handleMoveToCombat: (unitId: string) => void,
    handlePlayCard: (cardId: string, targetId?: string) => void
) => {
    const [dragState, setDragState] = useState<DragState>({
        dragSourceId: null,
        dragSourceType: null,
        dragStartPos: null,
        mousePos: null,
        hoverTargetId: null
    });

    const startDrag = (e: React.MouseEvent, id: string, type: 'hand' | 'board') => {
        e.preventDefault();
        const rect = (e.currentTarget as Element).getBoundingClientRect();
        setDragState({
            dragSourceId: id,
            dragSourceType: type,
            dragStartPos: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            mousePos: { x: e.clientX, y: e.clientY },
            hoverTargetId: null
        });
    };

    useEffect(() => {
        if (!dragState.dragSourceId) return;

        const handleMouseMove = (e: MouseEvent) => {
            setDragState(prev => ({ ...prev, mousePos: { x: e.clientX, y: e.clientY } }));
            
            const el = document.elementFromPoint(e.clientX, e.clientY);
            
            // Prioritize drop zones
            const playAreaEl = el?.closest('[data-type="play-area"]');
            const unitEl = el?.closest('[data-type="unit"]');
            const hqEl = el?.closest('[data-type="hq"]');
            const combatZoneEl = el?.closest('[data-type="combat-zone"]');
            
            let tid: string | null = null;
            
            if (dragState.dragSourceType === 'board') {
                if (unitEl && unitEl.getAttribute('data-side') === 'enemy') {
                    tid = unitEl.getAttribute('data-id');
                } else if (hqEl && hqEl.getAttribute('data-side') === 'enemy') {
                    tid = 'enemy_hq';
                } else if (combatZoneEl) {
                    tid = 'combat_zone_drop';
                }
            } else if (dragState.dragSourceType === 'hand') {
                // If dragging from hand
                if (unitEl) {
                    // Hovering over a unit (friendly or enemy)
                    // Used for Event Targeting or Buffs
                    tid = unitEl.getAttribute('data-id');
                } else if (hqEl && hqEl.getAttribute('data-side') === 'enemy') {
                    tid = 'enemy_hq';
                } else if (playAreaEl || combatZoneEl) {
                    tid = 'play_drop_zone';
                }
            }

            setDragState(prev => ({ ...prev, hoverTargetId: tid }));
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!dragState.dragSourceId) return;

            const el = document.elementFromPoint(e.clientX, e.clientY);
            
            if (dragState.dragSourceType === 'board') {
                 const unitEl = el?.closest('[data-type="unit"]');
                 const hqEl = el?.closest('[data-type="hq"]');
                 const combatZoneEl = el?.closest('[data-type="combat-zone"]');
                 
                 if (unitEl && unitEl.getAttribute('data-side') === 'enemy') {
                     const tid = unitEl.getAttribute('data-id');
                     if (tid) handleCombat(dragState.dragSourceId, 'unit', tid);
                 } else if (hqEl && hqEl.getAttribute('data-side') === 'enemy') {
                     handleCombat(dragState.dragSourceId, 'hq');
                 } else if (combatZoneEl) {
                     handleMoveToCombat(dragState.dragSourceId);
                 }
            } else if (dragState.dragSourceType === 'hand') {
                 // Drop logic for Hand cards
                 const unitEl = el?.closest('[data-type="unit"]');
                 const hqEl = el?.closest('[data-type="hq"]');
                 const playAreaEl = el?.closest('[data-type="play-area"]');
                 const combatZoneEl = el?.closest('[data-type="combat-zone"]');

                 if (unitEl) {
                     // Dropped on unit (targeted event?)
                     const targetId = unitEl.getAttribute('data-id');
                     if (targetId) handlePlayCard(dragState.dragSourceId, targetId);
                 } else if (hqEl && hqEl.getAttribute('data-side') === 'enemy') {
                     // Dropped on enemy HQ (targeted event?)
                     handlePlayCard(dragState.dragSourceId, 'enemy_hq');
                 } else if (playAreaEl || combatZoneEl) {
                     // Dropped on board (generic play)
                     handlePlayCard(dragState.dragSourceId);
                 }
            }

            setDragState({
                dragSourceId: null,
                dragSourceType: null,
                dragStartPos: null,
                mousePos: null,
                hoverTargetId: null
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState.dragSourceId, gameState]);

    return { dragState, startDrag };
};