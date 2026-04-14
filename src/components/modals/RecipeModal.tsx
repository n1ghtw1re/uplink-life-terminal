import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import IngredientModal from '@/components/modals/IngredientModal';
import { useIngredients } from '@/hooks/useIngredients';
import { useRecipeActions } from '@/hooks/useRecipes';
import { formatIngredientMacro } from '@/services/ingredientService';
import { RECIPE_CATEGORIES, calculateRecipeTotals } from '@/services/recipeService';
import type { Ingredient, Recipe, RecipeCategory } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgT = 'hsl(var(--bg-tertiary))';

interface RecipeModalProps {
  open: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  initialCategory?: RecipeCategory;
}

interface RecipeIngredientDraft {
  id: string;
  ingredientId: string | null;
  ingredientName: string;
  ingredientSource: Ingredient['source'] | null;
  searchText: string;
  inputText: string;
  grams: string;
  per100Calories: number | null;
  per100Protein: number | null;
  per100Carbs: number | null;
  per100Fat: number | null;
}

interface RecipeStepDraft {
  id: string;
  instructionText: string;
}

function createIngredientDraft(): RecipeIngredientDraft {
  return {
    id: crypto.randomUUID(),
    ingredientId: null,
    ingredientName: '',
    ingredientSource: null,
    searchText: '',
    inputText: '',
    grams: '',
    per100Calories: null,
    per100Protein: null,
    per100Carbs: null,
    per100Fat: null,
  };
}

function createStepDraft(text = ''): RecipeStepDraft {
  return { id: crypto.randomUUID(), instructionText: text };
}

function derivePer100(total: number, grams: number): number | null {
  if (!grams) return null;
  return Number(((total / grams) * 100).toFixed(2));
}

function normalizeIngredientSearch(value: string): string {
  return value.trim().toLowerCase();
}

function rankIngredientSuggestions(items: Ingredient[], query: string): Ingredient[] {
  const normalizedQuery = normalizeIngredientSearch(query);
  if (normalizedQuery.length < 2) return [];

  const exact: Ingredient[] = [];
  const startsWith: Ingredient[] = [];
  const wordStartsWith: Ingredient[] = [];
  const includes: Ingredient[] = [];

  for (const item of items) {
    const normalizedName = normalizeIngredientSearch(item.name);
    if (!normalizedName.includes(normalizedQuery)) continue;

    if (normalizedName === normalizedQuery) {
      exact.push(item);
      continue;
    }

    if (normalizedName.startsWith(normalizedQuery)) {
      startsWith.push(item);
      continue;
    }

    if (normalizedName.includes(` ${normalizedQuery}`) || normalizedName.includes(`, ${normalizedQuery}`)) {
      wordStartsWith.push(item);
      continue;
    }

    includes.push(item);
  }

  return [...exact, ...startsWith, ...wordStartsWith, ...includes].slice(0, 8);
}

