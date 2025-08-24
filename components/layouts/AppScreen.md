# AppScreen Component Documentation

## Overview

`AppScreen` is a mobile-first screen wrapper that provides consistent layout patterns across your app. It handles safe-area padding, sticky headers/bottom bars, and responsive content width constraints.

## Core Features

- **Safe Area Handling**: Automatically manages iOS notches, home indicators, and safe areas
- **Flexible Width Modes**: Full-bleed, responsive, or fixed-width content
- **Sticky Elements**: Optional sticky headers and bottom bars
- **Keyboard Awareness**: Handles keyboard insets for bottom bars
- **Consistent Spacing**: Standardized padding and margins

## Width Modes

### 1. Full-Bleed (`maxContent="none"`)
Content stretches edge-to-edge with no width constraints or centering.

**Use for:**
- Dashboards
- Progress screens
- Full-width charts
- Immersive content
- Lists and feeds

**Example:**
```tsx
<AppScreen maxContent="none">
  <ProgressRings />
  <div className="grid grid-cols-2 gap-4">
    <Card>Quick Stats</Card>
    <Card>Recent Workouts</Card>
  </div>
</AppScreen>
```

**Visual Result:**
```
┌─────────────────────────────────────────┐ ← iPhone 16 Pro (393px)
│ Content goes edge-to-edge               │
│ No margins, no centering               │
│ Takes full screen width                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ProgressRings stretch full width    │ │
│ │ Cards go edge-to-edge               │ │
│ │ No wasted space on sides            │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

### 2. Responsive (`maxContent="responsive"`)
Content automatically scales with screen size using Tailwind's responsive breakpoints.

**Use for:**
- Forms
- Settings pages
- Profile pages
- Reading content
- General-purpose screens

**Example:**
```tsx
<AppScreen maxContent="responsive">
  <div className="space-y-6">
    <h1>Create Routine</h1>
    <Input placeholder="Routine name" />
    <Input placeholder="Description" />
    <TactileButton>Create</TactileButton>
  </div>
</AppScreen>
```

**Visual Result on Different Devices:**

**iPhone 16 Pro (393px):**
```
┌─────────────────────────────────────────┐
│ ┌─────────────┐                        │
│ │ Content     │ ← max-w-md (448px)     │
│ │ centered    │   but screen is 393px  │
│ │ with        │   so it's full width   │
│ │ margins     │                        │
│ └─────────────┘                        │
└─────────────────────────────────────────┘
```

**iPad (768px):**
```
┌─────────────────────────────────────────────────────────┐
│        ┌─────────────────────────────────────┐         │
│        │ Content centered with               │         │
│        │ max-w-xl (576px)                    │         │
│        │ Nice readable width                 │         │
│        │                                     │         │
│        └─────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

**Desktop (1200px):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ┌─────────────────────────────────────┐             │
│                    │ Content with                        │             │
│                    │ max-w-3xl (768px)                   │             │
│                    │ Optimal reading width               │             │
│                    │                                     │             │
│                    └─────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Fixed Widths
Predefined Tailwind max-width classes for consistent sizing.

**Available Options:**
- `"sm"` → `max-w-sm` (384px)
- `"md"` → `max-w-md` (448px) - **Default**
- `"lg"` → `max-w-lg` (512px)
- `"xl"` → `max-w-xl` (576px)
- `"2xl"` → `max-w-2xl` (672px)
- `"3xl"` → `max-w-3xl` (768px)

**Example:**
```tsx
<AppScreen maxContent="lg">
  <div className="space-y-4">
    <h1>Workout Details</h1>
    <p>Content with consistent 512px max width</p>
  </div>
</AppScreen>
```

---

### 4. Custom Pixel Width (`maxContentPx`)
Exact pixel control for specific use cases.

**Use for:**
- Modals
- Focused content
- Specific design requirements
- Consistent cross-device sizing

**Example:**
```tsx
<AppScreen maxContentPx={600}>
  <div className="space-y-4">
    <h2>Exercise Details</h2>
    <p>Exactly 600px max width on larger screens</p>
    <p>Perfect for focused content</p>
  </div>
</AppScreen>
```

