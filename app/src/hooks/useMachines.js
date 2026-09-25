import { useState, useEffect } from 'react';

// Simulación de los datos originales del index.html
const INITIAL_MACHINES = Array.from({ length: 19 }, (_, i) => ({
  id: `M${(i + 1).toString().padStart(2, '0')}`,
  numero: i + 1,
  estado: 'produccion',
  lastUpdated: Date.now()
}));

export function useMachines(ruc) {
  const [machines, setMachines] = useState(() => {
    const saved = localStorage.getItem('smartview_machines');
    return saved ? JSON.parse(saved) : INITIAL_MACHINES;
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('smartview_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(false); // Siempre listo en modo local

  useEffect(() => {
    localStorage.setItem('smartview_machines', JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem('smartview_logs', JSON.stringify(logs));
  }, [logs]);

  const updateMachineStatus = (machineId, newStatus, reason = '') => {
    const timestamp = Date.now();
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // 1. Actualizar estado de máquina
    setMachines(prev => prev.map(m => 
      m.id === machineId 
        ? { ...m, estado: newStatus, lastReason: reason, lastUpdated: timestamp } 
        : m
    ));

    // 2. Crear entrada en el historial
    const newLog = {
      id: timestamp,
      machineId,
      status: newStatus,
      reason: reason || (newStatus === 'produccion' ? 'Reinicio' : 'Paro manual'),
      timestamp,
      time: timeStr
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  return { machines, logs, loading, updateMachineStatus };
}
