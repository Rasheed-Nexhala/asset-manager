# Navigation Architecture Guide

## Overview

This document outlines the best practices for implementing navigation in the CIAMS (Construction Inventory & Asset Management System) React Native app.

## Current Setup

- **React Navigation** v7 (Stack Navigator)
- **NativeWind** v4 for styling
- **CIAMS Design System** for consistent UI
- **Role-based access** (Admin, StoreIncharge, SiteManager)

---

## Recommended Navigation Structure

### Architecture: Bottom Tabs + Stack Navigation

```
App Root
├─ AuthFlowScreen (Login/Signup)
└─ MainTabNavigator (after auth)
   ├─ Dashboard Tab (Stack)
   │  ├─ DashboardScreen
   │  └─ (future detail screens)
   ├─ Inventory Tab (Stack)
   │  ├─ InventoryListScreen
   │  ├─ InventoryDetailScreen
   │  └─ InventoryEditScreen
   ├─ Orders Tab (Stack)
   │  ├─ OrdersListScreen
   │  └─ OrderDetailScreen
   └─ More Tab (Stack)
      ├─ ProfileScreen
      ├─ UsersScreen (Admin only)
      └─ SettingsScreen
```

---

## Option A: Install Bottom Tabs (Recommended)

### 1. Install Dependencies

```bash
npx expo install @react-navigation/bottom-tabs
```

### 2. Create Bottom Tab Navigator

**File:** `src/navigation/BottomTabNavigator.tsx`

```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/DashboardScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { useAppSelector } from '../store/hooks';
import { selectIsAdmin } from '../store/selectors/authSelectors';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator: React.FC = () => {
  const isAdmin = useAppSelector(selectIsAdmin);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={InventoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
```

### 3. Create Stack Navigator Wrapper

**File:** `src/navigation/RootNavigator.tsx`

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/selectors/authSelectors';
import { AuthFlowScreen } from '../screens/Authentication/AuthFlowScreen';
import { BottomTabNavigator } from './BottomTabNavigator';

const Stack = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthFlowScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### 4. Update App.tsx

```tsx
import './global.css';
import './config/firebase';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStateSync } from './src/hooks/useAuthStateSync';

function AppContent() {
  useAuthStateSync();
  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}
```

---

## Option B: Keep Current Tab System (Simpler, Current Approach)

If you want to keep the current simple tab approach in `SignedInScreen`, you can **extract and enhance it** as a reusable component.

### Create Reusable Tab Bar Component

**File:** `src/components/TabBar.tsx`

```tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

export interface Tab {
  id: string;
  label: string;
  accessibilityLabel?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <View className={`flex-row border-b border-[#E2E8F0] bg-white px-4 ${className}`}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          className={`flex-1 py-4 items-center border-b-2 ${
            activeTab === tab.id ? 'border-[#1E40AF]' : 'border-transparent'
          }`}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
          accessibilityLabel={tab.accessibilityLabel || `${tab.label} tab`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab.id }}
        >
          <Text
            className={`text-[15px] font-semibold ${
              activeTab === tab.id ? 'text-[#1E40AF]' : 'text-[#64748B]'
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

### Usage in SignedInScreen

```tsx
import { TabBar } from '../components/TabBar';

const tabs: Tab[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' },
];

<TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
```

---

## Option C: Header Component (Reusable Top Bar)

Create a consistent header for all screens following CIAMS design system.

**File:** `src/components/Header.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  onBackPress?: () => void;
  onActionPress?: () => void;
  actionIcon?: string;
  actionLabel?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBackPress,
  onActionPress,
  actionIcon = 'add-outline',
  actionLabel = 'Action',
  showBack = false,
}) => {
  return (
    <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
      {/* Left: Back button or spacer */}
      {showBack && onBackPress ? (
        <TouchableOpacity
          className="w-11 h-11 items-center justify-center"
          onPress={onBackPress}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
      ) : (
        <View className="w-11" />
      )}

      {/* Center: Title */}
      <Text
        className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>

      {/* Right: Action button or spacer */}
      {onActionPress ? (
        <TouchableOpacity
          className="w-11 h-11 items-center justify-center"
          onPress={onActionPress}
          activeOpacity={0.7}
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
        >
          <Ionicons name={actionIcon as any} size={24} color="#1E40AF" />
        </TouchableOpacity>
      ) : (
        <View className="w-11" />
      )}
    </View>
  );
};
```

---

## CIAMS Design System Navigation Standards

### Bottom Tab Bar Specs
- **Height:** 60px (including safe area)
- **Active color:** `#1E40AF` (Primary Blue)
- **Inactive color:** `#64748B` (Secondary Gray)
- **Background:** `#FFFFFF` (White)
- **Border:** `#E2E8F0` (Light Gray)
- **Icon size:** 24px
- **Label:** 12px, font-semibold
- **Touch target:** Minimum 48px

### Top Header Bar Specs
- **Height:** 56px (h-14)
- **Background:** `#FFFFFF`
- **Border bottom:** `#E2E8F0`
- **Title:** 22px, font-semibold, `#0F172A`
- **Button icons:** 24px, `#0F172A` (back) or `#1E40AF` (action)
- **Padding:** 16px horizontal (px-4)

### Tab Bar (Within Screen) Specs
- **Height:** Auto (py-4 = 16px top/bottom)
- **Active indicator:** 2px border-bottom, `#1E40AF`
- **Active text:** `#1E40AF`, font-semibold
- **Inactive text:** `#64748B`, font-semibold
- **Background:** `#FFFFFF`

---

## Best Practices

1. **Start Simple** - Use Option B (current tab system) if you only have 2-3 main sections
2. **Scale Up** - Move to Option A (Bottom Tabs) when you add more sections (Dashboard, Inventory, Orders, etc.)
3. **Consistent Headers** - Use the Header component across all screens
4. **Role-Based Tabs** - Hide/show tabs based on user role (Admin sees "Users" tab, others don't)
5. **Deep Linking** - Configure navigation for push notifications and deep links later

---

## Next Steps

1. **Decide on navigation style** (simple tabs vs bottom tabs)
2. **Create navigation folder** (`src/navigation/`)
3. **Extract Header component** for reusability
4. **Add stack navigators** for drill-down screens (list → detail → edit)
5. **Test on iOS and Android** for platform-specific behavior

---

## Example Screens to Create

Based on CIAMS requirements:

```
Main App
├─ Dashboard (KPI cards, quick actions)
├─ Inventory
│  ├─ List
│  ├─ Detail
│  └─ Add/Edit
├─ Purchase Orders
│  ├─ List
│  ├─ Detail
│  └─ Create
├─ Transfers
└─ More
   ├─ Profile
   ├─ Users (Admin)
   └─ Settings
```
