// ============================================================
// src/components/overlays/ResourcesPage.tsx
// ============================================================
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '@/lib/db';
import { useResources } from '@/hooks/useResources';
import Modal from '@/components/Modal';
import AddResourceModal from '@/components/modals/AddResourceModal';
import ResourceDetailDrawer from '@/components/drawer/ResourceDetailDrawer';

const mono  = "'IBM Plex Mono', monospace";
const vt    = "'VT323', monospace";
const acc   = 'hsl(var(--accent))';
const adim  = 'hsl(var(--accent-dim))';
const dim   = 'hsl(var(--text-dim))';
const bgP   = 'hsl(var(--bg-primary))';
const bgS   = 'hsl(var(--bg-secondary))';

type SortKey = 'name' | 'status' | 'category' | 'date';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'status',   label: 'STATUS' },
  { key: 'date',     label: 'RECENT' },
  { key: 'name',     label: 'A–Z'    },
  { key: 'category', label: 'CATEGORY' },
];

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'LEARNING': 'Courses, tutorials, lectures, documentation, and structured learning materials.',
  'REFERENCE': 'Wikis, documentation, cheat sheets, glossaries, and informational resources.',
  'UTILITIES': 'Useful websites, apps, calculators, generators, and practical utilities.',
  'INSPIRATION': 'Content that sparks creativity or new thinking (articles, galleries, mood boards).',
  'MEDIA': 'News sites, blogs, podcasts, YouTube channels, and current event sources.',
  'COMMUNITY': 'Online communities, Discord servers, Reddit threads, discussion boards.',
  'ASSETS': 'Fonts, templates, icons, datasets, stock media, and downloadable resources.',
  'BUSINESS': 'Investment resources, financial tools, market tracking, entrepreneurship content.',
  'HEALTH': 'Fitness guides, nutrition info, mental health resources, medical references.',
  'PRODUCTIVITY': 'Frameworks, workflows, templates, and systems for organization and efficiency.',
  'PERSONAL': 'Saved notes, personal documents, private links, and archived materials.',
  'ENTERTAINMENT': 'Games, shows, movies, fun websites, and casual content.',
  'MISC': 'Catch-all for anything that doesn’t fit elsewhere.',
};

interface Props { onClose: () => void; onResourceClick?: (id: string) => void; }

