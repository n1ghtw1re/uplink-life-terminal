Add to Sidebar inside BIOSYSTEM
EXERCISE
WORKOUTS

OUTPUT is our workout tracking tool. here users can log their workouts and track their progress. OUTPUT uses EXERCISE and WORKOUTS as it's data.

Basic Functionality
User will use QuickLogOverlay to input their workouts so all daily input happens from the same tool.
Create Tabs across the top of QuickLogOverlay
- Quick Log -current tab (this is the basic SKILL log input tool)
- NEW tabs
	- INTAKE - this will show the IntakeLogModal
	- OUTPUT - This will show the OUTPUT modal
	- RECOVERY - This will show the RecoverySleepModal

- OUTPUT needs modal, page, drawer, widget
	- OUTPUT Modal (integrate into the quicklogoverlay)
		- User LOGS skill OUTPUT through the QuickLOGOverlay modal
			- user logs duration
			- user can tag tools, media, courses, augments etc
			- no SKILL XP is given out instead the skill XP goes to whatever exercise/workout user selects (ex user selects pushups, the skill xp goes to exercise pushups)
			- Skill OUTPUT opens a new OUTPUT modal
				- user can then select their exercise or program and fill in the data required
				- example: user wants to log EXERCISE pushups, they can log # of sets, quantity for each set, intensity etc.
				- example: user wants to log WORKOUT 5x5, they choose the workout and then fill in their sets, weights, intensity etc
				- STAT XP is preset through exercise/workout. User can edit XP distribution between two stats with a % slider. 
				- SKILL XP goes to selected exercise or workout
	- OUTPUT PAGE
		- page 1 - stats page showing important stats about the users workouts
		- page 2 - list of all logged workouts by date
			- user can click on any workout and open drawer to edit, delete the workout
	- OUTPUT DRAWER
		- shows details of a workout
		- user can edit or delete the workout from Here
	- OUTPUT WIDGET
		- shows the last 8 workouts
		- add OUTPUT and view all buttons
		- user can click on any OUTPUT to open drawer from here

# START WITH EXERCISE. ONLY BUILD EXERCISE and then we will move on from there when I'm ready

- EXERCISE
	- this is the starting point for the entire OUTPUT tool functionality
	- Exercise are single exercises: pushups, running, sun salutation, sprints, bench-press, stretching etc.
	- XP
		- when logging an exercise the user gets MainXP and SkillXP, tool and augment XP are optional and based on what the user tags, this should work identical to logging skills, we'll go over tool and augment xp when building the OUTPUT modal.
		- MainXP is split 50% to the EXERCISE, 50% to Main level XP and STAT (stat is split based on presets or user edits)
			- so for example if user logged running and received 1000xp, running EXERCISE gets 500, main level gets 250, grit gets 125, body gets 125
		- this should basically work exactly like skill logging, but we're tracking EXERCISE outside skills.
	- MODAL
		- user can add new exercises to the app (pushups, crunches, running, stretching, etc)
		- User adds exercise name, category, quantity type (miles, reps, user edited option, etc)
		- Categories: Strength, Endurance, Calisthenic, Mobility, High-Intensity, Maintenance
			- Categories and their preset STAT split
			- Strength - 70 Body, 30 Grit
				- Primary Metric: Weight + Reps
				- Examples: Bench Press, Deadlift, Weighted Pull-ups.
			- Endurance - 50 body, 50 grit
				- Primary Metric: Distance (laps, miles, meters)
				- Examples: Running, Cycling, Rowing
			- Calisthenics - 40 body, 60 grit
				- Primary Metric: Reps
				- Examples: Pushups, Squats, Crunches
			- Mobility - 50 body, 50 ghost
				- Primary Metric: Cycles (number of times user completes the form, sequence)
				- Examples: Sun Salutation, Stretching, Deep Squat
			- High-Intensity - 50 body, 50 flow
				- Primary Metric: (Runs, Rounds, Points, or Time.)
				- Example: Snowboarding, MMA, Dancing, Ice Skating
			- Maintenance - 50 body, 50 ghost
				- Primary Metric: Depth (scale value between 1-5)
					- 1: Surface (Distracted/tight)
					- 5: Profound (Total release/presence)
				- Example: Stretching, Meditation, Massage
		- user adds description of the exercise (optional)
		- user can edit the preset stats and xp % distribution (body, grit 50/50 etc)
			- should work exactly like skills.
			- choose primary and secondary stat, and a % slider
		- we'll add basic exercises to the app before release. (ignore this until we're ready)
		- duration and intensity are handled when the user logs an item so not needed in the EXERCISE modal
	- PAGE
		- sub-page 1 (EXERCISE) shows full list of all exercises. categories across the top, sortable and searchable
			- user can click on any EXERCISE to open the related drawer
		- should work exactly like SKILLS page except for EXERCISE
		- sub-page 2 (ANALYTICS)  shows important stats and charts about EXERCISE, (category filter shows only analytics for that EXERCISE category) 
	- DRAWER
		- gives detailed info about the specific EXERCISE
		- Should have all features of SKILLS drawer but for EXERCISE
		- PR - show users personal record for the EXERCISE - show at top
			- this will keep the highest input value from when a user logs an exercise through OUTPUT modal
			- We will update with real data once we build OUTPUT
		- shows list of last logged instances
		- user can fully EDIT or DELETE the EXERCISE
	- WIDGET
		- shows list of 8 EXERCISE (most used, recent, alpha sort) same functionality as all other widgets
		- clicking on an exercise opens the drawer for the exercise
		- View all button and ADD Exercise button
	- ADD WIDGET
		- add the widget to the list under BIOSYSTEM
	- TERMINAL
		- in TERMINAL, i should be able to type OPEN exercise to open the widget just like all the other widgets. 

- Workouts are preset collections of Exercises
	- collection of exercises so user can easily repeat a full workout
	- users can create their own preset workouts. We'll add some common workouts like 5x5 stronglifts, The Recommended Routine, PPL etc
	- WORKOUTS MODAL and XP 
		- users create their workouts in the modal. 
		- Name the workout
		- Workout Category - determines the XP stat split for the workout
		- Categories: Strength, Endurance, Calisthenic, Mobility, High-Intensity, Maintenance
			- Types and their preset STAT split
			- Strength - 70 Body, 30 Grit
			- Endurance - 50 body, 50 grit
			- Calisthenics - 40 body, 60 grit
			- Mobility - 50 body, 50 ghost
			- High-Intensity - 50 body, 50 flow
			- Maintenance - 50 body, 50 ghost
		- users can add/delete EXERCISE from any category to a workout as many as needed
			- skill XP gets split between all the EXERCISE inside the workout.
			- so if user has 10 different EXERCISES the skill XP gets split between all 10
			- if user has multiple of same exercises, they all count towards skill XP split. so if a workout has pushup, squats, crunches, pushups, squats, crunches - you would add up each to determine the split.
		- WORKOUTS do not get XP.
			- instead we'll track # of times completed. Achievements will be added at a later date to encourage completion. 
	- WORKOUTS PAGE
		- subpage 1 (WORKOUTS) shows the list of all workouts
			- should work just like skills page
		- subpage 2 (ANALYTICS) shows a collection of stats and graphs for WORKOUTS
			- tabbed categories show stats based on the category
	- WORKOUTS DRAWER
		- full details of a WORKOUT
		- user can edit/delete all parts of a workout
		- Should work just like other drawers
		- shows most recent logged Workouts 
	- WORKOUTS WIDGET
		- shows 8 workouts (most recent, most used)
		- should work just like SKILLS widget


