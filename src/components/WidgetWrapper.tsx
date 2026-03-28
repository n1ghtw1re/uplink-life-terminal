import { ReactNode, useState } from 'react';

interface WidgetWrapperProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  onFullscreen?: () => void;
  onMinimize?: (minimized: boolean) => void;
  isFullscreen?: boolean;
  isMinimized?: boolean;
}

const WidgetWrapper = ({ title, children, onClose, onFullscreen, onMinimize, isFullscreen, isMinimized: externalMinimized }: WidgetWrapperProps) => {
  const [internalMinimized, setInternalMinimized] = useState(false);
  const isMinimized = externalMinimized ?? internalMinimized;

  const handleToggle = () => {
    const newState = !isMinimized;
    if (onMinimize) {
      onMinimize(newState);
    } else {
      setInternalMinimized(newState);
    }
  };

  return (
    <div className="widget" style={{ width: '100%', height: isMinimized ? 'auto' : '100%' }}>
      <div className="widget-header">
        <span className="text-glow">// {title}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="widget-btn" title={isMinimized ? "Restore" : "Minimize"} onClick={handleToggle}>
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
