import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProgressBar from '../ProgressBar';
import { useOperator } from '@/hooks/useOperator';
import { useStats } from '@/hooks/useStats';
import { useSkills } from '@/hooks/useSkills';
import { getDB } from '@/lib/db';
import { getLevelFromXP, getXPDisplayValues } from '@/services/xpService';
import { supabase } from '@/integrations/supabase/client';
import { STAT_META, StatKey } from '@/types';
import ImageUploadModal from './ImageUploadModal';

type StatTabKey = StatKey | 'ALL';

interface CharSheetPage1Props {
  onSkillClick?: (skillName: string) => void;
}

const CharSheetPage1 = ({ onSkillClick }: CharSheetPage1Props) => {
  const queryClient = useQueryClient();
  const { data: op, isLoading: opLoading } = useOperator();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: skills, isLoading: skillsLoading } = useSkills();
  
  const [editing, setEditing] = useState<'designation' | 'callsign' | false>(false);
  const [editValue, setEditValue] = useState('');
  const [skillTab, setSkillTab] = useState<StatTabKey>('ALL');
  const [arsenalTab, setArsenalTab] = useState<'tools' | 'augments'>('tools');
  const [specTab, setSpecTab] = useState<'courses' | 'projects' | 'media' | 'vault'>('courses');
  const [showImageModal, setShowImageModal] = useState(false);

  const { data: tools } = useQuery({
    queryKey: ['tools-xp'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string; xp: number }>(`SELECT id, name, xp FROM tools ORDER BY xp DESC LIMIT 5;`);
      return res.rows.map(t => ({ ...t, ...getLevelFromXP(t.xp) }));
    },
  });

  const { data: augments } = useQuery({
    queryKey: ['augments-xp'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string; xp: number }>(`SELECT id, name, xp FROM augments ORDER BY xp DESC LIMIT 5;`);
      return res.rows.map(a => ({ ...a, ...getLevelFromXP(a.xp) }));
    },
  });

  const { data: recentCourses } = useQuery({
    queryKey: ['courses-recent'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string; status: string; progress: number }>(
        `SELECT id, name, status, progress FROM courses ORDER BY created_at DESC LIMIT 5;`
      );
      return res.rows;
    },
  });

  const { data: recentProjects } = useQuery({
    queryKey: ['projects-recent'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string; status: string; progress: number }>(
        `SELECT p.id, p.name, p.status, 
         COALESCE(
           (SELECT COUNT(*) FROM project_milestones m WHERE m.project_id = p.id AND m.completed_at IS NOT NULL) * 100 / 
           NULLIF((SELECT COUNT(*) FROM project_milestones m WHERE m.project_id = p.id), 0), 0
         ) as progress 
         FROM projects p ORDER BY p.created_at DESC LIMIT 5;`
      );
      return res.rows;
    },
  });

  const { data: recentMedia } = useQuery({
    queryKey: ['media-recent'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; title: string; type: string; status: string }>(
        `SELECT id, title, type, status FROM media ORDER BY created_at DESC LIMIT 5;`
      );
      return res.rows;
    },
  });

  const { data: recentVault } = useQuery({
    queryKey: ['vault-recent'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; title: string; category: string; completed_date: string }>(
        `SELECT id, title, category, completed_date FROM vault_items ORDER BY created_at DESC LIMIT 5;`
      );
      return res.rows;
    },
  });

  const { data: firstSessionDate } = useQuery({
    queryKey: ['first-session-date'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ logged_at: string }>(
        `SELECT logged_at FROM sessions ORDER BY logged_at ASC LIMIT 1;`
      );
      return res.rows[0]?.logged_at;
    },
  });

  const filteredSkills = useMemo(() => {
    if (!skills) return [];
    const sorted = [...skills].sort((a, b) => b.xp - a.xp);
    if (skillTab === 'ALL') return sorted.slice(0, 5);
    return sorted.filter(s => s.statKeys.includes(skillTab)).slice(0, 5);
  }, [skills, skillTab]);

  const statTabs: StatTabKey[] = ['ALL', 'body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

  const startDesignationEdit = () => {
    setEditValue(op?.designation || '');
    setEditing('designation');
  };

  const saveDesignationEdit = async () => {
    const v = editValue.trim();
    await supabase.from('profile').update({ designation: v || null }).eq('id', 1);
    queryClient.invalidateQueries({ queryKey: ['operator'] });
    setEditing(false);
  };

  const startCallsignEdit = () => {
    setEditValue(op?.callsign || '');
    setEditing('callsign');
  };

  const saveCallsignEdit = async () => {
    const v = editValue.trim();
    if (v) {
      await supabase.from('profile').update({ callsign: v }).eq('id', 1);
      queryClient.invalidateQueries({ queryKey: ['operator'] });
    }
    setEditing(false);
  };

  const loading = opLoading || statsLoading || skillsLoading;
  if (loading) {
    return <div style={{ padding: 20, color: 'hsl(var(--text-dim))' }}>Loading...</div>;
  }

  const mono = "'IBM Plex Mono', monospace";
  const acc = 'hsl(var(--accent))';
  const accDim = 'hsl(var(--accent-dim))';
  const dim = 'hsl(var(--text-dim))';
  const bgT = 'hsl(var(--bg-tertiary))';

  return (
    <div style={{ display: 'flex', height: '100%', gap: 16, padding: '0 4px' }}>
      {/* LEFT - TOP SECTION: VISUAL + USER */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        
        {/* VISUAL + USER side by side */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          {/* // VISUAL - Image */}
          <div style={{ width: 180, flexShrink: 0 }}>
            <div style={{ color: dim, fontSize: 9, marginBottom: 6, letterSpacing: 1 }}>// VISUAL</div>
            <div style={{ 
              width: 180, 
              height: 180, 
              border: `2px solid ${acc}`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: bgT,
              marginBottom: 6,
              overflow: 'hidden',
            }}>
              {op?.avatar ? (
                <img 
                  src={op.avatar} 
                  alt="Character" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: dim, fontSize: 10 }}>No image</span>
              )}
            </div>
            <button 
              onClick={() => setShowImageModal(true)}
              style={{ 
                background: 'transparent', 
                border: `1px solid ${accDim}`, 
                color: accDim, 
                fontSize: 8, 
                padding: '2px 8px', 
                cursor: 'pointer',
                width: '100%'
            }}>
              [EDIT IMAGE]
            </button>
          </div>

          {/* // USER - info next to image */}
          <div style={{ flex: 1 }}>
            <div style={{ color: dim, fontSize: 9, marginBottom: 6, letterSpacing: 1 }}>// USER</div>
            
            {/* Callsign */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: accDim, marginBottom: 2 }}>CALLSIGN</div>
              {editing === 'callsign' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="crt-input"
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCallsignEdit(); if (e.key === 'Escape') setEditing(false); }}
                    style={{ fontSize: 11, width: 100 }}
                  />
                  <button className="topbar-btn" onClick={saveCallsignEdit} style={{ fontSize: 8, padding: '2px 6px' }}>[OK]</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 14, color: acc, letterSpacing: 1 }}>{op?.callsign || 'OPERATOR'}</span>
                  <button onClick={startCallsignEdit} style={{ background: 'transparent', border: 'none', color: accDim, fontSize: 8, cursor: 'pointer' }}>[edit]</button>
                </div>
              )}
            </div>

            {/* Class */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: accDim, marginBottom: 2 }}>// CLASS</div>
              <span style={{ fontFamily: mono, fontSize: 14, color: acc }}>{op?.customClass || '—'}</span>
            </div>

            {/* Designation */}
            <div>
              <div style={{ fontSize: 9, color: accDim, marginBottom: 2 }}>DESIGNATION</div>
              {editing === 'designation' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="crt-input"
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveDesignationEdit(); if (e.key === 'Escape') setEditing(false); }}
                    style={{ fontSize: 11, flex: 1 }}
                  />
                  <button className="topbar-btn" onClick={saveDesignationEdit} style={{ fontSize: 8, padding: '2px 6px' }}>[OK]</button>
                </div>
              ) : op?.designation ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: dim }}>{op.designation}</span>
                  <button onClick={startDesignationEdit} style={{ background: 'transparent', border: 'none', color: accDim, fontSize: 8, cursor: 'pointer' }}>[edit]</button>
                </div>
              ) : (
                <button onClick={startDesignationEdit} style={{ background: 'transparent', border: `1px solid ${accDim}`, color: accDim, fontSize: 9, padding: '2px 8px', cursor: 'pointer' }}>+ SET</button>
              )}
            </div>

            {/* Program Initialized */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, color: accDim, marginBottom: 2 }}>PROGRAM_INITIALIZED</div>
              {firstSessionDate ? (
                <span style={{ fontSize: 11, color: dim }}>
                  {(() => {
                    const d = new Date(firstSessionDate);
                    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
                  })()}
                </span>
              ) : (
                <span style={{ fontSize: 9, color: accDim }}>—</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats - scrollable */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, color: accDim, marginBottom: 8 }}>STATS</div>
          {stats?.map(s => (
            <div key={s.key} style={{ marginBottom: 10, opacity: s.dormant ? 0.4 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 10 }}>
                  <span style={{ marginRight: 4 }}>{STAT_META[s.key]?.icon || '?'}</span>
                  {STAT_META[s.key]?.name || s.key.toUpperCase()}
                </span>
                {s.dormant ? (
                  <span style={{ fontSize: 8, color: dim }}>DORMANT</span>
                ) : (
                  <span style={{ fontFamily: mono, fontSize: 10, color: acc }}>LVL {s.level}</span>
                )}
              </div>
              <ProgressBar value={s.xpInLevel} max={s.xpForLevel || 1} width="100%" height={4} />
              {!s.dormant && (
                <div style={{ fontSize: 8, color: dim, marginTop: 2 }}>
                  {s.xp.toLocaleString()} / {getXPDisplayValues(s.xp).totalXPToNextLevel.toLocaleString()} XP
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT - MASTER LEVEL + SKILLS */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Master Level */}
        <div style={{ marginBottom: 8, padding: 10, background: bgT, border: `1px solid ${accDim}` }}>
          <div style={{ fontSize: 9, color: accDim, marginBottom: 6 }}>MASTER LEVEL</div>
          <div style={{ fontFamily: mono, fontSize: 16, color: acc, marginBottom: 6 }}>
            Level {op?.level || 1} // {op?.levelTitle || 'Novice'}
          </div>
          <ProgressBar value={op?.xpInLevel || 0} max={op?.xpForLevel || 500} width="100%" height={8} />
          <div style={{ fontSize: 9, color: dim, marginTop: 4 }}>
            {getXPDisplayValues(op?.totalXp || 0).totalXP.toLocaleString()} / {getXPDisplayValues(op?.totalXp || 0).totalXPToNextLevel.toLocaleString()} XP
          </div>
        </div>

        {/* Skills */}
        <div style={{ color: dim, fontSize: 9, marginBottom: 8, letterSpacing: 1 }}>// SKILLS</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
            {statTabs.map(t => (
              <button
                key={t}
                onClick={() => setSkillTab(t)}
                style={{
                  padding: '2px 6px',
                  fontSize: 8,
                  fontFamily: mono,
                  cursor: 'pointer',
                  border: `1px solid ${skillTab === t ? acc : accDim}`,
                  background: skillTab === t ? 'rgba(255,176,0,0.1)' : 'transparent',
                  color: skillTab === t ? acc : dim,
                }}
              >
                {t === 'ALL' ? 'ALL' : STAT_META[t]?.icon || t}
              </button>
            ))}
          </div>
          <div style={{ background: bgT, border: `1px solid ${accDim}`, padding: 6 }}>
            {filteredSkills.length === 0 ? (
              <div style={{ fontSize: 9, color: dim, padding: 4 }}>No skills yet</div>
            ) : (
              filteredSkills.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => onSkillClick?.(s.name)}
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 9, cursor: onSkillClick ? 'pointer' : 'default' }}
                >
                  <span style={{ color: dim }}>{s.name}</span>
                  <span style={{ color: acc }}>LVL {s.level}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Arsenal */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <button
              onClick={() => setArsenalTab('tools')}
              style={{
                padding: '2px 8px',
                fontSize: 9,
                fontFamily: mono,
                cursor: 'pointer',
                border: `1px solid ${arsenalTab === 'tools' ? acc : accDim}`,
                background: arsenalTab === 'tools' ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: arsenalTab === 'tools' ? acc : dim,
              }}
            >
              TOOLS
            </button>
            <button
              onClick={() => setArsenalTab('augments')}
              style={{
                padding: '2px 8px',
                fontSize: 9,
                fontFamily: mono,
                cursor: 'pointer',
                border: `1px solid ${arsenalTab === 'augments' ? acc : accDim}`,
                background: arsenalTab === 'augments' ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: arsenalTab === 'augments' ? acc : dim,
              }}
            >
              AUGMENTS
            </button>
          </div>
          <div style={{ background: bgT, border: `1px solid ${accDim}`, padding: 6 }}>
            {(arsenalTab === 'tools' ? tools : augments)?.length === 0 ? (
              <div style={{ fontSize: 9, color: dim, padding: 4 }}>No {arsenalTab} yet</div>
            ) : (
              (arsenalTab === 'tools' ? tools : augments)?.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 9 }}>
                  <span style={{ color: dim }}>{item.name}</span>
                  <span style={{ color: acc }}>LVL {item.level}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Course / Projects / Media / Vault */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {(['courses', 'projects', 'media', 'vault'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSpecTab(t)}
                style={{
                  padding: '2px 8px',
                  fontSize: 9,
                  fontFamily: mono,
                  cursor: 'pointer',
                  border: `1px solid ${specTab === t ? acc : accDim}`,
                  background: specTab === t ? 'rgba(255,176,0,0.1)' : 'transparent',
                  color: specTab === t ? acc : dim,
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, background: bgT, border: `1px solid ${accDim}`, padding: 6, overflowY: 'auto' }}>
            {specTab === 'courses' && (
              recentCourses?.length === 0 ? (
                <div style={{ fontSize: 9, color: dim }}>No courses yet</div>
              ) : (
                recentCourses?.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 9 }}>
                    <span style={{ color: dim }}>{c.name}</span>
                    <span style={{ color: c.status === 'COMPLETE' ? '#44ff88' : acc }}>{c.progress}%</span>
                  </div>
                ))
              )
            )}
            {specTab === 'projects' && (
              recentProjects?.length === 0 ? (
                <div style={{ fontSize: 9, color: dim }}>No projects yet</div>
              ) : (
                recentProjects?.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 9 }}>
                    <span style={{ color: dim }}>{p.name}</span>
                    <span style={{ color: p.status === 'COMPLETE' ? '#44ff88' : acc }}>{p.progress}%</span>
                  </div>
                ))
              )
            )}
            {specTab === 'media' && (
              recentMedia?.length === 0 ? (
                <div style={{ fontSize: 9, color: dim }}>No media yet</div>
              ) : (
                recentMedia?.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 9 }}>
                    <span style={{ color: dim }}>{m.title}</span>
                    <span style={{ color: m.status === 'FINISHED' ? '#44ff88' : acc }}>{m.status}</span>
                  </div>
                ))
              )
            )}
            {specTab === 'vault' && (
              recentVault?.length === 0 ? (
                <div style={{ fontSize: 9, color: dim }}>No vault items yet</div>
              ) : (
                recentVault?.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 9, gap: 8 }}>
                    <span style={{ color: dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</span>
                    <span style={{ color: acc, flexShrink: 0 }}>{v.category}</span>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* Image Upload Modal */}
      {showImageModal && (
        <ImageUploadModal
          currentImage={op?.avatar}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </div>
  );
};

export default CharSheetPage1;
