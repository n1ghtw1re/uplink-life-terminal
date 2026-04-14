// ============================================================
// UPLINK — CORE TYPE DEFINITIONS
// src/types/index.ts
// ============================================================

// ─── ENUMS ───────────────────────────────────────────────────

export type StatKey = 'body' | 'wire' | 'mind' | 'cool' | 'grit' | 'flow' | 'ghost';

export type MasterLevel = number; // unlimited levels

export type StreakTier = 'STANDARD' | 'HOT_STREAK' | 'ON_FIRE' | 'LEGENDARY';

export type ClassId =
  | 'OPERATOR'
  | 'PRACTITIONER'
  | 'PERFORMER'
  | 'LABORER'
  | 'ARTIST'
  | 'MONK'
  | 'ANALYST'
  | 'COMMUNICATOR'
  | 'TECHNICIAN'
  | 'DESIGNER'
  | 'OBSERVER'
  | 'SCHOLAR'
  | 'STUDENT'
  | 'ARCHITECT'
  | 'PHILOSOPHER'
  | 'PROFESSIONAL'
  | 'DIRECTOR'
  | 'GUIDE'
  | 'BUILDER'
  | 'SURVIVOR'
  | 'VISIONARY';

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
  | 'course_section'
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
export type VaultCategory = 'SIGNAL' | 'FREQUENCY' | 'ARCHIVE' | 'MATTER' | 'PULSE';
export type IngredientSource = 'USDA' | 'CUSTOM';
export type RecipeCategory = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | 'Drinks';
export type IntakeSourceKind = 'INGREDIENT' | 'RECIPE';
export type MealLabel = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

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

// Legacy reference — use getLevelFromXP from xpService for all new code
export const MASTER_LEVEL_THRESHOLDS: Record<number, number> = {
  0: 0, 1: 1400, 2: 3000, 3: 4800, 4: 6800, 5: 9000,
  6: 11400, 7: 14000, 8: 16800, 9: 19800, 10: 23000,
};

export const STREAK_MULTIPLIERS: Record<StreakTier, number> = {
  STANDARD: 1.0,
  HOT_STREAK: 1.5,
  ON_FIRE: 2.0,
  LEGENDARY: 3.0,
};

export const STAT_META: Record<StatKey, { icon: string; name: string; domain: string }> = {
  body: { icon: '▲', name: 'BODY', domain: 'Physical fitness, health, movement' },
  wire: { icon: '⬡', name: 'WIRE', domain: 'Technology, tools, digital skills' },
  mind: { icon: '◈', name: 'MIND', domain: 'Learning, knowledge, reading' },
  cool: { icon: '◆', name: 'COOL', domain: 'Career, communication, social presence' },
  grit: { icon: '▣', name: 'GRIT', domain: 'Habits, discipline, mental resilience' },
  flow: { icon: '✦', name: 'FLOW', domain: 'Creativity, making, artistic practice' },
  ghost: { icon: '░', name: 'GHOST', domain: 'Mindfulness, stillness, inner practice' },
};

export const STAT_FLAVOR: Record<StatKey, { subtitle: string; description: string }> = {
  body: {
    subtitle: 'THE MACHINE THAT CARRIES YOU',
    description: 'Your physical capability, endurance, and recovery. The body is the only hardware you cannot swap out. Every rep, every mile, every session of discipline leaves a mark in the system.',
  },
  wire: {
    subtitle: 'FLUENT IN THE LANGUAGE OF MACHINES',
    description: 'Technical skill, digital fluency, and tool mastery. You speak to machines and they answer. The wider your WIRE, the more of the world you can reach through a terminal.',
  },
  mind: {
    subtitle: 'THE ARCHIVE NEVER STOPS GROWING',
    description: 'Knowledge, learning, and intellectual depth. Every book read, every course completed, every concept understood becomes permanent firmware. MIND compounds.',
  },
  cool: {
    subtitle: 'PRESENCE IS A SKILL',
    description: 'Career capital, communication, and social intelligence. The world runs on relationships and leverage. COOL is how you move through systems made of people.',
  },
  grit: {
    subtitle: 'SHOWING UP IS THE WHOLE GAME',
    description: 'Discipline, consistency, and mental resilience. Talent is common. Showing up every day when it does not feel good is rare. GRIT is what separates the operator from the amateur.',
  },
  flow: {
    subtitle: 'MAKING IS PROOF OF EXISTENCE',
    description: 'Creative output, craft, and artistic practice. The things you make outlast you. FLOW is the stat that turns internal experience into something that exists in the world.',
  },
  ghost: {
    subtitle: 'STILLNESS IS NOT EMPTINESS',
    description: 'Mindfulness, inner awareness, and reflective practice. In a world optimised for noise, the ability to be still is a radical capability. GHOST is the signal beneath the static.',
  },
};

