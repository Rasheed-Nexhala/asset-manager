import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormField } from '../../components/FormField';
import {
  VendorSelector,
  POItemCard,
  POItemSelectorModal,
} from '../../components/PurchaseOrder';
import { createPO } from '../../store/thunks/purchaseOrderThunks';
import {
  subscribeToVendors,
  createVendor,
} from '../../services/firebase/vendorService';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setVendors } from '../../store/slices/purchaseOrderSlice';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import { selectVendors } from '../../store/selectors/purchaseOrderSelectors';
import type { CreatePurchaseOrderData, PurchaseOrderItem } from '../../types/purchaseOrder';
import type { Item } from '../../types/inventory';
import type { Vendor } from '../../types/vendor';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type RouteParams = RouteProp<PurchaseOrderStackParamList, 'CreatePO'>;
type NavigationProp = StackNavigationProp<PurchaseOrderStackParamList, 'CreatePO'>;

const GST_PERCENTAGE = 18;

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const CreatePOScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const poId = route.params?.poId;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const vendors = useAppSelector(selectVendors);

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [justification, setJustification] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [itemSelectorVisible, setItemSelectorVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = subscribeToVendors((v) => dispatch(setVendors(v)));
    return unsub;
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  useEffect(() => {
    if (selectedVendorId) {
      const v = vendors.find((x) => x.id === selectedVendorId);
      if (v) {
        setVendorName(v.name);
        setVendorContact(v.phone);
        setVendorEmail(v.email ?? '');
        setVendorAddress(v.address ?? '');
      }
    }
  }, [selectedVendorId, vendors]);

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const gstAmount = Math.round((subtotal * GST_PERCENTAGE) / 100);
  const totalAmount = subtotal + gstAmount;

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    const vName = vendorName.trim();
    const vContact = vendorContact.trim();
    if (!vName) e.vendorName = 'Vendor name is required';
    if (!vContact) e.vendorContact = 'Contact number is required';
    if (items.length === 0) e.items = 'At least one item is required';
    if (!justification.trim()) e.justification = 'Justification is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [vendorName, vendorContact, items.length, justification]);

  const handleItemsSelected = useCallback((selected: Item[]) => {
    const newItems: PurchaseOrderItem[] = selected.map((item) => ({
      itemId: item.id,
      itemName: item.name,
      itemSku: item.sku,
      isExistingItem: true,
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      receivedQuantity: null,
    }));
    setItems((prev) => {
      const byId = new Map(prev.map((p) => [p.itemId, p]));
      newItems.forEach((n) => {
        if (!byId.has(n.itemId)) byId.set(n.itemId, n);
      });
      return Array.from(byId.values());
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.items;
      return next;
    });
  }, []);

  const handleQuantityChange = useCallback((itemId: string, delta: number) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.itemId !== itemId) return p;
        const q = Math.max(0, p.quantity + delta);
        return { ...p, quantity: q, amount: q * p.unitPrice };
      })
    );
  }, []);

  const handleUnitPriceChange = useCallback((itemId: string, price: number) => {
    setItems((prev) =>
      prev.map((p) =>
        p.itemId === itemId
          ? { ...p, unitPrice: price, amount: p.quantity * price }
          : p
      )
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((p) => p.itemId !== itemId));
  }, []);

  const handleSubmit = useCallback(
    async (asDraft: boolean) => {
      if (!asDraft && !validate()) return;
      if (!userId || !userName) {
        Alert.alert('Error', 'User information is missing');
        return;
      }

      let vendorId = selectedVendorId ?? '';
      const vName = vendorName.trim();
      const vContact = vendorContact.trim();
      if (!vName || !vContact) {
        Alert.alert('Error', 'Vendor name and contact are required');
        return;
      }

      if (items.length === 0) {
        Alert.alert('Error', 'At least one item is required');
        return;
      }

      const invalidPrice = items.find((i) => i.unitPrice <= 0);
      if (invalidPrice) {
        Alert.alert('Error', `Please enter unit price for ${invalidPrice.itemName}`);
        return;
      }

      setIsSubmitting(true);
      setIsDraft(asDraft);

      try {
        if (!vendorId) {
          vendorId = await createVendor({
            name: vName,
            contactPerson: vName,
            phone: vContact,
            email: vendorEmail.trim() || undefined,
            address: vendorAddress.trim() || undefined,
            category: 'other',
          });
        }

        const data: CreatePurchaseOrderData = {
          vendorId,
          vendorName: vName,
          vendorContact: vContact,
          vendorEmail: vendorEmail.trim() || undefined,
          vendorAddress: vendorAddress.trim() || undefined,
          items: items.map((i) => ({
            itemId: i.itemId,
            itemName: i.itemName,
            itemSku: i.itemSku,
            isExistingItem: i.isExistingItem,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          justification: justification.trim(),
          expectedDeliveryDate: expectedDeliveryDate
            ? expectedDeliveryDate.toISOString()
            : null,
        };

        await dispatch(createPO({ data, userId, userName, isDraft: asDraft })).unwrap();
        Alert.alert(
          'Success',
          asDraft ? 'Draft saved.' : 'Purchase order submitted for approval.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save';
        Alert.alert('Error', msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validate,
      userId,
      userName,
      selectedVendorId,
      vendorName,
      vendorContact,
      vendorEmail,
      vendorAddress,
      items,
      justification,
      expectedDeliveryDate,
      dispatch,
      navigation,
    ]
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={poId ? 'Edit Purchase Order' : 'New Purchase Order'}
        showBack
        onBackPress={handleBack}
      />

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 py-4 gap-6">
          {/* Vendor */}
          <View>
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              VENDOR
            </Text>
            <VendorSelector
              vendors={vendors}
              selectedVendorId={selectedVendorId}
              onSelect={(v: Vendor | null) => setSelectedVendorId(v?.id ?? null)}
              placeholder="Select Saved Vendor"
            />
            <View className="flex-row gap-4 mt-2">
              <TouchableOpacity
                onPress={() => navigation.navigate('AddVendor', {})}
                className="flex-row items-center gap-2"
              >
                <Ionicons name="add-circle-outline" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-medium text-[#1E40AF]">
                  Add New Vendor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('VendorManagement')}
                className="flex-row items-center gap-2"
              >
                <Ionicons name="list-outline" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-medium text-[#1E40AF]">
                  Manage Vendors
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-[13px] text-[#64748B] mt-3 mb-2">
              — OR Enter Manually —
            </Text>
            <FormField
              label="Vendor Name"
              value={vendorName}
              onChangeText={setVendorName}
              placeholder="e.g. ABC Building Supplies"
              error={errors.vendorName}
              required
            />
            <FormField
              label="Contact Number"
              value={vendorContact}
              onChangeText={setVendorContact}
              placeholder="+91-"
              keyboardType="phone-pad"
              error={errors.vendorContact}
            />
          </View>

          {/* Items */}
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                ITEMS
              </Text>
              <TouchableOpacity
                onPress={() => setItemSelectorVisible(true)}
                className="flex-row items-center gap-2"
              >
                <Ionicons name="add" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Add
                </Text>
              </TouchableOpacity>
            </View>
            {errors.items && (
              <Text className="text-[13px] text-[#DC2626] mb-2">
                {errors.items}
              </Text>
            )}
            {items.map((item) => (
              <View key={item.itemId} className="mb-3">
                <POItemCard
                  item={item}
                  editable
                  onRemove={() => handleRemoveItem(item.itemId)}
                  onQuantityChange={(d) => handleQuantityChange(item.itemId, d)}
                  onUnitPriceChange={(p) => handleUnitPriceChange(item.itemId, p)}
                />
              </View>
            ))}
          </View>

          {/* Summary */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              SUMMARY
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-[15px] text-[#64748B]">Subtotal</Text>
              <Text className="text-[15px] text-[#0F172A]">
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-[15px] text-[#64748B]">
                GST ({GST_PERCENTAGE}%)
              </Text>
              <Text className="text-[15px] text-[#0F172A]">
                {formatCurrency(gstAmount)}
              </Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-[#E2E8F0]">
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                Total
              </Text>
              <Text className="text-[15px] font-semibold text-[#0F172A]">
                {formatCurrency(totalAmount)}
              </Text>
            </View>
          </View>

          {/* Justification */}
          <FormField
            label="Justification"
            value={justification}
            onChangeText={setJustification}
            placeholder="e.g. Cement stock below minimum"
            error={errors.justification}
            required
            multiline
          />

          {/* Expected Delivery */}
          <View>
            <Text className="text-[15px] font-medium text-[#0F172A] mb-1.5">
              Expected Delivery
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between bg-white"
            >
              <Text
                className={
                  expectedDeliveryDate
                    ? 'text-[#0F172A]'
                    : 'text-[#94A3B8]'
                }
              >
                {expectedDeliveryDate
                  ? expectedDeliveryDate.toLocaleDateString('en-IN')
                  : 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expectedDeliveryDate ?? new Date()}
                mode="date"
                display="default"
                onChange={(_, d) => {
                  setShowDatePicker(false);
                  if (d) setExpectedDeliveryDate(d);
                }}
              />
            )}
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              onPress={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
            >
              {isSubmitting && isDraft ? (
                <ActivityIndicator size="small" color="#1E40AF" />
              ) : (
                <Text className="text-[15px] font-semibold text-[#1E40AF]">
                  Save Draft
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex-1 bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center"
            >
              {isSubmitting && !isDraft ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-[15px] font-semibold text-white">
                  Submit for Approval
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <POItemSelectorModal
        isVisible={itemSelectorVisible}
        onClose={() => setItemSelectorVisible(false)}
        onSelect={handleItemsSelected}
        excludeItemIds={items.map((i) => i.itemId)}
      />
    </ScreenLayout>
  );
};
