// ============================================================
// src/components/drawer/MediaDetailDrawer.tsx
// ============================================================
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { awardXP, XP_VALUES } from '@/services/xpService';
import { STAT_META, StatKey } from '@/types';

// ── Types ─────────────────────────────────────────────────────

type MediaType   = 'book' | 'comic' | 'film' | 'documentary' | 'tv' | 'album';
type MediaStatus = 'READING' | 'WATCHING' | 'LISTENING' | 'QUEUED' | 'FINISHED' | 'DROPPED';

interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  creator: string | null;
  year: number | null;
  status: MediaStatus;
  linked_stat: StatKey | null;
  linked_skill_ids: string[];
  rating: number | null;
  notes: string | null;
  is_legacy: boolean;
  completed_at: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

interface Props {
  mediaId: string;
  onClose?: () => void;
}

// ── Shared styles ─────────────────────────────────────────────

const mono      = "'IBM Plex Mono', monospace";
const vt        = "'VT323', monospace";
const accent    = 'hsl(var(--accent))';
const accentDim = 'hsl(var(--accent-dim))';
const dimText   = 'hsl(var(--text-dim))';
const bgSec     = 'hsl(var(--bg-secondary))';
const bgTer     = 'hsl(var(--bg-tertiary))';

// ── Helpers ───────────────────────────────────────────────────

function getXPValue(type: MediaType): number {
  switch (type) {
    case 'book':        return XP_VALUES.BOOK_COMPLETE;
    case 'comic':       return XP_VALUES.COMIC_COMPLETE;
    case 'film':        return XP_VALUES.FILM_WATCHED;
    case 'documentary': return XP_VALUES.DOCUMENTARY_WATCHED;
    case 'tv':          return XP_VALUES.TV_SERIES_COMPLETE;
    case 'album':       return XP_VALUES.ALBUM_LISTENED;
  }
}

function getSourceType(type: MediaType): string {
  switch (type) {
    case 'book':        return 'book_complete';
    case 'comic':       return 'comic_complete';
    case 'film':        return 'film_watched';
    case 'documentary': return 'documentary_watched';
    case 'tv':          return 'tv_series';
    case 'album':       return 'album_listened';
  }
}

function getInProgressStatus(type: MediaType): MediaStatus {
  if (type === 'album') return 'LISTENING';
  if (type === 'book' || type === 'comic') return 'READING';
  return 'WATCHING';
}

function getFinishLabel(type: MediaType): string {
  if (type === 'film' || type === 'documentary') return 'WATCHED';
  if (type === 'album') return 'LISTENED';
  return 'FINISHED';
}

function statusColor(status: MediaStatus): string {
  if (status === 'FINISHED') return '#44ff88';
  if (status === 'DROPPED')  return '#ff4444';
  if (status === 'QUEUED')   return dimText;
  return accent;
}

// ── Sub-components ────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: mono, fontSize: 9,
      color: accentDim, letterSpacing: 2,
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '16px 0 8px',
    }}>
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(153,104,0,0.3)' }} />
    </div>
  );
}