**Visual Result:**
```
┌─────────────────────────────────────────────────────────┐ ← iPad (768px)
│        ┌─────────────────────────────────────┐         │
│        │ Content is exactly 600px wide       │         │
│        │ Centered on screen                  │         │
│        │ Perfect for forms, modals          │         │
│        │                                     │         │
│        └─────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Screen Examples

### Dashboard Screen
**Full-bleed layout for maximum content space**

```tsx
<AppScreen maxContent="none">
  <div className="space-y-6">
    {/* Progress rings stretch full width */}
    <ProgressRings />
    
    {/* Stats grid uses full screen */}
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <h3>Today's Steps</h3>
        <p className="text-2xl font-bold">8,432</p>
      </Card>
      <Card>
        <h3>Calories Burned</h3>
        <p className="text-2xl font-bold">324</p>
      </Card>
    </div>
    
    {/* Recent workouts full width */}
    <div className="space-y-3">
      <h2>Recent Workouts</h2>
      <WorkoutCard />
      <WorkoutCard />
    </div>
  </div>
</AppScreen>
```

---

### Form Screen
**Responsive layout for optimal form experience**

```tsx
<AppScreen 
  header={<ScreenHeader title="Create Routine" onBack={onBack} />}
  maxContent="responsive"
>
  <div className="space-y-6">
    <div className="space-y-2">
      <Label htmlFor="name">Routine Name</Label>
      <Input id="name" placeholder="Morning Workout" />
    </div>
    
    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea 
        id="description" 
        placeholder="Quick morning routine to start the day"
      />
    </div>
    
    <div className="space-y-2">
      <Label>Difficulty Level</Label>
      <div className="flex gap-2">
        <Button variant="outline">Beginner</Button>
        <Button variant="outline">Intermediate</Button>
        <Button variant="outline">Advanced</Button>
      </div>
    </div>
  </div>
</AppScreen>
```

---

### Settings Screen
**Fixed width for consistent reading experience**

```tsx
<AppScreen 
  header={<ScreenHeader title="Settings" />}
  maxContent="lg"
>
  <div className="space-y-6">
    <div className="space-y-4">
      <h2>Account</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span>Email</span>
          <span className="text-muted-foreground">user@example.com</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Member Since</span>
          <span className="text-muted-foreground">Jan 2024</span>
        </div>
      </div>
    </div>
    
    <div className="space-y-4">
      <h2>Preferences</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span>Dark Mode</span>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <span>Notifications</span>
          <Switch />
        </div>
      </div>
    </div>
  </div>
</AppScreen>
```

---

### Modal/Detail Screen
**Custom width for focused content**

```tsx
<AppScreen 
  header={<ScreenHeader title="Exercise Details" onBack={onClose} />}
  maxContentPx={500}
  bottomBar={
    <div className="flex gap-3">
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={onSave}>Save Changes</Button>
    </div>
  }
>
  <div className="space-y-6">
    <div className="space-y-4">
      <h2>Bench Press</h2>
      <p className="text-muted-foreground">
        Compound exercise targeting chest, shoulders, and triceps
      </p>
    </div>
    
    <div className="space-y-4">
      <h3>Instructions</h3>
      <ol className="list-decimal list-inside space-y-2">
        <li>Lie on bench with feet flat on ground</li>
        <li>Grip bar slightly wider than shoulder width</li>
        <li>Lower bar to chest with control</li>
        <li>Press bar back up to starting position</li>
      </ol>
    </div>
    
    <div className="space-y-4">
      <h3>Target Muscles</h3>
      <div className="flex flex-wrap gap-2">
        <Badge>Chest</Badge>
        <Badge>Shoulders</Badge>
        <Badge>Triceps</Badge>
      </div>
    </div>
  </div>
</AppScreen>
```

---

### List Screen
**Full-bleed for maximum content display**

```tsx
<AppScreen 
  header={<ScreenHeader title="Exercises" />}
  maxContent="none"
>
  <div className="space-y-4">
    {/* Search bar full width */}
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input 
        placeholder="Search exercises..." 
        className="pl-10"
      />
    </div>
    
    {/* Exercise list full width */}
    <div className="space-y-3">
      <ExerciseCard name="Bench Press" category="Strength" />
      <ExerciseCard name="Squats" category="Strength" />
      <ExerciseCard name="Pull-ups" category="Bodyweight" />
      <ExerciseCard name="Deadlift" category="Strength" />
    </div>
  </div>
