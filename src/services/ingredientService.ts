import type { Ingredient } from '@/types';

export interface IngredientInput {
  name: string;
  category: string;
  calories: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  notes?: string | null;
}

interface UsdaNutrient {
  nutrient?: {
    id?: number;
    name?: string;
    unitName?: string;
  };
  amount?: number;
}

interface UsdaFoundationFood {
  description?: string;
  fdcId?: number;
  foodCategory?: {
    description?: string;
  };
  foodNutrients?: UsdaNutrient[];
}

interface UsdaFoundationResponse {
  FoundationFoods?: UsdaFoundationFood[];
}

const USDA_DATA_PATH = '/data/FoodData_Central_foundation_food_json_2025-12-18.json';
const DEFAULT_CATEGORY = 'Uncategorized';

let usdaIngredientsPromise: Promise<Ingredient[]> | null = null;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized.length ? normalized : null;
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(2));
}

export function normalizeIngredientName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function nutrientAmount(record: UsdaFoundationFood, nutrientName: string, unitName?: string): number | null {
  const nutrients = record.foodNutrients ?? [];
  const match = nutrients.find((entry) => {
    const sameName = entry.nutrient?.name === nutrientName;
    const sameUnit = unitName ? entry.nutrient?.unitName === unitName : true;
    return sameName && sameUnit;
  });
  return normalizeNumber(match?.amount);
}

function deriveCaloriesFromMacros(protein: number | null, carbs: number | null, fat: number | null): number | null {
  const hasAnyMacro = protein != null || carbs != null || fat != null;
  if (!hasAnyMacro) return null;
  const derived = (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9;
  return normalizeNumber(derived);
}

function resolveCalories(record: UsdaFoundationFood, protein: number | null, carbs: number | null, fat: number | null): number | null {
  const kcal = nutrientAmount(record, 'Energy', 'kcal');
  if (kcal != null && kcal > 0) return kcal;

  const kj = nutrientAmount(record, 'Energy', 'kJ');
  if (kj != null && kj > 0) {
    return normalizeNumber(kj / 4.184);
  }

  return deriveCaloriesFromMacros(protein, carbs, fat);
}

export function normalizeUsdaIngredientRecord(record: UsdaFoundationFood): Ingredient | null {
  const name = normalizeText(record.description);
  const id = record.fdcId;
  if (!name || !id) return null;

  const protein = nutrientAmount(record, 'Protein', 'g');
  const carbs = nutrientAmount(record, 'Carbohydrate, by difference', 'g');
  const fat = nutrientAmount(record, 'Total lipid (fat)', 'g');

  return {
    id: `usda:${id}`,
    name,
    category: normalizeText(record.foodCategory?.description) || DEFAULT_CATEGORY,
    source: 'USDA',
    calories: resolveCalories(record, protein, carbs, fat),
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    notes: null,
    created_at: null,
    updated_at: null,
  };
}

export function normalizeCustomIngredientRow(row: Record<string, unknown>): Ingredient {
  return {
    id: String(row.id ?? ''),
    name: normalizeText(row.name),
    category: normalizeText(row.category) || DEFAULT_CATEGORY,
    source: 'CUSTOM',
    calories: normalizeNumber(row.calories),
    protein_g: normalizeNumber(row.protein_g),
    carbs_g: normalizeNumber(row.carbs_g),
    fat_g: normalizeNumber(row.fat_g),
    notes: normalizeOptionalText(row.notes),
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export function sanitizeIngredientInput(input: IngredientInput) {
  const name = normalizeText(input.name);
  const category = normalizeText(input.category);
  const calories = normalizeNumber(input.calories);
  const protein_g = normalizeNumber(input.protein_g);
  const carbs_g = normalizeNumber(input.carbs_g);
  const fat_g = normalizeNumber(input.fat_g);
  const notes = normalizeOptionalText(input.notes);

  if (!name) throw new Error('Ingredient name is required.');
  if (!category) throw new Error('Ingredient category is required.');
  if (calories == null || protein_g == null || carbs_g == null || fat_g == null) {
    throw new Error('Calories, protein, carbs, and fat are required.');
  }
  if ([calories, protein_g, carbs_g, fat_g].some((value) => value < 0)) {
    throw new Error('Macros cannot be negative.');
  }

  return { name, category, calories, protein_g, carbs_g, fat_g, notes };
}

export function compareIngredients(a: Ingredient, b: Ingredient): number {
  const categoryCompare = a.category.localeCompare(b.category);
  if (categoryCompare !== 0) return categoryCompare;
  const nameCompare = a.name.localeCompare(b.name);
  if (nameCompare !== 0) return nameCompare;
  return a.source.localeCompare(b.source);
}

export function compareRecentCustomIngredients(a: Ingredient, b: Ingredient): number {
  const aUpdated = String(a.updated_at ?? a.created_at ?? '');
  const bUpdated = String(b.updated_at ?? b.created_at ?? '');
  const updatedCompare = bUpdated.localeCompare(aUpdated);
  if (updatedCompare !== 0) return updatedCompare;
  return a.name.localeCompare(b.name);
}

export function buildIngredientCategories(items: Ingredient[]): string[] {
  return Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function mergeIngredients(usdaIngredients: Ingredient[], customIngredients: Ingredient[]): Ingredient[] {
  return [...usdaIngredients, ...customIngredients].sort(compareIngredients);
}

export function findDuplicateIngredientName(items: Ingredient[], name: string, ignoreId?: string | null): Ingredient | null {
  const target = normalizeIngredientName(name);
  return items.find((item) => item.id !== ignoreId && normalizeIngredientName(item.name) === target) ?? null;
}

export function formatIngredientMacro(value: number | null | undefined, suffix = 'g'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return suffix ? `${value}${suffix}` : String(value);
}

export async function loadUsdaIngredients(fetcher: typeof fetch = fetch): Promise<Ingredient[]> {
  if (!usdaIngredientsPromise) {
    usdaIngredientsPromise = fetcher(USDA_DATA_PATH)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load USDA ingredients: ${response.status}`);
        return response.json() as Promise<UsdaFoundationResponse>;
      })
      .then((data) => (data.FoundationFoods ?? []).map(normalizeUsdaIngredientRecord).filter(Boolean) as Ingredient[])
      .then((items) => items.sort(compareIngredients))
      .catch((error) => {
        console.error('// INGREDIENT_USDA_LOAD_ERR:', error);
        return [];
      });
  }

  return usdaIngredientsPromise;
}
