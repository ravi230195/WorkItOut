# Workout Tracker - Navigation Flow Documentation

This document outlines all navigation flows within the workout tracker application. It serves as a comprehensive guide for understanding user journeys and should be updated whenever navigation changes are made.

## **Authentication Flows**

### **Sign In/Sign Up Flow:**
- **SignInScreen** → Click "Sign Up" → **SignUpScreen**
- **SignUpScreen** → Click "Sign In" → **SignInScreen**  
- **SignInScreen** → Successful authentication → **WorkoutDashboard**
- **SignUpScreen** → Successful authentication → **WorkoutDashboard**
- **Any authenticated screen** → Session expires → **SignInScreen**

---

## **Main Tab Navigation (Bottom Navigation)**

### **From any main screen with bottom nav:**
- **WorkoutDashboard** ↔ **RoutinesScreen** ↔ **ProgressScreen** ↔ **ProfileScreen**

**Available Tabs:**
- **Workouts** (Dumbbell icon) - Primary color when active
- **Routines** (FileText icon) - Primary color when active  
- **Progress** (TrendingUp icon) - Sage color when active
- **Profile** (User icon) - Peach color when active

---

## **Workout Creation Flows**

### **Template-Based Workout Flow:**
- **WorkoutDashboard** → Select template → **ActiveWorkout** (with selected template)
- **ActiveWorkout** → Click "+" → **ExerciseSelector** (for adding exercises to active workout)
- **ExerciseSelector** → Select exercise → **ActiveWorkout** (with selected exercise)
- **ExerciseSelector** → Click "✕" → **ActiveWorkout**
- **ActiveWorkout** → Click "End Workout" → **WorkoutDashboard**

---

## **Routine Management Flows**

### **Create New Routine Flow:**
- **RoutinesScreen** → Click "Create Routine" → **CreateRoutine**
- **CreateRoutine** → Enter routine name + submit → **AddExercisesToRoutine** (new routine)
- **CreateRoutine** → Click "←" → **RoutinesScreen**

### **Add Exercises to New Routine Flow:**
- **AddExercisesToRoutine** → Select exercise → **ExerciseSetupScreen** (with selected exercise)
- **AddExercisesToRoutine** → Click "←" → **RoutinesScreen** (if new routine)

### **Exercise Setup Flow:**
- **ExerciseSetupScreen** → Configure sets/reps/weight → Click "SAVE" → Stays on **ExerciseSetupScreen** (exercise added to list, form cleared)
- **ExerciseSetupScreen** → Click "+" → **AddExercisesToRoutine** (to add more exercises)
- **ExerciseSetupScreen** → Click "←" → **RoutinesScreen** (always)

### **Exercise Selection Within Routine Flow:**
- **ExerciseSetupScreen** → Click "+" → **AddExercisesToRoutine** (routine context)
- **AddExercisesToRoutine** → Select exercise → **ExerciseSetupScreen** (with selected exercise)
- **AddExercisesToRoutine** → Click "←" → **RoutinesScreen** (if from existing routine)

### **Edit Existing Routine Flow:**
- **RoutinesScreen** → Click existing routine → **ExerciseSetupScreen** (shows existing exercises + empty form)
- **ExerciseSetupScreen** → Click "+" → **AddExercisesToRoutine** (existing routine context)
- **AddExercisesToRoutine** → Select exercise → **ExerciseSetupScreen** (with selected exercise)

---

## **Navigation Handler Functions**

### **Authentication:**
- `handleAuthSuccess(token, setUserToken)` - Sets token and navigates to WorkoutDashboard
- `navigateToSignUp()` - Goes to SignUpScreen
- `navigateToSignIn()` - Goes to SignInScreen
- `handleUnauthorizedError(error)` - Handles session expiration

### **Main Navigation:**
- `handleTabChange(tab)` - Switches between main tabs
- `setCurrentView(view)` - Direct view navigation

### **Workout Management:**
- `handleSelectTemplate(template)` - Starts workout with template
- `endWorkout()` - Ends workout and returns to dashboard
- `showExerciseSelector()` - Context-aware exercise selection
- `handleSelectExercise(exercise)` - Selects exercise for active workout
- `closeExerciseSelector()` - Returns to active workout

### **Routine Management:**
- `showCreateRoutine()` - Goes to create routine screen
- `handleRoutineCreated(name, id)` - Processes new routine creation
- `closeCreateRoutine()` - Returns to routines screen
- `completeRoutineCreation()` - Finalizes routine and refreshes list
- `showExerciseSetupEmpty(routineId, name)` - Opens routine for editing
- `closeExerciseSetupToRoutines()` - Always returns to routines screen

