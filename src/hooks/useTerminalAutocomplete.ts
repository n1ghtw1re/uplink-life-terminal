// src/hooks/useTerminalAutocomplete.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import type { AutocompleteSuggestion } from '@/services/terminal/types';
import { AVAILABLE_COMMANDS } from '@/services/terminal/types';

function startsWithMatch(text: string, query: string): boolean {
  return text.toLowerCase().startsWith(query.toLowerCase());
}

function getCommandSuggestions(query: string): AutocompleteSuggestion[] {
  if (!query) {
  return AVAILABLE_COMMANDS
       .filter(cmd => cmd.name !== 'log')
       .map(cmd => ({ value: cmd.name, type: 'command' as const, score: 100 }));
  }
  
  return AVAILABLE_COMMANDS
    .filter(cmd => startsWithMatch(cmd.name, query))
    .map(cmd => ({ value: cmd.name, type: 'command' as const, score: 100 }));
}

export function useTerminalAutocomplete(input: string) {
  const firstToken = input.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const isDrawerContext = firstToken === 'drawer';
  const isLogContext = firstToken === 'log';
  const isHabitContext = firstToken === 'habit';

  const { data: exercises = [] } = useQuery({
    queryKey: ['terminal-exercises-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM exercises ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext,
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ['terminal-workouts-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM workouts ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['terminal-skills-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM skills ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext || isLogContext,
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['terminal-tools-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM tools ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext || isLogContext,
  });

  const { data: augments = [] } = useQuery({
    queryKey: ['terminal-augments-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM augments ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext || isLogContext,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['terminal-projects-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM projects ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext || isLogContext,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['terminal-notes-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM notes ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext,
  });

  const { data: media = [] } = useQuery({
    queryKey: ['terminal-media-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; title: string }>('SELECT id, title FROM media ORDER BY title');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext || isLogContext,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['terminal-habits-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM habits WHERE status = \'ACTIVE\' ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext || isHabitContext,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['terminal-courses-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM courses ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext || isLogContext,
  });

  const { data: vaultItems = [] } = useQuery({
    queryKey: ['terminal-vault-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; title: string }>('SELECT id, title FROM vault_items ORDER BY title');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext,
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['terminal-recipes-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM recipes ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['terminal-resources-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; title: string }>('SELECT id, title FROM resources ORDER BY title');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ['terminal-ingredients-list'],
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query<{ id: string; name: string }>('SELECT id, name FROM custom_ingredients ORDER BY name');
      return res.rows;
    },
    staleTime: Infinity,
    enabled: isDrawerContext,
  });

  const suggestions = useMemo((): AutocompleteSuggestion[] => {
    const trimmed = input.trim();
    const parts = trimmed ? trimmed.split(/\s+/) : [];
    const lastWord = parts.length > 0 ? parts[parts.length - 1] : '';
    const context = parts.length > 0 ? parts[0].toLowerCase() : '';

    // OPEN command context
    if (context === 'open' || context === 'close') {
      const widgets = ['xp', 'checkin', 'habits', 'planner', 'recovery', 'ingredients', 'intake', 'exercise', 'workouts', 'output', 'recipes', 'heatmap', 'stats', 'courses', 'media', 'skills', 'tools', 'resources', 'augments', 'projects', 'vault', 'notes', 'clock', 'calculator', 'converter', 'terminal'];
      if (!lastWord) {
        return widgets.map(w => ({ value: w, type: 'widget' as const, score: 100 }));
      }
      return widgets
        .filter(w => startsWithMatch(w, lastWord))
        .slice(0, 8)
        .map(w => ({ value: w, type: 'widget' as const, score: 100 }));
    }

    // LIST command context
    if (context === 'list') {
      const listTypes = ['skills', 'exercises', 'workouts', 'tools', 'augments', 'projects', 'media', 'habits', 'courses', 'vault', 'recipes', 'resources', 'ingredients', 'notes'];
      if (!lastWord) {
        return listTypes.map(t => ({ value: t, type: 'command' as const, score: 100 }));
      }
      return listTypes
        .filter(t => startsWithMatch(t, lastWord))
        .slice(0, 8)
        .map(t => ({ value: t, type: 'command' as const, score: 100 }));
    }

    // DRAWER command context
    if (context === 'drawer') {
      const allItems = [
        ...exercises.map(e => ({ value: e.name, type: 'skill' as const, score: 100 })),
        ...workouts.map(w => ({ value: w.name, type: 'project' as const, score: 100 })),
        ...skills.map(s => ({ value: s.name, type: 'skill' as const, score: 100 })),
        ...tools.map(t => ({ value: t.name, type: 'tool' as const, score: 100 })),
        ...augments.map(a => ({ value: a.name, type: 'augment' as const, score: 100 })),
        ...projects.map(p => ({ value: p.name, type: 'project' as const, score: 100 })),
        ...notes.map(n => ({ value: n.name, type: 'note' as const, score: 100 })),
        ...media.map(m => ({ value: m.title, type: 'media' as const, score: 100 })),
        ...habits.map(h => ({ value: h.name, type: 'habit' as const, score: 100 })),
        ...courses.map(c => ({ value: c.name, type: 'course' as const, score: 100 })),
        ...vaultItems.map(v => ({ value: v.title, type: 'vault' as const, score: 100 })),
        ...recipes.map(r => ({ value: r.name, type: 'recipe' as const, score: 100 })),
        ...resources.map(r => ({ value: r.title, type: 'resource' as const, score: 100 })),
        ...ingredients.map(i => ({ value: i.name, type: 'ingredient' as const, score: 100 })),
      ];
      if (!lastWord) {
        return allItems.slice(0, 8);
      }
      return allItems
        .filter(item => startsWithMatch(item.value, lastWord))
        .slice(0, 8);
    }
    
    // LOG command context
    if (context === 'log') {
      // log (no args yet) or log <duration> - show commands
      if (parts.length <= 2) {
        return getCommandSuggestions(lastWord);
      }
      
      // Check if we're after a -t flag
      const lastIdx = parts.length - 1;
      const prevWord = lastIdx > 0 ? parts[lastIdx - 1] : '';
      
      if (prevWord === '-t') {
        if (!lastWord) {
          return tools.slice(0, 8).map(t => ({ value: t.name, type: 'tool' as const, score: 100 }));
        }
        return tools
          .filter(tool => startsWithMatch(tool.name, lastWord))
          .slice(0, 8)
          .map(tool => ({ value: tool.name, type: 'tool' as const, score: 100 }));
      }

      if (prevWord === '-a') {
        if (!lastWord) {
          return augments.slice(0, 8).map(a => ({ value: a.name, type: 'augment' as const, score: 100 }));
        }
        return augments
          .filter(aug => startsWithMatch(aug.name, lastWord))
          .slice(0, 8)
          .map(aug => ({ value: aug.name, type: 'augment' as const, score: 100 }));
      }

      if (prevWord === '-m') {
        if (!lastWord) {
          return media.slice(0, 8).map(m => ({ value: m.title, type: 'media' as const, score: 100 }));
        }
        return media
          .filter(m => startsWithMatch(m.title, lastWord))
          .slice(0, 8)
          .map(m => ({ value: m.title, type: 'media' as const, score: 100 }));
      }

      if (prevWord === '-c') {
        if (!lastWord) {
          return courses.slice(0, 8).map(c => ({ value: c.name, type: 'course' as const, score: 100 }));
        }
        return courses
          .filter(c => startsWithMatch(c.name, lastWord))
          .slice(0, 8)
          .map(c => ({ value: c.name, type: 'course' as const, score: 100 }));
      }

      if (prevWord === '-p') {
        if (!lastWord) {
          return projects.slice(0, 8).map(p => ({ value: p.name, type: 'project' as const, score: 100 }));
        }
        return projects
          .filter(p => startsWithMatch(p.name, lastWord))
          .slice(0, 8)
          .map(p => ({ value: p.name, type: 'project' as const, score: 100 }));
      }
      
      // Check if we already have flags earlier (show skills)
      const hasToolFlag = parts.some(p => p === '-t');
      const hasAugFlag = parts.some(p => p === '-a');
      const hasMediaFlag = parts.some(p => p === '-m');
      const hasCourseFlag = parts.some(p => p === '-c');
      const hasProjectFlag = parts.some(p => p === '-p');
      
      // log <duration> <unit> - show skills that start with input
      if (parts.length >= 3 && !hasToolFlag && !hasAugFlag && !hasMediaFlag && !hasCourseFlag && !hasProjectFlag) {
        if (!lastWord) {
          return skills.slice(0, 8).map(skill => ({ value: skill.name, type: 'skill' as const, score: 100 }));
        }
        return skills
          .filter(skill => startsWithMatch(skill.name, lastWord))
          .slice(0, 8)
          .map(skill => ({ value: skill.name, type: 'skill' as const, score: 100 }));
      }
    }
    
    // HABIT command context
    if (context === 'habit' || context === 'habits') {
      if (!lastWord) {
        return habits.map(h => ({ value: h.name, type: 'habit' as const, score: 100 }));
      }
      return habits
        .filter(h => startsWithMatch(h.name, lastWord))
        .slice(0, 8)
        .map(h => ({ value: h.name, type: 'habit' as const, score: 100 }));
    }
    
    // Default context - show commands that start with input
    return getCommandSuggestions(lastWord).slice(0, 8);
  }, [input, exercises, workouts, skills, tools, augments, projects, notes, media, habits, courses, vaultItems, recipes, resources, ingredients]);

  const currentSuggestion = suggestions[0]?.value || '';
  
  const completeSuggestion = (value?: string): string => {
    const parts = input.trim().split(/\s+/);
    const targetValue = value || currentSuggestion;
    if (!targetValue) return input;

    if (parts.length <= 1) {
      return targetValue + ' ';
    }
    parts[parts.length - 1] = targetValue;
    return parts.join(' ') + ' ';
  };

  return {
    suggestions,
    currentSuggestion,
    completeSuggestion,
  };
}
