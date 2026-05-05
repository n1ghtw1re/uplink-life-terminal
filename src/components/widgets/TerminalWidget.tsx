// src/components/widgets/TerminalWidget.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import WidgetWrapper from '../WidgetWrapper';
import { useOperator } from '@/hooks/useOperator';
import { useTerminalHistory } from '@/hooks/useTerminalHistory';
import { useTerminalAutocomplete } from '@/hooks/useTerminalAutocomplete';
import { executeCommand } from '@/services/terminal/commandExecutor';

interface WidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  isFocused?: boolean;
  widgetHandler?: (action: 'open' | 'close', widgetId: string) => void;
  drawerHandler?: (type: string, name: string, data?: any) => void;
  closeDrawerHandler?: () => void;
}

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';
const green = '#44ff88';

export default function TerminalWidget({ onClose, onFullscreen, isFullscreen, isFocused, widgetHandler, drawerHandler, closeDrawerHandler }: WidgetProps) {
  const { data: operator } = useOperator();
  const [input, setInput] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const {
    history,
    addInput,
    addOutput,
    addError,
    addDivider,
    clearHistory,
    getPreviousCommand,
    getNextCommand,
    resetHistoryIndex,
  } = useTerminalHistory();
  
  const { suggestions, currentSuggestion, completeSuggestion } = useTerminalAutocomplete(input);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const outputScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputScrollRef.current) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
    }
  }, [isFocused]);

  useEffect(() => {
    if (history.length === 0) {
      addOutput('UPLINK TERMINAL v1.0 — type [help] for commands');
      addDivider();
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd) return;

    addInput(cmd);
    setInput('');
    resetHistoryIndex();

    const result = await executeCommand(cmd, { operator, widgetHandler, drawerHandler, closeDrawerHandler });

    if (result.output) {
      if (result.output === '__CLEAR__') {
        clearHistory();
      } else {
        addOutput(result.output);
      }
    }

    if (result.error) {
      addError(result.error);
    }

    addDivider();
  }, [input, operator, addInput, addOutput, addError, addDivider, clearHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey && suggestions.length > 0) {
        e.preventDefault();
        setInput(completeSuggestion(suggestions[suggestionIndex]?.value));
        setSuggestionIndex(0);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setInput(completeSuggestion(suggestions[suggestionIndex]?.value));
        setSuggestionIndex(0);
      }
    } else if (e.key === 'Escape') {
      setSuggestionIndex(0);
    } else if (e.key === 'ArrowRight' && suggestions.length > 0) {
      e.preventDefault();
      setSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowLeft' && suggestions.length > 0) {
      e.preventDefault();
      setSuggestionIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevCmd = getPreviousCommand();
      if (prevCmd !== undefined) setInput(prevCmd);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextCmd = getNextCommand();
      if (nextCmd !== undefined) setInput(nextCmd);
    }
  }, [handleSubmit, suggestions, suggestionIndex, currentSuggestion, completeSuggestion, getPreviousCommand, getNextCommand]);

  const renderLine = (line: typeof history[0]) => {
    const isInput = line.type === 'input';
    const isError = line.type === 'error';
    const isDivider = line.type === 'divider';
    
    if (isDivider) {
      return (
        <div key={line.id} style={{ color: adim, fontSize: 10, padding: '4px 0' }}>
          {line.content}
        </div>
      );
    }

    return (
      <div
        key={line.id}
        style={{
          color: isError ? '#ff6644' : isInput ? acc : dim,
          fontSize: 11,
          padding: '2px 0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {line.content}
      </div>
    );
  };

  return (
    <WidgetWrapper title="TERMINAL" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* INPUT AREA - Fixed at top */}
        <div style={{ 
          padding: '8px 12px', 
          background: bgS,
          borderBottom: `1px solid ${adim}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: acc, fontSize: 11, marginRight: 4 }}>{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSuggestionIndex(0);
              }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder="Type a command..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: acc,
                fontFamily: mono,
                fontSize: 11,
                caretColor: acc,
              }}
            />
          </div>

          {/* AUTOCOMPLETE SUGGESTIONS */}
          {suggestions.length > 0 && input.trim() && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {suggestions.slice(0, 6).map((sug, i) => (
                <div
                  key={sug.value}
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    background: i === suggestionIndex ? acc : bgP,
                    color: i === suggestionIndex ? bgP : dim,
                    border: `1px solid ${i === suggestionIndex ? acc : adim}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const parts = input.trim().split(/\s+/);
                    parts[parts.length - 1] = sug.value;
                    setInput(parts.join(' ') + ' ');
                    setSuggestionIndex(0);
                    inputRef.current?.focus();
                  }}
                >
                  {sug.value}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OUTPUT AREA - Scrollable */}
        <div
          ref={outputScrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            fontFamily: mono,
            background: bgP,
            scrollbarWidth: 'thin',
            scrollbarColor: `${adim} ${bgS}`,
          }}
        >
          {history.map(renderLine)}
        </div>
      </div>
    </WidgetWrapper>
  );
}
