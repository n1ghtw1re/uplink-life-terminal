We are going to rebuild this in codex
# Habit System - Full Build Plan

## What's Already Done ✅
- `habits` + `habit_logs` tables in PGLite DB
- `Habit` / `HabitLog` TypeScript interfaces
- `useHabits.ts` hook (fetch + create)
- `AddHabitModal.tsx` modal component

---

## Phase 2: Habit Check-In Logic (The Engine)

This is the core business logic. Everything else depends on it.

### [MODIFY] `src/hooks/useHabits.ts`
Add the following to the existing hook:
- **`checkIn(habitId, value?)`** — Logs today's completion. Calculates and distributes XP:
  - Daily complete: 5 XP to stat + 5 XP to master = 10 XP total
  - 7-day milestone: +50 XP split
  - 30-day milestone: +500 XP split
  - Streak goal hit: +`streak_reward` XP split
  - Adds 1 shield on every 7 consecutive completions (max 3)
- **`processMissedDays(habit)`** — Called on app boot. Counts days since last log, consumes shields, resets streak to 0 if shields gone.
- **`retireHabit(habitId)`** — Sets `status = 'RETIRED'`.
- **`pauseHabit(habitId, until)`** — Sets `status = 'PAUSED'` + `paused_until`.
- **`getTodaysDueHabits()`** — Returns only habits due today based on frequency type/days.

### [NEW] `src/services/habitService.ts`
Pure functions, no React — keeps hook lean:
- `isDueToday(habit)` — Checks frequency type + specific_days + interval
- `getMissedDays(habit, logs)` — Returns count of missed days since last log
- `calcXpReward(habit, newStreak)` — Returns `{ statXp, masterXp, bonusReason }`

---

## Phase 3: Daily Check-In Widget

### [NEW] `src/components/widgets/HabitsWidget.tsx`
A compact dashboard widget showing today's due habits with quick check-off.
- Lists today's active habits
- Binary: single click to complete (toggles ✓)
- Quantitative: click opens a small number input inline
- Shows shields as 🛡 icons per habit
- Shows current streak number
- "ALL DONE" glow state when everything checked off
- Button to open the full Habits overlay

---

## Phase 4: The Habit Overlay (3 pages)

### [NEW] `src/components/overlays/HabitsPage.tsx`
Multi-page overlay with internal page navigation (same pattern as CharacterSheet).

#### Page 1: Dashboard
- Summary stats: total active habits, total completions today, longest streak
- Heatmap grid (last 60 days, coloured by completion %)
- Top 3 active streaks with shield counts
- Alerts/warnings (habits at risk, shields depleted)
- Upcoming streak milestones

#### Page 2: Badges & Achievements
- Dedicated placeholder section (dummy data for now, real system later)

#### Page 3: All Habits (tabbed by stat)
- Tabs: ALL | BODY | WIRE | MIND | COOL | GRIT | FLOW | GHOST
- Search bar + sort (name / streak / created)
- Add Habit button (opens AddHabitModal)
- Each habit row: name, streak, shields, status badge
- Retired habits shown greyed-out at bottom
- Click habit → opens Habit Drawer

### [NEW] `src/components/drawer/HabitDrawer.tsx`
Slide-in drawer for a selected habit:
- Full habit details (stat, schedule, target, reminder, streak goal)
- Last 7 log entries
- Shield display
- Streak timeline (mini bar chart)
- [RETIRE] button
- [EDIT] button (opens AddHabitModal pre-filled)
- [DELETE] button (with confirmation)

---

## Phase 5: Top Bar Notifications

### [MODIFY] `src/components/TopBar.tsx`
Add a scrolling notification ticker that shows habit alerts:
- "🔥 BODY STREAK — 7 DAYS" when 7-streak hit
- "⚠️ MEDITATION — SHIELD CONSUMED" after missing a day
- "🛡 SHIELD EARNED — RUNNING" after 7 in a row
- "✓ ALL HABITS LOGGED" when daily check-in complete

---

## Phase 6: Integration

### [MODIFY] `src/pages/Index.tsx`
- Add `HabitsWidget` to the widget registry (id: `'habits'`)
- Add `HabitsPage` overlay toggle + nav link
- Call `processMissedDays()` on app boot for all active habits

### [MODIFY] `src/components/Sidebar.tsx`
- Add Habits nav link → opens HabitsPage overlay

---

