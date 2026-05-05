// src/components/SidebarTerminal.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useOperator } from '@/hooks/useOperator';
import { useTerminalHistory } from '@/hooks/useTerminalHistory';
import { useTerminalAutocomplete } from '@/hooks/useTerminalAutocomplete';
import { executeCommand } from '@/services/terminal/commandExecutor';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgS = 'hsl(var(--bg-secondary))';

interface Props {
  expanded: boolean;
  onToggle?: () => void;
  widgetHandler?: (action: 'open' | 'close', widgetId: string) => void;
  drawerHandler?: (type: string, name: string, data?: any) => void;
  closeDrawerHandler?: () => void;
}

export default function SidebarTerminal({ expanded, onToggle, widgetHandler, drawerHandler, closeDrawerHandler }: Props) {
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
  } = useTerminalHistory(true); // SHARED history
  
  const { suggestions, currentSuggestion, completeSuggestion } = useTerminalAutocomplete(input);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on mount
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
  }, [input, operator, addInput, addOutput, addError, addDivider, clearHistory, resetHistoryIndex, widgetHandler, drawerHandler, closeDrawerHandler]);

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
        <div key={line.id} style={{ color: adim, fontSize: 9, padding: '2px 0' }}>
          {line.content}
        </div>
      );
    }

    return (
      <div
        key={line.id}
        style={{
          color: isError ? '#ff6644' : isInput ? acc : dim,
          fontSize: 10,
          padding: '1px 0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {line.content}
      </div>
    );
  };

  // Only show last 8 lines in sidebar
  const displayHistory = history.slice(-8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: expanded ? '100%' : 'auto', minHeight: 0 }}>
      
      {/* Title */}
      <div 
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          padding: '4px 12px',
          borderBottom: '1px solid hsl(var(--accent-dim))',
          fontSize: 9,
          color: adim,
          letterSpacing: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>// TERMINAL</span>
        <span>{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          
          {/* Input area */}
          <div style={{ 
            padding: '6px 8px', 
            background: bgS,
            borderBottom: `1px solid ${adim}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: acc, fontSize: 10, marginRight: 4 }}>{'>'}</span>
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
                  fontSize: 10,
                  caretColor: acc,
                }}
              />
            </div>

            {/* Suggestions (show max 3) */}
            {suggestions.length > 0 && input.trim() && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {suggestions.slice(0, 3).map((sug, i) => (
                  <div
                    key={sug.value}
                    style={{
                      fontSize: 9,
                      padding: '1px 4px',
                      background: i === suggestionIndex ? acc : 'transparent',
                      color: i === suggestionIndex ? 'hsl(var(--bg-primary))' : dim,
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

          {/* Output area - last 8 lines, scrollable, max 150px */}
          <div
            ref={outputRef}
            style={{
              maxHeight: 150,
              overflowY: 'auto',
              padding: '4px 8px',
              fontFamily: mono,
              background: 'hsl(var(--bg-primary))',
              scrollbarWidth: 'thin',
              scrollbarColor: `${adim} ${'hsl(var(--bg-secondary))'}`,
            }}
          >
            {displayHistory.map(renderLine)}
          </div>
        </div>
      )}
    </div>
  );
}
