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
import HabitsWidget from '@/components/widgets/HabitsWidget';
import HeatmapWidget from '@/components/widgets/HeatmapWidget';
import StatOverviewWidget from '@/components/widgets/StatOverviewWidget';
import CoursesWidget from '@/components/widgets/CoursesWidget';
import MediaWidget from '@/components/widgets/MediaWidget';
import SkillsWidget from '@/components/widgets/SkillsWidget';
import ClockWidget from '@/components/widgets/ClockWidget';
import CalculatorWidget from '@/components/widgets/CalculatorWidget';
import UnitConverterWidget from '@/components/widgets/UnitConverterWidget';
import ToolsWidget from '@/components/widgets/ToolsWidget';
import ResourcesWidget from '@/components/widgets/ResourcesWidget';
import AugmentsWidget from '@/components/widgets/AugmentsWidget';
import ProjectsWidget from '@/components/widgets/ProjectsWidget';
import NotesWidget from '@/components/widgets/NotesWidget';
import PlannerWidget from '@/components/widgets/PlannerWidget';
import VaultWidget from '@/components/widgets/VaultWidget';
import RecoveryWidget from '@/components/widgets/RecoveryWidget';
import IngredientsWidget from '@/components/widgets/IngredientsWidget';
import IntakeWidget from '@/components/widgets/IntakeWidget';
import RecipesWidget from '@/components/widgets/RecipesWidget';
import TerminalWidget from '@/components/widgets/TerminalWidget';
import QuickLogOverlay from '@/components/overlays/QuickLogOverlay';
import SearchOverlay from '@/components/overlays/SearchOverlay';
import StatDetailOverlay from '@/components/overlays/StatDetailOverlay';
import SkillsPage from '@/components/overlays/SkillsPage';
import LibraryPage from '@/components/overlays/LibraryPage';
import CoursesPage from '@/components/overlays/CoursesPage';
import DailyLogPage from '@/components/overlays/DailyLogPage';
import HabitsPage from '@/components/overlays/HabitsPage';
import NotesPage from '@/components/overlays/NotesPage';
import PlannerPage from '@/components/overlays/PlannerPage';
import VaultPage from '@/components/overlays/VaultPage';
import RecoveryPage from '@/components/overlays/RecoveryPage';
import IngredientsPage from '@/components/overlays/IngredientsPage';
import IntakePage from '@/components/overlays/IntakePage';
import RecipesPage from '@/components/overlays/RecipesPage';
import SocialsOverlay from '@/components/overlays/SocialsOverlay';
import LifepathPage from '@/components/overlays/LifepathPage';
import ToolsPage from '@/components/overlays/ToolsPage';
import ResourcesPage from '@/components/overlays/ResourcesPage';
import AugmentsPage from '@/components/overlays/AugmentsPage';
import ProjectsPage from '@/components/overlays/ProjectsPage';
import CharacterSheet from '@/components/overlays/CharacterSheet';
import ClassDocsPage from '@/components/overlays/ClassDocsPage';
import XpDocsPage from '@/components/overlays/XpDocsPage';
import WidgetManager from '@/components/overlays/WidgetManager';
import FirstBootWizard from '@/components/wizard/FirstBootWizard';
import DetailDrawer from '@/components/drawer/DetailDrawer';
import type { DrawerItem } from '@/components/drawer/DetailDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useOperator } from '@/hooks/useOperator';
import { useHabits } from '@/hooks/useHabits';
import { StatKey } from '@/types';
import { applyThemeClass, normalizeTheme, type ThemeCode } from '@/lib/themes';

type LayoutItem = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };

const ALL_WIDGET_IDS = ['xp', 'checkin', 'habits', 'planner', 'recovery', 'ingredients', 'intake', 'recipes', 'heatmap', 'stats', 'courses', 'media', 'skills', 'tools', 'resources', 'augments', 'projects', 'vault', 'notes', 'clock', 'calculator', 'unitConverter', 'terminal'];
const DEFAULT_ACTIVE_WIDGET_IDS = ['xp', 'checkin', 'habits', 'planner', 'stats', 'courses', 'media', 'skills', 'terminal'];

