// ============================================================
// src/components/overlays/SocialsOverlay.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react';

// --- Types -----------------------------------------------------

type SocialPlatform = {
  label: string;
  slug: string;
  category: string;
};

type SocialAccount = {
  id: string;
  name: string;
  platform: string;
  url: string;
  notes?: string;
  tags?: string[];
  initialFollowers?: number;
  currentFollowers?: number;
  history: { date: string; followers: number }[];
  createdAt: string;
};

type SocialsOverlayProps = {
  onClose: () => void;
};

// --- Constants -------------------------------------------------

const STORAGE_KEY = 'uplink-socials';

const PLATFORM_CATEGORIES: { title: string; platforms: SocialPlatform[] }[] = [
  {
    title: 'General Social Networks',
    platforms: [
      { label: 'Facebook', slug: 'facebook', category: 'General Social Networks' },
      { label: 'Instagram', slug: 'instagram', category: 'General Social Networks' },
      { label: 'Twitter', slug: 'twitter', category: 'General Social Networks' },
      { label: 'LinkedIn', slug: 'linkedin', category: 'General Social Networks' },
      { label: 'TikTok', slug: 'tiktok', category: 'General Social Networks' },
      { label: 'Snapchat', slug: 'snapchat', category: 'General Social Networks' },
      { label: 'Threads', slug: 'threads', category: 'General Social Networks' },
      { label: 'Reddit', slug: 'reddit', category: 'General Social Networks' },
      { label: 'Mastodon', slug: 'mastodon', category: 'General Social Networks' },
      { label: 'Bluesky', slug: 'bluesky', category: 'General Social Networks' },
    ],
  },
  {
    title: 'Video & Streaming Platforms',
    platforms: [
      { label: 'YouTube', slug: 'youtube', category: 'Video & Streaming Platforms' },
      { label: 'Twitch', slug: 'twitch', category: 'Video & Streaming Platforms' },
      { label: 'Vimeo', slug: 'vimeo', category: 'Video & Streaming Platforms' },
      { label: 'Dailymotion', slug: 'dailymotion', category: 'Video & Streaming Platforms' },
    ],
  },
  {
    title: 'Music & Audio Platforms',
    platforms: [
      { label: 'SoundCloud', slug: 'soundcloud', category: 'Music & Audio Platforms' },
      { label: 'Bandcamp', slug: 'bandcamp', category: 'Music & Audio Platforms' },
      { label: 'Mixcloud', slug: 'mixcloud', category: 'Music & Audio Platforms' },
      { label: 'Spotify', slug: 'spotify', category: 'Music & Audio Platforms' },
    ],
  },
  {
    title: 'Art & Creative Portfolios',
    platforms: [
      { label: 'DeviantArt', slug: 'deviantart', category: 'Art & Creative Portfolios' },
      { label: 'ArtStation', slug: 'artstation', category: 'Art & Creative Portfolios' },
      { label: 'Behance', slug: 'behance', category: 'Art & Creative Portfolios' },
      { label: 'Dribbble', slug: 'dribbble', category: 'Art & Creative Portfolios' },
      { label: 'Pinterest', slug: 'pinterest', category: 'Art & Creative Portfolios' },
    ],
  },
  {
    title: 'Professional / Niche Networks',
    platforms: [
      { label: 'GitHub', slug: 'github', category: 'Professional / Niche Networks' },
      { label: 'Stack Overflow', slug: 'stackoverflow', category: 'Professional / Niche Networks' },
      { label: 'Medium', slug: 'medium', category: 'Professional / Niche Networks' },
      { label: 'Substack', slug: 'substack', category: 'Professional / Niche Networks' },
      { label: 'ResearchGate', slug: 'researchgate', category: 'Professional / Niche Networks' },
    ],
  },
  {
    title: 'Gaming & Community Platforms',
    platforms: [
      { label: 'Discord', slug: 'discord', category: 'Gaming & Community Platforms' },
      { label: 'Steam', slug: 'steam', category: 'Gaming & Community Platforms' },
      { label: 'Epic Games', slug: 'epicgames', category: 'Gaming & Community Platforms' },
      { label: 'Roblox', slug: 'roblox', category: 'Gaming & Community Platforms' },
    ],
  },
];

