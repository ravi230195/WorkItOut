# Navigation System Documentation

## Overview

The Workout Tracker app uses a sophisticated navigation system built around React hooks and state management. The navigation is centralized through the `useAppNavigation` hook and managed by the `AppRouter` component, providing a seamless user experience across all screens.

## Core Navigation Architecture

### 1. Navigation State Management (`useAppNavigation`)

The `useAppNavigation` hook serves as the central navigation controller, managing:

- **Current View**: Tracks which screen is currently displayed
- **Active Tab**: Manages the bottom navigation tab state
- **Routine Context**: Maintains current routine ID, name, and access level
- **Exercise Context**: Tracks selected exercises for setup
- **Authentication State**: Handles sign-in/sign-up flows

#### Key State Variables:
```typescript
const [currentView, setCurrentView] = useState<ViewType>("landing");
const [activeTab, setActiveTab] = useState<"workouts" | "progress" | "profile">("workouts");
const [currentRoutineId, setCurrentRoutineId] = useState<number | null>(null);
const [currentRoutineName, setCurrentRoutineName] = useState<string>("");
const [routineAccess, setRoutineAccess] = useState<RoutineAccess>(RoutineAccess.Editable);
const [selectedExercisesForSetup, setSelectedExercisesForSetup] = useState<Exercise[]>([]);
```

### 2. Screen Routing (`AppRouter`)

The `AppRouter` component handles conditional rendering based on the current view and authentication state:

- **Authentication Screens**: SignIn, SignUp (when not authenticated)
- **Main App Screens**: Workouts, Progress, Profile (when authenticated)
- **Routine Management**: Create, Add Exercises, Exercise Setup
- **Context-Aware Rendering**: Passes appropriate props and navigation functions

### 3. View Types (`utils/navigation.ts`)

Defines all possible navigation states:

```typescript
export type AppView = 
  | "landing"
| "signin"
  | "signup"
  | "workouts" 
  | "create-routine"
  | "add-exercises-to-routine"
  | "exercise-setup"
  | "progress"
  | "profile";
```

## Navigation Flows

### 1. Authentication Flow

```
Landing Screen → Sign In or Sign Up
     ↓
SignIn Screen → Authentication Success → Workouts Dashboard
     ↓
SignUp Screen → Account Creation → Workouts Dashboard
```

**Key Functions:**
- `handleAuthSuccess()`: Sets user token and navigates to workouts
- `navigateToSignUp()`: Switches to signup view
- `navigateToSignIn()`: Switches to signin view

### 2. Main App Navigation

```
Workouts Dashboard ←→ Progress Screen ←→ Profile Screen
      ↓
Bottom Navigation Tab Switching
```

**Key Functions:**
- `handleTabChange()`: Manages tab switching and view updates
- **Active Tab States**: "workouts", "progress", "profile"

### 3. Routine Creation Flow

```
Workouts Dashboard → Create Routine → Add Exercises → Exercise Setup
      ↓
Routine Created → Back to Workouts Dashboard
```

**Key Functions:**
- `showCreateRoutine()`: Opens routine creation screen
- `handleRoutineCreated()`: Jumps to exercise setup after creation
- `completeRoutineCreation()`: Returns to workouts dashboard

### 4. Routine Management Flow

```
Workouts Dashboard → Select Routine → Exercise Setup
      ↓
Add More Exercises → Exercise Selector → Return to Setup
      ↓
Save Changes → Stay on Exercise Setup (UI updates)
```

**Key Functions:**
- `onRoutineSelection()`: Opens routine with access control
- `closeExerciseSetup()`: Opens exercise selector
- `returnToExerciseSetup()`: Returns with selected exercise
- `closeExerciseSetupToRoutines()`: Returns to workouts dashboard

### 5. Exercise Setup Flow

```
Exercise Setup Screen
      ↓
Configure Exercise (Sets, Reps, Weight)
      ↓
Save Exercise → Stay on Screen (List Updates)
      ↓
Add More Exercises → Exercise Selector
      ↓
Return with New Exercise → Continue Setup
```

## Access Control System

### Routine Access Levels

The app implements a sophisticated access control system:

```typescript
export enum RoutineAccess {
  Editable = "editable",    // User's own routines
  ReadOnly = "readonly"     // Sample routines
}
```

**Access Control Flow:**
1. **Sample Routines**: Always read-only, UI elements disabled
2. **My Routines**: Fully editable, all functionality enabled
3. **Dynamic UI**: Buttons, inputs, and actions conditionally enabled/disabled

**Implementation:**
- `onRoutineSelection()` sets access level based on routine source
- `ExerciseSetupScreen` receives access prop and adjusts UI accordingly
- Visual feedback shows editability status

## Navigation Functions Reference

### Authentication Functions
- `handleAuthSuccess(token, setUserToken)`: Processes successful authentication
- `navigateToSignUp()`: Switches to signup view
- `navigateToSignIn()`: Switches to signin view
- `handleUnauthorizedError(error)`: Handles session expiration

### Main Navigation Functions
- `handleTabChange(tab)`: Switches between main app tabs
- `setCurrentView(view)`: Directly sets the current view

### Routine Management Functions
- `showCreateRoutine()`: Opens routine creation flow
- `handleRoutineCreated(name, id)`: Processes newly created routine
- `onRoutineSelection(id, name, access)`: Opens existing routine
- `closeCreateRoutine()`: Returns to workouts from creation
- `completeRoutineCreation()`: Finalizes routine creation

