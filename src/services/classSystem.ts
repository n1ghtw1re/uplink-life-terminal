import type { ClassId, StatKey } from '@/types';
import type { StatDisplay } from '@/hooks/useStats';

export interface ClassDefinition {
  id: ClassId;
  name: string;
  stats: [StatKey, StatKey];
}

export interface ResolvedClass {
  id: ClassId;
  name: string;
  stats: [StatKey, StatKey];
  topStats: [StatKey, StatKey];
}

const STAT_PRIORITY: StatKey[] = ['body', 'wire', 'mind', 'cool', 'grit', 'flow', 'ghost'];

export const CLASS_DEFINITIONS: ClassDefinition[] = [
  { id: 'OPERATOR', name: 'Operator', stats: ['body', 'wire'] },
  { id: 'PRACTITIONER', name: 'Practitioner', stats: ['body', 'mind'] },
  { id: 'PERFORMER', name: 'Performer', stats: ['body', 'cool'] },
  { id: 'LABORER', name: 'Laborer', stats: ['body', 'grit'] },
  { id: 'ARTIST', name: 'Artist', stats: ['body', 'flow'] },
  { id: 'MONK', name: 'Monk', stats: ['body', 'ghost'] },
  { id: 'ANALYST', name: 'Analyst', stats: ['wire', 'mind'] },
  { id: 'COMMUNICATOR', name: 'Communicator', stats: ['wire', 'cool'] },
  { id: 'TECHNICIAN', name: 'Technician', stats: ['wire', 'grit'] },
  { id: 'DESIGNER', name: 'Designer', stats: ['wire', 'flow'] },
  { id: 'OBSERVER', name: 'Observer', stats: ['wire', 'ghost'] },
  { id: 'SCHOLAR', name: 'Scholar', stats: ['mind', 'cool'] },
  { id: 'STUDENT', name: 'Student', stats: ['mind', 'grit'] },
  { id: 'ARCHITECT', name: 'Architect', stats: ['mind', 'flow'] },
  { id: 'PHILOSOPHER', name: 'Philosopher', stats: ['mind', 'ghost'] },
  { id: 'PROFESSIONAL', name: 'Professional', stats: ['cool', 'grit'] },
  { id: 'DIRECTOR', name: 'Director', stats: ['cool', 'flow'] },
  { id: 'GUIDE', name: 'Guide', stats: ['cool', 'ghost'] },
  { id: 'BUILDER', name: 'Builder', stats: ['grit', 'flow'] },
  { id: 'SURVIVOR', name: 'Survivor', stats: ['grit', 'ghost'] },
  { id: 'VISIONARY', name: 'Visionary', stats: ['flow', 'ghost'] },
];

const CLASS_BY_PAIR = new Map<string, ClassDefinition>(
  CLASS_DEFINITIONS.map((definition) => [getClassPairKey(definition.stats[0], definition.stats[1]), definition])
);

function statPriorityIndex(stat: StatKey) {
  return STAT_PRIORITY.indexOf(stat);
}

export function getClassPairKey(a: StatKey, b: StatKey) {
  return [a, b].sort((left, right) => statPriorityIndex(left) - statPriorityIndex(right)).join(':');
}

export function rankStatsForClass(stats: StatDisplay[]) {
  return [...stats].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    if (b.xp !== a.xp) return b.xp - a.xp;
    return statPriorityIndex(a.key) - statPriorityIndex(b.key);
  });
}

export function resolveClassFromStats(stats: StatDisplay[]): ResolvedClass | null {
  if (stats.length < 2) return null;

  const rankedStats = rankStatsForClass(stats);
  const primary = rankedStats[0];
  const secondary = rankedStats[1];
  if (!primary || !secondary) return null;
  if (primary.xp <= 0 || secondary.xp <= 0) return null;

  const definition = CLASS_BY_PAIR.get(getClassPairKey(primary.key, secondary.key));
  if (!definition) return null;

  return {
    ...definition,
    topStats: [primary.key, secondary.key],
  };
}