export const STAT_LEVEL_TITLES: Record<StatKey, string[]> = {
  body: ['SEDENTARY', 'STIRRING', 'ACTIVE', 'CONDITIONED', 'ATHLETIC', 'ELITE', 'FORMIDABLE', 'APEX', 'UNKILLABLE', 'LEGENDARY'],
  wire: ['OFFLINE', 'CURIOUS', 'CONNECTED', 'CAPABLE', 'PROFICIENT', 'SKILLED', 'ADVANCED', 'EXPERT', 'ARCHITECT', 'ROOT ACCESS'],
  mind: ['BLANK SLATE', 'CURIOUS', 'LEARNING', 'INFORMED', 'KNOWLEDGEABLE', 'SCHOLARLY', 'INTELLECTUAL', 'DEEP READER', 'ANALYST', 'ORACLE'],
  cool: ['UNKNOWN', 'NOTICED', 'PRESENT', 'CONNECTED', 'INFLUENTIAL', 'RESPECTED', 'AUTHORITATIVE', 'NETWORKED', 'MAGNETIC', 'LEGENDARY'],
  grit: ['UNDISCIPLINED', 'TRYING', 'CONSISTENT', 'RELIABLE', 'DISCIPLINED', 'IRONCLAD', 'RELENTLESS', 'UNBREAKABLE', 'MONK-LIKE', 'IMMOVABLE'],
  flow: ['SILENT', 'DABBLING', 'MAKING', 'CRAFTING', 'SKILLED', 'ARTISAN', 'CREATOR', 'MASTER', 'VISIONARY', 'ICONIC'],
  ghost: ['SCATTERED', 'AWARE', 'PRESENT', 'CENTRED', 'GROUNDED', 'STILL', 'DEEP', 'TRANSPARENT', 'VOID', 'SIGNAL'],
};

export const MULTIPLIER_MAP: Record<StreakTier, number> = {
  STANDARD: 1.0,
  HOT_STREAK: 1.5,
  ON_FIRE: 2.0,
  LEGENDARY: 3.0,
};

