import { useMemo, useState } from 'react';
import { useVaultActions, useVaultItem } from '@/hooks/useVault';
import VaultItemModal from '@/components/modals/VaultItemModal';
import { getVaultMetadataEntries } from '@/services/vaultService';

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

interface VaultItemDrawerProps {
  itemId: string;
  onClose?: () => void;
}

export default function VaultItemDrawer({ itemId, onClose }: VaultItemDrawerProps) {
  const { item, isLoading } = useVaultItem(itemId);
  const { deleteItem } = useVaultActions();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const metadataEntries = useMemo(() => (item ? getVaultMetadataEntries(item) : []), [item]);

  const handleDelete = async () => {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteItem.mutateAsync(item.id);
    onClose?.();
  };

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>LOADING...</div>;
  if (!item) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dim }}>VAULT ITEM NOT FOUND</div>;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${adim}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 6 }}>// VAULT</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ fontFamily: vt, fontSize: 22, color: acc, flex: 1, lineHeight: 1.1 }}>{item.title.toUpperCase()}</div>
            <span style={{ fontSize: 9, color: acc, border: `1px solid ${acc}`, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>{item.category}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 9, color: dim }}>COMPLETE: {item.completed_date}</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 20px 16px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {item.notes && (
            <>
              <SectionLabel label="NOTES" />
              <div style={{ fontSize: 10, color: dim, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.notes}</div>
            </>
          )}

          <SectionLabel label="DETAILS" />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
              <span style={{ color: adim }}>CATEGORY</span>
              <span style={{ color: acc }}>{item.category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
              <span style={{ color: adim }}>COMPLETED</span>
              <span style={{ color: acc }}>{item.completed_date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
              <span style={{ color: adim }}>CREATED</span>
              <span style={{ color: acc }}>{String(item.created_at).slice(0, 10)}</span>
            </div>
          </div>

          {metadataEntries.length > 0 && (
            <>
              <SectionLabel label="METADATA" />
              <div style={{ display: 'grid', gap: 8 }}>
                {metadataEntries.map((entry) => (
                  <div key={entry.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10 }}>
                    <span style={{ color: adim }}>{entry.label}</span>
                    {entry.key === 'link_url' ? (
                      <a href={entry.value} target="_blank" rel="noreferrer" style={{ color: acc, textAlign: 'right', wordBreak: 'break-all' }}>
                        {entry.value}
                      </a>
                    ) : (
                      <span style={{ color: acc, textAlign: 'right' }}>{entry.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
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

      {showEdit && <VaultItemModal open={showEdit} onClose={() => setShowEdit(false)} item={item} />}
    </>
  );
}
