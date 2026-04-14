import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDB } from '@/lib/db';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  score: number;
}

const DEBOUNCE_MS = 300;
const MAX_PER_CATEGORY = 5;

function scoreText(text: string, query: string): number {
  if (!text || !query) return 0;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  
  if (lower === q) return 10;
  if (lower.startsWith(q)) return 8;
  if (lower.includes(` ${q}`)) return 5;
  if (lower.includes(q)) return 3;
  return 0;
}

interface SearchConfig {
  table: string;
  fields: string[];
  titleField: string;
  subtitleField?: string;
  type: string;
}

const SEARCH_CONFIGS: SearchConfig[] = [
  { table: 'skills', fields: ['name'], titleField: 'name', subtitleField: 'stat_keys', type: 'skill' },
  { table: 'tools', fields: ['name'], titleField: 'name', subtitleField: 'type', type: 'tool' },
  { table: 'augments', fields: ['name'], titleField: 'name', subtitleField: 'category', type: 'augment' },
  { table: 'courses', fields: ['name'], titleField: 'name', subtitleField: 'status', type: 'course' },
  { table: 'habits', fields: ['name'], titleField: 'name', subtitleField: 'frequency_type', type: 'habit' },
  { table: 'projects', fields: ['name'], titleField: 'name', subtitleField: 'status', type: 'project' },
  { table: 'ingredients', fields: ['name'], titleField: 'name', subtitleField: 'category', type: 'ingredient' },
  { table: 'recipes', fields: ['name'], titleField: 'name', type: 'recipe' },
  { table: 'resources', fields: ['title'], titleField: 'title', subtitleField: 'category', type: 'resource' },
  { table: 'socials', fields: ['name'], titleField: 'name', subtitleField: 'status', type: 'social' },
  { table: 'vault_items', fields: ['title'], titleField: 'title', subtitleField: 'category', type: 'vault' },
  { table: 'goals', fields: ['title'], titleField: 'title', subtitleField: 'status', type: 'goal' },
];

const DOCS_LINKS = [
  { id: 'classes', title: 'Classes', type: 'doc', subtitle: 'Character classes reference' },
  { id: 'xp-levelling', title: 'XP & Levelling', type: 'doc', subtitle: 'Experience and progression system' },
];

export function useSearch(query: string, categories: string[]) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const shouldSearch = debouncedQuery.length >= 2;
  const searchAll = categories.includes('ALL') || categories.length === 0;
  
  const activeConfigs = SEARCH_CONFIGS.filter(c => 
    searchAll || categories.includes(c.type)
  );

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, categories.join(',')],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!shouldSearch) return [];

      const db = await getDB();
      const allResults: SearchResult[] = [];
      const searchTerm = `%${debouncedQuery.toLowerCase()}%`;

      for (const config of activeConfigs) {
        const whereClauses = config.fields.map(f => 
          `LOWER(CAST(${f} AS TEXT)) LIKE $1`
        ).join(' OR ');
        
        try {
          const res = await db.query<Record<string, any>>(
            `SELECT id, ${config.titleField} as title, ${config.subtitleField || 'NULL'} as subtitle FROM ${config.table} WHERE ${whereClauses} LIMIT ${MAX_PER_CATEGORY * 2}`,
            [searchTerm]
          );

          const scored = res.rows.map(row => {
            const title = row.title || '';
            let maxScore = scoreText(title, debouncedQuery);
            
            return {
              type: config.type,
              id: row.id,
              title: title,
              subtitle: config.subtitleField ? (row.subtitle || '') : undefined,
              score: maxScore,
            } as SearchResult;
          }).filter(r => r.score > 0 && r.title);

          allResults.push(...scored);
        } catch (err) {
          console.warn(`Search error for ${config.table}:`, err);
        }
      }

      if (searchAll || categories.includes('doc')) {
        const queryLower = debouncedQuery.toLowerCase();
        DOCS_LINKS.forEach(doc => {
          if (doc.title.toLowerCase().includes(queryLower) || 
              doc.subtitle.toLowerCase().includes(queryLower)) {
            allResults.push({
              type: 'doc',
              id: doc.id,
              title: doc.title,
              subtitle: doc.subtitle,
              score: 5,
            });
          }
        });
      }

      allResults.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.title.localeCompare(b.title);
      });

      return allResults.slice(0, 50);
    },
    enabled: shouldSearch,
    staleTime: 1000,
    refetchOnWindowFocus: false,
  });

  return {
    results: results || [],
    isLoading,
    hasResults: (results?.length || 0) > 0,
  };
}
