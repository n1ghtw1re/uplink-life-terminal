// ============================================================
// src/components/modals/AddCourseModal.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useSkills } from '@/hooks/useSkills';
import { StatKey, STAT_META } from '@/types';
import { toast } from '@/hooks/use-toast';

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

interface Props {
  onClose: () => void;
}

export default function AddCourseModal({ onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: allSkills } = useSkills(user?.id);

  const [name, setName]         = useState('');
  const [provider, setProvider] = useState('');
  const [subject, setSubject]   = useState('');
  const [url, setUrl]           = useState('');
  const [notes, setNotes]       = useState('');
  const [certEarned, setCertEarned] = useState(false);
  const [isLegacy, setIsLegacy]     = useState(false);
  const [saving, setSaving]         = useState(false);

  const [linkedStats, setLinkedStats]       = useState<StatKey[]>([]);
  const [linkedSkillIds, setLinkedSkillIds] = useState<string[]>([]);
  const [modules, setModules]               = useState<string[]>(['']);

  const toggleStat = (k: StatKey) =>
    setLinkedStats(prev =>
      prev.includes(k) ? prev.filter(s => s !== k) : [...prev, k]
    );

  const toggleSkillId = (id: string) =>
    setLinkedSkillIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const updateModule = (i: number, val: string) =>
    setModules(prev => prev.map((m, idx) => idx === i ? val : m));

  const removeModule = (i: number) =>
    setModules(prev => prev.filter((_, idx) => idx !== i));

  const addModule = () => setModules(prev => [...prev, '']);

  // Skills filtered to selected stats; if no stat selected show all
  const visibleSkills = linkedStats.length > 0
    ? (allSkills ?? []).filter(s =>
        s.statKeys.some(k => linkedStats.includes(k as StatKey))
      )
    : (allSkills ?? []);

  const selectedSkillNames = (allSkills ?? [])
    .filter(s => linkedSkillIds.includes(s.id))
    .map(s => s.name)
    .join(', ');

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      const { data: course, error: courseErr } = await supabase
        .from('courses')
        .insert({
          user_id:          user.id,
          name:             name.trim(),
          provider:         provider.trim() || null,
          subject:          subject.trim() || null,
          url:              url.trim()      || null,
          notes:            notes.trim()    || null,
          linked_stats:     linkedStats,
          linked_skill_ids: linkedSkillIds,
          status:           isLegacy ? 'COMPLETE' : 'ACTIVE',
          progress:         isLegacy ? 100 : 0,
          cert_earned:      certEarned,
          is_legacy:        isLegacy,
          completed_at:     isLegacy ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (courseErr) throw courseErr;

      const validModules = modules
        .map((title, sort_order) => ({ title: title.trim(), sort_order }))
        .filter(m => m.title.length > 0);

      if (validModules.length > 0) {
        const { error: secErr } = await supabase
          .from('course_sections')
          .insert(validModules.map(m => ({ course_id: course.id, ...m })));
        if (secErr) throw secErr;
      }

      queryClient.invalidateQueries({ queryKey: ['courses', user.id] });

      toast({
        title: '✓ COURSE ADDED',
        description: `${name.trim()}${validModules.length > 0 ? ` — ${validModules.length} module${validModules.length !== 1 ? 's' : ''}` : ''}`,
      });
      onClose();
    } catch (err) {
      toast({ title: 'ERROR', description: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 13, fontSize: 11 }}>

      {/* Name */}
      <div>
        <div className="crt-field-label">
          COURSE NAME <span style={{ color: 'hsl(var(--accent))' }}>*</span>
        </div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="e.g. Junior Cybersecurity Analyst"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          maxLength={100}
        />
      </div>

      {/* Provider + Subject */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="crt-field-label">PROVIDER</div>
          <input
            className="crt-input"
            style={{ width: '100%' }}
            placeholder="HackTheBox, Udemy..."
            value={provider}
            onChange={e => setProvider(e.target.value)}
            maxLength={60}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="crt-field-label">SUBJECT</div>
          <input
            className="crt-input"
            style={{ width: '100%' }}
            placeholder="Cybersecurity, React..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={60}
          />
        </div>
      </div>

      {/* URL */}
      <div>
        <div className="crt-field-label">URL <span style={{ opacity: 0.5 }}>(optional)</span></div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* Linked stats — compact toggle row */}
      <div>
        <div className="crt-field-label">LINKED STATS</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {STAT_KEYS.map(k => {
            const on = linkedStats.includes(k);
            return (
              <button
                key={k}
                className="topbar-btn"
                onClick={() => toggleStat(k)}
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  border: `1px solid ${on ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                  color: on ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
                  boxShadow: on ? '0 0 5px rgba(255,176,0,0.25)' : 'none',
                }}
              >
                {STAT_META[k].icon} {STAT_META[k].name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Linked skills — native multi-select styled as CRT */}
      {visibleSkills.length > 0 && (
        <div>
          <div className="crt-field-label">
            LINKED SKILLS
            <span style={{ opacity: 0.5, marginLeft: 8, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
              hold Ctrl / Cmd to select multiple
            </span>
          </div>
          <select
            multiple
            value={linkedSkillIds}
            onChange={e => {
              const selected = Array.from(e.target.selectedOptions).map(o => o.value);
              setLinkedSkillIds(selected);
            }}
            style={{
              width: '100%',
              background: 'hsl(var(--bg-primary))',
              border: '1px solid hsl(var(--accent-dim))',
              color: 'hsl(var(--accent))',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              padding: '4px',
              height: Math.min(visibleSkills.length * 22 + 8, 132),
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {visibleSkills.map(s => (
              <option
                key={s.id}
                value={s.id}
                style={{
                  padding: '3px 6px',
                  background: linkedSkillIds.includes(s.id) ? 'rgba(255,176,0,0.15)' : 'transparent',
                }}
              >
                {s.icon} {s.name}
              </option>
            ))}
          </select>
          {selectedSkillNames && (
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginTop: 4 }}>
              SELECTED: {selectedSkillNames}
            </div>
          )}
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9, marginTop: 2, opacity: 0.7 }}>
            XP fires to selected skills when you log sessions for this course.
          </div>
        </div>
      )}

      {/* Modules */}
      <div>
        <div className="crt-field-label">
          MODULES
          <span style={{ opacity: 0.5, marginLeft: 8, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
            optional — progress = completed / total
          </span>
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          {modules.map((mod, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ color: 'hsl(var(--text-dim))', fontSize: 9, width: 16, textAlign: 'right', flexShrink: 0 }}>
                {i + 1}.
              </span>
              <input
                className="crt-input"
                style={{ flex: 1 }}
                placeholder={`Module ${i + 1}...`}
                value={mod}
                onChange={e => updateModule(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addModule(); } }}
              />
              {modules.length > 1 && (
                <button
                  className="topbar-btn"
                  style={{ padding: '2px 7px', fontSize: 12, color: 'hsl(var(--text-dim))' }}
                  onClick={() => removeModule(i)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          className="topbar-btn"
          style={{ marginTop: 6, fontSize: 10, color: 'hsl(var(--text-dim))' }}
          onClick={addModule}
        >
          + ADD MODULE
        </button>
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', gap: 20 }}>
        {([
          [certEarned, () => setCertEarned(!certEarned), 'CERTIFICATE EARNED'],
          [isLegacy,   () => setIsLegacy(!isLegacy),     'LEGACY ENTRY'],
        ] as [boolean, () => void, string][]).map(([val, toggle, label]) => (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
            onClick={toggle}
          >
            <span style={{
              width: 13, height: 13,
              border: `1px solid ${val ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: 'hsl(var(--accent))',
              background: val ? 'rgba(255,176,0,0.1)' : 'transparent',
              flexShrink: 0,
            }}>
              {val ? '×' : ''}
            </span>
            <span style={{ color: val ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))', fontSize: 10 }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {isLegacy && (
        <div style={{
          background: 'rgba(255,176,0,0.04)',
          border: '1px solid hsl(var(--accent-dim))',
          padding: '7px 10px',
          fontSize: 10,
          color: 'hsl(var(--text-dim))',
        }}>
          Legacy entries are marked COMPLETE and award reduced XP. Does not affect streaks.
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="crt-field-label">NOTES <span style={{ opacity: 0.5 }}>(optional)</span></div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="any notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={300}
        />
      </div>

      {/* Actions */}
      <div style={{
        borderTop: '1px solid hsl(var(--accent-dim))',
        paddingTop: 11,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
      }}>
        <button
          className="topbar-btn"
          style={{ color: 'hsl(var(--text-dim))' }}
          onClick={onClose}
          disabled={saving}
        >
          CANCEL
        </button>
        <button
          className="topbar-btn"
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          style={{ opacity: !name.trim() ? 0.4 : 1 }}
        >
          {saving ? '>> SAVING...' : '>> ADD COURSE'}
        </button>
      </div>
    </div>
  );
}