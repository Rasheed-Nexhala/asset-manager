# Color Palette & Typography Reference (Web)

Complete reference for all CIAMS Web colors and typography with Tailwind classes.

---

## Complete Color Palette

### Primary Colors

| Color Name | Tailwind Class | Usage |
|------------|----------------|-------|
| Primary Blue | `bg-blue-800` `text-blue-800` | Main action buttons, active tab indicators, primary links, selected states |
| Primary Blue Light | `bg-blue-500` `text-blue-500` | Secondary interactive elements, hover states, ghost button text |

### Semantic Status Colors

| Status | Usage | Badge Background | Badge Text |
|--------|-------|------------------|------------|
| Success Green | Approved, in stock, completed | `bg-green-600/15` | `text-green-600` |
| Warning Amber | Pending, low stock, attention needed | `bg-amber-600/15` | `text-amber-600` |
| Danger Red | Rejected, critical stock-outs, errors | `bg-red-600/15` | `text-red-600` |
| Info Slate | Draft states, secondary metadata | `bg-slate-600/15` | `text-slate-600` |

**Badge Implementation Pattern:**
```tsx
// Success Badge
<span className="px-2 py-1 rounded-full bg-green-600/15 text-[12px] font-medium text-green-600 inline-block">
  Approved
</span>
```

### Neutral Palette (Backgrounds & Text)

| Color Name | Tailwind Class | Usage |
|------------|----------------|-------|
| App Background | `bg-slate-50` | Overall app background behind all cards and content |
| Surface White | `bg-white` | Card backgrounds, modal backgrounds, input fields |
| Border Gray | `border-slate-200` | Card borders, dividers, input outlines |
| Text Primary | `text-slate-900` | Main headings, important data, primary content |
| Text Secondary | `text-slate-500` | Labels, descriptions, timestamps, metadata |
| Text Disabled | `text-slate-400` | Placeholder text, disabled states |
| Light Gray Fill | `bg-slate-100` | Search bar background (unfocused) |

### Role Accent Colors

| Role | Tailwind Class | Usage Context |
|------|----------------|---------------|
| Admin | `bg-indigo-700/15 text-indigo-700` | Admin role badges |
| Store Incharge | `bg-teal-600/15 text-teal-600` | Store Incharge role badges |
| Site Manager | `bg-amber-700/15 text-amber-700` | Site Manager role badges |

---

## Typography System

**Font Family:** Inter (via Google Fonts or direct import) - Add to standard Tailwind config `sans` family list.

### Complete Typography Scale

| Style Name | Size | Weight | Tailwind Class | Usage |
|------------|------|--------|----------------|-------|
| Display | 32px | Bold | `text-[32px] font-bold leading-tight` | Dashboard KPI numbers |
| Screen Title | 22px | SemiBold | `text-[22px] font-semibold leading-7` | Main screen heading |
| Section Header | 17px | SemiBold | `text-[17px] font-semibold` | Section dividers |
| Card Title | 15px | SemiBold | `text-[15px] font-semibold` | Primary text on cards/tables |
| Body | 15px | Regular | `text-[15px]` | General descriptions, labels |
| Caption/Meta | 13px | Regular | `text-[13px] text-slate-500` | Timestamps, secondary metadata |
| Badge Text | 12px | Medium | `text-[12px] font-medium` | Status tags, labels |

---

## Button States (Web Specifics)

```tsx
// Primary Button
<button className="bg-blue-800 hover:bg-blue-900 text-white transition-colors duration-200 ...">
  Submit
</button>

// Disabled Primary
<button disabled className="bg-blue-800 opacity-50 cursor-not-allowed text-white ...">
  Submit
</button>

// Secondary Button
<button className="border-[1.5px] border-blue-800 text-blue-800 hover:bg-blue-50 transition-colors duration-200 ...">
  Cancel
</button>
```

## Input Field States (Web Specifics)

```tsx
// Default to Focused
<input 
  className="border border-slate-200 bg-white focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800 transition-shadow ..." 
/>

// Error
<input 
  className="border border-red-600 focus:ring-red-600 bg-white ..." 
/>

// Disabled
<input 
  disabled
  className="border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed ..." 
/>
```
