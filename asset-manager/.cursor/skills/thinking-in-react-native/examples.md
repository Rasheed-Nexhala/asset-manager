# Thinking in React Native - Examples

Complete examples demonstrating the five-step process for building React Native components.

## Example 1: Searchable Product List

A complete implementation following all five steps.

### Step 1: Component Hierarchy

```
FilterableProductList
├── SearchBar
└── ProductList
    ├── ProductCategoryHeader
    └── ProductItem
```

### Step 2-5: Complete Implementation

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';

// Types
interface Product {
  category: string;
  price: string;
  stocked: boolean;
  name: string;
}

interface FilterableProductListProps {
  products: Product[];
}

interface SearchBarProps {
  filterText: string;
  inStockOnly: boolean;
  onFilterTextChange: (text: string) => void;
  onInStockOnlyChange: (value: boolean) => void;
}

interface ProductListProps {
  products: Product[];
  filterText: string;
  inStockOnly: boolean;
}

interface ProductCategoryHeaderProps {
  category: string;
}

interface ProductItemProps {
  product: Product;
}

// Components
const ProductCategoryHeader = ({ category }: ProductCategoryHeaderProps) => {
  return (
    <View className="bg-gray-100 px-4 py-3 border-b border-gray-200">
      <Text className="font-bold text-lg text-gray-800">{category}</Text>
    </View>
  );
};

const ProductItem = ({ product }: ProductItemProps) => {
  const nameStyle = product.stocked 
    ? "text-gray-900 font-medium" 
    : "text-red-500 font-medium";
  
  return (
    <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100">
      <Text className={nameStyle}>{product.name}</Text>
      <Text className="text-gray-600">{product.price}</Text>
    </View>
  );
};

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
        placeholder="Search products..."
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        autoCapitalize="none"
      />
      <Pressable
        onPress={() => onInStockOnlyChange(!inStockOnly)}
        className="flex-row items-center"
      >
        <View className={`w-5 h-5 border-2 rounded mr-2 items-center justify-center ${
          inStockOnly ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
        }`}>
          {inStockOnly && (
            <Text className="text-white text-xs">✓</Text>
          )}
        </View>
        <Text className="text-gray-700">Only show products in stock</Text>
      </Pressable>
    </View>
  );
};

const ProductList = ({ products, filterText, inStockOnly }: ProductListProps) => {
  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(filterText.toLowerCase());
    const matchesStock = !inStockOnly || product.stocked;
    return matchesSearch && matchesStock;
  });

  // Group by category
  const groupedData: { category: string; products: Product[] }[] = [];
  let currentCategory = '';
  
  filteredProducts.forEach((product) => {
    if (product.category !== currentCategory) {
      groupedData.push({
        category: product.category,
        products: [product],
      });
      currentCategory = product.category;
    } else {
      groupedData[groupedData.length - 1].products.push(product);
    }
  });

  const renderItem = ({ item }: { item: { category: string; products: Product[] } }) => (
    <View>
      <ProductCategoryHeader category={item.category} />
      {item.products.map((product) => (
        <ProductItem key={product.name} product={product} />
      ))}
    </View>
  );

  return (
    <FlatList
      data={groupedData}
      renderItem={renderItem}
      keyExtractor={(item) => item.category}
      className="flex-1"
      ListEmptyComponent={
        <View className="p-8 items-center">
          <Text className="text-gray-500 text-center">
            No products found matching your search.
          </Text>
        </View>
      }
    />
  );
};

// Main Component
const FilterableProductList = ({ products }: FilterableProductListProps) => {
  const [filterText, setFilterText] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);

  return (
    <View className="flex-1 bg-white">
      <SearchBar 
        filterText={filterText}
        inStockOnly={inStockOnly}
        onFilterTextChange={setFilterText}
        onInStockOnlyChange={setInStockOnly}
      />
      <ProductList 
        products={products}
        filterText={filterText}
        inStockOnly={inStockOnly}
      />
    </View>
  );
};

// Usage
const PRODUCTS: Product[] = [
  { category: "Fruits", price: "$1", stocked: true, name: "Apple" },
  { category: "Fruits", price: "$1", stocked: true, name: "Dragonfruit" },
  { category: "Fruits", price: "$2", stocked: false, name: "Passionfruit" },
  { category: "Vegetables", price: "$2", stocked: true, name: "Spinach" },
  { category: "Vegetables", price: "$4", stocked: false, name: "Pumpkin" },
  { category: "Vegetables", price: "$1", stocked: true, name: "Peas" },
];

