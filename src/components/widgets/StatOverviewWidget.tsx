// ============================================================
// src/components/widgets/StatOverviewWidget.tsx
// ============================================================
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onStatClick?: (statKey: string) => void;
}

type SortKey = 'alpha' | 'level';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

const StatOverviewWidget = ({ onClose, onFullscreen, isFullscreen, onStatClick }: WidgetProps) => {
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);
  const [sortKey, setSortKey] = useState<SortKey>('level');

  const { data: toolProg } = useQuery({
    queryKey: ['tool-progress'],
    queryFn: async () => {
      const db  = await import('@/lib/db').then(m => m.getDB());
      const res = await db.query<{ total_xp: number; level: number }>(`SELECT total_xp, level FROM tool_progress WHERE id = 1;`);
      return res.rows[0] ?? { total_xp: 0, level: 1 };
    },
  });

  const { data: augProg } = useQuery({
    queryKey: ['augment-progress'],
    queryFn: async () => {
      const db  = await import('@/lib/db').then(m => m.getDB());
      const res = await db.query<{ total_xp: number; level: number }>(`SELECT total_xp, level FROM augment_progress WHERE id = 1;`);
      return res.rows[0] ?? { total_xp: 0, level: 1 };
    },
  });

  const { data: classData } = useQuery({
    queryKey: ['class'],
    queryFn: async () => {
      const db  = await import('@/lib/db').then(m => m.getDB());
      const res = await db.query<{ custom_class_name: string | null }>(`SELECT custom_class_name FROM profile WHERE id = 1;`);
      return res.rows[0] ?? null;
    },
  });

  const classDisplay = classData?.custom_class_name ?? '---';
  const sortedStats = useMemo(() => {
    const allStats = [...(stats ?? [])];
    if (sortKey === 'alpha') {
      return allStats.sort((a, b) => a.name.localeCompare(b.name));
    }
    return allStats.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return a.name.localeCompare(b.name);
    });
  }, [stats, sortKey]);

  return (
    <WidgetWrapper title="STAT OVERVIEW" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {([
            { key: 'alpha', label: 'ALPHA' },
            { key: 'level', label: 'LEVEL' },
          ] as const).map(option => (
            <button
              key={option.key}
              onClick={() => setSortKey(option.key)}
              style={{
                padding: '2px 8px',
                fontSize: 9,
                fontFamily: mono,
                cursor: 'pointer',
                letterSpacing: 1,
                border: `1px solid ${sortKey === option.key ? acc : adim}`,
                background: sortKey === option.key ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: sortKey === option.key ? acc : dim,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {sortedStats.map(s => (
          <div
            key={s.key}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
              opacity: s.dormant ? 0.4 : 1,
              cursor: s.dormant ? 'default' : 'pointer',
            }}
            onClick={() => !s.dormant && onStatClick?.(s.key)}
          >
            <span style={{ width: 16, fontSize: 14 }}>{s.icon}</span>
            <span style={{ width: 40, fontSize: 10 }}>{s.name}</span>
            {s.dormant ? (
              <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>░░░░░ DORMANT</span>
            ) : (
              <>
                <span style={{ width: 36, fontSize: 10, color: 'hsl(var(--accent))' }}>LVL {s.level}</span>
                <ProgressBar value={s.xpInLevel} max={s.xpForLevel} width="80px" height={6} />
                <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))', width: 28, textAlign: 'right' }}>{s.xpForLevel > 0 ? Math.round((s.xpInLevel / s.xpForLevel) * 100) : 0}%</span>
              </>
            )}
          </div>
        ))}

        {(!stats || stats.length === 0) && (
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', padding: '8px 0' }}>
            Loading stats...
          </div>
        )}

        <div style={{ marginTop: 8, borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 8 }}>
          <div style={{ fontSize: 10 }}>
            <div style={{ color: 'hsl(var(--text-dim))' }}>
              CLASS: <span style={{ color: 'hsl(var(--accent))' }}>{classDisplay}</span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'hsl(var(--text-dim))' }}>TOOLS:</span>
              <span style={{ color: 'hsl(var(--accent))', fontSize: 10 }}>LVL {toolProg?.level ?? 1}</span>
              <span style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>{Number(toolProg?.total_xp ?? 0).toLocaleString()} XP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'hsl(var(--text-dim))' }}>AUGMENTS:</span>
              <span style={{ color: 'hsl(var(--accent))', fontSize: 10 }}>LVL {augProg?.level ?? 1}</span>
              <span style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>{Number(augProg?.total_xp ?? 0).toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </WidgetWrapper>
  );
};

export default StatOverviewWidget;
