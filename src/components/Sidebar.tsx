import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { StatKey } from '@/types';
import { THEME_OPTIONS, type ThemeCode } from '@/lib/themes';
import { exportAllData, importData } from '@/services/exportService';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
  onExpand?: () => void;
  theme: ThemeCode;
  onThemeChange: (t: ThemeCode) => void;
  onOpenCharSheet?: () => void;
  onOpenStat?: (statKey: StatKey) => void;
  onOpenSkills?: () => void;
  onOpenLibrary?: () => void;
  onOpenCourses?: () => void;
  onOpenTools?: () => void;
  onOpenLifepath?: () => void;
  onOpenWidgetManager?: () => void;
  onOpenSocials?: () => void;
  onOpenClockWidget?: () => void;
  onOpenCalculatorWidget?: () => void;
  onOpenUnitConverterWidget?: () => void;
}

const sectionMap: Record<string, string> = {
  'BODY': 'stats', 'WIRE': 'stats', 'MIND': 'stats',
  'COOL': 'stats', 'GRIT': 'stats', 'FLOW': 'stats', 'GHOST': 'stats',
  'Arsenal': 'arsenal', 'Tracking': 'tracking', 'System': 'system', 'Utility': 'utility',
  'Goals': 'tracking', 'Habits': 'tracking', 'Settings': 'system',
};