</AppScreen>
```

## Layout Patterns

### Header Patterns

**Basic Header:**
```tsx
<AppScreen header={<ScreenHeader title="Screen Title" />}>
  {/* Content */}
</AppScreen>
```

**Sticky Header:**
```tsx
<AppScreen 
  header={<ScreenHeader title="Screen Title" onBack={onBack} />}
  stickyHeader
>
  {/* Content */}
</AppScreen>
```

**Custom Header:**
```tsx
<AppScreen 
  header={
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Custom Header</h1>
      <Button variant="ghost" size="sm">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  }
>
  {/* Content */}
</AppScreen>
```

### Bottom Bar Patterns

**Action Bar:**
```tsx
<AppScreen 
  bottomBar={
    <div className="flex gap-3">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave}>Save</Button>
    </div>
  }
>
  {/* Content */}
</AppScreen>
```

**Sticky Action Bar:**
```tsx
<AppScreen 
  bottomBar={
    <div className="flex gap-3">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave}>Save</Button>
    </div>
  }
  bottomBarSticky
>
  {/* Content */}
</AppScreen>
```

**Custom Bottom Bar:**
```tsx
<AppScreen 
  bottomBar={
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        3 exercises selected
      </span>
      <Button onClick={onAddSelected}>Add Selected</Button>
    </div>
  }
>
  {/* Content */}
</AppScreen>
```

## Best Practices

### 1. Choose the Right Width Mode
- **Full-bleed**: Dashboards, lists, immersive content
- **Responsive**: Forms, settings, general content
- **Fixed width**: Reading content, focused forms
- **Custom width**: Modals, specific design requirements

### 2. Header Usage
- **Always use headers** for screen identification
- **Make headers sticky** for long content
- **Include back buttons** when appropriate
- **Use consistent header styling**

### 3. Bottom Bar Usage
- **Use for primary actions** (Save, Create, etc.)
- **Make sticky** for forms and long content
- **Keep actions minimal** (2-3 buttons max)
- **Use consistent button styling**

### 4. Content Organization
- **Use consistent spacing** (`space-y-4`, `space-y-6`)
- **Group related content** in sections
- **Use cards** for distinct content blocks
- **Maintain visual hierarchy**

### 5. Responsive Considerations
- **Test on different screen sizes**
- **Use responsive width modes** for flexibility
- **Consider mobile-first design**
- **Ensure touch targets are appropriate**

## Migration Guide

### From Hardcoded Layouts

**Before:**
```tsx
<div className="min-h-[100dvh] bg-background flex flex-col pt-safe">
  <div className="relative flex items-center p-4 bg-white/80 backdrop-blur-sm border-b border-[var(--border)]">
    <h1>Screen Title</h1>
  </div>
  <div className="px-4 py-4 space-y-3">
    {/* Content */}
  </div>
</div>
```

**After:**
```tsx
<AppScreen 
  header={<ScreenHeader title="Screen Title" />}
  maxContent="responsive"
>
  {/* Content */}
</AppScreen>
```

### Benefits of Migration
- **Consistent layout** across all screens
- **Automatic safe area handling**
- **Responsive behavior** built-in
- **Easier maintenance** and updates
- **Better developer experience**

## Troubleshooting

### Common Issues

**Content not centering:**
- Check `maxContent` prop value
- Ensure `maxContentPx` is not overriding
- Verify `maxContentClassName` is not interfering

**Header not sticking:**
- Set `stickyHeader={true}`
- Check z-index conflicts
- Ensure header is provided

**Bottom bar not appearing:**
- Provide `bottomBar` prop
- Check if content is covering it
- Verify `bottomBarSticky` setting

**Safe areas not working:**
- Ensure iOS simulator is running
- Check CSS variable definitions
- Verify viewport meta tag

### Performance Tips
- **Use `maxContent="responsive"`** for most screens
- **Avoid custom pixel widths** unless necessary
- **Keep header content minimal** for sticky headers
- **Use `React.memo`** for complex header/bottom bar components

## Conclusion

`AppScreen` provides a robust foundation for consistent, responsive screen layouts. By choosing the appropriate width mode and organizing content effectively, you can create professional, user-friendly interfaces that work seamlessly across all device sizes.

The key is to **start with the right width mode** for your content type and **let the component handle the layout complexity** while you focus on the actual content and functionality.
