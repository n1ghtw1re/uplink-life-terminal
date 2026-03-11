// ============================================================
// UPLINK — CORE TYPE DEFINITIONS
// src/types/index.ts
// ============================================================

// ─── ENUMS ───────────────────────────────────────────────────

export type StatKey = 'body' | 'wire' | 'mind' | 'cool' | 'grit' | 'flow' | 'ghost';

export type MasterLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type StreakTier = 'STANDARD' | 'HOT_STREAK' | 'ON_FIRE' | 'LEGENDARY';

export type ClassId =
  | 'NETRUNNER' | 'TECHIE' | 'EDGERUNNER' | 'SOLO' | 'NOMAD' | 'MEDTECH'
  | 'FIXER' | 'EXEC' | 'ROCKERBOY' | 'AGITATOR' | 'WITCH' | 'SIGNAL'
  | 'PROPHET' | 'AGITPROP' | 'HERALD';

export type MediaType = 'book' | 'comic' | 'film' | 'documentary' | 'tv' | 'album';

export type MediaStatus = 'READING' | 'WATCHING' | 'LISTENING' | 'QUEUED' | 'FINISHED' | 'DROPPED';

export type CourseStatus = 'ACTIVE' | 'COMPLETE' | 'PAUSED' | 'DROPPED';

export type ProjectStatus = 'ACTIVE' | 'COMPLETE' | 'PAUSED' | 'ARCHIVED';

export type GoalTier = 'life' | 'mid' | 'sprint';

export type LogFieldType = 'toggle' | 'number' | 'duration' | 'scale5' | 'scale10' | 'text' | 'select';

export type XPSource =
  | 'session'
  | 'checkin'
  | 'habit_milestone'
  | 'goal_complete'
  | 'book_complete'
  | 'course_complete'
  | 'course_lesson'
  | 'course_quiz'
  | 'course_assignment'
  | 'cert_earned'
  | 'film_watched'
  | 'tv_season'
  | 'tv_series'
  | 'album_listened'
  | 'documentary_watched'
  | 'comic_complete'
  | 'project_milestone'
  | 'project_complete'
  | 'resource_read'
  | 'tool_added'
  | 'weekly_challenge'
  | 'legacy';

export type ToolType = 'software' | 'hardware' | 'subscription' | 'service' | 'other';
export type ToolStatus = 'ACTIVE' | 'INACTIVE' | 'TRIALING';
export type ResourceType = 'article' | 'documentation' | 'video' | 'tool' | 'reference' | 'other';
export type ResourceStatus = 'UNREAD' | 'READ' | 'SAVED';
export type SocialStatus = 'ACTIVE' | 'DORMANT' | 'PRIVATE';
export type HabitFrequency = 'daily' | 'weekly';
export type ProjectType = 'software' | 'creative' | 'business' | 'physical' | 'research' | 'other';

// ─── CONSTANTS ───────────────────────────────────────────────

export const MASTER_LEVEL_TITLES: Record<MasterLevel, string> = {
  1: 'INITIALISING',
  2: 'SCRIPT KIDDIE',
  3: 'CURIOUS OPERATOR',
  4: 'APPRENTICE',
  5: 'ANALYST',
  6: 'SPECIALIST',
  7: 'ENGINEER',
  8: 'ARCHITECT',
  9: 'SYSTEMS MASTER',
  10: 'ROOT ACCESS',
};

export const MASTER_LEVEL_THRESHOLDS: Record<MasterLevel, number> = {
  1: 0,
  2: 500,
  3: 1200,
  4: 2500,
  5: 4500,
  6: 7500,
  7: 12000,
  8: 18000,
  9: 26000,
  10: 36000,
};

export const STREAK_MULTIPLIERS: Record<StreakTier, number> = {
  STANDARD:   1.0,
  HOT_STREAK: 1.5,
  ON_FIRE:    2.0,
  LEGENDARY:  3.0,
};

