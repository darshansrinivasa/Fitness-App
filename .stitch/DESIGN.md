---
name: Lifestyle OS
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#47464c'
  text-secondary: '#6b7280'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#78767d'
  outline-variant: '#c8c5cd'
  border-subtle: '#e8eaf0'
  surface-tint: '#5d5c74'
  primary: '#1a1a2e'
  on-primary: '#ffffff'
  primary-container: '#1a1a2e'
  on-primary-container: '#83829b'
  inverse-primary: '#c6c4df'
  secondary: '#5e51ad'
  on-secondary: '#ffffff'
  secondary-container: '#a99cfe'
  on-secondary-container: '#3d2e89'
  tertiary: '#695d3c'
  on-tertiary: '#ffffff'
  tertiary-container: '#b9aa83'
  on-tertiary-container: '#493f20'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  success: '#059669'
  warning: '#d97706'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  gutter: 16px
  card_gap: 12px
  section_padding: 20px
  container_margin: 16px
---

## Brand & Style

The Lifestyle OS design system follows a **Holistic Clarity** aesthetic for a personal health and lifestyle tracker (Android-first React Native app). It targets users who want every health signal in one calm, organized place — not another cluttered fitness app.

The visual language blends **Modern Minimalism** with **Material You** tonal surfaces. A pastel **Module Accent Palette** gives each lifestyle category instant recognition. The interface should feel light, airy, and premium: generous whitespace, soft elevation, and data that reads effortlessly on a phone.

**React Native implementation:** map tokens from `apps/mobile/src/theme/tokens.ts`. Use `@expo-google-fonts/inter` for Inter. Icons: Ionicons outlined equivalents of Material Symbols (2px stroke feel).

## Colors

### Core surfaces (light mode only for v1)

- **Background:** `#F8F9FB` — app canvas
- **Cards / elevated surfaces:** `#FFFFFF` (`surface-container-lowest`)
- **Primary text:** `#1A1A2E` — headings, values, primary labels
- **Secondary text:** `#6B7280` — captions, hints, de-emphasized metadata
- **Muted text:** `#47464C` (`on-surface-variant`) — inline secondary within cards
- **Borders / dividers:** `#E8EAF0` (subtle) or `#C8C5CD` (`outline-variant`)

### Semantic colors

- **Secondary (brand accent / active nav):** `#5E51AD` — active tab, links, focus rings
- **Primary container:** `#1A1A2E` — FAB, high-emphasis buttons
- **Error:** `#BA1A1A` · **Success:** `#059669` · **Warning:** `#D97706`

### Module Accent Palette

Each module uses a pastel tint background, 4px left border, and a saturated accent for icons and progress fills. Use consistently on module grid tiles, category cards, dashboard stat chips, and habit checkboxes.

| Module | Tint BG | Border / Accent | Icon accent |
|---|---|---|---|
| Fitness | `#E3F2FD` | `#2196F3` | `#1976D2` |
| Nutrition | `#F1F8E9` | `#8BC34A` | `#689F38` |
| Water | `#E0F7FA` | `#00BCD4` | `#0097A7` |
| Sleep | `#EDE7F6` | `#673AB7` | `#512DA8` |
| Habits | `#FFF3E0` | `#FF9800` | `#F57C00` |
| Body | `#FCE4EC` | `#E91E63` | `#C2185B` |
| Photos | `#E8EAF6` | `#3F51B5` | `#303F9F` |
| Haircare | `#F3E5F5` | `#9C27B0` | `#7B1FA2` |
| Skincare | `#EFEBE9` | `#795548` | `#5D4037` |
| Supplements | `#F9FBE7` | `#CDDC39` | `#AFB42B` |
| Goals | `#E0F2F1` | `#009688` | `#00796B` |
| Health | `#FFFDE7` | `#FBC02D` | `#F9A825` |

## Typography

**Inter** only. Load via Expo Google Fonts.