### Exercise Management Functions
- `handleExercisesSelected(exercises, routineId?)`: Processes exercise selection
- `closeExerciseSetup()`: Opens exercise selector
- `returnToExerciseSetup(exercise)`: Returns with selected exercise
- `closeExerciseSetupToRoutines()`: Returns to workouts dashboard
- `handleExerciseSetupComplete()`: Handles exercise save (no navigation)

### Utility Functions
- `safeNavigate(asyncAction, fallbackView)`: Safe navigation with error handling
- `setRefreshTrigger()`: Triggers data refresh across components

## Screen-Specific Navigation

### 1. WorkoutDashboardScreen
- **Navigation In**: From authentication, tab switching, routine completion
- **Navigation Out**: To routine creation, routine selection, other tabs
- **Key Props**: `onCreateRoutine`, `onSelectRoutine`, `onOverlayChange`

### 2. CreateRoutineScreen
- **Navigation In**: From workouts dashboard
- **Navigation Out**: To exercise setup (after creation), back to workouts
- **Key Props**: `onBack`, `onRoutineCreated`

### 3. AddExercisesToRoutineScreen
- **Navigation In**: From exercise setup, routine creation
- **Navigation Out**: To exercise setup (with selected exercise), back to previous screen
- **Key Props**: `onBack`, `onExerciseSelected`, `isFromExerciseSetup`

### 4. ExerciseSetupScreen
- **Navigation In**: From routine selection, exercise selection, routine creation
- **Navigation Out**: To exercise selector, workouts dashboard
- **Key Props**: `onBack`, `onSave`, `onAddMoreExercises`, `access`

### 5. ProgressScreen & ProfileScreen
- **Navigation In**: From tab switching
- **Navigation Out**: To other tabs
- **Key Props**: `bottomBar`

## Bottom Navigation Integration

### Bottom Navigation States
- **Visible**: On main app screens (workouts, progress, profile)
- **Hidden**: On modal screens and during routine management
- **Overlay Management**: `onOverlayChange` prop controls visibility

### Tab Structure
```typescript
type TabType = "workouts" | "progress" | "profile";
```

## Error Handling & Recovery

### Navigation Error Handling
- `safeNavigate()`: Wraps async navigation with error handling
- `handleUnauthorizedError()`: Manages authentication failures
- Fallback navigation: Returns to safe views on errors

### State Recovery
- **Routine Context**: Cleared when leaving exercise setup
- **Exercise Selection**: Reset when changing routines
- **Access Control**: Maintained throughout routine session

## Performance Considerations

### Navigation Optimization
- **Conditional Rendering**: Only renders current view
- **State Persistence**: Maintains context across navigation
- **Efficient Updates**: Minimal re-renders during navigation

### Memory Management
- **State Cleanup**: Clears unused context data
- **Component Unmounting**: Proper cleanup on navigation
- **Reference Management**: Avoids memory leaks

## Debug & Development Features

### Navigation Debugging
- **Console Logging**: Tracks current screen changes
- **State Inspection**: Debug logging for navigation state
- **Visual Debug**: Debug styles for layout verification

### Development Tools
- **Navigation State**: Visible in React DevTools
- **Flow Tracing**: Console logs show navigation paths
- **Error Boundaries**: Catches navigation-related errors

## Final Screen Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKOUT TRACKER APP                              │
│                           Navigation Flow                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   SIGN IN   │◄──►│   SIGN UP   │    │  AUTH SUCCESS │    │  WORKOUTS   │
│             │    │             │    │             │    │  DASHBOARD  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PROGRESS  │◄──►│   PROFILE   │    │CREATE ROUTINE│    │SELECT ROUTINE│
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ADD EXERCISES│◄──►│EXERCISE SETUP│◄──►│EXERCISE SEL.│    │  SAVE &     │
│TO ROUTINE   │    │             │    │             │    │  COMPLETE   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           BOTTOM NAVIGATION                                │
│                    [Workouts] [Progress] [Profile]                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ACCESS CONTROL                                   │
│                    Editable (My Routines) vs ReadOnly (Sample)            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           KEY NAVIGATION PATHS                            │
│                                                                             │
│  • Authentication: SignIn ↔ SignUp → Workouts                              │
│  • Main App: Workouts ↔ Progress ↔ Profile                                │
│  • Routine Creation: Workouts → Create → Add Exercises → Setup            │
│  • Routine Management: Workouts → Select → Setup → Add More → Save        │
│  • Exercise Setup: Configure → Save → Add More → Return to Setup          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           NAVIGATION STATES                               │
│                                                                             │
│  • currentView: Controls which screen is displayed                         │
│  • activeTab: Manages bottom navigation state                             │
│  • currentRoutineId: Maintains routine context                            │
│  • routineAccess: Controls editability (Editable/ReadOnly)                │
│  • selectedExercisesForSetup: Queue of exercises being configured         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Summary

The navigation system provides:

1. **Centralized State Management**: Single source of truth for navigation
2. **Seamless User Experience**: Smooth transitions between screens
3. **Context Preservation**: Maintains user state during navigation
4. **Access Control**: Intelligent UI adaptation based on permissions
5. **Error Recovery**: Robust handling of navigation failures
6. **Performance Optimization**: Efficient rendering and state updates
7. **Development Support**: Comprehensive debugging and logging

This architecture ensures a maintainable, scalable, and user-friendly navigation experience across the entire Workout Tracker application.