export default function ResourcesPage({ onClose, onResourceClick }: Props) {
  const queryClient = useQueryClient();
  const { data: resources = [], isLoading } = useResources();

  const [sortKey, setSortKey]         = useState<SortKey>('status');
  const [search, setSearch]           = useState('');
  const [showAdd, setShowAdd]         = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter]   = useState<string>('ALL');

  // All category tabs
  const categories = ['ALL', 'Learning', 'Reference', 'Utilities', 'Inspiration', 'Media', 'Community', 'Assets', 'Business', 'Health', 'Productivity', 'Personal', 'Entertainment', 'Misc'];

  // Filter + sort
  const filtered = useMemo(() => {
    let base = resources;
    if (categoryFilter !== 'ALL') base = base.filter(r => r.category === categoryFilter);
    if (search.trim()) base = base.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || (r.description && r.description.toLowerCase().includes(search.toLowerCase())));
    return [...base].sort((a, b) => {
      if (sortKey === 'status') {
        if (a.status !== b.status) return a.status === 'UNREAD' ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortKey === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === 'name')  return a.title.localeCompare(b.title);
      if (sortKey === 'category') return a.category.localeCompare(b.category);
      return 0;
    });
  }, [resources, sortKey, search, categoryFilter]);

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const db = await getDB();
      await db.exec(`UPDATE resources SET status = '${status}' WHERE id = '${id}';`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: bgP, display: 'flex', flexDirection: 'column', fontFamily: mono }}>

      {/* Header */}
      <div style={{ height: 56, flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontFamily: mono, fontSize: 9, color: adim, letterSpacing: 2 }}>// ARSENAL</span>
        <span style={{ fontFamily: vt, fontSize: 22, color: acc }}>RESOURCES</span>
        <span style={{ fontSize: 10, color: dim }}>{resources.filter(r => r.status === 'UNREAD').length} unread</span>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 8, fontSize: 10, color: adim, pointerEvents: 'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
            style={{ padding: '4px 10px 4px 24px', fontSize: 10, width: 180, background: bgS, border: `1px solid ${search ? acc : adim}`, color: acc, fontFamily: mono, outline: 'none' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, background: 'transparent', border: 'none', color: adim, cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>}
        </div>
        {/* Sort */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SORT_OPTIONS.map(s => (
            <button key={s.key} onClick={() => setSortKey(s.key)} style={{
              padding: '3px 8px', fontSize: 9, fontFamily: mono, cursor: 'pointer', letterSpacing: 1,
              border: `1px solid ${sortKey === s.key ? acc : adim}`,
              background: sortKey === s.key ? 'rgba(255,176,0,0.1)' : 'transparent',
              color: sortKey === s.key ? acc : dim,
            }}>{s.label}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} style={{ padding: '5px 16px', fontSize: 10, border: `1px solid ${acc}`, background: 'rgba(255,176,0,0.1)', color: acc, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>+ ADD RESOURCE</button>
        <button onClick={onClose} style={{ padding: '5px 12px', fontSize: 10, border: `1px solid ${adim}`, background: 'transparent', color: dim, fontFamily: mono, cursor: 'pointer', letterSpacing: 1 }}>× CLOSE</button>
      </div>

      {/* Category filter tabs */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${adim}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 2, background: bgS, overflowX: 'auto' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategoryFilter(c)} style={{
            padding: '8px 14px', fontSize: 10, flexShrink: 0, border: 'none',
            borderBottom: `2px solid ${categoryFilter === c ? acc : 'transparent'}`,
            background: 'transparent', color: categoryFilter === c ? acc : dim,
            fontFamily: mono, cursor: 'pointer',
          }}>{c.toUpperCase()}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Resource list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin', scrollbarColor: `${adim} ${bgS}` }}>
          {categoryFilter !== 'ALL' && CATEGORY_DESCRIPTIONS[categoryFilter.toUpperCase()] && (
            <div style={{ padding: '0 0 16px 0', borderBottom: `1px solid rgba(153,104,0,0.2)`, marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: acc, fontFamily: vt, letterSpacing: 1, marginBottom: 4 }}>// {categoryFilter.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: dim, lineHeight: 1.5 }}>{CATEGORY_DESCRIPTIONS[categoryFilter.toUpperCase()]}</div>
            </div>
          )}
          {isLoading ? (
            <div style={{ fontSize: 10, color: dim }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontSize: 10, color: dim, opacity: 0.6, paddingTop: 20 }}>
              {search ? `No resources matching "${search}"` : 'No resources yet — click + ADD RESOURCE'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(resource => {
                const isSelected = selectedResourceId === resource.id;
                const isRead = resource.status === 'READ';

                return (
                  <div key={resource.id}
                    onClick={() => setSelectedResourceId(isSelected ? null : resource.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '10px 16px', cursor: 'pointer',
                      background: isSelected ? 'rgba(255,176,0,0.04)' : bgS,
                      border: `1px solid ${isSelected ? acc : 'rgba(153,104,0,0.4)'}`,
                      opacity: isRead ? 0.6 : 1,
                      transition: 'border-color 150ms',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = adim; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; }}
                  >
                    {/* Read/Unread checkbox */}
                    <div onClick={e => { e.stopPropagation(); toggleStatus.mutate({ id: resource.id, status: isRead ? 'UNREAD' : 'READ' }); }}
                      style={{ width: 14, height: 14, flexShrink: 0, border: `1px solid ${isRead ? adim : acc}`, background: isRead ? 'transparent' : 'rgba(255,176,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: acc, cursor: 'pointer' }}
                    >{isRead ? '×' : ''}</div>

                    {/* Category badge */}
                    <span style={{ fontSize: 8, color: adim, border: `1px solid ${adim}`, padding: '1px 5px', letterSpacing: 1, flexShrink: 0, opacity: 0.8 }}>
                      {resource.category.toUpperCase()}
                    </span>

                    {/* Name */}
                    <span style={{ flex: 1, fontSize: 12, color: isRead ? dim : acc, fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {resource.title}
                    </span>

                    {/* Timestamp */}
                    <span style={{ fontSize: 10, color: dim, width: 80, textAlign: 'right', flexShrink: 0 }}>
                      {new Date(resource.createdAt).toLocaleDateString()}
                    </span>

                    <span style={{ color: adim, fontSize: 10, flexShrink: 0 }}>›</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer */}
        <div style={{ width: selectedResource ? 420 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 200ms ease', borderLeft: selectedResource ? `1px solid ${adim}` : 'none', background: bgS, display: 'flex', flexDirection: 'column' }}>
          {selectedResource && (
            <ResourceDetailDrawer
              resourceId={selectedResource.id}
              onClose={() => setSelectedResourceId(null)}
              isPageEmbedded={true}
            />
          )}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="ADD RESOURCE" width={680}>
        <AddResourceModal onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}
