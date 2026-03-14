---
name: tailwind-css
description: Tailwind CSS fundamentals for React applications including installation with Vite, utility classes, responsive design, variants (hover/focus/dark), and custom styles. Use when styling React components, building responsive UIs, setting up Tailwind with React/Vite, or when the user mentions Tailwind, utility classes, or className styling.
---

# Tailwind CSS for React

Reference for [Tailwind CSS](https://tailwindcss.com/docs) in React applications. Tailwind scans your files for class names, generates corresponding styles, and writes them to a static CSS file—zero runtime.

## React + Vite Installation (Tailwind v4)

```bash
# Create React project
npm create vite@latest my-project -- --template react
cd my-project

# Install Tailwind and Vite plugin
npm install -D tailwindcss @tailwindcss/vite
```

**vite.config.ts:**
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**src/index.css (or main CSS entry):**
```css
@import "tailwindcss";
```

**React usage:** Use `className` (not `class`) on JSX elements:
```tsx
<h1 className="text-3xl font-bold underline">Hello world!</h1>
```

## Utility Classes

Combine single-purpose classes directly in markup. Each utility does one thing.

```tsx
<div className="mx-auto flex max-w-sm items-center gap-x-4 rounded-xl bg-white p-6 shadow-lg">
  <img className="size-12 shrink-0" src="/logo.svg" alt="" />
  <div>
    <div className="text-xl font-medium text-black">ChitChat</div>
    <p className="text-gray-500">You have a new message!</p>
  </div>
</div>
```

**Common utilities:** `flex`, `grid`, `p-4`, `m-2`, `gap-4`, `rounded-lg`, `shadow-md`, `text-lg`, `font-medium`, `text-gray-500`, `bg-white`, `border`, `w-full`, `h-12`.

## Variants: Responsive, Hover, Focus, Dark

Prefix any utility with a variant. Variants can be stacked.

### Responsive (mobile-first)

Unprefixed = all screens. Prefixed = at breakpoint and above.

| Prefix | Min width |
|--------|-----------|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1280px |
| `2xl:` | 1536px |

```tsx
{/* Mobile: 2 cols, sm and up: 3 cols */}
<div className="grid grid-cols-2 sm:grid-cols-3">...</div>

{/* Mobile: centered, sm+: left-aligned */}
<div className="text-center sm:text-left">...</div>

{/* Stack on mobile, side-by-side on md+ */}
<div className="flex flex-col md:flex-row md:items-center">...</div>
```

**Important:** `sm:` means "at 640px and up", not "on small screens". Use unprefixed utilities for mobile.

### Hover, Focus, Active

```tsx
<button className="bg-sky-500 hover:bg-sky-700 focus:outline-2 focus:outline-sky-500 active:bg-sky-800">
  Save
</button>
```

Stack variants: `disabled:hover:bg-sky-500` — hover only when not disabled.

### Dark Mode

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

Default: uses `prefers-color-scheme`. For manual toggle, add `dark` class to `<html>` and configure:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

## Arbitrary Values

Use `[value]` for one-off values outside the theme:

```tsx
<div className="top-[117px] lg:top-[344px]">...</div>
<div className="bg-[#bada55] text-[22px]">...</div>
<div className="grid grid-cols-[1fr_500px_2fr]">...</div>
```

**Whitespace:** Use underscore `_` instead of space; Tailwind converts it at build time.

## Conditional Classes in React

Use a helper or template literal for dynamic classes:

```tsx
// Template literal
<button className={`px-4 py-2 rounded ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>

// clsx or cn (from tailwind-merge)
import { clsx } from 'clsx';
<button className={clsx('px-4 py-2 rounded', isActive && 'bg-blue-600 text-white')}>
```

## Custom Theme

Use `@theme` in CSS to customize design tokens:

```css
@import "tailwindcss";

@theme {
  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 120rem;
  --color-avocado-500: oklch(0.84 0.18 117.33);
}
```

## Custom CSS

Add base styles with `@layer base`, component classes with `@layer components`:

```css
@layer base {
  h1 { font-size: var(--text-2xl); }
}

@layer components {
  .card {
    background-color: var(--color-white);
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
  }
}
```

## Container Queries

Style based on parent size, not viewport. Use `@container` and `@sm`, `@md`, etc.:

```tsx
<div className="@container">
  <div className="flex flex-col @md:flex-row">...</div>
</div>
```

## Quick Reference

| Need | Pattern |
|------|---------|
| Layout | `flex`, `grid`, `block`, `inline-flex` |
| Spacing | `p-4`, `m-2`, `gap-4`, `space-y-2` |
| Sizing | `w-full`, `h-12`, `min-h-screen`, `max-w-md` |
| Typography | `text-lg`, `font-semibold`, `text-gray-600` |
| Colors | `bg-blue-500`, `text-white`, `border-gray-200` |
| Responsive | `md:flex`, `lg:text-xl` |
| States | `hover:bg-blue-600`, `focus:ring-2`, `disabled:opacity-50` |
| Dark | `dark:bg-gray-800 dark:text-white` |

## Additional Resources

- Extended reference: [reference.md](reference.md)
- Docs: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- Framework guides: [tailwindcss.com/docs/installation/framework-guides](https://tailwindcss.com/docs/installation/framework-guides)
