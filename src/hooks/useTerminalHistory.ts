// src/hooks/useTerminalHistory.ts
import { useState, useCallback } from 'react';
import type { TerminalLine } from '@/services/terminal/types';

const MAX_HISTORY = 50;

export function useTerminalHistory() {
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    const line: TerminalLine = {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date(),
    };

    setHistory(prev => {
      const newHistory = [...prev, line];
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(-MAX_HISTORY);
      }
      return newHistory;
    });
  }, []);

  const addInput = useCallback((content: string) => {
    addLine('input', `> ${content}`);
    if (content.trim()) {
      setCommandHistory(prev => {
        const filtered = prev.filter(c => c !== content);
        return [...filtered, content];
      });
      setHistoryIndex(-1);
    }
  }, [addLine]);

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
    setHistory([]);
  }, []);

  const getPreviousCommand = useCallback(() => {
    if (commandHistory.length === 0) return '';
    
    const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
    setHistoryIndex(newIndex);
    return commandHistory[commandHistory.length - 1 - newIndex] || '';
  }, [commandHistory, historyIndex]);

  const getNextCommand = useCallback(() => {
    if (historyIndex <= 0) {
      setHistoryIndex(-1);
      return '';
    }
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return commandHistory[commandHistory.length - 1 - newIndex] || '';
  }, [commandHistory, historyIndex]);

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
