# UPLINK: Life Operating System - Complete App Documentation

**Last Updated:** April 2026  
**Version:** Production  
**Platform:** Web-based React Application (Vite + TypeScript)

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [Core Systems](#core-systems)
3. [Widget Ecosystem](#widget-ecosystem)
4. [Gamification & Progression](#gamification--progression)
5. [Data Management](#data-management)
6. [Technical Architecture](#technical-architecture)
7. [Feature Breakdown by Category](#feature-breakdown-by-category)

---

## Executive Overview

**UPLINK** is a comprehensive personal development and life management platform designed as an operating system for human optimization. It combines habit tracking, skill development, media consumption logging, nutrition tracking, planning, and recovery management into a unified dashboard experience.

The application features:
- A **9-level Master Level progression system** with unlimited progression
- **7-stat progression system** (BODY, WIRE, MIND, COOL, GRIT, FLOW, GHOST)
- **Retro-futuristic CRT aesthetic** with customizable themes
- **Modular widget-based dashboard** with drag-and-drop layout
- **Real-time data persistence** using PGLite (local PostgreSQL database)
- **Gamified feedback loops** with XP rewards, shields, streaks, and challenges

### Primary User Journey

1. **Daily Check-in** - Quick mood/energy/focus check
2. **Habit Logging** - Complete daily habits with optional custom logging
3. **Stat Review** - Track performance across 7 life dimensions
4. **Content Consumption** - Log books, films, courses, media
5. **Nutrition/Recovery** - Track meals, ingredients, recovery metrics
6. **Planning** - Manage goals, projects, tasks across time horizons
7. **Reflection** - Review progress, badges, and weekly challenges

---

## Core Systems

### 1. Master Level System

**Purpose:** Represents overall competence and progress

- **Levels:** 1-10 (primary progression), unlimited beyond level 10
- **XP Thresholds:**
  - Level 1: 0 XP
  - Level 2: 1,400 XP
  - Level 3: 3,000 XP
  - Level 4: 4,800 XP
  - Level 5: 6,800 XP
  - Level 6: 9,000 XP
  - Level 7: 11,400 XP
  - Level 8: 14,000 XP
  - Level 9: 16,800 XP
  - Level 10: 19,800 XP
  - Level 10+: 23,000+ XP (continues scaling)

- **Level Titles:**
  1. INITIALISING
  2. SCRIPT KIDDIE
  3. CURIOUS OPERATOR
  4. APPRENTICE
  5. ANALYST
  6. SPECIALIST
  7. ENGINEER
  8. ARCHITECT
  9. SYSTEMS MASTER
  10. ROOT ACCESS

### 2. The Seven Stats

Each stat tracks a different life domain. All stats progress independently through XP accumulation.

| Stat | Icon | Domain | Flavor |
|------|------|--------|--------|
| **BODY** | ▲ | Physical fitness, health, movement | The machine that carries you. Every rep and mile compounds. |
| **WIRE** | ⬡ | Technology, tools, digital skills | Fluent in the language of machines. The wider your WIRE, the more you can reach. |
| **MIND** | ◈ | Learning, knowledge, reading | The archive never stops growing. Knowledge compounds forever. |
| **COOL** | ◆ | Career, communication, social presence | Presence is a skill. The world runs on relationships and leverage. |
| **GRIT** | ▣ | Habits, discipline, mental resilience | Showing up is the whole game. Talent is common; showing up is rare. |
| **FLOW** | ✦ | Creativity, making, artistic practice | Making is proof of existence. What you create outlasts you. |
| **GHOST** | ░ | Mindfulness, stillness, inner practice | The practice of being. The quieter you become, the more you hear. |

### 3. Streak System

**Purpose:** Incentivize consistent daily engagement

- **Tier 1 (STANDARD):** 1.0x XP multiplier
- **Tier 2 (HOT_STREAK):** 1.5x XP multiplier (7+ day streak)
- **Tier 3 (ON_FIRE):** 2.0x XP multiplier (14+ day streak)
- **Tier 4 (LEGENDARY):** 3.0x XP multiplier (30+ day streak)

**Shields:** Users earn shields to protect active streaks. Maximum 3 shields per habit.

### 4. Class System

The system tracks which **Class** the user best identifies with, influencing UI presentation and recommendations.

**Available Classes:** (21 total)
OPERATOR, PRACTITIONER, PERFORMER, LABORER, ARTIST, MONK, ANALYST, COMMUNICATOR, TECHNICIAN, DESIGNER, OBSERVER, SCHOLAR, STUDENT, ARCHITECT, PHILOSOPHER, PROFESSIONAL, DIRECTOR, GUIDE, BUILDER, SURVIVOR, VISIONARY

---

## Widget Ecosystem

### Widget Categories

Widgets are organized into 6 categories for discovery and management:

#### CORE Widgets (Essential systems)
- **XP & LEVELLING** - Master level, XP progress, streak, shields, weekly challenge
- **DAILY CHECK-IN** - Quick mood/energy/focus check with emotional notes
- **HABITS** - Active habit tracking with daily logs and streaks

#### ARSENAL Widgets (Content & Knowledge)
- **MEDIA LIBRARY** - Books, films, TV, albums — tabbed by type, reading progress
- **COURSES** - Learning programs with sections, lessons, quizzes, assignments
- **SKILLS** - Top skills by level — XP bars, stat icons, quick access
- **TOOLS** - Active tools by level — toolXP progress, filter by type
- **RESOURCES** - Websites, links, documents — filter by read/unread

#### BIOSYSTEM Widgets (Health & Nutrition)
- **INTAKE** - Daily food logging with calorie goals, macro totals, streak tracking
- **RECIPES** - Saved recipes with servings, ingredient snapshots, macro totals
- **INGREDIENTS** - Ingredient database from USDA Central with searchable nutritional data
- **RECOVERY** - Sleep, rest days, mental recovery tracking

#### TRACKING Widgets (Life Data)
- **STAT OVERVIEW** - Real-time view of all 7 stats with XP progress
- **STREAK HEATMAP** - Visual habit completion calendar (similar to GitHub contributions)
- **PLANNER** - Goal management across life/mid/sprint time horizons with status tracking
- **NOTES** - Personal notes with timestamps, searchable database

#### UTILITY Widgets (Tools & Helpers)
- **TERMINAL** - Command-line interface for quick actions and navigation
- **CALCULATOR** - CRT-style calculator with retro aesthetic
- **CLOCK** - Live clock with timer and pomodoro functionality
- **UNIT CONVERTER** - Unit conversion utility

#### FUTURE Widgets (Planned)
- Not yet fully implemented; displayed as greyed-out in widget manager

### Widget Features (Universal)

All widgets support:
- **Minimize/Maximize** - Toggle compact vs full view
- **Fullscreen Mode** - Expand any widget to fill entire screen
- **Close/Restore** - Remove from dashboard or restore later via widget manager
- **Responsive Layout** - Drag-and-drop grid with snap-to-grid positioning
- **Persistent State** - Layout and active widgets saved to localStorage

---

## Gamification & Progression

### XP Sources

The system awards XP for 24+ types of activities:

**Habit System:**
- Daily habit completion: 10 XP (5 stat + 5 master)
- Weekly 7-day milestone: +50 bonus XP
- Monthly 30-day milestone: +500 bonus XP

**Learning & Media:**
- Course completed
- Course section completed
- Course lesson completed
- Course quiz completed
- Course assignment completed
- Book completed
- Film watched
- TV season completed
- TV series completed
- Album listened
- Documentary watched
- Comic completed

**Achievements & Milestones:**
- Certificate earned
- Habit milestone reached
- Goal completed
- Resource read
- Tool added
- Project milestone reached
- Project completed
- Weekly challenge completed

**Legacy:**
- Legacy XP transfer from previous systems

### Weekly Challenges

Random weekly challenges provide bonus XP opportunities for specific stat targets. Displayed in XP widget.

### Badges & Achievements

**Currently Tracked Badges (In Development):**
- FIRST HABIT - Create your first habit
- WEEK WARRIOR - Complete a 7-day streak
- IRON WILL - Complete a 30-day streak
- MULTI-TRACK - Run 3 habits simultaneously
- SHIELD MAX - Max shields on any habit
- COMMITTED - Hit a streak goal

---

## Feature Breakdown by Category

### 1. HABITS System

**Core Functionality:**
- Create daily and weekly recurring habits
- Track completion with daily check-off
- Custom logging fields (toggle, number, duration, scale5, scale10, text, select)
- Automatic XP and stat distribution
- Streak tracking with shield protection
- Habit filtering (active, completed, archived)
- Search and sort capabilities

**Full Page Features:**
- **Dashboard Page:** Active habit overview, this week's performance, quick-add
- **Badges Page:** Achievement unlock tracking
- **All Habits Page:** Complete habit library with status filters

**Stat Targeting:**
Each habit targets one or more of the 7 stats, distributing XP accordingly on completion.

---

### 2. DAILY CHECK-IN

**Purpose:** Quick daily pulse check without friction

**Captured Data:**
- Current mood (emoji-based)
- Energy level (1-10 scale)
- Focus level (1-10 scale)
- Optional note text
- Timestamp with date tracking

**Integration:**
- Fills first XP widget entry
- Starts streak counter
- Informs daily recommendations

---

### 3. MEDIA LIBRARY

**Supported Media Types:**
- Books
- Comics
- Films
- Documentaries
- TV (series + seasons)
- Albums (music)

**Tracking Features:**
- Status: READING, WATCHING, LISTENING, QUEUED, FINISHED, DROPPED
- Reading progress percentage (for books)
- Episode tracking (for TV)
- Search and filter by type
- Quick-add interface
- Reading history with dates

**XP Rewards:**
Awarded on completion status update to FINISHED or equivalent

---

### 4. COURSES & LESSONS

**Course Structure:**
- Course (parent container)
- Sections (course divisions)
- Lessons (individual content units)
- Quizzes (assessment)
- Assignments (practice)

**Status Tracking:**
- ACTIVE - Currently in progress
- COMPLETE - Finished
- PAUSED - Temporarily stopped
- DROPPED - Abandoned

**Progress Metrics:**
- Percentage completion
- Lessons completed / total lessons
- Quiz scores
- Assignment submissions

**XP Awards:**
- Course completion: Large XP bonus
- Section completion: Medium XP bonus
- Lesson completion: Small XP award
- Quiz completion: Variable based on score
- Assignment completion: Variable based on submission quality

---

### 5. SKILLS & EXPERTISE

**Skill Tracking:**
- Individual skill names and descriptions
- Associated stat category
- Current level (auto-calculated from XP)
- XP progress toward next level
- Tools and resources per skill
- Usage/practice frequency

**Display:**
- Top 10 skills by level shown in widget
- Full skill list in dedicated page
- Stat-based filtering
- Quick access to skill details

---

### 6. TOOLS & SOFTWARE

**Tool Management:**
- Tool name and description
- Type: software, hardware, subscription, service, other
- Status: ACTIVE, INACTIVE, TRIALING
- Current level (calculated from toolXP)
- XP progress
- Category/domain tagging
- Cost tracking (for paid tools)

**Features:**
- Add new tools with quick setup
- Increment tool XP manually
- Transition between status states
- Filter by type and status
- Monitor tool portfolio

---

### 7. RESOURCES & KNOWLEDGE

**Resource Types:**
- Article
- Documentation
- Video
- Tool/Service
- Reference
- Other

**Status Tracking:**
- UNREAD - Not yet consumed
- READ - Completed
- SAVED - Bookmarked for later

**Features:**
- Add new resources with URL/description
- Search by title
- Filter by read status
- Mark as read to earn XP
- Categorize and tag
- Link resources to courses/skills

---

### 8. INTAKE & NUTRITION

**Features:**
- Log daily meals (breakfast, lunch, dinner, snack)
- Select from recipe list or individual ingredients
- Auto-calculate macros (protein, carbs, fat, fiber)
- Track against daily calorie goals
- Nutritional data from USDA Central database
- Add custom ingredients with manual entry
- View daily macro summary
- Streak tracking for logging consistency

**Data:**
- Meal timestamp
- Ingredient/recipe selection
- Serving size
- Calculated calories
- Macro breakdown

---

### 9. RECIPES

**Recipe Features:**
- Custom recipe creation
- Ingredient list with serving sizes
- Auto-calculated macro totals
- Category: Breakfast, Lunch, Dinner, Snacks, Drinks
- Ingredient snapshots (preserves ingredients at recipe creation)
- Reusable in intake logging
- Search and filter
- Edit and delete functionality

---

### 10. INGREDIENTS DATABASE

**Data Source:** USDA FoodData Central (foundation foods)

**Searchable Information:**
- Food name
- Serving size options
- Calories
- Protein, carbohydrates, fat
- Fiber, sugar
- Micronutrients (vitamins, minerals)
- Allergen information

**Features:**
- Fast search with autocomplete
- Serving size conversion
- Quick add to recipes
- Custom ingredient option

---

### 11. RECOVERY

**Tracking Metrics:**
- Sleep duration
- Sleep quality (1-10 scale)
- Rest day designation
- Mental recovery practices
- Meditation/mindfulness sessions
- Recovery exercises

**Purpose:**
Ensures balanced effort-recovery cycle to prevent burnout.

---

### 12. PLANNER & GOALS

**Goal Tiers:**
- **Life Goals:** Long-term vision (1+ years)
- **Mid-tier Goals:** Medium-term targets (3-6 months)
- **Sprint Goals:** Short-term objectives (1-2 weeks)

**Status Tracking:**
- ACTIVE - Current goal
- COMPLETE - Successfully achieved
- PAUSED - Temporarily halted
- ARCHIVED - Abandoned

**Goal Features:**
- Description and target metrics
- Milestone tracking
- Progress percentage
- Due date management
- Stat alignment (which stat does it improve?)
- Priority levels
- Notes and reflection prompts

---

### 13. PROJECTS

**Project Management:**
- Project name and description
- Type: software, creative, business, physical, research, other
- Status: ACTIVE, COMPLETE, PAUSED, ARCHIVED
- Milestone tracking
- Team member tracking (if collaborative)
- Progress percentage
- Due dates
- Deliverables tracking

**XP Rewards:**
- Milestone completion: Medium XP
- Project completion: Large XP bonus

---

### 14. NOTES

**Note Features:**
- Free-form text notes
- Timestamp on creation
- Optional tags/categories
- Search functionality
- Edit and delete
- Pin important notes
- Sync across sessions

---

### 15. VAULT (Secret Stash)

**Purpose:** Personal knowledge/data storage

**Categories:**
- SIGNAL - Important insights
- FREQUENCY - Recurring information
- ARCHIVE - Historical data
- MATTER - Physical references
- PULSE - Current focus areas

**Features:**
- Store structured or unstructured data
- Quick access to frequently-used info
- Private and searchable
- Organize by category

---

### 16. AUGMENTS (Enhancements/Modifications)

**Purpose:** Track personal modifications, improvements, or enhancements

**Categories:**
- Physical (equipment, gear, physical modifications)
- Mental (supplements, nootropics, mental practices)
- Digital (software, tools, automation)
- Social (group memberships, networks)
- Experiential (courses, experiences, practices)

**Tracking:**
- Augment name and type
- Active/inactive status
- Effectiveness rating
- Cost and sustainability
- Date added
- Notes and observations

---

### 17. SOCIALS (Social Presence)

**Purpose:** Manage social media and community presence

**Platforms:**
- Major social networks (Twitter, LinkedIn, Instagram, etc.)
- Community memberships
- Professional networks
- Content communities

**Status:**
- ACTIVE - Regularly maintained
- DORMANT - Inactive but preserved
- PRIVATE - Active but not shared

**Metrics:**
- Follower/member count
- Content frequency
- Engagement tracking
- Growth monitoring

---

### 18. TERMINAL (Command Interface)

**Purpose:** Quick command-line navigation and shortcuts

**Capabilities:**
- Type commands to navigate to sections
- Autocomplete for common actions
- Quick widget open/close
- Data entry shortcuts
- System commands

**Example Commands:**
- `open xp` - Show XP widget
- `log habit [name]` - Quick habit log
- `checkin` - Open daily check-in
- `search [query]` - Global search
- `theme [name]` - Change theme

---

### 19. STAT OVERVIEW (Dashboard)

**Display:**
- All 7 stats in unified view
- Current level for each stat
- XP progress to next level
- Percentage filled bars
- Stat icons
- Color coding by stat

**Interactivity:**
- Click stat to view detailed breakdown
- See top 3 contributors to each stat
- View all activities that impacted stat

---

### 20. STREAK HEATMAP

**Visualization:**
- GitHub-style contribution heatmap
- 52-week view of habit completion
- Color intensity = streak status
- Hover tooltips with details
- Year/month navigation

**Purpose:**
Visual motivation for maintaining streaks and spotting patterns.

---

## Data Management

### Data Persistence

**Database:** PGLite (PostgreSQL running in WebAssembly)
- **Location:** Browser local storage / IndexedDB
- **Sync:** Real-time local persistence
- **Backup:** Manual JSON export available

### Core Data Models

#### User Profile
```
- id (PK)
- callsign (username)
- display_name
- theme (current theme code)
- custom_class (selected class)
- widget_layout (saved grid layout)
- active_widgets (list of visible widgets)
- wizard_complete (onboarding flag)
```

#### Habits
```
- id (PK)
- name
- description
- stat_target (which stat gains XP)
- frequency (daily / weekly)
- status (ACTIVE, ARCHIVED)
- created_at
- shield_count (0-3)
- streak_count
- last_completed_date
- custom_fields (JSON config)
```

#### Habit Logs
```
- id (PK)
- habit_id (FK)
- log_date (YYYY-MM-DD)
- completed (boolean)
- custom_values (JSON)
- xp_earned
- stat_xp_earned
- timestamp
```

#### XP Ledger
```
- id (PK)
- user_id (FK)
- source (habit, course, book, etc.)
- source_id (ID of the source item)
- xp_amount
- stat_key (which stat gains XP)
- stat_xp (XP allocated to stat)
- multiplier_applied (streak multiplier)
- timestamp
```

#### Goals
```
- id (PK)
- user_id (FK)
- title
- description
- tier (life, mid, sprint)
- status (ACTIVE, COMPLETE, PAUSED, ARCHIVED)
- target_stat
- progress_percentage
- due_date
- created_at
- completed_at
```

#### Media
```
- id (PK)
- user_id (FK)
- title
- type (book, film, tv, album, etc.)
- status (READING, WATCHING, FINISHED, etc.)
- progress_percentage (for books)
- created_at
- completed_at
```

#### Recipes
```
- id (PK)
- user_id (FK)
- name
- category
- ingredients (JSON array with quantities)
- total_calories
- total_protein, total_carbs, total_fat
- created_at
```

#### Daily Intake
```
- id (PK)
- user_id (FK)
- log_date (YYYY-MM-DD)
- meal_type (BREAKFAST, LUNCH, DINNER, SNACK)
- recipe_id or ingredients (JSON)
- calories
- protein, carbs, fat
- timestamp
```

### Backup & Export

**Export Functionality:**
- Generate JSON backup of all data
- Timestamped filenames (`uplink-backup-YYYYMMDD.json`)
- Full database snapshot
- Manual download via settings

---

## Technical Architecture

### Technology Stack

**Frontend:**
- **Framework:** React 18.3.1
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + custom CSS
- **Component Library:** shadcn/ui with Radix UI
- **State Management:** React Query (@tanstack/react-query 5.83.0)
- **Forms:** React Hook Form + Zod validation
- **UI Utilities:** Lucide icons, Sonner toasts

**Database:**
- **Primary:** PGLite (@electric-sql/pglite 0.4.0)
- **Backup:** Supabase integration (@supabase/supabase-js)

**Layout & Interaction:**
- **Grid Layout:** React Grid Layout (drag-and-drop)
- **Drag-and-Drop:** dnd-kit (@dnd-kit/core, @dnd-kit/sortable)
- **Carousel:** Embla Carousel
- **Date Picking:** React Day Picker, date-fns

**Development Tools:**
- **Testing:** Vitest
- **Linting:** ESLint
- **Package Manager:** Bun

### Project Structure

```
src/
├── App.tsx                 # Main app entry point
├── main.tsx               # React root
├── pages/
│   ├── Index.tsx          # Main dashboard page
│   └── NotFound.tsx
├── components/
│   ├── widgets/           # 23+ widget components
│   ├── overlays/          # Full-page overlays
│   ├── modals/            # Dialog modals
│   ├── drawer/            # Detail drawer (side panel)
│   ├── effects/           # Visual effects (CRT, animations)
│   ├── auth/              # Authentication components
│   ├── ui/                # Base UI components (from shadcn)
│   ├── wizard/            # Onboarding wizard
│   ├── Sidebar.tsx        # Main navigation sidebar
│   ├── TopBar.tsx         # Top navigation bar
│   └── WidgetWrapper.tsx  # Widget container component
├── contexts/
│   ├── AppContext.tsx     # App-level state (profile, theme)
│   └── AuthContext.tsx    # Authentication state
├── hooks/
│   ├── useHabits.ts
│   ├── useIntake.ts
│   ├── useRecipes.ts
│   ├── useRecords.ts
│   ├── useSkills.ts
│   ├── useTools.ts
│   ├── useResources.ts
│   ├── useOperator.ts     # Main user/operator state
│   ├── useSearch.ts
│   ├── useStats.ts
│   └── 15+ other hooks
├── services/
│   ├── habitService.ts
│   ├── intakeService.ts
│   ├── recipeService.ts
│   ├── plannerService.ts
│   ├── classSystem.ts
│   ├── xpService.ts
│   ├── statService.ts
│   ├── exportService.ts
│   └── 15+ other services
├── lib/
│   ├── db.ts             # PGLite database setup
│   ├── themes.ts         # Theme system
│   ├── utils.ts          # Utility functions
│   └── refreshAppData.ts # Data sync
├── types/
│   └── index.ts          # TypeScript definitions
├── data/
│   └── mockData.ts       # Development mock data
└── styles/
    └── Custom CSS
```

### Component Architecture

**Widget Pattern:**
Every widget follows a standard pattern:
```tsx
interface Props {
  onClose: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  isFocused?: boolean;
  isMinimized?: boolean;
  onMinimize?: (state: boolean) => void;
}

export default function WidgetName({ onClose, onFullscreen, isFullscreen, ...props }: Props) {
  return (
    <WidgetWrapper title="WIDGET NAME" {...props}>
      {/* Widget content */}
    </WidgetWrapper>
  );
}
```

**Overlay Pattern:**
Full-page overlays that stack above the main dashboard:
```tsx
interface Props {
  onClose: () => void;
}

export default function OverlayName({ onClose }: Props) {
  // Render full-screen content
}
```

### State Management Flow

1. **AppContext:** Global profile, theme, ready state
2. **AuthContext:** User authentication and session
3. **React Query:** Data fetching, caching, background updates
4. **Local Hooks:** Component-level state (useHabits, useIntake, etc.)
5. **localStorage:** Layout, widgets, theme preferences

### Data Flow

```
User Action
    ↓
Component Handler
    ↓
Service/Hook Method
    ↓
PGLite Query/Update
    ↓
IndexedDB Persistence
    ↓
React State Update
    ↓
Component Re-render
```

---

## UI & Design System

### Theme System

**Available Themes:**
- Retro green (default CRT aesthetic)
- Cyberpunk blue
- Terminal amber
- Hacker green
- Matrix style
- And custom variants

**CSS Variables:**
```css
--bg-primary      /* Main background */
--bg-secondary    /* Secondary panels */
--bg-tertiary     /* Tertiary backgrounds */
--accent          /* Primary accent color */
--accent-dim      /* Dimmed accent */
--text-primary    /* Main text */
--text-dim        /* Secondary text */
```

### Visual Effects

**Enabled Features:**
- CRT scan line effect (horizontal lines)
- Screen flicker/glitch (occasional)
- Glow effects on widgets
- Boot sequence animation (first load)
- Level-up animation (XP threshold crossing)
- XP float animations (numbers rising)
- Smooth transitions and hovers

---

## Core Features Summary

| Feature | Status | Category | Primary Stat |
|---------|--------|----------|--------------|
| Habit Tracking | ✅ Complete | CORE | GRIT |
| Daily Check-in | ✅ Complete | CORE | GRIT |
| XP & Leveling | ✅ Complete | CORE | All |
| Stats (7 stats) | ✅ Complete | CORE | - |
| Media Library | ✅ Complete | ARSENAL | MIND |
| Courses/Learning | ✅ Complete | ARSENAL | MIND |
| Skills Management | ✅ Complete | ARSENAL | WIRE |
| Tools & Software | ✅ Complete | ARSENAL | WIRE |
| Resources | ✅ Complete | ARSENAL | MIND |
| Intake Logging | ✅ Complete | BIOSYSTEM | BODY |
| Recipes | ✅ Complete | BIOSYSTEM | BODY |
| Ingredients DB | ✅ Complete | BIOSYSTEM | BODY |
| Recovery Tracking | ✅ Complete | BIOSYSTEM | BODY |
| Planner/Goals | ✅ Complete | TRACKING | All |
| Streak Heatmap | ✅ Complete | TRACKING | GRIT |
| Notes | ✅ Complete | TRACKING | MIND |
| Projects | ✅ Complete | TRACKING | All |
| Vault | ✅ Complete | TRACKING | MIND |
| Augments | ✅ Complete | TRACKING | All |
| Socials | ✅ Complete | TRACKING | COOL |
| Terminal | ✅ Complete | UTILITY | WIRE |
| Calculator | ✅ Complete | UTILITY | WIRE |
| Clock/Timer | ✅ Complete | UTILITY | GRIT |
| Unit Converter | ✅ Complete | UTILITY | WIRE |
| Badges | 🔄 In Progress | GAMIFICATION | - |
| Custom Classes | ✅ Complete | SYSTEM | - |
| Theme System | ✅ Complete | SYSTEM | - |
| Widget Manager | ✅ Complete | SYSTEM | - |
| Data Export | ✅ Complete | SYSTEM | - |
| Search | ✅ Complete | SYSTEM | - |

---

## Advanced Features

### Widget Customization
- Drag-to-reorder widgets
- Resize any widget independently
- Minimize/maximize individual widgets
- Fullscreen mode for focus work
- Layout persistence per user
- Active widgets list management
- Close and restore widgets

### Search Functionality
- Global search across all data types
- Quick access bar (Cmd+K or Ctrl+K)
- Fuzzy matching on titles and content
- Filter by data type
- Recent searches

### Stat Calculation
- Real-time XP calculation
- Streak multipliers applied
- Milestone bonuses tracked
- Weekly challenge bonuses
- All XP logged in ledger for transparency

### Class-Based Recommendations
- UI highlights relevant classes
- Stat progression differs slightly per class
- Badge recommendations vary by class
- Learning paths customized to class

---

## Performance Considerations

### Optimization Techniques
- React Query caching for repeated queries
- Component memoization for heavy widgets
- Lazy loading of overlay components
- Virtualized lists for large data sets
- CSS Grid optimization with React Grid Layout
- LocalStorage for frequent reads (layout, widgets)

### Database Performance
- Indexed queries on common filters (date, status)
- Aggregated views for stats calculations
- Batch updates for bulk operations
- Transaction support for data integrity

---

## Future Roadmap (In Planning)

- [ ] Social features (leaderboards, shared challenges)
- [ ] Community challenges with multiplayer components
- [ ] Mobile app (React Native)
- [ ] API for third-party integrations
- [ ] Advanced analytics dashboards
- [ ] AI-powered recommendations
- [ ] Spaced repetition for learning
- [ ] Wearable device integration
- [ ] Advanced recovery protocols
- [ ] Team collaboration features

---

## Getting Started Guide

### Installation
```bash
cd uplink-life-terminal
bun install
```

### Development
```bash
bun run dev
```

Runs on `http://localhost:5173` with hot module replacement.

### Building
```bash
bun run build
```

Creates optimized production bundle in `dist/`.

### Testing
```bash
bun run test              # Run tests once
bun run test:watch       # Watch mode
```

---

## Support & Documentation

- **Code Comments:** Each major system has detailed inline comments
- **Type Definitions:** Full TypeScript types in `src/types/index.ts`
- **Service Layer:** Pure logic in `src/services/` for maintainability
- **Hook Abstractions:** Custom hooks in `src/hooks/` handle data fetching
- **Component Isolation:** UI components are self-contained and reusable

---

## Summary

**UPLINK** is a production-ready personal development operating system that gamifies life optimization across 7 stat dimensions. With 20+ widgets, real-time data persistence, comprehensive habit tracking, and an engaging retro-futuristic UI, it provides a complete platform for self-improvement, learning, and life management.

The modular architecture, extensive hook library, and service-oriented design make it maintainable and extensible for future features.

---

*Last documentation update: April 24, 2026*
