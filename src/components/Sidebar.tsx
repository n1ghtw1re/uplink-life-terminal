import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { StatKey } from '@/types';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
  onExpand?: () => void;
  onOpenCharSheet?: () => void;
  onOpenStat?: (statKey: StatKey) => void;
  onOpenSkills?: () => void;
  onOpenLibrary?: () => void;
  onOpenCourses?: () => void;
  onOpenWidgetManager?: () => void;
}

const sectionMap: Record<string, string> = {
  'BODY': 'stats', 'WIRE': 'stats', 'MIND': 'stats',
  'COOL': 'stats', 'GRIT': 'stats', 'FLOW': 'stats', 'GHOST': 'stats',
  'Arsenal': 'arsenal', 'Tracking': 'tracking', 'System': 'system',
  'Goals': 'tracking', 'Habits': 'tracking',
  'Settings': 'system',
};

const Sidebar = ({ expanded, onToggle, onExpand, onOpenCharSheet, onOpenStat, onOpenSkills, onOpenLibrary, onOpenCourses, onOpenWidgetManager }: SidebarProps) => {
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);

  const { data: counts } = useQuery({
    queryKey: ['arsenal-counts', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [courses, media, skills] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('media').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('skills').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      ]);
      return {
        courses: courses.count ?? 0,
        library: media.count ?? 0,
        projects: skills.count ?? 0, // placeholder until projects table built
      };
    },
  });
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleCollapsedClick = (label: string, statKey?: StatKey) => {
    if (label === 'Character Sheet') { onOpenCharSheet?.(); return; }
    if (label === 'Dashboard') { onExpand?.(); setOpenSection(null); return; }
    if (label === 'Skills') { onOpenSkills?.(); return; }
    if (statKey) { onOpenStat?.(statKey); return; }
    const section = sectionMap[label];
    if (section) { onExpand?.(); setOpenSection(section); }
  };

  const handleSystemItem = async (name: string) => {
    if (name === 'LOGOUT') {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const collapsedIcons = [
    { icon: '⌂', label: 'Dashboard' },
    { icon: '◈', label: 'Character Sheet' },
    { icon: 'div', label: '' },
    // Stats — sorted alpha, each opens stat page
    ...[...(stats ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ icon: s.icon, label: s.name, statKey: s.key as StatKey })),
    { icon: 'div', label: '' },
    // Skills — opens Skills page
    { icon: '◫', label: 'Skills' },
    { icon: 'div', label: '' },
    { icon: '▦', label: 'Arsenal' },
    { icon: 'div', label: '' },
    { icon: '◉', label: 'Tracking' },
    { icon: 'div', label: '' },
    { icon: '⚙', label: 'System' },
  ];

  const arsenalItems = [
    { icon: '▸', name: 'COURSES',   count: counts?.courses },
    { icon: '▸', name: 'LIBRARY',   count: counts?.library },
    { icon: '▸', name: 'PROJECTS',  count: undefined },
    { icon: '▸', name: 'CERTS',     count: undefined },
    { icon: '▸', name: 'TOOLS',     count: undefined },
    { icon: '▸', name: 'AUGMENTS',  count: undefined },
    { icon: '▸', name: 'RESOURCES', count: undefined },
  ];

  const trackingItems = [
    { icon: '◎', name: 'GOALS',   count: undefined },
    { icon: '✓', name: 'HABITS',  count: undefined },
    { icon: '📅', name: 'PLANNER' },
    { icon: '📝', name: 'NOTES' },
    { icon: '🖥', name: 'TERMINAL' },
    { icon: '👤', name: 'SOCIALS' },
  ];

  const systemItems = [
    { icon: '⚙', name: 'SETTINGS' },
    { icon: '?', name: 'HELP' },
    { icon: '💾', name: 'EXPORT DATA' },
    { icon: '⏻', name: 'LOGOUT' },
  ];

  return (
    <div style={{
      width: expanded ? 220 : 48,
      transition: 'width 150ms ease',
      background: 'hsl(30 100% 3%)',
      borderRight: '1px solid hsl(var(--accent-dim))',
      height: '100%',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '8px 0',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid hsl(var(--accent-dim))',
          color: 'hsl(var(--accent))',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
        }}
      >
        {expanded ? '‹' : '›'}
      </button>

      {!expanded ? (
        /* Collapsed - icon rail */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 4 }}>
          {collapsedIcons.map((item, i) => (
            item.icon === 'div' ? (
              <div key={i} style={{ width: 32, height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
            ) : (
              <div
                key={i}
                title={item.label}
                onClick={() => handleCollapsedClick(item.label, (item as any).statKey)}
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: 'hsl(var(--text-dim))',
                }}
                className="text-glow"
                onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--accent))')}
                onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--text-dim))')}
              >
                {item.icon}
              </div>
            )
          ))}
        </div>
      ) : (
        /* Expanded */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="sidebar-item" style={{ padding: '8px 12px', fontWeight: 600, color: 'hsl(var(--accent))' }}>
            ⌂ DASHBOARD
          </div>
          <div className="sidebar-item" style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => onOpenCharSheet?.()}>
            ◈ CHARACTER SHEET
          </div>
          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />

          {/* STATS section */}
          <div
            className={`sidebar-section ${openSection === 'stats' ? 'active' : ''}`}
            onClick={() => toggleSection('stats')}
          >
            <span>// STATS</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'stats' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'stats' && [...(stats ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map(s => (
            <div
              key={s.key}
              className={`sidebar-item ${s.dormant ? 'dormant' : ''}`}
              onClick={() => onOpenStat?.(s.key as StatKey)}
              style={{ cursor: 'pointer' }}
            >
              <span>{s.icon} {s.name}</span>
              <span style={{ fontSize: 9 }}>{s.dormant ? 'DORMANT' : `LVL ${s.level}`}</span>
            </div>
          ))}

          {/* SKILLS link */}
          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
          <div
            className="sidebar-item"
            onClick={() => onOpenSkills?.()}
            style={{ cursor: 'pointer', padding: '8px 12px' }}
          >
            <span>◫ SKILLS</span>
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{(stats ?? []).length}</span>
          </div>
          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />

          {/* ARSENAL section */}
          <div
            className={`sidebar-section ${openSection === 'arsenal' ? 'active' : ''}`}
            onClick={() => toggleSection('arsenal')}
          >
            <span>// ARSENAL</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'arsenal' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'arsenal' && arsenalItems.map(item => (
            <div
              key={item.name}
              className="sidebar-item"
              style={{ cursor: (item.name === 'LIBRARY' || item.name === 'COURSES') ? 'pointer' : undefined }}
              onClick={() => {
                if (item.name === 'LIBRARY') onOpenLibrary?.();
                if (item.name === 'COURSES') onOpenCourses?.();
              }}
            >
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{item.count !== undefined ? `(${item.count})` : '—'}</span>
            </div>
          ))}

          {/* TRACKING section */}
          <div
            className={`sidebar-section ${openSection === 'tracking' ? 'active' : ''}`}
            onClick={() => toggleSection('tracking')}
          >
            <span>// TRACKING</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'tracking' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'tracking' && trackingItems.map(item => (
            <div key={item.name} className="sidebar-item">
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{item.count !== undefined ? `(${item.count})` : '—'}</span>
            </div>
          ))}

          {/* SYSTEM section */}
          <div
            className={`sidebar-section ${openSection === 'system' ? 'active' : ''}`}
            onClick={() => toggleSection('system')}
          >
            <span>// SYSTEM</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'system' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'system' && systemItems.map(item => (
            <div
              key={item.name}
              className="sidebar-item"
              onClick={() => handleSystemItem(item.name)}
              style={{
                cursor: item.name === 'LOGOUT' ? 'pointer' : undefined,
                color: item.name === 'LOGOUT' ? 'hsl(0, 80%, 55%)' : undefined,
              }}
              onMouseEnter={item.name === 'LOGOUT' ? e => (e.currentTarget.style.color = 'hsl(0, 80%, 70%)') : undefined}
              onMouseLeave={item.name === 'LOGOUT' ? e => (e.currentTarget.style.color = 'hsl(0, 80%, 55%)') : undefined}
            >
              <span>{item.icon} {item.name}</span>
            </div>
          ))}

          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
          <div
            className="sidebar-item"
            style={{ padding: '8px 12px', cursor: 'pointer' }}
            onClick={() => onOpenWidgetManager?.()}
          >
            [ + ADD WIDGET ]
          </div>
          <div className="sidebar-item" style={{ padding: '8px 12px', color: 'hsl(var(--accent-dim))' }}>
            [ LAYOUTS ]
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;