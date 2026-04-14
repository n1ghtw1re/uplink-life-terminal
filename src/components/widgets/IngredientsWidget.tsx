import { useMemo, useState } from 'react';
import WidgetWrapper from '@/components/WidgetWrapper';
import IngredientModal from '@/components/modals/IngredientModal';
import { useIngredients, useRecentCustomIngredients } from '@/hooks/useIngredients';
import { formatIngredientMacro } from '@/services/ingredientService';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';

type IngredientWidgetFilter = 'ALL' | 'RECENT' | 'CUSTOM' | 'USDA';

const FILTER_OPTIONS: IngredientWidgetFilter[] = ['ALL', 'RECENT', 'CUSTOM', 'USDA'];

interface IngredientsWidgetProps {
  onClose?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenIngredients?: () => void;
  onIngredientClick?: (id: string) => void;
}

export default function IngredientsWidget({ onClose, onFullscreen, isFullscreen, onOpenIngredients, onIngredientClick }: IngredientsWidgetProps) {
  const { items, customItems, usdaItems, categories, isLoading } = useIngredients();
  const { items: recentCustomItems } = useRecentCustomIngredients(8);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<IngredientWidgetFilter>('ALL');
  const [category, setCategory] = useState('ALL');

  const displayItems = useMemo(() => {
    let base = items;
    if (filter === 'CUSTOM') base = customItems;
    if (filter === 'USDA') base = usdaItems;
    if (filter === 'RECENT') base = recentCustomItems;
    if (category !== 'ALL') base = base.filter((item) => item.category === category);
    if (search.trim()) {
      const query = search.toLowerCase();
      base = base.filter((item) => item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
    }
    return base.slice(0, 8);
  }, [category, customItems, filter, items, recentCustomItems, search, usdaItems]);

  return (
    <>
      <WidgetWrapper title="INGREDIENTS" onClose={onClose} onFullscreen={onFullscreen} isFullscreen={isFullscreen}>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            style={{ width: '100%', padding: '3px 8px 3px 20px', fontSize: 9, background: 'hsl(var(--bg-tertiary))', border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none', boxSizing: 'border-box' as const }}
          />
          <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: adim, pointerEvents: 'none' }}>⌕</span>
          {search && <span onClick={() => setSearch('')} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: adim, cursor: 'pointer' }}>×</span>}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              style={{
                padding: '2px 8px',
                fontSize: 9,
                fontFamily: mono,
                cursor: 'pointer',
                letterSpacing: 1,
                border: `1px solid ${filter === option ? acc : adim}`,
                background: filter === option ? 'rgba(255,176,0,0.1)' : 'transparent',
                color: filter === option ? acc : dim,
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="crt-select-wrapper" style={{ width: '100%', marginBottom: 10 }}>
          <select className="crt-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="ALL">ALL CATEGORIES</option>
            {categories.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>LOADING...</div>
        ) : displayItems.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 10, color: dim }}>
            {filter === 'RECENT' ? 'No custom ingredients added yet.' : 'No ingredients match this filter.'}
          </div>
        ) : (
          <div>
            {displayItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onIngredientClick?.(item.id)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, cursor: onIngredientClick ? 'pointer' : 'default' }}
              >
                <span style={{ fontSize: 8, color: item.source === 'CUSTOM' ? '#44ff88' : acc, flexShrink: 0 }}>●</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: acc, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: mono }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 8, color: item.source === 'CUSTOM' ? '#44ff88' : adim, border: `1px solid ${item.source === 'CUSTOM' ? '#44ff88' : adim}`, padding: '1px 4px', flexShrink: 0 }}>
                      {item.source}
                    </span>
                  </div>
                  <div style={{ fontSize: 8, color: dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.category} · {formatIngredientMacro(item.calories, '')} kcal · P {formatIngredientMacro(item.protein_g)} · C {formatIngredientMacro(item.carbs_g)} · F {formatIngredientMacro(item.fat_g)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${adim}`, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            + ADD INGREDIENT
          </button>
          <button onClick={onOpenIngredients} style={{ background: 'transparent', border: 'none', fontFamily: mono, fontSize: 9, color: adim, cursor: 'pointer', letterSpacing: 1 }}>
            VIEW ALL {'>'}
          </button>
        </div>
      </WidgetWrapper>

      {showAdd && <IngredientModal open={showAdd} onClose={() => setShowAdd(false)} />}
    </>
  );
}
