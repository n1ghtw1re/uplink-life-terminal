import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import IngredientModal from '@/components/modals/IngredientModal';
import { useIngredients } from '@/hooks/useIngredients';
import { useIntakeActions } from '@/hooks/useIntake';
import { useRecipes } from '@/hooks/useRecipes';
import {
  calculateIngredientIntakeTotals,
  calculateRecipeIntakeTotals,
  formatLoggedAt,
  MEAL_LABELS,
  sanitizeIntakeLogInput,
} from '@/services/intakeService';
import type { Ingredient, IntakeLog, MealLabel, Recipe } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface IntakeLogModalProps {
  open: boolean;
  onClose: () => void;
  log?: IntakeLog | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalDateTimeInput(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function rankByName<T extends { name: string }>(items: T[], query: string): T[] {
  const normalizedQuery = normalizeSearch(query);
  if (normalizedQuery.length < 2) return [];

  const exact: T[] = [];
  const starts: T[] = [];
  const words: T[] = [];
  const rest: T[] = [];

  for (const item of items) {
    const normalizedName = normalizeSearch(item.name);
    if (!normalizedName.includes(normalizedQuery)) continue;
    if (normalizedName === normalizedQuery) exact.push(item);
    else if (normalizedName.startsWith(normalizedQuery)) starts.push(item);
    else if (normalizedName.includes(` ${normalizedQuery}`) || normalizedName.includes(`, ${normalizedQuery}`)) words.push(item);
    else rest.push(item);
  }

  return [...exact, ...starts, ...words, ...rest].slice(0, 8);
}

function fieldLabel(label: string, optional = false) {
  return (
    <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 5 }}>
      {label}{optional && <span style={{ opacity: 0.5 }}> (optional)</span>}
    </div>
  );
}

