import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { refreshAppData } from '@/lib/refreshAppData';
import type { Recipe } from '@/types';
import {
  compareRecipes,
  findDuplicateRecipeName,
  normalizeRecipeIngredientRow,
  normalizeRecipeRow,
  normalizeRecipeStepRow,
  sanitizeRecipeInput,
  type RecipeInput,
} from '@/services/recipeService';

async function getRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM recipes ORDER BY updated_at DESC, name ASC`);
  return res.rows.map((row) => normalizeRecipeRow(row as unknown as Record<string, unknown>)).sort(compareRecipes);
}

export function useRecipes() {
  const query = useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
  });

  return {
    recipes: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useRecipe(recipeId: string | null) {
  const query = useQuery({
    queryKey: ['recipe', recipeId],
    enabled: !!recipeId,
    queryFn: async () => {
      const db = await getDB();
      const recipeRes = await db.query(`SELECT * FROM recipes WHERE id = $1 LIMIT 1`, [recipeId]);
      const recipeRow = recipeRes.rows[0];
      if (!recipeRow) return null;

      const [ingredientRes, stepRes] = await Promise.all([
        db.query(`SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY sort_order ASC`, [recipeId]),
        db.query(`SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY step_number ASC`, [recipeId]),
      ]);

      const recipe = normalizeRecipeRow(recipeRow as unknown as Record<string, unknown>);
      return {
        ...recipe,
        ingredients: ingredientRes.rows.map((row) => normalizeRecipeIngredientRow(row as unknown as Record<string, unknown>)),
        steps: stepRes.rows.map((row) => normalizeRecipeStepRow(row as unknown as Record<string, unknown>)),
      } as Recipe;
    },
  });

  return {
    recipe: query.data ?? null,
    isLoading: query.isLoading,
  };
}

export function useRecipeActions() {
  const queryClient = useQueryClient();

  const invalidateRecipes = async () => {
    await queryClient.invalidateQueries({ queryKey: ['recipes'] });
    await queryClient.invalidateQueries({ queryKey: ['recipe'] });
    await refreshAppData(queryClient);
  };

  const createRecipe = useMutation({
    mutationFn: async (input: RecipeInput) => {
      const db = await getDB();
      const existingRecipes = await getRecipes();
      const sanitized = sanitizeRecipeInput(input);
      const duplicate = findDuplicateRecipeName(existingRecipes, sanitized.name);
      if (duplicate) throw new Error(`Recipe "${duplicate.name}" already exists.`);

      const recipeRes = await db.query<{ id: string }>(
        `INSERT INTO recipes (
          name, category, is_prepared_meal, servings,
          total_calories, total_protein_g, total_carbs_g, total_fat_g,
          per_serving_calories, per_serving_protein_g, per_serving_carbs_g, per_serving_fat_g,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
        RETURNING id`,
        [
          sanitized.name,
          sanitized.category,
          sanitized.is_prepared_meal,
          sanitized.servings,
          sanitized.total_calories,
          sanitized.total_protein_g,
          sanitized.total_carbs_g,
          sanitized.total_fat_g,
          sanitized.per_serving_calories,
          sanitized.per_serving_protein_g,
          sanitized.per_serving_carbs_g,
          sanitized.per_serving_fat_g,
        ],
      );
      const recipeId = String(recipeRes.rows[0]?.id ?? '');

      for (const ingredient of sanitized.ingredients) {
        await db.query(
          `INSERT INTO recipe_ingredients (
            recipe_id, ingredient_id, ingredient_name, ingredient_source, input_text, grams,
            calories_total, protein_g_total, carbs_g_total, fat_g_total, sort_order
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            recipeId,
            ingredient.ingredient_id,
            ingredient.ingredient_name,
            ingredient.ingredient_source,
            ingredient.input_text,
            ingredient.grams,
            ingredient.calories_total,
            ingredient.protein_g_total,
            ingredient.carbs_g_total,
            ingredient.fat_g_total,
            ingredient.sort_order,
          ],
        );
      }

      for (const step of sanitized.steps) {
        await db.query(
          `INSERT INTO recipe_steps (recipe_id, step_number, instruction_text) VALUES ($1,$2,$3)`,
          [recipeId, step.step_number, step.instruction_text],
        );
      }
    },
    onSuccess: invalidateRecipes,
  });

  const updateRecipe = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: RecipeInput }) => {
      const db = await getDB();
      const existingRecipes = await getRecipes();
      const sanitized = sanitizeRecipeInput(input);
      const duplicate = findDuplicateRecipeName(existingRecipes, sanitized.name, id);
      if (duplicate) throw new Error(`Recipe "${duplicate.name}" already exists.`);

      await db.query(
        `UPDATE recipes
         SET name=$1, category=$2, is_prepared_meal=$3, servings=$4,
             total_calories=$5, total_protein_g=$6, total_carbs_g=$7, total_fat_g=$8,
             per_serving_calories=$9, per_serving_protein_g=$10, per_serving_carbs_g=$11, per_serving_fat_g=$12,
             updated_at=NOW()
         WHERE id=$13`,
        [
          sanitized.name,
          sanitized.category,
          sanitized.is_prepared_meal,
          sanitized.servings,
          sanitized.total_calories,
          sanitized.total_protein_g,
          sanitized.total_carbs_g,
          sanitized.total_fat_g,
          sanitized.per_serving_calories,
          sanitized.per_serving_protein_g,
          sanitized.per_serving_carbs_g,
          sanitized.per_serving_fat_g,
          id,
        ],
      );

      await db.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [id]);
      await db.query(`DELETE FROM recipe_steps WHERE recipe_id = $1`, [id]);

      for (const ingredient of sanitized.ingredients) {
        await db.query(
          `INSERT INTO recipe_ingredients (
            recipe_id, ingredient_id, ingredient_name, ingredient_source, input_text, grams,
            calories_total, protein_g_total, carbs_g_total, fat_g_total, sort_order
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            id,
            ingredient.ingredient_id,
            ingredient.ingredient_name,
            ingredient.ingredient_source,
            ingredient.input_text,
            ingredient.grams,
            ingredient.calories_total,
            ingredient.protein_g_total,
            ingredient.carbs_g_total,
            ingredient.fat_g_total,
            ingredient.sort_order,
          ],
        );
      }

      for (const step of sanitized.steps) {
        await db.query(
          `INSERT INTO recipe_steps (recipe_id, step_number, instruction_text) VALUES ($1,$2,$3)`,
          [id, step.step_number, step.instruction_text],
        );
      }
    },
    onSuccess: invalidateRecipes,
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM recipes WHERE id = $1`, [id]);
    },
    onSuccess: invalidateRecipes,
  });

  return {
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
}
