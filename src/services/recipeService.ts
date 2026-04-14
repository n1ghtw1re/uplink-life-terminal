import type { Ingredient, Recipe, RecipeCategory, RecipeIngredient, RecipeStep } from '@/types';

export const RECIPE_CATEGORIES: RecipeCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'];

export interface RecipeIngredientInput {
  ingredient_id: string | null;
  ingredient_name: string;
  ingredient_source: Ingredient['source'] | null;
  input_text: string | null;
  grams: number | string;
  calories_total: number;
  protein_g_total: number;
  carbs_g_total: number;
  fat_g_total: number;
  sort_order: number;
}

export interface RecipeStepInput {
  step_number: number;
  instruction_text: string;
}

export interface RecipeInput {
  name: string;
  category: RecipeCategory;
  is_prepared_meal?: boolean;
  servings: number | string;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized.length ? normalized : null;
}

export function normalizeRecipeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNumber(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(numeric.toFixed(2));
}

export function calculateRecipeIngredientTotals(ingredient: Ingredient | null | undefined, grams: number | string) {
  const resolvedGrams = normalizeNumber(grams);
  const caloriesPer100g = ingredient?.calories ?? 0;
  const proteinPer100g = ingredient?.protein_g ?? 0;
  const carbsPer100g = ingredient?.carbs_g ?? 0;
  const fatPer100g = ingredient?.fat_g ?? 0;
  const multiplier = resolvedGrams > 0 ? resolvedGrams / 100 : 0;

  return {
    grams: resolvedGrams,
    calories_total: normalizeNumber(caloriesPer100g * multiplier),
    protein_g_total: normalizeNumber(proteinPer100g * multiplier),
    carbs_g_total: normalizeNumber(carbsPer100g * multiplier),
    fat_g_total: normalizeNumber(fatPer100g * multiplier),
  };
}

export function calculateRecipeTotals(ingredients: Array<Pick<RecipeIngredientInput, 'calories_total' | 'protein_g_total' | 'carbs_g_total' | 'fat_g_total'>>, servings: number | string) {
  const resolvedServings = Math.max(1, Math.round(Number(servings) || 1));
  const total_calories = normalizeNumber(ingredients.reduce((sum, item) => sum + item.calories_total, 0));
  const total_protein_g = normalizeNumber(ingredients.reduce((sum, item) => sum + item.protein_g_total, 0));
  const total_carbs_g = normalizeNumber(ingredients.reduce((sum, item) => sum + item.carbs_g_total, 0));
  const total_fat_g = normalizeNumber(ingredients.reduce((sum, item) => sum + item.fat_g_total, 0));

  return {
    servings: resolvedServings,
    total_calories,
    total_protein_g,
    total_carbs_g,
    total_fat_g,
    per_serving_calories: normalizeNumber(total_calories / resolvedServings),
    per_serving_protein_g: normalizeNumber(total_protein_g / resolvedServings),
    per_serving_carbs_g: normalizeNumber(total_carbs_g / resolvedServings),
    per_serving_fat_g: normalizeNumber(total_fat_g / resolvedServings),
  };
}

export function sanitizeRecipeInput(input: RecipeInput): RecipeInput & ReturnType<typeof calculateRecipeTotals> {
  const name = normalizeText(input.name);
  if (!name) throw new Error('Recipe name is required.');
  if (!RECIPE_CATEGORIES.includes(input.category)) throw new Error('Recipe category is required.');
  const is_prepared_meal = Boolean(input.is_prepared_meal);

  const ingredients = input.ingredients
    .map((ingredient, index) => {
      const ingredientName = normalizeText(ingredient.ingredient_name);
      const grams = normalizeNumber(ingredient.grams);
      if (!ingredientName) throw new Error(`Ingredient row ${index + 1} is missing an ingredient.`);
      if (grams <= 0) throw new Error(`Ingredient row ${index + 1} must have grams greater than zero.`);
      return {
        ingredient_id: ingredient.ingredient_id,
        ingredient_name: ingredientName,
        ingredient_source: ingredient.ingredient_source,
        input_text: normalizeOptionalText(ingredient.input_text),
        grams,
        calories_total: normalizeNumber(ingredient.calories_total),
        protein_g_total: normalizeNumber(ingredient.protein_g_total),
        carbs_g_total: normalizeNumber(ingredient.carbs_g_total),
        fat_g_total: normalizeNumber(ingredient.fat_g_total),
        sort_order: index,
      };
    });

  if (ingredients.length === 0) throw new Error('At least one ingredient is required.');

  const steps = input.steps
    .map((step, index) => ({
      step_number: index + 1,
      instruction_text: normalizeText(step.instruction_text),
    }))
    .filter((step) => step.instruction_text.length > 0);

  if (!is_prepared_meal && steps.length === 0) throw new Error('At least one instruction step is required.');

  const totals = calculateRecipeTotals(ingredients, input.servings);

  return {
    name,
    category: input.category,
    is_prepared_meal,
    servings: totals.servings,
    ingredients,
    steps,
    ...totals,
  };
}

export function normalizeRecipeRow(row: Record<string, unknown>): Recipe {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    category: String(row.category ?? 'Dinner') as RecipeCategory,
    is_prepared_meal: Boolean(row.is_prepared_meal),
    servings: Number(row.servings ?? 1),
    total_calories: normalizeNumber(row.total_calories),
    total_protein_g: normalizeNumber(row.total_protein_g),
    total_carbs_g: normalizeNumber(row.total_carbs_g),
    total_fat_g: normalizeNumber(row.total_fat_g),
    per_serving_calories: normalizeNumber(row.per_serving_calories),
    per_serving_protein_g: normalizeNumber(row.per_serving_protein_g),
    per_serving_carbs_g: normalizeNumber(row.per_serving_carbs_g),
    per_serving_fat_g: normalizeNumber(row.per_serving_fat_g),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export function normalizeRecipeIngredientRow(row: Record<string, unknown>): RecipeIngredient {
  return {
    id: String(row.id ?? ''),
    recipe_id: String(row.recipe_id ?? ''),
    ingredient_id: row.ingredient_id ? String(row.ingredient_id) : null,
    ingredient_name: String(row.ingredient_name ?? ''),
    ingredient_source: row.ingredient_source ? String(row.ingredient_source) as Ingredient['source'] : null,
    input_text: normalizeOptionalText(row.input_text),
    grams: normalizeNumber(row.grams),
    calories_total: normalizeNumber(row.calories_total),
    protein_g_total: normalizeNumber(row.protein_g_total),
    carbs_g_total: normalizeNumber(row.carbs_g_total),
    fat_g_total: normalizeNumber(row.fat_g_total),
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function normalizeRecipeStepRow(row: Record<string, unknown>): RecipeStep {
  return {
    id: String(row.id ?? ''),
    recipe_id: String(row.recipe_id ?? ''),
    step_number: Number(row.step_number ?? 1),
    instruction_text: String(row.instruction_text ?? ''),
  };
}

export function compareRecipes(a: Recipe, b: Recipe): number {
  const updatedCompare = String(b.updated_at).localeCompare(String(a.updated_at));
  if (updatedCompare !== 0) return updatedCompare;
  return a.name.localeCompare(b.name);
}

export function findDuplicateRecipeName(recipes: Recipe[], name: string, ignoreId?: string | null): Recipe | null {
  const target = normalizeRecipeName(name);
  return recipes.find((recipe) => recipe.id !== ignoreId && normalizeRecipeName(recipe.name) === target) ?? null;
}
