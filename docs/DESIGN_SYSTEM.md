# Design System

StackHunt uses **shadcn/ui** as its component library, built on Tailwind CSS and Radix UI primitives.

## Overview

- **Component Library**: shadcn/ui (copy-paste, not npm package)
- **Base Styling**: Tailwind CSS with custom design tokens
- **Primitives**: Radix UI for accessibility
- **Icons**: Lucide React
- **Type-safe**: TypeScript with class-variance-authority

## Design Tokens

Design tokens are defined in `src/styles/globals.css` using CSS variables with OKLCH color space.

### Brand Colors

The primary brand color (StackHunt Orange) is integrated into the design system:

- **Primary**: `hunt-500` (#f97316) in light mode, `hunt-400` (#fb923c) in dark mode
- **Ring/Focus**: Uses primary orange for consistent focus states

### Semantic Colors

All shadcn components use semantic color tokens that automatically adapt to light/dark mode:

| Token | Purpose | Example |
|-------|---------|---------|
| `background` / `foreground` | Base page colors | Body, text |
| `card` / `card-foreground` | Card surfaces | Review cards, panels |
| `primary` / `primary-foreground` | Primary actions | CTA buttons |
| `secondary` / `secondary-foreground` | Secondary actions | Subtle buttons |
| `muted` / `muted-foreground` | Disabled/subtle | Placeholders |
| `accent` / `accent-foreground` | Highlights | Hover states |
| `destructive` / `destructive-foreground` | Errors/warnings | Delete, reject |
| `border` / `input` / `ring` | UI chrome | Borders, focus rings |

### Using Design Tokens

**In Tailwind Classes:**
```tsx
<div className="bg-primary text-primary-foreground">
  Primary colored box
</div>
```

**In shadcn Components:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary Button</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Subtle</Button>
```

## Component Usage

### Installing New Components

Use the shadcn CLI to add components:

```bash
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add button
npx shadcn@latest add input card
npx shadcn@latest add dialog dropdown-menu
```

Components are copied to `src/components/ui/` and can be customized as needed.

### Available Components

Currently installed:
- **Button**: Primary, secondary, destructive, outline, ghost, link variants
- **Input**: Text input with focus states
- **Card**: Container with header, content, footer sections

### Component Patterns

**Button Variants:**
```tsx
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link</Button>
```

**Button Sizes:**
```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

**Card Structure:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>
    Main content
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

## Utils

### `cn()` Function

Utility for merging Tailwind classes with proper precedence:

```tsx
import { cn } from '@/lib/utils';

<Button className={cn('extra-class', isActive && 'active-class')}>
  Button
</Button>
```

## Best Practices

### ✅ Do

- **Use semantic tokens**: Prefer `bg-primary` over `bg-orange-500`
- **Use shadcn components**: For buttons, inputs, cards, dialogs
- **Keep components accessible**: shadcn components are accessible by default
- **Customize in place**: Edit shadcn components in `src/components/ui/` as needed
- **Use `cn()` for conditional classes**: Ensures proper merge behavior

### ❌ Don't

- **Don't hardcode colors**: Use design tokens instead
- **Don't rebuild existing components**: Check `src/components/ui/` first
- **Don't skip dark mode**: Test components in both light and dark themes
- **Don't ignore accessibility**: Maintain ARIA attributes and keyboard nav

## Styling Patterns

### Responsive Design

Use Tailwind breakpoints:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

### Dark Mode

All components automatically support dark mode via the `dark:` prefix:
```tsx
<div className="bg-white dark:bg-zinc-900">
  Auto-adapting background
</div>
```

The CSS variables in `globals.css` handle most dark mode logic automatically.

### Custom Colors

While semantic tokens are preferred, the `hunt-*` scale remains available for brand-specific styling:

```tsx
<div className="bg-hunt-500 text-white">
  Brand orange background
</div>
```

## Migration Guide

When migrating existing components to shadcn:

1. **Replace custom buttons** with `<Button>` component
2. **Replace custom inputs** with `<Input>` component
3. **Update class names** to use semantic tokens
4. **Test dark mode** behavior
5. **Verify accessibility** (keyboard nav, ARIA labels)

Example migration:
```tsx
// Before
<button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded">
  Submit
</button>

// After
<Button className="bg-green-600 hover:bg-green-700">
  Submit
</Button>
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
