# Code Examples - Complex Patterns

This document provides complete, copy-paste-ready examples of complex UI patterns in CIAMS.

---

## Example 1: Complete Admin Dashboard Screen

```tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

const AdminDashboard = () => {
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
        <Text className="text-[22px] font-semibold text-[#0F172A]">Dashboard</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity className="w-11 h-11 items-center justify-center">
            {/* Notification Bell Icon with Badge */}
            <View className="relative">
              <Text className="text-2xl">🔔</Text>
              <View className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#DC2626] items-center justify-center">
                <Text className="text-[10px] text-white font-bold">3</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* KPI Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-4 py-4"
          contentContainerClassName="gap-3"
        >
          <KPICard 
            value="₹12.5L" 
            label="Total Inventory Value" 
            icon="💰"
            trend="+5.2%"
            trendUp={true}
          />
          <KPICard 
            value="8" 
            label="Pending Approvals" 
            icon="⏳"
            highlighted={true}
          />
          <KPICard 
            value="24" 
            label="Active Sites" 
            icon="🏗️"
          />
        </ScrollView>

        {/* Quick Actions Grid */}
        <View className="px-4 pb-4">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <QuickActionCard title="Manage Users" icon="👥" flex={true} />
            <QuickActionCard title="View All POs" icon="📄" flex={true} />
            <QuickActionCard title="Activity Log" icon="📊" flex={true} />
            <QuickActionCard title="Reports" icon="📈" flex={true} />
          </View>
        </View>

        {/* Needs Attention */}
        <View className="px-4 pb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              Needs Your Attention
            </Text>
            <TouchableOpacity>
              <Text className="text-[15px] text-[#3B82F6]">View All</Text>
            </TouchableOpacity>
          </View>
          
          {/* Attention Cards */}
          <AttentionCard
            type="approval"
            title="PO #1042 awaiting approval"
            subtitle="₹45,000 • Submitted by Store Incharge"
            time="2h ago"
          />
          <AttentionCard
            type="critical"
            title="Critical: 3 items out of stock"
            subtitle="Portland Cement, Steel Bars, Wire Mesh"
            time="5h ago"
          />
        </View>

        {/* Recent Activity */}
        <View className="px-4 pb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              Recent Activity
            </Text>
            <TouchableOpacity>
              <Text className="text-[15px] text-[#3B82F6]">View All</Text>
            </TouchableOpacity>
          </View>
          
          <View className="bg-white rounded-[10px] border border-[#E2E8F0]">
            <ActivityItem
              type="approved"
              title="PO #1038 approved"
              subtitle="John Doe • Store Incharge"
              time="1h ago"
            />
            <ActivityItem
              type="transfer"
              title="50 bags cement transferred"
              subtitle="Central Store → Site: Sector 12"
              time="3h ago"
            />
            <ActivityItem
              type="user"
              title="New user added"
              subtitle="Rajesh K. • Site Manager"
              time="5h ago"
              isLast={true}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="dashboard" />
    </SafeAreaView>
  );
};

// Reusable Components

const KPICard = ({ value, label, icon, trend, trendUp, highlighted }) => (
  <View className={`
    bg-white rounded-xl p-4 shadow-sm min-w-[45%]
    ${highlighted ? 'border-2 border-[#D97706]' : ''}
  `}>
    <Text className="text-3xl mb-2">{icon}</Text>
    <Text className="text-[32px] font-bold text-[#0F172A] mb-1">{value}</Text>
    <Text className="text-[13px] text-[#64748B]">{label}</Text>
    
    {trend && (
      <View className="flex-row items-center gap-1 mt-2">
        <Text className={`text-[12px] ${trendUp ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </Text>
        <Text className="text-[12px] text-[#64748B]">vs last month</Text>
      </View>
    )}
  </View>
);

const QuickActionCard = ({ title, icon, flex }) => (
  <TouchableOpacity 
    className={`
      bg-white rounded-xl p-4 border border-[#E2E8F0] items-center justify-center
      ${flex ? 'flex-1 min-w-[45%]' : 'w-[48%]'}
      aspect-square
    `}
    activeOpacity={0.7}
  >
    <Text className="text-4xl mb-2">{icon}</Text>
    <Text className="text-[15px] font-semibold text-[#0F172A] text-center">
      {title}
    </Text>
  </TouchableOpacity>
);