- **Screen titles:** `headline-lg-mobile` (22px / 700)
- **Section headings:** `headline-md` (20px / 700)
- **Card titles:** `label-lg` (14px / 500) or 16px / 600
- **Body copy:** `body-md` (14px / 400) or `body-lg` (16px / 400)
- **Tab labels, metadata:** `label-md` (12px / 500)
- **Large stat values:** `headline-md` or 32px / 700 on dashboard stat cards

Headings use negative letter-spacing on large sizes. Never use pure black — use `#1A1A2E`.

## Layout & Spacing

Mobile-first, 390px design width. Safe areas respected via `react-native-safe-area-context`.

- **Screen horizontal padding:** 16px (`container_margin`)
- **Card internal padding:** 16px
- **Gap between cards in a group:** 12px (`card_gap`)
- **Gap between major sections:** 20px (`section_padding`)
- **Module grid:** 2 columns, ~47% tile width, 12px gap
- **Bottom tab bar clearance:** content needs ~96px bottom padding when FAB present

## Elevation & Depth

Prefer **ambient elevation** over heavy shadows.

- **Level 0 (background):** flat `#F8F9FB`
- **Level 1 (cards):** `#FFFFFF` + shadow `0 2px 8px rgba(26, 26, 46, 0.04)`
- **Level 2 (modals, dragged items):** shadow `0 4px 12px rgba(26, 26, 46, 0.08)`
- **Dividers:** 1px `#E8EAF0` inside lists

In React Native: use `elevation` (Android) + subtle shadow props (iOS) via a shared `Card` component.

## Shapes

- **Cards / module tiles:** 16px radius
- **Buttons / inputs:** 12px radius
- **Bottom sheets:** 24px top corners only
- **Avatar / icon buttons:** full circle
- **Icons:** outlined, ~24px default, active tab may use filled variant

## Navigation

### Bottom tabs (target — matches PLAN.md & Stitch screens)

1. **Home** — dashboard, quick log, today's summary
2. **Modules** — 2-column grid of all 12 modules
3. **Analytics** — charts and trends (labeled "Insights" in early builds — rename to Analytics)
4. **Export** — data export flow

**Profile & Settings** live behind the top-right avatar on Home (not a bottom tab). Water is a first-class module inside Modules and on the Home dashboard — not its own tab.

Active tab: secondary purple `#5E51AD` with optional tonal pill behind icon. Inactive: `#47464C`.

## Components

### ScreenLayout

Every screen: light background, scrollable content, consistent header block (title + subtitle). No native stack header — custom in-screen headers only.

### Card

White surface, 16px radius, Level 1 elevation, 16px padding. Optional 4px left border in module accent color for category cards.

### Button

- **Primary:** `primary-container` bg (`#1A1A2E`), white label, 12px radius, min height 48px
- **Secondary:** white bg, `#E8EAF0` border, `#1A1A2E` label
- **Ghost:** transparent, secondary purple label

### Stat cards (dashboard)

2×2 grid. Pastel left border matching module color. Large value + small unit/caption.

### Habit rows

Horizontal row, circular trailing checkbox. Checked state fills with module accent.

### Input fields

Outlined, 1px `#E8EAF0` border, 12px radius. Focus: border shifts to current module accent or secondary purple.

### Bottom sheets / modals

Top handle: 32×4px, `#E8EAF0`, centered. Content padding 20px. Used for log editors and goal editors.

### Water progress ring

Use Water module accent (`#00BCD4` / `#0097A7`). Fill turns success green when goal met.

### Sync status

Small inline banner on Home — muted text, secondary link for retry. Never blocking.

## Screens in Stitch project

Reference designs in **Lifestyle OS Mobile App UI** (Stitch project `14003811416836405899`):

- Home Dashboard, All Modules, Water Intake, Fitness, Nutrition, Sleep, Habits, Body, Goals, Health, Photos, Haircare, Skincare, Supplements, Analytics, Export, Settings & Profile, Login flows

When generating new Stitch screens, always apply this DESIGN.md and the module accent for the relevant category.