export default function IntakeLogModal({ open, onClose, log }: IntakeLogModalProps) {
  const isEditing = !!log;
  const { items: ingredientItems, categories } = useIngredients();
  const { recipes } = useRecipes();
  const { createLog, updateLog } = useIntakeActions();

  const [sourceKind, setSourceKind] = useState<'INGREDIENT' | 'RECIPE'>('INGREDIENT');
  const [searchText, setSearchText] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [grams, setGrams] = useState('');
  const [servings, setServings] = useState('1');
  const [inputText, setInputText] = useState('');
  const [loggedAt, setLoggedAt] = useState('');
  const [mealLabel, setMealLabel] = useState<MealLabel | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSourceKind(log?.source_kind ?? 'INGREDIENT');
    setSearchText(log?.source_name ?? '');
    setSelectedIngredient(log?.source_kind === 'INGREDIENT' ? ingredientItems.find((item) => item.id === log.source_id) ?? null : null);
    setSelectedRecipe(log?.source_kind === 'RECIPE' ? recipes.find((item) => item.id === log.source_id) ?? null : null);
    setGrams(log?.grams != null ? String(log.grams) : '');
    setServings(log?.servings != null ? String(log.servings) : '1');
    setInputText(log?.input_text ?? '');
    setLoggedAt(log ? toLocalDateTimeInput(log.logged_at) : toLocalDateTimeInput(new Date()));
    setMealLabel(log?.meal_label ?? '');
    setNotes(log?.notes ?? '');
    setError('');
  }, [open, log]);

  const ingredientSuggestions = useMemo(() => rankByName(ingredientItems, searchText), [ingredientItems, searchText]);
  const recipeSuggestions = useMemo(() => rankByName(recipes, searchText), [recipes, searchText]);

  const preview = useMemo(() => {
    if (sourceKind === 'INGREDIENT') {
      return calculateIngredientIntakeTotals(selectedIngredient, grams);
    }
    return calculateRecipeIntakeTotals(selectedRecipe, servings);
  }, [grams, selectedIngredient, servings, selectedRecipe, sourceKind]);

  const unresolved = sourceKind === 'INGREDIENT' ? !selectedIngredient : !selectedRecipe;
  const quantityInvalid = sourceKind === 'INGREDIENT' ? !(Number(grams) > 0) : !(Number(servings) > 0);
  const canSave = !unresolved && !quantityInvalid && loggedAt.length > 0;

  const handlePickIngredient = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSelectedRecipe(null);
    setSearchText(ingredient.name);
    if (!inputText) setInputText(ingredient.name);
  };

  const handlePickRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setSelectedIngredient(null);
    setSearchText(recipe.name);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const input = sanitizeIntakeLogInput({
        logged_at: loggedAt,
        meal_label: mealLabel || null,
        notes,
        source_kind: sourceKind,
        source_id: sourceKind === 'INGREDIENT' ? selectedIngredient?.id ?? null : selectedRecipe?.id ?? null,
        source_name: sourceKind === 'INGREDIENT' ? selectedIngredient?.name ?? searchText : selectedRecipe?.name ?? searchText,
        source_origin: sourceKind === 'INGREDIENT' ? selectedIngredient?.source ?? null : 'RECIPE',
        grams: sourceKind === 'INGREDIENT' ? grams : null,
        servings: sourceKind === 'RECIPE' ? servings : null,
        input_text: sourceKind === 'INGREDIENT' ? inputText : null,
        calories: preview.calories,
        protein_g: preview.protein_g,
        carbs_g: preview.carbs_g,
        fat_g: preview.fat_g,
      });

      if (log) {
        await updateLog.mutateAsync({ id: log.id, input });
      } else {
        await createLog.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save intake log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={isEditing ? 'EDIT INTAKE LOG' : 'LOG INTAKE'} width={760}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: mono, maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['INGREDIENT', 'RECIPE'] as const).map((kind) => (
              <button
                key={kind}
                onClick={() => {
                  setSourceKind(kind);
                  setSearchText('');
                  setSelectedIngredient(null);
                  setSelectedRecipe(null);
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  fontFamily: mono,
                  fontSize: 10,
                  border: `1px solid ${sourceKind === kind ? acc : adim}`,
                  background: sourceKind === kind ? 'rgba(255,176,0,0.1)' : 'transparent',
                  color: sourceKind === kind ? acc : dim,
                  cursor: 'pointer',
                }}
              >
                {kind}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 180px 180px', gap: 12 }}>
            <div>
              {fieldLabel(sourceKind === 'INGREDIENT' ? 'INGREDIENT' : 'RECIPE')}
              <input
                className="crt-input"
                style={{ width: '100%' }}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (sourceKind === 'INGREDIENT') setSelectedIngredient(null);
                  else setSelectedRecipe(null);
                }}
                placeholder={sourceKind === 'INGREDIENT' ? 'Search ingredient...' : 'Search recipe...'}
                autoFocus
              />
              {(sourceKind === 'INGREDIENT' ? ingredientSuggestions : recipeSuggestions).length > 0 && (
                <div style={{ marginTop: 6, border: `1px solid ${adim}`, maxHeight: 140, overflowY: 'auto' }}>
                  {(sourceKind === 'INGREDIENT' ? ingredientSuggestions : recipeSuggestions).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => sourceKind === 'INGREDIENT' ? handlePickIngredient(item as Ingredient) : handlePickRecipe(item as Recipe)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid rgba(153,104,0,0.2)`, color: acc, padding: '7px 8px', cursor: 'pointer', fontFamily: mono }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                      <span style={{ fontSize: 8, color: dim, flexShrink: 0 }}>
                        {sourceKind === 'INGREDIENT' ? `${(item as Ingredient).calories ?? '--'} kcal/100g` : `${(item as Recipe).per_serving_calories} kcal/serv`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {sourceKind === 'INGREDIENT' && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => setShowAddIngredient(true)} style={{ padding: '4px 10px', fontSize: 9, fontFamily: mono, border: `1px solid ${adim}`, background: 'transparent', color: dim, cursor: 'pointer' }}>
                    + NEW INGREDIENT
                  </button>
                </div>
              )}
            </div>

            {sourceKind === 'INGREDIENT' ? (
              <div>
                {fieldLabel('GRAMS')}
                <input className="crt-input" style={{ width: '100%' }} type="number" min="0" step="0.01" value={grams} onChange={(e) => setGrams(e.target.value)} />
              </div>
            ) : (
              <div>
                {fieldLabel('SERVINGS')}
                <input className="crt-input" style={{ width: '100%' }} type="number" min="0" step="0.25" value={servings} onChange={(e) => setServings(e.target.value)} />
              </div>
            )}

            <div>
              {fieldLabel('LOGGED AT')}
              <input className="crt-input" style={{ width: '100%' }} type="datetime-local" value={loggedAt} onChange={(e) => setLoggedAt(e.target.value)} />
            </div>
          </div>

          {sourceKind === 'INGREDIENT' && (
            <div>
              {fieldLabel('INPUT TEXT', true)}
              <input className="crt-input" style={{ width: '100%' }} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="2 carrots / 1 steak" />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12 }}>
            <div>
              {fieldLabel('MEAL LABEL', true)}
              <div className="crt-select-wrapper" style={{ width: '100%' }}>
                <select className="crt-select" value={mealLabel} onChange={(e) => setMealLabel((e.target.value as MealLabel) || '')}>
                  <option value="">NONE</option>
                  {MEAL_LABELS.map((label) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              {fieldLabel('NOTES', true)}
              <input className="crt-input" style={{ width: '100%' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>

          <div style={{ border: `1px solid ${adim}`, background: 'hsl(var(--bg-tertiary))', padding: 12 }}>
            <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 10 }}>// PREVIEW</div>
            <div style={{ fontSize: 9, color: dim, marginBottom: 10 }}>
              {loggedAt ? `Logged at ${formatLoggedAt(loggedAt)}` : 'Set a log time.'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {[
                ['CAL', preview.calories],
                ['PRO', `${preview.protein_g}g`],
                ['CARB', `${preview.carbs_g}g`],
                ['FAT', `${preview.fat_g}g`],
              ].map(([label, value]) => (
                <div key={label} style={{ border: `1px solid ${adim}`, padding: '10px 12px' }}>
                  <div style={{ fontSize: 8, color: adim, letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 11, color: acc, marginTop: 6 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {(!canSave || error) && (
            <div style={{ fontSize: 10, color: error ? '#ff7777' : dim, border: `1px solid ${error ? 'rgba(255,119,119,0.5)' : adim}`, padding: '8px 10px' }}>
              {error || (
                <>
                  {unresolved && 'Pick a valid ingredient or recipe. '}
                  {quantityInvalid && (sourceKind === 'INGREDIENT' ? 'Ingredient logs require grams greater than zero. ' : 'Recipe logs require servings greater than zero. ')}
                </>
              )}
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
              {saving ? '>> SAVING...' : isEditing ? '>> SAVE LOG' : '>> LOG INTAKE'}
            </button>
          </div>
        </div>
      </Modal>

      {showAddIngredient && (
        <IngredientModal
          open={showAddIngredient}
          onClose={() => setShowAddIngredient(false)}
          initialCategory={categories[0] ?? 'Vegetables and Vegetable Products'}
        />
      )}
    </>
  );
}