## Build Order
1. `habitService.ts` (pure logic, no deps)
2. Expand `useHabits.ts` with all mutations + check-in logic
3. `HabitsWidget.tsx` (smallest UI, validates logic)
4. `HabitsPage.tsx` (overlay, all 3 pages)
5. `HabitDrawer.tsx`
6. Top bar notifications
7. Wire everything into `Index.tsx` + `Sidebar.tsx`




## ADD HABIT Modal
- **Habit Name:** A short, actionable title (e.g., "Morning Meditation").
- **Category Selector:** Buttons to assign the habit to a specific STAT (one stat only, no split stats for habits)
- **Frequency/Schedule:**  
	- _Daily:_ Every day or specific days of the week.
	- _Interval:_ Every X days.
- **Target Goal:** 
	* _Binary:_ A simple Yes/No checkmark.
	* _Quantitative:_ A numeric goal (e.g., "8" glasses of water, "30" minutes of reading).
	* **Reminder/Cue:** A time-picker to set the push notification that triggers the user to act.
	* **Streak Goal (Optional):** Setting a "Commitment" (e.g., "I will do this for 21 days") to unlock specific bonuses.
## Habit Rewards
- completing the habit daily rewards 10 xp that is split between STAT XP and Master XP level 50-50
- completing 7 days in a row gives another bonus 50 xp that is split between STAT XP and Master XP (this happens every seven days ongoing)
- completing 30 days in a row awards 500 xp that is split between STAT XP and Master (this happens every 30 days ongoing)
- Streak Goal bonus - user can add a reward XP for their goal. let's suggest 100XP in the box, but users can add what they like. 
- badges, achievements related to sticking with habits and achieving goals. (will add later)
## Shields
- Users can earn shields for each Habit that will protect them if they miss a day
- a habit starts with zero shields
- 3 shields max for any habit
- users gain a shield for a specific habit if they complete 7 successful check-ins in a row
- missing a day or interval consumes a shield
- if the user consumes all their shields, they are returned to zero day for the habit and have to start the habit over. (they do not lose any XP)
- Vacation/Holiday Mode - allows users to pause any/all habits until a specific future date
## Habit Page
- this will be a multi-page overlay
- 1st page showing a DASHBOARD comprehensive overview of current habits, with relevant graphs and charts, notifications, warnings, heatmap, current top streaks. current shields
- 2nd page Badges & Achievements - showcase all badges and achievements related to the user's Habits
- 3rd page show a tabbed (by stat) view of all habits added to the app by user - add , search, sort, retired, etc.
- clicking a habit opens the Habit Drawer
## Habit Drawer
- shows full details of the selected habit
- recent sessions
- RETIRE - let's user's retire the habit and remove it from their daily-check in. this keeps all the data of the habit, but it no longer shows on widgets, checkin etc. it will still show on 3rd page of habit page and we can use a greyed out approach for RETIRED habits. 
- edit/delete forms
## Daily Check-In form and widget
- this is the quick log form for habits where the user checks off when they complete a habit.  this should be super simple and easy to use. Basically just click to check off (# for quantitated habits) and it marks the habit complete for the day. 
## Top Bar
- scrolling notification section giving updates on habits 
- 7/30 day streak congrats, shields in danger, habit in danger.
## Heatmap widget
- heatmap showing habit streaks
- heatmap for each stat 
## Habits Docs
- page that has instructional guide to habits, rewards, badges




---

### 3. Rewards & Progression

Since your system utilizes growth mechanics, the Add Item overlay must define the "payout" for completion.

- **Attribute Assignment:** Which stat does this habit "fuel"? (e.g., Reading = +XP to Mind).
    
- **Difficulty/Weight:** A scale (Easy, Medium, Hard) that determines how much XP is granted upon completion.
    

    

---

### 4. UI Layout Proposal (Overlay Interface)

To keep the overlay from feeling cluttered, consider a "Hub-and-Spoke" or "Accordion" design:

|Section|Elements|
|---|---|
|**Header**|Name Input + Icon Selector|
|**The "When"**|Frequency Chips (M, T, W...) + Time Trigger|
|**The "How Much"**|Unit Type (Checkmark vs Number) + Goal Amount|
|**The "Why"**|Category Dropdown + XP/Stat Weighting|
|**Footer**|**[Cancel]** & **[Create Habit]**|

Export to Sheets

### Implementation Tip: The "Quick Log" Synergy

When designing the **Add Item** overlay, ensure there is a toggle for "Show in Quick Log." This allows the user to decide if this specific habit is high-priority enough to appear in the main logging interface or if it should only be managed via the **Widget**.