export default function RecipeModal({ open, onClose, recipe, initialCategory = 'Dinner' }: RecipeModalProps) {
  const { items: ingredientItems } = useIngredients();
  const { createRecipe, updateRecipe } = useRecipeActions();
  const isEditing = !!recipe;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<RecipeCategory>(initialCategory);
  const [isPreparedMeal, setIsPreparedMeal] = useState(false);
  const [servings, setServings] = useState('1');
  const [ingredientRows, setIngredientRows] = useState<RecipeIngredientDraft[]>([createIngredientDraft()]);
  const [steps, setSteps] = useState<RecipeStepDraft[]>([createStepDraft()]);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? '');
    setCategory(recipe?.category ?? initialCategory);
    setIsPreparedMeal(recipe?.is_prepared_meal ?? false);
    setServings(String(recipe?.servings ?? 1));
    setError('');

    if (recipe?.ingredients?.length) {
      setIngredientRows(
        recipe.ingredients.map((item) => ({
          id: item.id || crypto.randomUUID(),
          ingredientId: item.ingredient_id,
          ingredientName: item.ingredient_name,
          ingredientSource: item.ingredient_source,
          searchText: item.ingredient_name,
          inputText: item.input_text ?? '',
          grams: String(item.grams),
          per100Calories: derivePer100(item.calories_total, item.grams),
          per100Protein: derivePer100(item.protein_g_total, item.grams),
          per100Carbs: derivePer100(item.carbs_g_total, item.grams),
          per100Fat: derivePer100(item.fat_g_total, item.grams),
        })),
      );
    } else {
      setIngredientRows([createIngredientDraft()]);
    }

    if (recipe?.steps?.length) {
      setSteps(recipe.steps.map((step) => createStepDraft(step.instruction_text)));
    } else {
      setSteps([createStepDraft()]);
    }
  }, [open, recipe, initialCategory]);

  const enrichedRows = useMemo(() => {
    return ingredientRows.map((row) => {
      const grams = Number(row.grams) || 0;
      const multiplier = grams > 0 ? grams / 100 : 0;
      const caloriesTotal = row.per100Calories == null ? null : Number((row.per100Calories * multiplier).toFixed(2));
      const proteinTotal = row.per100Protein == null ? null : Number((row.per100Protein * multiplier).toFixed(2));
      const carbsTotal = row.per100Carbs == null ? null : Number((row.per100Carbs * multiplier).toFixed(2));
      const fatTotal = row.per100Fat == null ? null : Number((row.per100Fat * multiplier).toFixed(2));

      return {
        ...row,
        caloriesTotal,
        proteinTotal,
        carbsTotal,
        fatTotal,
        hasCompleteMacros: [row.per100Calories, row.per100Protein, row.per100Carbs, row.per100Fat].every((value) => value != null),
      };
    });
  }, [ingredientRows]);

  const recipeTotals = useMemo(() => {
    const totalReadyRows = enrichedRows
      .filter((row) => row.hasCompleteMacros && Number(row.grams) > 0)
      .map((row) => ({
        calories_total: row.caloriesTotal ?? 0,
        protein_g_total: row.proteinTotal ?? 0,
        carbs_g_total: row.carbsTotal ?? 0,
        fat_g_total: row.fatTotal ?? 0,
      }));

    return calculateRecipeTotals(totalReadyRows, servings);
  }, [enrichedRows, servings]);

  const unresolvedMacroRows = enrichedRows.filter((row) => row.ingredientName && !row.hasCompleteMacros);
  const incompleteIngredientRows = enrichedRows.filter((row) => !row.ingredientName || Number(row.grams) <= 0);
  const hasInstructions = steps.some((step) => step.instructionText.trim().length > 0);
  const canSave = name.trim().length > 0 && incompleteIngredientRows.length === 0 && unresolvedMacroRows.length === 0 && (isPreparedMeal || hasInstructions);

  const setRow = (rowId: string, updater: (row: RecipeIngredientDraft) => RecipeIngredientDraft) => {
    setIngredientRows((rows) => rows.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const applyIngredientToRow = (rowId: string, ingredient: Ingredient) => {
    setRow(rowId, (row) => ({
      ...row,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      ingredientSource: ingredient.source,
      searchText: ingredient.name,
      inputText: row.inputText || ingredient.name,
      per100Calories: ingredient.calories,
      per100Protein: ingredient.protein_g,
      per100Carbs: ingredient.carbs_g,
      per100Fat: ingredient.fat_g,
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const input = {
        name,
        category,
        is_prepared_meal: isPreparedMeal,
        servings,
        ingredients: enrichedRows.map((row, index) => ({
          ingredient_id: row.ingredientId,
          ingredient_name: row.ingredientName,
          ingredient_source: row.ingredientSource,
          input_text: row.inputText,
          grams: row.grams,
          calories_total: row.caloriesTotal ?? 0,
          protein_g_total: row.proteinTotal ?? 0,
          carbs_g_total: row.carbsTotal ?? 0,
          fat_g_total: row.fatTotal ?? 0,
          sort_order: index,
        })),
        steps: steps.map((step, index) => ({
          step_number: index + 1,
          instruction_text: step.instructionText,
        })),
      };

      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, input });
      } else {
        await createRecipe.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe.');
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (label: string, optional = false) => (
    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 5 }}>
      {label}{optional && <span style={{ opacity: 0.5 }}> (optional)</span>}
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title={isEditing ? 'EDIT RECIPE' : 'ADD RECIPE'} width={860}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: mono, maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 120px', gap: 12 }}>
            <div>
              {fieldLabel('RECIPE NAME')}
              <input className="crt-input" style={{ width: '100%' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name..." autoFocus />
            </div>
            <div>
              {fieldLabel('CATEGORY')}
              <div className="crt-select-wrapper" style={{ width: '100%' }}>
                <select className="crt-select" value={category} onChange={(e) => setCategory(e.target.value as RecipeCategory)}>
                  {RECIPE_CATEGORIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              {fieldLabel('SERVINGS')}
              <input className="crt-input" style={{ width: '100%' }} type="number" min="1" step="1" value={servings} onChange={(e) => setServings(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              type="button"
              onClick={() => setIsPreparedMeal((current) => !current)}
              style={{
                padding: '6px 12px',
                fontSize: 9,
                fontFamily: mono,
                border: `1px solid ${isPreparedMeal ? acc : adim}`,
                background: isPreparedMeal ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: isPreparedMeal ? acc : dim,
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              {isPreparedMeal ? '✓ PREPARED MEAL' : 'PREPARED MEAL'}
            </button>
          </div>

          <div style={{ border: `1px solid ${adim}`, background: bgT, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 2, flex: 1 }}>// INGREDIENTS</div>
              <button onClick={() => setShowAddIngredient(true)} style={{ padding: '4px 10px', fontSize: 9, fontFamily: mono, border: `1px solid ${adim}`, background: 'transparent', color: dim, cursor: 'pointer' }}>
                + NEW INGREDIENT
              </button>
              <button onClick={() => setIngredientRows((rows) => [...rows, createIngredientDraft()])} style={{ padding: '4px 10px', fontSize: 9, fontFamily: mono, border: `1px solid ${acc}`, background: 'transparent', color: acc, cursor: 'pointer' }}>
                + ADD LINE
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enrichedRows.map((row, index) => {
                const suggestions = rankIngredientSuggestions(ingredientItems, row.searchText);

                return (
                  <div key={row.id} style={{ border: `1px solid ${adim}`, padding: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 160px 1fr 84px', gap: 10, alignItems: 'start' }}>
                      <div>
                        {fieldLabel(`INGREDIENT ${index + 1}`)}
                        <input
                          className="crt-input"
                          style={{ width: '100%' }}
                          value={row.searchText}
                          onChange={(e) => setRow(row.id, (current) => ({
                            ...current,
                            searchText: e.target.value,
                            ingredientId: null,
                            ingredientName: e.target.value,
                            ingredientSource: null,
                          }))}
                          placeholder="Search ingredient..."
                        />
                        {suggestions.length > 0 && (
                          <div style={{ marginTop: 6, border: `1px solid ${adim}`, maxHeight: 130, overflowY: 'auto' }}>
                            {suggestions.map((ingredient) => (
                              <button
                                key={ingredient.id}
                                type="button"
                                onClick={() => applyIngredientToRow(row.id, ingredient)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(153,104,0,0.2)`, color: acc, padding: '7px 8px', cursor: 'pointer', fontFamily: mono }}
                              >
                                <span style={{ fontSize: 8, color: ingredient.source === 'CUSTOM' ? '#44ff88' : adim, border: `1px solid ${ingredient.source === 'CUSTOM' ? '#44ff88' : adim}`, padding: '1px 4px', flexShrink: 0 }}>{ingredient.source}</span>
                                <span style={{ flex: 1, minWidth: 0, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ingredient.name}</span>
                                <span style={{ fontSize: 8, color: dim, flexShrink: 0 }}>{formatIngredientMacro(ingredient.calories, '')} kcal</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        {fieldLabel('GRAMS')}
                        <input className="crt-input" style={{ width: '100%' }} type="number" min="0" step="0.01" value={row.grams} onChange={(e) => setRow(row.id, (current) => ({ ...current, grams: e.target.value }))} placeholder="500" />
                      </div>

                      <div>
                        {fieldLabel('INPUT TEXT', true)}
                        <input className="crt-input" style={{ width: '100%' }} value={row.inputText} onChange={(e) => setRow(row.id, (current) => ({ ...current, inputText: e.target.value }))} placeholder="500g beef / 1 egg" />
                      </div>

                      <div style={{ paddingTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setIngredientRows((rows) => rows.length > 1 ? rows.filter((item) => item.id !== row.id) : rows)}
                          style={{ padding: '6px 10px', fontSize: 9, fontFamily: mono, border: `1px solid ${adim}`, background: 'transparent', color: dim, cursor: 'pointer' }}
                        >
                          DELETE
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                      {[
                        ['CAL', row.caloriesTotal != null ? `${row.caloriesTotal}` : '--'],
                        ['PRO', row.proteinTotal != null ? `${row.proteinTotal}g` : '--'],
                        ['CARB', row.carbsTotal != null ? `${row.carbsTotal}g` : '--'],
                        ['FAT', row.fatTotal != null ? `${row.fatTotal}g` : '--'],
                      ].map(([label, value]) => (
                        <div key={label} style={{ border: `1px solid rgba(153,104,0,0.3)`, padding: '8px 10px' }}>
                          <div style={{ fontSize: 8, color: adim, letterSpacing: 1 }}>{label}</div>
                          <div style={{ fontSize: 10, color: acc, marginTop: 4 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {!row.hasCompleteMacros && row.ingredientName && (
                      <div style={{ marginTop: 8, fontSize: 9, color: '#ff7777' }}>
                        This ingredient is missing calories or macros. Update the ingredient before saving the recipe.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ border: `1px solid ${adim}`, background: bgT, padding: 12 }}>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 10 }}>// RECIPE TOTALS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
              {[
                ['TOTAL CALORIES', `${recipeTotals.total_calories}`],
                ['TOTAL PROTEIN', `${recipeTotals.total_protein_g}g`],
                ['TOTAL CARBS', `${recipeTotals.total_carbs_g}g`],
                ['TOTAL FAT', `${recipeTotals.total_fat_g}g`],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${adim}`, padding: '10px 12px' }}>
                  <div style={{ fontSize: 8, color: adim, letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 22, color: acc, marginTop: 6 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['PER SERVING CAL', `${recipeTotals.per_serving_calories}`],
                ['PER SERVING PRO', `${recipeTotals.per_serving_protein_g}g`],
                ['PER SERVING CARB', `${recipeTotals.per_serving_carbs_g}g`],
                ['PER SERVING FAT', `${recipeTotals.per_serving_fat_g}g`],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid rgba(153,104,0,0.3)`, padding: '10px 12px' }}>
                  <div style={{ fontSize: 8, color: adim, letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 11, color: acc, marginTop: 6 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 9, color: dim }}>
              Daily macro target percentages will appear here once the INTAKE system exists.
            </div>
          </div>

          <div style={{ border: `1px solid ${adim}`, background: bgT, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: adim, letterSpacing: 2, flex: 1 }}>// INSTRUCTIONS</div>
              {!isPreparedMeal && (
                <button onClick={() => setSteps((current) => [...current, createStepDraft()])} style={{ padding: '4px 10px', fontSize: 9, fontFamily: mono, border: `1px solid ${acc}`, background: 'transparent', color: acc, cursor: 'pointer' }}>
                  + ADD STEP
                </button>
              )}
            </div>
            {isPreparedMeal ? (
              <div style={{ fontSize: 10, color: dim }}>
                Prepared meals do not require instructions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((step, index) => (
                  <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 90px', gap: 10, alignItems: 'start' }}>
                    <div style={{ paddingTop: 10, fontSize: 10, color: acc }}>STEP {index + 1}</div>
                    <textarea
                      className="crt-input"
                      style={{ width: '100%', minHeight: 64, resize: 'vertical' as const }}
                      value={step.instructionText}
                      onChange={(e) => setSteps((current) => current.map((item) => item.id === step.id ? { ...item, instructionText: e.target.value } : item))}
                      placeholder="Describe this step..."
                    />
                    <button
                      type="button"
                      onClick={() => setSteps((current) => current.length > 1 ? current.filter((item) => item.id !== step.id) : current)}
                      style={{ padding: '6px 10px', fontSize: 9, fontFamily: mono, border: `1px solid ${adim}`, background: 'transparent', color: dim, cursor: 'pointer', marginTop: 10 }}
                    >
                      DELETE
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(unresolvedMacroRows.length > 0 || incompleteIngredientRows.length > 0 || (!isPreparedMeal && !hasInstructions)) && (
            <div style={{ fontSize: 10, color: '#ff7777', border: '1px solid rgba(255,119,119,0.45)', padding: '8px 10px' }}>
              {unresolvedMacroRows.length > 0 && 'Some ingredients are missing calories or macro data. '}
              {incompleteIngredientRows.length > 0 && 'Every ingredient row needs a selected ingredient and grams. '}
              {!isPreparedMeal && !hasInstructions && 'Add at least one instruction step.'}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 10, color: '#ff7777', border: '1px solid rgba(255,119,119,0.5)', padding: '8px 10px' }}>
              {error}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${adim}`, paddingTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '6px 16px', fontFamily: mono, fontSize: 10, letterSpacing: 1, cursor: 'pointer', background: 'transparent', border: `1px solid ${adim}`, color: dim }}>
              CANCEL
            </button>
            <button
              disabled={!canSave || saving}
              onClick={handleSave}
              style={{
                padding: '6px 16px',
                fontFamily: mono,
                fontSize: 10,
                letterSpacing: 1,
                cursor: canSave ? 'pointer' : 'not-allowed',
                background: 'transparent',
                border: `1px solid ${canSave ? acc : adim}`,
                color: canSave ? acc : dim,
                opacity: canSave ? 1 : 0.5,
              }}
            >
              {saving ? '>> SAVING...' : isEditing ? '>> SAVE RECIPE' : '>> ADD RECIPE'}
            </button>
          </div>
        </div>
      </Modal>

      {showAddIngredient && <IngredientModal open={showAddIngredient} onClose={() => setShowAddIngredient(false)} />}
    </>
  );
}
