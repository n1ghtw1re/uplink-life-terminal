export const operatorData = {
  callsign: 'VOID_SIGNAL',
  level: 6,
  title: 'SPECIALIST',
  xp: 7820,
  xpToNext: 12000,
  streak: 14,
  multiplier: 2.0,
  shields: [true, true, false],
  classPrimary: 'ROCKERBOY',
  classSecondary: 'WITCH',
  augmentation: 74,
};

export interface Stat {
  key: string;
  icon: string;
  name: string;
  level: number | null;
  streak: number;
  xp: number;
  xpToNext: number;
  dormant: boolean;
}

export const stats: Stat[] = [
  { key: 'body', icon: '▲', name: 'BODY', level: 4, streak: 9, xp: 680, xpToNext: 1200, dormant: false },
  { key: 'wire', icon: '⬡', name: 'WIRE', level: 6, streak: 14, xp: 1100, xpToNext: 1500, dormant: false },
  { key: 'mind', icon: '◈', name: 'MIND', level: 5, streak: 14, xp: 900, xpToNext: 1400, dormant: false },
  { key: 'cool', icon: '◆', name: 'COOL', level: null, streak: 0, xp: 0, xpToNext: 0, dormant: true },
  { key: 'grit', icon: '▣', name: 'GRIT', level: null, streak: 0, xp: 0, xpToNext: 0, dormant: true },
  { key: 'flow', icon: '✦', name: 'FLOW', level: 5, streak: 12, xp: 850, xpToNext: 1400, dormant: false },
  { key: 'ghost', icon: '░', name: 'GHOST', level: 3, streak: 6, xp: 420, xpToNext: 800, dormant: false },
];

export interface Course {
  name: string;
  provider: string;
  progress: number;
  stats: string;
  status: 'ACTIVE' | 'COMPLETE';
}

export const courses: Course[] = [
  { name: 'React Fundamentals', provider: 'deeplearning.ai', progress: 78, stats: 'WIRE/MIND', status: 'ACTIVE' },
  { name: 'CompTIA Security+', provider: 'Udemy', progress: 42, stats: 'WIRE', status: 'ACTIVE' },
  { name: 'Spanish B1', provider: 'self-directed', progress: 31, stats: 'MIND/COOL', status: 'ACTIVE' },
  { name: 'Python Basics', provider: 'Codecademy', progress: 100, stats: 'WIRE', status: 'COMPLETE' },
];

export interface Book {
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  status: 'READING' | 'QUEUED' | 'FINISHED';
  rating?: number;
  stat?: string;
}

export const books: Book[] = [
  { title: 'Clean Code', author: 'R.Martin', currentPage: 215, totalPages: 464, status: 'READING', stat: 'MIND' },
  { title: 'Dune', author: 'F.Herbert', currentPage: 340, totalPages: 896, status: 'READING' },
  { title: 'Neuromancer', author: 'W.Gibson', currentPage: 0, totalPages: 271, status: 'QUEUED' },
  { title: 'Snow Crash', author: 'N.Stephenson', currentPage: 0, totalPages: 480, status: 'QUEUED' },
  { title: 'Thinking Fast/Slow', author: 'D.Kahneman', currentPage: 499, totalPages: 499, status: 'FINISHED', rating: 5, stat: 'MIND' },
  { title: 'The Power of Habit', author: 'C.Duhigg', currentPage: 371, totalPages: 371, status: 'FINISHED', rating: 4, stat: 'GRIT' },
];

export interface Habit {
  name: string;
  streak: number;
  checked: boolean;
  shields: number;
}

export const habits: Habit[] = [
  { name: 'Morning routine', streak: 14, checked: true, shields: 2 },
  { name: 'Cold shower', streak: 3, checked: false, shields: 0 },
  { name: 'Journaling', streak: 7, checked: true, shields: 1 },
];

export const recentXp = [
  { amount: 50, desc: 'Completed React Module', time: '14m ago' },
  { amount: 100, desc: 'Finished TypeScript Mastery', time: '2h ago' },
  { amount: 25, desc: 'Read 30 pages Clean Code', time: '6h ago' },
];

export const xpHistory = [
  { amount: 200, desc: 'MMA session', stats: 'BODY/GRIT', time: '14m ago' },
  { amount: 100, desc: 'React module complete', stats: 'WIRE', time: '2h ago' },
  { amount: 50, desc: 'Meditation', stats: 'GHOST', time: '6h ago' },
];

export const classAffinities = [
  { name: 'ROCKERBOY', percent: 42 },
  { name: 'WITCH', percent: 35 },
  { name: 'SIGNAL', percent: 28 },
  { name: 'NETRUNNER', percent: 21 },
];

export const arsenalCounts = {
  courses: 3,
  library: 47,
  projects: 2,
  certs: 8,
  tools: 14,
  augments: 6,
  resources: 89,
};

export const trackingCounts = {
  goals: 5,
  habits: 6,
};

// Generate heatmap data - 12 weeks x 7 days
export const generateHeatmap = (): number[][] => {
  const data: number[][] = [];
  for (let day = 0; day < 7; day++) {
    const row: number[] = [];
    for (let week = 0; week < 12; week++) {
      row.push(Math.random() > 0.25 ? (Math.random() > 0.4 ? 2 : 1) : 0);
    }
    data.push(row);
  }
  return data;
};

export interface Skill {
  name: string;
  stats: string[];
  icon: string;
  defaultSplit?: number[]; // percentages for each stat, must sum to 100
}

export const skills: Skill[] = [
  { name: 'MMA', stats: ['BODY', 'GRIT'], icon: '▲', defaultSplit: [80, 20] },
  { name: 'Weightlifting', stats: ['BODY'], icon: '▲' },
  { name: 'Running', stats: ['BODY'], icon: '▲' },
  { name: 'Coding', stats: ['WIRE'], icon: '⬡' },
  { name: 'Web Dev', stats: ['WIRE'], icon: '⬡' },
  { name: 'Spanish', stats: ['MIND', 'COOL'], icon: '◈', defaultSplit: [60, 40] },
  { name: 'Reading', stats: ['MIND'], icon: '◈' },
  { name: 'Meditation', stats: ['GHOST'], icon: '░' },
  { name: 'Music Production', stats: ['FLOW'], icon: '✦' },
  { name: 'Journaling', stats: ['GRIT'], icon: '▣' },
  { name: 'Morning Routine', stats: ['GRIT'], icon: '▣' },
  { name: 'Drawing', stats: ['FLOW'], icon: '✦' },
  { name: 'Breathwork', stats: ['GHOST'], icon: '░' },
  { name: 'Networking', stats: ['COOL'], icon: '◆' },
];

export const dailyCheckinStats = [
  { icon: '▲', name: 'BODY', checked: true },
  { icon: '⬡', name: 'WIRE', checked: true },
  { icon: '◈', name: 'MIND', checked: false },
  { icon: '✦', name: 'FLOW', checked: false },
  { icon: '░', name: 'GHOST', checked: true },
  { icon: '▣', name: 'GRIT', checked: false },
];
