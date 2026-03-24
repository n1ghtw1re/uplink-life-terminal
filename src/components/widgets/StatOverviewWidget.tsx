// ============================================================
// src/components/widgets/StatOverviewWidget.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import WidgetWrapper from '../WidgetWrapper';
import ProgressBar from '../ProgressBar';
import Modal from '../Modal';
import AddSkillModal from '../modals/AddSkillModal';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onStatClick?: (statKey: string) => void;
}

const StatOverviewWidget = ({ onClose, onFullscreen, isFullscreen, onStatClick }: WidgetProps) => {
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);
  const [showAddSkill, setShowAddSkill] = useState(false);

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

  return (
    <>
      <WidgetWrapper title="STAT OVERVIEW" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        {(stats ?? []).map(s => (
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
          <button
            className="topbar-btn"
            style={{ width: '100%', fontSize: 10, marginBottom: 8 }}
            onClick={() => setShowAddSkill(true)}
          >
            + ADD SKILL
          </button>

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

      <Modal open={showAddSkill} onClose={() => setShowAddSkill(false)} title="ADD SKILL" width={680}>
        <AddSkillModal onClose={() => setShowAddSkill(false)} />
      </Modal>
    </>
  );
};

export default StatOverviewWidget;