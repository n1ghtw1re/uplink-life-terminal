import type {
  Ingredient,
  IngredientSource,
  IntakeDaySummary,
  IntakeLog,
  IntakeSettings,
  IntakeSourceKind,
  MealLabel,
  Recipe,
} from '@/types';

export const MEAL_LABELS: MealLabel[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
export const INTAKE_SOURCE_KINDS: IntakeSourceKind[] = ['INGREDIENT', 'RECIPE'];

export interface IntakeSettingsInput {
  daily_calorie_goal: number | string;
  protein_percent: number | string;
  carbs_percent: number | string;
  fat_percent: number | string;
}

export interface IntakeLogInput {
  logged_at: string;
  meal_label?: MealLabel | null;
  notes?: string | null;
  source_kind: IntakeSourceKind;
  source_id: string | null;
  source_name: string;
  source_origin?: IngredientSource | 'RECIPE' | null;
  grams?: number | string | null;
  servings?: number | string | null;
  input_text?: string | null;
  calories: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized.length ? normalized : null;
}

export function normalizeIntakeNumber(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(numeric.toFixed(2));
}

function normalizePositiveNullable(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = normalizeIntakeNumber(value);
  return numeric > 0 ? numeric : null;
}

export function normalizeIntakeDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function normalizeIntakeDateOnly(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return toLocalDateString(value);
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return toLocalDateString(parsed);
}

export function formatLoggedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${toLocalDateString(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatLoggedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function sanitizeIntakeSettingsInput(input: IntakeSettingsInput) {
  const daily_calorie_goal = Math.max(0, Math.round(Number(input.daily_calorie_goal) || 0));
  const protein_percent = Math.max(0, Math.round(Number(input.protein_percent) || 0));
  const carbs_percent = Math.max(0, Math.round(Number(input.carbs_percent) || 0));
  const fat_percent = Math.max(0, Math.round(Number(input.fat_percent) || 0));

  if (daily_calorie_goal <= 0) throw new Error('Daily calorie goal must be greater than zero.');
  if (protein_percent + carbs_percent + fat_percent !== 100) {
    throw new Error('Macro goal percentages must total 100.');
  }

  return {
    daily_calorie_goal,
    protein_percent,
    carbs_percent,
    fat_percent,
  };
}

export function calculateIngredientIntakeTotals(ingredient: Ingredient | null | undefined, grams: number | string) {
  const resolvedGrams = normalizePositiveNullable(grams) ?? 0;
  const multiplier = resolvedGrams > 0 ? resolvedGrams / 100 : 0;
  return {
    grams: resolvedGrams,
    calories: normalizeIntakeNumber((ingredient?.calories ?? 0) * multiplier),
    protein_g: normalizeIntakeNumber((ingredient?.protein_g ?? 0) * multiplier),
    carbs_g: normalizeIntakeNumber((ingredient?.carbs_g ?? 0) * multiplier),
    fat_g: normalizeIntakeNumber((ingredient?.fat_g ?? 0) * multiplier),
  };
}

export function calculateRecipeIntakeTotals(recipe: Recipe | null | undefined, servings: number | string) {
  const resolvedServings = normalizePositiveNullable(servings) ?? 0;
  return {
    servings: resolvedServings,
    calories: normalizeIntakeNumber((recipe?.per_serving_calories ?? 0) * resolvedServings),
    protein_g: normalizeIntakeNumber((recipe?.per_serving_protein_g ?? 0) * resolvedServings),
    carbs_g: normalizeIntakeNumber((recipe?.per_serving_carbs_g ?? 0) * resolvedServings),
    fat_g: normalizeIntakeNumber((recipe?.per_serving_fat_g ?? 0) * resolvedServings),
  };
}

export function sanitizeIntakeLogInput(input: IntakeLogInput) {
  const logged = new Date(input.logged_at);
  if (Number.isNaN(logged.getTime())) throw new Error('Logged time is invalid.');

  const source_name = normalizeText(input.source_name);
  if (!source_name) throw new Error('A logged item name is required.');
  if (!INTAKE_SOURCE_KINDS.includes(input.source_kind)) throw new Error('Invalid intake source type.');

  const calories = normalizeIntakeNumber(input.calories);
  const protein_g = normalizeIntakeNumber(input.protein_g);
  const carbs_g = normalizeIntakeNumber(input.carbs_g);
  const fat_g = normalizeIntakeNumber(input.fat_g);

  if ([calories, protein_g, carbs_g, fat_g].some((value) => value < 0)) {
    throw new Error('Calories and macros cannot be negative.');
  }

  const grams = input.source_kind === 'INGREDIENT' ? normalizePositiveNullable(input.grams) : null;
  const servings = input.source_kind === 'RECIPE' ? normalizePositiveNullable(input.servings) : null;

  if (input.source_kind === 'INGREDIENT' && !grams) {
    throw new Error('Ingredient logs require grams greater than zero.');
  }
  if (input.source_kind === 'RECIPE' && !servings) {
    throw new Error('Recipe logs require servings greater than zero.');
  }

  return {
    logged_at: logged.toISOString(),
    anchor_date: toLocalDateString(logged),
    meal_label: input.meal_label ?? null,
    notes: normalizeOptionalText(input.notes),
    source_kind: input.source_kind,
    source_id: input.source_id,
    source_name,
    source_origin: input.source_origin ?? null,
    grams,
    servings,
    input_text: normalizeOptionalText(input.input_text),
    calories,
    protein_g,
    carbs_g,
    fat_g,
  };
}

export function normalizeIntakeSettingsRow(row: Record<string, unknown> | undefined): IntakeSettings {
  return {
    id: Number(row?.id ?? 1),
    daily_calorie_goal: Number(row?.daily_calorie_goal ?? 2000),
    protein_percent: Number(row?.protein_percent ?? 40),
    carbs_percent: Number(row?.carbs_percent ?? 30),
    fat_percent: Number(row?.fat_percent ?? 30),
    created_at: row?.created_at ? String(row.created_at) : null,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
  };
}

export function normalizeIntakeLogRow(row: Record<string, unknown>): IntakeLog {
  return {
    id: String(row.id ?? ''),
    logged_at: normalizeIntakeDateTime(row.logged_at as string | Date),
    anchor_date: normalizeIntakeDateOnly(row.anchor_date as string | Date),
    meal_label: row.meal_label ? (String(row.meal_label) as MealLabel) : null,
    notes: normalizeOptionalText(row.notes),
    source_kind: String(row.source_kind ?? 'INGREDIENT') as IntakeSourceKind,
    source_id: row.source_id ? String(row.source_id) : null,
    source_name: String(row.source_name ?? ''),
    source_origin: row.source_origin ? (String(row.source_origin) as IngredientSource | 'RECIPE') : null,
    grams: normalizePositiveNullable(row.grams),
    servings: normalizePositiveNullable(row.servings),
    input_text: normalizeOptionalText(row.input_text),
    calories: normalizeIntakeNumber(row.calories),
    protein_g: normalizeIntakeNumber(row.protein_g),
    carbs_g: normalizeIntakeNumber(row.carbs_g),
    fat_g: normalizeIntakeNumber(row.fat_g),
    created_at: normalizeIntakeDateTime(row.created_at as string | Date),
    updated_at: normalizeIntakeDateTime(row.updated_at as string | Date),
  };
}

export function compareIntakeLogs(a: IntakeLog, b: IntakeLog): number {
  const loggedCompare = String(b.logged_at).localeCompare(String(a.logged_at));
  if (loggedCompare !== 0) return loggedCompare;
  return a.source_name.localeCompare(b.source_name);
}

export function calculateMacroPercents(proteinG: number, carbsG: number, fatG: number) {
  const proteinCalories = proteinG * 4;
  const carbsCalories = carbsG * 4;
  const fatCalories = fatG * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
  if (totalMacroCalories <= 0) {
    return { protein_percent_actual: 0, carbs_percent_actual: 0, fat_percent_actual: 0 };
  }

  return {
    protein_percent_actual: Math.round((proteinCalories / totalMacroCalories) * 100),
    carbs_percent_actual: Math.round((carbsCalories / totalMacroCalories) * 100),
    fat_percent_actual: Math.round((fatCalories / totalMacroCalories) * 100),
  };
}

export function buildIntakeDaySummaries(logs: IntakeLog[], settings: IntakeSettings): IntakeDaySummary[] {
  const map = new Map<string, IntakeDaySummary>();

  for (const log of logs.slice().sort(compareIntakeLogs)) {
    const existing = map.get(log.anchor_date) ?? {
      anchor_date: log.anchor_date,
      logs: [],
      total_calories: 0,
      total_protein_g: 0,
      total_carbs_g: 0,
      total_fat_g: 0,
      protein_percent_actual: 0,
      carbs_percent_actual: 0,
      fat_percent_actual: 0,
      calorie_goal_hit: false,
    };

    existing.logs.push(log);
    existing.total_calories = normalizeIntakeNumber(existing.total_calories + log.calories);
    existing.total_protein_g = normalizeIntakeNumber(existing.total_protein_g + log.protein_g);
    existing.total_carbs_g = normalizeIntakeNumber(existing.total_carbs_g + log.carbs_g);
    existing.total_fat_g = normalizeIntakeNumber(existing.total_fat_g + log.fat_g);
    map.set(log.anchor_date, existing);
  }

  return [...map.values()]
    .map((summary) => {
      const percents = calculateMacroPercents(summary.total_protein_g, summary.total_carbs_g, summary.total_fat_g);
      return {
        ...summary,
        ...percents,
        calorie_goal_hit: summary.total_calories >= settings.daily_calorie_goal,
        logs: summary.logs.sort(compareIntakeLogs),
      };
    })
    .sort((a, b) => b.anchor_date.localeCompare(a.anchor_date));
}

export function calculateIntakeStreak(days: IntakeDaySummary[]): number {
  if (!days.length) return 0;

  let streak = 0;
  let cursor = new Date(`${days[0].anchor_date}T00:00:00`);
  const map = new Map(days.map((day) => [day.anchor_date, day]));

  while (true) {
    const key = toLocalDateString(cursor);
    const day = map.get(key);
    if (!day || !day.calorie_goal_hit) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
