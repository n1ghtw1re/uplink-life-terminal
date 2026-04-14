import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useVaultActions } from '@/hooks/useVault';
import type { VaultCategory, VaultItem } from '@/types';
import { VAULT_CATEGORIES, VAULT_CATEGORY_DESCRIPTIONS, VAULT_METADATA_FIELDS, normalizeVaultDate, sanitizeVaultItemInput } from '@/services/vaultService';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const bgT = 'hsl(var(--bg-tertiary))';

interface VaultItemModalProps {
  open: boolean;
  onClose: () => void;
  item?: VaultItem | null;
  initialCategory?: VaultCategory;
}

export default function VaultItemModal({ open, onClose, item, initialCategory = 'SIGNAL' }: VaultItemModalProps) {
  const { createItem, updateItem } = useVaultActions();
  const isEditing = !!item;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VaultCategory>(initialCategory);
  const [completedDate, setCompletedDate] = useState(normalizeVaultDate(new Date()));
  const [notes, setNotes] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title ?? '');
    setCategory(item?.category ?? initialCategory);
    setCompletedDate(item?.completed_date ?? normalizeVaultDate(new Date()));
    setNotes(item?.notes ?? '');
    setMetadata(
      Object.fromEntries(
        Object.entries((item?.metadata ?? {}) as Record<string, unknown>).map(([key, value]) => [key, value == null ? '' : String(value)]),
      ),
    );
  }, [open, item, initialCategory]);

  const metadataFields = useMemo(() => VAULT_METADATA_FIELDS[category], [category]);
  const canSave = title.trim().length > 0 && completedDate.length > 0;

  const setMetadataField = (key: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const input = sanitizeVaultItemInput({
        title,
        category,
        completed_date: completedDate,
        notes,
        metadata,
      });

      if (item) {
        await updateItem.mutateAsync({ id: item.id, input });
      } else {
        await createItem.mutateAsync(input);
      }
      onClose();
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
    <Modal open={open} onClose={onClose} title={isEditing ? 'EDIT VAULT ITEM' : 'ADD VAULT ITEM'} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: mono, maxHeight: '78vh', overflowY: 'auto', paddingRight: 4 }}>
        <div>
          {fieldLabel('TITLE')}
          <input className="crt-input" style={{ width: '100%' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Completed work title..." autoFocus />
        </div>

        <div>
          {fieldLabel('CATEGORY')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {VAULT_CATEGORIES.map((option) => (
              <button
                key={option}
                onClick={() => setCategory(option)}
                style={{
                  padding: '4px 10px',
                  fontSize: 9,
                  fontFamily: mono,
                  cursor: 'pointer',
                  border: `1px solid ${category === option ? acc : adim}`,
                  background: category === option ? 'rgba(255,176,0,0.1)' : 'transparent',
                  color: category === option ? acc : dim,
                }}
              >
                {option}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: dim }}>{VAULT_CATEGORY_DESCRIPTIONS[category]}</div>
        </div>

        <div>
          {fieldLabel('COMPLETED DATE')}
          <input className="crt-input" style={{ width: '100%' }} type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
        </div>

        <div>
          {fieldLabel('NOTES', true)}
          <textarea
            className="crt-input"
            style={{ width: '100%', minHeight: 90, resize: 'vertical' as const }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you complete?"
          />
        </div>

        <div style={{ border: `1px solid ${adim}`, background: bgT, padding: 12 }}>
          <div style={{ fontSize: 9, color: adim, letterSpacing: 2, marginBottom: 10 }}>
            // {category} METADATA
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {metadataFields.map((field) => (
              <div key={field.key} style={{ gridColumn: field.type === 'url' ? '1 / -1' : undefined }}>
                {fieldLabel(field.label, true)}
                <input
                  className="crt-input"
                  style={{ width: '100%' }}
                  type={field.type}
                  value={metadata[field.key] ?? ''}
                  onChange={(e) => setMetadataField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

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
            {saving ? '>> SAVING...' : isEditing ? '>> SAVE ITEM' : '>> ADD ITEM'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
