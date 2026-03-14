---
name: ciams-web-design-system
description: Build CIAMS UI components using React and Tailwind CSS following the industrial-grade design system for the Web App. Use when creating web pages, components, forms, cards, dashboards, or any UI elements for the Construction Inventory & Asset Management System. Ensures consistent styling, proper spacing, semantic colors, and responsive layouts for both desktop and mobile web.
---

# CIAMS Web Design System

Industrial-grade UI/UX system for construction inventory management. Every component prioritizes: **Responsive layouts (Mobile first to Desktop)**, **48px minimum touch targets for mobile views**, **high contrast**, **scannable hierarchy**, and **minimal steps to complete actions**.

## Core Principles

**Industrial Clarity** — Designed for dusty job sites, bright sunlight, gloved hands (on mobile), and complex data management (on desktop).
**Trust Through Structure** — Managing expensive inventory requires confidence. UI feels structured, organized, authoritative — like a well-run warehouse.

### Iconography Strategy
**No Emojis** — Use the central `<Icon />` component for all iconography. The app uses Heroicons (SVG-based) stored centrally to ensure scale, color-matching, and consistency across platforms.
Example: `<Icon name="archive-box" className="w-5 h-5 text-slate-500" />`

---

## Quick Reference: Tailwind CSS Classes

### Color Palette

```html
<!-- Primary Actions & Emphasis -->
bg-blue-800     /* Primary Blue (#1E40AF) - main action buttons, active states */
bg-blue-500     /* Primary Blue Light (#3B82F6) - secondary interactive elements */
text-blue-800   /* Primary text/links */

<!-- Semantic Colors (use at bg-opacity-15 for badge backgrounds) -->
bg-green-600    /* Success Green (#16A34A) - approved, in stock, completed */
bg-amber-600    /* Warning Amber (#D97706) - pending, low stock */
bg-red-600      /* Danger Red (#DC2626) - rejected, out of stock, critical */
bg-slate-600    /* Info Slate (#475569) - neutral status */

<!-- Neutral Palette -->
bg-slate-50     /* App background (#F8FAFC) - faint cool gray */
bg-white        /* Cards, modals, inputs */
border-slate-200 /* Borders, dividers (#E2E8F0) */
text-slate-900  /* Primary text (#0F172A) - headings, important data */
text-slate-500  /* Secondary text (#64748B) - labels, timestamps */
text-slate-400  /* Disabled text (#94A3B8) - placeholders */

<!-- Role Accents (badges only) -->
bg-indigo-700   /* Admin (#4338CA) - Deep Indigo */
bg-teal-600     /* Store Incharge (#0D9488) - Teal */
bg-amber-700    /* Site Manager (#B45309) - Amber-Brown */
```

### Typography Scale

```html
<!-- Display - Dashboard KPIs (large numbers) -->
class="text-[32px] font-bold text-slate-900"

<!-- Screen Title - Main screen heading -->
class="text-[22px] font-semibold text-slate-900"

<!-- Section Header - Section dividers within screens -->
class="text-[17px] font-semibold text-slate-900"

<!-- Card Title - Primary text on cards -->
class="text-[15px] font-semibold text-slate-900"

<!-- Body - General text, form labels -->
class="text-[15px] text-slate-900"

<!-- Caption/Meta - Timestamps, codes, secondary info -->
class="text-[13px] text-slate-500"

<!-- Badge Text - Status tags, role labels -->
class="text-[12px] font-medium"
```

### Spacing System (4px base unit)

```html
px-4 md:px-6    /* Screen horizontal padding (16px mobile, 24px desktop) */
p-4 lg:p-6      /* Card internal padding */
gap-3           /* Between cards in list (12px) */
gap-6           /* Between sections (24px) */
gap-4           /* Between form fields (16px) */
gap-1.5         /* Label to input (6px) */
py-3.5 px-6     /* Button padding (14px vertical, 24px horizontal) */
```

### Common Component Classes

```html
<!-- Standard Card -->
class="bg-white rounded-[10px] p-4 lg:p-6 border border-slate-200 shadow-sm"

<!-- Status Badge -->
class="px-2 py-1 rounded-full bg-green-600/15 text-[12px] font-medium text-green-600"

<!-- Primary Button -->
class="bg-blue-800 hover:bg-blue-900 transition-colors rounded-[10px] h-[50px] inline-flex items-center justify-center text-[15px] font-semibold text-white px-6 w-full md:w-auto"

<!-- Secondary Button -->
class="border-[1.5px] border-blue-800 hover:bg-blue-50 transition-colors rounded-[10px] h-[50px] inline-flex items-center justify-center text-[15px] font-semibold text-blue-800 px-6 w-full md:w-auto"

<!-- Text Input -->
class="border border-slate-200 rounded-lg h-12 px-4 bg-white focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 w-full"
```

---

## Adaptation Rules for Web (React + Tailwind)

1. **Replace React Native tags with HTML tags:**
   - `<View>` ➜ `<div>`, `<section>`, `<article>`, `<header>`, or `<footer>`
   - `<Text>` ➜ `<span>`, `<p>`, `<h1>` to `<h6>`
   - `<TouchableOpacity>` ➜ `<button>` or `<a>`
   - `<ScrollView>` ➜ `<div className="overflow-y-auto">`
   - `<TextInput>` ➜ `<input type="text">` or `<textarea>`

2. **Interactions & Hover States:**
   - Instead of `activeOpacity`, use Tailwind hover/active classes: `hover:opacity-90`, `active:scale-95`, `hover:bg-slate-50`.
   - Add `transition-all duration-200` for smooth interactions.

3. **Responsiveness:**
   - Use `md:` and `lg:` prefixes to adapt the UI for desktop screens.
   - Lists of cards on mobile should often become tables on desktop.
   - Mobile bottom tab navigation should become a side navigation bar (`w-64 border-r`) on desktop.
