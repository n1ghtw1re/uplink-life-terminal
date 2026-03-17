import { ReactNode, useState } from 'react';

interface WidgetWrapperProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
}

const WidgetWrapper = ({ title, children, onClose, onFullscreen, isFullscreen }: WidgetWrapperProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="widget" style={{ width: '100%', height: isMinimized ? 'auto' : '100%' }}>
      <div className="widget-header">
        <span className="text-glow">// {title}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="widget-btn" title={isMinimized ? "Restore" : "Minimize"} onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? '⤣' : '−'}
          </button>
          <button className="widget-btn" title={isFullscreen ? "Restore" : "Fullscreen"} onClick={onFullscreen}>
            {isFullscreen ? '⤡' : '⤢'}
          </button>
          <button className="widget-btn widget-drag-handle" title="Drag" style={{ cursor: 'grab' }}>⣿</button>
          <button className="widget-btn" title="Close" onClick={onClose}>×</button>
        </div>
      </div>
      {!isMinimized && (
        <div className="widget-body">
          {children}
        </div>
      )}
    </div>
  );
};

export default WidgetWrapper;
