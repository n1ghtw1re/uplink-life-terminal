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
  onOpenCharacterSheet?: () => void;
  onOpenStat?: (statKey: StatKey) => void;
  onOpenSkills?: () => void;
  onOpenLibrary?: () => void;
  onOpenCourses?: () => void;
  onOpenTools?: () => void;
  onOpenResources?: () => void;
  onOpenAugments?: () => void;
  onOpenCerts?: () => void;
  onOpenProjects?: () => void;
  onOpenVault?: () => void;
  onOpenClassDocs?: () => void;
  onOpenXpDocs?: () => void;
  onOpenLifepath?: () => void;
  onOpenWidgetManager?: () => void;
  onOpenSocials?: () => void;
  onOpenDailyLog?: () => void;
  onOpenHabits?: () => void;
  onOpenNotes?: () => void;
  onOpenPlanner?: () => void;
  onOpenRecovery?: () => void;
  onOpenIngredients?: () => void;
  onOpenIntake?: () => void;
  onOpenOutput?: () => void;
  onOpenRecipes?: () => void;
  onOpenGoals?: () => void;
  onOpenTerminal?: () => void;
  onOpenClockWidget?: () => void;
  onOpenCalculatorWidget?: () => void;
  onOpenUnitConverterWidget?: () => void;
}

const sectionMap: Record<string, string> = {
  BODY: 'core',
  WIRE: 'core',
  MIND: 'core',
  COOL: 'core',
  GRIT: 'core',
  FLOW: 'core',
  GHOST: 'core',
  Arsenal: 'arsenal',
  Docs: 'docs',
  Tracking: 'tracking',
  Biosystem: 'biosystem',
  System: 'system',
  Utility: 'utility',
  Goals: 'tracking',
  Habits: 'tracking',
  Settings: 'system',
};

