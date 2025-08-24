# Workout Tracker - Comprehensive Navigation Documentation

This document provides a complete overview of the navigation system, screen architecture, and user flows within the workout tracker application. It serves as the definitive guide for developers and should be updated whenever navigation changes are made.

---

## **🏗️ Application Architecture Overview**

### **Component Structure:**
```
App.tsx (Root)
├── AppRouter.tsx (Central Routing Logic)
├── BottomNavigation.tsx (Tab Navigation)
└── AuthContext.tsx (Authentication State)
```

### **Screen Organization:**
```
components/screens/
├── WorkoutDashboardScreen.tsx (Main Dashboard)
├── ProgressScreen.tsx (Progress Tracking)
├── ProfileScreen.tsx (User Profile)
├── CreateRoutineScreen.tsx (Routine Creation)
├── AddExercisesToRoutineScreen.tsx (Exercise Selection)
├── ExerciseSetupScreen.tsx (Exercise Configuration)

├── SignInScreen.tsx (Authentication)
└── SignUpScreen.tsx (User Registration)
```

---

## **🔐 Authentication & Entry Points**

### **Initial App State:**
- **Unauthenticated users** → **SignInScreen**
- **Authenticated users** → **WorkoutDashboardScreen** (default tab: "workouts")

### **Authentication Flows:**
```
SignInScreen ↔ SignUpScreen
     ↓
WorkoutDashboardScreen (on successful auth)
```

**Key Functions:**
- `handleAuthSuccess(token, setUserToken)` - Sets token and navigates to dashboard
- `navigateToSignUp()` - Switches to registration screen
- `navigateToSignIn()` - Switches to login screen
- `handleUnauthorizedError(error)` - Handles session expiration

---

## **📱 Main Tab Navigation (Bottom Navigation)**

### **Available Tabs:**
| Tab | Icon | Color | Screen | Purpose |
|-----|-------|-------|---------|---------|
| **Workouts** | Dumbbell | Primary | `WorkoutDashboardScreen` | Main workout dashboard |
| **Progress** | TrendingUp | Sage | `ProgressScreen` | Progress tracking & analytics |
| **Profile** | User | Peach | `ProfileScreen` | User settings & profile |

### **Navigation Behavior:**
- **Always visible** on main screens (workouts, progress, profile)
- **Hidden** on modal/sheet screens (see VIEWS_WITHOUT_BOTTOM_NAV)
- **Tab switching** triggers `handleTabChange(tab)` → updates `currentView`

---

## **🏋️ Workout & Routine Management Flows**

### **1. Create New Routine Flow:**
```
WorkoutDashboardScreen (workouts tab)
         ↓
    Click "Create Routine"
         ↓
CreateRoutineScreen (enter routine name)
         ↓
    Submit routine name
         ↓
AddExercisesToRoutineScreen (select exercises)
         ↓
    Select exercise → ADD
         ↓
ExerciseSetupScreen (configure sets/reps/weight)
```

**Key Functions:**
- `onCreateRoutine()` - Opens CreateRoutineScreen
- `onRoutineCreated(name, id)` - Processes new routine creation
- `onExerciseSelected(exercise, routineId)` - Adds exercise to routine

### **2. Add Exercises to Existing Routine Flow:**
```
WorkoutDashboardScreen (routines tab)
         ↓
    Click existing routine
         ↓
ExerciseSetupScreen (shows existing exercises)
         ↓
    Click "+" button
         ↓
AddExercisesToRoutineScreen (select new exercises)
         ↓
    Select exercise → ADD
         ↓
ExerciseSetupScreen (with new exercise selected)
```

**Key Functions:**
- `onSelectRoutine(routineId, routineName)` - Opens routine for editing
- `onCloseExerciseSetup()` - Returns to exercise selection
- `onReturnToExerciseSetup(exercise)` - Returns with selected exercise

### **3. Exercise Configuration Flow:**
```
ExerciseSetupScreen
         ↓
    Configure sets/reps/weight
         ↓
    Click "SAVE"
         ↓
    Stays on ExerciseSetupScreen (exercise added, form cleared)
         ↓
    Click "+" to add more exercises
         ↓
AddExercisesToRoutineScreen
```