export const STAT_META: Record<StatKey, { icon: string; name: string; domain: string }> = {
  body:  { icon: '▲', name: 'BODY',  domain: 'Physical fitness, health, movement' },
  wire:  { icon: '⬡', name: 'WIRE',  domain: 'Technology, tools, digital skills' },
  mind:  { icon: '◈', name: 'MIND',  domain: 'Learning, knowledge, reading' },
  cool:  { icon: '◆', name: 'COOL',  domain: 'Career, communication, social presence' },
  grit:  { icon: '▣', name: 'GRIT',  domain: 'Habits, discipline, mental resilience' },
  flow:  { icon: '✦', name: 'FLOW',  domain: 'Creativity, making, artistic practice' },
  ghost: { icon: '░', name: 'GHOST', domain: 'Mindfulness, stillness, inner practice' },
};

// ─── HELPER FUNCTIONS ────────────────────────────────────────

export function getStreakTier(days: number): StreakTier {
  if (days >= 30) return 'LEGENDARY';
  if (days >= 14) return 'ON_FIRE';
  if (days >= 7)  return 'HOT_STREAK';
  return 'STANDARD';
}

export function getMasterLevel(totalXP: number): {
  level: MasterLevel;
  title: string;
  progressPercent: number;
  xpInLevel: number;
  xpForLevel: number;
} {
  let level: MasterLevel = 1;
  for (let l = 10; l >= 1; l--) {
    if (totalXP >= MASTER_LEVEL_THRESHOLDS[l as MasterLevel]) {
      level = l as MasterLevel;
      break;
    }
  }
  const currentThreshold = MASTER_LEVEL_THRESHOLDS[level];
  const nextThreshold = level < 10
    ? MASTER_LEVEL_THRESHOLDS[(level + 1) as MasterLevel]
    : MASTER_LEVEL_THRESHOLDS[10];
  const xpInLevel = totalXP - currentThreshold;
  const xpForLevel = nextThreshold - currentThreshold;
  return {
    level,
    title: MASTER_LEVEL_TITLES[level],
    progressPercent: level < 10 ? Math.floor((xpInLevel / xpForLevel) * 100) : 100,
    xpInLevel,
    xpForLevel,
  };
}

// ─── INTERFACES ──────────────────────────────────────────────

export interface Operator {
  id: string;
  callsign: string;
  displayName: string | null;
  customClassName: string | null;
  theme: 'amber' | 'green' | 'dos' | 'blood' | 'ice';
  currentLayout: string;
  bootstrapComplete: boolean;
  createdAt: string;
  lastSeen: string;
}

export interface MasterProgress {
  userId: string;
  totalXP: number;
  level: MasterLevel;
  streak: number;
  shields: number;
  lastCheckinDate: string | null;
  augmentationScore: number;
}

export interface StreakState {
  days: number;
  tier: StreakTier;
  multiplier: number;
  shields: number;
  lastCheckinDate: string | null;
}

export interface Stat {
  id: string;
  userId: string;
  key: StatKey;
  icon: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  dormant: boolean;
}

export interface LogField {
  id: string;
  skillId: string;
  type: LogFieldType;
  label: string;
  options?: string[];
  sortOrder: number;
}

export interface Skill {
  id: string;
  userId: string;
  name: string;
  stats: StatKey[];
  defaultSplit: number[];
  icon: string;
  level: number;
  xp: number;
  xpToNext: number;
  isTemplate: boolean;
  isLegacy: boolean;
  notes: string | null;
  logFields: LogField[];
  createdAt: string;
}

export interface SessionFieldValue {
  fieldId: string;
  label: string;
  value: string | number | boolean;
}

export interface Session {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  durationMinutes: number;
  statSplit: { stat: StatKey; percent: number }[];
  fieldValues: SessionFieldValue[];
  notes: string | null;
  isLegacy: boolean;
  loggedAt: string;
  createdAt: string;
  skillXpAwarded: number;
  statXpAwarded: { stat: StatKey; amount: number }[];
  masterXpAwarded: number;
  multiplierApplied: number;
}

