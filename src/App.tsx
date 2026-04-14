// ============================================================
// src/App.tsx
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useApp } from '@/contexts/AppContext';
import Index from './pages/Index';
import XPFloatLayer from '@/components/effects/XPFloatLayer';
import LevelUpAnimation from '@/components/effects/LevelUpAnimation';
import BootSequence from '@/components/effects/BootSequence';
import ClockAlertOverlay from '@/components/effects/ClockAlertOverlay';

type Stage = 'INIT' | 'BOOTING' | 'READY';

function AppInner() {
  const { ready } = useApp();
  
  // Start animation immediately if this is the first boot, otherwise INIT
  const hasBooted = sessionStorage.getItem('uplink-booted');
  const [stage, setStage] = useState<Stage>(hasBooted ? 'INIT' : 'BOOTING');
  const [animDone, setAnimDone] = useState(!!hasBooted);

  // Transition to READY when BOTH the database and animation are finished
  useEffect(() => {
    if (ready && animDone && stage !== 'READY') {
      setStage('READY');
    }
  }, [ready, animDone, stage]);

  // Safety fallback — if something hangs, force app to load after 20s
  useEffect(() => {
    if (stage === 'READY') return;
    const t = setTimeout(() => {
      setAnimDone(true);
      setStage('READY');
    }, 20000);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <>
      {stage === 'INIT' && !ready && (
        <div style={{ position: 'fixed', inset: 0, background: '#0d0800' }} />
      )}
      {stage === 'BOOTING' && !animDone && (
        <BootSequence isShort={false} onComplete={() => {
          sessionStorage.setItem('uplink-booted', '1');
          setAnimDone(true);
        }} />
      )}
      {stage === 'READY' && (
        <div id="app-root">
          <Index />
        </div>
      )}
      <XPFloatLayer />
      <LevelUpAnimation />
      <ClockAlertOverlay />
    </>
  );
}

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <AppInner />
  </TooltipProvider>
);

export default App;
