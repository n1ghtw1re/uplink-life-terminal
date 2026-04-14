import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { refreshAppData } from '@/lib/refreshAppData';
import type { VaultCategory, VaultItem } from '@/types';
import { compareVaultItems, normalizeVaultItemRow, sanitizeVaultItemInput, type VaultItemInput } from '@/services/vaultService';

async function getVaultItems(): Promise<VaultItem[]> {
  const db = await getDB();
  const res = await db.query(`SELECT * FROM vault_items ORDER BY completed_date DESC, updated_at DESC, title ASC`);
  return res.rows.map((row) => normalizeVaultItemRow(row as unknown as Record<string, unknown>));
}

export function useVaultItems() {
  const query = useQuery({
    queryKey: ['vault-items'],
    queryFn: getVaultItems,
  });

  return {
    items: (query.data ?? []).slice().sort(compareVaultItems),
    isLoading: query.isLoading,
  };
}

export function useVaultByCategory(category: VaultCategory) {
  const { items, isLoading } = useVaultItems();
  return {
    items: items.filter((item) => item.category === category),
    isLoading,
  };
}

export function useVaultRecent(limit = 6) {
  const { items, isLoading } = useVaultItems();
  return {
    items: items.slice(0, limit),
    isLoading,
  };
}

export function useVaultItem(itemId: string | null) {
  const query = useQuery({
    queryKey: ['vault-item', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const db = await getDB();
      const res = await db.query(`SELECT * FROM vault_items WHERE id = $1 LIMIT 1`, [itemId]);
      const row = res.rows[0];
      return row ? normalizeVaultItemRow(row as unknown as Record<string, unknown>) : null;
    },
  });

  return {
    item: query.data ?? null,
    isLoading: query.isLoading,
  };
}

export function useVaultActions() {
  const queryClient = useQueryClient();

  const invalidateVault = async () => {
    await queryClient.invalidateQueries({ queryKey: ['vault-items'] });
    await queryClient.invalidateQueries({ queryKey: ['vault-item'] });
    await refreshAppData(queryClient);
  };

  const createItem = useMutation({
    mutationFn: async (input: VaultItemInput) => {
      const db = await getDB();
      const sanitized = sanitizeVaultItemInput(input);
      await db.query(
        `INSERT INTO vault_items (title, category, completed_date, notes, metadata, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
        [
          sanitized.title,
          sanitized.category,
          sanitized.completed_date,
          sanitized.notes,
          sanitized.metadata ? JSON.stringify(sanitized.metadata) : null,
        ],
      );
    },
    onSuccess: invalidateVault,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VaultItemInput }) => {
      const db = await getDB();
      const sanitized = sanitizeVaultItemInput(input);
      await db.query(
        `UPDATE vault_items
         SET title=$1, category=$2, completed_date=$3, notes=$4, metadata=$5::jsonb, updated_at=NOW()
         WHERE id=$6`,
        [
          sanitized.title,
          sanitized.category,
          sanitized.completed_date,
          sanitized.notes,
          sanitized.metadata ? JSON.stringify(sanitized.metadata) : null,
          id,
        ],
      );
    },
    onSuccess: invalidateVault,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const db = await getDB();
      await db.query(`DELETE FROM vault_items WHERE id=$1`, [id]);
    },
    onSuccess: invalidateVault,
  });

  return { createItem, updateItem, deleteItem };
}
