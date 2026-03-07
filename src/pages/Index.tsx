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
import QuickLogOverlay from '@/components/overlays/QuickLogOverlay';
import CharacterSheet from '@/components/overlays/CharacterSheet';
import SearchOverlay from '@/components/overlays/SearchOverlay';

type LayoutItem = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };

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
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);
  const [fullscreenWidget, setFullscreenWidget] = useState<string | null>(null);
  const [preFullscreenLayout, setPreFullscreenLayout] = useState<LayoutItem[] | null>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

  const sidebarWidth = sidebarExpanded ? 220 : 48;

  // Measure grid area
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

  // Theme
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

  // Keyboard shortcuts
  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === ' ') { e.preventDefault(); setShowLog(true); }
    if (e.key === 'c' || e.key === 'C') setShowChar(true);
    if (e.key === '/') { e.preventDefault(); setShowSearch(true); }
    if (e.key === '[') setSidebarExpanded(false);
    if (e.key === ']') setSidebarExpanded(true);
    if (e.key === 'Escape') {
      setShowLog(false);
      setShowChar(false);
      setShowSearch(false);
      setShowCheckin(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const rowHeight = Math.floor((gridSize.height - 16 - 8 * 8) / 8);

  const handleClose = (id: string) => {
    if (fullscreenWidget === id) {
      handleFullscreen(id); // restore first
    }
    setHiddenWidgets(prev => [...prev, id]);
  };

  const handleFullscreen = (id: string) => {
    if (fullscreenWidget === id) {
      // Restore
      if (preFullscreenLayout) setLayout(preFullscreenLayout);
      setFullscreenWidget(null);
      setPreFullscreenLayout(null);
    } else {
      // Go fullscreen
      setPreFullscreenLayout(layout);
      setFullscreenWidget(id);
      setLayout(prev => prev.map(item =>
        item.i === id
          ? { ...item, x: 0, y: 0, w: 12, h: 8 }
          : item
      ));
    }
  };

  const visibleLayout = layout.filter(item => !hiddenWidgets.includes(item.i));

  const widgetMap: Record<string, React.ReactNode> = {
    xp: <XPWidget onClose={() => handleClose('xp')} onFullscreen={() => handleFullscreen('xp')} isFullscreen={fullscreenWidget === 'xp'} />,
    checkin: <CheckinWidget onClose={() => handleClose('checkin')} onFullscreen={() => handleFullscreen('checkin')} isFullscreen={fullscreenWidget === 'checkin'} />,
    heatmap: <HeatmapWidget onClose={() => handleClose('heatmap')} onFullscreen={() => handleFullscreen('heatmap')} isFullscreen={fullscreenWidget === 'heatmap'} />,
    stats: <StatOverviewWidget onClose={() => handleClose('stats')} onFullscreen={() => handleFullscreen('stats')} isFullscreen={fullscreenWidget === 'stats'} />,
    courses: <CoursesWidget onClose={() => handleClose('courses')} onFullscreen={() => handleFullscreen('courses')} isFullscreen={fullscreenWidget === 'courses'} />,
    media: <MediaWidget onClose={() => handleClose('media')} onFullscreen={() => handleFullscreen('media')} isFullscreen={fullscreenWidget === 'media'} />,
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
        <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />

        <div style={{ flex: 1, overflow: 'hidden', padding: 8 }}>
          {gridSize.width > 0 && (
            <ReactGridLayout
              className="layout"
              layout={visibleLayout}
              width={gridSize.width - 16}
              gridConfig={{
                cols: 12,
                rowHeight: rowHeight > 20 ? rowHeight : 40,
                margin: [8, 8] as [number, number],
                containerPadding: [0, 0] as [number, number],
              }}
              dragConfig={{
                enabled: !fullscreenWidget,
                bounded: false,
                handle: ".widget-drag-handle",
                threshold: 3,
              }}
              resizeConfig={{
                enabled: !fullscreenWidget,
                handles: ['se', 'sw'],
              }}
              onLayoutChange={(newLayout: RGLLayout) => setLayout(newLayout.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH })))}
            >
              {visibleLayout.map(item => (
                <div key={item.i} style={{ zIndex: fullscreenWidget === item.i ? 10 : 1 }}>
                  {widgetMap[item.i]}
                </div>
              ))}
            </ReactGridLayout>
          )}

          {/* Restore closed widgets bar */}
          {hiddenWidgets.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 8, left: 8, right: 8,
              display: 'flex', gap: 4, flexWrap: 'wrap',
            }}>
              {hiddenWidgets.map(id => (
                <button
                  key={id}
                  className="topbar-btn"
                  style={{ fontSize: 9 }}
                  onClick={() => setHiddenWidgets(prev => prev.filter(w => w !== id))}
                >
                  + {widgetNames[id] || id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="QUICK LOG">
        <QuickLogOverlay />
      </Modal>

      <Modal open={showChar} onClose={() => setShowChar(false)} title="CHARACTER SHEET" fullScreen>
        <CharacterSheet />
      </Modal>

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
