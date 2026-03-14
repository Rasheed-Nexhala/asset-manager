# Tailwind CSS — Extended Reference

Extended patterns and variants for React applications.

## React-Specific Patterns

### className with clsx / cn

```tsx
import { clsx } from 'clsx';

// Simple conditional
<button className={clsx('btn', isPrimary && 'btn-primary')} />

// Multiple conditions
<div className={clsx(
  'p-4 rounded-lg',
  variant === 'outline' && 'border border-gray-300',
  disabled && 'opacity-50 cursor-not-allowed'
)} />
```

With `tailwind-merge` to resolve conflicts:
```tsx
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

<button className={cn('px-4 py-2', className)} />
```

### Dynamic Class Names

Tailwind scans source files at build time. Use complete class names—avoid dynamic concatenation that obscures the full string:

```tsx
// ✅ Good - full class names visible
<div className={isLarge ? 'text-2xl' : 'text-base'} />

// ⚠️ Risky - Tailwind may not detect `text-${size}`
<div className={`text-${size}`} />
```

Use safelist in config if you must generate classes dynamically.

## State Variants (Pseudo-classes)

| Variant | Use case |
|---------|----------|
| `hover:` | Mouse hover |
| `focus:` | Keyboard/focus |
| `active:` | Mouse down |
| `disabled:` | Disabled form elements |
| `invalid:` | Invalid form input |
| `required:` | Required field |
| `checked:` | Checkbox/radio checked |
| `first:`, `last:` | First/last child |
| `odd:`, `even:` | Table/list striping |
| `group-hover:` | Parent hover (parent has `group`) |
| `peer-*:` | Sibling state (sibling has `peer`) |

## Group and Peer

**Group:** Style children when parent is hovered/focused:
```tsx
<a href="#" className="group block">
  <span className="text-gray-500 group-hover:text-white">Hover card</span>
</a>
```

**Peer:** Style based on sibling state:
```tsx
<label className="peer block">...</label>
<input className="peer-checked:bg-blue-500" />
```

**Named groups** for nesting:
```tsx
<div className="group/card">...</div>
<span className="group-hover/card:text-white">...</span>
```

## Form Styling

```tsx
<input
  className="
    border border-gray-300 rounded-lg px-3 py-2
    focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20
    invalid:border-pink-500 invalid:text-pink-600
    disabled:bg-gray-50 disabled:text-gray-500
  "
/>
```

## Breakpoint Ranges

Target a single breakpoint or range:
```tsx
<div className="md:max-lg:flex">  {/* Only between md and lg */}
<div className="max-md:hidden">   {/* Below md only */}
```

## Custom Variants

```css
@custom-variant dark (&:where(.dark, .dark *));
@custom-variant theme-midnight (&:where([data-theme="midnight"] *));
```

## Arbitrary Properties

For CSS properties without a utility:
```tsx
<div className="[mask-type:luminance]">...</div>
<div className="[--scroll-offset:56px]">...</div>
```

## PostCSS / Other Setups

For non-Vite React (CRA, custom Webpack):
- Use [PostCSS plugin](https://tailwindcss.com/docs/installation/using-postcss) or [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli)
- v4: `npm install tailwindcss @tailwindcss/postcss`

## Links

- [Tailwind Docs](https://tailwindcss.com/docs)
- [Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Hover, Focus, States](https://tailwindcss.com/docs/hover-focus-and-other-states)
- [Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Adding Custom Styles](https://tailwindcss.com/docs/adding-custom-styles)
