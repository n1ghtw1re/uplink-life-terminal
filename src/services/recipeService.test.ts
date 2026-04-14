import { describe, expect, it } from 'vitest';
import type { Ingredient, Recipe } from '@/types';
import { calculateRecipeIngredientTotals, calculateRecipeTotals, findDuplicateRecipeName, sanitizeRecipeInput } from '@/services/recipeService';

describe('recipeService', () => {
  it('calculates line totals from ingredient per-100g macros', () => {
    const ingredient: Ingredient = {
      id: 'usda:1',
      name: 'Beef',
      category: 'Beef Products',
      source: 'USDA',
      calories: 200,
      protein_g: 25,
      carbs_g: 0,
      fat_g: 10,
      notes: null,
      created_at: null,
      updated_at: null,
    };

    expect(calculateRecipeIngredientTotals(ingredient, 250)).toEqual({
      grams: 250,
      calories_total: 500,
      protein_g_total: 62.5,
      carbs_g_total: 0,
      fat_g_total: 25,
    });
  });

  it('calculates total and per-serving recipe macros', () => {
    expect(calculateRecipeTotals([
      { calories_total: 500, protein_g_total: 62.5, carbs_g_total: 0, fat_g_total: 25 },
      { calories_total: 100, protein_g_total: 2, carbs_g_total: 20, fat_g_total: 0 },
    ], 4)).toEqual({
      servings: 4,
      total_calories: 600,
      total_protein_g: 64.5,
      total_carbs_g: 20,
      total_fat_g: 25,
      per_serving_calories: 150,
      per_serving_protein_g: 16.13,
      per_serving_carbs_g: 5,
      per_serving_fat_g: 6.25,
    });
  });

  it('detects duplicate recipe names using normalization', () => {
    const duplicate = findDuplicateRecipeName(
      [
        {
          id: '1',
          name: 'Beef Stew',
          category: 'Dinner',
          is_prepared_meal: false,
          servings: 4,
          total_calories: 0,
          total_protein_g: 0,
          total_carbs_g: 0,
          total_fat_g: 0,
          per_serving_calories: 0,
          per_serving_protein_g: 0,
          per_serving_carbs_g: 0,
          per_serving_fat_g: 0,
          created_at: '',
          updated_at: '',
        },
      ] as Recipe[],
      '  beef   stew ',
    );

    expect(duplicate?.id).toBe('1');
  });

  it('sanitizes recipe input and requires ingredients and steps', () => {
    const input = sanitizeRecipeInput({
      name: 'Roast Chicken',
      category: 'Dinner',
      is_prepared_meal: false,
      servings: '2',
      ingredients: [
        {
          ingredient_id: 'usda:1',
          ingredient_name: 'Chicken Breast',
          ingredient_source: 'USDA',
          input_text: '500g chicken breast',
          grams: '500',
          calories_total: 825,
          protein_g_total: 155,
          carbs_g_total: 0,
          fat_g_total: 18,
          sort_order: 0,
        },
      ],
      steps: [
        { step_number: 1, instruction_text: 'Season the chicken.' },
        { step_number: 2, instruction_text: 'Roast until cooked.' },
      ],
    });

    expect(input.servings).toBe(2);
    expect(input.total_calories).toBe(825);
    expect(input.per_serving_calories).toBe(412.5);
    expect(input.steps).toHaveLength(2);
  });

  it('allows prepared meals without steps', () => {
    const input = sanitizeRecipeInput({
      name: 'Bacon Egg and Cheese',
      category: 'Breakfast',
      is_prepared_meal: true,
      servings: '1',
      ingredients: [
        {
          ingredient_id: 'custom:1',
          ingredient_name: 'Prepared Sandwich',
          ingredient_source: 'CUSTOM',
          input_text: '1 sandwich',
          grams: '180',
          calories_total: 480,
          protein_g_total: 22,
          carbs_g_total: 32,
          fat_g_total: 28,
          sort_order: 0,
        },
      ],
      steps: [],
    });

    expect(input.is_prepared_meal).toBe(true);
    expect(input.steps).toHaveLength(0);
    expect(input.total_calories).toBe(480);
  });
});
