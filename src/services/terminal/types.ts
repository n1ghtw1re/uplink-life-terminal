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
    description: 'Open a widget (or all widgets)',
    syntax: 'open [widget_name] | open all',
    examples: ['open xp', 'open exercise', 'open terminal', 'open all'],
  },
  {
    name: 'close',
    description: 'Close a widget (or all widgets)',
    syntax: 'close [widget_name] | close all',
    examples: ['close xp', 'close exercise', 'close all'],
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
    description: 'Log a session (skill or exercise)',
    syntax: 'log [duration] [skill|exercise] [flags]',
    examples: [
      'log 1h coding -t vscode',
      'log 2h music production',
      'log 45m meditation',
      'log 1h reading -m Snow White',
      'log 2h reading -m Snow White -complete',
      'log 2 hours coding -t vscode -p Uplink',
      'log 30m bench press -set1 200-10 -set2 200-8 -intensity 6',
      'log 30m cycling -set1 10',
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
    description: 'Add a new skill, augment, tool, resource, note, course, or planner event',
    syntax: 'add event [event_name] -date mm/dd/yy [-time hh:mm AM/PM] | add skill [name] -stats [.../...] [-n note] | add course [name] -stats [.../...] | add augment|tool|resource [name] -type [type] [-url ...] [-d desc] [-n note] | add note [name] -content [content]',
    examples: [
      'add event Team Sync -date 05/20/26 -time 09:30 AM',
      'add event Team Sync -date 05/20/26',
      'add skill sword fighting -stats body:50/flow:50 -n this is a note',
      'add skill reading -stats mind',
      'add course python -stats mind:50/flow:50',
      'add augment mma -type Core Intelligence -url https://... -d fighting technique -n trained today',
      'add tool vscode -type software -url https://code.visualstudio.com -d editor -n great tool',
      'add resource React Docs -type Learning -url https://react.dev -d official docs -n great resource',
      'add note meeting -content discussed project timeline',
    ],
  },
  {
    name: 'delete',
    description: 'Delete an event, skill, augment, tool, resource, note, or course (with confirmation)',
    syntax: 'delete [event_name] [-date mm/dd/yy] | delete skill|augment|tool|resource|note|course [name]',
    examples: [
      'delete English Class -date 12/03/26',
      'delete Team Sync',
      'delete skill reading',
      'delete augment mma',
      'delete tool vscode',
      'delete resource React Docs',
      'delete note meeting',
      'delete course python',
    ],
  },
];
