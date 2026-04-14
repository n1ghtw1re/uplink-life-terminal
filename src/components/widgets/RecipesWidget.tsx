import { useMemo, useState } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import RecipeModal from '@/components/modals/RecipeModal';
import { useRecipes } from '@/hooks/useRecipes';
import { RECIPE_CATEGORIES } from '@/services/recipeService';
import type { RecipeCategory } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

interface RecipesWidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenRecipes?: () => void;
  onRecipeClick?: (id: string) => void;
}

export default function RecipesWidget({ onClose, onFullscreen, isFullscreen, onOpenRecipes, onRecipeClick }: RecipesWidgetProps) {
  const { recipes, isLoading } = useRecipes();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | null>(null);

  const displayRecipes = useMemo(() => {
    let filtered = activeCategory ? recipes.filter((recipe) => recipe.category === activeCategory) : recipes;
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((recipe) => recipe.name.toLowerCase().includes(query));
    }
    return filtered.slice(0, 6);
  }, [activeCategory, recipes, search]);

  return (
    <>
      <WidgetWrapper title="RECIPES" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
          />
          <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
          {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {RECIPE_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory((prev) => prev === category ? null : category)}
              style={{
                padding: '2px 6px',
                fontSize: 8,
                fontFamily: mono,
                cursor: 'pointer',
                letterSpacing: 1,
                border: `1px solid ${activeCategory === category ? acc : adim}`,
                background: activeCategory === category ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: activeCategory === category ? acc : dim,
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : displayRecipes.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>
            {activeCategory ? `No ${activeCategory.toLowerCase()} recipes yet.` : 'No recipes yet.'}
          </div>
        ) : (
          <div>
            {displayRecipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => onRecipeClick?.(recipe.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: onRecipeClick ? 'pointer' : 'default' }}
              >
                <span style={{ fontSize: 8, color: acc, flexShrink: 0 }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: acc, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: mono }}>
                      {recipe.name}
                    </span>
                    <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 4px', flexShrink: 0 }}>{recipe.category}</span>
                  </div>
                  <div style={{ fontSize: 8, color: dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {recipe.per_serving_calories} kcal / serving · P {recipe.per_serving_protein_g}g · C {recipe.per_serving_carbs_g}g · F {recipe.per_serving_fat_g}g
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            + ADD RECIPE
          </button>
          <button onClick={onOpenRecipes} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            VIEW ALL {'>'}
          </button>
        </div>
      </WidgetWrapper>

      {showAdd && <RecipeModal open={showAdd} onClose={() => setShowAdd(false)} />}
    </>
  );
}
