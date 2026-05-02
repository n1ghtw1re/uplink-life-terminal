import { useState } from 'react';
import QuickLogOverlay from './QuickLogOverlay';

type LogTab = 'QUICK LOG' | 'OUTPUT' | 'INTAKE' | 'RECOVERY';

const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';

interface QuickLogPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickLogPanel({ open, onClose }: QuickLogPanelProps) {
  const [activeTab, setActiveTab] = useState<LogTab>('QUICK LOG');

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
    }}>
      <div style={{
        width: '90%',
        maxWidth: 800,
        maxHeight: '90vh',
        background: bgP,
        border: `1px solid ${adim}`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(255,176,0,0.1)',
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${adim}`,
          padding: '0 20px',
          gap: 0,
        }}>
          {(['QUICK LOG', 'OUTPUT', 'INTAKE', 'RECOVERY'] as LogTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                fontSize: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: 2,
                cursor: 'pointer',
                background: activeTab === tab ? 'rgba(255,176,0,0.1)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `2px solid ${acc}` : '2px solid transparent',
                color: activeTab === tab ? acc : dim,
                transition: 'all 150ms',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'QUICK LOG' && (
            <QuickLogOverlay open={true} onClose={onClose} />
          )}
          {activeTab === 'OUTPUT' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: dim,
            }}>
              OUTPUT LOGGING - COMING SOON
            </div>
          )}
          {activeTab === 'INTAKE' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: dim,
            }}>
              INTAKE LOGGING - COMING SOON
            </div>
          )}
          {activeTab === 'RECOVERY' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: dim,
            }}>
              RECOVERY LOGGING - COMING SOON
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
