// ============================================================
// src/components/modals/AddSkillModal.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { StatKey, STAT_META } from '@/types';
import { toast } from '@/hooks/use-toast';

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

interface AddSkillModalProps {
  onClose: () => void;
}

const AddSkillModal = ({ onClose }: AddSkillModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [primaryStat, setPrimaryStat] = useState<StatKey>('wire');
  const [secondaryStat, setSecondaryStat] = useState<StatKey | ''>('');
  const [split, setSplit] = useState(50);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const hasDual = secondaryStat !== '';

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);

    try {
      const statKeys = hasDual ? [primaryStat, secondaryStat as StatKey] : [primaryStat];
      const defaultSplit = hasDual ? [split, 100 - split] : [100];

      const { error } = await supabase.from('skills').insert({
        user_id: user.id,
        name: name.trim(),
        stat_keys: statKeys,
        default_split: defaultSplit,
        notes: notes || null,
        xp: 0,
        level: 1,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['skills', user.id] });
      toast({ title: '✓ SKILL ADDED', description: name.trim() });
      onClose();
    } catch (err) {
      console.error('Add skill error:', err);
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontSize: 11, display: 'grid', gap: 14 }}>
      {/* Name */}
      <div>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          SKILL NAME <span style={{ color: 'hsl(var(--accent))' }}>*</span>
        </div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="e.g. Skateboarding"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          maxLength={60}
        />
      </div>

      {/* Primary stat */}
      <div>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          PRIMARY STAT <span style={{ color: 'hsl(var(--accent))' }}>*</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAT_KEYS.map(k => (
            <button
              key={k}
              className="topbar-btn"
              style={{
                border: `1px solid ${primaryStat === k ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                color: primaryStat === k ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
                boxShadow: primaryStat === k ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
              }}
              onClick={() => {
                setPrimaryStat(k);
                if (secondaryStat === k) setSecondaryStat('');
              }}
            >
              {STAT_META[k].icon} {STAT_META[k].name}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary stat */}
      <div>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          SECONDARY STAT <span style={{ color: 'hsl(var(--text-dim))' }}>(optional)</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className="topbar-btn"
            style={{
              border: `1px solid ${secondaryStat === '' ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
              color: secondaryStat === '' ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
            }}
            onClick={() => setSecondaryStat('')}
          >
            NONE
          </button>
          {STAT_KEYS.filter(k => k !== primaryStat).map(k => (
            <button
              key={k}
              className="topbar-btn"
              style={{
                border: `1px solid ${secondaryStat === k ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                color: secondaryStat === k ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
                boxShadow: secondaryStat === k ? '0 0 6px rgba(255,176,0,0.3)' : 'none',
              }}
              onClick={() => setSecondaryStat(k)}
            >
              {STAT_META[k].icon} {STAT_META[k].name}
            </button>
          ))}
        </div>
      </div>

      {/* Split slider — only if dual stat */}
      {hasDual && (
        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 8, letterSpacing: 1 }}>
            DEFAULT STAT SPLIT
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: 'hsl(var(--accent))', width: 80 }}>
              {STAT_META[primaryStat].icon} {STAT_META[primaryStat].name}
            </span>
            <input
              type="range"
              className="ql-split-slider"
              min={10} max={90} step={5}
              value={split}
              onChange={e => setSplit(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 10, color: 'hsl(var(--accent))', width: 80, textAlign: 'right' }}>
              {STAT_META[secondaryStat as StatKey].icon} {STAT_META[secondaryStat as StatKey].name}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 4 }}>
            <span>{split}%</span>
            <span>{100 - split}%</span>
          </div>
          <div style={{ fontSize: 9, color: 'hsl(var(--text-dim))', marginTop: 4 }}>
            Can be overridden per session when logging.
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <div style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginBottom: 5, letterSpacing: 1 }}>
          NOTES <span style={{ color: 'hsl(var(--text-dim))' }}>(optional)</span>
        </div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="any notes about this skill..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Buttons */}
      <div style={{ borderTop: '1px solid hsl(var(--accent-dim))', paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="topbar-btn" style={{ color: 'hsl(var(--text-dim))' }} onClick={onClose}>
          CANCEL
        </button>
        <button
          className="topbar-btn"
          disabled={!name.trim() || saving}
          style={{ opacity: !name.trim() ? 0.4 : 1 }}
          onClick={handleSubmit}
        >
          {saving ? '>> SAVING...' : '>> ADD SKILL'}
        </button>
      </div>
    </div>
  );
};

export default AddSkillModal;