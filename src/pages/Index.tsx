import { useState, useEffect, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
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

const defaultLayout = [
  { i: 'xp', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'checkin', x: 4, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'heatmap', x: 7, y: 0, w: 5, h: 3, minW: 3, minH: 2 },
  { i: 'stats', x: 0, y: 4, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'courses', x: 4, y: 3, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'media', x: 8, y: 3, w: 4, h: 4, minW: 2, minH: 2 },
];

const Index = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('uplink-theme') || 'AMBER');
  const [showLog, setShowLog] = useState(false);
  const [showChar, setShowChar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [layout, setLayout] = useState(defaultLayout);
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

  const widgetMap: Record<string, React.ReactNode> = {
    xp: <XPWidget />,
    checkin: <CheckinWidget />,
    heatmap: <HeatmapWidget />,
    stats: <StatOverviewWidget />,
    courses: <CoursesWidget />,
    media: <MediaWidget />,
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
            <GridLayout
              className="layout"
              layout={layout}
              cols={12}
              rowHeight={rowHeight > 20 ? rowHeight : 40}
              width={gridSize.width - 16}
              margin={[8, 8]}
              containerPadding={[0, 0]}
              draggableHandle=".widget-drag-handle"
              resizeHandles={['se', 'sw']}
              onLayoutChange={setLayout}
            >
              {layout.map(item => (
                <div key={item.i}>
                  {widgetMap[item.i]}
                </div>
              ))}
            </GridLayout>
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
