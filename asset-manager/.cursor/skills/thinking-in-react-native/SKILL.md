---
name: thinking-in-react-native
description: Guide for building React Native components using the "Thinking in React" methodology. Adapts React component design principles for mobile development with NativeWind styling, TypeScript, and React Native-specific patterns. Use when designing new features, breaking down UI into components, planning component hierarchy, or structuring React Native applications.
---

# Thinking in React Native

Adapts the "Thinking in React" methodology for React Native mobile development. Follow these five steps to build well-structured, maintainable React Native components.

## Step 1: Break the UI into a Component Hierarchy

Start by identifying components and subcomponents in your design. Consider:

* **Separation of concerns** - Each component should handle one responsibility
* **Reusability** - Components that appear multiple times should be extracted
* **Mobile patterns** - Consider screen layouts, navigation, and touch interactions

### Component Identification Strategy

1. **Draw boxes** around every component and subcomponent
2. **Name components** using PascalCase (following React Native standards)
3. **Identify data flow** - Which components need which data?

### Example: Product List Screen

```
FilterableProductList (screen container)
├── SearchBar (search input + filter checkbox)
└── ProductList (scrollable list)
    ├── ProductCategoryHeader (category title)
    └── ProductItem (individual product row)
```

## Step 2: Build a Static Version in React Native

Build components that render UI without interactivity first. Use props to pass data down.

### React Native Component Mapping

| Web HTML | React Native | Notes |
|----------|--------------|-------|
| `<div>` | `<View>` | Container component |
| `<span>`, `<p>` | `<Text>` | Text content |
| `<input>` | `<TextInput>` | Text input |
| `<button>` | `<Pressable>` or `<TouchableOpacity>` | Button/clickable |
| `<ul>`, `<ol>` | `<FlatList>` or `<ScrollView>` | Lists |
| `<table>` | `<FlatList>` with custom renderItem | Tables (rare in mobile) |
| `<img>` | `<Image>` | Images |

### Static Component Example

```tsx
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';

interface Product {
  category: string;
  price: string;
  stocked: boolean;
  name: string;
}

interface ProductCategoryHeaderProps {
  category: string;
}

const ProductCategoryHeader = ({ category }: ProductCategoryHeaderProps) => {
  return (
    <View className="bg-gray-100 px-4 py-2">
      <Text className="font-bold text-lg">{category}</Text>
    </View>
  );
};

interface ProductItemProps {
  product: Product;
}

const ProductItem = ({ product }: ProductItemProps) => {
  const nameStyle = product.stocked 
    ? "text-black" 
    : "text-red-500";
  
  return (
    <View className="flex-row justify-between px-4 py-3 border-b border-gray-200">
      <Text className={nameStyle}>{product.name}</Text>
      <Text className="text-gray-600">{product.price}</Text>
    </View>
  );
};

interface ProductListProps {
  products: Product[];
}

const ProductList = ({ products }: ProductListProps) => {
  const renderItem = ({ item }: { item: Product }) => {
    // Group by category logic here
    return <ProductItem product={item} />;
  };

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item) => item.name}
      className="flex-1"
    />
  );
};

interface SearchBarProps {
  // Props will be added in Step 4
}

const SearchBar = ({}: SearchBarProps) => {
  return (
    <View className="p-4 bg-white border-b border-gray-200">
      <TextInput
        placeholder="Search..."
        className="border border-gray-300 rounded-lg px-4 py-2 mb-3"
      />
      <View className="flex-row items-center">
        <Pressable className="mr-2">
          {/* Checkbox implementation */}
        </Pressable>
        <Text>Only show products in stock</Text>
      </View>
    </View>
  );
};

interface FilterableProductListProps {
  products: Product[];
}

const FilterableProductList = ({ products }: FilterableProductListProps) => {
  return (
    <View className="flex-1 bg-white">
      <SearchBar />
      <ProductList products={products} />
    </View>
  );
};
```

### Key Principles for Static Version

1. **No state** - Use props only
2. **One-way data flow** - Data flows down from parent to child
3. **TypeScript interfaces** - Define prop types for all components
4. **NativeWind styling** - Use `className` prop for styling
5. **Mobile-first** - Use FlatList/ScrollView for scrollable content

## Step 3: Find the Minimal State Representation

