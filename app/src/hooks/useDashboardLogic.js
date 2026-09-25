import { useState, useEffect, useMemo } from 'react';

export function useDashboardLogic(machines = []) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const shiftInfo = useMemo(() => {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const currentTimeInMinutes = hour * 60 + minute;

    let startHour, endHour, shiftLabel;
    if (hour >= 7 && hour < 15) {
      startHour = 7; endHour = 15; shiftLabel = 'A';
    } else if (hour >= 15 && hour < 23) {
      startHour = 15; endHour = 23; shiftLabel = 'B';
    } else {
      startHour = 23; endHour = 7; shiftLabel = 'C';
    }

    const shiftStartMin = startHour * 60;
    const shiftEndMin = endHour * 60;
    const totalShiftMinutes = 8 * 60;

    let elapsedMinutes;
    if (shiftEndMin < shiftStartMin) { // Turno C
      if (currentTimeInMinutes >= shiftStartMin) {
        elapsedMinutes = currentTimeInMinutes - shiftStartMin;
      } else {
        elapsedMinutes = (1440 - shiftStartMin) + currentTimeInMinutes;
      }
    } else {
      elapsedMinutes = currentTimeInMinutes - shiftStartMin;
    }

    const remainingMinutes = Math.max(0, totalShiftMinutes - elapsedMinutes);
    const hRem = Math.floor(remainingMinutes / 60);
    const mRem = remainingMinutes % 60;

    // SVG Math
    const r = 42;
    const circumference = 2 * Math.PI * r;
    const progressFactor = elapsedMinutes / totalShiftMinutes;
    const dashOffset = circumference * (1 - progressFactor);

    return {
      label: shiftLabel,
      elapsed: elapsedMinutes,
      remaining: `${hRem}:${mRem.toString().padStart(2, '0')}`,
      progressFactor,
      dashOffset,
      circumference
    };
  }, [time]);

  const stats = useMemo(() => {
    const stopped = machines.filter(m => m.estado === 'paro');
    const activeCount = machines.length - stopped.length;
    const efficiency = machines.length > 0 ? Math.round((activeCount / machines.length) * 100) : 100;

    return {
      stoppedCount: stopped.length,
      activeCount,
      efficiency,
      totalMachines: machines.length
    };
  }, [machines]);

  return {
    time,
    shiftInfo,
    stats
  };
}
