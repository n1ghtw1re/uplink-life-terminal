import { useState } from 'react';
import RecipeModal from '@/components/modals/RecipeModal';
import { useRecipe, useRecipeActions } from '@/hooks/useRecipes';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgS = 'hsl(var(--bg-secondary))';

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      {label}<div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

interface RecipeDrawerProps {
  recipeId: string;
  onClose?: () => void;
}

export default function RecipeDrawer({ recipeId, onClose }: RecipeDrawerProps) {
  const { recipe, isLoading } = useRecipe(recipeId);
  const { deleteRecipe } = useRecipeActions();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!recipe) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteRecipe.mutateAsync(recipe.id);
    onClose?.();
  };

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!recipe) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>RECIPE NOT FOUND</div>;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// BIOSYSTEM</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: vt, fontSize: 22, color: acc, flex: 1, lineHeight: 1.1 }}>{recipe.name.toUpperCase()}</div>
            <span style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>{recipe.category}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 9, color: dim }}>
            <span>{recipe.servings} servings</span>
            <span>{recipe.per_serving_calories} kcal / serving</span>
            {recipe.is_prepared_meal && <span>Prepared meal</span>}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 20px 16px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          <SectionLabel label="PER SERVING" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['CAL', recipe.per_serving_calories],
              ['PRO', `${recipe.per_serving_protein_g}g`],
              ['CARB', `${recipe.per_serving_carbs_g}g`],
              ['FAT', `${recipe.per_serving_fat_g}g`],
            ].map(([label, value]) => (
              <div key={label} style={{ border: `1px solid ${adim}`, padding: '10px 12px' }}>
                <div style={{ fontSize: 8, color: adim, letterSpacing: 1 }}>{label}</div>
                <div style={{ fontFamily: vt, fontSize: 20, color: acc, marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>

          <SectionLabel label="TOTAL RECIPE" />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>TOTAL CALORIES</span><span style={{ color: acc }}>{recipe.total_calories}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>TOTAL PROTEIN</span><span style={{ color: acc }}>{recipe.total_protein_g}g</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>TOTAL CARBS</span><span style={{ color: acc }}>{recipe.total_carbs_g}g</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}><span style={{ color: adim }}>TOTAL FAT</span><span style={{ color: acc }}>{recipe.total_fat_g}g</span></div>
          </div>

          <SectionLabel label="INGREDIENTS" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(recipe.ingredients ?? []).map((ingredient) => (
              <div key={ingredient.id} style={{ border: `1px solid ${adim}`, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 10, color: acc }}>{ingredient.ingredient_name}</span>
                  <span style={{ fontSize: 8, color: dim }}>{ingredient.grams}g</span>
                </div>
                {ingredient.input_text && <div style={{ fontSize: 8, color: dim, marginBottom: 6 }}>{ingredient.input_text}</div>}
                <div style={{ fontSize: 8, color: dim }}>
                  {ingredient.calories_total} kcal · P {ingredient.protein_g_total}g · C {ingredient.carbs_g_total}g · F {ingredient.fat_g_total}g
                </div>
              </div>
            ))}
          </div>

          <SectionLabel label="INSTRUCTIONS" />
          {recipe.is_prepared_meal ? (
            <div style={{ fontSize: 10, color: dim }}>Prepared meal. No cooking steps stored.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(recipe.steps ?? []).map((step) => (
                <div key={step.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 52, flexShrink: 0, fontSize: 9, color: acc }}>STEP {step.step_number}</div>
                  <div style={{ flex: 1, fontSize: 10, color: dim, lineHeight: 1.6 }}>{step.instruction_text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${adim}`, padding: '12px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setShowEdit(true)} style={{ padding: '6px 12px', fontFamily: mono, fontSize: 10, letterSpacing: 1, cursor: 'pointer', background: 'transparent', border: `1px solid ${acc}`, color: acc }}>
            EDIT
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '6px 12px',
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: 1,
              cursor: 'pointer',
              background: 'transparent',
              border: `1px solid ${confirmDelete ? '#ff5555' : adim}`,
              color: confirmDelete ? '#ff5555' : dim,
            }}
          >
            {confirmDelete ? 'CONFIRM DELETE' : 'DELETE'}
          </button>
        </div>
      </div>

      {showEdit && <RecipeModal open={showEdit} onClose={() => setShowEdit(false)} recipe={recipe} />}
    </>
  );
}
