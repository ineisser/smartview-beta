import React, { useState } from 'react';
import { X, ChevronDown, AlertTriangle, Play } from 'lucide-react';
import { MOTIVOS_PARO } from '../data/motivos-paro';

export default function StopModal({ machine, onClose, onConfirm }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const isStopped = machine.estado === 'paro';

  const handleConfirm = () => {
    if (isStopped) {
      onConfirm(machine.id, 'produccion', '');
    } else {
      if (!selectedReason) return alert('Por favor selecciona un motivo');
      onConfirm(machine.id, 'paro', selectedReason);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className="modal-content">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors">
          <X size={24} />
        </button>

        <div className="mb-8">
          <h3 className="text-3xl font-black mb-2 text-slate-800 dark:text-slate-100">
            MAQ <span className="text-emerald-500">{machine.numero}</span>
          </h3>
          <p className="text-sm text-slate-400 font-medium">
            {isStopped ? 'La máquina está detenida. ¿Deseas reanudar la producción?' : 'Selecciona el motivo de detención'}
          </p>
        </div>

        {!isStopped && (
          <div className="relative mb-8">
            <button 
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl"
              onClick={() => setIsSelectOpen(!isSelectOpen)}
            >
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {selectedReason || 'Seleccione motivo...'}
              </span>
              <ChevronDown className={`transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} size={20} />
            </button>

            {isSelectOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                {MOTIVOS_PARO.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => { setSelectedReason(m.nombre); setIsSelectOpen(false); }}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    {m.nombre}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          
          <button 
            onClick={handleConfirm}
            className={`flex-1 py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
              isStopped 
                ? 'bg-emerald-500 hover:bg-emerald-600' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isStopped ? <Play size={20} fill="currentColor" /> : <AlertTriangle size={20} />}
            <span className="text-[10px] tracking-widest">
                {isStopped ? 'REINICIAR' : 'CONFIRMAR PARO'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
