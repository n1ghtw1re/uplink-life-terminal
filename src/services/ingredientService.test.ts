import { describe, expect, it } from 'vitest';
import type { Ingredient } from '@/types';
import {
  buildIngredientCategories,
  findDuplicateIngredientName,
  normalizeUsdaIngredientRecord,
  sanitizeIngredientInput,
} from '@/services/ingredientService';

describe('ingredientService', () => {
  it('extracts required ingredient data from a USDA record', () => {
    const ingredient = normalizeUsdaIngredientRecord({
      description: 'Chicken breast',
      fdcId: 123,
      foodCategory: { description: 'Poultry Products' },
      foodNutrients: [
        { nutrient: { name: 'Energy', unitName: 'kcal' }, amount: 165 },
        { nutrient: { name: 'Protein', unitName: 'g' }, amount: 31 },
        { nutrient: { name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 0 },
        { nutrient: { name: 'Total lipid (fat)', unitName: 'g' }, amount: 3.6 },
      ],
    });

    expect(ingredient).toEqual({
      id: 'usda:123',
      name: 'Chicken breast',
      category: 'Poultry Products',
      source: 'USDA',
      calories: 165,
      protein_g: 31,
      carbs_g: 0,
      fat_g: 3.6,
      notes: null,
      created_at: null,
      updated_at: null,
    });
  });

  it('falls back to kJ when kcal is missing or zero', () => {
    const ingredient = normalizeUsdaIngredientRecord({
      description: 'Pork sample',
      fdcId: 456,
      foodCategory: { description: 'Pork Products' },
      foodNutrients: [
        { nutrient: { name: 'Energy', unitName: 'kcal' }, amount: 0 },
        { nutrient: { name: 'Energy', unitName: 'kJ' }, amount: 753.12 },
        { nutrient: { name: 'Protein', unitName: 'g' }, amount: 27 },
        { nutrient: { name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 0 },
        { nutrient: { name: 'Total lipid (fat)', unitName: 'g' }, amount: 9 },
      ],
    });

    expect(ingredient?.calories).toBe(180);
  });

  it('falls back to macro-derived calories when energy nutrients are missing', () => {
    const ingredient = normalizeUsdaIngredientRecord({
      description: 'Custom USDA shape',
      fdcId: 789,
      foodCategory: { description: 'Beef Products' },
      foodNutrients: [
        { nutrient: { name: 'Protein', unitName: 'g' }, amount: 20 },
        { nutrient: { name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 5 },
        { nutrient: { name: 'Total lipid (fat)', unitName: 'g' }, amount: 10 },
      ],
    });

    expect(ingredient?.calories).toBe(190);
  });

  it('builds sorted categories from ingredient data', () => {
    const categories = buildIngredientCategories([
      { id: '1', name: 'A', category: 'Vegetables', source: 'USDA', calories: 1, protein_g: 1, carbs_g: 1, fat_g: 1, notes: null, created_at: null, updated_at: null },
      { id: '2', name: 'B', category: 'Fruits', source: 'CUSTOM', calories: 1, protein_g: 1, carbs_g: 1, fat_g: 1, notes: null, created_at: null, updated_at: null },
      { id: '3', name: 'C', category: 'Vegetables', source: 'USDA', calories: 1, protein_g: 1, carbs_g: 1, fat_g: 1, notes: null, created_at: null, updated_at: null },
    ] as Ingredient[]);

    expect(categories).toEqual(['Fruits', 'Vegetables']);
  });

  it('detects duplicates using normalized names', () => {
    const duplicate = findDuplicateIngredientName(
      [
        { id: 'usda:1', name: 'Chicken Breast', category: 'Poultry Products', source: 'USDA', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, notes: null, created_at: null, updated_at: null },
      ],
      '  chicken   breast  ',
    );

    expect(duplicate?.id).toBe('usda:1');
  });

  it('sanitizes custom ingredient input', () => {
    expect(
      sanitizeIngredientInput({
        name: '  Greek Yogurt  ',
        category: 'Dairy and Egg Products',
        calories: '59',
        protein_g: '10.3',
        carbs_g: '3.6',
        fat_g: '0.4',
        notes: '  Plain nonfat  ',
      }),
    ).toEqual({
      name: 'Greek Yogurt',
      category: 'Dairy and Egg Products',
      calories: 59,
      protein_g: 10.3,
      carbs_g: 3.6,
      fat_g: 0.4,
      notes: 'Plain nonfat',
    });
  });
});
