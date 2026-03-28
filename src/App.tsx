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
  const [stage, setStage]   = useState<Stage>('INIT');
  const bootedRef = useRef(false);

  useEffect(() => {
    if (!ready || bootedRef.current) return;
    bootedRef.current = true;
    // Only play boot sequence once per browser session
    const hasBooted = sessionStorage.getItem('uplink-booted');
    if (hasBooted) {
      setStage('READY');
    } else {
      setStage('BOOTING');
    }
  }, [ready]);

  // Safety fallback — the full boot animation takes well over 8s, so keep this
  // comfortably above the normal runtime and only use it as a true failsafe.
  useEffect(() => {
    if (stage !== 'BOOTING') return;
    const t = setTimeout(() => setStage('READY'), 20000);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <>
      {stage === 'INIT' && (
        <div style={{ position: 'fixed', inset: 0, background: '#0d0800' }} />
      )}
      {stage === 'BOOTING' && (
        <BootSequence isShort={false} onComplete={() => {
          sessionStorage.setItem('uplink-booted', '1');
          setStage('READY');
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
