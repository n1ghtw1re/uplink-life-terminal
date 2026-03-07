import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
  fullScreen?: boolean;
}

const Modal = ({ open, onClose, title, children, width = 480, fullScreen = false }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        className="overlay-content"
        onClick={e => e.stopPropagation()}
        style={fullScreen ? {
          width: 'calc(100vw - 80px)',
          height: 'calc(100vh - 80px)',
          padding: 24,
          overflow: 'auto',
        } : {
          width,
          maxHeight: '80vh',
          padding: 20,
          overflow: 'auto',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          borderBottom: '1px solid hsl(var(--accent-dim))',
          paddingBottom: 8,
        }}>
          <span className="text-glow" style={{ fontSize: 12, color: 'hsl(var(--accent))' }}>// {title}</span>
          <button className="widget-btn" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
