// src/services/terminal/types.ts

export interface TerminalCommand {
  name: string;
  description: string;
  syntax?: string;
  examples?: string[];
}

export interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, string | string[]>;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface AutocompleteSuggestion {
  value: string;
  type: 'command' | 'skill' | 'tool' | 'augment' | 'course' | 'project' | 'media' | 'note' | 'stat' | 'duration' | 'timeunit' | 'widget' | 'habit' | 'vault' | 'recipe' | 'resource' | 'ingredient';
  score: number;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'divider';
  content: string;
  timestamp: Date;
}

export const AVAILABLE_COMMANDS: TerminalCommand[] = [
  {
    name: 'help',
    description: 'Show available commands',
    syntax: 'help',
    examples: ['help'],
  },
  {
    name: 'status',
    description: 'Show operator status',
    syntax: 'status',
    examples: ['status'],
  },
  {
    name: 'clear',
    description: 'Clear terminal output',
    syntax: 'clear',
    examples: ['clear'],
  },
  {
    name: 'open',
    description: 'Open a widget',
    syntax: 'open [widget_name]',
    examples: ['open xp', 'open exercise', 'open terminal'],
  },
  {
    name: 'close',
    description: 'Close a widget',
    syntax: 'close [widget_name]',
    examples: ['close xp', 'close exercise'],
  },
  {
    name: 'drawer',
    description: 'Open or close drawer',
    syntax: 'drawer [name] | drawer close',
    examples: ['drawer cycling', 'drawer close'],
  },
  {
    name: 'list',
    description: 'List items (skills, tools, etc.)',
    syntax: 'list [type]',
    examples: ['list skills', 'list tools'],
  },
  {
    name: 'drawer',
    description: 'Open drawer for an item',
    syntax: 'drawer [name]',
    examples: ['drawer cycling', 'drawer vscode', 'drawer Snow White'],
  },
  {
    name: 'log',
    description: 'Log a session against a skill',
    syntax: 'log [duration] [skill] [flags]',
    examples: [
      'log 1 hour mma',
      'log 2h music production',
      'log 45m meditation',
      'log 1h reading -m Snow White',
      'log 2 hours coding -t vs code -p Uplink',
    ],
  },
  {
    name: 'habit',
    description: 'Check-in a habit (binary or quantitative)',
    syntax: 'HABIT [name] [#quantity]',
    examples: [
      'HABIT meditation',
      'HABIT pushups #50',
      'HABIT reading',
    ],
  },
];