const AttentionCard = ({ type, title, subtitle, time }) => {
  const colors = {
    approval: { bg: 'bg-[#D97706]/10', border: 'border-[#D97706]/30', icon: '⏳' },
    critical: { bg: 'bg-[#DC2626]/10', border: 'border-[#DC2626]/30', icon: '⚠️' },
  };
  
  const color = colors[type];
  
  return (
    <TouchableOpacity 
      className={`
        ${color.bg} border ${color.border} rounded-[10px] p-4 mb-3
        flex-row items-center gap-3
      `}
      activeOpacity={0.7}
    >
      <Text className="text-2xl">{color.icon}</Text>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
          {title}
        </Text>
        <Text className="text-[13px] text-[#64748B]">{subtitle}</Text>
      </View>
      <View>
        <Text className="text-[13px] text-[#64748B]">{time}</Text>
        <TouchableOpacity className="mt-2 bg-[#1E40AF] rounded-lg px-4 py-2">
          <Text className="text-[13px] font-semibold text-white">Review</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const ActivityItem = ({ type, title, subtitle, time, isLast }) => {
  const typeConfig = {
    approved: { bg: 'bg-[#16A34A]/15', icon: '✓', iconColor: 'text-[#16A34A]' },
    transfer: { bg: 'bg-[#3B82F6]/15', icon: '→', iconColor: 'text-[#3B82F6]' },
    user: { bg: 'bg-[#475569]/15', icon: '👤', iconColor: 'text-[#475569]' },
  };
  
  const config = typeConfig[type];
  
  return (
    <View className={`
      flex-row items-center gap-3 py-3 px-4
      ${!isLast ? 'border-b border-[#E2E8F0]' : ''}
    `}>
      <View className={`w-9 h-9 rounded-full ${config.bg} items-center justify-center`}>
        <Text className={`${config.iconColor}`}>{config.icon}</Text>
      </View>
      
      <View className="flex-1">
        <Text className="text-[15px] text-[#0F172A] mb-0.5">{title}</Text>
        <Text className="text-[13px] text-[#64748B]">{subtitle}</Text>
      </View>
      
      <Text className="text-[13px] text-[#64748B]">{time}</Text>
    </View>
  );
};

const BottomTabBar = ({ activeTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'orders', label: 'Orders', icon: '📄' },
    { id: 'activity', label: 'Activity', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  
  return (
    <View className="bg-white border-t border-[#E2E8F0] h-16">
      <View className="flex-row justify-around items-center h-full">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <TouchableOpacity 
              key={tab.id}
              className="items-center justify-center flex-1"
              activeOpacity={0.6}
            >
              {isActive && (
                <View className="absolute top-0 w-8 h-0.5 rounded-full bg-[#1E40AF]" />
              )}
              <Text className="text-xl mb-1">{tab.icon}</Text>
              <Text className={`text-[12px] ${isActive ? 'text-[#1E40AF]' : 'text-[#64748B]'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default AdminDashboard;
```

---

## Example 2: Inventory List with Pull-to-Refresh

```tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, SafeAreaView } from 'react-native';

const InventoryList = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [filterActive, setFilterActive] = useState('all');
  
  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch data
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };
  
  const inventoryItems = [
    {
      id: '1',
      name: 'Portland Cement OPC 53',
      category: 'Cement',
      quantity: 450,
      unit: 'bags',
      location: 'Sector 12',
      status: 'in-stock',
      stockLevel: 75,
      lastUpdated: '2h ago',
    },
    {
      id: '2',
      name: 'Steel TMT Bars 12mm',
      category: 'Steel',
      quantity: 85,
      unit: 'pieces',
      location: 'Central Store',
      status: 'low-stock',
      stockLevel: 28,
      lastUpdated: '5h ago',
    },
    {
      id: '3',
      name: 'Wire Mesh 8x8',
      category: 'Steel',
      quantity: 0,
      unit: 'rolls',
      location: 'Sector 12',
      status: 'out-of-stock',
      stockLevel: 0,
      lastUpdated: '1d ago',
    },
  ];
  
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center justify-between">
        <Text className="text-[22px] font-semibold text-[#0F172A]">Inventory</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity className="w-11 h-11 items-center justify-center">
            <Text className="text-2xl">🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity className="w-11 h-11 items-center justify-center">
            <Text className="text-2xl">🔽</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="px-4 py-3 border-b border-[#E2E8F0] bg-white"
        contentContainerClassName="gap-2"
      >
        <FilterChip label="All" active={filterActive === 'all'} onPress={() => setFilterActive('all')} />
        <FilterChip label="In Stock" active={filterActive === 'in-stock'} onPress={() => setFilterActive('in-stock')} />
        <FilterChip label="Low Stock" active={filterActive === 'low-stock'} onPress={() => setFilterActive('low-stock')} />
        <FilterChip label="Out of Stock" active={filterActive === 'out-of-stock'} onPress={() => setFilterActive('out-of-stock')} />
      </ScrollView>
      
      {/* List */}
      <FlatList
        data={inventoryItems}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => <InventoryCard item={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1E40AF"
            colors={['#1E40AF']}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />
      
      {/* FAB */}
      <TouchableOpacity 
        className="absolute bottom-20 right-4 w-14 h-14 rounded-full bg-[#1E40AF] items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <Text className="text-white text-3xl">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    className={`
      px-4 py-2 rounded-full
      ${active ? 'bg-[#1E40AF]' : 'border border-[#E2E8F0] bg-white'}
    `}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text className={`
      text-[13px] font-medium
      ${active ? 'text-white' : 'text-[#64748B]'}
    `}>
      {label}
    </Text>
  </TouchableOpacity>
);

const InventoryCard = ({ item }) => {
  const statusConfig = {
    'in-stock': { bg: 'bg-[#16A34A]/15', text: 'text-[#16A34A]', label: 'In Stock' },
    'low-stock': { bg: 'bg-[#D97706]/15', text: 'text-[#D97706]', label: 'Low Stock' },
    'out-of-stock': { bg: 'bg-[#DC2626]/15', text: 'text-[#DC2626]', label: 'Out of Stock' },
  };
  
  const status = statusConfig[item.status];
  
  return (
    <TouchableOpacity 
      className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]"
      activeOpacity={0.7}
    >
      {/* Top Row */}
      <View className="flex-row justify-between items-start gap-3 mb-3">
        <Text className="text-[15px] font-semibold text-[#0F172A] flex-1" numberOfLines={2}>
          {item.name}
        </Text>
        <View className={`px-2 py-1 rounded-full ${status.bg}`}>
          <Text className={`text-[12px] font-medium ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>
      
      {/* Stock Level Indicator */}
      <View className="mb-3">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-[13px] text-[#64748B]">Stock Level</Text>
          <Text className="text-[15px] font-semibold text-[#0F172A]">
            {item.quantity} {item.unit}
          </Text>
        </View>
        <View className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <View 
            className="h-full rounded-full"
            style={{ 
              width: `${item.stockLevel}%`,
              backgroundColor: item.stockLevel > 50 ? '#16A34A' : item.stockLevel > 20 ? '#D97706' : '#DC2626'
            }}
          />
        </View>
      </View>
      
      {/* Info Grid */}
      <View className="flex-row gap-4 mb-3">
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B] mb-1">Category</Text>
          <Text className="text-[15px] text-[#0F172A]">{item.category}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[13px] text-[#64748B] mb-1">Location</Text>
          <Text className="text-[15px] text-[#0F172A]">{item.location}</Text>
        </View>
      </View>
      
      {/* Footer */}
      <View className="border-t border-[#E2E8F0] pt-3 flex-row justify-between items-center">
        <Text className="text-[13px] text-[#64748B]">Updated {item.lastUpdated}</Text>
        <Text className="text-[#64748B]">→</Text>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = () => (
  <View className="flex-1 items-center justify-center px-4 py-16">
    <Text className="text-6xl mb-4 opacity-40">📦</Text>
    <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">
      No Items Yet
    </Text>
    <Text className="text-[15px] text-[#64748B] text-center mb-6">
      Add your first inventory item to start tracking stock
    </Text>
  </View>
);

export default InventoryList;
```

---

## Example 3: Multi-Step Form (Create Purchase Order)

```tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';

const CreatePurchaseOrder = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    supplier: '',
    category: '',
    items: [],
    deliveryDate: '',
    notes: '',
  });
  
  const steps = [
    { id: 0, label: 'Supplier' },
    { id: 1, label: 'Items' },
    { id: 2, label: 'Details' },
    { id: 3, label: 'Review' },
  ];
  
  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="bg-white border-b border-[#E2E8F0] h-14 px-4 flex-row items-center">
        <TouchableOpacity className="w-11 h-11 items-center justify-center -ml-2" onPress={goBack}>
          <Text className="text-2xl">✕</Text>
        </TouchableOpacity>
        <Text className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center">
          Create Purchase Order
        </Text>
        <View className="w-11" />
      </View>
      
      {/* Step Indicator */}
      <View className="bg-white px-4 py-4 border-b border-[#E2E8F0]">
        <View className="flex-row items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <View className="items-center">
                <View className={`
                  w-10 h-10 rounded-full items-center justify-center
                  ${index < currentStep ? 'bg-[#1E40AF]' : 
                    index === currentStep ? 'bg-[#1E40AF] border-4 border-[#1E40AF]/20' : 
                    'bg-white border-2 border-[#E2E8F0]'}
                `}>
                  <Text className={`
                    text-[15px] font-semibold
                    ${index <= currentStep ? 'text-white' : 'text-[#94A3B8]'}
                  `}>
                    {index < currentStep ? '✓' : index + 1}
                  </Text>
                </View>
                <Text className={`
                  text-[12px] mt-1
                  ${index === currentStep ? 'text-[#1E40AF] font-semibold' : 'text-[#64748B]'}
                `}>
                  {step.label}
                </Text>
              </View>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <View className={`
                  flex-1 h-0.5 mx-2 mt-[-20px]
                  ${index < currentStep ? 'bg-[#1E40AF]' : 'bg-[#E2E8F0]'}
                `} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
      
      {/* Form Content */}
      <ScrollView className="flex-1 px-4 py-4">
        {currentStep === 0 && <SupplierStep formData={formData} setFormData={setFormData} />}
        {currentStep === 1 && <ItemsStep formData={formData} setFormData={setFormData} />}
        {currentStep === 2 && <DetailsStep formData={formData} setFormData={setFormData} />}
        {currentStep === 3 && <ReviewStep formData={formData} />}
      </ScrollView>
      
      {/* Bottom Actions */}
      <View className="bg-white border-t border-[#E2E8F0] px-4 py-4">
        <View className="flex-row gap-3">
          {currentStep > 0 && (
            <TouchableOpacity 
              className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
              onPress={goBack}
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF]">Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
            onPress={currentStep === steps.length - 1 ? handleSubmit : goNext}
          >
            <Text className="text-[15px] font-semibold text-white">
              {currentStep === steps.length - 1 ? 'Submit PO' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const SupplierStep = ({ formData, setFormData }) => (
  <View className="gap-4">
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Supplier Name</Text>
      <TouchableOpacity className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between">
        <Text className="text-[15px] text-[#0F172A]">Select Supplier</Text>
        <Text className="text-[#64748B]">▼</Text>
      </TouchableOpacity>
    </View>
    
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Category</Text>
      <TouchableOpacity className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between">
        <Text className="text-[15px] text-[#0F172A]">Select Category</Text>
        <Text className="text-[#64748B]">▼</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const ItemsStep = ({ formData, setFormData }) => (
  <View className="gap-4">
    <Text className="text-[17px] font-semibold text-[#0F172A]">Add Items</Text>
    
    {/* Item List */}
    <View className="bg-white rounded-[10px] border border-[#E2E8F0] p-4 gap-3">
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-[#0F172A]">Portland Cement</Text>
          <Text className="text-[13px] text-[#64748B]">100 bags • ₹325/unit</Text>
        </View>
        <Text className="text-[15px] font-bold text-[#0F172A]">₹32,500</Text>
      </View>
    </View>
    
    <TouchableOpacity className="border-2 border-dashed border-[#E2E8F0] rounded-[10px] h-[50px] items-center justify-center">
      <Text className="text-[15px] font-semibold text-[#3B82F6]">+ Add Another Item</Text>
    </TouchableOpacity>
  </View>
);

const DetailsStep = ({ formData, setFormData }) => (
  <View className="gap-4">
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Delivery Date</Text>
      <TouchableOpacity className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-row items-center justify-between">
        <Text className="text-[15px] text-[#94A3B8]">Select date</Text>
        <Text className="text-2xl">📅</Text>
      </TouchableOpacity>
    </View>
    
    <View className="gap-1.5">
      <Text className="text-[15px] text-[#0F172A]">Notes (Optional)</Text>
      <TextInput
        className="border border-[#E2E8F0] rounded-lg p-4 bg-white min-h-[100px]"
        placeholder="Add any special instructions..."
        placeholderTextColor="#94A3B8"
        multiline
        textAlignVertical="top"
      />
    </View>
  </View>
);

const ReviewStep = ({ formData }) => (
  <View className="gap-4">
    <Text className="text-[17px] font-semibold text-[#0F172A]">Review Purchase Order</Text>
    
    <View className="bg-white rounded-[10px] border border-[#E2E8F0] p-4 gap-3">
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-[#64748B]">Supplier</Text>
        <Text className="text-[15px] text-[#0F172A]">ABC Cement Ltd.</Text>
      </View>
      <View className="border-t border-[#E2E8F0]" />
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-[#64748B]">Total Items</Text>
        <Text className="text-[15px] text-[#0F172A]">1 item</Text>
      </View>
      <View className="border-t border-[#E2E8F0]" />
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-[#64748B]">Total Amount</Text>
        <Text className="text-[22px] font-bold text-[#1E40AF]">₹32,500</Text>
      </View>
    </View>
  </View>
);

export default CreatePurchaseOrder;
```

---

These examples demonstrate complete, production-ready implementations of complex CIAMS UI patterns following the design system specifications.
