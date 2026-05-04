// src/hooks/useTerminalHistory.ts
import { useState, useCallback, useEffect } from 'react';
import type { TerminalLine } from '@/services/terminal/types';

const MAX_HISTORY = 50;

// Shared history for sidebar terminal + widget terminal
const globalHistory: TerminalLine[] = [];
const globalCommandHistory: string[] = [];
let globalListeners: ((history: TerminalLine[]) => void)[] = [];

export function useTerminalHistory(shared = false) {
  const [history, setHistory] = useState<TerminalLine[]>(shared ? [...globalHistory] : []);
  const [commandHistory, setCommandHistory] = useState<string[]>(shared ? [...globalCommandHistory] : []);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // If shared, sync with globalHistory
  useEffect(() => {
    if (!shared) return;
    const listener = (h: TerminalLine[]) => {
      setHistory([...h]);
    };
    globalListeners.push(listener);
    // Sync initial state
    setHistory([...globalHistory]);
    return () => {
      globalListeners = globalListeners.filter(l => l !== listener);
    };
  }, [shared]);

  const updateGlobalHistory = (updater: (prev: TerminalLine[]) => TerminalLine[]) => {
    if (shared) {
      const newHistory = updater(globalHistory);
      globalHistory.length = 0;
      globalHistory.push(...newHistory);
      globalListeners.forEach(l => l([...globalHistory]));
    }
  };

  const updateGlobalCommands = (updater: (prev: string[]) => string[]) => {
    if (shared) {
      const newCommands = updater(globalCommandHistory);
      globalCommandHistory.length = 0;
      globalCommandHistory.push(...newCommands);
    }
  };

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    const line: TerminalLine = {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date(),
    };

    if (shared) {
      globalHistory.push(line);
      if (globalHistory.length > MAX_HISTORY) globalHistory.shift();
      globalListeners.forEach(l => l([...globalHistory]));
    } else {
      setHistory(prev => {
        const newHistory = [...prev, line];
        if (newHistory.length > MAX_HISTORY) {
          return newHistory.slice(-MAX_HISTORY);
        }
        return newHistory;
      });
    }
  }, [shared]);

  const addInput = useCallback((content: string) => {
    addLine('input', `> ${content}`);
    if (content.trim()) {
      if (shared) {
        const filtered = globalCommandHistory.filter(c => c !== content);
        globalCommandHistory.length = 0;
        globalCommandHistory.push(...filtered, content);
      } else {
        setCommandHistory(prev => {
          const filtered = prev.filter(c => c !== content);
          return [...filtered, content];
        });
      }
      setHistoryIndex(-1);
    }
  }, [addLine, shared]);

  const addOutput = useCallback((content: string) => {
    addLine('output', content);
  }, [addLine]);

  const addError = useCallback((content: string) => {
    addLine('error', content);
  }, [addLine]);

  const addDivider = useCallback(() => {
    addLine('divider', '─────────────────────────────────────────');
  }, [addLine]);

  const clearHistory = useCallback(() => {
    if (shared) {
      globalHistory.length = 0;
      globalCommandHistory.length = 0;
      globalListeners.forEach(l => l([...globalHistory]));
    } else {
      setHistory([]);
      setCommandHistory([]);
    }
  }, [shared]);

  const getPreviousCommand = useCallback(() => {
    const cmdHistory = shared ? globalCommandHistory : commandHistory;
    if (cmdHistory.length === 0) return '';
    
    const newIndex = historyIndex < cmdHistory.length - 1 ? historyIndex + 1 : historyIndex;
    setHistoryIndex(newIndex);
    return cmdHistory[cmdHistory.length - 1 - newIndex] || '';
  }, [shared, commandHistory, historyIndex]);

  const getNextCommand = useCallback(() => {
    const cmdHistory = shared ? globalCommandHistory : commandHistory;
    if (historyIndex <= 0) {
      setHistoryIndex(-1);
      return '';
    }
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return cmdHistory[cmdHistory.length - 1 - newIndex] || '';
  }, [shared, commandHistory, historyIndex]);

  const resetHistoryIndex = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  return {
    history,
    addInput,
    addOutput,
    addError,
    addDivider,
    clearHistory,
    getPreviousCommand,
    getNextCommand,
    resetHistoryIndex,
  };
}
