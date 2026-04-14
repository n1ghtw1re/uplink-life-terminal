import type { VaultCategory, VaultItem, VaultMetadata } from '@/types';

export interface VaultItemInput {
  title: string;
  category: VaultCategory;
  completed_date: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

export const VAULT_CATEGORIES: VaultCategory[] = ['SIGNAL', 'FREQUENCY', 'ARCHIVE', 'MATTER', 'PULSE'];

export const VAULT_CATEGORY_DESCRIPTIONS: Record<VaultCategory, string> = {
  SIGNAL: 'Digital and visual media.',
  FREQUENCY: 'Audio and sound works.',
  ARCHIVE: 'Written and static works.',
  MATTER: 'Physical and tangible objects.',
  PULSE: 'Live events and performances.',
};

type FieldType = 'text' | 'number' | 'date' | 'url';

export interface VaultMetadataField {
  key: string;
  label: string;
  type: FieldType;
  placeholder: string;
}

export const VAULT_METADATA_FIELDS: Record<VaultCategory, VaultMetadataField[]> = {
  SIGNAL: [
    { key: 'version', label: 'VERSION', type: 'text', placeholder: 'v1.0.0' },
    { key: 'platform', label: 'PLATFORM', type: 'text', placeholder: 'Web / iOS / Android' },
    { key: 'stack', label: 'STACK / SOFTWARE', type: 'text', placeholder: 'React, Blender, Unreal...' },
    { key: 'link_url', label: 'LINK URL', type: 'url', placeholder: 'https://...' },
  ],
  FREQUENCY: [
    { key: 'duration', label: 'DURATION', type: 'text', placeholder: '03:42' },
    { key: 'format', label: 'FORMAT', type: 'text', placeholder: 'Vinyl / DJ / Mix / Podcast / Album' },
    { key: 'collaborators', label: 'COLLABORATORS', type: 'text', placeholder: 'Producer, guest, engineer...' },
    { key: 'link_url', label: 'LINK URL', type: 'url', placeholder: 'https://...' },
  ],
  ARCHIVE: [
    { key: 'word_count', label: 'WORD COUNT', type: 'number', placeholder: '1200' },
    { key: 'page_count', label: 'PAGE COUNT', type: 'number', placeholder: '24' },
    { key: 'publisher', label: 'PUBLISHER', type: 'text', placeholder: 'Publisher name' },
    { key: 'edition', label: 'EDITION', type: 'text', placeholder: 'Second edition' },
    { key: 'link_url', label: 'LINK URL', type: 'url', placeholder: 'https://...' },
  ],
  MATTER: [
    { key: 'materials', label: 'MATERIALS', type: 'text', placeholder: 'Wood, steel, canvas...' },
    { key: 'dimensions', label: 'DIMENSIONS', type: 'text', placeholder: '120 x 60 x 40 cm' },
    { key: 'weight', label: 'WEIGHT', type: 'text', placeholder: '2.5 kg' },
  ],
  PULSE: [
    { key: 'venue', label: 'VENUE', type: 'text', placeholder: 'Bangkok Art Hall' },
    { key: 'event_date', label: 'EVENT DATE', type: 'date', placeholder: '' },
    { key: 'audience_size', label: 'AUDIENCE SIZE', type: 'number', placeholder: '200' },
    { key: 'role', label: 'ROLE', type: 'text', placeholder: 'Lead / Host / Keynote' },
  ],
};

const DISPLAY_LABELS: Record<string, string> = {
  version: 'VERSION',
  platform: 'PLATFORM',
  stack: 'STACK / SOFTWARE',
  link_url: 'LINK URL',
  duration: 'DURATION',
  format: 'FORMAT',
  collaborators: 'COLLABORATORS',
  word_count: 'WORD COUNT',
  page_count: 'PAGE COUNT',
  publisher: 'PUBLISHER',
  edition: 'EDITION',
  materials: 'MATERIALS',
  dimensions: 'DIMENSIONS',
  weight: 'WEIGHT',
  venue: 'VENUE',
  event_date: 'EVENT DATE',
  audience_size: 'AUDIENCE SIZE',
  role: 'ROLE',
};

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeVaultDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return toLocalDateString(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return toLocalDateString(parsed);
}

export function sanitizeVaultMetadata(category: VaultCategory, metadata: Record<string, unknown> | null | undefined): VaultMetadata | null {
  const raw = metadata ?? {};

  switch (category) {
    case 'SIGNAL': {
      const normalized = {
        version: normalizeString(raw.version),
        platform: normalizeString(raw.platform),
        stack: normalizeString(raw.stack),
        link_url: normalizeString(raw.link_url),
      };
      return Object.values(normalized).some(Boolean) ? normalized : null;
    }
    case 'FREQUENCY': {
      const normalized = {
        duration: normalizeString(raw.duration),
        format: normalizeString(raw.format),
        collaborators: normalizeString(raw.collaborators),
        link_url: normalizeString(raw.link_url),
      };
      return Object.values(normalized).some(Boolean) ? normalized : null;
    }
    case 'ARCHIVE': {
      const normalized = {
        word_count: normalizeNumber(raw.word_count),
        page_count: normalizeNumber(raw.page_count),
        publisher: normalizeString(raw.publisher),
        edition: normalizeString(raw.edition),
        link_url: normalizeString(raw.link_url),
      };
      return Object.values(normalized).some((value) => value !== null && value !== undefined && value !== '') ? normalized : null;
    }
    case 'MATTER': {
      const normalized = {
        materials: normalizeString(raw.materials),
        dimensions: normalizeString(raw.dimensions),
        weight: normalizeString(raw.weight),
      };
      return Object.values(normalized).some(Boolean) ? normalized : null;
    }
    case 'PULSE': {
      const normalized = {
        venue: normalizeString(raw.venue),
        event_date: normalizeVaultDate(raw.event_date as string | Date | null | undefined) || null,
        audience_size: normalizeNumber(raw.audience_size),
        role: normalizeString(raw.role),
      };
      return Object.values(normalized).some((value) => value !== null && value !== undefined && value !== '') ? normalized : null;
    }
  }
}

export function sanitizeVaultItemInput(input: VaultItemInput): VaultItemInput {
  return {
    title: input.title.trim(),
    category: input.category,
    completed_date: normalizeVaultDate(input.completed_date),
    notes: normalizeString(input.notes),
    metadata: sanitizeVaultMetadata(input.category, input.metadata) as Record<string, unknown> | null,
  };
}

export function normalizeVaultItemRow(row: Record<string, unknown>): VaultItem {
  let metadata: VaultMetadata | null = null;
  if (typeof row.metadata === 'string') {
    try {
      metadata = JSON.parse(row.metadata) as VaultMetadata;
    } catch {
      metadata = null;
    }
  } else if (row.metadata && typeof row.metadata === 'object') {
    metadata = row.metadata as VaultMetadata;
  }

  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    category: String(row.category ?? 'SIGNAL') as VaultCategory,
    completed_date: normalizeVaultDate(row.completed_date as string | Date),
    notes: normalizeString(row.notes),
    metadata,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export function compareVaultItems(a: VaultItem, b: VaultItem): number {
  const dateCompare = b.completed_date.localeCompare(a.completed_date);
  if (dateCompare !== 0) return dateCompare;
  const updatedCompare = String(b.updated_at).localeCompare(String(a.updated_at));
  if (updatedCompare !== 0) return updatedCompare;
  return a.title.localeCompare(b.title);
}

export function getVaultMetadataEntries(item: VaultItem): Array<{ key: string; label: string; value: string }> {
  if (!item.metadata) return [];

  return Object.entries(item.metadata)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => ({ key, label: DISPLAY_LABELS[key] ?? key.toUpperCase(), value: String(value) }));
}

export function getVaultNotesPreview(notes: string | null | undefined, maxLength = 120): string {
  if (!notes) return '';
  if (notes.length <= maxLength) return notes;
  return `${notes.slice(0, maxLength - 1)}...`;
}
