# Section Component

A flexible, composable section wrapper that provides consistent styling, loading states, and layout patterns for content organization.

## Overview

The `Section` component is a design system primitive that handles:
- **Visual styling** - backgrounds, shadows, borders, and spacing
- **Layout structure** - headers with titles, subtitles, and actions
- **Loading states** - overlay and replacement loading patterns
- **Responsive behavior** - edge-to-edge bleeding on mobile
- **Accessibility** - proper ARIA labeling and semantic structure

## Component Signature

```tsx
<Section
  // Content
  title?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  
  // Style overrides
  padding?: "none" | "xs" | "sm" | "md" | "lg"
  radius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl"
  shadow?: "none" | "sm" | "md"
  bg?: "transparent" | "card" | "muted" | "translucent"
  divider?: "none" | "top" | "bottom" | "both"
  
  // Preset variants
  variant?: "plain" | "card" | "panel" | "translucent" | "muted"
  
  // Layout
  bleedX?: boolean
  
  // Loading
  loading?: boolean
  loadingBehavior?: "overlay" | "replace"
  skeleton?: React.ReactNode
  
  // Rendering
  as?: keyof JSX.IntrinsicElements
  className?: string
>
  {children}
</Section>
```

## Visual Design System

### Variant Presets

The component provides 5 preset visual styles that combine multiple properties:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Variant Presets                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  plain:      transparent bg, no shadow, no radius              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ No visual styling - raw content                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  card:       white bg, subtle shadow, rounded corners         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Clean white card with subtle depth                    █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  panel:      white bg, medium shadow, border, rounded         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Elevated panel with border                           █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  translucent: white/80 bg, backdrop blur, subtle shadow       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ ░ Modern glass effect with blur                        ░ │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  muted:      soft gray bg, no shadow, rounded                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   │
│  │ ▒ Subtle background for secondary content               ▒ │   │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Spacing Scale

```
┌─────────────────────────────────────────────────────────────────┐
│                        Padding Scale                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  none:  p-0    (0px)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Content touches edges                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  xs:    p-2    (8px)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Minimal breathing room                                 █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  sm:    p-3    (12px)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Comfortable compact spacing                           █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  md:    p-4    (16px) - DEFAULT                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Standard comfortable spacing                          █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  lg:    p-6    (24px)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Generous spacing for important content                █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Border Radius Scale

```
┌─────────────────────────────────────────────────────────────────┐
│                      Border Radius Scale                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  none:  rounded-none     (0px)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Sharp corners                                        █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  sm:    rounded-md       (6px)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Subtle rounding                                     █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  md:    rounded-lg       (8px)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Medium rounding                                     █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  lg:    rounded-xl       (12px)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Generous rounding                                   █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  xl:    rounded-2xl      (16px)                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Large modern rounding                                █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  2xl:   rounded-2xl      (16px) - DEFAULT                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Maximum rounding (same as xl)                        █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Shadow Scale

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shadow Scale                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  none:  shadow-none      (0px elevation)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Flat appearance                                      █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  sm:    shadow-sm        (1px elevation) - DEFAULT            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Subtle depth                                         █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  md:    shadow-md        (4px elevation)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Noticeable elevation                                 █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Layout Structure

### Header Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                        Header Structure                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Title Area                    │ Actions Area             │   │
│  │ ┌─────────────────────────┐   │ ┌─────────────────────┐ │   │
│  │ │ Main Title              │   │ │ Action Button       │ │   │
│  │ │ Subtitle (optional)     │   │ │ or Menu             │ │   │
│  │ └─────────────────────────┘   │ └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Content Area                                             │   │
│  │                                                         │   │
│  │ Your actual content goes here...                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Bleeding