**Key Functions:**
- `onExerciseSetupComplete()` - Handles save completion (stays on screen)
- `onCloseExerciseSetupToRoutines()` - Returns to main routines view

---

## **🔄 Navigation State Management**

### **Core State Variables:**
```typescript
// Current view and navigation
currentView: AppView
activeTab: "workouts" | "progress" | "profile"

// Routine context
currentRoutineId: number | null
currentRoutineName: string
refreshTrigger: number

// Exercise selection
selectedExerciseForSetup: Exercise | null
```

### **State Persistence:**
- **Routine Context:** Maintained throughout routine editing flows
- **Exercise Selection:** Clears when navigating between exercise-related screens
- **Tab State:** Persists across screen changes within main navigation
- **Authentication:** Maintained across app sessions

---

## **🎯 Screen Classifications & Navigation Rules**

### **Views WITH Bottom Navigation:**
- `"workouts"` → `WorkoutDashboardScreen`
- `"progress"` → `ProgressScreen`  
- `"profile"` → `ProfileScreen`

### **Views WITHOUT Bottom Navigation:**
- `"signin"` → `SignInScreen`
- `"signup"` → `SignUpScreen`
- `"create-routine"` → `CreateRoutineScreen`
- `"add-exercises-to-routine"` → `AddExercisesToRoutineScreen`
- `"exercise-setup"` → `ExerciseSetupScreen`


### **Navigation Rules:**
1. **Back Button Consistency:** ExerciseSetupScreen always returns to main routines view
2. **Context Preservation:** Routine ID and name maintained throughout editing flows
3. **State Clearing:** Exercise selection clears when leaving exercise-related screens
4. **Tab Synchronization:** `currentView` and `activeTab` always synchronized

---

## **🔧 Navigation Handler Functions**

### **Authentication Handlers:**
```typescript
handleAuthSuccess(token, setUserToken)     // Successful login
handleUnauthorizedError(error)             // Session expiration
navigateToSignUp()                         // Switch to registration
navigateToSignIn()                         // Switch to login
```

### **Main Navigation Handlers:**
```typescript
handleTabChange(tab)                       // Switch between main tabs
setCurrentView(view)                       // Direct view navigation
```

### **Routine Management Handlers:**
```typescript
showCreateRoutine()                        // Open routine creation
handleRoutineCreated(name, id)            // Process new routine
closeCreateRoutine()                       // Return to main view
showExerciseSetupEmpty(routineId, name)   // Open routine for editing
closeExerciseSetupToRoutines()            // Return to main routines view
```

### **Exercise Management Handlers:**
```typescript
handleExerciseSelected(exercise, routineId) // Add exercise to routine
closeExerciseSetup()                        // Go to exercise selection
returnToExerciseSetup(exercise)            // Return with selected exercise
handleExerciseSetupComplete()              // Handle save completion
```

---

## **🗄️ Database Integration & Real-time Updates**

### **Supabase Schema:**
- **`user_routines`** - Routine metadata and user ownership
- **`user_routine_exercises_data`** - Exercises within routines
- **`user_routine_exercises_set_data`** - Individual set configurations
- **`exercises`** - Master exercise definitions

### **Data Flow:**
1. **Routine Creation** → Inserts into `user_routines`
2. **Exercise Addition** → Inserts into `user_routine_exercises_data`
3. **Set Configuration** → Inserts into `user_routine_exercises_set_data`
4. **Real-time Updates** → UI refreshes reflect database changes

### **API Functions:**
- `createUserRoutine()` - Creates new routine
- `addExerciseToRoutine()` - Adds exercise to routine
- `getUserRoutineExercisesWithDetails()` - Fetches routine with exercises
- `getExerciseSetsForRoutine()` - Fetches set data for exercises

---

## **⚡ Performance Optimizations**

### **Lazy Loading Implementation:**
- **Exercise Data:** Only loads when "+" button clicked
- **Previous Flow:** ExerciseSetupScreen loaded all exercises on mount
- **Optimized Flow:** Exercises load only when needed
- **Benefits:** Faster screen loads, reduced API calls, better UX