const Sidebar = ({
  expanded, onToggle, onExpand, theme, onThemeChange,
  onOpenCharSheet, onOpenStat, onOpenSkills, onOpenLibrary, onOpenCourses,
  onOpenTools, onOpenLifepath, onOpenWidgetManager, onOpenSocials,
  onOpenClockWidget, onOpenCalculatorWidget, onOpenUnitConverterWidget,
}: SidebarProps) => {
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);

  const { data: counts } = useQuery({
    queryKey: ['arsenal-counts'],
    queryFn: async () => {
      const [courses, media, skills, tools] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('media').select('id', { count: 'exact', head: true }),
        supabase.from('skills').select('id', { count: 'exact', head: true }),
        supabase.from('tools').select('id', { count: 'exact', head: true }),
      ]);
      return { courses: courses.count ?? 0, library: media.count ?? 0, skills: skills.count ?? 0, tools: tools.count ?? 0 };
    },
  });

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (section: string) => setOpenSection(openSection === section ? null : section);

  const handleCollapsedClick = (label: string, statKey?: StatKey) => {
    if (label === 'Character Sheet') { onOpenCharSheet?.(); return; }
    if (label === 'Dashboard') { onExpand?.(); setOpenSection(null); return; }
    if (label === 'Skills') { onOpenSkills?.(); return; }
    if (label === 'Lifepath') { onOpenLifepath?.(); return; }
    if (label === 'SOCIALS') { onOpenSocials?.(); return; }
    if (label === 'Utility') { onExpand?.(); setOpenSection('utility'); onOpenUnitConverterWidget?.(); return; }
    if (statKey) { onOpenStat?.(statKey); return; }
    const section = sectionMap[label];
    if (section) { onExpand?.(); setOpenSection(section); }
  };

  const handleSystemItem = async (name: string) => {
    if (name === 'LOGOUT') { await supabase.auth.signOut(); window.location.reload(); }
    if (name === 'EXPORT DATA') {
      try {
        await exportAllData();
      } catch (err) {
        console.error('Export failed:', err);
      }
    }
    if (name === 'IMPORT DATA') {
      const input = document.createElement('input');
      input.type  = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const text = await file.text();
        const result = await importData(text);
        if (result.success) {
          window.location.reload();
        } else {
          alert('Import failed: ' + result.error);
        }
      };
      input.click();
    }
  };

  const collapsedIcons = [
    { icon: '⌂', label: 'Dashboard' },
    { icon: '◈', label: 'Character Sheet' },
    { icon: 'div', label: '' },
    ...[...(stats ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map(s => ({ icon: s.icon, label: s.name, statKey: s.key as StatKey })),
    { icon: 'div', label: '' },
    { icon: '◫', label: 'Skills' },
    { icon: '⬡', label: 'Lifepath' },
    { icon: 'div', label: '' },
    { icon: '▦', label: 'Arsenal' },
    { icon: 'div', label: '' },
    { icon: '◉', label: 'Tracking' },
    { icon: 'div', label: '' },
    { icon: '⚙', label: 'System' },
    { icon: 'div', label: '' },
    { icon: '◷', label: 'Utility' },
  ];

  const arsenalItems = [
    { icon: '▸', name: 'COURSES',   count: counts?.courses },
    { icon: '▸', name: 'LIBRARY',   count: counts?.library },
    { icon: '▸', name: 'PROJECTS',  count: undefined },
    { icon: '▸', name: 'CERTS',     count: undefined },
    { icon: '▸', name: 'TOOLS',     count: counts?.tools },
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
    { icon: '📂', name: 'IMPORT DATA' },
    { icon: '⏻', name: 'LOGOUT' },
  ];

  const utilityItems = [
    { icon: '◷', name: 'CLOCK',          action: () => onOpenClockWidget?.() },
    { icon: '⌨', name: 'CALCULATOR',     action: () => onOpenCalculatorWidget?.() },
    { icon: '⇄', name: 'UNIT CONVERTER', action: () => onOpenUnitConverterWidget?.() },
  ];

  const sortedThemeOptions = useMemo<ThemeCode[]>(
    () => ([...THEME_OPTIONS].sort((a, b) => a.localeCompare(b)) as ThemeCode[]), []
  );

  return (
    <div style={{
      width: expanded ? 220 : 48, transition: 'width 150ms ease',
      background: 'hsl(var(--bg-primary))', borderRight: '1px solid hsl(var(--accent))',
      height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '8px 0', background: 'transparent', border: 'none',
        borderBottom: '1px solid hsl(var(--accent-dim))', color: 'hsl(var(--accent))',
        cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
      }}>
        {expanded ? '‹' : '›'}
      </button>

      {!expanded ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 4 }}>
          {collapsedIcons.map((item, i) => (
            item.icon === 'div' ? (
              <div key={i} style={{ width: 32, height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
            ) : (
              <div
                key={i} title={item.label}
                onClick={() => handleCollapsedClick(item.label, (item as any).statKey)}
                style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'hsl(var(--text-dim))' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="sidebar-item" style={{ padding: '8px 12px', fontWeight: 600, color: 'hsl(var(--accent))' }}>⌂ DASHBOARD</div>
          <div className="sidebar-item" style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => onOpenCharSheet?.()}>◈ CHARACTER SHEET</div>
          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />

          {/* STATS */}
          <div className={`sidebar-section ${openSection === 'stats' ? 'active' : ''}`} onClick={() => toggleSection('stats')}>
            <span>// STATS</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'stats' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'stats' && [...(stats ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map(s => (
            <div key={s.key} className={`sidebar-item ${s.dormant ? 'dormant' : ''}`} onClick={() => onOpenStat?.(s.key as StatKey)} style={{ cursor: 'pointer' }}>
              <span>{s.icon} {s.name}</span>
              <span style={{ fontSize: 9 }}>{s.dormant ? 'DORMANT' : `LVL ${s.level}`}</span>
            </div>
          ))}

          {/* SKILLS */}
          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
          <div className="sidebar-item" onClick={() => onOpenSkills?.()} style={{ cursor: 'pointer', padding: '8px 12px' }}>
            <span>◫ SKILLS</span>
            <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{counts?.skills ?? 0}</span>
          </div>

          {/* LIFEPATH — between SKILLS and ARSENAL */}
          <div className="sidebar-item" onClick={() => onOpenLifepath?.()} style={{ cursor: 'pointer', padding: '8px 12px' }}>
            <span>⬡ LIFEPATH</span>
          </div>
          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />

          {/* ARSENAL */}
          <div className={`sidebar-section ${openSection === 'arsenal' ? 'active' : ''}`} onClick={() => toggleSection('arsenal')}>
            <span>// ARSENAL</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'arsenal' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'arsenal' && arsenalItems.map(item => (
            <div key={item.name} className="sidebar-item"
              style={{ cursor: (item.name === 'LIBRARY' || item.name === 'COURSES') ? 'pointer' : undefined }}
              onClick={() => { if (item.name === 'LIBRARY') onOpenLibrary?.(); if (item.name === 'COURSES') onOpenCourses?.(); if (item.name === 'TOOLS') onOpenTools?.(); }}
            >
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{item.count !== undefined ? `(${item.count})` : '—'}</span>
            </div>
          ))}

          {/* TRACKING */}
          <div className={`sidebar-section ${openSection === 'tracking' ? 'active' : ''}`} onClick={() => toggleSection('tracking')}>
            <span>// TRACKING</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'tracking' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'tracking' && trackingItems.map(item => (
            <div key={item.name} className="sidebar-item"
              style={{ cursor: item.name === 'SOCIALS' ? 'pointer' : undefined }}
              onClick={() => { if (item.name === 'SOCIALS') onOpenSocials?.(); }}
            >
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{(item as any).count !== undefined ? `(${(item as any).count})` : '—'}</span>
            </div>
          ))}

          {/* SYSTEM */}
          <div className={`sidebar-section ${openSection === 'system' ? 'active' : ''}`} onClick={() => toggleSection('system')}>
            <span>// SYSTEM</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'system' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'system' && systemItems.map(item => (
            <div key={item.name} className="sidebar-item" onClick={() => handleSystemItem(item.name)}
              style={{ cursor: item.name === 'LOGOUT' ? 'pointer' : undefined, color: item.name === 'LOGOUT' ? 'hsl(0,80%,55%)' : undefined }}
              onMouseEnter={item.name === 'LOGOUT' ? e => (e.currentTarget.style.color = 'hsl(0,80%,70%)') : undefined}
              onMouseLeave={item.name === 'LOGOUT' ? e => (e.currentTarget.style.color = 'hsl(0,80%,55%)') : undefined}
            >
              <span>{item.icon} {item.name}</span>
            </div>
          ))}

          {/* UTILITY */}
          <div className={`sidebar-section ${openSection === 'utility' ? 'active' : ''}`}
            onClick={() => { const wasOpen = openSection === 'utility'; toggleSection('utility'); if (!wasOpen) onOpenUnitConverterWidget?.(); }}
          >
            <span>// Utility</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'utility' ? 'rotate(90deg)' : 'none' }}>›</span>
          </div>
          {openSection === 'utility' && utilityItems.map(item => (
            <div key={item.name} className="sidebar-item" onClick={() => item.action?.()} style={{ cursor: 'pointer' }}>
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>WIDGET</span>
            </div>
          ))}

          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
          <div className="sidebar-item" style={{ padding: '8px 12px', cursor: 'pointer' }} onClick={() => onOpenWidgetManager?.()}>[ + ADD WIDGET ]</div>
          <div className="sidebar-item" style={{ padding: '8px 12px', color: 'hsl(var(--accent-dim))' }}>[ LAYOUTS ]</div>
          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
          <div className="sidebar-section" style={{ pointerEvents: 'none', cursor: 'default' }}><span>// THEMES</span></div>
          <div style={{ padding: '0 12px 8px' }}>
            <div className="crt-select-wrapper" style={{ width: '100%' }}>
              <select className="crt-select" value={theme} onChange={(e) => onThemeChange(e.target.value as ThemeCode)}>
                {sortedThemeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;