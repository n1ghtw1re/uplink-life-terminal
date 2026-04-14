import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearch, type SearchResult } from '@/hooks/useSearch';

const mono = "'IBM Plex Mono', monospace";
const acc = 'hsl(var(--accent))';
const adim = 'hsl(var(--accent-dim))';
const dim = 'hsl(var(--text-dim))';
const green = '#44ff88';

const CATEGORIES = [
  { key: 'ALL', label: 'ALL' },
  { key: 'skill', label: 'SKILLS' },
  { key: 'tool', label: 'TOOLS' },
  { key: 'augment', label: 'AUGMENTS' },
  { key: 'course', label: 'COURSES' },
  { key: 'habit', label: 'HABITS' },
  { key: 'project', label: 'PROJECTS' },
  { key: 'ingredient', label: 'INGREDIENTS' },
  { key: 'recipe', label: 'RECIPES' },
  { key: 'resource', label: 'RESOURCES' },
  { key: 'social', label: 'SOCIALS' },
  { key: 'vault', label: 'VAULT' },
  { key: 'goal', label: 'GOALS' },
  { key: 'doc', label: 'DOCS' },
];

const TYPE_ICONS: Record<string, string> = {
  skill: '⚡',
  tool: '🔧',
  augment: '🦾',
  course: '📚',
  habit: '✓',
  project: '📋',
  ingredient: '🥗',
  recipe: '🍳',
  resource: '🔗',
  social: '📱',
  vault: '🏆',
  goal: '🎯',
  doc: '📄',
};

interface SearchOverlayProps {
  onClose: () => void;
  onNavigate: (type: string, id: string) => void;
}

export default function SearchOverlay({ onClose, onNavigate }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>(['ALL']);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading } = useSearch(query, categories);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, categories]);

  const toggleCategory = useCallback((key: string) => {
    if (key === 'ALL') {
      setCategories(['ALL']);
    } else {
      setCategories(prev => {
        const filtered = prev.filter(c => c !== 'ALL');
        if (filtered.includes(key)) {
          const next = filtered.filter(c => c !== key);
          return next.length === 0 ? ['ALL'] : next;
        }
        return [...filtered, key];
      });
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          const result = results[selectedIndex];
          onNavigate(result.type, result.id);
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onNavigate, onClose]);

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.type, result.id);
    onClose();
  };

  const isActiveCategory = (key: string) => {
    return categories.includes('ALL') ? key === 'ALL' : categories.includes(key);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 2000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '80vh',
          background: 'hsl(var(--bg-primary))',
          border: `1px solid ${acc}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Search Input */}
        <div style={{ padding: 16, borderBottom: `1px solid ${adim}` }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: dim,
              fontSize: 14,
            }}>🔍</span>
            <input
              ref={inputRef}
              className="crt-input"
              style={{
                width: '100%',
                fontSize: 16,
                padding: '12px 12px 12px 40px',
                background: 'hsl(var(--bg-secondary))',
                border: `1px solid ${adim}`,
                color: acc,
                outline: 'none',
              }}
              placeholder="search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${adim}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
              style={{
                padding: '4px 10px',
                fontSize: 9,
                fontFamily: mono,
                letterSpacing: 1,
                cursor: 'pointer',
                border: `1px solid ${isActiveCategory(cat.key) ? acc : adim}`,
                background: isActiveCategory(cat.key) ? 'rgba(255,176,0,0.15)' : 'transparent',
                color: isActiveCategory(cat.key) ? acc : dim,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActiveCategory(cat.key)) {
                  e.currentTarget.style.borderColor = dim;
                  e.currentTarget.style.color = dim;
                }
              }}
              onMouseLeave={e => {
                if (!isActiveCategory(cat.key)) {
                  e.currentTarget.style.borderColor = adim;
                  e.currentTarget.style.color = dim;
                }
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          maxHeight: 'calc(80vh - 180px)',
          scrollbarWidth: 'thin',
          scrollbarColor: `${adim} hsl(var(--bg-secondary))`,
        }}>
          {query.length < 2 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: dim,
              fontSize: 11,
              fontFamily: mono,
            }}>
              Type at least 2 characters to search
            </div>
          ) : isLoading ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: dim,
              fontSize: 11,
              fontFamily: mono,
            }}>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: dim,
              fontSize: 11,
              fontFamily: mono,
            }}>
              No results found for "{query}"
            </div>
          ) : (
            <>
              <div style={{
                padding: '4px 16px',
                fontSize: 9,
                color: dim,
                fontFamily: mono,
                letterSpacing: 1,
              }}>
                {results.length} RESULT{results.length !== 1 ? 'S' : ''}
              </div>
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: selectedIndex === index ? 'rgba(255,176,0,0.1)' : 'transparent',
                    borderLeft: selectedIndex === index ? `2px solid ${acc}` : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (selectedIndex !== index) {
                      e.currentTarget.style.background = 'rgba(255,176,0,0.05)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedIndex !== index) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: 14 }}>{TYPE_ICONS[result.type] || '•'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11,
                      fontFamily: mono,
                      color: acc,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {highlightMatch(result.title, query)}
                    </div>
                    {result.subtitle && (
                      <div style={{
                        fontSize: 9,
                        color: dim,
                        fontFamily: mono,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 8,
                    fontFamily: mono,
                    color: dim,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    flexShrink: 0,
                  }}>
                    {result.type}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '8px 16px',
          borderTop: `1px solid ${adim}`,
          fontSize: 9,
          color: dim,
          fontFamily: mono,
          display: 'flex',
          gap: 16,
        }}>
          <span>esc to close</span>
          <span>↑↓ navigate</span>
          <span>enter select</span>
        </div>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  
  if (idx === -1) return text;
  
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: 'rgba(255,176,0,0.3)', color: acc }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}