### **Database Query Optimizations:**
- **Joined Queries:** Single query with relations instead of multiple queries
- **Reduced Round Trips:** Efficient data fetching patterns
- **Smart Caching:** Local state management for frequently accessed data

---

## **🚨 Error Handling & Edge Cases**

### **Session Management:**
- **Expired Sessions:** Automatic redirect to SignInScreen with toast notification
- **Network Errors:** Graceful fallbacks with user-friendly error messages
- **Validation Errors:** Form-level error handling with specific feedback

### **Navigation Error Recovery:**
- **Invalid Routes:** Fallback to default view (workouts)
- **State Inconsistencies:** Automatic state cleanup and refresh
- **Database Sync Issues:** Retry mechanisms and offline handling

---

## **📱 Mobile-Specific Considerations**

### **Capacitor Integration:**
- **Native Navigation:** Respects iOS/Android navigation patterns
- **Keyboard Handling:** Proper keyboard insets and resize behavior
- **Safe Areas:** Dynamic Island and notch avoidance with `pt-safe` classes

### **Touch Interactions:**
- **Exercise Cards:** Full card clickable for expand/collapse
- **Gesture Support:** Swipe navigation where appropriate
- **Responsive Design:** Optimized for mobile screen sizes

---

## **🔍 Debugging & Development**

### **Debug Logging:**
```typescript
// Current screen logging
console.log(`🔍 [DBG] CURRENT SCREEN: ${currentView.toUpperCase()}`);

// Navigation state tracking
console.log('🔍 Debug - currentView:', currentView);
console.log('🔍 Debug - VIEWS_WITHOUT_BOTTOM_NAV:', VIEWS_WITHOUT_BOTTOM_NAV);
console.log('🔍 Debug - showBottomNav:', showBottomNav);
```

### **Common Issues & Solutions:**
1. **Bottom Navigation Not Hiding:** Check `VIEWS_WITHOUT_BOTTOM_NAV` array
2. **State Not Persisting:** Verify `useAppNavigation` hook usage
3. **Navigation Loops:** Check circular dependencies in navigation handlers
4. **Screen Not Rendering:** Verify `AppRouter` conditional logic

---

## **📋 Maintenance & Updates**

### **When to Update This Document:**
- New screens or navigation flows added
- Changes to `VIEWS_WITHOUT_BOTTOM_NAV` array
- New navigation handler functions
- Updates to `AppRouter.tsx` routing logic
- Changes to authentication flows

### **File Dependencies:**
- **Primary:** `components/AppRouter.tsx`
- **Navigation Logic:** `hooks/useAppNavigation.ts`
- **Type Definitions:** `utils/navigation.ts`
- **Screen Components:** `components/screens/*.tsx`

---

## **🔄 Recent Changes & Updates**

### **Latest Updates (Current Session):**
- **Prettier Configuration:** Added `.prettierrc` with 120-character line length
- **Screen Naming:** All screen components now use consistent `Screen` suffix
- **Folder Structure:** Organized screens into `components/screens/` directory
- **Navigation Cleanup:** Removed unused `ActiveWorkoutScreen` and `ExerciseSelectorScreen`

### **Previous Major Updates:**
- **Lazy Loading:** Implemented performance optimization for exercise data loading
- **Back Button Consistency:** Standardized ExerciseSetupScreen navigation behavior
- **Supabase API Refactor:** Restructured database interaction layer
- **Component Architecture:** Moved to dedicated screens folder structure

---

## **📚 Additional Resources**

### **Related Documentation:**
- `DEPLOYMENT_GUIDE.md` - Deployment and build instructions
- `MOBILE_BUILD_GUIDE.md` - iOS/Android build process
- `database-flow-diagram.md` - Database schema and relationships

### **Development Tools:**
- **Prettier:** Code formatting with 120-character line length
- **TypeScript:** Type safety and IntelliSense
- **Tailwind CSS:** Utility-first styling system
- **Capacitor:** Native mobile app capabilities

---

*Last Updated: Current Session*  
*Maintained by: Development Team*  
*Version: 2.0*