Identify what data changes over time. State should be minimal and DRY (Don't Repeat Yourself).

### State Identification Questions

For each piece of data, ask:

1. **Does it remain unchanged?** → Not state (use props or constants)
2. **Is it passed from parent?** → Not state (use props)
3. **Can it be computed from existing state/props?** → Not state (compute it)

### Example State Analysis

For a searchable product list:

1. ✅ **Original product list** - Passed as props → Not state
2. ✅ **Search text** - Changes over time, can't be computed → **State**
3. ✅ **Checkbox value** - Changes over time, can't be computed → **State**
4. ❌ **Filtered products** - Can be computed from products + search + checkbox → **Not state**

**Result**: Only `filterText` and `inStockOnly` are state.

## Step 4: Identify Where State Should Live

Determine which component owns each piece of state.

### State Placement Strategy

For each piece of state:

1. **Identify components** that render based on that state
2. **Find common parent** - The closest component that contains all those components
3. **Place state** in that common parent (or higher if needed)

### Example: State Placement

```
FilterableProductList (owns state)
├── SearchBar (displays state, needs to update it)
└── ProductList (uses state to filter)
```

Both `SearchBar` and `ProductList` need the filter state, so it lives in `FilterableProductList`.

### Adding State with useState

```tsx
import { useState } from 'react';

const FilterableProductList = ({ products }: FilterableProductListProps) => {
  const [filterText, setFilterText] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  return (
    <View className="flex-1 bg-white">
      <SearchBar 
        filterText={filterText}
        inStockOnly={inStockOnly}
      />
      <ProductList 
        products={products}
        filterText={filterText}
        inStockOnly={inStockOnly}
      />
    </View>
  );
};
```

## Step 5: Add Inverse Data Flow

Child components need to update parent state. Pass callback functions down as props.

### Callback Pattern

```tsx
// Parent passes state setters as callbacks
<SearchBar 
  filterText={filterText}
  inStockOnly={inStockOnly}
  onFilterTextChange={setFilterText}
  onInStockOnlyChange={setInStockOnly}
/>

// Child calls callbacks to update parent state
interface SearchBarProps {
  filterText: string;
  inStockOnly: boolean;
  onFilterTextChange: (text: string) => void;
  onInStockOnlyChange: (value: boolean) => void;
}

const SearchBar = ({ 
  filterText, 
  inStockOnly, 
  onFilterTextChange, 
  onInStockOnlyChange 
}: SearchBarProps) => {
  return (
    <View className="p-4 bg-white border-b border-gray-200">
      <TextInput
        value={filterText}
        onChangeText={onFilterTextChange}
        placeholder="Search..."
        className="border border-gray-300 rounded-lg px-4 py-2 mb-3"
      />
      <View className="flex-row items-center">
        <Pressable
          onPress={() => onInStockOnlyChange(!inStockOnly)}
          className="mr-2"
        >
          {/* Checkbox UI */}
        </Pressable>
        <Text>Only show products in stock</Text>
      </View>
    </View>
  );
};
```

### Complete Example with Filtering

```tsx
const ProductList = ({ products, filterText, inStockOnly }: ProductListProps) => {
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(filterText.toLowerCase());
    const matchesStock = !inStockOnly || product.stocked;
    return matchesSearch && matchesStock;
  });

  // Group by category
  const groupedProducts: { [key: string]: Product[] } = {};
  filteredProducts.forEach((product) => {
    if (!groupedProducts[product.category]) {
      groupedProducts[product.category] = [];
    }
    groupedProducts[product.category].push(product);
  });

  const renderItem = ({ item }: { item: { category: string; products: Product[] } }) => (
    <View>
      <ProductCategoryHeader category={item.category} />
      {item.products.map((product) => (
        <ProductItem key={product.name} product={product} />
      ))}
    </View>
  );

  const data = Object.entries(groupedProducts).map(([category, products]) => ({
    category,
    products,
  }));

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.category}
      className="flex-1"
    />
  );
};
```

## React Native-Specific Considerations

### Lists and Performance

- **Use `FlatList`** for long lists (better performance than ScrollView)
- **Provide `keyExtractor`** for unique keys
- **Use `getItemLayout`** if item heights are fixed (performance optimization)

### Touch Interactions

- **`Pressable`** - Modern, flexible touchable component
- **`TouchableOpacity`** - Simple button with opacity feedback
- **`TouchableHighlight`** - Button with highlight feedback

### Styling with NativeWind

- Use `className` prop instead of `style`
- Build dynamic classes conditionally: `className={isActive ? "bg-blue-500" : "bg-gray-300"}`
- Follow mobile-first responsive patterns

### TypeScript Best Practices

- Define interfaces for all props
- Use proper types (avoid `any`)
- Export interfaces for reuse

## Quick Reference Checklist

When building a new feature:

- [ ] Identified all components and their hierarchy
- [ ] Built static version with props only (no state)
- [ ] Identified minimal state representation
- [ ] Placed state in correct parent component
- [ ] Added callbacks for inverse data flow
- [ ] Used appropriate React Native components (View, Text, FlatList, etc.)
- [ ] Applied NativeWind styling with `className`
- [ ] Defined TypeScript interfaces for all props
- [ ] Used functional components with arrow functions
- [ ] Followed project folder structure

## Common Patterns

### Controlled Input

```tsx
const [value, setValue] = useState('');

<TextInput
  value={value}
  onChangeText={setValue}
  placeholder="Enter text..."
/>
```

### Toggle/Checkbox

```tsx
const [isChecked, setIsChecked] = useState(false);

<Pressable onPress={() => setIsChecked(!isChecked)}>
  <View className={`w-5 h-5 border-2 rounded ${isChecked ? 'bg-blue-500' : 'bg-white'}`}>
    {isChecked && <Text>✓</Text>}
  </View>
</Pressable>
```

### Filtering Lists

```tsx
const filteredItems = items.filter((item) => {
  return item.name.toLowerCase().includes(searchText.toLowerCase());
});
```
