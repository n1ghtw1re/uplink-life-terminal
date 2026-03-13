// ============================================================
// src/components/Modal.tsx
// ============================================================
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export default function Modal({ open, onClose, title, width = 520, children, headerExtra }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        width: Math.min(width, window.innerWidth - 48),
        maxHeight: 'calc(100vh - 96px)',
        background: 'hsl(var(--bg-secondary))',
        border: '1px solid hsl(var(--accent))',
        boxShadow: '0 0 30px rgba(255,176,0,0.2), inset 0 0 20px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header — title left, headerExtra centre, × far right */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 12px', gap: 8,
          borderBottom: '1px solid hsl(var(--accent-dim))',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11, color: 'hsl(var(--accent))', letterSpacing: 1,
            flexShrink: 0,
          }}>
            // {title}
          </span>
          {headerExtra && (
            <span style={{ flex: 1, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
              {headerExtra}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', flexShrink: 0,
              background: 'transparent',
              border: '1px solid hsl(var(--accent-dim))',
              color: 'hsl(var(--text-dim))',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11, padding: '2px 8px',
              cursor: 'pointer', lineHeight: 1,
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.borderColor = 'hsl(var(--accent))';
              (e.target as HTMLElement).style.color = 'hsl(var(--accent))';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.borderColor = 'hsl(var(--accent-dim))';
              (e.target as HTMLElement).style.color = 'hsl(var(--text-dim))';
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}