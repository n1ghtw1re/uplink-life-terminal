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
  {
    name: 'add',
    description: 'Add a new skill, augment, tool, resource, or note',
    syntax: 'add skill [name] -stats [stat1:%/stat2:%] [-n note] | add augment [name] -type [type] [-url http://...] [-d desc] [-n note] | add tool [name] -type [type] [-url http://...] [-d desc] [-n note] | add resource [name] -type [type] [-url http://...] [-d desc] [-n note] | add note [name] -content [content]',
    examples: [
      'add skill sword fighting -stats body:50/flow:50 -n this is a note',
      'add skill reading -stats mind',
      'add augment mma -type Core Intelligence -url https://... -d fighting technique -n trained today',
      'add tool vscode -type software -url https://code.visualstudio.com -d editor -n great tool',
      'add resource React Docs -type Learning -url https://react.dev -d official docs -n great resource',
      'add note meeting -content discussed project timeline',
    ],
  },
  {
    name: 'delete',
    description: 'Delete a skill, augment, tool, resource, or note (with confirmation)',
    syntax: 'delete skill [name] | delete augment [name] | delete tool [name] | delete resource [name] | delete note [name]',
    examples: [
      'delete skill reading',
      'delete augment mma',
      'delete tool vscode',
      'delete resource React Docs',
      'delete note meeting',
    ],
  },
];