const defaultLayout: LayoutItem[] = [
  { i: 'terminal', x: 0, y: 0, w: 3, h: 5, minW: 2, minH: 3 },
  { i: 'xp', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'checkin', x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'habits', x: 9, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'stats', x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'planner', x: 0, y: 4, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'recovery', x: 3, y: 4, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'ingredients', x: 6, y: 4, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'intake', x: 9, y: 4, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'recipes', x: 0, y: 8, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'courses', x: 3, y: 8, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'media', x: 6, y: 8, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'skills', x: 9, y: 8, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'tools',    x: 0, y: 12, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'resources', x: 3, y: 12, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'augments',  x: 6, y: 12, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'projects',  x: 9, y: 12, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'vault', x: 0, y: 16, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'clock', x: 3, y: 16, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'calculator', x: 6, y: 16, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'unitConverter', x: 9, y: 16, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'notes', x: 0, y: 20, w: 3, h: 4, minW: 2, minH: 2 },
  { i: 'heatmap', x: 3, y: 20, w: 3, h: 4, minW: 2, minH: 2 },
];

const widgetNames: Record<string, string> = {
  xp: 'XP & LEVELLING', checkin: 'DAILY CHECK-IN', habits: 'HABITS', heatmap: 'STREAK HEATMAP',
  stats: 'STAT OVERVIEW', courses: 'COURSES', media: 'MEDIA LIBRARY',
  skills: 'SKILLS', tools: 'TOOLS', resources: 'RESOURCES', augments: 'AUGMENTS', projects: 'PROJECTS', vault: 'VAULT', notes: 'NOTES', planner: 'PLANNER', recovery: 'RECOVERY', ingredients: 'INGREDIENTS', intake: 'INTAKE', recipes: 'RECIPES',
  clock: 'CLOCK', calculator: 'CALCULATOR', unitConverter: 'UNIT CONVERTER', terminal: 'TERMINAL',
};

