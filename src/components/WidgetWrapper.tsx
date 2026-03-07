import { ReactNode } from 'react';

interface WidgetWrapperProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
}

const WidgetWrapper = ({ title, children, onClose, onFullscreen, isFullscreen }: WidgetWrapperProps) => (
  <div className="widget" style={{ width: '100%', height: '100%' }}>
    <div className="widget-header">
      <span className="text-glow">// {title}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="widget-btn" title={isFullscreen ? "Restore" : "Fullscreen"} onClick={onFullscreen}>
          {isFullscreen ? '⤡' : '⤢'}
        </button>
        <button className="widget-btn widget-drag-handle" title="Drag" style={{ cursor: 'grab' }}>⣿</button>
        <button className="widget-btn" title="Close" onClick={onClose}>×</button>
      </div>
    </div>
    <div className="widget-body">
      {children}
    </div>
  </div>
);

export default WidgetWrapper;
