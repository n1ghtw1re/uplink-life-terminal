import { useState, useEffect, useCallback, useMemo } from 'react';

import ReactGridLayout, { getCompactor } from 'react-grid-layout';
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
import QuickLogOverlay from '@/components/overlays/QuickLogOverlay';
import CharacterSheet from '@/components/overlays/CharacterSheet';
import SearchOverlay from '@/components/overlays/SearchOverlay';
import DetailDrawer from '@/components/drawer/DetailDrawer';
import type { DrawerItem } from '@/components/drawer/DetailDrawer';

type LayoutItem = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };

const ALL_WIDGET_IDS = ['xp', 'checkin', 'heatmap', 'stats', 'courses', 'media'];

const defaultLayout: LayoutItem[] = [
  { i: 'xp', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'checkin', x: 4, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'heatmap', x: 7, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
  { i: 'stats', x: 0, y: 4, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'courses', x: 4, y: 3, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'media', x: 8, y: 3, w: 4, h: 4, minW: 2, minH: 2 },
];

const widgetNames: Record<string, string> = {
  xp: 'XP & LEVELLING',
  checkin: 'DAILY CHECK-IN',
  heatmap: 'STREAK HEATMAP',
  stats: 'STAT OVERVIEW',
  courses: 'COURSES',
  media: 'MEDIA LIBRARY',
};

const Index = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('uplink-theme') || 'AMBER');
  const [showLog, setShowLog] = useState(false);
  const [showChar, setShowChar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [layout, setLayout] = useState(defaultLayout);
  const [activeWidgets, setActiveWidgets] = useState<string[]>(ALL_WIDGET_IDS);
  const [fullscreenWidget, setFullscreenWidget] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  const sidebarWidth = sidebarExpanded ? 220 : 48;

  useEffect(() => {
    const update = () => {
      setGridSize({
        width: window.innerWidth - sidebarWidth,
        height: window.innerHeight - 48,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sidebarWidth]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-green', 'theme-dos');
    if (theme === 'GRN') root.classList.add('theme-green');
    if (theme === 'DOS') root.classList.add('theme-dos');
    localStorage.setItem('uplink-theme', theme);
  }, [theme]);

  const handleThemeChange = (t: string) => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);
    setTheme(t);
  };

  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Escape') {
      if (fullscreenWidget) { setFullscreenWidget(null); return; }
      setShowLog(false);
      setShowChar(false);
      setShowSearch(false);
      setShowCheckin(false);
      return;
    }
    if (e.key === ' ') { e.preventDefault(); setShowLog(true); }
    if (e.key === 'c' || e.key === 'C') setShowChar(true);
    if (e.key === '/') { e.preventDefault(); setShowSearch(true); }
    if (e.key === '[') setSidebarExpanded(false);
    if (e.key === ']') setSidebarExpanded(true);
  }, [fullscreenWidget]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const maxRows = 8;
  const rowHeight = Math.floor((gridSize.height - 16 - 8 * maxRows) / maxRows);

  const strictCompactor = useMemo(() => getCompactor(null, false, true), []);

  const handleClose = (id: string) => {
    if (fullscreenWidget === id) setFullscreenWidget(null);
    setLayout(prev => prev.filter(item => item.i !== id));
    setActiveWidgets(prev => prev.filter(w => w !== id));
  };

  const handleRestore = (id: string) => {
    const def = defaultLayout.find(d => d.i === id);
    if (def) {
      setLayout(prev => [...prev, def]);
      setActiveWidgets(prev => [...prev, id]);
    }
  };

  const handleFullscreen = (id: string) => {
    setFullscreenWidget(prev => prev === id ? null : id);
  };

  const visibleLayout = layout.filter(item => activeWidgets.includes(item.i));
  const closedWidgets = ALL_WIDGET_IDS.filter(id => !activeWidgets.includes(id));

  const renderWidget = (id: string, isFs: boolean) => {
    const props = {
      onClose: () => handleClose(id),
      onFullscreen: () => handleFullscreen(id),
      isFullscreen: isFs,
    };
    switch (id) {
      case 'xp': return <XPWidget {...props} />;
      case 'checkin': return <CheckinWidget {...props} />;
      case 'heatmap': return <HeatmapWidget {...props} />;
      case 'stats': return <StatOverviewWidget {...props} />;
      case 'courses': return <CoursesWidget {...props} />;
      case 'media': return <MediaWidget {...props} />;
      default: return null;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <CRTEffects />
      {showFlash && <div className="theme-flash" />}

      <TopBar
        onOpenLog={() => setShowLog(true)}
        onOpenCheckin={() => setShowCheckin(true)}
        onOpenCharSheet={() => setShowChar(true)}
        onOpenSearch={() => setShowSearch(true)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          onExpand={() => setSidebarExpanded(true)}
          onOpenCharSheet={() => setShowChar(true)}
        />

        <div style={{ flex: 1, overflow: 'hidden', padding: 8, position: 'relative' }}>
          {gridSize.width > 0 && (
            <ReactGridLayout
              className="layout"
              layout={visibleLayout}
              width={gridSize.width - 16}
              compactor={strictCompactor}
              gridConfig={{
                cols: 12,
                rowHeight: rowHeight > 20 ? rowHeight : 40,
                maxRows: maxRows,
                margin: [8, 8] as [number, number],
                containerPadding: [0, 0] as [number, number],
              } as any}
              dragConfig={{
                enabled: true,
                bounded: true,
                handle: ".widget-drag-handle",
                threshold: 3,
              }}
              resizeConfig={{
                enabled: true,
                handles: ['se', 'sw'],
              }}
              onLayoutChange={(newLayout: RGLLayout) => {
                const clamped = newLayout.map(l => {
                  const h = Math.min(l.h, maxRows);
                  const y = Math.min(l.y, maxRows - h);
                  return {
                    i: l.i, x: l.x, w: l.w,
                    h, y: Math.max(0, y),
                    minW: l.minW, minH: l.minH,
                  };
                });
                setLayout(clamped);
              }}
            >
              {visibleLayout.map(item => (
                <div key={item.i}>
                  {renderWidget(item.i, false)}
                </div>
              ))}
            </ReactGridLayout>
          )}

          {/* Fullscreen overlay - inside the grid area, not a portal */}
          {fullscreenWidget && (
            <>
              <div
                className="fullscreen-backdrop"
                onClick={() => setFullscreenWidget(null)}
              />
              <div className="fullscreen-widget">
                {renderWidget(fullscreenWidget, true)}
              </div>
            </>
          )}
        </div>
      </div>




      {/* Modals */}
      <Modal
        open={showLog}
        onClose={() => setShowLog(false)}
        title="QUICK LOG"
        width={720}
        headerExtra={
          <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>
            {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}
          </span>
        }
      >
        <QuickLogOverlay onSubmit={() => setShowLog(false)} />
      </Modal>
      {showChar && <CharacterSheet onClose={() => setShowChar(false)} />}
      <Modal open={showSearch} onClose={() => setShowSearch(false)} title="SEARCH" width={600}>
        <SearchOverlay />
      </Modal>
      <Modal open={showCheckin} onClose={() => setShowCheckin(false)} title="DAILY CHECK-IN" width={500}>
        <CheckinWidget />
      </Modal>
    </div>
  );
};

export default Index;
