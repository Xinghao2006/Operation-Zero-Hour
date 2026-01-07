
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DefconProps {
  level: number;
}

export const DefconDisplay: React.FC<DefconProps> = ({ level }) => {
  const getColor = (lvl: number) => {
    if (lvl === 1) return 'text-red-600 animate-pulse';
    if (lvl === 2) return 'text-orange-600';
    if (lvl === 3) return 'text-yellow-500';
    return 'text-green-600';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 w-full justify-between mb-1">
        <span className="text-[10px] text-gray-400 font-bold">DEFCON STATUS</span>
        <span className={`text-xl font-black font-mono ${getColor(level)}`}>{level}</span>
      </div>
      
      <div className="w-full flex gap-1 h-1.5 mb-2">
          {[5, 4, 3, 2, 1].map((num) => (
             <div 
               key={num} 
               className={`flex-1 rounded-sm ${level <= num ? (num === 1 ? 'bg-red-600' : num <= 3 ? 'bg-yellow-600' : 'bg-green-600') : 'bg-gray-800'}`}
             />
          ))}
      </div>

      {level <= 1 && (
        <div className="text-red-500 font-bold text-[9px] flex items-center gap-1 animate-pulse">
          <AlertTriangle size={10} /> NUCLEAR LAUNCH DETECTED
        </div>
      )}
    </div>
  );
};