```
┌─────────────────────────────────────────────────────────────────┐
│                      Responsive Bleeding                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Mobile (bleedX: true)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ← -16px margin →                                        │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Content extends to screen edges                      █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ ← -16px margin →                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Desktop (bleedX: true)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Normal margins restored                                  │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Content respects container bounds                     █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ Normal margins restored                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Loading States

### Overlay Loading

```
┌─────────────────────────────────────────────────────────────────┐
│                      Overlay Loading                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Your content remains visible                         █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │                                                         │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ ░ Loading overlay with backdrop blur                   ░ │   │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │                                                         │   │
│  │                    [🔄 Loading...]                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  • Content stays visible                                      │
│  • Semi-transparent overlay                                   │
│  • Backdrop blur effect                                       │
│  • Non-blocking (pointer-events: none)                       │
│  • Inherits border radius                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Replacement Loading

```
┌─────────────────────────────────────────────────────────────────┐
│                    Replacement Loading                          │
├─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │ █ Skeleton replaces content                             █ │   │
│  │ ████████████████████████████████████████████████████████ │   │
│  │                                                         │   │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   │
│  │ ▒ Animated skeleton content                             ▒ │   │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   │
│  │                                                         │   │
│  │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  • Content completely replaced                               │
│  • Default skeleton provided                                 │
│  • Custom skeleton supported                                 │
│  • Animated with pulse effect                                │
│  • Mimics actual content layout                              │
└─────────────────────────────────────────────────────────────────┘
```

## Usage Patterns

### Basic Usage

```tsx
// Simple section with title
<Section title="Quick Stats">
  <div className="grid grid-cols-2 gap-4">
    <div>Steps: 8,432</div>
    <div>Calories: 324</div>
  </div>
</Section>

// Section with subtitle and actions
<Section 
  title="Recent Workouts"
  subtitle="Your last 5 workout sessions"
  actions={<Button>View All</Button>}
>
  <WorkoutList workouts={recentWorkouts} />
</Section>
```

### Variant-Based Usage

```tsx
// Use preset variants for consistent styling
<Section variant="card" title="User Profile">
  <ProfileForm />
</Section>

<Section variant="panel" title="Settings">
  <SettingsForm />
</Section>

<Section variant="translucent" title="Quick Actions">
  <ActionButtons />
</Section>

<Section variant="muted" title="Secondary Info">
  <InfoText />
</Section>

<Section variant="plain" title="Raw Data">
  <RawData />
</Section>
```

### Loading States

```tsx
// Overlay loading - keeps content visible
<Section 
  title="Workout History" 
  loading={isLoading}
  loadingBehavior="overlay"
>
  <WorkoutList workouts={workouts} />
</Section>

// Replacement loading - shows skeleton
<Section 
  title="Exercise Database" 
  loading={isLoading}
  loadingBehavior="replace"
>
  <ExerciseList exercises={exercises} />
</Section>

// Custom skeleton
<Section 
  title="Progress Chart" 
  loading={isLoading}
  loadingBehavior="replace"
  skeleton={<CustomChartSkeleton />}
>
  <ProgressChart data={data} />
</Section>
```

### Responsive Layout

```tsx
// Edge-to-edge on mobile, normal margins on desktop
<Section 
  title="Progress Overview"
  variant="translucent"
  bleedX
>
  <ProgressRings />
</Section>

// Full-width content
<Section 
  title="Hero Section"
  variant="plain"
  bleedX
  padding="none"
>
  <HeroContent />
</Section>
```

### Form Integration

```tsx
// Render as form element
<Section 
  variant="panel"
  title="Create Routine"
  subtitle="Set up your new workout routine"
  as="form"
  onSubmit={handleSubmit}
  loading={isSubmitting}
  loadingBehavior="overlay"
>
  <div className="space-y-4">
    <Input placeholder="Routine name" />
    <Textarea placeholder="Description" />
    <Button type="submit">Create Routine</Button>
  </div>
</Section>
```

### Advanced Customization

```tsx
// Override variant with specific props
<Section 
  variant="card"
  shadow="md"        // Override default shadow
  radius="xl"        // Override default radius
  padding="lg"       // Override default padding
  title="Custom Card"
>
  <Content />
</Section>

// Custom background and borders
<Section 
  variant="plain"
  bg="translucent"
  divider="both"
  title="Bordered Section"
>
  <Content />
</Section>
```

