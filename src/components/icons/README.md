# Icon Library

Centralized icon management for StackHunt to avoid duplicating SVG code.

## Structure

### Astro Icons (`src/components/icons/*.astro`)

Reusable icon components for Astro files:

- `Check.astro` - Checkmark icon
- `X.astro` - Close/X icon
- `ExternalLink.astro` - External link arrow
- `Minus.astro` - Minus icon

**Usage in Astro:**

```astro
---
import CheckIcon from '@/components/icons/Check.astro';
---

<CheckIcon class="h-4 w-4 text-green-600" />
```

### React Icons (via lucide-react)

For React/TSX components, use lucide-react directly:

```tsx
import { Check, X, Plus, ExternalLink, Trash2 } from 'lucide-react';

<Check className="h-4 w-4" />;
```

## Migrated Components

### React Components (using lucide-react)

- ✅ `CompareButton.tsx` - Check, Clipboard, X, Trash2
- ✅ `AddToStackButton.tsx` - Check, Plus
- ✅ `MyStackWidget.tsx` - Layers, ChevronDown, X
- ✅ `CategorySearch.tsx` - Search, X, ChevronRight
- ✅ `SmartComparisonTable.tsx` - Check, X, HelpCircle
- ✅ `SpeedReviewCard.tsx` - Check, X
- ✅ `VoteWidget.tsx` - ThumbsUp, ThumbsDown (already migrated)

### Astro Components (using icon library)

- ✅ `ProsCons.astro` - Check, X, ExternalLink
- ✅ `PricingPlansGrid.astro` - Check
- ✅ `PlatformIntegrations.astro` - Check
- ✅ `SecurityCompliance.astro` - Check, X
- ✅ `SupportOptions.astro` - Check

## Benefits

1. **No duplication** - Icons defined once, used everywhere
2. **Consistent styling** - Same icons throughout the app
3. **Tree-shaking** - lucide-react only bundles icons you use
4. **Maintainability** - Update icons in one place
5. **Smaller bundle** - lucide-react is optimized, lightweight

## Adding New Icons

### For Astro files:

1. Create new `.astro` file in `src/components/icons/`
2. Copy SVG from existing code or design system
3. Make class/size props configurable

### For React files:

1. Browse [lucide.dev](https://lucide.dev)
2. Import the icon you need
3. Use consistent className patterns

## Icon Naming Convention

- Use PascalCase for component names
- Match lucide-react naming when possible
- Use semantic names (Check vs Checkmark, X vs Close)
