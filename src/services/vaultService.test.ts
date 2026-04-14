import { describe, expect, it } from 'vitest';
import type { VaultItem } from '@/types';
import { compareVaultItems, getVaultMetadataEntries, sanitizeVaultItemInput } from '@/services/vaultService';

describe('vaultService', () => {
  it('strips stale metadata when category changes', () => {
    const input = sanitizeVaultItemInput({
      title: 'Signal item',
      category: 'SIGNAL',
      completed_date: '2026-04-04',
      notes: 'Done',
      metadata: {
        version: '1.0',
        platform: 'Web',
        word_count: 1000,
      },
    });

    expect(input.metadata).toEqual({
      version: '1.0',
      platform: 'Web',
      stack: null,
      link_url: null,
    });
  });

  it('sorts newest completed items first', () => {
    const items: VaultItem[] = [
      { id: 'a', title: 'Older', category: 'SIGNAL', completed_date: '2026-04-01', notes: null, metadata: null, created_at: '', updated_at: '2026-04-01T00:00:00Z' },
      { id: 'b', title: 'Newer', category: 'SIGNAL', completed_date: '2026-04-03', notes: null, metadata: null, created_at: '', updated_at: '2026-04-03T00:00:00Z' },
    ];

    expect(items.sort(compareVaultItems).map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('returns only populated metadata entries', () => {
    const entries = getVaultMetadataEntries({
      id: '1',
      title: 'Archive item',
      category: 'ARCHIVE',
      completed_date: '2026-04-04',
      notes: null,
      metadata: { word_count: 1200, publisher: 'UPLINK', edition: null },
      created_at: '',
      updated_at: '',
    });

    expect(entries).toEqual([
      { key: 'word_count', label: 'WORD COUNT', value: '1200' },
      { key: 'publisher', label: 'PUBLISHER', value: 'UPLINK' },
    ]);
  });
});
