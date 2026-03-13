// ============================================================
// src/App.tsx
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import Index from './pages/Index';
import XPFloatLayer from '@/components/effects/XPFloatLayer';
import LevelUpAnimation from '@/components/effects/LevelUpAnimation';
import BootSequence from '@/components/effects/BootSequence';
import LoginScreen from '@/components/auth/LoginScreen';

// State machine:
// INIT    → wait for auth to resolve, show nothing
// BOOTING → play boot animation (only on fresh page load, not post-login)
// LOGIN   → show login screen
// READY   → show dashboard

type Stage = 'INIT' | 'BOOTING' | 'LOGIN' | 'READY';

function AppInner() {
  const { user, loading: authLoading } = useAuth();
  const [stage, setStage] = useState<Stage>('INIT');
  const hasBootedRef = useRef(false); // only play boot once per page load

  // On mount: decide whether to play boot or go straight to app
  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve

    if (hasBootedRef.current) return; // already handled
    hasBootedRef.current = true;

    if (user) {
      // Returning user with valid session — play boot then go to app
      setStage('BOOTING');
    } else {
      // No session — play boot then show login
      setStage('BOOTING');
    }
  }, [authLoading, user]);

  const handleBootComplete = () => {
    setStage(user ? 'READY' : 'LOGIN');
  };

  return (
    <>
      {/* Blank dark screen while auth resolves — no flash */}
      {stage === 'INIT' && (
        <div style={{ position: 'fixed', inset: 0, background: '#0d0800' }} />
      )}

      {stage === 'BOOTING' && (
        <BootSequence
          isShort={false}
          onComplete={handleBootComplete}
        />
      )}

      {stage === 'LOGIN' && (
        <LoginScreen onAuthenticated={() => setStage('READY')} />
      )}

      {stage === 'READY' && (
        <div id="app-root">
          <Index />
        </div>
      )}

      <XPFloatLayer />
      <LevelUpAnimation />
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