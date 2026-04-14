import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { refreshAppData } from '@/lib/refreshAppData';
import type { Ingredient } from '@/types';
import {
  buildIngredientCategories,
  compareRecentCustomIngredients,
  findDuplicateIngredientName,
  loadUsdaIngredients,
  mergeIngredients,
  normalizeCustomIngredientRow,
  sanitizeIngredientInput,
  type IngredientInput,
} from '@/services/ingredientService';

async function getCustomIngredients(): Promise<Ingredient[]> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM custom_ingredients ORDER BY updated_at DESC, created_at DESC, name ASC`);
  return res.rows.map((row) => normalizeCustomIngredientRow(row as unknown as Record<string, unknown>));
}

export function useUsdaIngredients() {
  const query = useQuery({
    queryKey: ['ingredients-usda'],
    queryFn: () => loadUsdaIngredients(),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useCustomIngredients() {
  const query = useQuery({
    queryKey: ['ingredients-custom'],
    queryFn: getCustomIngredients,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useIngredients() {
  const { items: usdaItems, isLoading: usdaLoading } = useUsdaIngredients();
  const { items: customItems, isLoading: customLoading } = useCustomIngredients();
  const items = mergeIngredients(usdaItems, customItems);

  return {
    items,
    usdaItems,
    customItems,
    categories: buildIngredientCategories(usdaItems),
    isLoading: usdaLoading || customLoading,
  };
}

export function useRecentCustomIngredients(limit = 8) {
  const { customItems, isLoading } = useIngredients();
  return {
    items: customItems.slice().sort(compareRecentCustomIngredients).slice(0, limit),
    isLoading,
  };
}

export function useIngredientItem(itemId: string | null) {
  const { items, isLoading } = useIngredients();
  return {
    item: itemId ? items.find((ingredient) => ingredient.id === itemId) ?? null : null,
    isLoading,
  };
}

export function useIngredientActions() {
  const queryClient = useQueryClient();

  const invalidateIngredients = async () => {
    await queryClient.invalidateQueries({ queryKey: ['ingredients-custom'] });
    await queryClient.invalidateQueries({ queryKey: ['terminal-ingredients-list'] });
    await refreshAppData(queryClient);
  };

  const createIngredient = useMutation({
    mutationFn: async (input: IngredientInput) => {
      const db = await getDB();
      const sanitized = sanitizeIngredientInput(input);
      const [usdaItems, customItems] = await Promise.all([loadUsdaIngredients(), getCustomIngredients()]);
      const duplicate = findDuplicateIngredientName([...usdaItems, ...customItems], sanitized.name);
      if (duplicate) {
        throw new Error(`Ingredient "${duplicate.name}" already exists.`);
      }

      await db.query(
        `INSERT INTO custom_ingredients (name, category, calories, protein_g, carbs_g, fat_g, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [sanitized.name, sanitized.category, sanitized.calories, sanitized.protein_g, sanitized.carbs_g, sanitized.fat_g, sanitized.notes],
      );
    },
    onSuccess: invalidateIngredients,
  });

  const updateIngredient = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: IngredientInput }) => {
      const db = await getDB();
      const sanitized = sanitizeIngredientInput(input);
      const [usdaItems, customItems] = await Promise.all([loadUsdaIngredients(), getCustomIngredients()]);
      const duplicate = findDuplicateIngredientName([...usdaItems, ...customItems], sanitized.name, id);
      if (duplicate) {
        throw new Error(`Ingredient "${duplicate.name}" already exists.`);
      }

      await db.query(
        `UPDATE custom_ingredients
         SET name=$1, category=$2, calories=$3, protein_g=$4, carbs_g=$5, fat_g=$6, notes=$7, updated_at=NOW()
         WHERE id=$8`,
        [sanitized.name, sanitized.category, sanitized.calories, sanitized.protein_g, sanitized.carbs_g, sanitized.fat_g, sanitized.notes, id],
      );
    },
    onSuccess: invalidateIngredients,
  });

  const deleteIngredient = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM custom_ingredients WHERE id = $1`, [id]);
    },
    onSuccess: invalidateIngredients,
  });

  return {
    createIngredient,
    updateIngredient,
    deleteIngredient,
  };
}
