// src/services/terminal/commandExecutor.ts
import { parseCommand, parseDuration } from './commandParser';
import { AVAILABLE_COMMANDS, type CommandResult } from './types';
import { getXPDisplayValues, awardSessionXP, getLevelFromXP, awardBonusXP } from '@/services/xpService';
import { getDB } from '@/lib/db';
import { refreshAppData } from '@/lib/refreshAppData';
import { queryClient } from '@/main';
import { triggerXPFloat } from '@/components/effects/XPFloatLayer';
import { triggerLevelUp as triggerLevelUpAnim } from '@/components/effects/LevelUpAnimation';
import { todayStr, calcCheckInXP, MAX_SHIELDS } from '@/services/habitService';

// Pending delete state (module-level for confirmation across calls)
let pendingDelete: { type: string; name: string; id: string } | null = null;

const MEDIA_COMPLETION_XP: Record<string, number> = {
  book: 100,
  comic: 50,
  film: 40,
  documentary: 50,
  tv: 75,
  album: 30,
  game: 60,
};

function getMediaCompletionSource(type: string): string {
  return `${type || 'media'}_complete`;
}

export async function executeCommand(input: string, context?: any): Promise<CommandResult> {
  if (!input.trim()) {
    return { success: true, output: '' };
  }

  // Handle y/n confirmation for pending delete
  const trimmed = input.trim().toLowerCase();
  if (pendingDelete && (trimmed === 'y' || trimmed === 'n')) {
    if (trimmed === 'n') {
      const name = pendingDelete.name;
      pendingDelete = null;
      return { success: true, output: `Delete cancelled for '${name}'.` };
    }
    // If 'y', perform the delete directly with stored id
    const { type, name, id } = pendingDelete;
    pendingDelete = null;

    try {
      const db = await getDB();

      if (type === 'skill') {
        await db.query(`DELETE FROM skills WHERE id = $1`, [id]);
        queryClient.invalidateQueries({ queryKey: ['skills'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-skills-list'] });
        return { success: true, output: `Skill '${name}' deleted.` };
      }

      if (type === 'augment') {
        await db.query(`DELETE FROM augments WHERE id = $1`, [id]);
        queryClient.invalidateQueries({ queryKey: ['augments'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-augments-list'] });
        return { success: true, output: `Augment '${name}' deleted.` };
      }

      if (type === 'tool') {
        await db.query(`DELETE FROM tools WHERE id = $1`, [id]);
        queryClient.invalidateQueries({ queryKey: ['tools'] });
        queryClient.invalidateQueries({ queryKey: ['tools-for-lifepath'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-tools-list'] });
        return { success: true, output: `Tool '${name}' deleted.` };
      }

      if (type === 'resource') {
        await db.query(`DELETE FROM resources WHERE id = $1`, [id]);
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-resources-list'] });
        return { success: true, output: `Resource '${name}' deleted.` };
      }

      if (type === 'note') {
        await db.query(`UPDATE notes SET status = 'DELETED' WHERE id = $1`, [id]);
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-notes-list'] });
        return { success: true, output: `Note '${name}' deleted.` };
      }

      if (type === 'course') {
        await db.query(`DELETE FROM courses WHERE id = $1`, [id]);
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        queryClient.invalidateQueries({ queryKey: ['courses-all'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-courses-list'] });
        return { success: true, output: `Course '${name}' deleted.` };
      }
      if (type === 'event') {
        await db.query(`DELETE FROM planner_exceptions WHERE entry_id = $1`, [id]);
        await db.query(`DELETE FROM planner_entries WHERE id = $1`, [id]);
        queryClient.invalidateQueries({ queryKey: ['planner-entries'] });
        queryClient.invalidateQueries({ queryKey: ['planner-exceptions'] });
        queryClient.invalidateQueries({ queryKey: ['planner'] });
        queryClient.invalidateQueries({ queryKey: ['terminal-events-list'] });
        return { success: true, output: `Event '${name}' deleted.` };
      }

      return { success: false, output: '', error: `Unknown delete type: ${type}` };
    } catch (err: any) {
      console.error('[DELETE] Error:', err);
      return { success: false, output: '', error: err.message || 'Failed to delete' };
    }
  }

  const parsed = parseCommand(input);
  const { command, args, flags } = parsed;

  if (!command) {
    return { success: true, output: '' };
  }

  const widgetHandler = context?.widgetHandler;
  const drawerHandler = context?.drawerHandler;

  try {
    switch (command) {
      case 'help':
        return executeHelp();
      case 'status':
        return executeStatus(context);
      case 'clear':
        return { success: true, output: '__CLEAR__' };
      case 'log':
        return executeLog(args, flags, context);
      case 'open':
        return executeOpen(args, widgetHandler);
      case 'close':
        return executeClose(args, widgetHandler);
      case 'list':
        return executeList(args, context);
      case 'drawer':
        return executeDrawer(args, drawerHandler, context?.closeDrawerHandler);
      case 'habit':
        return executeHabit(args);
      case 'add':
        return executeAdd(args, flags);
      case 'delete':
        return executeDelete(args, flags);
      default:
        return { success: false, output: '', error: `Unknown command: ${command}. Type 'help' for available commands.` };
    }
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err.message || 'An error occurred',
    };
  }
}

function executeHelp(): CommandResult {
  const output = AVAILABLE_COMMANDS
    .map(cmd => {
      const examples = cmd.examples?.length ? `\n  Examples:\n    ${cmd.examples.slice(0, 2).map(e => '> ' + e).join('\n    ')}` : '';
      const syntax = cmd.syntax ? `\n  Syntax: ${cmd.syntax}` : '';
      return `${cmd.name.padEnd(10)}${cmd.description}${syntax}${examples}`;
    })
    .join('\n\n');

  return {
    success: true,
    output: `COMMAND     DESCRIPTION\n─────────────────────────────────────────\n${output}`,
  };
}

async function executeList(args: string[], context?: any): Promise<CommandResult> {
  const item = args[0]?.toLowerCase();
  const db = await getDB();

  const truncate = (name: string, maxLen = 15) => name.length > maxLen ? name.slice(0, maxLen - 2) + '..' : name;

  if (!item || item === 'skills' || item === 'skill') {
    const res = await db.query<{ id: string; name: string; level: number; xp: number; active: boolean }>(
      `SELECT id, name, level, xp, active FROM skills WHERE active = true ORDER BY LOWER(name)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No skills found. Add skills from the Skills page.' };
    }

    const output = res.rows.map(s => 
      `${truncate(s.name).padEnd(15)} LVL ${String(s.level || 1).padEnd(3)} XP ${String(s.xp || 0).padStart(8)}`
    ).join('\n');

    return {
      success: true,
      output: `SKILLS (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'exercises' || item === 'exercise') {
    const res = await db.query<{ id: string; name: string; level: number; xp: number }>(
      `SELECT id, name, level, xp FROM exercises WHERE active = true ORDER BY LOWER(name)`
    );

    if (res.rows.length === 0) {
      return { success: true, output: 'No exercises found. Add exercises from the Exercise page.' };
    }

    const output = res.rows.map(e =>
      `${truncate(e.name).padEnd(15)} LVL ${String(e.level || 0).padEnd(3)} XP ${String(e.xp || 0).padStart(8)}`
    ).join('\n');

    return {
      success: true,
      output: `EXERCISE (${res.rows.length})\n---------------------------------------------\n${output}`,
    };
  }

  if (item === 'workouts' || item === 'workout') {
    const res = await db.query<{ id: string; name: string; completed_count: number }>(
      `SELECT id, name, completed_count FROM workouts WHERE active = true ORDER BY LOWER(name)`
    );

    if (res.rows.length === 0) {
      return { success: true, output: 'No workouts found. Add workouts from the Workouts page.' };
    }

    const output = res.rows.map(w =>
      `${truncate(w.name).padEnd(15)} DONE ${String(w.completed_count || 0).padStart(4)}`
    ).join('\n');

    return {
      success: true,
      output: `WORKOUTS (${res.rows.length})\n---------------------------------------------\n${output}`,
    };
  }

  if (item === 'tools' || item === 'tool') {
    const res = await db.query<{ id: string; name: string; level: number; xp: number; active: boolean }>(
      `SELECT id, name, level, xp, active FROM tools WHERE active = true ORDER BY LOWER(name)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No tools found. Add tools from the Tools page.' };
    }

    const output = res.rows.map(t => 
      `${truncate(t.name).padEnd(15)} LVL ${String(t.level || 1).padEnd(3)} XP ${String(t.xp || 0).padStart(8)}`
    ).join('\n');

    return {
      success: true,
      output: `TOOLS (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'augments' || item === 'augment' || item === 'aug') {
    const res = await db.query<{ id: string; name: string; level: number; xp: number; active: boolean }>(
      `SELECT id, name, level, xp, active FROM augments WHERE active = true ORDER BY LOWER(name)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No augments found. Add augments from the Augments page.' };
    }

    const output = res.rows.map(a => 
      `${truncate(a.name).padEnd(15)} LVL ${String(a.level || 1).padEnd(3)} XP ${String(a.xp || 0).padStart(8)}`
    ).join('\n');

    return {
      success: true,
      output: `AUGMENTS (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'projects' || item === 'project') {
    const res = await db.query<{ id: string; name: string; status: string }>(
      `SELECT id, name, status FROM projects ORDER BY LOWER(name)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No projects found. Add projects from the Projects page.' };
    }

    const output = res.rows.map(p => 
      `${truncate(p.name).padEnd(15)} ${(p.status || 'ACTIVE').padEnd(10)}`
    ).join('\n');

    return {
      success: true,
      output: `PROJECTS (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'media' || item === 'books') {
    const res = await db.query<{ id: string; title: string; type: string; status: string }>(
      `SELECT id, title, type, status FROM media ORDER BY LOWER(title)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No media found. Add media from the Media page.' };
    }

    const output = res.rows.map(m => 
      `${truncate(m.title).padEnd(15)} ${(m.type || 'book').toUpperCase().padEnd(12)} ${(m.status || 'QUEUED').padEnd(10)}`
    ).join('\n');

    return {
      success: true,
      output: `MEDIA (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'habits' || item === 'habit') {
    const res = await db.query<{ id: string; name: string; stat_key: string; status: string; current_streak: number }>(
      `SELECT id, name, stat_key, status, current_streak FROM habits WHERE status = 'ACTIVE' ORDER BY LOWER(name)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No habits found. Add habits from the Habits page.' };
    }

    const output = res.rows.map(h => 
      `${truncate(h.name).padEnd(15)} ${(h.stat_key || 'body').toUpperCase().padEnd(8)} 🔥${String(h.current_streak || 0).padStart(3)}`
    ).join('\n');

    return {
      success: true,
      output: `HABITS (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'courses' || item === 'course') {
    const res = await db.query<{ id: string; name: string; status: string; progress: number }>(
      `SELECT id, name, status, progress FROM courses ORDER BY LOWER(name)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No courses found. Add courses from the Courses page.' };
    }

    const output = res.rows.map(c => 
      `${truncate(c.name).padEnd(15)} ${(c.status || 'QUEUED').padEnd(12)} ${String(c.progress || 0).padStart(3)}%`
    ).join('\n');

    return {
      success: true,
      output: `COURSES (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'vault') {
    const res = await db.query<{ id: string; title: string; category: string }>(
        `SELECT id, title, category FROM vault_items ORDER BY LOWER(title)`
    );
    
    if (res.rows.length === 0) {
      return { success: true, output: 'No vault items found. Add items from the Vault page.' };
    }

    const output = res.rows.map(v => 
      `${truncate(v.title).padEnd(15)} ${(v.category || 'SIGNAL').padEnd(10)}`
    ).join('\n');

    return {
      success: true,
      output: `VAULT (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
    };
  }

  if (item === 'recipes' || item === 'recipe') {
    try {
      const res = await db.query<{ id: string; name: string; category: string }>(
        `SELECT id, name, category FROM recipes ORDER BY LOWER(name)`
      );
      
      if (res.rows.length === 0) {
        return { success: true, output: 'No recipes found. Add recipes from the Recipes page.' };
      }

      const output = res.rows.map(r => 
        `${truncate(r.name).padEnd(15)} ${(r.category || 'Dinner').padEnd(10)}`
      ).join('\n');

      return {
        success: true,
        output: `RECIPES (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
      };
    } catch {
      return { success: true, output: 'No recipes found. Add recipes from the Recipes page.' };
    }
  }

  if (item === 'resources' || item === 'resource') {
    try {
      const res = await db.query<{ id: string; title: string; category: string }>(
        `SELECT id, title, category FROM resources ORDER BY title`
      );
      
      if (res.rows.length === 0) {
        return { success: true, output: 'No resources found. Add resources from the Resources page.' };
      }

      const output = res.rows.map(r => 
        `${truncate(r.title).padEnd(15)} ${(r.category || 'Learning').padEnd(12)}`
      ).join('\n');

      return {
        success: true,
        output: `RESOURCES (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
      };
    } catch {
      return { success: true, output: 'No resources found. Add resources from the Resources page.' };
    }
  }

  if (item === 'ingredients' || item === 'ingredient') {
    try {
      const res = await db.query<{ id: string; name: string }>(
        `SELECT id, name FROM custom_ingredients ORDER BY LOWER(name)`
      );
      
      if (res.rows.length === 0) {
        return { success: true, output: 'No ingredients found. Add ingredients from the Recipes page.' };
      }

      const output = res.rows.map(i => truncate(i.name).padEnd(15)).join('\n');

      return {
        success: true,
        output: `INGREDIENTS (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
      };
    } catch {
      return { success: true, output: 'No ingredients found. Add ingredients from the Recipes page.' };
    }
  }

  if (item === 'notes' || item === 'note') {
    try {
      const res = await db.query<{ id: string; name: string }>(
        `SELECT id, name FROM notes ORDER BY LOWER(name)`
      );
      
      if (res.rows.length === 0) {
        return { success: true, output: 'No notes found. Add notes from the Notes page.' };
      }

      const output = res.rows.map(n => truncate(n.name).padEnd(15)).join('\n');

      return {
        success: true,
        output: `NOTES (${res.rows.length})\n─────────────────────────────────────────────\n${output}`,
      };
    } catch {
      return { success: true, output: 'No notes found. Add notes from the Notes page.' };
    }
  }

  return {
    success: false,
    output: '',
    error: `Unknown list type: ${item}. Available: skills, exercises, workouts, tools, augments, projects, media, habits, courses, vault, recipes, resources, ingredients, notes`,
  };
}

async function executeDrawer(args: string[], drawerHandler?: (type: string, name: string) => void, closeDrawerHandler?: () => void): Promise<CommandResult> {
  if (args.length < 1) {
    return {
      success: false,
      output: '',
      error: 'Usage: drawer [name] or drawer close\nExample: drawer cycling, drawer vscode, drawer close',
    };
  }

  const nameArg = args.join(' ').toLowerCase();

  if (nameArg === 'close' || nameArg === 'close drawer') {
    if (closeDrawerHandler) {
      closeDrawerHandler();
      return { success: true, output: 'Drawer closed' };
    }
    return { success: false, output: '', error: 'No drawer is currently open' };
  }

  const db = await getDB();

  // Search for the item in order of priority
  // Skills
  const skillRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM skills WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}') AND active = true`
  );
  if (skillRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('skill', skillRes.rows[0].id);
    return { success: true, output: `Opening drawer for skill: ${skillRes.rows[0].name}` };
  }

  const exerciseRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM exercises WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}') AND active = true`
  );
  if (exerciseRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('exercise', exerciseRes.rows[0].id);
    return { success: true, output: `Opening drawer for exercise: ${exerciseRes.rows[0].name}` };
  }

  const workoutRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM workouts WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}') AND active = true`
  );
  if (workoutRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('workout', workoutRes.rows[0].id);
    return { success: true, output: `Opening drawer for workout: ${workoutRes.rows[0].name}` };
  }

  // Tools
  const toolRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM tools WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}') AND active = true`
  );
  if (toolRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('tool', toolRes.rows[0].id);
    return { success: true, output: `Opening drawer for tool: ${toolRes.rows[0].name}` };
  }

  // Augments
  const augRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM augments WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}') AND active = true`
  );
  if (augRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('augment', augRes.rows[0].id);
    return { success: true, output: `Opening drawer for augment: ${augRes.rows[0].name}` };
  }

  // Projects
  const projRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM projects WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (projRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('project', projRes.rows[0].id);
    return { success: true, output: `Opening drawer for project: ${projRes.rows[0].name}` };
  }

  // Notes
  const noteRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM notes WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (noteRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('note', noteRes.rows[0].id);
    return { success: true, output: `Opening drawer for note: ${noteRes.rows[0].name}` };
  }

  // Media (books)
  const mediaRes = await db.query<{ id: string; title: string }>(
    `SELECT id, title FROM media WHERE LOWER(title) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (mediaRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('book', mediaRes.rows[0].id);
    return { success: true, output: `Opening drawer for media: ${mediaRes.rows[0].title}` };
  }

  // Habits - disabled due to persistent drawer rendering issues
  /*
  const habitRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM habits WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (habitRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('habit', habitRes.rows[0].id);
    return { success: true, output: `Opening drawer for habit: ${habitRes.rows[0].name}` };
  }
  */

  // Courses
  const courseRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM courses WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (courseRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('course', courseRes.rows[0].id);
    return { success: true, output: `Opening drawer for course: ${courseRes.rows[0].name}` };
  }

  // Vault items
  const vaultRes = await db.query<{ id: string; title: string }>(
    `SELECT id, title FROM vault_items WHERE LOWER(title) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (vaultRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('vault', vaultRes.rows[0].id);
    return { success: true, output: `Opening drawer for vault item: ${vaultRes.rows[0].title}` };
  }

  // Recipes
  const recipeRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM recipes WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (recipeRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('recipe', recipeRes.rows[0].id);
    return { success: true, output: `Opening drawer for recipe: ${recipeRes.rows[0].name}` };
  }

  // Resources
  const resourceRes = await db.query<{ id: string; title: string }>(
    `SELECT id, title FROM resources WHERE LOWER(title) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (resourceRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('resource', resourceRes.rows[0].id);
    return { success: true, output: `Opening drawer for resource: ${resourceRes.rows[0].title}` };
  }

  // Ingredients
  const ingredientRes = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM custom_ingredients WHERE LOWER(name) = LOWER('${nameArg.replace(/'/g, "''")}')`
  );
  if (ingredientRes.rows.length > 0) {
    if (drawerHandler) drawerHandler('ingredient', ingredientRes.rows[0].id);
    return { success: true, output: `Opening drawer for ingredient: ${ingredientRes.rows[0].name}` };
  }

  return {
    success: false,
    output: '',
    error: `Item "${nameArg}" not found. Use 'list skills' to see available items.`,
  };
}

async function executeStatus(context?: any): Promise<CommandResult> {
  if (!context?.operator) {
    return {
      success: false,
      output: '',
      error: 'Unable to fetch operator status',
    };
  }

  const op = context.operator;
  const xpValues = getXPDisplayValues(op.totalXp || 0);
  
  const output = `OPERATOR: ${op.callsign || 'Unknown'}\nLVL ${op.level || 1} ${op.levelTitle || 'Novice'}\n\nXP: ${(op.totalXp || 0).toLocaleString()} / ${xpValues.totalXPToNextLevel.toLocaleString()}\n\nCLASS: ${op.customClass || 'None selected'}`;

  return {
    success: true,
    output,
  };
}

async function executeLog(args: string[], flags: Record<string, string | string[]>, context?: any): Promise<CommandResult> {
  if (args.length < 2) {
    return {
      success: false,
      output: '',
      error: 'Usage: log [duration] [skill|exercise] [-t tool1] [-a augment1] [-m media] [-complete] [-c course] [-p project] [-stats stat:percent/...] [-n "note"]\n       log [duration] [exercise] -set1 [value] [-set2...] [-intensity N] [-m media] [-complete] [-n note]\nExample: log 1 hour mma, log 2h coding -t vscode -m Star Wars -complete, log 30m bench press -set1 200-10 -set2 200-8',
    };
  }

  const duration = parseDuration(args);
  if (!duration) {
    return {
      success: false,
      output: '',
      error: 'Invalid duration. Use format: log 1 hour mma, log 2h coding, log 45m meditation',
    };
  }

  const targetName = duration.remainingArgs.join(' ');

  if (!targetName) {
    return {
      success: false,
      output: '',
      error: 'Please specify a skill or exercise name',
    };
  }

  const db = await getDB();
  
  // Try skill first (backward compatibility)
  const skillResult = await db.query<any>(`SELECT id, name, stat_keys, default_split, xp FROM skills WHERE LOWER(name) = LOWER('${targetName.replace(/'/g, "''")}')`);

  if (skillResult.rows.length > 0) {
    const skill = skillResult.rows[0];
    return executeSkillLog(skill, duration, flags);
  }

  // Try exercise
  const exerciseResult = await db.query<any>(`SELECT id, name, xp, quantity_type, metric_type, primary_stat, secondary_stat, primary_pct, secondary_pct FROM exercises WHERE LOWER(name) = LOWER('${targetName.replace(/'/g, "''")}')`);

  if (exerciseResult.rows.length > 0) {
    const exercise = exerciseResult.rows[0];
    return executeExerciseLog(exercise, duration, flags);
  }

  return {
    success: false,
    output: '',
    error: `"${targetName}" not found. Please specify a valid skill or exercise name.`,
  };
}

// ─── HELPER: Process skill log ────────────────────────
async function executeSkillLog(skill: any, duration: { minutes: number; remainingArgs: string[] }, flags: Record<string, string | string[]>): Promise<CommandResult> {
  const db = await getDB();

  let statKeys: string[] = [];
  try {
    const rawStatKeys = skill.stat_keys;
    if (Array.isArray(rawStatKeys)) {
      statKeys = rawStatKeys;
    } else if (typeof rawStatKeys === 'string') {
      if (rawStatKeys.startsWith('[')) {
        statKeys = JSON.parse(rawStatKeys);
      } else {
        statKeys = rawStatKeys.split(',');
      }
    }
  } catch {
    statKeys = [];
  }
  
  let defaultSplit: number[] = [100];
  try {
    const rawSplit = skill.default_split;
    if (Array.isArray(rawSplit)) {
      defaultSplit = rawSplit;
    } else if (typeof rawSplit === 'string') {
      if (rawSplit.startsWith('[')) {
        defaultSplit = JSON.parse(rawSplit);
      }
    }
  } catch {
    defaultSplit = [100];
  }

  // Parse -stats flag
  let statSplit = buildStatSplitFromKeys(statKeys, defaultSplit);
  const statsFlag = flags.stats;
  if (statsFlag) {
    const statsValue = Array.isArray(statsFlag) ? statsFlag[0] : statsFlag;
    const parsedSplit = parseSplitFlag(statsValue);
    if (parsedSplit) {
      statSplit = parsedSplit;
    }
  }

  // Process -t (tools) flags
  let toolIds: string[] = [];
  let toolNames: string[] = [];
  const toolFlag = flags.t;
  if (toolFlag) {
    const toolNamesArr = Array.isArray(toolFlag) ? toolFlag : [toolFlag];
    for (const toolName of toolNamesArr) {
      const toolResult = await db.query<any>(`SELECT id, name FROM tools WHERE LOWER(name) = LOWER('${toolName.replace(/'/g, "''")}')`);
      if (toolResult.rows.length > 0) {
        toolIds.push(toolResult.rows[0].id);
        toolNames.push(toolResult.rows[0].name);
      }
    }
    if (toolNamesArr.length > toolNames.length) {
      const missing = toolNamesArr.filter(tn => !toolNames.includes(tn));
      return {
        success: false,
        output: '',
        error: `Tool(s) not found: ${missing.join(', ')}`,
      };
    }
  }

  // Process -a (augments) flags
  let augmentIds: string[] = [];
  let augmentNames: string[] = [];
  const augmentFlag = flags.a || flags.aug;
  if (augmentFlag) {
    const augmentNamesArr = Array.isArray(augmentFlag) ? augmentFlag : [augmentFlag];
    for (const augName of augmentNamesArr) {
      const augResult = await db.query<any>(`SELECT id, name FROM augments WHERE LOWER(name) = LOWER('${augName.replace(/'/g, "''")}')`);
      if (augResult.rows.length > 0) {
        augmentIds.push(augResult.rows[0].id);
        augmentNames.push(augResult.rows[0].name);
      }
    }
    if (augmentNamesArr.length > augmentNames.length) {
      const missing = augmentNamesArr.filter(an => !augmentNames.includes(an));
      return {
        success: false,
        output: '',
        error: `Augment(s) not found: ${missing.join(', ')}`,
      };
    }
  }

  // Process -m (media) flag
  let mediaId = null;
  let mediaTitle = null;
  let mediaType = null;
  const mediaFlag = flags.m || flags.media;
  if (mediaFlag) {
    const mediaName = Array.isArray(mediaFlag) ? mediaFlag[0] : mediaFlag;
    const mediaResult = await db.query<any>(`SELECT id, title, type FROM media WHERE LOWER(title) = LOWER('${mediaName.replace(/'/g, "''")}')`);
    if (mediaResult.rows.length > 0) {
      mediaId = mediaResult.rows[0].id;
      mediaTitle = mediaResult.rows[0].title;
      mediaType = mediaResult.rows[0].type;
    } else {
      return { success: false, output: '', error: `Media not found: ${mediaName}` };
    }
  }

  // Process -c (course) flag
  let courseId = null;
  let courseName = null;
  const courseFlag = flags.c || flags.course;
  if (courseFlag) {
    const courseSearchName = Array.isArray(courseFlag) ? courseFlag[0] : courseFlag;
    const courseResult = await db.query<any>(`SELECT id, name FROM courses WHERE LOWER(name) = LOWER('${courseSearchName.replace(/'/g, "''")}')`);
    if (courseResult.rows.length > 0) {
      courseId = courseResult.rows[0].id;
      courseName = courseResult.rows[0].name;
    } else {
      return { success: false, output: '', error: `Course not found: ${courseSearchName}` };
    }
  }

  // Process -p (project) flag
  let projectId = null;
  let projName = null;
  const projectFlag = flags.p || flags.project;
  if (projectFlag) {
    const projectSearchName = Array.isArray(projectFlag) ? projectFlag[0] : projectFlag;
    const projectResult = await db.query<any>(`SELECT id, name FROM projects WHERE LOWER(name) = LOWER('${projectSearchName.replace(/'/g, "''")}')`);
    if (projectResult.rows.length > 0) {
      projectId = projectResult.rows[0].id;
      projName = projectResult.rows[0].name;
    } else {
      return { success: false, output: '', error: `Project not found: ${projectSearchName}` };
    }
  }

  // Process -n (note) flag
  const noteFlag = flags.n;
  let sessionNote = null;
  if (noteFlag) {
    sessionNote = Array.isArray(noteFlag) ? noteFlag[0] : noteFlag;
    sessionNote = sessionNote.replace(/'/g, "''");
  }

  const sessionId = crypto.randomUUID();
  const xpResult = await awardSessionXP({
    sessionId,
    skillId: skill.id,
    skillName: skill.name,
    durationMinutes: duration.minutes,
    statSplit,
    toolIds,
    augmentIds,
    isLegacy: false,
  });

  const now = new Date().toISOString();
  const toolIdsJson = JSON.stringify(toolIds);
  const augmentIdsJson = JSON.stringify(augmentIds);
  const totalToolXP = xpResult.perToolXP * toolIds.length;
  const totalAugmentXP = xpResult.perAugmentXP * augmentIds.length;
  
  await db.exec(`
    INSERT INTO sessions (
      id, skill_id, skill_name, duration_minutes,
      stat_split, notes, is_legacy, logged_at,
      skill_xp, stat_xp, master_xp,
      tool_ids, total_tool_xp,
      augment_ids, total_augment_xp,
      course_id, media_id, project_id
    ) VALUES (
      '${sessionId}',
      '${skill.id}',
      '${skill.name.replace(/'/g, "''")}',
      ${duration.minutes},
      '${JSON.stringify(statSplit)}',
      ${sessionNote ? `'${sessionNote}'` : 'NULL'},
      false,
      '${now}',
      ${xpResult.skillXP},
      '${JSON.stringify(xpResult.statXPMap)}',
      ${xpResult.masterXP},
      '${toolIdsJson}',
      ${totalToolXP},
      '${augmentIdsJson}',
      ${totalAugmentXP},
      ${courseId ? `'${courseId}'` : 'NULL'},
      ${mediaId ? `'${mediaId}'` : 'NULL'},
      ${projectId ? `'${projectId}'` : 'NULL'}
    );
  `);

  let mediaCompleteMessage: string | null = null;
  const shouldCompleteMedia = mediaId && Object.prototype.hasOwnProperty.call(flags, 'complete');
  if (shouldCompleteMedia) {
    const completedAt = new Date().toISOString();
    await db.query(
      `UPDATE media SET status = 'FINISHED', completed_at = $1, completed_count = COALESCE(completed_count, 0) + 1 WHERE id = $2`,
      [completedAt, mediaId]
    );

    const completionXP = Math.floor(MEDIA_COMPLETION_XP[String(mediaType || '')] ?? 40);
    const completionStat = statSplit[0]?.stat;
    if (completionStat && completionXP > 0) {
      await awardBonusXP({
        source: getMediaCompletionSource(String(mediaType || 'media')),
        sourceId: String(mediaId),
        statKey: completionStat as any,
        amount: completionXP,
        notes: mediaTitle || undefined,
      });
      mediaCompleteMessage = `${mediaTitle} completed (+${completionXP} XP)`;
    } else {
      mediaCompleteMessage = `${mediaTitle} completed`;
    }
    queryClient.invalidateQueries({ queryKey: ['media-item'] });
    queryClient.invalidateQueries({ queryKey: ['media'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-media-list'] });
  }

  // Update cache
  if (toolIds.length > 0 && xpResult.perToolXP > 0) {
    queryClient.setQueryData(['tools'], (prev: any[] | undefined) =>
      prev?.map((tool) => {
        if (!toolIds.includes(tool.id)) return tool;
        const nextXP = Number(tool.xp ?? 0) + xpResult.perToolXP;
        const nextLevel = getLevelFromXP(nextXP);
        return {
          ...tool,
          xp: nextXP,
          level: nextLevel.level,
          xpInLevel: nextLevel.xpInLevel,
          xpForLevel: nextLevel.xpForLevel,
        };
      }) ?? prev
    );

    queryClient.setQueryData(['tool-session-counts'], (prev: Record<string, number> | undefined) => {
      const next = { ...(prev ?? {}) };
      for (const toolId of toolIds) next[toolId] = (next[toolId] ?? 0) + 1;
      return next;
    });

    queryClient.setQueryData(['tool-last-session'], (prev: Record<string, string> | undefined) => {
      const next = { ...(prev ?? {}) };
      for (const toolId of toolIds) next[toolId] = now;
      return next;
    });
  }

  if (augmentIds.length > 0 && xpResult.perAugmentXP > 0) {
    queryClient.setQueryData(['augments'], (prev: any[] | undefined) =>
      prev?.map((augment) => {
        if (!augmentIds.includes(augment.id)) return augment;
        const nextXP = Number(augment.xp ?? 0) + xpResult.perAugmentXP;
        const nextLevel = getLevelFromXP(nextXP);
        return {
          ...augment,
          xp: nextXP,
          level: nextLevel.level,
          xpInLevel: nextLevel.xpInLevel,
          xpForLevel: nextLevel.xpForLevel,
        };
      }) ?? prev
    );

    queryClient.setQueryData(['augment-session-counts'], (prev: Record<string, number> | undefined) => {
      const next = { ...(prev ?? {}) };
      for (const augId of augmentIds) next[augId] = (next[augId] ?? 0) + 1;
      return next;
    });

    queryClient.setQueryData(['augment-last-session'], (prev: Record<string, string> | undefined) => {
      const next = { ...(prev ?? {}) };
      for (const augId of augmentIds) next[augId] = now;
      return next;
    });
  }

  await refreshAppData(queryClient);

  // Trigger visual effects
  if (xpResult.masterXP > 0) {
    setTimeout(() => triggerXPFloat(window.innerWidth / 2 + 60, window.innerHeight / 2 - 80, xpResult.masterXP, undefined, false), 200);
  }
  if (xpResult.perToolXP > 0 && toolIds.length > 0) {
    setTimeout(() => triggerXPFloat(window.innerWidth / 2 - 60, window.innerHeight / 2 - 40, xpResult.perToolXP * toolIds.length, undefined, false), 400);
  }
  if (xpResult.perAugmentXP > 0 && augmentIds.length > 0) {
    setTimeout(() => triggerXPFloat(window.innerWidth / 2, window.innerHeight / 2, xpResult.perAugmentXP * augmentIds.length, undefined, false), 600);
  }

  // Fire level up animation if master leveled up
  if (xpResult.masterLeveledUp) {
    setTimeout(() => {
      triggerLevelUpAnim({
        level: xpResult.newMasterLevel,
        className: 'OPERATOR',
        totalXP: xpResult.masterTotalXP,
        unlocks: xpResult.newMasterLevel === 3  ? ['GREEN PHOSPHOR THEME'] :
                 xpResult.newMasterLevel === 5  ? ['DOS CLASSIC THEME'] :
                 xpResult.newMasterLevel === 7  ? ['BLOOD RED THEME'] :
                 xpResult.newMasterLevel === 9  ? ['ICE BLUE THEME'] :
                 xpResult.newMasterLevel === 10 ? ['CUSTOM TERMINAL PROMPT'] : [],
      });
    }, 800);
  }

  const statXPSummary = xpResult.statXPMap
    .filter((s: any) => s.amount > 0)
    .map((s: any) => `${s.stat}: +${s.amount}`)
    .join(', ');

  let output = `Session logged successfully!\n\nSkill: ${skill.name}\nDuration: ${duration.minutes} minutes\n\nXP Awarded:\n  Skill XP: +${xpResult.skillXP}\n  Master XP: +${xpResult.masterXP}`;
  
  if (statXPSummary) {
    output += `\n  Stat XP: ${statXPSummary}`;
  }
  
  if (toolNames.length > 0) {
    output += `\n\nTools: ${toolNames.join(', ')} (+${xpResult.perToolXP} XP each)`;
  }
  
  if (augmentNames.length > 0) {
    output += `\n\nAugments: ${augmentNames.join(', ')} (+${xpResult.perAugmentXP} XP each)`;
  }
  
  if (mediaTitle) {
    output += `\n\nMedia: ${mediaTitle}`;
  }
  if (mediaCompleteMessage) {
    output += `\nMedia Completion: ${mediaCompleteMessage}`;
  }
  
  if (courseName) {
    output += `\n\nCourse: ${courseName}`;
  }
  
  if (projName) {
    output += `\n\nProject: ${projName}`;
  }
  
  if (sessionNote) {
    output += `\n\nNote: ${sessionNote}`;
  }
  
  return {
    success: true,
    output,
  };
}

// ─── HELPER: Process exercise log ────────────────────────
async function executeExerciseLog(exercise: any, duration: { minutes: number; remainingArgs: string[] }, flags: Record<string, string | string[]>): Promise<CommandResult> {
  const db = await getDB();

  // Parse sets from flags (-set1, -set2, etc.)
  const sets: any[] = [];
  const setKeys = Object.keys(flags).filter(k => k.startsWith('set'));
  
  for (const key of setKeys.sort()) {
    const value = Array.isArray(flags[key]) ? (flags[key] as string[])[0] : flags[key] as string;
    if (!value) continue;

    const isStrength = exercise.metric_type === 'weight_reps' || (exercise.quantity_type && exercise.quantity_type.includes('weight'));

    if (isStrength) {
      // Format: "200-10" (weight-reps)
      const parts = value.split('-');
      if (parts.length >= 2) {
        sets.push({ weight: parts[0], reps: parts[1] });
      }
    } else {
      // Format: "10" (reps or distance)
      sets.push({ value: value });
    }
  }

  if (sets.length === 0) {
    return {
      success: false,
      output: '',
      error: `Please provide at least one set using -set1 flag.\nExample: -set1 10 (reps) or -set1 200-10 (weight-reps)`,
    };
  }

  // Parse intensity (1-10, default 5)
  let intensity = 5;
  const intensityFlag = flags.intensity;
  if (intensityFlag) {
    const intVal = parseInt(Array.isArray(intensityFlag) ? intensityFlag[0] : intensityFlag);
    if (!isNaN(intVal) && intVal >= 1 && intVal <= 10) {
      intensity = intVal;
    }
  }

  // Parse stats
  let statKeys: string[] = [];
  let statSplit: { stat: string; percent: number }[] = [];

  const statsFlag = flags.stats;
  if (statsFlag) {
    const statsValue = Array.isArray(statsFlag) ? statsFlag[0] : statsFlag;
    const parsedSplit = parseSplitFlag(statsValue);
    if (parsedSplit) {
      statSplit = parsedSplit;
      statKeys = parsedSplit.map(s => s.stat);
    }
  } else {
    // Use exercise defaults
    statKeys = [exercise.primary_stat, exercise.secondary_stat].filter(Boolean);
    statSplit = [
      { stat: exercise.primary_stat, percent: exercise.primary_pct || 50 },
      { stat: exercise.secondary_stat, percent: exercise.secondary_pct || 50 }
    ].filter(s => s.stat);
  }

  // Process -t (tools) flags
  let toolIds: string[] = [];
  let toolNames: string[] = [];
  const toolFlag = flags.t;
  if (toolFlag) {
    const toolNamesArr = Array.isArray(toolFlag) ? toolFlag : [toolFlag];
    for (const toolName of toolNamesArr) {
      const toolResult = await db.query<any>(`SELECT id, name FROM tools WHERE LOWER(name) = LOWER('${toolName.replace(/'/g, "''")}')`);
      if (toolResult.rows.length > 0) {
        toolIds.push(toolResult.rows[0].id);
        toolNames.push(toolResult.rows[0].name);
      }
    }
    if (toolNamesArr.length > toolNames.length) {
      const missing = toolNamesArr.filter(tn => !toolNames.includes(tn));
      return {
        success: false,
        output: '',
        error: `Tool(s) not found: ${missing.join(', ')}`,
      };
    }
  }

  // Process -a (augments) flags
  let augmentIds: string[] = [];
  let augmentNames: string[] = [];
  const augmentFlag = flags.a || flags.aug;
  if (augmentFlag) {
    const augmentNamesArr = Array.isArray(augmentFlag) ? augmentFlag : [augmentFlag];
    for (const augName of augmentNamesArr) {
      const augResult = await db.query<any>(`SELECT id, name FROM augments WHERE LOWER(name) = LOWER('${augName.replace(/'/g, "''")}')`);
      if (augResult.rows.length > 0) {
        augmentIds.push(augResult.rows[0].id);
        augmentNames.push(augResult.rows[0].name);
      }
    }
    if (augmentNamesArr.length > augmentNames.length) {
      const missing = augmentNamesArr.filter(an => !augmentNames.includes(an));
      return {
        success: false,
        output: '',
        error: `Augment(s) not found: ${missing.join(', ')}`,
      };
    }
  }

  // Process -m (media) flag
  let mediaId = null;
  let mediaTitle = null;
  let mediaType = null;
  const mediaFlag = flags.m || flags.media;
  if (mediaFlag) {
    const mediaName = Array.isArray(mediaFlag) ? mediaFlag[0] : mediaFlag;
    const mediaResult = await db.query<any>(`SELECT id, title, type FROM media WHERE LOWER(title) = LOWER('${mediaName.replace(/'/g, "''")}')`);
    if (mediaResult.rows.length > 0) {
      mediaId = mediaResult.rows[0].id;
      mediaTitle = mediaResult.rows[0].title;
      mediaType = mediaResult.rows[0].type;
    } else {
      return { success: false, output: '', error: `Media not found: ${mediaName}` };
    }
  }

  // Process -c (course) flag
  let courseId = null;
  let courseName = null;
  const courseFlag = flags.c || flags.course;
  if (courseFlag) {
    const courseSearchName = Array.isArray(courseFlag) ? courseFlag[0] : courseFlag;
    const courseResult = await db.query<any>(`SELECT id, name FROM courses WHERE LOWER(name) = LOWER('${courseSearchName.replace(/'/g, "''")}')`);
    if (courseResult.rows.length > 0) {
      courseId = courseResult.rows[0].id;
      courseName = courseResult.rows[0].name;
    } else {
      return { success: false, output: '', error: `Course not found: ${courseSearchName}` };
    }
  }

  // Process -p (project) flag
  let projectId = null;
  let projName = null;
  const projectFlag = flags.p || flags.project;
  if (projectFlag) {
    const projectSearchName = Array.isArray(projectFlag) ? projectFlag[0] : projectFlag;
    const projectResult = await db.query<any>(`SELECT id, name FROM projects WHERE LOWER(name) = LOWER('${projectSearchName.replace(/'/g, "''")}')`);
    if (projectResult.rows.length > 0) {
      projectId = projectResult.rows[0].id;
      projName = projectResult.rows[0].name;
    } else {
      return { success: false, output: '', error: `Project not found: ${projectSearchName}` };
    }
  }

  // Process -n (note) flag
  const noteFlag = flags.n;
  let sessionNote = null;
  if (noteFlag) {
    sessionNote = Array.isArray(noteFlag) ? noteFlag[0] : noteFlag;
    sessionNote = sessionNote.replace(/'/g, "''");
  }

  // Calculate XP
  const baseXP = duration.minutes * 10 * (intensity / 5);
  const exerciseXP = Math.floor(baseXP * 0.5);
  const statXP = Math.floor(baseXP * 0.25);
  const masterXP = Math.floor(baseXP * 0.25);

  // Build details_json
  const isStrength = exercise.metric_type === 'weight_reps' || (exercise.quantity_type && exercise.quantity_type.includes('weight'));
  let totals: any = { setCount: sets.length };
  
  if (isStrength) {
    totals.totalWeight = sets.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
    totals.totalReps = sets.reduce((sum: number, s: any) => sum + (parseInt(s.reps) || 0), 0);
  } else {
    totals.total = sets.reduce((sum: number, s: any) => sum + (parseFloat(s.value) || 0), 0);
  }

  const detailsJson = {
    quantityType: exercise.quantity_type,
    metric: exercise.metric_type,
    entryIntensity: intensity,
    sets: sets,
    totals: totals
  };

  // Insert into output_logs
  const outputLogId = crypto.randomUUID();
  const now = new Date().toISOString();
  const toolIdsJson = JSON.stringify(toolIds);
  const augmentIdsJson = JSON.stringify(augmentIds);
  const statSplitJson = JSON.stringify(statSplit);

  await db.exec(`
    INSERT INTO output_logs (
      id, target_type, target_id, duration_minutes, intensity,
      stat_split, notes, tool_ids, total_tool_xp,
      augment_ids, total_augment_xp, course_id, media_id, project_id
    ) VALUES (
      '${outputLogId}',
      'exercise',
      '${exercise.id}',
      ${duration.minutes},
      ${intensity},
      '${statSplitJson}',
      ${sessionNote ? `'${sessionNote}'` : 'NULL'},
      '${toolIdsJson}',
      ${exerciseXP},
      '${augmentIdsJson}',
      ${masterXP},
      ${courseId ? `'${courseId}'` : 'NULL'},
      ${mediaId ? `'${mediaId}'` : 'NULL'},
      ${projectId ? `'${projectId}'` : 'NULL'}
    );
  `);

  // Insert into output_log_exercises
  const outputExId = crypto.randomUUID();
  await db.exec(`
    INSERT INTO output_log_exercises (
      id, output_log_id, exercise_id, xp_awarded, details_json
    ) VALUES (
      '${outputExId}',
      '${outputLogId}',
      '${exercise.id}',
      ${exerciseXP},
      '${JSON.stringify(detailsJson)}'
    );
  `);

  let mediaCompleteMessage: string | null = null;
  const shouldCompleteMedia = mediaId && Object.prototype.hasOwnProperty.call(flags, 'complete');
  if (shouldCompleteMedia) {
    const completedAt = new Date().toISOString();
    await db.query(
      `UPDATE media SET status = 'FINISHED', completed_at = $1, completed_count = COALESCE(completed_count, 0) + 1 WHERE id = $2`,
      [completedAt, mediaId]
    );

    const completionXP = Math.floor(MEDIA_COMPLETION_XP[String(mediaType || '')] ?? 40);
    const completionStat = statSplit[0]?.stat;
    if (completionStat && completionXP > 0) {
      await awardBonusXP({
        source: getMediaCompletionSource(String(mediaType || 'media')),
        sourceId: String(mediaId),
        statKey: completionStat as any,
        amount: completionXP,
        notes: mediaTitle || undefined,
      });
      mediaCompleteMessage = `${mediaTitle} completed (+${completionXP} XP)`;
    } else {
      mediaCompleteMessage = `${mediaTitle} completed`;
    }
    queryClient.invalidateQueries({ queryKey: ['media-item'] });
    queryClient.invalidateQueries({ queryKey: ['media'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-media-list'] });
  }

  // Update exercise XP
  const newExerciseXP = Number(exercise.xp || 0) + exerciseXP;
  const newLevel = getLevelFromXP(newExerciseXP);
  await db.exec(`UPDATE exercises SET xp = ${newExerciseXP}, level = ${newLevel.level} WHERE id = '${exercise.id}';`);

  // Update tool XP
  if (toolIds.length > 0 && exerciseXP > 0) {
    const perToolXP = exerciseXP;
    queryClient.setQueryData(['tools'], (prev: any[] | undefined) =>
      prev?.map((tool) => {
        if (!toolIds.includes(tool.id)) return tool;
        const nextXP = Number(tool.xp ?? 0) + perToolXP;
        const nextLevel = getLevelFromXP(nextXP);
        return {
          ...tool,
          xp: nextXP,
          level: nextLevel.level,
          xpInLevel: nextLevel.xpInLevel,
          xpForLevel: nextLevel.xpForLevel,
        };
      }) ?? prev
    );
  }

  // Update augment XP
  if (augmentIds.length > 0 && exerciseXP > 0) {
    const perAugXP = exerciseXP;
    queryClient.setQueryData(['augments'], (prev: any[] | undefined) =>
      prev?.map((augment) => {
        if (!augmentIds.includes(augment.id)) return augment;
        const nextXP = Number(augment.xp ?? 0) + perAugXP;
        const nextLevel = getLevelFromXP(nextXP);
        return {
          ...augment,
          xp: nextXP,
          level: nextLevel.level,
          xpInLevel: nextLevel.xpInLevel,
          xpForLevel: nextLevel.xpForLevel,
        };
      }) ?? prev
    );
  }

  await refreshAppData(queryClient);
  queryClient.invalidateQueries({ queryKey: ['output-widget-logs'] });

  // Trigger visual effects
  if (masterXP > 0) {
    setTimeout(() => triggerXPFloat(window.innerWidth / 2 + 60, window.innerHeight / 2 - 80, masterXP, undefined, false), 200);
  }
  if (exerciseXP > 0 && toolIds.length > 0) {
    setTimeout(() => triggerXPFloat(window.innerWidth / 2 - 60, window.innerHeight / 2 - 40, exerciseXP * toolIds.length, undefined, false), 400);
  }
  if (exerciseXP > 0 && augmentIds.length > 0) {
    setTimeout(() => triggerXPFloat(window.innerWidth / 2, window.innerHeight / 2, exerciseXP * augmentIds.length, undefined, false), 600);
  }

  // Build output message
  let output = `Exercise '${exercise.name}' logged.\n\nDuration: ${duration.minutes}m | Intensity: ${intensity}`;
  
  // Show sets
  output += `\n\nSets: ${sets.length}`;
  if (isStrength) {
    const setDetails = sets.map((s: any, i: number) => `${s.weight}×${s.reps}`).join(', ');
    output += ` (${setDetails})`;
    output += `\nTotal: ${totals.totalWeight}lbs, ${totals.totalReps} reps`;
  } else {
    const setDetails = sets.map((s: any, i: number) => s.value).join(', ');
    output += ` (${setDetails})`;
    output += `\nTotal: ${totals.total}`;
  }

  // XP
  output += `\n\nXP: ${exerciseXP + masterXP + statXP}`;
  output += `\n  Exercise: +${exerciseXP}`;
  if (statXP > 0 && statKeys.length > 0) {
    const statXPSummary = statSplit.map(s => `${s.stat}: +${Math.floor(statXP * s.percent / 100)}`).join(', ');
    output += `\n  Stat: ${statXPSummary}`;
  }
  output += `\n  Master: +${masterXP}`;

  if (toolNames.length > 0) {
    output += `\n\nTools: ${toolNames.join(', ')} (+${exerciseXP} XP each)`;
  }
  
  if (augmentNames.length > 0) {
    output += `\n\nAugments: ${augmentNames.join(', ')} (+${exerciseXP} XP each)`;
  }
  
  if (mediaTitle) {
    output += `\n\nMedia: ${mediaTitle}`;
  }
  if (mediaCompleteMessage) {
    output += `\nMedia Completion: ${mediaCompleteMessage}`;
  }
  
  if (courseName) {
    output += `\n\nCourse: ${courseName}`;
  }
  
  if (projName) {
    output += `\n\nProject: ${projName}`;
  }
  
  if (sessionNote) {
    output += `\n\nNote: ${sessionNote}`;
  }
  
  return {
    success: true,
    output,
  };
}

const WIDGET_ALIASES: Record<string, string> = {
  'xp': 'xp', 'xpwidget': 'xp',
  'checkin': 'checkin', 'daily': 'checkin',
  'habits': 'habits', 'habit': 'habits',
  'planner': 'planner',
  'recovery': 'recovery', 'sleep': 'recovery',
  'ingredients': 'ingredients', 'ing': 'ingredients',
  'intake': 'intake', 'macro': 'intake',
  'exercise': 'exercise', 'exercises': 'exercise',
  'workout': 'workouts', 'workouts': 'workouts',
  'output': 'output',
  'recipes': 'recipes', 'recipe': 'recipes',
  'heatmap': 'heatmap', 'heat': 'heatmap',
  'stats': 'stats', 'stat': 'stats',
  'courses': 'courses', 'course': 'courses',
  'media': 'media', 'books': 'media',
  'skills': 'skills', 'skill': 'skills',
  'tools': 'tools', 'tool': 'tools',
  'resources': 'resources', 'res': 'resources',
  'augments': 'augments', 'augment': 'augments', 'aug': 'augments',
  'projects': 'projects', 'project': 'projects', 'proj': 'projects',
  'vault': 'vault',
  'notes': 'notes', 'note': 'notes',
  'clock': 'clock', 'time': 'clock',
  'calculator': 'calculator', 'calc': 'calculator',
  'converter': 'unitConverter', 'unit': 'unitConverter',
  'terminal': 'terminal', 'term': 'terminal',
};

const ALL_WIDGET_IDS = ['xp', 'checkin', 'habits', 'planner', 'recovery', 'ingredients', 'intake', 'exercise', 'workouts', 'output', 'recipes', 'heatmap', 'stats', 'courses', 'media', 'skills', 'tools', 'resources', 'augments', 'projects', 'vault', 'notes', 'clock', 'calculator', 'unitConverter', 'terminal'];

function resolveWidgetId(name: string): string | null {
  const normalized = name.toLowerCase().replace(/_/g, '');
  const resolved = WIDGET_ALIASES[normalized];
  if (resolved && ALL_WIDGET_IDS.includes(resolved)) {
    return resolved;
  }
  return null;
}

function executeOpen(args: string[], widgetHandler?: any): CommandResult {
  if (args.length < 1) {
    return {
      success: false,
      output: '',
      error: 'Usage: open [widget_name]\nExample: open xp, open skills, open terminal',
    };
  }

  const widgetName = args.join(' ').toLowerCase();
  const widgetId = resolveWidgetId(widgetName);

  if (!widgetId) {
    const suggestions = ALL_WIDGET_IDS.filter(w => w.includes(widgetName) || WIDGET_ALIASES[widgetName]?.includes(widgetName));
    if (suggestions.length > 0) {
      return {
        success: false,
        output: '',
        error: `Widget not found: ${widgetName}. Did you mean: ${suggestions.join(', ')}?`,
      };
    }
    return {
      success: false,
      output: '',
      error: `Unknown widget: ${widgetName}. Type 'open' and press Tab for autocomplete.`,
    };
  }

  if (widgetHandler) {
    widgetHandler('open', widgetId);
    return {
      success: true,
      output: `Widget opened: ${widgetId}`,
    };
  }

  return {
    success: false,
    output: '',
    error: 'Widget handler not available',
  };
}

function executeClose(args: string[], widgetHandler?: any): CommandResult {
  if (args.length < 1) {
    return {
      success: false,
      output: '',
      error: 'Usage: close [widget_name]\nExample: close xp, close skills, close terminal',
    };
  }

  const widgetName = args.join(' ').toLowerCase();
  const widgetId = resolveWidgetId(widgetName);

  if (!widgetId) {
    const suggestions = ALL_WIDGET_IDS.filter(w => w.includes(widgetName) || WIDGET_ALIASES[widgetName]?.includes(widgetName));
    if (suggestions.length > 0) {
      return {
        success: false,
        output: '',
        error: `Widget not found: ${widgetName}. Did you mean: ${suggestions.join(', ')}?`,
      };
    }
    return {
      success: false,
      output: '',
      error: `Unknown widget: ${widgetName}`,
    };
  }

  if (widgetHandler) {
    widgetHandler('close', widgetId);
    return {
      success: true,
      output: `Widget closed: ${widgetId}`,
    };
  }

  return {
    success: false,
    output: '',
    error: 'Widget handler not available',
  };
}

function parseSplitFlag(splitValue: string): { stat: string; percent: number }[] | null {
  const validStats = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];
  const parts = splitValue.split('/');
  const result: { stat: string; percent: number }[] = [];
  
  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) {
      const stat = part.trim().toLowerCase();
      if (validStats.includes(stat)) {
        result.push({ stat, percent: 100 });
      } else {
        return null;
      }
    } else {
      const stat = part.slice(0, colonIndex).trim().toLowerCase();
      const percent = parseInt(part.slice(colonIndex + 1).trim(), 10);
      
      if (!validStats.includes(stat) || isNaN(percent) || percent < 0 || percent > 100) {
        return null;
      }
      result.push({ stat, percent });
    }
  }
  
  if (result.length === 0) return null;
  
  // If only one stat without percent, default to 100%
  if (result.length === 1 && result[0].percent === 100 && !splitValue.includes(':')) {
    result[0].percent = 100;
  }
  
  // Normalize percentages to ensure they add up to 100
  const totalPercent = result.reduce((sum, r) => sum + r.percent, 0);
  if (totalPercent !== 100 && result.length > 1) {
    // Scale proportions to 100
    result.forEach(r => {
      r.percent = Math.round((r.percent / totalPercent) * 100);
    });
  }
  
  return result;
}

function buildStatSplitFromKeys(statKeys: string[], defaultSplit: number[]): { stat: string; percent: number }[] {
  const validStats = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];
  const uniqueStats = [...new Set(statKeys.filter(s => validStats.includes(s)))];
  
  if (uniqueStats.length === 0) {
    return [{ stat: 'mind', percent: 100 }];
  }
  if (uniqueStats.length === 1) {
    return [{ stat: uniqueStats[0], percent: 100 }];
  }

  const [primary, secondary] = uniqueStats;
  const primaryPercent = defaultSplit[0] ?? 50;
  
  return [
    { stat: primary, percent: primaryPercent },
    { stat: secondary, percent: 100 - primaryPercent },
  ];
}

async function executeAdd(args: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      output: '',
      error: "Usage: add event [event_name] -date mm/dd/yy [-time hh:mm AM/PM]\n       add skill [name] -stats [stat1:%/stat2:%] [-n note]\n       add augment [name] -type [type] [-url http://...] [-d description] [-n note]\n       add tool [name] -type [type] [-url http://...] [-d description] [-n note]\nExample: add event Team Sync -date 05/20/26 -time 09:30 AM\nExample: add skill sword fighting -stats body:50/flow:50 -n this is a note\nExample: add skill reading -stats mind\nExample: add augment mma -type Core Intelligence -url https://... -d fighting technique\nExample: add tool vscode -type software -url https://code.visualstudio.com -d editor"
    };
  }

  const type = args[0]?.toLowerCase();
  if (type === 'skill') {
    return executeAddSkill(args.slice(1), flags);
  }

  if (type === 'augment') {
    return executeAddAugment(args.slice(1), flags);
  }

  if (type === 'tool') {
    return executeAddTool(args.slice(1), flags);
  }

  if (type === 'resource') {
    return executeAddResource(args.slice(1), flags);
  }

  if (type === 'note') {
    return executeAddNote(args.slice(1), flags);
  }

  if (type === 'course') {
    return executeAddCourse(args.slice(1), flags);
  }

  if (type === 'event') {
    return executeAddEvent(args.slice(1), flags);
  }

  return { success: false, output: '', error: `Unknown type: ${type}. Supported types: event, skill, augment, tool, resource, note, course` };
}

function parseEventDateToIso(input: string): string | null {
  const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const yearRaw = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = m[3].length === 2 ? 2000 + yearRaw : yearRaw;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function parseOptionalEventTimeTo24h(parts: string[]): { time: string | null; nameParts: string[] } {
  if (parts.length < 2) return { time: null, nameParts: parts };
  const meridiem = parts[parts.length - 1]?.toUpperCase();
  const timeToken = parts[parts.length - 2];
  if (!meridiem || !timeToken) return { time: null, nameParts: parts };
  if (meridiem !== 'AM' && meridiem !== 'PM') return { time: null, nameParts: parts };
  const t = timeToken.match(/^(\d{1,2}):(\d{2})$/);
  if (!t) return { time: null, nameParts: parts };
  let hh = Number(t[1]);
  const mm = Number(t[2]);
  if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return { time: null, nameParts: parts };
  if (meridiem === 'AM') {
    if (hh === 12) hh = 0;
  } else if (hh !== 12) {
    hh += 12;
  }
  const hh24 = String(hh).padStart(2, '0');
  const mm2 = String(mm).padStart(2, '0');
  return { time: `${hh24}:${mm2}`, nameParts: parts.slice(0, -2) };
}

function parseTime12hTo24h(raw: string): string | null {
  const parts = raw.trim().split(/\s+/);
  const parsed = parseOptionalEventTimeTo24h(parts);
  if (parsed.nameParts.length > 0) return null;
  return parsed.time;
}

async function executeAddEvent(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const title = nameArgs.join(' ').trim();
    if (!title) {
      return { success: false, output: '', error: "Usage: add event [event_name] -date mm/dd/yy [-time hh:mm AM/PM]\nExample: add event Team Sync -date 05/20/26" };
    }

    const dateFlag = flags.date;
    const dateRaw = Array.isArray(dateFlag) ? dateFlag[0] : dateFlag;
    if (!dateRaw) {
      return { success: false, output: '', error: "Please provide a date using -date.\nExample: add event Team Sync -date 05/20/26" };
    }
    const rawDate = dateRaw.trim().split(/\s+/)[0];
    const dateIso = parseEventDateToIso(rawDate);
    if (!dateIso) {
      return { success: false, output: '', error: "Invalid date. Use mm/dd/yy (or mm/dd/yyyy).\nExample: add event Team Sync -date 05/20/26" };
    }

    let timeValue: string | null = null;
    const timeFlag = flags.time;
    if (timeFlag) {
      const timeRaw = (Array.isArray(timeFlag) ? timeFlag[0] : timeFlag) ?? '';
      const parsedTime = parseTime12hTo24h(timeRaw);
      if (!parsedTime) {
        return { success: false, output: '', error: "Invalid time. Use hh:mm AM/PM.\nExample: -time 09:30 AM" };
      }
      timeValue = parsedTime;
    }

    const db = await getDB();
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO planner_entries (id, title, date, time, completed, recurrence_type, recurrence_interval, recurrence_days_of_week, recurrence_end_type, recurrence_end_date, recurrence_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, false, 'NONE', 1, NULL, NULL, NULL, NULL, NOW(), NOW())`,
      [id, title, dateIso, timeValue]
    );

    queryClient.invalidateQueries({ queryKey: ['planner-entries'] });
    queryClient.invalidateQueries({ queryKey: ['planner-exceptions'] });
    queryClient.invalidateQueries({ queryKey: ['planner'] });

    return {
      success: true,
      output: `Event added: ${title}\nDate: ${dateIso}${timeValue ? `\nTime: ${timeValue}` : ''}\nRecurrence: NONE`,
    };
  } catch (err: any) {
    console.error('[ADD EVENT] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to add event' };
  }
}

async function executeAddSkill(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ');
    if (!name) {
      return { success: false, output: '', error: "Please provide a skill name." };
    }

    const statsFlag = (flags['stats'] as string) || '';
    const notesFlag = (flags['n'] as string) || '';

    if (!statsFlag) {
      return { success: false, output: '', error: "Please provide stats using -stats flag.\nExample: -stats body:50/flow:50 or -stats mind" };
    }

    // Parse stats
    const statParts = statsFlag.split('/').map(s => s.trim());
    const statKeys: string[] = [];
    const split: number[] = [];

    for (const part of statParts) {
      const match = part.match(/^(\w+):(\d+)$/);
      if (match) {
        statKeys.push(match[1].toLowerCase());
        split.push(parseInt(match[2]));
      } else {
        // Single stat without percentage
        statKeys.push(part.toLowerCase());
        split.push(100);
      }
    }

    // Validate stat keys
    const VALID_STATS = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];
    for (const k of statKeys) {
      if (!VALID_STATS.includes(k)) {
        return { success: false, output: '', error: `Invalid stat: ${k}. Valid stats: ${VALID_STATS.join(', ')}` };
      }
    }

    if (statKeys.length === 0 || statKeys.length > 2) {
      return { success: false, output: '', error: "Please provide 1 or 2 stats.\nExample: -stats body:50/flow:50 or -stats mind" };
    }

    // Normalize split if single stat or doesn't sum to 100
    if (statKeys.length === 1) {
      split[0] = 100;
    } else if (split.reduce((a, b) => a + b, 0) !== 100) {
      // Auto-normalize
      const total = split.reduce((a, b) => a + b, 0);
      for (let i = 0; i < split.length; i++) {
        split[i] = Math.round((split[i] / total) * 100);
      }
      // Fix rounding
      const diff = 100 - split.reduce((a, b) => a + b, 0);
      split[0] += diff;
    }

    const db = await getDB();

    // Check duplicate
    const existing = await db.query(
      `SELECT id FROM skills WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (existing.rows.length > 0) {
      return { success: false, output: '', error: `Skill '${name}' already exists.` };
    }

    // Insert skill
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO skills (id, name, stat_keys, default_split, notes, is_custom, active, xp, level, icon, created_at)
       VALUES ($1, $2, $3, $4, $5, true, true, 0, 1, 'o', NOW())`,
      [id, name, JSON.stringify(statKeys), JSON.stringify(split), notesFlag || null]
    );

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['skills'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-skills-list'] });

    const statsDisplay = statKeys.map((k, i) => `${k.toUpperCase()}:${split[i]}%`).join('/');
    return { success: true, output: `Skill '${name}' added.\nStats: ${statsDisplay}${notesFlag ? '\nNotes: ' + notesFlag : ''}` };
  } catch (err: any) {
    console.error('[ADD SKILL] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to add skill' };
  }
}

async function executeAddAugment(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide an augment name." };
    }

    const typeFlag = (flags['type'] as string) || '';
    const urlFlag = (flags['url'] as string) || '';
    const descFlag = (flags['d'] as string) || '';
    const notesFlag = (flags['n'] as string) || '';

    if (!typeFlag) {
      return { success: false, output: '', error: "Please provide a type using -type flag.\nExample: -type Core Intelligence" };
    }

    const db = await getDB();

    // Check duplicate
    const existing = await db.query(
      `SELECT id FROM augments WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (existing.rows.length > 0) {
      return { success: false, output: '', error: `Augment '${name}' already exists.` };
    }

    // Insert augment
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO augments (id, name, category, url, description, notes, xp, level, active, is_custom, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, true, true, $7)`,
      [id, name, typeFlag, urlFlag || null, descFlag || null, notesFlag || null, now]
    );

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['augments'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-augments-list'] });

    return {
      success: true,
      output: `Augment '${name}' added.\nType: ${typeFlag}${urlFlag ? '\nURL: ' + urlFlag : ''}${descFlag ? '\nDescription: ' + descFlag : ''}${notesFlag ? '\nNotes: ' + notesFlag : ''}`
    };
  } catch (err: any) {
    console.error('[ADD AUGMENT] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to add augment' };
  }
}

async function executeAddTool(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a tool name." };
    }

    const typeFlag = (flags['type'] as string) || '';
    const urlFlag = (flags['url'] as string) || '';
    const descFlag = (flags['d'] as string) || '';
    const notesFlag = (flags['n'] as string) || '';

    if (!typeFlag) {
      return { success: false, output: '', error: "Please provide a type using -type flag.\nExample: -type software" };
    }

    const db = await getDB();

    // Check duplicate
    const existing = await db.query(
      `SELECT id FROM tools WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (existing.rows.length > 0) {
      return { success: false, output: '', error: `Tool '${name}' already exists.` };
    }

    // Insert tool
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO tools (id, name, type, url, description, notes, is_custom, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, true, $7)`,
      [id, name, typeFlag, urlFlag || null, descFlag || null, notesFlag || null, now]
    );

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['tools'] });
    queryClient.invalidateQueries({ queryKey: ['tools-for-lifepath'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-tools-list'] });

    return {
      success: true,
      output: `Tool '${name}' added.\nType: ${typeFlag}${urlFlag ? '\nURL: ' + urlFlag : ''}${descFlag ? '\nDescription: ' + descFlag : ''}${notesFlag ? '\nNotes: ' + notesFlag : ''}`
    };
  } catch (err: any) {
    console.error('[ADD TOOL] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to add tool' };
  }
}

async function executeAddResource(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a resource name." };
    }

    const typeFlag = (flags['type'] as string) || '';
    const urlFlag = (flags['url'] as string) || '';
    const descFlag = (flags['d'] as string) || '';
    const notesFlag = (flags['n'] as string) || '';

    if (!typeFlag) {
      return { success: false, output: '', error: "Please provide a type using -type flag.\nExample: -type Learning" };
    }

    const db = await getDB();

    // Check duplicate
    const existing = await db.query(
      `SELECT id FROM resources WHERE LOWER(title) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (existing.rows.length > 0) {
      return { success: false, output: '', error: `Resource '${name}' already exists.` };
    }

    // Insert resource
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO resources (id, title, category, url, description, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'UNREAD', $7)`,
      [id, name, typeFlag, urlFlag || null, descFlag || null, notesFlag || null, now]
    );

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-resources-list'] });

    return {
      success: true,
      output: `Resource '${name}' added.\nType: ${typeFlag}${urlFlag ? '\nURL: ' + urlFlag : ''}${descFlag ? '\nDescription: ' + descFlag : ''}${notesFlag ? '\nNotes: ' + notesFlag : ''}`
    };
  } catch (err: any) {
    console.error('[ADD RESOURCE] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to add resource' };
  }
}

async function executeAddNote(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a note name." };
    }

    const contentFlag = (flags['content'] as string) || '';
    if (!contentFlag) {
      return { success: false, output: '', error: "Please provide content using -content flag.\nExample: -content your note content here" };
    }

    const db = await getDB();

    // Check duplicate
    const existing = await db.query(
      `SELECT id FROM notes WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (existing.rows.length > 0) {
      return { success: false, output: '', error: `Note '${name}' already exists.` };
    }

    // Insert note
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO notes (id, name, content, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'ACTIVE', $4, $4)`,
      [id, name, contentFlag, now]
    );

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-notes-list'] });

    return {
      success: true,
      output: `Note '${name}' added.\nContent: ${contentFlag}`
    };
  } catch (err: any) {
    console.error('[ADD NOTE] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to add note' };
  }
}

async function executeAddCourse(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a course name." };
    }

    const statsFlag = (flags['stats'] as string) || '';
    if (!statsFlag) {
      return { success: false, output: '', error: "Please provide stats using -stats flag.\nExample: -stats body:50/flow:50 or -stats mind" };
    }

    const statParts = statsFlag.split('/').map(s => s.trim());
    const statKeys: string[] = [];
    const split: number[] = [];

    for (const part of statParts) {
      const match = part.match(/^(\w+):(\d+)$/);
      if (match) {
        statKeys.push(match[1].toLowerCase());
        split.push(parseInt(match[2]));
      } else {
        statKeys.push(part.toLowerCase());
        split.push(100);
      }
    }

    const VALID_STATS = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];
    for (const k of statKeys) {
      if (!VALID_STATS.includes(k)) {
        return { success: false, output: '', error: `Invalid stat: ${k}. Valid stats: ${VALID_STATS.join(', ')}` };
      }
    }

    if (statKeys.length === 0 || statKeys.length > 2) {
      return { success: false, output: '', error: "Please provide 1 or 2 stats.\nExample: -stats body:50/flow:50 or -stats mind" };
    }

    if (statKeys.length === 1) {
      split[0] = 100;
    } else if (split.reduce((a, b) => a + b, 0) !== 100) {
      const total = split.reduce((a, b) => a + b, 0);
      for (let i = 0; i < split.length; i++) {
        split[i] = Math.round((split[i] / total) * 100);
      }
      const diff = 100 - split.reduce((a, b) => a + b, 0);
      split[0] += diff;
    }

    const db = await getDB();

    const existing = await db.query(
      `SELECT id FROM courses WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (existing.rows.length > 0) {
      return { success: false, output: '', error: `Course '${name}' already exists.` };
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO courses (id, name, linked_stats, default_split, status, created_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
      [id, name, JSON.stringify(statKeys), JSON.stringify(split), now]
    );

    queryClient.invalidateQueries({ queryKey: ['courses'] });
    queryClient.invalidateQueries({ queryKey: ['courses-all'] });
    queryClient.invalidateQueries({ queryKey: ['terminal-courses-list'] });

    const statsDisplay = statKeys.map((k, i) => `${k.toUpperCase()}:${split[i]}%`).join('/');
    return { success: true, output: `Course '${name}' added.\nStats: ${statsDisplay}` };
  } catch (err: any) {
    console.error('[ADD COURSE] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to add course' };
  }
}

async function executeDelete(args: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  if (args.length === 0) {
    return { success: false, output: '', error: "Usage: delete [event_name] [-date mm/dd/yy] | delete skill [name] | delete augment [name] | delete tool [name] | delete resource [name]\nExample: delete Team Sync -date 12/03/26\nExample: delete skill reading" };
  }

  const type = args[0]?.toLowerCase();

  if (type === 'skill') {
    return executeDeleteSkill(args.slice(1));
  }

  if (type === 'augment') {
    return executeDeleteAugment(args.slice(1));
  }

  if (type === 'tool') {
    return executeDeleteTool(args.slice(1));
  }

  if (type === 'resource') {
    return executeDeleteResource(args.slice(1));
  }

  if (type === 'note') {
    return executeDeleteNote(args.slice(1));
  }

  if (type === 'course') {
    return executeDeleteCourse(args.slice(1));
  }

  if (type === 'event') {
    return executeDeleteEvent(args.slice(1), flags);
  }

  return executeDeleteEvent(args, flags);
}

async function executeDeleteEvent(nameArgs: string[], flags: Record<string, string | string[]>): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide an event name.\nExample: delete Team Sync" };
    }
    const db = await getDB();

    const dateFlag = flags.date;
    const dateRaw = Array.isArray(dateFlag) ? dateFlag[0] : dateFlag;
    const dateIso = dateRaw ? parseEventDateToIso(dateRaw.trim()) : null;
    if (dateRaw && !dateIso) {
      return { success: false, output: '', error: "Invalid -date. Use mm/dd/yy.\nExample: delete English Class -date 12/03/26" };
    }

    const res = await db.query<{ id: string; title: string; date: string; time: string | null }>(
      `SELECT id, title, date, time
       FROM planner_entries
       WHERE LOWER(title) = LOWER($1) ${dateIso ? `AND date = '${dateIso}'` : ''}
       ORDER BY date ASC, time ASC NULLS LAST, created_at ASC
      `,
      [name]
    );

    if (res.rows.length === 0) {
      return { success: false, output: '', error: dateIso ? `No event '${name}' found on ${dateIso}.` : `Event '${name}' not found.` };
    }

    if (!dateIso && res.rows.length > 1) {
      const options = res.rows.slice(0, 5).map((r) => `${r.date}${r.time ? ` ${r.time}` : ''}`).join(', ');
      return {
        success: false,
        output: '',
        error: `Multiple events found for '${name}'. Use -date to target one.\nExample: delete ${name} -date mm/dd/yy\nMatches: ${options}`,
      };
    }

    pendingDelete = { type: 'event', name: res.rows[0].title, id: res.rows[0].id };
    return { success: true, output: `Delete event '${res.rows[0].title}'? Type: y (yes) or n (no)` };
  } catch (err: any) {
    console.error('[DELETE EVENT] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to delete event' };
  }
}

async function executeDeleteSkill(nameArgs: string[]): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a skill name." };
    }

    const db = await getDB();

    // Check if there's a pending confirmation
    if (pendingDelete && pendingDelete.name.toLowerCase() === name.toLowerCase()) {
      // User confirmed - perform the delete
      await db.query(`DELETE FROM skills WHERE id = $1`, [pendingDelete.id]);

      pendingDelete = null;

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-skills-list'] });

      return { success: true, output: `Skill '${name}' deleted.` };
    }

    // Look up the skill
    const res = await db.query(
      `SELECT id, name FROM skills WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );

    if (res.rows.length === 0) {
      return { success: false, output: '', error: `Skill '${name}' not found.` };
    }

    // Set pending delete and ask for confirmation
    pendingDelete = { type: 'skill', name: res.rows[0].name, id: res.rows[0].id };

    return { success: true, output: `Delete skill '${res.rows[0].name}'? Type: y (yes) or n (no)` };
  } catch (err: any) {
    console.error('[DELETE SKILL] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to delete skill' };
  }
}

async function executeDeleteAugment(nameArgs: string[]): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide an augment name." };
    }

    const db = await getDB();

    // Check if there's a pending confirmation
    if (pendingDelete && pendingDelete.name.toLowerCase() === name.toLowerCase() && pendingDelete.type === 'augment') {
      // User confirmed - perform the delete
      await db.query(`DELETE FROM augments WHERE id = $1`, [pendingDelete.id]);

      pendingDelete = null;

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['augments'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-augments-list'] });

      return { success: true, output: `Augment '${name}' deleted.` };
    }

    // Look up the augment
    const res = await db.query(
      `SELECT id, name FROM augments WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );

    if (res.rows.length === 0) {
      return { success: false, output: '', error: `Augment '${name}' not found.` };
    }

    // Set pending delete and ask for confirmation
    pendingDelete = { type: 'augment', name: res.rows[0].name, id: res.rows[0].id };

    return { success: true, output: `Delete augment '${res.rows[0].name}'? Type: y (yes) or n (no)` };
  } catch (err: any) {
    console.error('[DELETE AUGMENT] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to delete augment' };
  }
}

async function executeDeleteTool(nameArgs: string[]): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a tool name." };
    }

    const db = await getDB();

    // Check if there's a pending confirmation
    if (pendingDelete && pendingDelete.name.toLowerCase() === name.toLowerCase() && pendingDelete.type === 'tool') {
      // User confirmed - perform the delete
      await db.query(`DELETE FROM tools WHERE id = $1`, [pendingDelete.id]);

      pendingDelete = null;

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['tools-for-lifepath'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-tools-list'] });

      return { success: true, output: `Tool '${name}' deleted.` };
    }

    // Look up the tool
    const res = await db.query(
      `SELECT id, name FROM tools WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );

    if (res.rows.length === 0) {
      return { success: false, output: '', error: `Tool '${name}' not found.` };
    }

    // Set pending delete and ask for confirmation
    pendingDelete = { type: 'tool', name: res.rows[0].name, id: res.rows[0].id };

    return { success: true, output: `Delete tool '${res.rows[0].name}'? Type: y (yes) or n (no)` };
  } catch (err: any) {
    console.error('[DELETE TOOL] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to delete tool' };
  }
}

async function executeDeleteResource(nameArgs: string[]): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a resource name." };
    }

    const db = await getDB();

    // Check if there's a pending confirmation
    if (pendingDelete && pendingDelete.name.toLowerCase() === name.toLowerCase() && pendingDelete.type === 'resource') {
      // User confirmed - perform the delete
      await db.query(`DELETE FROM resources WHERE id = $1`, [pendingDelete.id]);

      pendingDelete = null;

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-resources-list'] });

      return { success: true, output: `Resource '${name}' deleted.` };
    }

    // Look up the resource (using title field)
    const res = await db.query(
      `SELECT id, title FROM resources WHERE LOWER(title) = LOWER($1) LIMIT 1`,
      [name]
    );

    if (res.rows.length === 0) {
      return { success: false, output: '', error: `Resource '${name}' not found.` };
    }

    // Set pending delete and ask for confirmation
    pendingDelete = { type: 'resource', name: res.rows[0].title, id: res.rows[0].id };

    return { success: true, output: `Delete resource '${res.rows[0].title}'? Type: y (yes) or n (no)` };
  } catch (err: any) {
    console.error('[DELETE RESOURCE] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to delete resource' };
  }
}

async function executeDeleteNote(nameArgs: string[]): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a note name." };
    }

    const db = await getDB();

    // Check if there's a pending confirmation
    if (pendingDelete && pendingDelete.name.toLowerCase() === name.toLowerCase() && pendingDelete.type === 'note') {
      // User confirmed - perform the delete (set status to 'DELETED')
      await db.query(`UPDATE notes SET status = 'DELETED' WHERE id = $1`, [pendingDelete.id]);

      pendingDelete = null;

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-notes-list'] });

      return { success: true, output: `Note '${name}' deleted.` };
    }

    // Look up the note (using name field)
    const res = await db.query(
      `SELECT id, name FROM notes WHERE LOWER(name) = LOWER($1) AND status != 'DELETED' LIMIT 1`,
      [name]
    );

    if (res.rows.length === 0) {
      return { success: false, output: '', error: `Note '${name}' not found.` };
    }

    // Set pending delete and ask for confirmation
    pendingDelete = { type: 'note', name: res.rows[0].name, id: res.rows[0].id };

    return { success: true, output: `Delete note '${res.rows[0].name}'? Type: y (yes) or n (no)` };
  } catch (err: any) {
    console.error('[DELETE NOTE] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to delete note' };
  }
}

async function executeDeleteCourse(nameArgs: string[]): Promise<CommandResult> {
  try {
    const name = nameArgs.join(' ').trim();
    if (!name) {
      return { success: false, output: '', error: "Please provide a course name." };
    }

    const db = await getDB();

    if (pendingDelete && pendingDelete.name.toLowerCase() === name.toLowerCase() && pendingDelete.type === 'course') {
      await db.query(`DELETE FROM courses WHERE id = $1`, [pendingDelete.id]);

      pendingDelete = null;

      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses-all'] });
      queryClient.invalidateQueries({ queryKey: ['terminal-courses-list'] });

      return { success: true, output: `Course '${name}' deleted.` };
    }

    const res = await db.query(
      `SELECT id, name FROM courses WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name]
    );

    if (res.rows.length === 0) {
      return { success: false, output: '', error: `Course '${name}' not found.` };
    }

    pendingDelete = { type: 'course', name: res.rows[0].name, id: res.rows[0].id };

    return { success: true, output: `Delete course '${res.rows[0].name}'? Type: y (yes) or n (no)` };
  } catch (err: any) {
    console.error('[DELETE COURSE] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to delete course' };
  }
}

async function executeHabit(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return { success: false, output: '', error: "Usage: HABIT [habit_name] [#quantity]\nExample: HABIT reading\nExample: HABIT pushups #50" };
  }

  try {
    // Find quantity if present (starts with #)
    let quantity = 1;
    const nameParts: string[] = [];
    
    for (const arg of args) {
      if (arg.startsWith('#')) {
        const num = parseInt(arg.slice(1));
        if (!isNaN(num)) quantity = num;
      } else {
        nameParts.push(arg);
      }
    }

    const habitName = nameParts.join(' ');
    if (!habitName) {
      return { success: false, output: '', error: "Please provide a habit name." };
    }

    const db = await getDB();
    
    // 1. Resolve habit
    const habitRes = await db.query<any>(
      `SELECT * FROM habits WHERE LOWER(name) = $1 AND status = 'ACTIVE' LIMIT 1`,
      [habitName.toLowerCase()]
    );

    if (habitRes.rows.length === 0) {
      return { success: false, output: '', error: `Habit '${habitName}' not found or is not active.` };
    }

    const habit = habitRes.rows[0];
    const today = todayStr();

    // 2. Get today's existing logs to calculate cumulative value
    const logsRes = await db.query<{ id: string; value: number; completed: boolean }>(
      `SELECT id, value, completed FROM habit_logs WHERE habit_id = $1 AND logged_for_date = $2`,
      [habit.id, today]
    );

    const currentValue = logsRes.rows.reduce((sum, log) => sum + (log.value || 0), 0);
    const alreadyCompleted = logsRes.rows.some(log => log.completed);
    const cumulativeValue = currentValue + quantity;

    // 3. Determine if newly completed
    let isCompleted = false;
    if (habit.target_type === 'BINARY') {
      isCompleted = true;
    } else if (habit.target_type === 'QUANTITATIVE' && habit.target_value) {
      isCompleted = cumulativeValue >= habit.target_value;
    }

    // 4. Insert the log
    await db.query(
      `INSERT INTO habit_logs (habit_id, logged_for_date, logged_date, completed, value, xp_awarded)
       VALUES ($1, $2, NOW(), $3, $4, 0)`,
      [habit.id, today, isCompleted, quantity]
    );

    let output = '';
    if (habit.target_type === 'QUANTITATIVE') {
      output = `${habit.name}: ${cumulativeValue}/${habit.target_value} recorded.`;
    } else {
      output = `${habit.name}: Logged.`;
    }

    // 5. If newly completed, update streak and award XP
    if (isCompleted && !alreadyCompleted) {
      const newStreak = (habit.current_streak || 0) + 1;
      const { statXp, masterXp, bonuses } = calcCheckInXP(habit, newStreak);
      const totalBonusXp = bonuses.reduce((s, b) => s + b.amount, 0);
      const totalXp = statXp + masterXp + totalBonusXp;

      // Shield earn logic
      const newShields = newStreak % 7 === 0
        ? Math.min((habit.shields || 0) + 1, MAX_SHIELDS)
        : (habit.shields || 0);

      // Update habit record
      await db.query(
        `UPDATE habits SET current_streak = $1, longest_streak = GREATEST(longest_streak, $1), shields = $2 WHERE id = $3`,
        [newStreak, newShields, habit.id]
      );

      // Award XP
      await db.exec(`
        UPDATE stats SET xp = xp + ${statXp} WHERE stat_key = '${habit.stat_key}';
        UPDATE master_progress SET total_xp = total_xp + ${masterXp} WHERE id = 1;
      `);

      // Award bonuses
      for (const bonus of bonuses) {
        const half = Math.floor(bonus.amount / 2);
        await db.exec(`
          UPDATE stats SET xp = xp + ${half} WHERE stat_key = '${habit.stat_key}';
          UPDATE master_progress SET total_xp = total_xp + ${bonus.amount - half} WHERE id = 1;
        `);
      }

      // Add to XP log
      await db.query(
        `INSERT INTO xp_log (source, source_id, tier, entity_id, amount, notes)
         VALUES ('habit', $1, 'stat', $2, $3, 'Habit completion via Terminal')`,
        [habit.id, habit.stat_key, totalXp]
      );

      // Trigger animations/floats if in context
      triggerXPFloat(totalXp, habit.stat_key);

      output += `\nHABIT COMPLETED! 🔥 Streak: ${newStreak} | +${totalXp} XP`;
      if (bonuses.length > 0) {
        output += `\nBonuses: ${bonuses.map(b => b.label).join(', ')}`;
      }
    }

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ['habits'] });
    queryClient.invalidateQueries({ queryKey: ['habit-logs-today-map'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['operator'] });

    return { success: true, output };
  } catch (err: any) {
    console.error('[HABIT] Error:', err);
    return { success: false, output: '', error: err.message || 'Failed to check-in habit' };
  }
}