export interface XPEntry {
  id: string;
  userId: string;
  source: XPSource;
  sourceId: string | null;
  tier: 'skill' | 'stat' | 'master';
  amount: number;
  baseAmount: number;
  multiplier: number;
  statKey: StatKey | null;
  skillId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface XPPreview {
  skillXP: number;
  statXP: { stat: StatKey; amount: number }[];
  masterXP: number;
  multiplier: number;
  multiplierTier: StreakTier;
  total: number;
}

export interface DailyCheckin {
  id: string;
  userId: string;
  date: string;
  statsChecked: StatKey[];
  habitsChecked: string[];
  notes: string | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  frequency: HabitFrequency;
  daysOfWeek: number[] | null;
  streak: number;
  shields: number;
  lastCompletedDate: string | null;
  active: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  date: string;
  completed: boolean;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  tier: GoalTier;
  parentId: string | null;
  title: string;
  description: string | null;
  deadline: string | null;
  linkedSkillIds: string[];
  linkedProjectIds: string[];
  linkedCourseIds: string[];
  progressPercent: number;
  completedAt: string | null;
  completionNote: string | null;
  createdAt: string;
}

export interface Milestone {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  xpReward: number;
  completedAt: string | null;
  sortOrder: number;
}

export interface Course {
  id: string;
  userId: string;
  name: string;
  provider: string | null;
  subject: string | null;
  linkedStats: StatKey[];
  linkedSkillIds: string[];
  status: CourseStatus;
  progress: number;
  certEarned: boolean;
  url: string | null;
  notes: string | null;
  isLegacy: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  completedAt: string | null;
}

export interface CourseLesson {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  type: 'lesson' | 'quiz' | 'assignment';
  sortOrder: number;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
}

export interface BookMeta {
  currentPage: number;
  totalPages: number;
}

export interface FilmMeta {
  runtime: number | null;
  platform: string | null;
}

export interface TVMeta {
  totalSeasons: number | null;
  currentSeason: number | null;
  totalEpisodes: number | null;
  platform: string | null;
}

export interface AlbumMeta {
  intentionalListen: boolean;
}

export interface ComicMeta {
  issueCount: number | null;
  comicType: 'single' | 'trade' | 'manga' | null;
}

export interface MediaItem {
  id: string;
  userId: string;
  type: MediaType;
  title: string;
  creator: string | null;
  year: number | null;
  status: MediaStatus;
  linkedStat: StatKey | null;
  linkedSkillIds: string[];
  rating: number | null;
  notes: string | null;
  isLegacy: boolean;
  completedAt: string | null;
  createdAt: string;
  meta: BookMeta | FilmMeta | TVMeta | AlbumMeta | ComicMeta | null;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  linkedSkillIds: string[];
  progress: number;
  url: string | null;
  notes: string | null;
  isLegacy: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  xpReward: number;
  completedAt: string | null;
  sortOrder: number;
}

export interface Certification {
  id: string;
  userId: string;
  name: string;
  issuer: string | null;
  linkedStat: StatKey | null;
  linkedSkillIds: string[];
  earnedAt: string | null;
  expiresAt: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  fromCourseId: string | null;
  notes: string | null;
  isLegacy: boolean;
  createdAt: string;
}

export interface Tool {
  id: string;
  userId: string;
  name: string;
  type: ToolType;
  category: string | null;
  linkedStat: StatKey | null;
  status: ToolStatus;
  url: string | null;
  cost: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Augmentation {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  proficiency: number;
  useCase: string | null;
  linkedSkillIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
  lastUsedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Resource {
  id: string;
  userId: string;
  title: string;
  url: string;
  type: ResourceType;
  tags: string[];
  linkedSkillIds: string[];
  status: ResourceStatus;
  notes: string | null;
  isLegacy: boolean;
  createdAt: string;
}

export interface Social {
  id: string;
  userId: string;
  platform: string;
  username: string;
  url: string | null;
  status: SocialStatus;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  content: string;
  linkedType: string | null;
  linkedId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: string;
  userId: string;
  badgeKey: string;
  earnedAt: string;
  shieldAwarded: boolean;
}

export interface WeeklyChallenge {
  id: string;
  userId: string;
  weekStart: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  completedAt: string | null;
}

export interface Lifepath {
  userId: string;
  origin: string | null;
  personalCode: string | null;
  lifeGoal: string | null;
  currentFocus: string | null;
  rootAccessMeaning: string | null;
  beforeTheUplink: string | null;
  updatedAt: string;
}

export interface ClassAffinity {
  classId: ClassId;
  percent: number;
  isPrimary: boolean;
  isSecondary: boolean;
  isRare: boolean;
}