export default function App() {
  return <FilterableProductList products={PRODUCTS} />;
}
```

## Example 2: Todo List with Categories

Demonstrates state management and filtering.

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: string;
}

interface TodoListProps {
  todos: Todo[];
  filterCategory: string | null;
}

const TodoItem = ({ todo, onToggle }: { todo: Todo; onToggle: (id: string) => void }) => {
  return (
    <Pressable
      onPress={() => onToggle(todo.id)}
      className="flex-row items-center p-4 border-b border-gray-200"
    >
      <View className={`w-5 h-5 border-2 rounded mr-3 ${
        todo.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'
      }`}>
        {todo.completed && <Text className="text-white text-xs text-center">✓</Text>}
      </View>
      <Text className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
        {todo.text}
      </Text>
      <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
        {todo.category}
      </Text>
    </Pressable>
  );
};

const CategoryFilter = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: { 
  categories: string[]; 
  selectedCategory: string | null; 
  onSelectCategory: (category: string | null) => void;
}) => {
  return (
    <View className="flex-row px-4 py-2 bg-gray-50 border-b border-gray-200">
      <Pressable
        onPress={() => onSelectCategory(null)}
        className={`px-4 py-2 rounded-lg mr-2 ${
          selectedCategory === null ? 'bg-blue-500' : 'bg-gray-200'
        }`}
      >
        <Text className={selectedCategory === null ? 'text-white font-semibold' : 'text-gray-700'}>
          All
        </Text>
      </Pressable>
      {categories.map((category) => (
        <Pressable
          key={category}
          onPress={() => onSelectCategory(category)}
          className={`px-4 py-2 rounded-lg mr-2 ${
            selectedCategory === category ? 'bg-blue-500' : 'bg-gray-200'
          }`}
        >
          <Text className={selectedCategory === category ? 'text-white font-semibold' : 'text-gray-700'}>
            {category}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const TodoList = ({ todos, filterCategory }: TodoListProps) => {
  const filteredTodos = filterCategory
    ? todos.filter((todo) => todo.category === filterCategory)
    : todos;

  const renderItem = ({ item }: { item: Todo }) => (
    <TodoItem todo={item} onToggle={() => {}} />
  );

  return (
    <FlatList
      data={filteredTodos}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      className="flex-1"
    />
  );
};

const TodoApp = ({ todos }: { todos: Todo[] }) => {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  const categories = Array.from(new Set(todos.map((todo) => todo.category)));

  return (
    <View className="flex-1 bg-white">
      <CategoryFilter
        categories={categories}
        selectedCategory={filterCategory}
        onSelectCategory={setFilterCategory}
      />
      <TodoList todos={todos} filterCategory={filterCategory} />
    </View>
  );
};
```

## Example 3: Form with Validation

Shows state management for form inputs and validation.

```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const FormInput = ({ 
  label, 
  value, 
  onChangeText, 
  error, 
  secureTextEntry 
}: { 
  label: string; 
  value: string; 
  onChangeText: (text: string) => void; 
  error?: string;
  secureTextEntry?: boolean;
}) => {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        className={`border rounded-lg px-4 py-3 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      {error && (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      )}
    </View>
  );
};

const RegistrationForm = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.includes('@')) {
      newErrors.email = 'Invalid email address';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      // Submit form
      console.log('Form submitted:', formData);
    }
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <FormInput
        label="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        error={errors.email}
      />
      <FormInput
        label="Password"
        value={formData.password}
        onChangeText={(text) => setFormData({ ...formData, password: text })}
        error={errors.password}
        secureTextEntry
      />
      <FormInput
        label="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
        error={errors.confirmPassword}
        secureTextEntry
      />
      <Pressable
        onPress={handleSubmit}
        className="bg-blue-500 rounded-lg py-3 mt-4 items-center"
      >
        <Text className="text-white font-semibold text-base">Register</Text>
      </Pressable>
    </View>
  );
};
```

## Key Takeaways

1. **Start static** - Build components that render without interactivity first
2. **Minimal state** - Only store what changes and can't be computed
3. **State placement** - Put state in the common parent of components that need it
4. **Inverse data flow** - Pass callbacks down to update parent state
5. **React Native components** - Use View, Text, FlatList, TextInput, Pressable
6. **NativeWind styling** - Use className prop for styling
7. **TypeScript** - Define interfaces for all props and data structures
