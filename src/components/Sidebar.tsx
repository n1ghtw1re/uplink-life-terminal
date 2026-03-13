import { useState } from 'react';
import { arsenalCounts, trackingCounts } from '@/data/mockData';
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
}

const sectionMap: Record<string, string> = {
  'BODY': 'stats', 'WIRE': 'stats', 'MIND': 'stats',
  'COOL': 'stats', 'GRIT': 'stats', 'FLOW': 'stats', 'GHOST': 'stats',
  'Arsenal': 'arsenal',
  'Goals': 'tracking', 'Habits': 'tracking',
  'Settings': 'system',
};

const Sidebar = ({ expanded, onToggle, onExpand, onOpenCharSheet, onOpenStat }: SidebarProps) => {
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleCollapsedClick = (label: string, statKey?: StatKey) => {
    if (label === 'Character Sheet') { onOpenCharSheet?.(); return; }
    if (label === 'Dashboard') { onExpand?.(); setOpenSection(null); return; }
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
    ...(stats ?? []).map(s => ({ icon: s.icon, label: s.name, statKey: s.key as StatKey })),
    { icon: 'div', label: '' },
    { icon: '📚', label: 'Arsenal' },
    { icon: '◎', label: 'Goals' },
    { icon: '✓', label: 'Habits' },
    { icon: 'div', label: '' },
    { icon: '⚙', label: 'Settings' },
  ];

  const arsenalItems = [
    { icon: '📚', name: 'COURSES', count: arsenalCounts.courses },
    { icon: '📖', name: 'LIBRARY', count: arsenalCounts.library },
    { icon: '⚙', name: 'PROJECTS', count: arsenalCounts.projects },
    { icon: '🏆', name: 'CERTS', count: arsenalCounts.certs },
    { icon: '🔧', name: 'TOOLS', count: arsenalCounts.tools },
    { icon: '🤖', name: 'AUGMENTS', count: arsenalCounts.augments },
    { icon: '🔗', name: 'RESOURCES', count: arsenalCounts.resources },
  ];

  const trackingItems = [
    { icon: '◎', name: 'GOALS', count: trackingCounts.goals },
    { icon: '✓', name: 'HABITS', count: trackingCounts.habits },
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
          {openSection === 'stats' && (stats ?? []).map(s => (
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

          {/* ARSENAL section */}
          <div
            className={`sidebar-section ${openSection === 'arsenal' ? 'active' : ''}`}
            onClick={() => toggleSection('arsenal')}
          >
            <span>// ARSENAL</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'arsenal' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'arsenal' && arsenalItems.map(item => (
            <div key={item.name} className="sidebar-item">
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>({item.count})</span>
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
              {'count' in item && <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>({item.count})</span>}
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
          <div className="sidebar-item" style={{ padding: '8px 12px', color: 'hsl(var(--accent-dim))' }}>
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