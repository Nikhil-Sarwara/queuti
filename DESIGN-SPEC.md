# Queuti Design System v2 — Warm Minimalism + Bento Grid

## Design Philosophy
- **Warm Minimalism**: Clean, high-contrast layouts with soft organic surfaces
- **Bento-grid utility**: Dashboard uses CSS Grid bento cards (varying sizes)
- **Intrinsic Web Design**: Fluid typography, fluid spacing, container queries where useful
- **Material Design**: Google-inspired elevation system, motion, and interaction patterns
- **Two themes only**: `light` (default) and `dark` — NO "paper", NO "midnight"

## Color Palette (Light Theme)
- **Background**: `#FAFAF8` (warm white), surface: `#FFFFFF`, elevated: `#F5F5F3`
- **Text primary**: `#1A1A1A`, secondary: `#6B6B6B`, tertiary: `#9E9E9E`
- **Accent (primary)**: `#5B5FC7` (indigo-ish) — CTAs, active states, links
- **Accent hover**: `#4A4EB5`
- **Success**: `#2E7D32`, **Warning**: `#ED6C02`, **Error**: `#D32F2F`, **Info**: `#0288D1`
- **Border**: `#E8E8E6`, subtle: `#F0F0EE`
- **Surface warm tint**: `#F8F6F2` for cards

## Color Palette (Dark Theme)
- **Background**: `#121212`, surface: `#1E1E1E`, elevated: `#2A2A2A`
- **Text primary**: `#E8E8E8`, secondary: `#A0A0A0`, tertiary: `#6B6B6B`
- **Accent**: `#8B8FE7` (lighter indigo for dark)
- **Border**: `#333333`, subtle: `#2A2A2A`

## Typography (Fluid)
- Use system font stack: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Display/heading: font-weight 700, fluid size via `clamp()`
- Body: font-weight 400, 1rem base
- Scale: `clamp(0.875rem, 0.8rem + 0.25vw, 1rem)` for body small
- Headings: `clamp(1.5rem, 1.2rem + 1vw, 2.25rem)` for h1, etc.

## Spacing & Layout
- Use 4px base grid: 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px, 10=40px, 12=48px
- Page padding: `clamp(1rem, 0.5rem + 2vw, 2rem)`
- Max content width: 1280px centered
- Bento grid: `display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;`
- Dashboard bento: specific areas for overview cards, table, charts

## Elevation (Material Design inspired)
- **Level 0**: no shadow (flat background)
- **Level 1**: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` — cards, surfaces
- **Level 2**: `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` — hover cards, dropdowns
- **Level 3**: `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` — modals, popovers
- Dark theme: stronger shadows with `rgba(0,0,0,0.3-0.5)`

## Border Radius
- Small: 6px (badges, chips)
- Medium: 8px (cards, inputs)
- Large: 12px (modals, large cards)
- XL: 16px (bento hero cards)
- Full: 9999px (pills, avatars)

## Component Patterns

### Button
- Variants: `primary` (accent fill), `secondary` (outline), `ghost` (text only), `danger`
- No gradients. Flat fill with hover darkening.
- Transitions: `transition-all duration-150 ease-out`
- Hover: darken bg 5-8%, subtle shadow lift
- Active: slight scale(0.98) + inset shadow
- Sizes: sm (h-8, text-xs), md (h-10, text-sm), lg (h-12, text-base)

### Card
- Background: surface color, Level 1 elevation
- No textures, no gradients, no bevels
- Border: 1px solid subtle border color
- Hover: Level 2 elevation lift (optional)
- Padding: 1.5rem (24px)

### Badge
- Flat fill with low-opacity colored background
- Pill shape (rounded-full)
- Font: text-xs, font-medium
- No borders, no bevels

### TextField
- Border: 1px solid border color, 8px radius
- Focus: 2px ring in accent color, border-color accent
- Background: white (light) / elevated surface (dark)
- Label: text-sm, font-medium, text-secondary

## Micro-interactions
- All transitions: 150ms ease-out (fast, snappy)
- Hover lifts: subtle translateY(-1px) + shadow increase
- Press depress: translateY(0) + inset shadow
- Page transitions: fade in 200ms
- Toast notifications: slide in from top-right, 300ms ease-out

## Bento Grid Layout (Dashboard)
```
Desktop (3+ cols):
┌─────────┬──────────┬──────────┐
│  Stats   │  Stats   │  Stats   │  ← equal 1/3
├─────────┴──────────┼──────────┤
│   Applications     │ Upcoming │  ← 2/3 + 1/3
│     Table          │Interviews│
├────────────────────┼──────────┤
│   Analytics        │  Market  │  ← 1/2 + 1/2
│   Dashboard        │  Intel   │
└────────────────────┴──────────┘

Mobile: single column, cards stack vertically
```

## What to REMOVE (skeuomorphic)
- All `texture-*` classes and SVG grain overlays
- `shadow-bevel`, `shadow-engraved`, `shadow-pressed`, `shadow-raised`
- `text-engraved`, `text-embossed`
- Leather/wood/paper/brass/blood/moss color families
- `data-theme="paper"` and `data-theme="midnight"`
- Serif display font family
- Gradient backgrounds on body, buttons, cards
- Inset shadows on inputs
- Physical button press animations

## What to ADD
- Clean `data-theme="light"` and `data-theme="dark"` system
- Fluid typography with `clamp()`
- CSS custom properties for the new palette
- `prefers-reduced-motion` respect
- Container query support (progressive)
- Bento grid utilities
- Smooth scroll behavior
- Focus-visible ring using accent color
