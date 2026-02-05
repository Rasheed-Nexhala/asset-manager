---
name: nativewind
description: Style React Native components using NativeWind (Tailwind CSS for React Native). Use when creating or styling components, building UI layouts, or when the user mentions styling, className, Tailwind, or NativeWind. Provides patterns for common components, responsive design, conditional styling, and React Native-specific utilities.
---

# NativeWind Component Development

## Quick Start

NativeWind v4 uses the `className` prop to apply Tailwind CSS classes to React Native components.

```tsx
import { View, Text } from 'react-native';

export const WelcomeCard = () => {
  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="text-2xl font-bold text-blue-600">
        Welcome!
      </Text>
    </View>
  );
};
```

## Core Principles

1. **Use `className` instead of `style`** - NativeWind transforms className to style props
2. **Import global.css** - Ensure `global.css` is imported in your entry file (App.tsx)
3. **Dynamic classes** - Build className strings conditionally for dynamic styling
4. **React Native components** - Works with View, Text, ScrollView, Image, etc.

## Common Component Patterns

### Buttons

```tsx
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export const Button = ({ title, onPress, variant = 'primary', disabled }: ButtonProps) => {
  const baseClasses = "px-6 py-3 rounded-lg items-center justify-center";
  const variantClasses = {
    primary: "bg-blue-600 active:bg-blue-700",
    secondary: "bg-gray-200 active:bg-gray-300",
    danger: "bg-red-600 active:bg-red-700",
  };
  const disabledClasses = disabled ? "opacity-50" : "";

  return (
    <Pressable
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses}`}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-white font-semibold text-base">
        {title}
      </Text>
    </Pressable>
  );
};
```

### Cards

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = "" }: CardProps) => {
  return (
    <View className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>
      {children}
    </View>
  );
};

// Usage
<Card className="m-4">
  <Text className="text-lg font-bold mb-2">Card Title</Text>
  <Text className="text-gray-600">Card content goes here</Text>
</Card>
```

### Form Inputs

```tsx
interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
}

export const Input = ({ value, onChangeText, placeholder, error, secureTextEntry }: InputProps) => {
  return (
    <View className="mb-4">
      <TextInput
        className={`border rounded-lg px-4 py-3 text-base ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#9CA3AF"
      />
      {error && (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      )}
    </View>
  );
};
```

### Lists

```tsx
interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

export const ListItem = ({ title, subtitle, onPress }: ListItemProps) => {
  return (
    <Pressable
      className="flex-row items-center justify-between p-4 border-b border-gray-200"
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>
        )}
      </View>
      <Text className="text-gray-400">›</Text>
    </Pressable>
  );
};
```

## Layout Patterns

### Flexbox Layouts

```tsx
// Centered container
<View className="flex-1 items-center justify-center">
  {/* Content */}
</View>

// Row layout
<View className="flex-row items-center justify-between">
  <Text>Left</Text>
  <Text>Right</Text>
</View>

// Column layout with spacing
<View className="flex-col space-y-4">
  <View className="h-20 bg-blue-500" />
  <View className="h-20 bg-green-500" />
</View>
```

### Safe Area Handling

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

export const Screen = ({ children }) => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {children}
    </SafeAreaView>
  );
};
```

### Scrollable Content

```tsx
<ScrollView 
  className="flex-1 bg-gray-50"
  contentContainerClassName="p-4"
>
  {/* Content */}
</ScrollView>
```

## Conditional Styling

### Method 1: Template Literals

```tsx
const Button = ({ isActive, disabled }) => {
  return (
    <Pressable
      className={`
        px-4 py-2 rounded-lg
        ${isActive ? 'bg-blue-600' : 'bg-gray-300'}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      <Text>Button</Text>
    </Pressable>
  );
};
```

### Method 2: Array Join

```tsx
const Button = ({ variant, size, disabled }) => {
  const classes = [
    'px-4 py-2 rounded-lg',
    variant === 'primary' ? 'bg-blue-600' : 'bg-gray-300',
    size === 'large' ? 'px-6 py-3' : '',
    disabled && 'opacity-50',
  ].filter(Boolean).join(' ');

  return (
    <Pressable className={classes}>
      <Text>Button</Text>
    </Pressable>
  );
};
```

### Method 3: clsx (if installed)

```tsx
import clsx from 'clsx';

