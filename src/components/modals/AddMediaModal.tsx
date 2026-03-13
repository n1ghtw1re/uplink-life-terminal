// ============================================================
// src/components/modals/AddMediaModal.tsx
// ============================================================
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { StatKey, STAT_META } from '@/types';
import type { Json } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import { awardXP } from '@/services/xpService';
import { useSkills } from '@/hooks/useSkills';

// ── Reusable searchable skill tag input ─────────────────────
interface Skill { id: string; name: string; }

function SkillTagInput({
  skills,
  selectedIds,
  onChange,
}: {
  skills: Skill[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    !selectedIds.includes(s.id)
  );

  const add = (id: string) => {
    onChange([...selectedIds, id]);
    setSearch('');
    setOpen(false);
  };

  const remove = (id: string) => onChange(selectedIds.filter(x => x !== id));

  const selectedSkills = skills.filter(s => selectedIds.includes(s.id));

  return (
    <div>
      <div className="crt-field-label">
        FEEDS SKILL
        <span style={{ opacity: 0.5, marginLeft: 8, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
          optional
        </span>
      </div>

      {/* Selected tags */}
      {selectedSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {selectedSkills.map(s => (
            <span
              key={s.id}
              style={{
                background: 'rgba(255,176,0,0.12)',
                border: '1px solid hsl(var(--accent-dim))',
                color: 'hsl(var(--accent))',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'default',
              }}
            >
              {s.name}
              <span
                onClick={() => remove(s.id)}
                style={{ cursor: 'pointer', opacity: 0.6, fontSize: 12, lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
              >×</span>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="type to search skills..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--accent-dim))',
            borderTop: 'none',
            zIndex: 50,
            maxHeight: 160,
            overflowY: 'auto',
          }}>
            {filtered.map(s => (
              <div
                key={s.id}
                onMouseDown={() => add(s.id)}
                style={{
                  padding: '5px 10px',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11,
                  color: 'hsl(var(--accent))',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,176,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {s.name}
              </div>
            ))}
          </div>
        )}

        {open && search.length > 0 && filtered.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'hsl(var(--bg-secondary))',
            border: '1px solid hsl(var(--accent-dim))',
            borderTop: 'none',
            padding: '6px 10px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: 'hsl(var(--text-dim))',
            zIndex: 50,
          }}>
            no matches
          </div>
        )}
      </div>
    </div>
  );
}

const STAT_KEYS: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

const MEDIA_TYPES = [
  { key: 'book',          label: 'BOOK',         icon: '📖' },
  { key: 'comic',         label: 'COMIC',        icon: '📚' },
  { key: 'film',          label: 'FILM',         icon: '🎬' },
  { key: 'documentary',   label: 'DOC',          icon: '🎥' },
  { key: 'tv',            label: 'TV SERIES',    icon: '📺' },
  { key: 'album',         label: 'ALBUM',        icon: '🎵' },
] as const;

type MediaType = typeof MEDIA_TYPES[number]['key'];

const STATUS_OPTIONS: Record<MediaType, string[]> = {
  book:        ['READING', 'QUEUED', 'FINISHED', 'DROPPED'],
  comic:       ['READING', 'QUEUED', 'FINISHED', 'DROPPED'],
  film:        ['WATCHING', 'QUEUED', 'FINISHED'],
  documentary: ['WATCHING', 'QUEUED', 'FINISHED'],
  tv:          ['WATCHING', 'QUEUED', 'FINISHED', 'DROPPED'],
  album:       ['LISTENING', 'QUEUED', 'FINISHED'],
};







// XP awarded on completion per type (for preview)
const XP_ON_COMPLETE: Record<MediaType, number> = {
  book: 75, comic: 50, film: 25, documentary: 35, tv: 60, album: 20,
};

interface Props {
  onClose: () => void;
  defaultType?: MediaType;
}

export default function AddMediaModal({ onClose, defaultType = 'book' }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: allSkills } = useSkills(user?.id);

  const [type, setType]         = useState<MediaType>(defaultType);
  const [title, setTitle]       = useState('');
  const [creator, setCreator]   = useState('');
  const [year, setYear]         = useState('');
  const [status, setStatus]     = useState<string>(STATUS_OPTIONS[defaultType][0]);
  const [linkedStat, setLinkedStat] = useState<StatKey | ''>('mind');
  const [linkedSkillIds, setLinkedSkillIds] = useState<string[]>([]);
  const [rating, setRating]     = useState<number>(0);
  const [notes, setNotes]       = useState('');
  const [isLegacy, setIsLegacy] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Type-specific meta fields
  const [pages, setPages]           = useState('');
  const [pageCurrent, setPageCurrent] = useState('');
  const [issues, setIssues]         = useState('');
  const [comicType, setComicType]   = useState('single'); // single | trade | manga
  const [seasons, setSeasons]       = useState('');
  const [episodes, setEpisodes]     = useState('');
  const [platform, setPlatform]     = useState('');
  const [director, setDirector]     = useState('');
  const [artist, setArtist]         = useState('');

  const handleTypeChange = (t: MediaType) => {
    setType(t);
    setStatus(STATUS_OPTIONS[t][0]);
  };

  const buildMeta = (): Record<string, unknown> => {
    switch (type) {
      case 'book':
        return {
          pages: pages ? parseInt(pages) : null,
          page_current: pageCurrent ? parseInt(pageCurrent) : null,
        };
      case 'comic':
        return {
          issues: issues ? parseInt(issues) : null,
          comic_type: comicType,
        };
      case 'film':
        return {};
      case 'documentary':
        return { platform: platform || null };
      case 'tv':
        return {
          seasons: seasons ? parseInt(seasons) : null,
          episodes: episodes ? parseInt(episodes) : null,
          platform: platform || null,
        };
      case 'album':
        return {};
      default:
        return {};
    }
  };

  // Creator label varies by type
  const creatorLabel: Record<MediaType, string> = {
    book: 'AUTHOR', comic: 'AUTHOR / ARTIST', film: 'DIRECTOR',
    documentary: 'DIRECTOR', tv: 'CREATOR / STUDIO', album: 'ARTIST',
  };

  const isComplete = status === 'FINISHED';

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('media')
        .insert({
          user_id:          user.id,
          type,
          title:            title.trim(),
          creator:          creator.trim() || null,
          year:             year ? parseInt(year) : null,
          status,
          linked_stat:      linkedStat || null,
          linked_skill_ids: linkedSkillIds,
          rating:           rating || null,
          notes:            notes.trim() || null,
          is_legacy:        isLegacy,
          completed_at:     status === 'FINISHED' ? new Date().toISOString() : null,
          meta:             buildMeta() as Record<string, Json>,
        });

      if (error) throw error;

      // Award XP if finished
      if (status === 'FINISHED' && linkedStat) {
        const baseXP = XP_ON_COMPLETE[type];
        const sourceMap: Record<MediaType, string> = {
          book:         'book_complete',
          comic:        'comic_complete',
          film:         'film_watched',
          documentary:  'documentary_watched',
          tv:           'tv_series',
          album:        'album_listened',
        };
        // Fire XP for each linked skill (or just the stat if no skills linked)
        const skillsToFire = linkedSkillIds.length > 0
          ? linkedSkillIds
          : [null];
        for (const skillId of skillsToFire) {
          await awardXP({
            userId:    user.id,
            source:    sourceMap[type] as Parameters<typeof awardXP>[0]['source'],
            baseAmount: baseXP,
            skillId:   skillId ?? undefined,
            statKeys:  [linkedStat as StatKey],
            statSplit: [{ stat: linkedStat as StatKey, percent: 100 }],
            isLegacy,
            notes: `${type}: ${title.trim()}`,
          });
        }
        // Refresh widgets
        queryClient.invalidateQueries({ queryKey: ['stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['operator', user.id] });
        queryClient.invalidateQueries({ queryKey: ['xp-recent', user.id] });
      }

      queryClient.invalidateQueries({ queryKey: ['media', user.id] });

      toast({
        title: `✓ ${MEDIA_TYPES.find(m => m.key === type)?.label} ADDED`,
        description: title.trim(),
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err);
      toast({ title: 'ERROR', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const xp = XP_ON_COMPLETE[type];

  return (
    <div style={{ display: 'grid', gap: 13, fontSize: 11 }}>

      {/* ── Media type selector ── */}
      <div>
        <div className="crt-field-label">TYPE</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {MEDIA_TYPES.map(m => {
            const on = type === m.key;
            return (
              <button
                key={m.key}
                className="topbar-btn"
                onClick={() => handleTypeChange(m.key)}
                style={{
                  fontSize: 10,
                  padding: '3px 10px',
                  border: `1px solid ${on ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
                  color: on ? 'hsl(var(--accent-bright))' : 'hsl(var(--text-dim))',
                  boxShadow: on ? '0 0 5px rgba(255,176,0,0.25)' : 'none',
                }}
              >
                {m.icon} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Title ── */}
      <div>
        <div className="crt-field-label">
          TITLE <span style={{ color: 'hsl(var(--accent))' }}>*</span>
        </div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder={
            type === 'book' ? 'e.g. Neuromancer' :
            type === 'film' ? 'e.g. Blade Runner 2049' :
            type === 'tv'   ? 'e.g. Mr. Robot' :
            type === 'album'? 'e.g. OK Computer' :
            'title...'
          }
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          maxLength={200}
        />
      </div>

      {/* ── Creator + Year ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 2 }}>
          <div className="crt-field-label">{creatorLabel[type]}</div>
          <input
            className="crt-input"
            style={{ width: '100%' }}
            placeholder={
              type === 'book'  ? 'William Gibson' :
              type === 'album' ? 'Radiohead' :
              type === 'film' || type === 'documentary' ? 'Denis Villeneuve' :
              'creator...'
            }
            value={creator}
            onChange={e => setCreator(e.target.value)}
            maxLength={100}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="crt-field-label">YEAR</div>
          <input
            className="crt-input"
            style={{ width: '100%' }}
            placeholder="1984"
            value={year}
            onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
          />
        </div>
      </div>

      {/* ── Type-specific meta fields ── */}
      {type === 'book' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="crt-field-label">TOTAL PAGES</div>
            <input
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="320"
              value={pages}
              onChange={e => setPages(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="crt-field-label">CURRENT PAGE</div>
            <input
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="0"
              value={pageCurrent}
              onChange={e => setPageCurrent(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>
      )}

      {type === 'comic' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="crt-field-label">ISSUES</div>
            <input
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="12"
              value={issues}
              onChange={e => setIssues(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="crt-field-label">FORMAT</div>
            <select
              className="crt-input"
              style={{ width: '100%' }}
              value={comicType}
              onChange={e => setComicType(e.target.value)}
            >
              <option value="single">Single Issues</option>
              <option value="trade">Trade Paperback</option>
              <option value="manga">Manga</option>
            </select>
          </div>
        </div>
      )}

      {type === 'documentary' && (
        <div>
          <div className="crt-field-label">PLATFORM</div>
          <input
            className="crt-input"
            style={{ width: '100%' }}
            placeholder="Netflix, YouTube..."
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            maxLength={60}
          />
        </div>
      )}

      {type === 'tv' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="crt-field-label">SEASONS</div>
            <input
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="4"
              value={seasons}
              onChange={e => setSeasons(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="crt-field-label">EPISODES</div>
            <input
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="38"
              value={episodes}
              onChange={e => setEpisodes(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div className="crt-field-label">PLATFORM</div>
            <input
              className="crt-input"
              style={{ width: '100%' }}
              placeholder="Netflix..."
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              maxLength={60}
            />
          </div>
        </div>
      )}



      {/* ── Status ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="crt-field-label">STATUS</div>
          <select
            className="crt-input"
            style={{ width: '100%' }}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS[type].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* ── Linked stat ── */}
        <div style={{ flex: 1 }}>
          <div className="crt-field-label">FEEDS STAT</div>
          <select
            className="crt-input"
            style={{ width: '100%' }}
            value={linkedStat}
            onChange={e => {
              setLinkedStat(e.target.value as StatKey);
              setLinkedSkillIds([]); // reset skills when stat changes
            }}
          >
            <option value="">— none —</option>
            {STAT_KEYS.map(k => (
              <option key={k} value={k}>
                {STAT_META[k].icon} {STAT_META[k].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Linked skills (optional) — searchable tag input ── */}
      {linkedStat && (() => {
        const visibleSkills = (allSkills ?? []).filter(s =>
          s.statKeys.some(k => k === linkedStat)
        );
        if (visibleSkills.length === 0) return null;
        return (
          <SkillTagInput
            skills={visibleSkills}
            selectedIds={linkedSkillIds}
            onChange={setLinkedSkillIds}
          />
        );
      })()}

      {/* ── Rating (stars) — only on complete/watched ── */}
      {isComplete && (
        <div>
          <div className="crt-field-label">RATING</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                onClick={() => setRating(rating === n ? 0 : n)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: n <= rating ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))',
                  padding: '0 2px',
                  textShadow: n <= rating ? '0 0 6px rgba(255,176,0,0.6)' : 'none',
                  lineHeight: 1,
                }}
              >
                ★
              </button>
            ))}
            {rating > 0 && (
              <span style={{ color: 'hsl(var(--text-dim))', fontSize: 10, marginLeft: 6, alignSelf: 'center' }}>
                {rating}/5
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Legacy + XP preview ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
          onClick={() => setIsLegacy(!isLegacy)}
        >
          <span style={{
            width: 13, height: 13,
            border: `1px solid ${isLegacy ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: 'hsl(var(--accent))',
            background: isLegacy ? 'rgba(255,176,0,0.1)' : 'transparent',
            flexShrink: 0,
          }}>
            {isLegacy ? '×' : ''}
          </span>
          <span style={{ color: isLegacy ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))', fontSize: 10 }}>
            LEGACY ENTRY
          </span>
        </div>

        {isComplete && (
          <div style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: 'hsl(var(--text-dim))',
            border: '1px solid hsl(var(--accent-dim))',
            padding: '3px 10px',
          }}>
            +{isLegacy ? Math.floor(xp * 0.7) : xp} XP on save
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div>
        <div className="crt-field-label">NOTES <span style={{ opacity: 0.5 }}>(optional)</span></div>
        <input
          className="crt-input"
          style={{ width: '100%' }}
          placeholder="any notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={300}
        />
      </div>

      {/* ── Actions ── */}
      <div style={{
        borderTop: '1px solid hsl(var(--accent-dim))',
        paddingTop: 11,
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8,
      }}>
        <button
          className="topbar-btn"
          style={{ color: 'hsl(var(--text-dim))' }}
          onClick={onClose}
          disabled={saving}
        >
          CANCEL
        </button>
        <button
          className="topbar-btn"
          onClick={handleSubmit}
          disabled={!title.trim() || saving}
          style={{ opacity: !title.trim() ? 0.4 : 1 }}
        >
          {saving ? '>> SAVING...' : `>> ADD ${MEDIA_TYPES.find(m => m.key === type)?.label}`}
        </button>
      </div>
    </div>
  );
}