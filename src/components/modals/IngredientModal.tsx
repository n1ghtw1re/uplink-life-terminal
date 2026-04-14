import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useIngredientActions, useIngredients } from '@/hooks/useIngredients';
import type { Ingredient } from '@/types';
import { findDuplicateIngredientName, formatIngredientMacro } from '@/services/ingredientService';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface IngredientModalProps {
  open: boolean;
  onClose: () => void;
  ingredient?: Ingredient | null;
  initialCategory?: string | null;
}

export default function IngredientModal({ open, onClose, ingredient, initialCategory }: IngredientModalProps) {
  const { categories, items } = useIngredients();
  const { createIngredient, updateIngredient } = useIngredientActions();
  const isEditing = !!ingredient;

  const firstCategory = useMemo(
    () => initialCategory && initialCategory !== 'ALL'
      ? initialCategory
      : categories[0] ?? 'Vegetables and Vegetable Products',
    [categories, initialCategory],
  );

  const [name, setName] = useState('');
  const [category, setCategory] = useState(firstCategory);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(ingredient?.name ?? '');
    setCategory(ingredient?.category ?? firstCategory);
    setCalories(ingredient?.calories != null ? String(ingredient.calories) : '');
    setProtein(ingredient?.protein_g != null ? String(ingredient.protein_g) : '');
    setCarbs(ingredient?.carbs_g != null ? String(ingredient.carbs_g) : '');
    setFat(ingredient?.fat_g != null ? String(ingredient.fat_g) : '');
    setNotes(ingredient?.notes ?? '');
    setError('');
  }, [open, ingredient, firstCategory]);

  const matchedIngredients = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (!query || query.length < 2) return [];
    return items
      .filter((item) => item.id !== ingredient?.id && item.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [ingredient?.id, items, name]);

  const exactDuplicate = useMemo(
    () => (name.trim() ? findDuplicateIngredientName(items, name, ingredient?.id ?? null) : null),
    [ingredient?.id, items, name],
  );

  const canSave = [name, category, calories, protein, carbs, fat].every((value) => String(value).trim().length > 0) && !exactDuplicate;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const input = {
        name,
        category,
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        notes,
      };

      if (ingredient) {
        await updateIngredient.mutateAsync({ id: ingredient.id, input });
      } else {
        await createIngredient.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ingredient.');
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
    <Modal open={open} onClose={onClose} title={isEditing ? 'EDIT INGREDIENT' : 'ADD INGREDIENT'} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: mono }}>
        <div>
          {fieldLabel('INGREDIENT NAME')}
          <input className="crt-input" style={{ width: '100%' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ingredient name..." autoFocus />
          {exactDuplicate ? (
            <div style={{ marginTop: 8, fontSize: 10, color: '#ff7777', border: '1px solid rgba(255,119,119,0.45)', padding: '8px 10px' }}>
              Duplicate found: "{exactDuplicate.name}" already exists as a {exactDuplicate.source.toLowerCase()} ingredient.
            </div>
          ) : matchedIngredients.length > 0 ? (
            <div style={{ marginTop: 8, border: `1px solid ${adim}`, padding: '8px 10px' }}>
              <div style={{ fontSize: 8, color: adim, letterSpacing: 1, marginBottom: 6 }}>POSSIBLE MATCHES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {matchedIngredients.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setName(match.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left',
                      background: 'transparent',
                      border: `1px solid ${adim}`,
                      color: acc,
                      padding: '6px 8px',
                      cursor: 'pointer',
                      fontFamily: mono,
                    }}
                  >
                    <span style={{ fontSize: 8, color: match.source === 'CUSTOM' ? '#44ff88' : adim, border: `1px solid ${match.source === 'CUSTOM' ? '#44ff88' : adim}`, padding: '1px 4px', flexShrink: 0 }}>
                      {match.source}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {match.name}
                    </span>
                    <span style={{ fontSize: 8, color: dim, flexShrink: 0 }}>
                      {formatIngredientMacro(match.calories, '')} kcal
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          {fieldLabel('CATEGORY')}
          <div className="crt-select-wrapper" style={{ width: '100%' }}>
            <select className="crt-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
              {!categories.includes(category) && <option value={category}>{category}</option>}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <div>
            {fieldLabel('CALORIES / 100G')}
            <input className="crt-input" style={{ width: '100%' }} type="number" min="0" step="0.01" value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
          <div>
            {fieldLabel('PROTEIN / 100G')}
            <input className="crt-input" style={{ width: '100%' }} type="number" min="0" step="0.01" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div>
            {fieldLabel('CARBS / 100G')}
            <input className="crt-input" style={{ width: '100%' }} type="number" min="0" step="0.01" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div>
            {fieldLabel('FAT / 100G')}
            <input className="crt-input" style={{ width: '100%' }} type="number" min="0" step="0.01" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>

        <div>
          {fieldLabel('NOTES', true)}
          <textarea
            className="crt-input"
            style={{ width: '100%', minHeight: 90, resize: 'vertical' as const }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
          />
        </div>

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
            {saving ? '>> SAVING...' : isEditing ? '>> SAVE INGREDIENT' : '>> ADD INGREDIENT'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