// Shared level calculation — same curve as xpService, no circular import
const _T = [0, 1400, 3000, 4800, 6800, 9000, 11400, 14000, 16800, 19800, 23000, 26400, 30000, 33800, 37800, 42000, 46400, 51000, 55800, 60800, 66000, 71400, 77000, 82800, 88800, 95000, 101400, 108000, 114800, 121800, 129000, 136400, 144000, 151800, 159800, 168000, 176400, 185000, 193800, 202800, 212000, 221400, 231000, 240800, 250800, 261000, 271400, 282000, 292800, 303800, 315000, 326400, 338000, 349800, 361800, 374000, 386400, 399000, 411800, 424800, 438000];
function _calcLevel(xp: number) {
  const x = Math.max(0, xp);
  if (x >= 438000) { const a = x - 438000; return { level: 60 + Math.floor(a / 13200) + 1, xpInLevel: a % 13200, xpForLevel: 13200 }; }
  let level = 0;
  for (let i = _T.length - 1; i >= 0; i--) { if (x >= _T[i]) { level = i; break; } }
  return { level, xpInLevel: x - _T[level], xpForLevel: level < _T.length - 1 ? _T[level + 1] - _T[level] : 13200 };
}
export function getStatLevel(totalXP: number): { level: number; xpInLevel: number; xpForLevel: number } {
  return _calcLevel(totalXP);
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────

export function getStreakTier(days: number): StreakTier {
  if (days >= 30) return 'LEGENDARY';
  if (days >= 14) return 'ON_FIRE';
  if (days >= 7) return 'HOT_STREAK';
  return 'STANDARD';
}

export function getMasterLevel(totalXP: number): {
  level: MasterLevel;
  title: string;
  progressPercent: number;
  xpInLevel: number;
  xpForLevel: number;
} {
  const { level, xpInLevel, xpForLevel } = _calcLevel(totalXP);
  const progressPercent = xpForLevel > 0 ? Math.floor((xpInLevel / xpForLevel) * 100) : 0;
  const title = MASTER_LEVEL_TITLES[level as keyof typeof MASTER_LEVEL_TITLES] ?? `LVL ${level}`;
  return { level, title, progressPercent, xpInLevel, xpForLevel };
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
  name: string;
  stat_key: StatKey;
  frequency_type: 'DAILY' | 'INTERVAL' | 'SPECIFIC_DAYS' | 'TARGET';
  interval_days: number | null;
  specific_days: number[] | null;
  target_type: 'BINARY' | 'QUANTITATIVE';
  target_value: number | null;
  target_period_days: number | null;
  reminder_time: string | null;
  streak_goal: number | null;
  streak_reward: number;
  shields: number;
  current_streak: number;
  longest_streak: number;
  status: 'ACTIVE' | 'RETIRED' | 'PAUSED';
  paused_until: string | null;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  logged_for_date: string;
  completed: boolean;
  value: number | null;
  xp_awarded: number;
  logged_at: string;
}

export type PlannerRecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type PlannerRecurrenceEndType = 'NEVER' | 'ON_DATE' | 'AFTER_COUNT';

export interface PlannerRecurrenceRule {
  type: PlannerRecurrenceType;
  interval: number;
  days_of_week: number[] | null;
  end_type: PlannerRecurrenceEndType | null;
  end_date: string | null;
  count: number | null;
}

export interface PlannerEntry {
  id: string;
  title: string;
  date: string;
  time: string | null;
  completed: boolean;
  recurrence_type: PlannerRecurrenceType;
  recurrence_interval: number;
  recurrence_days_of_week: number[] | null;
  recurrence_end_type: PlannerRecurrenceEndType | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlannerOccurrenceException {
  id: string;
  entry_id: string;
  occurrence_date: string;
  title: string | null;
  date: string | null;
  time: string | null;
  completed: boolean | null;
  is_deleted: boolean;
  created_at: string;
}

export interface PlannerOccurrence {
  entry_id: string;
  occurrence_date: string;
  title: string;
  date: string;
  time: string | null;
  completed: boolean;
  isRecurring: boolean;
  sourceEntry: PlannerEntry;
  exception: PlannerOccurrenceException | null;
}

export interface VaultSignalMetadata {
  version?: string | null;
  platform?: string | null;
  stack?: string | null;
  link_url?: string | null;
}

export interface VaultFrequencyMetadata {
  duration?: string | null;
  format?: string | null;
  collaborators?: string | null;
  link_url?: string | null;
}

export interface VaultArchiveMetadata {
  word_count?: number | null;
  page_count?: number | null;
  publisher?: string | null;
  edition?: string | null;
  link_url?: string | null;
}

export interface VaultMatterMetadata {
  materials?: string | null;
  dimensions?: string | null;
  weight?: string | null;
}

export interface VaultPulseMetadata {
  venue?: string | null;
  event_date?: string | null;
  audience_size?: number | null;
  role?: string | null;
}

export type VaultMetadata =
  | VaultSignalMetadata
  | VaultFrequencyMetadata
  | VaultArchiveMetadata
  | VaultMatterMetadata
  | VaultPulseMetadata;

export interface VaultItem {
  id: string;
  title: string;
  category: VaultCategory;
  completed_date: string;
  notes: string | null;
  metadata: VaultMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface SleepSession {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  quality: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecoverySettings {
  id: number;
  daily_goal_minutes: number;
}

export interface SleepDaySummary {
  anchor_date: string;
  total_minutes: number;
  session_count: number;
  avg_quality: number | null;
  sessions: SleepSession[];
}

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  source: IngredientSource;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string | null;
  ingredient_name: string;
  ingredient_source: IngredientSource | null;
  input_text: string | null;
  grams: number;
  calories_total: number;
  protein_g_total: number;
  carbs_g_total: number;
  fat_g_total: number;
  sort_order: number;
}

export interface RecipeStep {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction_text: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  is_prepared_meal: boolean;
  servings: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_carbs_g: number;
  per_serving_fat_g: number;
  created_at: string;
  updated_at: string;
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
}

export interface IntakeSettings {
  id: number;
  daily_calorie_goal: number;
  protein_percent: number;
  carbs_percent: number;
  fat_percent: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface IntakeLog {
  id: string;
  logged_at: string;
  anchor_date: string;
  meal_label: MealLabel | null;
  notes: string | null;
  source_kind: IntakeSourceKind;
  source_id: string | null;
  source_name: string;
  source_origin: IngredientSource | 'RECIPE' | null;
  grams: number | null;
  servings: number | null;
  input_text: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  updated_at: string;
}

export interface IntakeDaySummary {
  anchor_date: string;
  logs: IntakeLog[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  protein_percent_actual: number;
  carbs_percent_actual: number;
  fat_percent_actual: number;
  calorie_goal_hit: boolean;
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
  url: string | null;
  type: ResourceType;
  tags: string[];
  linkedSkillIds: string[];
  status: ResourceStatus;
  description: string | null;
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

export interface BackgroundRecord {
  id: string;
  type: 'CAREER' | 'EDUCATION';
  title: string;
  organization: string;
  dateStr: string;
  description: string;
  createdAt: string;
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

