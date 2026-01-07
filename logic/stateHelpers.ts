

import { GameState, PlayerState } from '../types';

export const cloneState = (state: GameState): GameState => {
    return JSON.parse(JSON.stringify(state));
};

export const finalizeGameState = (state: GameState): GameState => {
    let { defcon, players, currentPlayerId, logs, gameOver, winnerId } = state;
    const p1 = players[0];
    const p2 = players[1];

    if (defcon <= 0) { 
        gameOver = true; 
        winnerId = p1.id === currentPlayerId ? p2.id : p1.id; 
        logs.push("☢️ 核冬天降临。"); 
    }
    
    if (p1.hp <= 0) { gameOver = true; winnerId = p2.id; }
    if (p2.hp <= 0) { gameOver = true; winnerId = p1.id; }

    return {
        ...state,
        gameOver,
        winnerId,
        logs
    };
};