const Sidebar = ({
  expanded, onToggle, onExpand, theme, onThemeChange,
  onOpenCharacterSheet,
  onOpenStat, onOpenSkills, onOpenLibrary, onOpenCourses,
  onOpenTools, onOpenResources, onOpenAugments, onOpenCerts, onOpenProjects, onOpenVault, onOpenClassDocs, onOpenXpDocs, onOpenLifepath, onOpenWidgetManager, onOpenSocials, onOpenDailyLog, onOpenHabits, onOpenNotes, onOpenPlanner, onOpenRecovery,
  onOpenIngredients, onOpenIntake, onOpenOutput, onOpenRecipes, onOpenGoals, onOpenTerminal,
  onOpenClockWidget, onOpenCalculatorWidget, onOpenUnitConverterWidget,
}: SidebarProps) => {
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);

  const { data: counts } = useQuery({
    queryKey: ['arsenal-counts'],
    queryFn: async () => {
      const [courses, media, skills, tools, augments, projects] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('media').select('id', { count: 'exact', head: true }),
        supabase.from('skills').select('id', { count: 'exact', head: true }),
        supabase.from('tools').select('id', { count: 'exact', head: true }),
        supabase.from('augments').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
      ]);
      return {
        courses: courses.count ?? 0,
        library: media.count ?? 0,
        skills: skills.count ?? 0,
        tools: tools.count ?? 0,
        augments: augments.count ?? 0,
        projects: projects.count ?? 0,
      };
    },
  });

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (section: string) => setOpenSection(openSection === section ? null : section);

  const handleCollapsedClick = (label: string, statKey?: StatKey, section?: string) => {
    if (section) { onExpand?.(); setOpenSection(section); return; }
    if (statKey) { onOpenStat?.(statKey); return; }
  };

  const handleSystemItem = async (name: string) => {
    if (name === 'LOGOUT') { await supabase.auth.signOut(); window.location.reload(); }
    if (name === 'RESET XP') {
      const confirm1 = window.confirm('RESET ALL XP DATA?\n\nThis will clear:\n- All sessions and logs\n- All XP (skills, stats, tools, augments, master)\n- All levels reset to 1\n\nSkills, tools, augments, media, courses and projects will NOT be deleted.\n\nThis cannot be undone.');
      if (!confirm1) return;
      const confirm2 = window.confirm('ARE YOU SURE? This will permanently delete all progress data.');
      if (!confirm2) return;
      const { getDB } = await import('@/lib/db');
      const db = await getDB();
      await db.exec(`
        DELETE FROM sessions;
        DELETE FROM xp_log;
        DELETE FROM checkins;
        DELETE FROM habit_logs;
        UPDATE skills SET xp = 0, level = 1;
        UPDATE stats SET xp = 0, level = 1, streak = 0, dormant = true;
        UPDATE master_progress SET total_xp = 0, level = 1, streak = 0, shields = 0;
        UPDATE tool_progress SET total_xp = 0, level = 1;
        UPDATE augment_progress SET total_xp = 0, level = 1;
        UPDATE tools SET xp = 0, level = 1;
        UPDATE augments SET xp = 0, level = 1;
      `);
      window.location.reload();
    }
    if (name === 'EXPORT DATA') {
      try {
        await exportAllData();
      } catch (err) {
        console.error('Export failed:', err);
      }
    }
    if (name === 'IMPORT DATA') {
      const input = document.createElement('input');
      input.type = 'file';
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
    { icon: 'C', label: 'CORE', section: 'core' },
    { icon: 'div', label: '' },
    { icon: 'A', label: 'Arsenal', section: 'arsenal' },
    { icon: 'B', label: 'Biosystem', section: 'biosystem' },
    { icon: 'T', label: 'Tracking', section: 'tracking' },
    { icon: 'div', label: '' },
    { icon: 'D', label: 'Docs', section: 'docs' },
    { icon: 'S', label: 'System', section: 'system' },
    { icon: 'U', label: 'Utility', section: 'utility' },
    { icon: 'I', label: 'Interface', section: 'ui' },
  ];

  // ── // CORE ────────────────────────────────────────────────────────
  const coreItems = [
    { icon: 'C', name: 'CHARACTER SHEET', action: () => onOpenCharacterSheet?.() },
    { icon: 'S', name: 'SKILLS', action: () => onOpenSkills?.(), count: counts?.skills },
    { icon: 'L', name: 'LIFEPATH', action: () => onOpenLifepath?.() },
  ];

  // ── // ARSENAL ────────────────────────────────────────────────────
  const arsenalItems = [
    { icon: '>', name: 'AUGMENTS', count: counts?.augments, action: () => onOpenAugments?.() },
    { icon: '>', name: 'CERTS', action: () => onOpenCerts?.() },
    { icon: '>', name: 'COURSES', count: counts?.courses, action: () => onOpenCourses?.() },
    { icon: '>', name: 'PROJECTS', count: counts?.projects, action: () => onOpenProjects?.() },
    { icon: '>', name: 'VAULT', action: () => onOpenVault?.() },
    { icon: '>', name: 'RESOURCES', action: () => onOpenResources?.() },
    { icon: '>', name: 'TOOLS', count: counts?.tools, action: () => onOpenTools?.() },
  ];

  // ── // BIOSYSTEM ─────────────────────────────────────────────────
  const biosystemItems = [
    { icon: '>', name: 'INGREDIENTS', action: () => onOpenIngredients?.() },
    { icon: '>', name: 'INTAKE', action: () => onOpenIntake?.() },
    { icon: '>', name: 'OUTPUT', action: () => onOpenOutput?.() },
    { icon: '>', name: 'RECIPES', action: () => onOpenRecipes?.() },
    { icon: '>', name: 'RECOVERY', action: () => onOpenRecovery?.() },
  ];

  // ── // TRACKING ───────────────────────────────────────────────────
  const trackingItems = [
    { icon: 'L', name: 'DAILY LOG', action: () => onOpenDailyLog?.() },
    { icon: 'G', name: 'GOALS', action: () => onOpenGoals?.() },
    { icon: 'H', name: 'HABITS', action: () => onOpenHabits?.() },
    { icon: 'P', name: 'PLANNER', action: () => onOpenPlanner?.() },
    { icon: '@', name: 'SOCIALS', action: () => onOpenSocials?.() },
  ];

  // ── // DOCS ───────────────────────────────────────────────────────
  const docsItems = [
    { icon: '>', name: 'CLASSES', action: () => onOpenClassDocs?.() },
    { icon: '>', name: 'XP & LEVELLING', action: () => onOpenXpDocs?.() },
  ];

  // ── // SYSTEM ─────────────────────────────────────────────────────
  const systemItems = [
    { icon: '>', name: 'TERMINAL', action: () => onOpenTerminal?.() },
    { icon: 'Y', name: 'SETTINGS' },
    { icon: '?', name: 'HELP' },
    { icon: 'E', name: 'EXPORT DATA', action: () => handleSystemItem('EXPORT DATA') },
    { icon: 'I', name: 'IMPORT DATA', action: () => handleSystemItem('IMPORT DATA') },
    { icon: 'R', name: 'RESET XP', action: () => handleSystemItem('RESET XP') },
    { icon: 'X', name: 'LOGOUT', action: () => handleSystemItem('LOGOUT') },
  ];

  // ── // UTILITY ────────────────────────────────────────────────────
  const utilityItems = [
    { icon: 'C', name: 'CLOCK', action: () => onOpenClockWidget?.() },
    { icon: 'K', name: 'CALCULATOR', action: () => onOpenCalculatorWidget?.() },
    { icon: 'U', name: 'UNIT CONVERTER', action: () => onOpenUnitConverterWidget?.() },
    { icon: 'N', name: 'NOTES', action: () => onOpenNotes?.() },
  ];

  const sortedThemeOptions = useMemo<ThemeCode[]>(
    () => ([...THEME_OPTIONS].sort((a, b) => a.localeCompare(b)) as ThemeCode[]), []
  );

  return (
    <div style={{
      width: expanded ? 220 : 48,
      transition: 'width 150ms ease',
      background: 'hsl(var(--bg-primary))',
      borderRight: '1px solid hsl(var(--accent))',
      height: '100%',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
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
        {expanded ? '<' : '>'}
      </button>

      {!expanded ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 4 }}>
          {collapsedIcons.map((item, i) => (
            item.icon === 'div' ? (
              <div key={i} style={{ width: 32, height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />
            ) : (
              <div
                key={i}
                title={item.label}
                onClick={() => handleCollapsedClick(item.label, (item as any).statKey, (item as any).section)}
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

          {/* // CORE */}
          <div className={`sidebar-section ${openSection === 'core' || openSection === 'core-stats' ? 'active' : ''}`} onClick={() => { setOpenSection(openSection === 'core' || openSection === 'core-stats' ? null : 'core'); }}>
            <span>// CORE</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'core' || openSection === 'core-stats' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {(openSection === 'core' || openSection === 'core-stats') && (
            <>
              <div className="sidebar-item" onClick={() => onOpenCharacterSheet?.()} style={{ cursor: 'pointer' }}>
                <span>C CHARACTER SHEET</span>
              </div>
              <div className={`sidebar-section ${openSection === 'core-stats' ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setOpenSection(openSection === 'core-stats' ? 'core' : 'core-stats'); }} style={{ paddingLeft: 16 }}>
                <span>STATS</span>
                <span style={{ transition: 'transform 150ms', transform: openSection === 'core-stats' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
              </div>
              {openSection === 'core-stats' && [...(stats ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                <div key={s.key} className={`sidebar-item ${s.dormant ? 'dormant' : ''}`} onClick={() => onOpenStat?.(s.key as StatKey)} style={{ cursor: 'pointer', paddingLeft: 24 }}>
                  <span>{s.icon} {s.name}</span>
                  <span style={{ fontSize: 9 }}>{s.dormant ? 'DORMANT' : `LVL ${s.level}`}</span>
                </div>
              ))}
              {coreItems.filter(i => i.name !== 'CHARACTER SHEET').map(item => (
                <div key={item.name} className="sidebar-item" onClick={() => item.action?.()} style={{ cursor: 'pointer' }}>
                  <span>{item.icon} {item.name}</span>
                  <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{item.count !== undefined ? `(${item.count})` : '-'}</span>
                </div>
              ))}
            </>
          )}

          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />

          {/* // ARSENAL */}
          <div className={`sidebar-section ${openSection === 'arsenal' ? 'active' : ''}`} onClick={() => toggleSection('arsenal')}>
            <span>// ARSENAL</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'arsenal' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {openSection === 'arsenal' && arsenalItems.map(item => (
            <div key={item.name} className="sidebar-item" onClick={() => item.action?.()} style={{ cursor: 'pointer' }}>
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>{item.count !== undefined ? `(${item.count})` : '-'}</span>
            </div>
          ))}

          {/* // BIOSYSTEM */}
          <div className={`sidebar-section ${openSection === 'biosystem' ? 'active' : ''}`} onClick={() => toggleSection('biosystem')}>
            <span>// BIOSYSTEM</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'biosystem' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {openSection === 'biosystem' && biosystemItems.map(item => (
            <div key={item.name} className="sidebar-item" onClick={() => item.action?.()} style={{ cursor: 'pointer' }}>
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>-</span>
            </div>
          ))}

          {/* // TRACKING */}
          <div className={`sidebar-section ${openSection === 'tracking' ? 'active' : ''}`} onClick={() => toggleSection('tracking')}>
            <span>// TRACKING</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'tracking' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {openSection === 'tracking' && trackingItems.map(item => (
            <div key={item.name} className="sidebar-item" onClick={() => item.action?.()} style={{ cursor: 'pointer' }}>
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>-</span>
            </div>
          ))}

          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />

          {/* // DOCS */}
          <div className={`sidebar-section ${openSection === 'docs' ? 'active' : ''}`} onClick={() => toggleSection('docs')}>
            <span>// DOCS</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'docs' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {openSection === 'docs' && docsItems.map(item => (
            <div key={item.name} className="sidebar-item" onClick={() => item.action?.()} style={{ cursor: 'pointer' }}>
              <span>{item.icon} {item.name}</span>
            </div>
          ))}

          {/* // SYSTEM */}
          <div className={`sidebar-section ${openSection === 'system' ? 'active' : ''}`} onClick={() => toggleSection('system')}>
            <span>// SYSTEM</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'system' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {openSection === 'system' && systemItems.map(item => (
            <div
              key={item.name}
              className="sidebar-item"
              onClick={() => item.action?.()}
              style={{
                cursor: 'pointer',
                color: item.name === 'LOGOUT' ? 'hsl(0,80%,55%)' : item.name === 'RESET XP' ? '#ff6600' : undefined,
              }}
              onMouseEnter={item.name === 'LOGOUT' ? e => (e.currentTarget.style.color = 'hsl(0,80%,70%)') : undefined}
              onMouseLeave={item.name === 'LOGOUT' ? e => (e.currentTarget.style.color = 'hsl(0,80%,55%)') : undefined}
            >
              <span>{item.icon} {item.name}</span>
            </div>
          ))}

          {/* // UTILITY */}
          <div className={`sidebar-section ${openSection === 'utility' ? 'active' : ''}`} onClick={() => toggleSection('utility')}>
            <span>// UTILITY</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'utility' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {openSection === 'utility' && utilityItems.map(item => (
            <div key={item.name} className="sidebar-item" onClick={() => item.action?.()} style={{ cursor: 'pointer' }}>
              <span>{item.icon} {item.name}</span>
              <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))' }}>WIDGET</span>
            </div>
          ))}

          <div style={{ height: 1, background: 'hsl(var(--accent-dim))', margin: '4px 0' }} />

          {/* // INTERFACE */}
          <div className={`sidebar-section ${openSection === 'ui' ? 'active' : ''}`} onClick={() => toggleSection('ui')}>
            <span>// INTERFACE</span>
            <span style={{ transition: 'transform 150ms', transform: openSection === 'ui' ? 'rotate(90deg)' : 'none' }}>{'>'}</span>
          </div>
          {openSection === 'ui' && (
            <>
              <div className="sidebar-item" onClick={() => onOpenWidgetManager?.()} style={{ cursor: 'pointer' }}>
                <span>+ ADD WIDGET</span>
              </div>
              <div className="sidebar-item" style={{ color: 'hsl(var(--accent-dim))' }}>
                <span>[ LAYOUTS ]</span>
              </div>
              <div style={{ padding: '4px 12px 8px' }}>
                <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 4 }}>THEME</div>
                <div className="crt-select-wrapper" style={{ width: '100%' }}>
                  <select className="crt-select" value={theme} onChange={(e) => onThemeChange(e.target.value as ThemeCode)}>
                    {sortedThemeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
