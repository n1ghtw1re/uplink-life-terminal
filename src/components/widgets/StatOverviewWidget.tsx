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

  const { data: augScore } = useQuery({
    queryKey: ['augmentation-score', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('augmentations')
        .select('proficiency')
        .eq('user_id', user!.id);
      if (!data || data.length === 0) return 0;
      const total = data.reduce((sum, a) => sum + (a.proficiency ?? 1), 0);
      return Math.min(100, Math.round((total / (data.length * 5)) * 100));
    },
    enabled: !!user?.id,
  });

  const { data: classData } = useQuery({
    queryKey: ['class', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('custom_class_name')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const classDisplay = classData?.custom_class_name ?? '---';
  const augmentation = augScore ?? 0;

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
                <ProgressBar value={s.xp} max={s.xpToNext} width="100px" height={6} />
                <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>STK: {s.streak}d</span>
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
              <span style={{ color: 'hsl(var(--text-dim))' }}>AUGMENTATION:</span>
              <ProgressBar value={augmentation} max={100} width="80px" height={6} />
              <span style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>{augmentation}/100</span>
            </div>
          </div>
        </div>
      </WidgetWrapper>

      <Modal open={showAddSkill} onClose={() => setShowAddSkill(false)} title="ADD SKILL" width={520}>
        <AddSkillModal onClose={() => setShowAddSkill(false)} />
      </Modal>
    </>
  );
};

export default StatOverviewWidget;