## Integration with AppScreen

### Dashboard Layout

```tsx
<AppScreen maxContent="none">
  {/* Hero section - full bleed, translucent */}
  <Section 
    variant="translucent" 
    bleedX 
    title="Today's Progress"
  >
    <ProgressRings />
  </Section>
  
  {/* Stats grid - clean cards */}
  <div className="grid grid-cols-2 gap-4">
    <Section variant="card" title="Steps">
      <div className="text-2xl font-bold">8,432</div>
    </Section>
    <Section variant="card" title="Calories">
      <div className="text-2xl font-bold">324</div>
    </Section>
  </div>
  
  {/* Recent workouts - elevated panel */}
  <Section 
    variant="panel" 
    title="Recent Workouts"
    actions={<Button>View All</Button>}
  >
    <WorkoutList />
  </Section>
</AppScreen>
```

### Form Layout

```tsx
<AppScreen maxContent="responsive">
  <Section 
    variant="panel"
    title="Personal Information"
    subtitle="Update your profile details"
    as="form"
    onSubmit={handleSubmit}
    loading={isSubmitting}
    loadingBehavior="overlay"
  >
    <div className="space-y-4">
      <Input placeholder="Name" />
      <Input placeholder="Email" />
      <Button type="submit">Save Changes</Button>
    </div>
  </Section>
</AppScreen>
```

### List Layout

```tsx
<AppScreen maxContent="md">
  <Section 
    variant="card"
    title="Exercise Library"
    subtitle="Browse and search exercises"
    actions={<SearchInput placeholder="Search..." />}
  >
    <div className="space-y-3">
      {exercises.map(exercise => (
        <ExerciseCard key={exercise.id} exercise={exercise} />
      ))}
    </div>
  </Section>
</AppScreen>
```

## Best Practices

### 1. Start with Variants

```tsx
// ✅ Good - Use variants for common patterns
<Section variant="card" title="Content">
  <Content />
</Section>

// ❌ Avoid - Don't manually specify every property
<Section 
  bg="card" 
  shadow="sm" 
  radius="2xl" 
  padding="md"
  title="Content"
>
  <Content />
</Section>
```

### 2. Override When Needed

```tsx
// ✅ Good - Override specific properties
<Section 
  variant="card"
  shadow="md"        // Override shadow
  padding="lg"       // Override padding
  title="Content"
>
  <Content />
</Section>

// ✅ Good - Use plain variant as base
<Section 
  variant="plain"
  bg="translucent"
  divider="bottom"
  title="Content"
>
  <Content />
</Section>
```

### 3. Loading State Patterns

```tsx
// ✅ Good - Overlay for quick operations
<Section 
  loading={isSaving}
  loadingBehavior="overlay"
  title="Form"
>
  <Form />
</Section>

// ✅ Good - Replace for data fetching
<Section 
  loading={isLoading}
  loadingBehavior="replace"
  title="Data"
>
  <DataList />
</Section>
```

### 4. Responsive Bleeding

```tsx
// ✅ Good - Use for hero sections
<Section 
  variant="translucent"
  bleedX
  title="Hero"
>
  <HeroContent />
</Section>

// ✅ Good - Use for full-width content
<Section 
  variant="plain"
  bleedX
  padding="none"
  title="Full Width"
>
  <FullWidthContent />
</Section>
```

### 5. Semantic HTML

```tsx
// ✅ Good - Use appropriate HTML elements
<Section as="form" onSubmit={handleSubmit}>
  <FormContent />
</Section>

<Section as="article" title="Blog Post">
  <BlogContent />
</Section>

<Section as="aside" title="Related">
  <RelatedContent />
</Section>
```

## Type System

### Core Types

