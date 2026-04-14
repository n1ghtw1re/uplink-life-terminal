import { useState } from 'react';
import IngredientModal from '@/components/modals/IngredientModal';
import { useIngredientActions, useIngredientItem } from '@/hooks/useIngredients';
import { formatIngredientMacro } from '@/services/ingredientService';

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

interface IngredientDrawerProps {
  ingredientId: string;
  onClose?: () => void;
}

export default function IngredientDrawer({ ingredientId, onClose }: IngredientDrawerProps) {
  const { item, isLoading } = useIngredientItem(ingredientId);
  const { deleteIngredient } = useIngredientActions();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!item || item.source !== 'CUSTOM') return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteIngredient.mutateAsync(item.id);
    onClose?.();
  };

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!item) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>INGREDIENT NOT FOUND</div>;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// BIOSYSTEM</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: vt, fontSize: 22, color: acc, flex: 1, lineHeight: 1.1 }}>{item.name.toUpperCase()}</div>
            <span style={{ fontSize: 9, color: item.source === 'CUSTOM' ? '#44ff88' : acc, border: `1px solid ${item.source === 'CUSTOM' ? '#44ff88' : acc}`, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>
              {item.source}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 9, color: dim }}>{item.category}</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 20px 16px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          <SectionLabel label="MACROS / 100G" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['CALORIES', formatIngredientMacro(item.calories, '')],
              ['PROTEIN', formatIngredientMacro(item.protein_g)],
              ['CARBS', formatIngredientMacro(item.carbs_g)],
              ['FAT', formatIngredientMacro(item.fat_g)],
            ].map(([label, value]) => (
              <div key={label} style={{ border: `1px solid ${adim}`, padding: '10px 12px' }}>
                <div style={{ fontSize: 8, color: adim, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: vt, fontSize: 20, color: acc }}>{value}</div>
              </div>
            ))}
          </div>

          <SectionLabel label="DETAILS" />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
              <span style={{ color: adim }}>SOURCE</span>
              <span style={{ color: acc }}>{item.source}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
              <span style={{ color: adim }}>CATEGORY</span>
              <span style={{ color: acc, textAlign: 'right' }}>{item.category}</span>
            </div>
            {item.created_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
                <span style={{ color: adim }}>CREATED</span>
                <span style={{ color: acc }}>{String(item.created_at).slice(0, 10)}</span>
              </div>
            )}
            {item.updated_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
                <span style={{ color: adim }}>UPDATED</span>
                <span style={{ color: acc }}>{String(item.updated_at).slice(0, 10)}</span>
              </div>
            )}
          </div>

          {item.notes && (
            <>
              <SectionLabel label="NOTES" />
              <div style={{ fontSize: 10, color: dim, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.notes}</div>
            </>
          )}
        </div>

        {item.source === 'CUSTOM' && (
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
        )}
      </div>

      {showEdit && item.source === 'CUSTOM' && <IngredientModal open={showEdit} onClose={() => setShowEdit(false)} ingredient={item} />}
    </>
  );
}
