import React from 'react';

export default function MachineCard({ machine, onClick }) {
  const isStopped = machine.estado === 'paro';

  return (
    <div 
      className={`card-maquina ${isStopped ? 'stopped' : ''}`}
      onClick={onClick}
    >
      <span className="maquina-id">
        {machine.numero.toString().padStart(2, '0')}
      </span>
      
      {isStopped && (
        <span className="stop-timer">0 min</span>
      )}

      {/* Decorative pulse for active machines (optional from original logic) */}
      {!isStopped && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white/20 rounded-full" />
      )}
    </div>
  );
}
