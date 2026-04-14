import { useMemo, useState } from 'react';
import RecipeDrawer from '@/components/drawer/RecipeDrawer';
import RecipeModal from '@/components/modals/RecipeModal';
import { useRecipes } from '@/hooks/useRecipes';
import { RECIPE_CATEGORIES } from '@/services/recipeService';
import type { RecipeCategory } from '@/types';

const mono = "'IBM Plex Mono', monospace";
const vt = "'VT323', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgP = 'hsl(var(--bg-primary))';
const bgS = 'hsl(var(--bg-secondary))';

interface RecipesPageProps {
  onClose: () => void;
}

export default function RecipesPage({ onClose }: RecipesPageProps) {
  const { recipes, isLoading } = useRecipes();
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const categoryFiltered = activeCategory === 'ALL' ? recipes : recipes.filter((recipe) => recipe.category === activeCategory);
    if (!search.trim()) return categoryFiltered;
    const query = search.toLowerCase();
    return categoryFiltered.filter((recipe) => recipe.name.toLowerCase().includes(query));
  }, [activeCategory, recipes, search]);

  const countFor = (category: RecipeCategory | 'ALL') => category === 'ALL' ? recipes.length : recipes.filter((recipe) => recipe.category === category).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// BIOSYSTEM</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>RECIPES</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: dim }}>{recipes.length} recipes</span>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            style={{ padding: '4px 10px 4px 24px', fontSize: 10, width: 220, background: bgS, border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: adim, cursor: 'pointer', fontSize: 12 }}>×</button>}
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '5px 16px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>
          + ADD RECIPE
        </button>
        <button onClick={onClose} style={{ padding: '5px 12px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>
          × CLOSE
        </button>
      </div>

      <div style={{ flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 16px', background: bgS, overflowX: 'auto' }}>
        {(['ALL', ...RECIPE_CATEGORIES] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveCategory(tab); setSelectedId(null); }}
            style={{ padding: '10px 14px', fontSize: 10, border: 'none', borderBottom: `2px solid ${activeCategory === tab ? acc : 'transparent'}`, background: 'transparent', color: activeCategory === tab ? acc : dim, fontFamily: mono, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {tab} <span style={{ fontSize: 8, opacity: 0.6 }}>({countFor(tab)})</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {isLoading ? (
            <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontSize: 10, color: dim, opacity: 0.6, marginTop: 40, textAlign: 'center' }}>
              {search ? `No recipes matching "${search}"` : 'No recipes yet.'}
            </div>
          ) : filtered.map((recipe) => {
            const isSelected = selectedId === recipe.id;
            return (
              <div
                key={recipe.id}
                onClick={() => setSelectedId(isSelected ? null : recipe.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  marginBottom: 6,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(255,176,0,0.06)' : bgS,
                  border: `1px solid ${isSelected ? acc : 'rgba(153,104,0,0.4)'}`,
                }}
              >
                <span style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '1px 5px', letterSpacing: 1, flexShrink: 0 }}>{recipe.category}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 11, color: acc, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipe.name}</div>
                  <div style={{ fontSize: 9, color: dim }}>{recipe.servings} servings · {recipe.per_serving_calories} kcal / serving</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', gap: 10, fontSize: 9, color: dim, flexShrink: 0 }}>
                  <span>P {recipe.per_serving_protein_g}g</span>
                  <span>C {recipe.per_serving_carbs_g}g</span>
                  <span>F {recipe.per_serving_fat_g}g</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ width: selectedId ? 420 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 200ms ease', borderLeft: selectedId ? `1px solid ${adim}` : 'none', display: 'flex', flexDirection: 'column' }}>
          {selectedId && (
            <>
              <div style={{ height: 36, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px', background: bgS }}>
                <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: 'none', color: dim, fontFamily: mono, fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>
                  × CLOSE
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <RecipeDrawer recipeId={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            </>
          )}
        </div>
      </div>

      {showAdd && <RecipeModal open={showAdd} onClose={() => setShowAdd(false)} initialCategory={activeCategory === 'ALL' ? 'Dinner' : activeCategory} />}
    </div>
  );
}