const Button = ({ isActive, disabled }) => {
  return (
    <Pressable
      className={clsx(
        'px-4 py-2 rounded-lg',
        isActive && 'bg-blue-600',
        !isActive && 'bg-gray-300',
        disabled && 'opacity-50'
      )}
    >
      <Text>Button</Text>
    </Pressable>
  );
};
```

## Common Utilities

### Spacing
- `p-4` - padding all sides
- `px-4` - horizontal padding
- `py-4` - vertical padding
- `m-4` - margin all sides
- `mx-4` - horizontal margin
- `my-4` - vertical margin
- `space-y-4` - vertical spacing between children
- `space-x-4` - horizontal spacing between children

### Colors
- `bg-white`, `bg-gray-100`, `bg-blue-600`
- `text-gray-900`, `text-blue-600`, `text-red-500`
- `border-gray-300`, `border-blue-600`

### Typography
- `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`
- `font-normal`, `font-medium`, `font-semibold`, `font-bold`
- `text-center`, `text-left`, `text-right`

### Flexbox
- `flex-1` - flex: 1
- `flex-row` - flexDirection: 'row'
- `flex-col` - flexDirection: 'column'
- `items-center` - alignItems: 'center'
- `justify-center` - justifyContent: 'center'
- `justify-between` - justifyContent: 'space-between'

### Borders & Radius
- `rounded` - borderRadius: 4
- `rounded-lg` - borderRadius: 8
- `rounded-xl` - borderRadius: 12
- `rounded-full` - borderRadius: 9999
- `border` - borderWidth: 1
- `border-2` - borderWidth: 2

## React Native Specific

### Platform-Specific Styles

```tsx
import { Platform } from 'react-native';

const Button = () => {
  return (
    <Pressable
      className={`
        px-4 py-2 rounded-lg
        ${Platform.OS === 'ios' ? 'bg-blue-500' : 'bg-blue-600'}
      `}
    >
      <Text>Button</Text>
    </Pressable>
  );
};
```

### Working with Third-Party Components

Use `cssInterop` for components that don't support className:

```tsx
import { cssInterop } from 'nativewind';
import { Svg, Circle } from 'react-native-svg';

const StyledSvg = cssInterop(Svg, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: true,
      width: true,
    },
  },
});

const StyledCircle = cssInterop(Circle, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      fill: true,
      stroke: true,
    },
  },
});
```

### FlatList Styling

```tsx
import { remapProps } from 'nativewind';
import { FlatList } from 'react-native';

remapProps(FlatList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
  ListHeaderComponentClassName: 'ListHeaderComponentStyle',
  ListFooterComponentClassName: 'ListFooterComponentStyle',
});

// Usage
<FlatList
  data={items}
  className="flex-1 bg-gray-50"
  contentContainerClassName="p-4"
  renderItem={({ item }) => <ListItem item={item} />}
/>
```

## Best Practices

1. **Keep className strings readable** - Use template literals or array.join for complex conditions
2. **Extract common patterns** - Create reusable styled components
3. **Use semantic class names** - Group related utilities together
4. **Avoid inline style mixing** - Prefer className over style prop when possible
5. **Test on both platforms** - Some utilities may render differently on iOS vs Android

## Common Mistakes to Avoid

❌ **Mixing style and className**
```tsx
// Bad
<View className="p-4" style={{ backgroundColor: 'red' }} />
```

✅ **Use className only**
```tsx
// Good
<View className="p-4 bg-red-500" />
```

❌ **Forgetting to import global.css**
```tsx
// Bad - NativeWind won't work
export default function App() { ... }
```

✅ **Import global.css in entry file**
```tsx
// Good
import './global.css';
export default function App() { ... }
```

## Additional Resources

- For detailed component examples, see [examples.md](examples.md)
- For Tailwind utility reference, see [reference.md](reference.md)
