import { useState, useEffect, useCallback } from 'react';
import ReactGridLayout from 'react-grid-layout';
import type { Layout as RGLLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import CRTEffects from '@/components/CRTEffects';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import Modal from '@/components/Modal';
import XPWidget from '@/components/widgets/XPWidget';
import CheckinWidget from '@/components/widgets/CheckinWidget';
import HeatmapWidget from '@/components/widgets/HeatmapWidget';
import StatOverviewWidget from '@/components/widgets/StatOverviewWidget';
import CoursesWidget from '@/components/widgets/CoursesWidget';
import MediaWidget from '@/components/widgets/MediaWidget';
import SkillsWidget from '@/components/widgets/SkillsWidget';
import ClockWidget from '@/components/widgets/ClockWidget';
import CalculatorWidget from '@/components/widgets/CalculatorWidget';
import UnitConverterWidget from '@/components/widgets/UnitConverterWidget';
import ToolsWidget from '@/components/widgets/ToolsWidget';
import AugmentsWidget from '@/components/widgets/AugmentsWidget';
import ProjectsWidget from '@/components/widgets/ProjectsWidget';
import NotesWidget from '@/components/widgets/NotesWidget';
import QuickLogOverlay from '@/components/overlays/QuickLogOverlay';
import CharacterSheet from '@/components/overlays/CharacterSheet';
import SearchOverlay from '@/components/overlays/SearchOverlay';
import StatDetailOverlay from '@/components/overlays/StatDetailOverlay';
import SkillsPage from '@/components/overlays/SkillsPage';
import LibraryPage from '@/components/overlays/LibraryPage';
import CoursesPage from '@/components/overlays/CoursesPage';
import DailyLogPage from '@/components/overlays/DailyLogPage';
import NotesPage from '@/components/overlays/NotesPage';
import SocialsOverlay from '@/components/overlays/SocialsOverlay';
import LifepathPage from '@/components/overlays/LifepathPage';
import ToolsPage from '@/components/overlays/ToolsPage';
import AugmentsPage from '@/components/overlays/AugmentsPage';
import ProjectsPage from '@/components/overlays/ProjectsPage';
import WidgetManager from '@/components/overlays/WidgetManager';
import FirstBootWizard from '@/components/wizard/FirstBootWizard';
import DetailDrawer from '@/components/drawer/DetailDrawer';
import type { DrawerItem } from '@/components/drawer/DetailDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import { StatKey } from '@/types';
import { applyThemeClass, normalizeTheme, type ThemeCode } from '@/lib/themes';

type LayoutItem = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };

const ALL_WIDGET_IDS = ['xp', 'checkin', 'heatmap', 'stats', 'courses', 'media', 'skills', 'tools', 'augments', 'projects', 'notes', 'clock', 'calculator', 'unitConverter'];
const DEFAULT_ACTIVE_WIDGET_IDS = ['xp', 'checkin', 'heatmap', 'stats', 'courses', 'media', 'skills'];