```tsx
// Spacing options
type Padding = "none" | "xs" | "sm" | "md" | "lg";

// Border radius options
type Radius = "none" | "sm" | "md" | "lg" | "xl" | "2xl";

// Shadow depth options
type Shadow = "none" | "sm" | "md";

// Background options
type Bg = "transparent" | "card" | "muted" | "translucent";

// Divider options
type Divider = "none" | "top" | "bottom" | "both";

// Variant presets
type Variant = "plain" | "card" | "panel" | "translucent" | "muted";
```

### Props Interface

```tsx
export type SectionProps<T extends keyof JSX.IntrinsicElements = "section"> = {
  // Content
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;

  // Style overrides
  padding?: Padding;
  radius?: Radius;
  shadow?: Shadow;
  bg?: Bg;
  divider?: Divider;

  // Preset variants
  variant?: Variant;

  // Layout
  bleedX?: boolean;

  // Loading
  loading?: boolean;
  loadingBehavior?: "overlay" | "replace";
  skeleton?: React.ReactNode;

  // Rendering
  className?: string;
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "title">;
```

## CSS Variables

The component uses these CSS custom properties for theming:

```css
/* Border colors */
--border: #e5e7eb;

/* Background colors */
--soft-gray: #f9fafb;
--warm-brown: #374151;
--warm-coral: #f97316;
```

## Accessibility Features

### ARIA Attributes

- **`aria-labelledby`** - Links section to its title for screen readers
- **`aria-busy`** - Indicates loading state to assistive technologies

### Semantic Structure

- **Proper heading hierarchy** - Uses `h2` for section titles
- **Screen reader friendly** - Clear content structure
- **Keyboard navigation** - Proper focus management

## Performance Considerations

### Efficient Rendering

- **Conditional rendering** - Only renders loading states when needed
- **Memoized classes** - CSS classes built efficiently
- **Minimal re-renders** - Stable component structure

### Bundle Size

- **Tree-shakeable** - Only imports what you use
- **Efficient CSS** - Uses Tailwind utility classes
- **Minimal dependencies** - Only React core

## Migration Guide

### From Custom Divs

```tsx
// Before - Manual styling
<div className="bg-card rounded-2xl shadow-sm p-4 border-b border-gray-200">
  <h2 className="text-lg font-medium text-gray-900 mb-3">Title</h2>
  <div className="text-gray-600">Content</div>
</div>

// After - Using Section
<Section variant="card" title="Title" divider="bottom">
  <div className="text-gray-600">Content</div>
</Section>
```

### From Other Components

```tsx
// Before - Custom component
<Card title="Title" variant="elevated">
  <Content />
</Card>

// After - Using Section
<Section variant="panel" title="Title">
  <Content />
</Section>
```

## Troubleshooting

### Common Issues

1. **Loading overlay not visible**
   - Ensure `loading={true}` is passed
   - Check `loadingBehavior="overlay"`

2. **Variant not applying**
   - Verify variant name is correct
   - Check for conflicting prop overrides

3. **Bleeding not working**
   - Ensure parent container allows negative margins
   - Check `bleedX={true}` is set

4. **Custom skeleton not showing**
   - Verify `loadingBehavior="replace"`
   - Check skeleton prop is passed

### Debug Mode

Add console logs to see what's happening:

```tsx
<Section 
  title="Debug"
  loading={true}
  loadingBehavior="overlay"
  onLoad={() => console.log('Section loaded')}
>
  <div>Content</div>
</Section>
```

## Conclusion

The `Section` component provides a comprehensive, flexible foundation for content organization in your app. By using variants as starting points and overriding specific properties when needed, you can create consistent, beautiful layouts while maintaining flexibility.

The key is to **start with the right variant** for your content type and **let the component handle the styling complexity** while you focus on the actual content and functionality.

---

**Next Steps:**
- [ ] Implement the Section component
- [ ] Add to your design system documentation
- [ ] Create usage examples in your app
- [ ] Consider adding more variants based on usage patterns
