# React Learn — Extended Reference

Extended examples and patterns from [react.dev/learn](https://react.dev/learn).

## Complete Product Table Example (Thinking in React)

```jsx
import { useState } from 'react';

function FilterableProductTable({ products }) {
  const [filterText, setFilterText] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  return (
    <div>
      <SearchBar
        filterText={filterText}
        inStockOnly={inStockOnly}
        onFilterTextChange={setFilterText}
        onInStockOnlyChange={setInStockOnly}
      />
      <ProductTable
        products={products}
        filterText={filterText}
        inStockOnly={inStockOnly}
      />
    </div>
  );
}

function SearchBar({ filterText, inStockOnly, onFilterTextChange, onInStockOnlyChange }) {
  return (
    <form>
      <input
        type="text"
        value={filterText}
        placeholder="Search..."
        onChange={(e) => onFilterTextChange(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => onInStockOnlyChange(e.target.checked)}
        />
        {' '}Only show products in stock
      </label>
    </form>
  );
}

function ProductTable({ products, filterText, inStockOnly }) {
  const rows = [];
  let lastCategory = null;

  products.forEach((product) => {
    if (product.name.toLowerCase().indexOf(filterText.toLowerCase()) === -1) return;
    if (inStockOnly && !product.stocked) return;
    if (product.category !== lastCategory) {
      rows.push(<ProductCategoryRow category={product.category} key={product.category} />);
    }
    rows.push(<ProductRow product={product} key={product.name} />);
    lastCategory = product.category;
  });

  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Price</th></tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}
```

## Props vs State

| Props | State |
|-------|-------|
| Passed from parent | Component's memory |
| Read-only in child | Can change via setter |
| Like function arguments | Like component memory |
| Parent owns and passes down | Component owns and updates |

## Common Hooks (react.dev/reference/react/hooks)

- **useState** — Local component state
- **useEffect** — Side effects (fetch, subscriptions)
- **useContext** — Read context value
- **useRef** — Mutable ref that persists across renders
- **useMemo** — Memoize expensive computation
- **useCallback** — Memoize callback function

## Rules of React

1. **Rules of Hooks** — Call Hooks only at top level, not in conditions/loops
2. **Components must be pure** — Same props → same output; no side effects during render
3. **React calls components** — Don't call components as functions; use `<Component />`

## Installation

- **Try online:** [CodeSandbox](https://codesandbox.io/s/new), [StackBlitz](https://stackblitz.com/fork/react)
- **New app:** Use a framework (Next.js, Remix, etc.) — Create React App is deprecated
- **Add to existing:** [Add React to existing project](https://react.dev/learn/add-react-to-an-existing-project)

## Links

- [Quick Start](https://react.dev/learn)
- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [API Reference](https://react.dev/reference/react)
- [Hooks Reference](https://react.dev/reference/react/hooks)
