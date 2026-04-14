// src/services/terminal/commandParser.ts
import type { ParsedCommand } from './types';

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { command: '', args: [], flags: {} };
  }

  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  const command = parts[0]?.toLowerCase() || '';
  const args: string[] = [];
  const flags: Record<string, string | string[]> = {};

  let i = 1;
  while (i < parts.length) {
    const part = parts[i];

    if (part.startsWith('-')) {
      const flagName = part.slice(1);
      const flagValues: string[] = [];
      
      // Collect all values until next flag or end
      i++;
      while (i < parts.length && !parts[i].startsWith('-')) {
        flagValues.push(parts[i]);
        i++;
      }
      
      if (flagValues.length > 0) {
        const joinedValue = flagValues.join(' ');
        
        // If this flag already exists, convert to array or append
        if (flags[flagName]) {
          const existing = flags[flagName];
          if (Array.isArray(existing)) {
            existing.push(joinedValue);
          } else {
            flags[flagName] = [existing, joinedValue];
          }
        } else {
          flags[flagName] = joinedValue;
        }
      } else {
        flags[flagName] = '';
      }
    } else {
      args.push(part);
      i++;
    }
  }

  return { command, args, flags };
}

export function parseDuration(args: string[]): { minutes: number; remainingArgs: string[] } | null {
  if (args.length < 1) return null;

  // Check for compact format like "1h", "45m", "2h"
  const compactMatch = args[0].match(/^(\d+(?:\.\d+)?)(h|mins?|hours?|m)$/i);
  if (compactMatch) {
    const num = parseFloat(compactMatch[1]);
    const unit = compactMatch[2].toLowerCase();
    let minutes = 0;
    
    if (unit === 'h' || unit === 'hour' || unit === 'hours') {
      minutes = Math.round(num * 60);
    } else {
      minutes = Math.round(num);
    }
    
    return { minutes, remainingArgs: args.slice(1) };
  }

  // Standard format: "1 hour", "45 min", "2 h"
  if (args.length < 2) return null;

  const durationStr = args[0];
  const unit = args[1].toLowerCase();

  const numMatch = durationStr.match(/^(\d+(?:\.\d+)?)$/);
  if (!numMatch) return null;

  const num = parseFloat(numMatch[1]);

  if (unit === 'hour' || unit === 'hours' || unit === 'h') {
    return { minutes: Math.round(num * 60), remainingArgs: args.slice(2) };
  }

  if (unit === 'min' || unit === 'mins' || unit === 'minute' || unit === 'minutes' || unit === 'm') {
    return { minutes: Math.round(num), remainingArgs: args.slice(2) };
  }

  return null;
}

export function getCommandSuggestions(input: string): string[] {
  const lower = input.toLowerCase().trim();
  if (!lower) {
    return ['help', 'status', 'clear', 'log', 'habit'];
  }

  const commands = ['help', 'status', 'clear', 'log', 'habit'];
  return commands.filter(cmd => cmd.startsWith(lower));
}
