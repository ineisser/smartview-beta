import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMachines } from '../hooks/useMachines';
import { useDashboardLogic } from '../hooks/useDashboardLogic';
import MachineCard from '../components/MachineCard';
import StopModal from '../components/StopModal';
import { 
  LogOut, Sun, Moon, Cast, Grip, History, AlertTriangle, Activity, Zap, Smartphone, Settings
} from 'lucide-react';

import '../styles/industrial-premium.css';

export default function Dashboard() {
  const { logout } = useAuth(); // No esperamos a userData para evitar bloqueos
  const { machines, logs, updateMachineStatus } = useMachines(); 
  const { time, shiftInfo, stats } = useDashboardLogic(machines);
  
  const [currentView, setCurrentView] = useState('mapa');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync theme
  useEffect(() => {
    const root = document.querySelector('.app-shell');
    if (root) {
      root.classList.toggle('dark', isDarkMode);
      root.classList.toggle('light', !isDarkMode);
    }
  }, [isDarkMode]);

  const views = [
    { id: 'mapa', label: 'Mapa', icon: <Grip size={14}/> },
    { id: 'history', label: 'Historial', icon: <History size={14}/> },
    { id: 'priority', label: 'Paros', icon: <AlertTriangle size={14}/> },
    { id: 'activity', label: 'Activas', icon: <Activity size={14}/> },
    { id: 'efficiency', label: 'Eficiencia', icon: <Zap size={14}/> },
  ];

  const currentViewLabel = views.find(v => v.id === currentView)?.label || 'Mapa';

  return (
    <div className="app-shell light">
      
      {/* Header Sala */}
      <div className="header-sala">
        <span className="label">sala</span>
        <div className="title-box">
          <Cast size={32} strokeWidth={2.5} className="text-emerald-500" />
          <h1>Cardas</h1>
        </div>
      </div>

      {/* Top Navbar */}
      <nav>
        <button className="opacity-60 hover:opacity-100 transition-opacity"><Smartphone size={20} /></button>
        <div className="nav-divider" />
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="opacity-60 hover:opacity-100 transition-opacity">
          {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <div className="nav-divider" />
        <button className="opacity-60 hover:opacity-100 transition-opacity"><Settings size={20} /></button>
        <div className="nav-divider" />
        <button onClick={logout} className="text-red-500 opacity-80 hover:opacity-100 transition-opacity"><LogOut size={20} /></button>
      </nav>

      <main>
        {/* Barra roja superior */}
        <div className="status-header-wrapper">
          <div className="loading-bar-container">
            <div className="loading-bar-panel" />
          </div>
        </div>

        <section className="col-main">
          <div className="view-header">
            <div className="view-title-group">
              <Grip size={32} className="text-emerald-500" />
              <h2>{currentViewLabel} de sección</h2>
            </div>

            <div className="tabs-container">
              {views.map(v => (
                <button 
                  key={v.id} 
                  className={`tab-btn ${currentView === v.id ? 'active' : ''}`}
                  onClick={() => setCurrentView(v.id)}
                >
                  {v.icon}
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {currentView === 'mapa' && (
            <div className="maquinas-grid">
              {machines.map(m => (
                <MachineCard key={m.id} machine={m} onClick={() => setSelectedMachine(m)} />
              ))}
            </div>
          )}

          {currentView === 'history' && (
            <div className="flex flex-col gap-3 mt-4">
              {logs.length > 0 ? logs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-500 font-bold rounded-xl">
                      {log.machineId}
                    </div>
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-200">{log.reason}</div>
                      <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{log.time}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${log.status === 'paro' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {log.status === 'paro' ? 'Paro' : 'Reinicio'}
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <History size={64} />
                  <span className="mt-4 font-bold uppercase tracking-widest">Sin registros recientes</span>
                </div>
              )}
            </div>
          )}

          {(currentView !== 'mapa' && currentView !== 'history') && (
            <div className="flex flex-col items-center justify-center mt-32 opacity-10">
              <Activity size={100} strokeWidth={1} />
              <div className="mt-8 text-2xl font-black tracking-[0.8em] uppercase text-center">Vista en desarrollo</div>
            </div>
          )}
        </section>

        <aside className="col-sidebar">
          <div className="clock-svg-wrapper">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" className="clock-face" />
              <circle cx="50" cy="50" r="42" className="shift-track" strokeDasharray="263.89" strokeDashoffset={263.89 * 0.33} /> 
              <circle 
                cx="50" cy="50" r="42" 
                className="shift-progress"
                style={{ 
                  strokeDasharray: 263.89,
                  strokeDashoffset: 263.89 * (1 - (shiftInfo.progressFactor * 0.66))
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">tiempo restante</span>
              <div className="remaining-val">-{shiftInfo.remaining}</div>
            </div>
          </div>

          <div className="sidebar-label">Eficiencia</div>
          <div className="eficiencia-num text-slate-800 dark:text-slate-100">
            {stats.efficiency}<span className="text-3xl ml-2 opacity-30">%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000" 
              style={{ width: `${stats.efficiency}%` }} 
            />
          </div>
        </aside>
      </main>

      <footer>
        <div className="flex-1 flex items-center gap-6">
          <Smartphone size={56} className="opacity-10 dark:text-white" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.stoppedCount} paros en {stats.totalMachines} máquinas</span>
            <span className="text-sm text-slate-400 font-medium italic">0 min tiempo sin producción</span>
          </div>
        </div>

        <div className="divider" />

        <div className="footer-item min-w-[120px]">
          <span className="footer-label">paros</span>
          <div className="footer-val text-red-500">{stats.stoppedCount}</div>
        </div>

        <div className="divider" />

        <div className="footer-item min-w-[120px]">
          <span className="footer-label">turno</span>
          <div className="footer-val text-slate-700 dark:text-slate-300">{shiftInfo.label}</div>
        </div>

        <div className="divider" />

        <div className="footer-item">
          <span className="footer-label">hora actual</span>
          <div className="flex items-baseline gap-2">
            <div className="footer-val text-slate-800 dark:text-slate-100">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            <div className="text-3xl font-bold opacity-20 dark:text-slate-400">
              :{time.toLocaleTimeString([], { second: '2-digit' })}
            </div>
          </div>
        </div>
      </footer>

      {selectedMachine && (
        <StopModal 
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
          onConfirm={updateMachineStatus}
        />
      )}
    </div>
  );
}