const ALL_PLATFORMS = PLATFORM_CATEGORIES.flatMap(c => c.platforms);

// --- Helpers ---------------------------------------------------

const uniqueId = () => `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;

const formatNumber = (n?: number) => (n === undefined || n === null ? '—' : n.toLocaleString());

const formatDelta = (delta: number) => {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${Math.abs(delta).toLocaleString()}`;
};

const formatPercent = (delta: number, base: number) => {
  if (!base || base === 0) return '—';
  const pct = (delta / base) * 100;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function buildSeriesFromHistory(history: { date: string; followers: number }[]) {
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sorted.map(item => ({ date: item.date, value: item.followers }));
}

function computeOverallSeries(accounts: SocialAccount[]) {
  // create a unified set of dates and sum values at each date (using most recent value by date)
  const dateSet = new Set<string>();
  const byAccount = accounts.map(acc => ({
    id: acc.id,
    series: buildSeriesFromHistory(acc.history),
  }));
  byAccount.forEach(acc => acc.series.forEach(p => dateSet.add(p.date)));
  const dates = Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const result: { date: string; value: number }[] = [];
  let totals: Record<string, number> = {};

  dates.forEach(date => {
    // for each account, find latest entry <= date
    let sum = 0;
    byAccount.forEach(acc => {
      const point = [...acc.series].reverse().find(p => new Date(p.date).getTime() <= new Date(date).getTime());
      if (point) sum += point.value;
    });
    result.push({ date, value: sum });
  });

  return result;
}

function SocialsGrowthChart({ data }: { data: { date: string; value: number }[] }) {
  const width = 420;
  const height = 170;
  const padding = 32;

  const series = data.slice();
  if (series.length === 0) {
    return (
      <div style={{ padding: 20, color: 'hsl(var(--text-dim))' }}>
        No history yet. Add follower data to see growth over time.
      </div>
    );
  }

  // Ensure unique times ascending
  const sorted = [...series].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const values = sorted.map(p => p.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);

  const xScale = (index: number) => {
    const span = sorted.length - 1;
    if (span <= 0) return padding + (width - padding * 2) / 2;
    return padding + (index / span) * (width - padding * 2);
  };
  const yScale = (value: number) => {
    const range = maxVal - minVal || 1;
    const pct = (value - minVal) / range;
    return height - padding - pct * (height - padding * 2);
  };

  const points = sorted.map((p, i) => `${xScale(i)},${yScale(p.value)}`).join(' ');

  const ticks = sorted.map((p, i) => ({
    x: xScale(i),
    label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <div style={{ width: '100%', maxWidth: width, padding: 14, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'hsl(var(--text-dim))' }}>
          {sorted.length} datapoint{sorted.length === 1 ? '' : 's'}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'hsl(var(--accent))' }}>
          {formatNumber(sorted[sorted.length - 1].value)}
        </div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding + t * (height - padding * 2);
          return (
            <line
              key={`grid-${t}`}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="hsla(0,0%,100%,0.06)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis line */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="hsla(0,0%,100%,0.2)"
          strokeWidth={1.2}
        />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {sorted.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={xScale(i)}
            cy={yScale(p.value)}
            r={3}
            fill="hsl(var(--accent))"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={1}
          />
        ))}

        {/* X labels */}
        {ticks.map((t, i) => (
          <text
            key={`lbl-${i}`}
            x={t.x}
            y={height - padding + 14}
            textAnchor="middle"
            fontSize={9}
            fill="hsl(var(--text-dim))"
            fontFamily="'IBM Plex Mono', monospace"
          >
            {t.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function SocialsOverlay({ onClose }: SocialsOverlayProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(PLATFORM_CATEGORIES[0]?.title ?? '');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showNewSocial, setShowNewSocial] = useState(false);
  const [editingHistoryEntry, setEditingHistoryEntry] = useState<{ date: string; followers: number } | null>(null);

  // Load / persist to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: SocialAccount[] = JSON.parse(raw);
        if (!parsed || parsed.length === 0) {
          // Load demo data when storage exists but is empty
          loadDemoData();
        } else {
          setAccounts(parsed);
        }
      } else {
        // Seed with demo data so the UI shows how it will look
        loadDemoData();
      }
    } catch {
      // ignore
      loadDemoData();
    }
  }, []);

  const loadDemoData = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const demoFacebook: SocialAccount = {
      id: 'demo-facebook',
      name: 'TestAccount',
      platform: 'facebook',
      url: 'https://facebook.com/testaccount',
      notes: 'the app should do the math for change and % change',
      tags: [],
      initialFollowers: 12,
      currentFollowers: 14,
      history: [
        { date: yesterday.toISOString().slice(0, 10), followers: 12 },
        { date: today.toISOString().slice(0, 10), followers: 14 },
      ],
      createdAt: today.toISOString(),
    };

    const demoInstagram: SocialAccount = {
      id: 'demo-instagram',
      name: 'testInstagram',
      platform: 'instagram',
      url: 'https://instagram.com/test',
      notes: 'this is a test instagram account',
      tags: [],
      initialFollowers: 0,
      currentFollowers: 2000,
      history: [
        { date: yesterday.toISOString().slice(0, 10), followers: 0 },
        { date: today.toISOString().slice(0, 10), followers: 2000 },
      ],
      createdAt: today.toISOString(),
    };

    setAccounts([demoFacebook, demoInstagram]);
    setSelectedAccountId(demoFacebook.id);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  const filteredPlatforms = useMemo(() => {
    const category = PLATFORM_CATEGORIES.find(c => c.title === activeCategory);
    return category ? category.platforms : [];
  }, [activeCategory]);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const overallFollowers = useMemo(() => {
    const values = accounts.map(a => a.currentFollowers ?? a.initialFollowers ?? 0);
    return values.reduce((sum, v) => sum + (v ?? 0), 0);
  }, [accounts]);

  const overallInitial = useMemo(() => {
    const values = accounts.map(a => a.initialFollowers ?? 0);
    return values.reduce((sum, v) => sum + (v ?? 0), 0);
  }, [accounts]);

  const overallDelta = overallFollowers - overallInitial;

  const overallSeries = useMemo(() => computeOverallSeries(accounts), [accounts]);

  const accountsInCategory = useMemo(() => {
    const platformSlugs = filteredPlatforms.map(p => p.slug);
    return accounts.filter(a => platformSlugs.includes(a.platform));
  }, [accounts, filteredPlatforms]);

  const addAccount = (account: SocialAccount) => {
    setAccounts(prev => [...prev, account]);
    setSelectedAccountId(account.id);
  };

  const updateAccount = (id: string, updater: (prev: SocialAccount) => SocialAccount) => {
    setAccounts(prev => prev.map(a => (a.id === id ? updater(a) : a)));
  };

  const removeAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (selectedAccountId === id) setSelectedAccountId(null);
  };

  const removeHistoryEntry = (accountId: string, date: string) => {
    updateAccount(accountId, (prev) => {
      const nextHistory = prev.history.filter(h => h.date !== date);
      const last = nextHistory.length ? nextHistory[nextHistory.length - 1].followers : prev.initialFollowers ?? 0;
      return { ...prev, history: nextHistory, currentFollowers: last };
    });
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  const handleEditHistoryEntry = (entry: { date: string; value: number }) => {
    setEditingHistoryEntry({ date: entry.date, followers: entry.value });
    setShowAddEntry(true);
  };

  // --- Add account modal ---
  const AddAccountModal = () => {
    const [name, setName] = useState('');
    const [platform, setPlatform] = useState(filteredPlatforms[0]?.slug ?? ALL_PLATFORMS[0].slug);
    const [url, setUrl] = useState('');
    const [initialFollowers, setInitialFollowers] = useState<string>('');
    const [currentFollowers, setCurrentFollowers] = useState<string>('');
    const [notes, setNotes] = useState('');

    const canSave = name.trim().length > 0 && platform;

    const handleSave = () => {
      if (!canSave) return;
      const initial = initialFollowers ? Number(initialFollowers) : undefined;
      const current = currentFollowers ? Number(currentFollowers) : undefined;
      const now = new Date().toISOString();
      const history: { date: string; followers: number }[] = [];
      if (initial !== undefined) history.push({ date: now, followers: initial });
      if (current !== undefined) history.push({ date: now, followers: current });

      addAccount({
        id: uniqueId(),
        name: name.trim(),
        platform,
        url: url.trim(),
        notes: notes.trim() || undefined,
        tags: [],
        initialFollowers: initial,
        currentFollowers: current,
        history,
        createdAt: now,
      });
      setShowAdd(false);
    };

    return (
      <div style={{ padding: 18, display: 'grid', gap: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--accent))' }}>ADD SOCIAL ACCOUNT</div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>NAME</div>
          <input
            className="crt-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Personal Page"
            autoFocus
          />
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>PLATFORM</div>
          <select
            className="crt-select"
            value={platform}
            onChange={e => setPlatform(e.target.value)}
          >
            {ALL_PLATFORMS.map(p => (
              <option key={p.slug} value={p.slug}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>URL (optional)</div>
          <input
            className="crt-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>INITIAL FOLLOWERS (optional)</div>
            <input
              className="crt-input"
              type="number"
              value={initialFollowers}
              onChange={e => setInitialFollowers(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>CURRENT FOLLOWERS (optional)</div>
            <input
              className="crt-input"
              type="number"
              value={currentFollowers}
              onChange={e => setCurrentFollowers(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>NOTES (optional)</div>
          <input
            className="crt-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. personal + work account"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            onClick={() => setShowAdd(false)}
            style={{
              padding: '6px 12px', border: '1px solid hsl(var(--accent-dim))', background: 'transparent', color: 'hsl(var(--text-dim))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '6px 12px', border: `1px solid ${canSave ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
              background: 'transparent', color: canSave ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))', cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              opacity: canSave ? 1 : 0.5,
            }}
          >
            ADD ACCOUNT
          </button>
        </div>
      </div>
    );
  };

  const AddEntryModal = () => {
    const [date, setDate] = useState(editingHistoryEntry?.date ?? todayIso);
    const [followers, setFollowers] = useState<string>(editingHistoryEntry ? String(editingHistoryEntry.followers) : '');

    useEffect(() => {
      setDate(editingHistoryEntry?.date ?? todayIso);
      setFollowers(editingHistoryEntry ? String(editingHistoryEntry.followers) : '');
    }, [editingHistoryEntry]);

    const originalDate = editingHistoryEntry?.date;
    const isEditing = Boolean(editingHistoryEntry);

    const canSave = date && followers.trim() !== '';

    const handleSave = () => {
      if (!selectedAccount || !canSave) return;
      const value = Number(followers);

      updateAccount(selectedAccount.id, prev => {
        let nextHistory = prev.history;

        // If date changed, remove the old entry
        if (isEditing && originalDate && originalDate !== date) {
          nextHistory = nextHistory.filter(h => h.date !== originalDate);
        }

        const existing = nextHistory.find(h => h.date === date);
        nextHistory = existing
          ? nextHistory.map(h => (h.date === date ? { ...h, followers: value } : h))
          : [...nextHistory, { date, followers: value }];

        const sorted = [...nextHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const nextCurrent = sorted.length ? sorted[sorted.length - 1].followers : prev.currentFollowers ?? prev.initialFollowers ?? 0;

        return { ...prev, history: sorted, currentFollowers: nextCurrent };
      });

      setEditingHistoryEntry(null);
      setShowAddEntry(false);
    };

    const handleCancel = () => {
      setEditingHistoryEntry(null);
      setShowAddEntry(false);
    };

    return (
      <div style={{ padding: 18, display: 'grid', gap: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--accent))' }}>ADD / UPDATE ENTRY</div>
        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>DATE</div>
          <input className="crt-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>FOLLOWER COUNT</div>
          <input
            className="crt-input"
            type="number"
            value={followers}
            onChange={e => setFollowers(e.target.value)}
            placeholder="0"
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '6px 12px', border: '1px solid hsl(var(--accent-dim))', background: 'transparent', color: 'hsl(var(--text-dim))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            }}
          >
            CANCEL
          </button>
          {isEditing && selectedAccount && (
            <button
              onClick={() => {
                removeHistoryEntry(selectedAccount.id, originalDate!);
                handleCancel();
              }}
              style={{
                padding: '6px 12px', border: '1px solid hsl(0,80%,70%)', background: 'transparent', color: 'hsl(0,80%,70%)', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              }}
            >
              DELETE
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '6px 12px', border: `1px solid ${canSave ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
              background: 'transparent', color: canSave ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))', cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              opacity: canSave ? 1 : 0.5,
            }}
          >
            SAVE
          </button>
        </div>
      </div>
    );
  };

  const NewSocialModal = () => {
    const [name, setName] = useState('');
    const [platform, setPlatform] = useState(ALL_PLATFORMS[0]?.slug ?? '');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState(PLATFORM_CATEGORIES[0]?.title ?? '');
    const [initialFollowers, setInitialFollowers] = useState<string>('');
    const [currentFollowers, setCurrentFollowers] = useState<string>('');
    const [notes, setNotes] = useState('');

    const initialValue = Number(initialFollowers) || 0;
    const currentValue = Number(currentFollowers) || 0;
    const delta = currentValue - initialValue;
    const percent = initialValue === 0 ? 0 : (delta / initialValue) * 100;

    return (
      <div style={{ padding: 18, display: 'grid', gap: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--accent))' }}>NEW SOCIAL ACCOUNT</div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>ACCOUNT NAME</div>
          <input className="crt-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Personal Page" />
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>PLATFORM</div>
          <select className="crt-select" value={platform} onChange={e => setPlatform(e.target.value)}>
            {ALL_PLATFORMS.map(p => (
              <option key={p.slug} value={p.slug}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>CATEGORY</div>
          <select className="crt-select" value={category} onChange={e => setCategory(e.target.value)}>
            {PLATFORM_CATEGORIES.map(c => (
              <option key={c.title} value={c.title}>{c.title}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>URL</div>
          <input className="crt-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>INITIAL FOLLOWERS (optional)</div>
            <input
              className="crt-input"
              type="number"
              value={initialFollowers}
              onChange={e => setInitialFollowers(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>CURRENT FOLLOWERS (optional)</div>
            <input
              className="crt-input"
              type="number"
              value={currentFollowers}
              onChange={e => setCurrentFollowers(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>CHANGE</div>
            <div style={{ fontSize: 12, color: 'hsl(var(--accent))' }}>{formatDelta(delta)}</div>
          </div>
          <div>
            <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>%</div>
            <div style={{ fontSize: 12, color: 'hsl(var(--accent))' }}>{initialValue === 0 ? '—' : `${percent.toFixed(1)}%`}</div>
          </div>
        </div>

        <div>
          <div style={{ color: 'hsl(var(--text-dim))', fontSize: 9 }}>NOTES / TAGS (optional)</div>
          <input
            className="crt-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes or comma-separated tags"
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowNewSocial(false)}
            style={{
              padding: '6px 12px', border: '1px solid hsl(var(--accent-dim))', background: 'transparent', color: 'hsl(var(--text-dim))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            }}
          >
            CANCEL
          </button>
          <button
            onClick={() => setShowNewSocial(false)}
            style={{
              padding: '6px 12px', border: '1px solid hsl(var(--accent))', background: 'transparent', color: 'hsl(var(--accent))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
            }}
          >
            CREATE
          </button>
        </div>
      </div>
    );
  };

  const accountCard = (account: SocialAccount) => {
    const initial = account.initialFollowers ?? 0;
    const current = account.currentFollowers ?? initial;
    const delta = current - initial;
    const deltaPct = initial > 0 ? (delta / initial) * 100 : 0;

    const platform = ALL_PLATFORMS.find(p => p.slug === account.platform);

    return (
      <div
        key={account.id}
        onClick={() => setSelectedAccountId(account.id)}
        style={{
          padding: 12,
          background: selectedAccountId === account.id ? 'rgba(255,176,0,0.06)' : 'hsl(var(--bg-secondary))',
          border: `1px solid ${selectedAccountId === account.id ? 'hsl(var(--accent))' : 'hsl(var(--accent-dim))'}`,
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'hsl(var(--accent))' }}>{account.name}</div>
          <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>{platform?.label ?? account.platform}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'hsl(var(--text-dim))' }}>
          <span>{formatNumber(current)} followers</span>
          <span>{formatDelta(delta)} ({formatPercent(delta, initial)})</span>
        </div>
        {account.url && (
          <div style={{ marginTop: 6, fontSize: 10, color: 'hsl(var(--text-dim))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {account.url}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'hsl(var(--bg-primary))', display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ height: 56, flexShrink: 0, borderBottom: '1px solid hsl(var(--accent-dim))', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <span style={{ fontSize: 9, color: 'hsl(var(--text-dim))', letterSpacing: 2 }}>// SOCIALS</span>
        <span style={{ fontSize: 22, color: 'hsl(var(--accent))' }}>SOCIAL TRACKER</span>
        <span style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>{accounts.length} account{accounts.length === 1 ? '' : 's'}</span>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, padding: 10, border: '1px solid hsl(var(--accent))', borderRadius: 10, background: 'hsl(var(--bg-secondary))', boxShadow: '0 0 0 1px hsl(var(--accent))' }}>
            <div style={{ textAlign: 'right', fontSize: 10, color: 'hsl(var(--text-dim))' }}>
              TOTAL FOLLOWERS
              <div style={{ fontSize: 14, color: 'hsl(var(--accent))', marginTop: 2 }}>
                {formatNumber(overallFollowers)}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid hsl(var(--accent-dim))', paddingLeft: 12, textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>DELTA</div>
              <div style={{ fontSize: 14, color: overallDelta >= 0 ? 'hsl(var(--accent))' : 'hsl(0,80%,70%)', marginTop: 2 }}>
                {formatDelta(overallDelta)} ({formatPercent(overallDelta, overallInitial)})
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowNewSocial(true)}
            style={{
              padding: '6px 14px', fontSize: 10, border: '1px solid hsl(var(--accent))', background: 'transparent', color: 'hsl(var(--accent))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
            }}
          >
            NEW
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '6px 12px', fontSize: 10, border: '1px solid hsl(var(--accent-dim))', background: 'transparent', color: 'hsl(var(--text-dim))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
            }}
          >
            × CLOSE
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid hsl(var(--accent-dim))', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8, background: 'hsl(var(--bg-secondary))' }}>
        {PLATFORM_CATEGORIES.map(c => (
          <button
            key={c.title}
            onClick={() => setActiveCategory(c.title)}
            style={{
              padding: '10px 14px', fontSize: 10,
              border: 'none',
              borderBottom: `2px solid ${activeCategory === c.title ? 'hsl(var(--accent))' : 'transparent'}`,
              background: 'transparent',
              color: activeCategory === c.title ? 'hsl(var(--accent))' : 'hsl(var(--text-dim))',
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: 'pointer', letterSpacing: 1,
              transition: 'all 150ms',
            }}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 24, gap: 16 }}>
        {/* Left: account list */}
        <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {accountsInCategory.length === 0 ? (
            <div style={{ padding: 12, color: 'hsl(var(--text-dim))', fontSize: 11, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
              No accounts in this category yet. Add one to start tracking.
            </div>
          ) : (
            accountsInCategory.map(accountCard)
          )}
        </div>

        {/* Right: detail / chart */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>DETAILS</div>
              <div style={{ fontSize: 14, color: 'hsl(var(--accent))' }}>
                {selectedAccount ? selectedAccount.name : 'Select an account to view'}
              </div>
            </div>
            {selectedAccount && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setShowAddEntry(true)}
                  style={{
                    padding: '6px 12px', fontSize: 10, border: '1px solid hsl(var(--accent))', background: 'transparent', color: 'hsl(var(--accent))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
                  }}
                >
                  + ENTRY
                </button>
                <button
                  onClick={() => selectedAccount && removeAccount(selectedAccount.id)}
                  style={{
                    padding: '6px 12px', fontSize: 10, border: '1px solid hsl(0,80%,70%)', background: 'transparent', color: 'hsl(0,80%,70%)', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
                  }}
                >
                  DELETE
                </button>
              </div>
            )}
          </div>

          {selectedAccount ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 12, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>PLATFORM</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--accent))' }}>{ALL_PLATFORMS.find(p => p.slug === selectedAccount.platform)?.label ?? selectedAccount.platform}</div>
                </div>
                <div style={{ padding: 12, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>URL</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--accent))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedAccount.url || '—'}</div>
                </div>
                <div style={{ padding: 12, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>CURRENT FOLLOWERS</div>
                  <div style={{ fontSize: 14, color: 'hsl(var(--accent))' }}>{formatNumber(selectedAccount.currentFollowers ?? selectedAccount.initialFollowers)}</div>
                </div>
                <div style={{ padding: 12, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>START FOLLOWERS</div>
                  <div style={{ fontSize: 14, color: 'hsl(var(--accent))' }}>{formatNumber(selectedAccount.initialFollowers)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>GROWTH</div>
                <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>TOTAL ENTRIES {selectedAccount.history.length}</div>
              </div>

              <SocialsGrowthChart data={buildSeriesFromHistory(selectedAccount.history)} />

              <div style={{ padding: 12, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8, overflowY: 'auto', maxHeight: 220 }}>
                <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))', marginBottom: 6 }}>HISTORY</div>
                {selectedAccount.history.length === 0 ? (
                  <div style={{ fontSize: 10, color: 'hsl(var(--text-dim))' }}>No entries yet. Add a new entry to begin tracking.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, fontSize: 10 }}>
                    <div style={{ fontWeight: 600, color: 'hsl(var(--accent))' }}>DATE</div>
                    <div style={{ fontWeight: 600, color: 'hsl(var(--accent))' }}>FOLLOWERS</div>
                    <div style={{ fontWeight: 600, color: 'hsl(var(--accent))' }}>CHANGE</div>
                    <div style={{ fontWeight: 600, color: 'hsl(var(--accent))' }}>ACTIONS</div>
                    {buildSeriesFromHistory(selectedAccount.history).map((entry, idx, all) => {
                      const prev = idx > 0 ? all[idx - 1].value : entry.value;
                      const delta = entry.value - prev;
                      return (
                        <div key={`${entry.date}-${idx}`} style={{ display: 'contents' }}>
                          <div>{new Date(entry.date).toLocaleDateString()}</div>
                          <div>{formatNumber(entry.value)}</div>
                          <div style={{ color: delta >= 0 ? 'hsl(var(--accent))' : 'hsl(0,80%,70%)' }}>{formatDelta(delta)}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleEditHistoryEntry(entry)}
                              style={{
                                padding: '4px 8px', fontSize: 9, border: '1px solid hsl(var(--accent-dim))', background: 'transparent', color: 'hsl(var(--text-dim))', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
                              }}
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => {
                                if (!selectedAccount) return;
                                removeHistoryEntry(selectedAccount.id, entry.date);
                              }}
                              style={{
                                padding: '4px 8px', fontSize: 9, border: '1px solid hsl(0,80%,70%)', background: 'transparent', color: 'hsl(0,80%,70%)', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
                              }}
                            >
                              DEL
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: 24, background: 'hsl(var(--bg-secondary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8, color: 'hsl(var(--text-dim))' }}>
              Select an account to see details and growth chart.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 420, background: 'hsl(var(--bg-primary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
            <AddAccountModal />
          </div>
        </div>
      )}
      {showNewSocial && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 420, background: 'hsl(var(--bg-primary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
            <NewSocialModal />
          </div>
        </div>
      )}
      {showAddEntry && selectedAccount && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 360, background: 'hsl(var(--bg-primary))', border: '1px solid hsl(var(--accent-dim))', borderRadius: 8 }}>
            <AddEntryModal />
          </div>
        </div>
      )}
    </div>
  );
}
