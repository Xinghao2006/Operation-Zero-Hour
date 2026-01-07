

import React from 'react';

interface DragArrowProps {
    dragSourceId: string | null;
    dragStartPos: { x: number, y: number } | null;
    mousePos: { x: number, y: number } | null;
    hoverTargetId: string | null;
}

export const DragArrow: React.FC<DragArrowProps> = ({ dragSourceId, dragStartPos, mousePos, hoverTargetId }) => {
    if (!dragSourceId || !dragStartPos || !mousePos) return null;
    const deltaX = mousePos.x - dragStartPos.x;
    const deltaY = mousePos.y - dragStartPos.y;
    const cx = dragStartPos.x + deltaX * 0.5;
    const cy = dragStartPos.y + deltaY * 0.1 - 50; 
    
    // Color logic
    let color = '#22c55e'; // Green (default / board move)
    
    // Check if dragging from hand? 
    // We don't have dragSourceType here directly, but we can infer from hoverTargetId='play_drop_zone'
    // Or if dragStartPos is low on screen (simple heuristic)
    const isFromHand = dragStartPos.y > window.innerHeight - 200;

    const isEnemyTarget = hoverTargetId === 'enemy_hq' || (hoverTargetId && typeof hoverTargetId === 'string' && (hoverTargetId.startsWith('NATO') || hoverTargetId.startsWith('WAR') || hoverTargetId.startsWith('PAC')));
    
    if (isFromHand) {
        color = '#3b82f6'; // Blue for deployment
    } else if (isEnemyTarget) {
        color = '#ef4444'; // Red for attack
    } else if (hoverTargetId === 'combat_zone_drop') {
        color = '#eab308'; // Yellow for move to combat
    }

    return (
      <svg className="fixed inset-0 pointer-events-none z-[100]" style={{ overflow: 'visible' }}>
         <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={color} /></marker></defs>
         <path d={`M ${dragStartPos.x} ${dragStartPos.y} Q ${cx} ${cy} ${mousePos.x} ${mousePos.y}`} stroke={color} strokeWidth="4" fill="none" strokeDasharray="10,5" markerEnd="url(#arrowhead)" className="animate-pulse" />
      </svg>
    );
};