const Index = () => {
  const { user } = useAuth();
  const { data: op, isLoading: opLoading, refetch: refetchOp } = useOperator(user?.id);
  const { habits, processMissed } = useHabits();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState<ThemeCode>(() => normalizeTheme(localStorage.getItem('uplink-theme')));
  const [showLog, setShowLog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSocials, setShowSocials] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showNotesPage, setShowNotesPage] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showLifepath, setShowLifepath] = useState(false);
  const [showTools, setShowTools]         = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showAugments, setShowAugments]   = useState(false);
  const [showProjects, setShowProjects]   = useState(false);
  const [showHabits, setShowHabits]       = useState(false);
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
  const [minimizedWidgets, setMinimizedWidgets] = useState<Record<string, boolean>>(() => {
    try { const s = localStorage.getItem('uplink-minimized-widgets'); return s ? JSON.parse(s) : {}; }
    catch { return {}; }
  });
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const [openStatKey, setOpenStatKey] = useState<StatKey | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [showClassDocs, setShowClassDocs] = useState(false);
  const [showXpDocs, setShowXpDocs] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [showCerts, setShowCerts] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const sidebarWidth = sidebarExpanded ? 220 : 48;
  const openDrawer = (type: DrawerItem['type'], id: string) => { setDrawerItem({ type, id }); setDrawerOpen(true); };
  const closeDrawer = () => setDrawerOpen(false);
  const drawerWidth = drawerOpen ? 420 : 0;

  const handleSearchNavigate = (type: string, id: string) => {
    setShowSearch(false);
    switch (type) {
      case 'skill': setShowSkills(true); break;
      case 'tool': setShowTools(true); break;
      case 'augment': setShowAugments(true); break;
      case 'course': setShowCourses(true); break;
      case 'habit': setShowHabits(true); break;
      case 'project': setShowProjects(true); break;
      case 'ingredient': setShowIngredients(true); break;
      case 'recipe': setShowRecipes(true); break;
      case 'resource': setShowResources(true); break;
      case 'social': setShowSocials(true); break;
      case 'vault': setShowVault(true); break;
      case 'goal': setShowHabits(true); break;
      case 'doc':
        if (id === 'classes') setShowClassDocs(true);
        else if (id === 'xp-levelling') setShowXpDocs(true);
        break;
      default: break;
    }
  };

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

  // Process missed habit days on boot
  useEffect(() => {
    if (!habits || habits.length === 0) return;
    try {
      const key = `uplink-missed-days-checked-${new Date().toISOString().slice(0, 10)}`;
      if (localStorage.getItem(key)) return;
      
      // Process all active habits once per day on boot
      habits.filter(h => h && h.status === 'ACTIVE').forEach(h => processMissed(h));
      localStorage.setItem(key, '1');
    } catch (err) {
      console.warn('// HABIT_BOOT_EFFECT_ERR:', err);
    }
  }, [habits]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') {
      if (showXpDocs) { setShowXpDocs(false); return; }
      if (showClassDocs) { setShowClassDocs(false); return; }
      if (showCharacterSheet) { setShowCharacterSheet(false); return; }
      if (showLifepath) { setShowLifepath(false); return; }
      if (showVault) { setShowVault(false); return; }
      if (showRecovery) { setShowRecovery(false); return; }
      if (showIngredients) { setShowIngredients(false); return; }
      if (showIntake) { setShowIntake(false); return; }
      if (showRecipes) { setShowRecipes(false); return; }
      if (showPlanner) { setShowPlanner(false); return; }
      if (showDailyLog) { setShowDailyLog(false); return; }
      if (showNotesPage) { setShowNotesPage(false); return; }
      if (openStatKey) { setOpenStatKey(null); return; }
      if (drawerOpen) { closeDrawer(); return; }
      if (fullscreenWidget) { setFullscreenWidget(null); return; }
      setShowLog(false); setShowSearch(false); setShowCheckin(false); setShowHabits(false);
      return;
    }
    if (e.key === ' ') { e.preventDefault(); setShowLog(true); }
    if (e.key === '/') { e.preventDefault(); setShowSearch(true); }
    if (e.key === '[') setSidebarExpanded(false);
    if (e.key === ']') setSidebarExpanded(true);
  }, [fullscreenWidget, drawerOpen, openStatKey, showXpDocs, showClassDocs, showCharacterSheet, showLifepath, showVault, showRecovery, showIngredients, showIntake, showRecipes, showPlanner, showDailyLog, showNotesPage, showHabits]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const rowHeight = 80;

  const handleClose = (id: string) => {
    if (fullscreenWidget === id) setFullscreenWidget(null);
    setFocusedWidget(prev => prev === id ? null : prev);
    setMinimizedWidgets(prev => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem('uplink-minimized-widgets', JSON.stringify(next));
      return next;
    });
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
    setMinimizedWidgets(prev => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem('uplink-minimized-widgets', JSON.stringify(next));
      return next;
    });
    setLayout(prev => { const { x, y } = findSlot(prev); const n = [...prev, { ...def, i: id, x, y }]; localStorage.setItem('uplink-layout', JSON.stringify(n)); return n; });
    setActiveWidgets(prev => { const n = [...prev, id]; localStorage.setItem('uplink-active-widgets', JSON.stringify(n)); return n; });
  };

  const handleFullscreen = (id: string) => setFullscreenWidget(prev => prev === id ? null : id);

  const handleMinimize = (id: string, minimized: boolean) => {
    setMinimizedWidgets(prev => {
      const next = { ...prev, [id]: minimized };
      localStorage.setItem('uplink-minimized-widgets', JSON.stringify(next));
      return next;
    });

    setLayout(prev => {
      const next = prev.map(item => {
        if (item.i !== id) return item;
        const defaultHeight = defaultLayout.find(d => d.i === id)?.h ?? 4;
        return { ...item, h: minimized ? (item.minH ?? 2) : defaultHeight };
      });
      localStorage.setItem('uplink-layout', JSON.stringify(next));
      return next;
    });
  };

  const handleOpenWidgetById = (id: string) => {
    setFocusedWidget(id);
    setTimeout(() => {
      const el = document.querySelector(`[data-widget-id="${id}"]`);
      if (el instanceof HTMLElement) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 50);
    if (!activeWidgets.includes(id)) handleRestore(id);
  };

  const handleCloseWidgetById = (id: string) => {
    setLayout(prev => prev.filter(i => i.i !== id));
    setActiveWidgets(prev => prev.filter(w => w !== id));
    localStorage.setItem('uplink-layout', JSON.stringify(layout.filter(i => i.i !== id)));
    localStorage.setItem('uplink-active-widgets', JSON.stringify(activeWidgets.filter(w => w !== id)));
  };

  const widgetHandler = (action: 'open' | 'close', widgetId: string) => {
    if (action === 'open') {
      handleOpenWidgetById(widgetId);
    } else {
      handleCloseWidgetById(widgetId);
    }
  };

  const drawerHandler = (type: string, name: string) => {
    openDrawer(type as DrawerItem['type'], name);
  };

  const closeDrawerHandler = () => {
    closeDrawer();
  };

  const visibleLayout = layout.filter(item => activeWidgets.includes(item.i));
  const closedWidgets = ALL_WIDGET_IDS.filter(id => !activeWidgets.includes(id));

  const renderWidget = (id: string, isFs: boolean) => {
    const props = { 
      onClose: () => handleClose(id), 
      onFullscreen: () => handleFullscreen(id), 
      onMinimize: (m: boolean) => handleMinimize(id, m),
      isFullscreen: isFs, 
      isFocused: focusedWidget === id,
      isMinimized: minimizedWidgets[id],
    };
    switch (id) {
      case 'xp':           return <XPWidget {...props} />;
      case 'checkin':      return <CheckinWidget {...props} />;
      case 'habits':       return <HabitsWidget {...props} onOpenHabits={() => setShowHabits(true)} onHabitClick={(habit) => openDrawer('habit', habit.id)} />;
      case 'planner':      return <PlannerWidget {...props} onOpenPlanner={() => setShowPlanner(true)} />;
      case 'recovery':     return <RecoveryWidget {...props} onOpenRecovery={() => setShowRecovery(true)} />;
      case 'ingredients':  return <IngredientsWidget {...props} onOpenIngredients={() => setShowIngredients(true)} onIngredientClick={(id) => openDrawer('ingredient', id)} />;
      case 'intake':       return <IntakeWidget {...props} onOpenIntake={() => setShowIntake(true)} onLogClick={(id) => openDrawer('intake', id)} />;
      case 'recipes':      return <RecipesWidget {...props} onOpenRecipes={() => setShowRecipes(true)} onRecipeClick={(id) => openDrawer('recipe', id)} />;
      case 'vault':        return <VaultWidget {...props} onOpenVault={() => setShowVault(true)} onVaultClick={(id) => openDrawer('vault', id)} />;
      case 'heatmap':      return <HeatmapWidget {...props} />;
      case 'stats':        return <StatOverviewWidget {...props} onStatClick={(k: string) => setOpenStatKey(k as StatKey)} />;
      case 'courses':      return <CoursesWidget {...props} onOpenCourses={() => setShowCourses(true)} onCourseClick={(id) => openDrawer('course', id)} />;
      case 'media':        return <MediaWidget {...props} onOpenLibrary={() => setShowLibrary(true)} onMediaClick={(id) => openDrawer('book', id)} />;
      case 'skills':       return <SkillsWidget {...props} onOpenSkills={() => setShowSkills(true)} onSkillClick={(id) => openDrawer('skill', id)} />;
      case 'tools':    return <ToolsWidget {...props} onOpenTools={() => setShowTools(true)} onToolClick={(id) => openDrawer('tool', id)} />;
      case 'resources': return <ResourcesWidget {...props} onOpenResources={() => setShowResources(true)} onResourceClick={(id) => openDrawer('resource', id)} />;
      case 'augments': return <AugmentsWidget {...props} onOpenAugments={() => setShowAugments(true)} onAugmentClick={(id) => openDrawer('augment', id)} />;
      case 'projects': return <ProjectsWidget {...props} onOpenProjects={() => setShowProjects(true)} onProjectClick={(id) => openDrawer('project', id)} />;
      case 'notes':    return <NotesWidget {...props} onNoteClick={(id) => openDrawer('note', id)} />;
      case 'clock':        return <ClockWidget {...props} />;
      case 'calculator':   return <CalculatorWidget {...props} />;
      case 'unitConverter':return <UnitConverterWidget {...props} />;
      case 'terminal':     return <TerminalWidget {...props} widgetHandler={widgetHandler} drawerHandler={drawerHandler} closeDrawerHandler={closeDrawerHandler} />;
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
        onOpenSearch={() => setShowSearch(true)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          onExpand={() => setSidebarExpanded(true)}
          theme={theme}
          onThemeChange={handleThemeChange}
          onOpenCharacterSheet={() => setShowCharacterSheet(true)}
          onOpenStat={(statKey) => setOpenStatKey(statKey)}
          onOpenSkills={() => setShowSkills(true)}
          onOpenLibrary={() => setShowLibrary(true)}
          onOpenCourses={() => setShowCourses(true)}
          onOpenLifepath={() => setShowLifepath(true)}
          onOpenTools={() => setShowTools(true)}
          onOpenResources={() => setShowResources(true)}
          onOpenAugments={() => setShowAugments(true)}
          onOpenProjects={() => setShowProjects(true)}
          onOpenVault={() => setShowVault(true)}
          onOpenClassDocs={() => setShowClassDocs(true)}
          onOpenXpDocs={() => setShowXpDocs(true)}
          onOpenWidgetManager={() => setShowWidgetManager(true)}
          onOpenSocials={() => setShowSocials(true)}
          onOpenDailyLog={() => setShowDailyLog(true)}
          onOpenHabits={() => setShowHabits(true)}
          onOpenNotes={() => setShowNotesPage(true)}
          onOpenPlanner={() => setShowPlanner(true)}
          onOpenRecovery={() => setShowRecovery(true)}
          onOpenIngredients={() => setShowIngredients(true)}
          onOpenCerts={() => setShowCerts(true)}
          onOpenIntake={() => setShowIntake(true)}
          onOpenOutput={() => setShowOutput(true)}
          onOpenRecipes={() => setShowRecipes(true)}
          onOpenGoals={() => setShowGoals(true)}
          onOpenTerminal={() => handleOpenWidgetById('terminal')}
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
      {showXpDocs && <XpDocsPage onClose={() => setShowXpDocs(false)} />}
      {showClassDocs && <ClassDocsPage onClose={() => setShowClassDocs(false)} />}
      {showCharacterSheet && <CharacterSheet onClose={() => setShowCharacterSheet(false)} />}
      {showTools     && <ToolsPage     onClose={() => setShowTools(false)} />}
      {showResources && <ResourcesPage onClose={() => setShowResources(false)} />}
      {showAugments  && <AugmentsPage  onClose={() => setShowAugments(false)} />}
      {showProjects  && <ProjectsPage  onClose={() => setShowProjects(false)} />}
      {showVault     && <VaultPage     onClose={() => setShowVault(false)} />}
      {showWidgetManager && <WidgetManager activeWidgets={activeWidgets} onRestore={handleRestore} onClose={handleClose} onDismiss={() => setShowWidgetManager(false)} />}
      {showCourses       && <CoursesPage   onClose={() => setShowCourses(false)} />}
      {showDailyLog      && <DailyLogPage  onClose={() => setShowDailyLog(false)} />}
      {showPlanner       && <PlannerPage   onClose={() => setShowPlanner(false)} />}
      {showRecovery      && <RecoveryPage  onClose={() => setShowRecovery(false)} />}
      {showIngredients   && <IngredientsPage onClose={() => setShowIngredients(false)} />}
      {showIntake        && <IntakePage onClose={() => setShowIntake(false)} />}
      {showRecipes       && <RecipesPage onClose={() => setShowRecipes(false)} />}
      {showNotesPage     && <NotesPage     onClose={() => setShowNotesPage(false)} />}
      {showLibrary       && <LibraryPage   onClose={() => setShowLibrary(false)} />}
      {showSkills        && <SkillsPage    onClose={() => setShowSkills(false)} onOpenLog={() => { setShowSkills(false); setShowLog(true); }} />}
      {showHabits        && <HabitsPage    onClose={() => setShowHabits(false)} />}
      {showSocials       && <SocialsOverlay onClose={() => setShowSocials(false)} />}
      {openStatKey       && (
        <StatDetailOverlay
          statKey={openStatKey}
          onClose={() => setOpenStatKey(null)}
          onNavigate={(key) => setOpenStatKey(key)}
          onOpenLog={() => setShowLog(true)}
        />
      )}

      <Modal open={showLog} onClose={() => setShowLog(false)} title="QUICK LOG" width={720}
        headerExtra={<span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>
          {new Date().getFullYear()}.{String(new Date().getMonth()+1).padStart(2,'0')}.{String(new Date().getDate()).padStart(2,'0')}
        </span>}>
        <QuickLogOverlay open={showLog} onClose={() => setShowLog(false)} />
      </Modal>
      <DetailDrawer open={drawerOpen} item={drawerItem} onClose={closeDrawer} onOpenLog={() => setShowLog(true)} />
      <Modal open={showSearch} onClose={() => setShowSearch(false)} title="SEARCH" width={600}><SearchOverlay onClose={() => setShowSearch(false)} onNavigate={handleSearchNavigate} /></Modal>
      <Modal open={showCheckin} onClose={() => setShowCheckin(false)} title="DAILY CHECK-IN" width={500}><CheckinWidget isModal /></Modal>
    </div>
  );
};

export default Index;
