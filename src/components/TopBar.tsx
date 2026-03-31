import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import ProgressBar from './ProgressBar';

interface TopBarProps {
  onOpenLog: () => void;
  onOpenCheckin: () => void;
  onOpenSearch: () => void;
}

const TopBar = ({ onOpenLog, onOpenCheckin, onOpenSearch }: TopBarProps) => {
  const [time, setTime] = useState(new Date());
  const { user } = useAuth();
  const { data: op, isLoading } = useOperator(user?.id);

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (n: number) => n.toString().padStart(2, '0');
  const timeStr = `${fmt(time.getHours())}:${fmt(time.getMinutes())}:${fmt(time.getSeconds())}`;
  const dateStr = `${time.getFullYear()}.${fmt(time.getMonth() + 1)}.${fmt(time.getDate())}`;

  const level      = op?.level      ?? 1;
  const title      = op?.levelTitle ?? 'Novice';
  const customClass = op?.customClass ?? '';
  const xpInLevel  = op?.xpInLevel  ?? 0;
  const xpForLevel = op?.xpForLevel ?? 500;
  const streak     = op?.streak     ?? 0;
  const multiplier = streak >= 30 ? 3.0 : streak >= 14 ? 2.0 : streak >= 7 ? 1.5 : 1.0;
  const totalXP    = op?.totalXp    ?? 0;

  const multClass = multiplier >= 3 ? 'pulse-glow' : multiplier >= 2 ? 'text-glow-bright' : '';

  return (
    <div style={{
      height: 48,
      background: 'hsl(var(--bg-primary))',
      borderBottom: '1px solid hsl(var(--accent-dim))',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 8,
      flexShrink: 0,
      zIndex: 100,
      position: 'relative',
    }}>
      <span className="font-display text-glow-bright" style={{ fontSize: 20, color: 'hsl(var(--accent))' }}>[ UPLINK ]</span>
      <span style={{ fontSize: 11, color: 'hsl(var(--text-dim))' }}>SYS-TIME: {timeStr}</span>
      <span style={{ fontSize: 11, color: 'hsl(var(--text-dim))' }}>DATE: {dateStr}</span>
      <span style={{ color: 'hsl(var(--text-dim))', opacity: 0.5 }}>│</span>

      {isLoading ? (
        <span style={{ fontSize: 11, color: 'hsl(var(--text-dim))' }}>CONNECTING...</span>
      ) : (
        <>
          <span className="font-display text-glow" style={{ fontSize: 16, color: 'hsl(var(--accent-bright))' }}>
            Level {level} // {title}{customClass ? ` ${customClass}` : ''}
          </span>
          <ProgressBar value={xpInLevel} max={xpForLevel} width="120px" />
          <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>{totalXP.toLocaleString()} XP</span>
          <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>STK: {streak}d</span>
          <span className={multClass} style={{ fontSize: 10, color: 'hsl(var(--accent-bright))' }}>
            {multiplier.toFixed(1)}x
          </span>
        </>
      )}
      <span style={{ color: 'hsl(var(--text-dim))', opacity: 0.5 }}>│</span>

      <div style={{ display: 'flex', gap: 4 }}>
        <button className="topbar-btn" onClick={onOpenSearch}>
          ⌕ <span style={{ fontSize: 9, opacity: 0.5 }}>/</span>
        </button>
        <button className="topbar-btn" onClick={onOpenLog}>
          ✚ LOG <span style={{ fontSize: 9, opacity: 0.5 }}>SPACE</span>
        </button>
        <button className="topbar-btn" onClick={onOpenCheckin}>⬡ CHECK-IN</button>
      </div>
      <span style={{ color: 'hsl(var(--text-dim))', opacity: 0.5 }}>│</span>

      <div style={{ marginLeft: 'auto' }}>
        <span className="cursor-blink text-glow" />
      </div>
    </div>
  );
};

export default TopBar;
