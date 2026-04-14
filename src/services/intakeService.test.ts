import { describe, expect, it } from 'vitest';
import {
  buildIntakeDaySummaries,
  calculateIngredientIntakeTotals,
  calculateIntakeStreak,
  calculateRecipeIntakeTotals,
  normalizeIntakeLogRow,
  sanitizeIntakeLogInput,
  sanitizeIntakeSettingsInput,
} from '@/services/intakeService';
import type { Ingredient, Recipe } from '@/types';

describe('intakeService', () => {
  it('validates macro settings sum to 100', () => {
    expect(() =>
      sanitizeIntakeSettingsInput({
        daily_calorie_goal: 2200,
        protein_percent: 40,
        carbs_percent: 35,
        fat_percent: 20,
      }),
    ).toThrow('Macro goal percentages must total 100.');
  });

  it('calculates ingredient nutrition from grams', () => {
    const ingredient: Ingredient = {
      id: 'carrot',
      name: 'Carrot',
      category: 'Vegetables',
      source: 'CUSTOM',
      calories: 41,
      protein_g: 0.9,
      carbs_g: 9.6,
      fat_g: 0.2,
      notes: null,
      created_at: null,
      updated_at: null,
    };

    expect(calculateIngredientIntakeTotals(ingredient, 200)).toEqual({
      grams: 200,
      calories: 82,
      protein_g: 1.8,
      carbs_g: 19.2,
      fat_g: 0.4,
    });
  });

  it('calculates recipe nutrition from servings', () => {
    const recipe: Recipe = {
      id: 'chili',
      name: 'Bill chili',
      category: 'Dinner',
      is_prepared_meal: false,
      servings: 4,
      total_calories: 1600,
      total_protein_g: 120,
      total_carbs_g: 80,
      total_fat_g: 60,
      per_serving_calories: 400,
      per_serving_protein_g: 30,
      per_serving_carbs_g: 20,
      per_serving_fat_g: 15,
      created_at: '',
      updated_at: '',
    };

    expect(calculateRecipeIntakeTotals(recipe, 2)).toEqual({
      servings: 2,
      calories: 800,
      protein_g: 60,
      carbs_g: 40,
      fat_g: 30,
    });
  });

  it('groups daily summaries and marks calorie goal hits', () => {
    const settings = {
      id: 1,
      daily_calorie_goal: 2000,
      protein_percent: 40,
      carbs_percent: 30,
      fat_percent: 30,
      created_at: null,
      updated_at: null,
    };

    const dayOneBreakfast = sanitizeIntakeLogInput({
      logged_at: '2026-04-11T08:00',
      source_kind: 'INGREDIENT',
      source_id: 'egg',
      source_name: 'Egg',
      source_origin: 'CUSTOM',
      grams: 100,
      servings: null,
      input_text: '2 eggs',
      calories: 155,
      protein_g: 13,
      carbs_g: 1.1,
      fat_g: 11,
    });
    const dayOneDinner = sanitizeIntakeLogInput({
      logged_at: '2026-04-11T18:00',
      source_kind: 'RECIPE',
      source_id: 'chili',
      source_name: 'Chili',
      source_origin: 'RECIPE',
      grams: null,
      servings: 3,
      calories: 2100,
      protein_g: 120,
      carbs_g: 150,
      fat_g: 60,
    });

    const summaries = buildIntakeDaySummaries(
      [
        { id: '2', created_at: '', updated_at: '', meal_label: 'DINNER', notes: null, ...dayOneDinner },
        { id: '1', created_at: '', updated_at: '', meal_label: 'BREAKFAST', notes: null, ...dayOneBreakfast },
      ],
      settings,
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0].total_calories).toBe(2255);
    expect(summaries[0].calorie_goal_hit).toBe(true);
    expect(summaries[0].logs[0].source_name).toBe('Chili');
  });

  it('calculates streak from consecutive calorie goal days', () => {
    const days = [
      { anchor_date: '2026-04-11', calorie_goal_hit: true },
      { anchor_date: '2026-04-10', calorie_goal_hit: true },
      { anchor_date: '2026-04-09', calorie_goal_hit: false },
    ] as any;

    expect(calculateIntakeStreak(days)).toBe(2);
  });

  it('normalizes date objects from DB rows for widget/day matching', () => {
    const row = normalizeIntakeLogRow({
      id: 'log-1',
      logged_at: new Date('2026-04-11T08:30:00.000Z'),
      anchor_date: new Date('2026-04-11T00:00:00.000Z'),
      source_kind: 'INGREDIENT',
      source_name: 'Milk',
      calories: 120,
      protein_g: 8,
      carbs_g: 12,
      fat_g: 5,
      created_at: new Date('2026-04-11T08:30:00.000Z'),
      updated_at: new Date('2026-04-11T08:30:00.000Z'),
    });

    expect(row.anchor_date).toBe('2026-04-11');
    expect(row.logged_at).toBe('2026-04-11T08:30:00.000Z');
  });
});