### **Exercise Setup:**
- `handleExerciseSelected(exercise, routineId)` - Adds exercise to routine setup
- `showExerciseSetup()` - Opens exercise setup screen
- `closeExerciseSetup()` - Returns to exercise selection
- `handleExerciseSetupComplete()` - Completes exercise setup (stays on screen)
- `returnToExerciseSetup(exercise)` - Returns with selected exercise

### **Legacy/Unused:**
- `showRoutineEditor()` - Opens routine editor (currently unused)
- `closeRoutineEditor()` - Returns from routine editor

---

## **Key Navigation Patterns**

### **Universal Back Button Behaviors:**
- **ExerciseSetupScreen** "←" → Always goes to **RoutinesScreen**
- **AddExercisesToRoutine** "←" → **RoutinesScreen** (context-dependent)
- **CreateRoutine** "←" → **RoutinesScreen**
- **ActiveWorkout** "End Workout" → **WorkoutDashboard**

### **State Management:**
- **Exercise Selection:** Clears when navigating between exercise-related screens
- **Routine Context:** Maintains `currentRoutineId` and `currentRoutineName` throughout routine editing
- **Template Context:** Maintains `selectedTemplate` during active workouts
- **Refresh Triggers:** Updates routine lists when routines are created/modified

### **Error Handling:**
- **Session Expiration:** Any screen → **SignInScreen** with toast notification
- **Navigation Errors:** Shows error toast and optionally redirects to fallback view

---

## **Screen Classifications**

### **Views Without Bottom Navigation:**
- SignInScreen, SignUpScreen, ActiveWorkout, ExerciseSelector, CreateRoutine, AddExercisesToRoutine, ExerciseSetupScreen, RoutineEditor

### **Views With Bottom Navigation:**
- WorkoutDashboard, RoutinesScreen, ProgressScreen, ProfileScreen

---

## **Database Integration**

### **Supabase Schema Integration:**
- **user_routines** - Stores routine metadata
- **user_routine_exercises_data** - Stores exercises within routines
- **user_routine_exercises_set_data** - Stores individual set data
- **exercises** - Master exercise definitions

### **Real-time Updates:**
- Routine creation triggers database insert
- Exercise addition updates routine exercises table
- Navigation maintains consistency with database state
- Refresh triggers ensure UI reflects latest data

---

## **Component Architecture**

### **Main Components:**
- **AppRouter.tsx** - Central routing logic
- **useAppNavigation.ts** - Navigation state management
- **BottomNavigation.tsx** - Tab navigation
- **AuthContext.tsx** - Authentication state

### **Screen Components:**
- WorkoutDashboard, RoutinesScreen, ProgressScreen, ProfileScreen
- SignInScreen, SignUpScreen, ActiveWorkout, ExerciseSelector
- CreateRoutine, AddExercisesToRoutine, ExerciseSetupScreen, RoutineEditor

---

## **Performance Optimizations**

### **Lazy Loading Implementation:**
- **Exercise Data Loading:** Only loads when needed (+ button clicked)
- **Previous Flow:** ExerciseSetupScreen → Load all exercises → User might not add any
- **Optimized Flow:** ExerciseSetupScreen → Fast load → User clicks + → Load exercises
- **Benefits:** Faster screen loads, reduced server calls, better user experience

### **Database Query Optimizations:**
- **Joined Queries:** `getUserRoutineExercisesWithDetails()` uses SQL joins instead of client-side merging
- **Reduced Round Trips:** Single query with relations instead of multiple separate queries
- **Efficient Data Transfer:** Only fetch data when actually needed

---

## **Recent Changes**

### **Latest Update:** Lazy Loading Performance Optimization
- **Change:** Implemented lazy loading for exercise data
- **Previous Behavior:** ExerciseSetupScreen loaded all exercises on mount
- **New Behavior:** Exercises only load when + button clicked (AddExercisesToRoutine screen)
- **Performance Benefits:**
  - Faster ExerciseSetupScreen loading
  - Reduced unnecessary API calls
  - Better server resource usage
- **Files Updated:** 
  - `/components/ExerciseSetupScreen.tsx` - Removed exercise loading
  - `/utils/supabase-api.ts` - Added `getUserRoutineExercisesWithDetails()` function
- **Date:** Current session

### **Previous Update:** Back Button Consistency
- **Change:** ExerciseSetupScreen back button always goes to RoutinesScreen
- **Previous Behavior:** Sometimes went to AddExercisesToRoutine based on context
- **New Behavior:** Always returns to RoutinesScreen for cleaner UX
- **File Updated:** `/components/AppRouter.tsx`

---

## **Maintenance Notes**

- This document should be updated whenever navigation logic changes
- Pay special attention to back button behaviors and state management
- Document any new navigation functions added to useAppNavigation.ts
- Note changes to AppRouter.tsx that affect user flows
- Update screen classifications when new views are added