function StarRating({ rating, onRate }: { rating: number | null; onRate: (r: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? rating ?? 0;
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => onRate(n === rating ? 0 : n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          style={{
            cursor: 'pointer', fontSize: 16,
            color: n <= display ? accent : 'rgba(153,104,0,0.3)',
            textShadow: n <= display ? '0 0 6px rgba(255,176,0,0.5)' : 'none',
            transition: 'all 100ms',
          }}
        >★</span>
      ))}
      {rating != null && rating > 0 && (
        <span style={{ fontFamily: mono, fontSize: 9, color: dimText, marginLeft: 4, alignSelf: 'center' }}>
          {rating}/5
        </span>
      )}
    </div>
  );
}

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ background: bgTer, border: '1px solid hsl(var(--accent-dim))', height: 6, flex: 1 }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: accent,
        boxShadow: '0 0 6px rgba(255,176,0,0.4)',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      border: '1px solid #ff3300', padding: '10px 12px',
      background: 'rgba(255,51,0,0.06)', marginTop: 8,
    }}>
      <div style={{ fontFamily: mono, fontSize: 10, color: '#ff4400', marginBottom: 8 }}>
        REMOVE MEDIA ITEM? This cannot be undone.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} style={{
          flex: 1, height: 30, background: 'transparent',
          border: '1px solid #ff4400', color: '#ff4400',
          fontFamily: mono, fontSize: 10, cursor: 'pointer',
        }}>[ CONFIRM DELETE ]</button>
        <button onClick={onCancel} style={{
          flex: 1, height: 30, background: 'transparent',
          border: '1px solid hsl(var(--accent-dim))', color: dimText,
          fontFamily: mono, fontSize: 10, cursor: 'pointer',
        }}>[ CANCEL ]</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function MediaDetailDrawer({ mediaId, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notesValue, setNotesValue]           = useState<string | null>(null);
  const [showDelete, setShowDelete]           = useState(false);
  const [lastXP, setLastXP]                   = useState<number | null>(null);
  const [pageInput, setPageInput]             = useState('');
  const [editingProgress, setEditingProgress] = useState(false);
  const [seasonInput, setSeasonInput]         = useState('');

  // ── Fetch — uses 'media' table (correct schema) ───────────

  const { data: item, isLoading } = useQuery({
    queryKey: ['media-item', mediaId],
    enabled: !!mediaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('id', mediaId)
        .single();
      if (error) throw error;
      return data as MediaItem;
    },
  });

  // ── Mutations ─────────────────────────────────────────────

  const updateItem = useMutation({
    mutationFn: async (patch: Partial<MediaItem>) => {
      const { error } = await supabase
        .from('media')
        .update(patch as any)
        .eq('id', mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-item', mediaId] });
      queryClient.invalidateQueries({ queryKey: ['media', user?.id] });
    },
  });

  const markFinished = useMutation({
    mutationFn: async () => {
      if (!user || !item) return;
      const completedAt = new Date().toISOString();
      await supabase
        .from('media')
        .update({ status: 'FINISHED', completed_at: completedAt })
        .eq('id', mediaId);

      const statKeys = item.linked_stat ? [item.linked_stat] : [] as StatKey[];
      const skillIds = item.linked_skill_ids ?? [];
      const baseXP   = getXPValue(item.type);
      const source   = getSourceType(item.type) as any;

      await awardXP({
        userId: user.id,
        source,
        sourceId: mediaId,
        baseAmount: baseXP,
        statKeys,
        skillId: skillIds[0] ?? undefined,
        notes: item.title,
      });

      setLastXP(baseXP);
      setTimeout(() => setLastXP(null), 3000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-item', mediaId] });
      queryClient.invalidateQueries({ queryKey: ['media', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['stats', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['operator', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['xp-recent', user?.id] });
    },
  });

  const updatePageProgress = useMutation({
    mutationFn: async (currentPage: number) => {
      const newMeta = { ...(item?.meta ?? {}), page_current: currentPage };
      await supabase.from('media').update({ meta: newMeta as any }).eq('id', mediaId);
    },
  });

  const updateTVProgress = useMutation({
    mutationFn: async (season: number) => {
      const newMeta = { ...(item?.meta ?? {}), current_season: season };
      await supabase.from('media').update({ meta: newMeta as any }).eq('id', mediaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-item', mediaId] });
      setEditingProgress(false);
      setSeasonInput('');
    },
  });

  const deleteItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('media').delete().eq('id', mediaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', user?.id] });
      onClose?.();
    },
  });

  // ── Loading / not found ───────────────────────────────────

  if (isLoading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>LOADING...</div>;
  if (!item)     return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: dimText }}>ITEM NOT FOUND</div>;

  const meta          = (item.meta ?? {}) as Record<string, any>;
  const currentPage   = meta.page_current  as number | undefined;
  const totalPages    = meta.pages         as number | undefined;
  const currentSeason = meta.current_season as number | undefined;
  const totalSeasons  = meta.seasons       as number | undefined;
  const runtime       = meta.runtime       as number | undefined;
  const platform      = meta.platform      as string | undefined;
  const issueCount    = meta.issue_count   as number | undefined;
  const baseXP        = getXPValue(item.type);
  const isFinished    = item.status === 'FINISHED';

  const progressPct = (currentPage && totalPages)
    ? Math.min(100, Math.round((currentPage / totalPages) * 100))
    : null;

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: mono }}>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid hsl(var(--accent-dim))',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 9, color: accentDim, letterSpacing: 2 }}>
            // {item.type.toUpperCase()}
          </span>
          <span style={{
            fontSize: 9, color: statusColor(item.status),
            border: `1px solid ${statusColor(item.status)}`,
            padding: '1px 6px', letterSpacing: 1,
          }}>
            {item.status}
          </span>
          {item.is_legacy && (
            <span style={{
              fontSize: 9, color: dimText,
              border: '1px solid rgba(153,104,0,0.4)',
              padding: '1px 6px', letterSpacing: 1, opacity: 0.6,
            }}>LEGACY</span>
          )}
        </div>

        <div style={{
          fontFamily: vt, fontSize: 22, color: accent,
          textShadow: '0 0 10px rgba(255,176,0,0.3)',
          lineHeight: 1.1, marginBottom: 4,
        }}>
          {item.title}
        </div>

        <div style={{ fontSize: 10, color: dimText, marginBottom: 8 }}>
          {[
            item.creator,
            item.year?.toString(),
            runtime ? `${runtime} min` : null,
            totalPages ? `${totalPages} pages` : null,
            issueCount ? `${issueCount} issues` : null,
            totalSeasons ? `${totalSeasons} seasons` : null,
            platform,
          ].filter(Boolean).join('  ·  ')}
        </div>

        {/* Linked stat tag */}
        {item.linked_stat && (
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontSize: 9, color: accentDim,
              border: '1px solid hsl(var(--accent-dim))',
              padding: '1px 6px', letterSpacing: 1,
            }}>
              {STAT_META[item.linked_stat]?.icon} {item.linked_stat.toUpperCase()}
            </span>
          </div>
        )}

        {/* Book/comic progress */}
        {(item.type === 'book' || item.type === 'comic') && totalPages && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <XPBar value={currentPage ?? 0} max={totalPages} />
              <span style={{ fontSize: 10, color: dimText, flexShrink: 0 }}>{progressPct ?? 0}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 9, color: dimText }}>pg {currentPage ?? 0} / {totalPages}</span>
              {!isFinished && !editingProgress && (
                <span
                  onClick={() => { setEditingProgress(true); setPageInput(String(currentPage ?? '')); }}
                  style={{ fontSize: 9, color: accentDim, cursor: 'pointer', opacity: 0.7 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                >[ UPDATE ]</span>
              )}
            </div>
            {editingProgress && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  autoFocus type="number" value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { const n = parseInt(pageInput); if (!isNaN(n)) updatePageProgress.mutate(Math.min(n, totalPages)); }
                    if (e.key === 'Escape') setEditingProgress(false);
                  }}
                  placeholder="current page"
                  style={{ flex: 1, background: bgTer, border: '1px solid hsl(var(--accent-dim))', color: accent, fontFamily: mono, fontSize: 11, padding: '4px 8px', outline: 'none' }}
                />
                <button onClick={() => { const n = parseInt(pageInput); if (!isNaN(n)) updatePageProgress.mutate(Math.min(n, totalPages)); }}
                  style={{ background: 'transparent', border: '1px solid hsl(var(--accent-dim))', color: accent, fontFamily: mono, fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>SAVE</button>
                <button onClick={() => setEditingProgress(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(153,104,0,0.4)', color: dimText, fontFamily: mono, fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}>×</button>
              </div>
            )}
          </div>
        )}

        {/* TV season progress */}
        {item.type === 'tv' && totalSeasons && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <XPBar value={currentSeason ?? 0} max={totalSeasons} />
              <span style={{ fontSize: 10, color: dimText, flexShrink: 0 }}>S{currentSeason ?? 0}/{totalSeasons}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 9, color: dimText }}>Season {currentSeason ?? '—'} of {totalSeasons}</span>
              {!isFinished && !editingProgress && (
                <span
                  onClick={() => { setEditingProgress(true); setSeasonInput(String(currentSeason ?? '')); }}
                  style={{ fontSize: 9, color: accentDim, cursor: 'pointer', opacity: 0.7 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                >[ UPDATE ]</span>
              )}
            </div>
            {editingProgress && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  autoFocus type="number" value={seasonInput}
                  onChange={e => setSeasonInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { const n = parseInt(seasonInput); if (!isNaN(n)) updateTVProgress.mutate(Math.min(n, totalSeasons)); }
                    if (e.key === 'Escape') setEditingProgress(false);
                  }}
                  placeholder="current season"
                  style={{ flex: 1, background: bgTer, border: '1px solid hsl(var(--accent-dim))', color: accent, fontFamily: mono, fontSize: 11, padding: '4px 8px', outline: 'none' }}
                />
                <button onClick={() => { const n = parseInt(seasonInput); if (!isNaN(n)) updateTVProgress.mutate(Math.min(n, totalSeasons)); }}
                  style={{ background: 'transparent', border: '1px solid hsl(var(--accent-dim))', color: accent, fontFamily: mono, fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>SAVE</button>
                <button onClick={() => setEditingProgress(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(153,104,0,0.4)', color: dimText, fontFamily: mono, fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}>×</button>
              </div>
            )}
          </div>
        )}

        {/* XP toast */}
        {lastXP && (
          <div style={{ marginTop: 6, fontFamily: vt, fontSize: 15, color: '#44ff88', textShadow: '0 0 8px rgba(68,255,136,0.6)' }}>
            +{lastXP} XP AWARDED
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '4px 20px 20px',
        scrollbarWidth: 'thin', scrollbarColor: `${accentDim} ${bgSec}`,
      }}>

        <SectionLabel label="RATING" />
        <StarRating rating={item.rating} onRate={r => updateItem.mutate({ rating: r || null })} />

        {!isFinished && (
          <>
            <SectionLabel label="XP ON COMPLETION" />
            <div style={{ fontSize: 10, color: dimText }}>
              <span style={{ color: accent }}>+{baseXP} XP</span>
              {' '}base · awarded across skill, stat &amp; master tiers
            </div>
          </>
        )}

        {isFinished && item.completed_at && (
          <>
            <SectionLabel label="COMPLETED" />
            <div style={{ fontSize: 10, color: '#44ff88' }}>
              {new Date(item.completed_at).toLocaleDateString('en-CA').replace(/-/g, '.')}
            </div>
          </>
        )}

        <SectionLabel label="NOTES" />
        <textarea
          value={notesValue ?? (item.notes ?? '')}
          onChange={e => setNotesValue(e.target.value)}
          onBlur={async e => {
            await supabase.from('media').update({ notes: e.target.value.trim() || null }).eq('id', mediaId);
            queryClient.invalidateQueries({ queryKey: ['media-item', mediaId] });
            queryClient.invalidateQueries({ queryKey: ['media', user?.id] });
          }}
          placeholder="Add notes..."
          rows={3}
          style={{
            width: '100%', background: bgSec,
            border: '1px solid rgba(153,104,0,0.4)',
            color: dimText, fontFamily: mono, fontSize: 11,
            lineHeight: 1.6, padding: '8px 10px',
            outline: 'none', resize: 'vertical', boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = accentDim)}
          onBlurCapture={e => (e.target.style.borderColor = 'rgba(153,104,0,0.4)')}
        />

        <SectionLabel label="STATUS" />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['QUEUED', getInProgressStatus(item.type), 'FINISHED', 'DROPPED'] as MediaStatus[]).map(s => (
            <button
              key={s}
              onClick={() => {
                if (s === item.status) return;
                const patch: Partial<MediaItem> = { status: s };
                if (s === 'FINISHED' && !item.completed_at) patch.completed_at = new Date().toISOString();
                updateItem.mutate(patch);
              }}
              style={{
                background: s === item.status ? 'rgba(255,176,0,0.1)' : 'transparent',
                border: `1px solid ${s === item.status ? accent : 'rgba(153,104,0,0.4)'}`,
                color: s === item.status ? accent : dimText,
                fontFamily: mono, fontSize: 9, letterSpacing: 1,
                padding: '3px 8px', cursor: 'pointer',
              }}
            >{s}</button>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(153,104,0,0.3)', margin: '20px 0 16px' }} />

        {!isFinished && (
          <button
            onClick={() => markFinished.mutate()}
            disabled={markFinished.isPending}
            style={{
              width: '100%', height: 36,
              border: `1px solid ${accent}`,
              background: 'transparent', color: accent,
              fontFamily: mono, fontSize: 11,
              cursor: 'pointer', marginBottom: 8, letterSpacing: 1,
              opacity: markFinished.isPending ? 0.6 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = 'hsl(var(--bg-primary))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = accent; }}
          >
            {markFinished.isPending
              ? '[ PROCESSING... ]'
              : `[ ✓ MARK ${getFinishLabel(item.type)} — +${baseXP} XP ]`}
          </button>
        )}

        <button
          onClick={() => setShowDelete(v => !v)}
          style={{
            width: '100%', height: 32,
            border: '1px solid rgba(153,104,0,0.4)',
            background: 'transparent', color: dimText,
            fontFamily: mono, fontSize: 10, cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4400'; e.currentTarget.style.color = '#ff4400'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(153,104,0,0.4)'; e.currentTarget.style.color = dimText; }}
        >[ DELETE ]</button>

        {showDelete && (
          <DeleteConfirm
            onConfirm={() => deleteItem.mutate()}
            onCancel={() => setShowDelete(false)}
          />
        )}
      </div>
    </div>
  );
}