// src/services/terminal/commandExecutor.ts
import { parseCommand, parseDuration } from './commandParser';
import { AVAILABLE_COMMANDS, type CommandResult } from './types';
import { getXPDisplayValues, awardSessionXP, getLevelFromXP } from '@/services/xpService';
import { getDB } from '@/lib/db';
import { refreshAppData } from '@/lib/refreshAppData';
import { queryClient } from '@/main';
import { triggerLevelUp, triggerXPFloat } from '@/components/effects/XPFloatLayer';
import { triggerLevelUp as triggerLevelUpAnim } from '@/components/effects/LevelUpAnimation';

export async function executeCommand(input: string, context?: any): Promise<CommandResult> {
  if (!input.trim()) {
    return { success: true, output: '' };
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
        return { success: true, output: 'Habit tracking not yet implemented via terminal' };
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
      `SELECT id, name, level, xp, active FROM skills WHERE active = true ORDER BY name`
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
      `SELECT id, name, level, xp FROM exercises WHERE active = true ORDER BY name`
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
      `SELECT id, name, completed_count FROM workouts WHERE active = true ORDER BY name`
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
      `SELECT id, name, level, xp, active FROM tools WHERE active = true ORDER BY name`
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
      `SELECT id, name, level, xp, active FROM augments WHERE active = true ORDER BY name`
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
      `SELECT id, name, status FROM projects ORDER BY name`
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
      `SELECT id, title, type, status FROM media ORDER BY title`
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
      `SELECT id, name, stat_key, status, current_streak FROM habits WHERE status = 'ACTIVE' ORDER BY name`
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
      `SELECT id, name, status, progress FROM courses ORDER BY name`
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
      `SELECT id, title, category FROM vault_items ORDER BY title`
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
        `SELECT id, name, category FROM recipes ORDER BY name`
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
        `SELECT id, name FROM custom_ingredients ORDER BY name`
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
        `SELECT id, name FROM notes ORDER BY name`
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
      error: 'Usage: log [duration] [skill] [-t tool1] [-a augment1] [-split stat:percent/...] [-n "note"]\nExample: log 1 hour mma, log 2h coding -t vscode, log 1h cycling -split body:60/grit:40 -n "Great session!"',
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

  const skillName = duration.remainingArgs.join(' ');

  if (!skillName) {
    return {
      success: false,
      output: '',
      error: 'Please specify a skill name',
    };
  }

  const db = await getDB();
  
  const skillResult = await db.query<any>(`SELECT id, name, stat_keys, default_split, xp FROM skills WHERE LOWER(name) = LOWER('${skillName.replace(/'/g, "''")}')`);

  if (skillResult.rows.length === 0) {
    return {
      success: false,
      output: '',
      error: `Skill "${skillName}" not found. Use 'help' to see available commands.`,
    };
  }

  const skill = skillResult.rows[0];
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

  // Parse -split flag (format: body:60/grit:40 or body:100)
  let statSplit = buildStatSplitFromKeys(statKeys, defaultSplit);
  const splitFlag = flags.split;
  if (splitFlag) {
    const splitValue = Array.isArray(splitFlag) ? splitFlag[0] : splitFlag;
    const parsedSplit = parseSplitFlag(splitValue);
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
  const augmentFlag = flags.a;
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
      NULL,
      NULL,
      NULL
    );
  `);

  // Update cache directly like QuickLogOverlay does
  if (toolIds.length > 0 && xpResult.perToolXP > 0) {
    queryClient.setQueryData(['tools'], (prev: any[] | undefined) =>
      prev?.map((tool) => {
        if (!toolIds.includes(tool.id)) return tool;
        const nextXp = Number(tool.xp ?? 0) + xpResult.perToolXP;
        const nextLevel = getLevelFromXP(nextXp);
        return {
          ...tool,
          xp: nextXp,
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
        const nextXp = Number(augment.xp ?? 0) + xpResult.perAugmentXP;
        const nextLevel = getLevelFromXP(nextXp);
        return {
          ...augment,
          xp: nextXp,
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

  const statXpSummary = xpResult.statXPMap
    .filter((s: any) => s.amount > 0)
    .map((s: any) => `${s.stat}: +${s.amount}`)
    .join(', ');

  let output = `Session logged successfully!\n\nSkill: ${skill.name}\nDuration: ${duration.minutes} minutes\n\nXP Awarded:\n  Skill XP: +${xpResult.skillXP}\n  Master XP: +${xpResult.masterXP}`;
  
  if (statXpSummary) {
    output += `\n  Stat XP: ${statXpSummary}`;
  }
  
  if (toolNames.length > 0) {
    output += `\n\nTools: ${toolNames.join(', ')} (+${xpResult.perToolXP} XP each)`;
  }

  if (augmentNames.length > 0) {
    output += `\n\nAugments: ${augmentNames.join(', ')} (+${xpResult.perAugmentXP} XP each)`;
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

async function executeHabit(args: string[], flags: Record<string, string>, context?: any): Promise<CommandResult> {
  if (args.length < 1) {
    return {
      success: false,
      output: '',
      error: 'Usage: habit [name]\nExample: habit meditation',
    };
  }

  const habitName = args.join(' ');

  return {
    success: true,
    output: `Habit check-in not yet implemented\nHabit: ${habitName}`,
  };
}