const defaultLayout: LayoutItem[] = [
  { i: 'xp', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'checkin', x: 4, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'heatmap', x: 7, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
  { i: 'stats', x: 0, y: 4, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'courses', x: 4, y: 3, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'media', x: 8, y: 3, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'skills', x: 4, y: 7, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'tools',    x: 0, y: 8, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'augments',  x: 4, y: 8, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'projects',  x: 8, y: 8, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'clock', x: 8, y: 7, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'calculator', x: 0, y: 9, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'tools',         x: 0, y: 8, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'unitConverter', x: 4, y: 9, w: 4, h: 4, minW: 2, minH: 2 },
];

const widgetNames: Record<string, string> = {
  xp: 'XP & LEVELLING', checkin: 'DAILY CHECK-IN', heatmap: 'STREAK HEATMAP',
  stats: 'STAT OVERVIEW', courses: 'COURSES', media: 'MEDIA LIBRARY',
  skills: 'SKILLS', tools: 'TOOLS', augments: 'AUGMENTS', projects: 'PROJECTS', notes: 'NOTES',
  clock: 'CLOCK', calculator: 'CALCULATOR', unitConverter: 'UNIT CONVERTER',
};

const Index = () => {
  const { user } = useAuth();
  const { data: op, isLoading: opLoading, refetch: refetchOp } = useOperator(user?.id);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState<ThemeCode>(() => normalizeTheme(localStorage.getItem('uplink-theme')));
  const [showLog, setShowLog] = useState(false);
  const [showChar, setShowChar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSocials, setShowSocials] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showNotesPage, setShowNotesPage] = useState(false);
  const [showLifepath, setShowLifepath] = useState(false);
  const [showTools, setShowTools]         = useState(false);
  const [showAugments, setShowAugments]   = useState(false);
  const [showProjects, setShowProjects]   = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<DrawerItem | null>(null);
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try { const s = localStorage.getItem('uplink-layout'); return s ? JSON.parse(s) : defaultLayout; }
    catch { return defaultLayout; }
  });
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    try { const s = localStorage.getItem('uplink-active-widgets'); return s ? JSON.parse(s) : DEFAULT_ACTIVE_WIDGET_IDS; }
    catch { return DEFAULT_ACTIVE_WIDGET_IDS; }
  });
  const [fullscreenWidget, setFullscreenWidget] = useState<string | null>(null);
  const [focusedWidget, setFocusedWidget] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [openStatKey, setOpenStatKey] = useState<StatKey | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);

  const sidebarWidth = sidebarExpanded ? 220 : 48;
  const openDrawer = (type: DrawerItem['type'], id: string) => { setDrawerItem({ type, id }); setDrawerOpen(true); };
  const closeDrawer = () => setDrawerOpen(false);
  const drawerWidth = drawerOpen ? 420 : 0;

  useEffect(() => {
    const update = () => setGridSize({ width: window.innerWidth - sidebarWidth - drawerWidth, height: window.innerHeight - 48 });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sidebarWidth, drawerWidth]);

  useEffect(() => {
    applyThemeClass(document.documentElement, theme);
    localStorage.setItem('uplink-theme', theme);
  }, [theme]);

  const handleThemeChange = (t: string) => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);
    setTheme(normalizeTheme(t));
  };

  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') {
      if (showLifepath) { setShowLifepath(false); return; }
      if (showDailyLog) { setShowDailyLog(false); return; }
      if (showNotesPage) { setShowNotesPage(false); return; }
      if (openStatKey) { setOpenStatKey(null); return; }
      if (drawerOpen) { closeDrawer(); return; }
      if (fullscreenWidget) { setFullscreenWidget(null); return; }
      setShowLog(false); setShowChar(false); setShowSearch(false); setShowCheckin(false);
      return;
    }
    if (e.key === ' ') { e.preventDefault(); setShowLog(true); }
    if (e.key === 'c' || e.key === 'C') setShowChar(true);
    if (e.key === '/') { e.preventDefault(); setShowSearch(true); }
    if (e.key === '[') setSidebarExpanded(false);
    if (e.key === ']') setSidebarExpanded(true);
  }, [fullscreenWidget, drawerOpen, openStatKey, showLifepath, showDailyLog, showNotesPage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const rowHeight = 80;

  const handleClose = (id: string) => {
    if (fullscreenWidget === id) setFullscreenWidget(null);
    setFocusedWidget(prev => prev === id ? null : prev);
    setLayout(prev => { const n = prev.filter(i => i.i !== id); localStorage.setItem('uplink-layout', JSON.stringify(n)); return n; });
    setActiveWidgets(prev => { const n = prev.filter(w => w !== id); localStorage.setItem('uplink-active-widgets', JSON.stringify(n)); return n; });
  };

  const handleRestore = (id: string) => {
    const def = defaultLayout.find(d => d.i === id) ?? { i: id, x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 2 };
    const cols = 12;
    const findSlot = (current: LayoutItem[]) => {
      const maxY = current.reduce((m, l) => Math.max(m, l.y + l.h), 0);
      for (let row = 0; row <= maxY; row++)
        for (let col = 0; col <= cols - def.w; col++)
          if (!current.some(l => col < l.x + l.w && col + def.w > l.x && row < l.y + l.h && row + def.h > l.y))
            return { x: col, y: row };
      return { x: 0, y: maxY };
    };
    setLayout(prev => { const { x, y } = findSlot(prev); const n = [...prev, { ...def, i: id, x, y }]; localStorage.setItem('uplink-layout', JSON.stringify(n)); return n; });
    setActiveWidgets(prev => { const n = [...prev, id]; localStorage.setItem('uplink-active-widgets', JSON.stringify(n)); return n; });
  };

  const handleFullscreen = (id: string) => setFullscreenWidget(prev => prev === id ? null : id);

  const handleOpenWidgetById = (id: string) => {
    setFocusedWidget(id);
    setTimeout(() => {
      const el = document.querySelector(`[data-widget-id="${id}"]`);
      if (el instanceof HTMLElement) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 50);
    if (!activeWidgets.includes(id)) handleRestore(id);
  };

  const visibleLayout = layout.filter(item => activeWidgets.includes(item.i));
  const closedWidgets = ALL_WIDGET_IDS.filter(id => !activeWidgets.includes(id));

  const renderWidget = (id: string, isFs: boolean) => {
    const props = { onClose: () => handleClose(id), onFullscreen: () => handleFullscreen(id), isFullscreen: isFs, isFocused: focusedWidget === id };
    switch (id) {
      case 'xp':           return <XPWidget {...props} />;
      case 'checkin':      return <CheckinWidget {...props} />;
      case 'heatmap':      return <HeatmapWidget {...props} />;
      case 'stats':        return <StatOverviewWidget {...props} onStatClick={(k: string) => setOpenStatKey(k as StatKey)} />;
      case 'courses':      return <CoursesWidget {...props} onCourseClick={(id) => openDrawer('course', id)} />;
      case 'media':        return <MediaWidget {...props} onMediaClick={(id) => openDrawer('book', id)} />;
      case 'skills':       return <SkillsWidget {...props} onOpenSkills={() => setShowSkills(true)} onSkillClick={(id) => openDrawer('skill', id)} />;
      case 'tools':    return <ToolsWidget {...props} onOpenTools={() => setShowTools(true)} onToolClick={(id) => openDrawer('tool', id)} />;
      case 'augments': return <AugmentsWidget {...props} onOpenAugments={() => setShowAugments(true)} onAugmentClick={(id) => openDrawer('augment', id)} />;
      case 'projects': return <ProjectsWidget {...props} onOpenProjects={() => setShowProjects(true)} onProjectClick={(id) => openDrawer('project', id)} />;
      case 'notes':    return <NotesWidget {...props} onNoteClick={(id) => openDrawer('note', id)} />;
      case 'clock':        return <ClockWidget {...props} />;
      case 'calculator':   return <CalculatorWidget {...props} />;
      case 'unitConverter':return <UnitConverterWidget {...props} />;
      default: return null;
    }
  };

  if (!op && opLoading) return null;
  if (op && !op.bootstrapComplete) return <FirstBootWizard onComplete={() => refetchOp()} />;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <CRTEffects />
      {showFlash && <div className="theme-flash" />}

      <TopBar
        onOpenLog={() => setShowLog(true)}
        onOpenCheckin={() => setShowCheckin(true)}
        onOpenCharSheet={() => setShowChar(true)}
        onOpenSearch={() => setShowSearch(true)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          onExpand={() => setSidebarExpanded(true)}
          theme={theme}
          onThemeChange={handleThemeChange}
          onOpenCharSheet={() => setShowChar(true)}
          onOpenStat={(statKey) => setOpenStatKey(statKey)}
          onOpenSkills={() => setShowSkills(true)}
          onOpenLibrary={() => setShowLibrary(true)}
          onOpenCourses={() => setShowCourses(true)}
          onOpenLifepath={() => setShowLifepath(true)}
          onOpenTools={() => setShowTools(true)}
          onOpenAugments={() => setShowAugments(true)}
          onOpenProjects={() => setShowProjects(true)}
          onOpenWidgetManager={() => setShowWidgetManager(true)}
          onOpenSocials={() => setShowSocials(true)}
          onOpenDailyLog={() => setShowDailyLog(true)}
          onOpenNotes={() => setShowNotesPage(true)}
          onOpenClockWidget={() => handleOpenWidgetById('clock')}
          onOpenCalculatorWidget={() => handleOpenWidgetById('calculator')}
          onOpenUnitConverterWidget={() => handleOpenWidgetById('unitConverter')}
        />

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 8, position: 'relative', marginRight: drawerOpen ? 420 : 0, transition: 'margin-right 200ms ease', scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--accent-dim)) hsl(var(--bg-secondary))' }}>
          {gridSize.width > 0 && (
            <ReactGridLayout
              className="layout"
              layout={visibleLayout}
              width={gridSize.width - 16}
              gridConfig={{ cols: 12, rowHeight, compactType: 'horizontal', margin: [8, 8] as [number, number], containerPadding: [0, 0] as [number, number] } as any}
              dragConfig={{ enabled: true, handle: ".widget-drag-handle", threshold: 3 }}
              resizeConfig={{ enabled: true, handles: ['se', 'sw'] }}
              onLayoutChange={(newLayout: RGLLayout) => {
                const next = newLayout.map(l => ({ i: l.i, x: l.x, w: l.w, h: l.h, y: Math.max(0, l.y), minW: l.minW, minH: l.minH }));
                setLayout(next);
                localStorage.setItem('uplink-layout', JSON.stringify(next));
              }}
            >
              {visibleLayout.map(item => (
                <div key={item.i} data-widget-id={item.i}>{renderWidget(item.i, false)}</div>
              ))}
            </ReactGridLayout>
          )}
          {fullscreenWidget && (
            <>
              <div className="fullscreen-backdrop" onClick={() => setFullscreenWidget(null)} />
              <div className="fullscreen-widget">{renderWidget(fullscreenWidget, true)}</div>
            </>
          )}
        </div>
      </div>

      {showLifepath      && <LifepathPage  onClose={() => setShowLifepath(false)} />}
      {showTools     && <ToolsPage     onClose={() => setShowTools(false)} />}
      {showAugments  && <AugmentsPage  onClose={() => setShowAugments(false)} />}
      {showProjects  && <ProjectsPage  onClose={() => setShowProjects(false)} />}
      {showWidgetManager && <WidgetManager activeWidgets={activeWidgets} onRestore={handleRestore} onClose={handleClose} onDismiss={() => setShowWidgetManager(false)} />}
      {showCourses       && <CoursesPage   onClose={() => setShowCourses(false)} />}
      {showDailyLog      && <DailyLogPage  onClose={() => setShowDailyLog(false)} />}
      {showNotesPage     && <NotesPage     onClose={() => setShowNotesPage(false)} />}
      {showLibrary       && <LibraryPage   onClose={() => setShowLibrary(false)} />}
      {showSkills        && <SkillsPage    onClose={() => setShowSkills(false)} onOpenLog={() => { setShowSkills(false); setShowLog(true); }} />}
      {showSocials       && <SocialsOverlay onClose={() => setShowSocials(false)} />}
      {openStatKey       && <StatDetailOverlay statKey={openStatKey} onClose={() => setOpenStatKey(null)} onNavigate={(key) => setOpenStatKey(key)} />}

      <Modal open={showLog} onClose={() => setShowLog(false)} title="QUICK LOG" width={720}
        headerExtra={<span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>
          {new Date().getFullYear()}.{String(new Date().getMonth()+1).padStart(2,'0')}.{String(new Date().getDate()).padStart(2,'0')}
        </span>}>
        <QuickLogOverlay open={showLog} onClose={() => setShowLog(false)} />
      </Modal>
      {showChar && <CharacterSheet onClose={() => setShowChar(false)} onSkillClick={(n: string) => openDrawer('skill', n)} />}
      <DetailDrawer open={drawerOpen} item={drawerItem} onClose={closeDrawer} onOpenLog={() => setShowLog(true)} />
      <Modal open={showSearch} onClose={() => setShowSearch(false)} title="SEARCH" width={600}><SearchOverlay /></Modal>
      <Modal open={showCheckin} onClose={() => setShowCheckin(false)} title="DAILY CHECK-IN" width={500}><CheckinWidget /></Modal>
    </div>
  );
};

export default Index;