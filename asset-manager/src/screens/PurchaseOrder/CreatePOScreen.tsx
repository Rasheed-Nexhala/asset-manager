import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormField } from '../../components/FormField';
import {
  VendorSelector,
  POItemCard,
} from '../../components/PurchaseOrder';
import {
  printPurchaseOrder,
  buildDraftPOForPrint,
} from '../../utils/poPdfUtils';
import { createPO, updatePO, deletePO } from '../../store/thunks/purchaseOrderThunks';
import {
  subscribeToVendors,
  createVendor,
  deleteVendor,
} from '../../services/firebase/vendorService';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import { getSites } from '../../services/firebase/siteService';
import type { Site } from '../../types/sites';
import { getItemById } from '../../services/firebase/inventoryService';
import { getAdminUsers } from '../../services/firebase/userRoleService';
import type { UserListItem } from '../../types/roles';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setVendors, clearError, setError } from '../../store/slices/purchaseOrderSlice';
import {
  selectUserId,
  selectUserDisplayName,
  selectCanCreatePurchaseOrder,
} from '../../store/selectors/authSelectors';
import {
  selectVendors,
  selectPOById,
  selectPurchaseOrderError,
} from '../../store/selectors/purchaseOrderSelectors';

import type {
  CreatePurchaseOrderData,
  PurchaseOrder,
  PurchaseOrderItem,
} from '../../types/purchaseOrder';
import type { Vendor } from '../../types/vendor';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type RouteParams = RouteProp<PurchaseOrderStackParamList, 'CreatePO'>;
type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'CreatePO' | 'ApprovePO'
>;

const DEFAULT_GST_PERCENTAGE = 18;

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** Format currency or "—" when 0 (optional/not provided) */
const formatCurrencyOrOptional = (n: number) =>
  n > 0 ? formatCurrency(n) : '—';

export const CreatePOScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const poId = route.params?.poId;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const canCreatePO = useAppSelector(selectCanCreatePurchaseOrder);
  const vendors = useAppSelector(selectVendors);

  const poFromStore = useAppSelector((state) =>
    poId ? selectPOById(poId)(state) : null
  );
  const reduxError = useAppSelector(selectPurchaseOrderError);

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [location, setLocation] = useState('');
  const [jobNo, setJobNo] = useState('');
  const [vendorContactPerson, setVendorContactPerson] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [buyerContactName, setBuyerContactName] = useState('');
  const [buyerContactPhone, setBuyerContactPhone] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [justification, setJustification] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(
    null
  );
  const [deliveryDateText, setDeliveryDateText] = useState('');
  const [orderSiteId, setOrderSiteId] = useState<string | null>(null);
  const [orderSiteName, setOrderSiteName] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [sitePickerVisible, setSitePickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [isLoadingPO, setIsLoadingPO] = useState(false);
  const [loadPOError, setLoadPOError] = useState<string | null>(null);
  const [loadPORetryTrigger, setLoadPORetryTrigger] = useState(0);
  const [editingPOStatus, setEditingPOStatus] = useState<'draft' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialStateHash, setInitialStateHash] = useState<string | null>(null);
  const [inventoryItemsMap, setInventoryItemsMap] = useState<Record<string, any>>({});
  const [assignedToAdminId, setAssignedToAdminId] = useState<string | null>(null);
  const [assignedToAdminName, setAssignedToAdminName] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<UserListItem[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminSelectorVisible, setAdminSelectorVisible] = useState(false);
  const assignedAdminRef = useRef<{
    assignedToAdminId: string | null;
    assignedToAdminName: string | null;
  }>({ assignedToAdminId: null, assignedToAdminName: null });

  useEffect(() => {
    const unsub = subscribeToVendors((v) => dispatch(setVendors(v)));
    return unsub;
  }, [dispatch]);

  useEffect(() => {
    setSitesLoading(true);
    getSites()
      .then(setSites)
      .catch((err) => {
        console.error('Failed to load sites:', err);
        setSites([]);
      })
      .finally(() => setSitesLoading(false));
  }, []);

  useEffect(() => {
    setAdminUsersLoading(true);
    getAdminUsers()
      .then(setAdminUsers)
      .catch((err) => {
        console.error('Failed to load admins:', err);
        setAdminUsers([]);
      })
      .finally(() => setAdminUsersLoading(false));
  }, []);

  useEffect(() => {
    assignedAdminRef.current = { assignedToAdminId, assignedToAdminName };
  }, [assignedToAdminId, assignedToAdminName]);

  // Helper to fetch details for multiple items
  const fetchInventoryDetails = useCallback(async (itemIds: string[]) => {
    const missingIds = itemIds.filter(id => !inventoryItemsMap[id]);
    if (missingIds.length === 0) return;

    try {
      const results = await Promise.all(missingIds.map(id => getItemById(id)));
      const updates: Record<string, any> = {};
      results.forEach((item, index) => {
        if (item) updates[missingIds[index]] = item;
      });
      setInventoryItemsMap(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Error fetching inventory details:', err);
    }
  }, [inventoryItemsMap]);

  // Fetch details when items change
  useEffect(() => {
    const ids = items.map(i => i.itemId);
    if (ids.length > 0) {
      fetchInventoryDetails(ids);
    }
  }, [items, fetchInventoryDetails]);



  useEffect(() => {
    if (selectedVendorId) {
      const v = vendors.find((x) => x.id === selectedVendorId);
      if (v) {
        setVendorName(v.name);
        setVendorContact(v.phone);
        setVendorEmail(v.email ?? '');
        setVendorAddress(v.address ?? '');
        setVendorGstin(v.gstin ?? '');
        setVendorContactPerson(v.contactPerson ?? '');
      }
    }
  }, [selectedVendorId, vendors]);

  useEffect(() => {
    if (canCreatePO || poId) return;
    Alert.alert(
      'Cannot create purchase order',
      'Only Store Incharge or super admin can create purchase orders.',
      [{ text: 'OK', onPress: () => navigation.replace('PurchaseOrderList') }]
    );
  }, [canCreatePO, poId, navigation]);

  useEffect(() => {
    if (!poId) {
      setEditingPOStatus(null);
      return;
    }

    const loadPO = (po: PurchaseOrder) => {
      if (po.status !== 'draft') {
        navigation.replace('ApprovePO', { poId: po.id });
        return;
      }
      if (
        !canCreatePO &&
        userId &&
        po.createdBy !== userId
      ) {
        Alert.alert(
          'Cannot open draft',
          'Only Store Incharge or super admin can create purchase orders.',
          [{ text: 'OK', onPress: () => navigation.replace('PurchaseOrderList') }]
        );
        return;
      }
      setSelectedVendorId(po.vendorId);
      setVendorName(po.vendorName);
      setVendorContact(po.vendorContact);
      setVendorEmail(po.vendorEmail ?? '');
      setVendorAddress(po.vendorAddress ?? '');
      setVendorGstin(po.vendorGstin ?? '');
      setVendorContactPerson(po.vendorContactPerson ?? '');
      setDeliveryLocation(po.deliveryLocation ?? '');
      setBuyerContactName(po.buyerContactName ?? '');
      setBuyerContactPhone(po.buyerContactPhone ?? '');
      setLocation(po.location ?? '');
      setJobNo(po.jobNo ?? '');
      setPoNumber(po.poNumber ?? '');
      setItems(po.items);
      setJustification(po.justification);
      setExpectedDeliveryDate(
        po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null
      );
      setDeliveryDateText(po.deliveryDateText ?? '');
      const sid = po.siteId?.trim() || null;
      setOrderSiteId(sid);
      if (sid) {
        setOrderSiteName((po.siteName ?? po.poIssueSite ?? '').trim());
      } else {
        setOrderSiteName((po.poIssueSite ?? '').trim());
      }
      setEditingPOStatus('draft');

      setInitialStateHash(JSON.stringify({
        selectedVendorId: po.vendorId,
        vendorName: po.vendorName,
        vendorContact: po.vendorContact,
        vendorEmail: po.vendorEmail ?? '',
        vendorAddress: po.vendorAddress ?? '',
        vendorGstin: po.vendorGstin ?? '',
        vendorContactPerson: po.vendorContactPerson ?? '',
        deliveryLocation: po.deliveryLocation ?? '',
        buyerContactName: po.buyerContactName ?? '',
        buyerContactPhone: po.buyerContactPhone ?? '',
        location: po.location ?? '',
        jobNo: po.jobNo ?? '',
        poNumber: po.poNumber ?? '',
        items: po.items.map(i => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          gstPercentage: i.gstPercentage,
          orderedUnit: i.orderedUnit,
          orderedQuantity: i.orderedQuantity,
          remarks: i.remarks ?? '',
        })),
        justification: po.justification,
        expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString() : null,
        deliveryDateText: po.deliveryDateText ?? '',
        orderSiteId: po.siteId?.trim() || null,
        orderSiteName: po.siteName?.trim() ?? '',
      }));
    };

    if (poFromStore) {
      loadPO(poFromStore);
      return;
    }

    setIsLoadingPO(true);
    setLoadPOError(null);
    getPOById(poId)
      .then((po) => {
        if (po) {
          loadPO(po);
          setLoadPOError(null);
        } else {
          setLoadPOError('Purchase order not found');
        }
      })
      .catch((err: unknown) => {
        setLoadPOError(
          err instanceof Error ? err.message : 'Failed to load purchase order'
        );
      })
      .finally(() => setIsLoadingPO(false));
  }, [
    poId,
    poFromStore?.id,
    loadPORetryTrigger,
    navigation,
    canCreatePO,
    userId,
  ]);

  useEffect(() => {
    if (!poId && initialStateHash === null) {
      setInitialStateHash(JSON.stringify({
        selectedVendorId: null,
        vendorName: '',
        vendorContact: '',
        vendorEmail: '',
        vendorAddress: '',
        vendorGstin: '',
        vendorContactPerson: '',
        deliveryLocation: '',
        buyerContactName: '',
        buyerContactPhone: '',
        location: '',
        jobNo: '',
        poNumber: '',
        items: [],
        justification: '',
        expectedDeliveryDate: null,
        deliveryDateText: '',
        orderSiteId: null,
        orderSiteName: '',
      }));
    }
  }, [poId, initialStateHash]);

  const currentHash = JSON.stringify({
    selectedVendorId,
    vendorName: vendorName.trim(),
    vendorContact: vendorContact.trim(),
    vendorEmail: vendorEmail.trim(),
    vendorAddress: vendorAddress.trim(),
    vendorGstin: vendorGstin.trim(),
    vendorContactPerson: vendorContactPerson.trim(),
    deliveryLocation: deliveryLocation.trim(),
    buyerContactName: buyerContactName.trim(),
    buyerContactPhone: buyerContactPhone.trim(),
    location: location.trim(),
    jobNo: jobNo.trim(),
    poNumber: poNumber.trim(),
    items: items.map(i => ({
      itemId: i.itemId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      gstPercentage: i.gstPercentage,
      orderedUnit: i.orderedUnit,
      orderedQuantity: i.orderedQuantity,
      remarks: i.remarks ?? '',
    })),
    justification: justification.trim(),
    expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString() : null,
    deliveryDateText: deliveryDateText.trim(),
    orderSiteId,
    orderSiteName: orderSiteName.trim(),
  });

  const isDirty = initialStateHash !== null && currentHash !== initialStateHash;

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const gstAmount = items.reduce(
    (sum, i) => {
      const gstPct = i.gstPercentage ?? (i.unitPrice && i.unitPrice > 0 ? DEFAULT_GST_PERCENTAGE : 0);
      return sum + Math.round((i.amount * gstPct) / 100);
    },
    0
  );
  const totalAmount = subtotal + gstAmount;
  const hasAnyPrice = items.some((i) => (i.unitPrice ?? 0) > 0);

  const activeSites = useMemo(
    () => sites.filter((s) => s.status === 'active'),
    [sites]
  );

  useEffect(() => {
    if (!orderSiteId || orderSiteName.trim()) return;
    const s = activeSites.find((x) => x.id === orderSiteId);
    if (s) setOrderSiteName(s.name);
  }, [orderSiteId, orderSiteName, activeSites]);

  /** Link saved poIssueSite text to a site id once sites are loaded (legacy drafts). */
  useEffect(() => {
    if (sites.length === 0 || orderSiteId) return;
    const t = orderSiteName.trim();
    if (!t) return;
    const m = sites.find(
      (s) => s.status !== 'deleted' && s.name.trim() === t
    );
    if (m) setOrderSiteId(m.id);
  }, [sites, orderSiteId, orderSiteName]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    const vName = vendorName.trim();
    const vContact = vendorContact.trim();
    if (!poNumber.trim()) e.poNumber = 'P.O. No. is required';
    if (!vName) e.vendorName = 'Vendor name is required';
    if (!vContact) e.vendorContact = 'Contact number is required';
    if (items.length === 0) e.items = 'At least one item is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [poNumber, vendorName, vendorContact, items.length]);

  // Handle selectedItems when returning from SelectItemsScreen or ProcessRequestScreen
  useFocusEffect(
    useCallback(() => {
      const selected = route.params?.selectedItems;
      if (selected && selected.length > 0) {
        const newItems: PurchaseOrderItem[] = selected.map((item) => {
          const initialQty = route.params?.initialQuantities?.[item.id] ?? 1;
          const unitPrice = item.standardUnitPrice ?? 0;
          const gstPercentage = item.standardGstPercentage ?? (unitPrice > 0 ? DEFAULT_GST_PERCENTAGE : undefined);
          const amount = unitPrice > 0 ? initialQty * unitPrice : 0;
          return {
            itemId: item.id,
            itemName: item.name,
            itemSku: item.sku,
            unit: item.unit,
            isExistingItem: true,
            quantity: initialQty,
            unitPrice,
            amount,
            gstPercentage,
            receivedQuantity: null,
            orderedUnit: item.unit,
            orderedQuantity: initialQty,
            remarks: undefined,
          };
        });
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
        navigation.setParams({ selectedItems: undefined } as Record<string, unknown>);
      }
    }, [route.params?.selectedItems, navigation])
  );

  const handleAddItemsPress = useCallback(() => {
    navigation.navigate('SelectItems', {
      returnScreen: 'CreatePO',
      returnParams: { poId },
      excludeItemIds: items.map((i) => i.itemId),
    });
  }, [navigation, poId, items]);

  const handleQuantityChange = useCallback((itemId: string, quantity: number, orderedUnit?: string, orderedQuantity?: number) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.itemId !== itemId) return p;
        const q = Math.max(0, quantity);
        // The unit price is entered per ordered unit. The amount should be orderedQuantity * unitPrice.
        // If orderedQuantity isn't set (i.e. pieces), it defaults to q * unitPrice.
        const orderQty = orderedQuantity ?? q;
        return { ...p, quantity: q, orderedUnit, orderedQuantity, amount: orderQty * p.unitPrice };
      })
    );
  }, []);

  const handleUnitPriceChange = useCallback((itemId: string, price: number) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.itemId !== itemId) return p;
        const orderQty = p.orderedQuantity ?? p.quantity;
        return { ...p, unitPrice: price, amount: orderQty * price };
      })
    );
  }, []);

  const handleGstPercentageChange = useCallback((itemId: string, percentage: number) => {
    setItems((prev) =>
      prev.map((p) =>
        p.itemId === itemId ? { ...p, gstPercentage: percentage } : p
      )
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((p) => p.itemId !== itemId));
  }, []);

  const handleRemarksChange = useCallback((itemId: string, remarks: string) => {
    setItems((prev) =>
      prev.map((p) => (p.itemId === itemId ? { ...p, remarks } : p))
    );
  }, []);

  const handleSubmit = useCallback(
    async (asDraft: boolean) => {
      if (!asDraft && !validate()) return;
      if (!userId || !userName) {
        Alert.alert('Error', 'User information is missing');
        return;
      }
      const assignedId = assignedToAdminId ?? assignedAdminRef.current.assignedToAdminId;
      const assignedName = assignedToAdminName ?? assignedAdminRef.current.assignedToAdminName;
      if (!asDraft) {
        if (!assignedId?.trim() || !assignedName?.trim()) {
          Alert.alert('Error', 'Please select an admin to assign for approval.');
          return;
        }
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

      const invalidItem = items.find((i) => {
        if (i.quantity <= 0) return true;
        if (i.orderedUnit && (i.orderedUnit === 'Kg' || i.orderedUnit === 'Ton') && !Number.isInteger(i.quantity)) {
          return true;
        }
        return false;
      });
      if (invalidItem) {
        Alert.alert(
          'Invalid quantity',
          `Please review ${invalidItem.itemName}. Quantity must be positive and steel conversions must resolve to whole pieces.`
        );
        return;
      }

      setIsSubmitting(true);
      setIsDraft(asDraft);

      let vendorCreatedThisAttempt = false;

      try {
        if (!vendorId) {
          vendorId = await createVendor({
            name: vName,
            contactPerson: vName,
            phone: vContact,
            email: vendorEmail.trim() || undefined,
            address: vendorAddress.trim() || undefined,
            gstin: vendorGstin.trim() || undefined,
          });
          vendorCreatedThisAttempt = true;
        }

        const data: CreatePurchaseOrderData = {
          poNumber: poNumber.trim(),
          vendorId,
          vendorName: vName,
          vendorContact: vContact,
          vendorEmail: vendorEmail.trim() || undefined,
          vendorAddress: vendorAddress.trim() || undefined,
          vendorGstin: vendorGstin.trim() || undefined,
          vendorContactPerson: vendorContactPerson.trim() || undefined,
          location: location.trim() || undefined,
          jobNo: jobNo.trim() || undefined,
          poIssueSite: orderSiteName.trim() || undefined,
          deliveryLocation: deliveryLocation.trim() || undefined,
          buyerContactName: buyerContactName.trim() || undefined,
          buyerContactPhone: buyerContactPhone.trim() || undefined,
          siteId: orderSiteId?.trim() || undefined,
          siteName: orderSiteId ? orderSiteName.trim() || undefined : undefined,
          deliveryDateText: deliveryDateText.trim() || undefined,
          items: items.map((i) => ({
            itemId: i.itemId,
            itemName: i.itemName,
            itemSku: i.itemSku,
            unit: i.unit,
            isExistingItem: i.isExistingItem,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            gstPercentage: i.gstPercentage,
            orderedUnit: i.orderedUnit,
            orderedQuantity: i.orderedQuantity,
            remarks: i.remarks?.trim() || undefined,
          })),
          justification: justification.trim(),
          expectedDeliveryDate: expectedDeliveryDate
            ? expectedDeliveryDate.toISOString()
            : null,
          ...(!asDraft && assignedId?.trim() && assignedName?.trim()
            ? { assignedToAdminId: assignedId.trim(), assignedToAdminName: assignedName.trim() }
            : {}),
        };

        let savedPoId: string;
        let savedPO: PurchaseOrder | null = null;

        if (poId && editingPOStatus === 'draft') {
          const updated = await dispatch(
            updatePO({ poId, data, isDraft: asDraft })
          ).unwrap();
          savedPoId = poId;
          savedPO = updated ?? null;
        } else {
          savedPoId = await dispatch(
            createPO({ data, userId, userName, isDraft: asDraft })
          ).unwrap();
        }

        const poForPrint = savedPO ?? (await getPOById(savedPoId));
        const successMsg = asDraft
          ? 'Draft saved.'
          : poForPrint?.status === 'approved'
            ? 'Purchase order approved.'
            : 'Purchase order submitted for approval.';

        Alert.alert('Success', successMsg, [
          {
            text: 'Print',
            onPress: async () => {
              try {
                const toPrint = poForPrint ?? (await getPOById(savedPoId));
                if (toPrint) await printPurchaseOrder(toPrint);
              } catch (err) {
                Alert.alert(
                  'Error',
                  err instanceof Error ? err.message : 'Failed to print'
                );
              }
              navigation.navigate('PurchaseOrderList');
            },
          },
          {
            text: 'OK',
            onPress: () => navigation.navigate('PurchaseOrderList'),
          },
        ]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save';
        if (vendorCreatedThisAttempt) {
          try {
            await deleteVendor(vendorId);
            setSelectedVendorId(null);
          } catch (deleteErr) {
            console.error('Failed to clean up orphaned vendor', deleteErr);
          }
          dispatch(
            setError(
              `Failed to create purchase order. Vendor creation rolled back. ${msg}`
            )
          );
        }
        // Thunk already dispatches setError for other failures; banner will show
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
      vendorGstin,
      vendorContactPerson,
      location,
      jobNo,
      deliveryLocation,
      buyerContactName,
      buyerContactPhone,
      orderSiteId,
      orderSiteName,
      deliveryDateText,
      poNumber,
      items,
      justification,
      expectedDeliveryDate,
      assignedToAdminId,
      assignedToAdminName,
      poId,
      editingPOStatus,
      dispatch,
      navigation,
    ]
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleDeleteDraft = useCallback(() => {
    if (!poId || editingPOStatus !== 'draft' || !userId) return;

    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await dispatch(deletePO({ poId, userId })).unwrap();
              Alert.alert('Success', 'Draft deleted', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('PurchaseOrderList'),
                },
              ]);
            } catch (err: unknown) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Failed to delete draft'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [poId, editingPOStatus, userId, dispatch, navigation]);

  const handlePrintDraft = useCallback(async () => {
    if (!poNumber.trim()) {
      Alert.alert('Error', 'P.O. No. is required to print.');
      return;
    }
    if (!vendorName.trim() || !vendorContact.trim()) {
      Alert.alert('Error', 'Vendor name and contact are required to print.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Error', 'Add at least one item to print.');
      return;
    }
    try {
      const draftPO = buildDraftPOForPrint(
        {
          vendorName: vendorName.trim(),
          vendorContact: vendorContact.trim(),
          vendorEmail: vendorEmail.trim() || undefined,
          vendorAddress: vendorAddress.trim() || undefined,
          vendorGstin: vendorGstin.trim() || undefined,
          vendorContactPerson: vendorContactPerson.trim() || undefined,
          location: location.trim() || undefined,
          jobNo: jobNo.trim() || undefined,
          poIssueSite: orderSiteName.trim() || undefined,
          deliveryLocation: deliveryLocation.trim() || undefined,
          buyerContactName: buyerContactName.trim() || undefined,
          buyerContactPhone: buyerContactPhone.trim() || undefined,
          siteId: orderSiteId?.trim() || undefined,
          siteName: orderSiteId ? orderSiteName.trim() || undefined : undefined,
          deliveryDateText: deliveryDateText.trim() || undefined,
          items,
          justification: justification.trim(),
          expectedDeliveryDate,
          userName: userName ?? '—',
        },
        poNumber.trim()
      );
      await printPurchaseOrder(draftPO);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to print'
      );
    }
  }, [
    vendorName,
    vendorContact,
    vendorEmail,
    vendorAddress,
    vendorGstin,
    vendorContactPerson,
    location,
    jobNo,
    deliveryLocation,
    buyerContactName,
    buyerContactPhone,
    orderSiteId,
    orderSiteName,
    deliveryDateText,
    items,
    justification,
    expectedDeliveryDate,
    userName,
    poNumber,
  ]);

  if (poId && (isLoadingPO || loadPOError)) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Edit Purchase Order"
          showBack
          onBackPress={handleBack}
        />
        <View className="flex-1 items-center justify-center px-4">
          {isLoadingPO ? (
            <>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-[15px] text-[#64748B] mt-4">
                Loading purchase order...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
              <Text className="text-[17px] font-semibold text-[#0F172A] text-center mt-4 mb-2">
                Could not load purchase order
              </Text>
              <Text className="text-[15px] text-[#64748B] text-center mb-6">
                {loadPOError}
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleBack}
                  className="px-6 py-3 border border-[#E2E8F0] rounded-[10px]"
                >
                  <Text className="text-[15px] font-medium text-[#64748B]">
                    Go Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLoadPORetryTrigger((t) => t + 1)}
                  className="px-6 py-3 bg-[#1E40AF] rounded-[10px]"
                >
                  <Text className="text-[15px] font-medium text-white">
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']} keyboardAware>
      <ScreenHeader
        title={poId ? 'Edit Purchase Order' : 'New Purchase Order'}
        showBack
        onBackPress={handleBack}
      />

      {reduxError && (
        <View className="bg-[#DC2626]/15 px-4 py-3 border-b border-[#DC2626]/30 flex-row items-center gap-2">
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text className="text-[14px] text-[#DC2626] flex-1">{reduxError}</Text>
          <TouchableOpacity
            onPress={() => dispatch(clearError())}
            className="px-3 py-1.5 bg-[#DC2626] rounded-lg"
            accessibilityLabel="Dismiss error"
            accessibilityRole="button"
          >
            <Text className="text-[13px] font-medium text-white">Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 py-4 gap-6">
          {/* PO Number — manual entry, optional (auto-generated if blank) */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <FormField
              label="P.O. No."
              value={poNumber}
              onChangeText={setPoNumber}
              placeholder="e.g. PO-2025-0001"
              error={errors.poNumber}
              required
            />
          </View>

          {/* Vendor — CIAMS card layout */}
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-4">
              VENDOR
            </Text>
            <VendorSelector
              vendors={vendors}
              selectedVendorId={selectedVendorId}
              onSelect={(v: Vendor | null) => setSelectedVendorId(v?.id ?? null)}
              placeholder="Select Saved Vendor"
            />
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={() => navigation.navigate('AddVendor', {})}
                className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] min-h-[48px]"
                activeOpacity={0.7}
                accessibilityLabel="Add new vendor"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-medium text-[#1E40AF]">
                  Add New
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('VendorManagement')}
                className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] min-h-[48px]"
                activeOpacity={0.7}
                accessibilityLabel="Manage vendors"
                accessibilityRole="button"
              >
                <Ionicons name="list-outline" size={20} color="#1E40AF" />
                <Text className="text-[15px] font-medium text-[#1E40AF]">
                  Manage
                </Text>
              </TouchableOpacity>
            </View>
            <View className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <Text className="text-[13px] text-[#64748B] mb-3">
                Or enter vendor details manually
              </Text>
              <View className="gap-4">
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
                <FormField
                  label="GSTIN"
                  value={vendorGstin}
                  onChangeText={setVendorGstin}
                  placeholder="e.g. 29AJWPD4844N1ZC"
                  error={errors.vendorGstin}
                />
                <FormField
                  label="Supplier contact person"
                  value={vendorContactPerson}
                  onChangeText={setVendorContactPerson}
                  placeholder="As on printed PO"
                />
              </View>
            </View>
          </View>

          {/* Items */}
          <View>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                ITEMS
              </Text>
              <TouchableOpacity
                onPress={handleAddItemsPress}
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
            {items.map((item) => {
              const invItem = inventoryItemsMap[item.itemId];
              return (
                <View key={item.itemId} className="mb-3">
                  <POItemCard
                    item={item}
                    inventoryItem={invItem}
                    editable
                    onRemove={() => handleRemoveItem(item.itemId)}
                    onQuantityChange={(q, u, o) => handleQuantityChange(item.itemId, q, u, o)}
                    onUnitPriceChange={(p) => handleUnitPriceChange(item.itemId, p)}
                    onGstPercentageChange={(p) => handleGstPercentageChange(item.itemId, p)}
                    onRemarksChange={(r) => handleRemarksChange(item.itemId, r)}
                  />
                </View>
              );
            })}
          </View>

          {/* Summary - only show when at least one item has price entered */}
          {hasAnyPrice && (
            <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
              <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
                SUMMARY
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-[15px] text-[#64748B]">Subtotal</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {formatCurrencyOrOptional(subtotal)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-[15px] text-[#64748B]">Total GST</Text>
                <Text className="text-[15px] text-[#0F172A]">
                  {formatCurrencyOrOptional(gstAmount)}
                </Text>
              </View>
              <View className="flex-row justify-between pt-2 border-t border-[#E2E8F0]">
                <Text className="text-[15px] font-semibold text-[#0F172A]">
                  Total
                </Text>
                <Text className="text-[15px] font-semibold text-[#0F172A]">
                  {formatCurrencyOrOptional(totalAmount)}
                </Text>
              </View>
            </View>
          )}

          {/* Justification */}
          <FormField
            label="Justification"
            value={justification}
            onChangeText={setJustification}
            placeholder="e.g. Cement stock below minimum"
            error={errors.justification}
            multiline
          />

          <View className="flex-row gap-4">
            <View className="flex-1">
              <FormField
                label="Job No. (optional)"
                value={jobNo}
                onChangeText={setJobNo}
                placeholder="e.g. 2513"
                error={errors.jobNo}
              />
            </View>
            <View className="flex-1">
              <FormField
                label="Location / work (optional)"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. FO"
                error={errors.location}
              />
            </View>
          </View>

          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] gap-3">
            <Text className="text-[17px] font-semibold text-[#0F172A]">
              Order &amp; print details (optional)
            </Text>
            <Text className="text-[13px] text-[#64748B]">
              Typed values are shown on the Purchase / Service Order. Leave blank where not
              needed.
            </Text>
            <View>
              <Text className="text-[15px] font-medium text-[#0F172A] mb-1.5">
                PO issue site (optional)
              </Text>
              <TouchableOpacity
                onPress={() => setSitePickerVisible(true)}
                disabled={sitesLoading}
                className="border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between bg-white"
              >
                {sitesLoading ? (
                  <ActivityIndicator size="small" color="#1E40AF" />
                ) : (
                  <>
                    <Text
                      className={
                        orderSiteName ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                      }
                    >
                      {orderSiteName || 'Select PO issue site'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#64748B" />
                  </>
                )}
              </TouchableOpacity>
              <Text className="text-[13px] text-[#64748B] mt-1.5">
                Choose from active sites in Site Management. Shown as &quot;PO Issue Site&quot;
                on the printed order (falls back to location/work if not set).
              </Text>
            </View>
            <FormField
              label="Delivery date (as printed)"
              value={deliveryDateText}
              onChangeText={setDeliveryDateText}
              placeholder='e.g. Immediately, 24.03.2026, or "Next week"'
            />
            <Text className="text-[13px] text-[#64748B] -mt-2">
              If this is empty, a calendar date below is used when set; otherwise the document
              shows &quot;Immediately&quot;.
            </Text>
            <View>
              <Text className="text-[15px] font-medium text-[#0F172A] mb-1.5">
                Expected delivery (calendar, optional)
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
                    : 'Tap to pick a date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#64748B" />
              </TouchableOpacity>
              {expectedDeliveryDate ? (
                <TouchableOpacity
                  onPress={() => setExpectedDeliveryDate(null)}
                  className="mt-2 self-start"
                >
                  <Text className="text-[14px] font-medium text-[#1E40AF]">
                    Clear calendar date
                  </Text>
                </TouchableOpacity>
              ) : null}
              {showDatePicker && (
                <DateTimePicker
                  value={expectedDeliveryDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    setShowDatePicker(false);
                    if (d) setExpectedDeliveryDate(d);
                  }}
                />
              )}
            </View>
            <FormField
              label="Deliver location (optional)"
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              placeholder="e.g. IBF Yard Kuthethur"
            />
            <FormField
              label="Contact person (optional)"
              value={buyerContactName}
              onChangeText={setBuyerContactName}
              placeholder="e.g. Mr. Gowrish"
            />
            <FormField
              label="Contact phone (optional)"
              value={buyerContactPhone}
              onChangeText={setBuyerContactPhone}
              placeholder="e.g. 9535698044"
              keyboardType="phone-pad"
            />
          </View>

          {/* Print Preview */}
          <TouchableOpacity
            onPress={handlePrintDraft}
            className="border-[1.5px] border-[#64748B] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
          >
            <Ionicons name="print-outline" size={20} color="#64748B" />
            <Text className="text-[15px] font-semibold text-[#64748B]">
              Print Preview
            </Text>
          </TouchableOpacity>

          {/* Assign Admin for Approval - required when submitting for approval */}
          <View>
            <Text className="text-[15px] font-medium text-[#0F172A] mb-2">
              Assign Admin for Approval
            </Text>
            <Text className="text-[13px] text-[#64748B] mb-2">
              Select the admin who will approve this PO when submitting for approval.
            </Text>
            <TouchableOpacity
              onPress={() => setAdminSelectorVisible(true)}
              disabled={adminUsersLoading}
              className="border-[1.5px] border-[#E2E8F0] rounded-[10px] h-[50px] px-4 flex-row items-center justify-between bg-white"
            >
              {adminUsersLoading ? (
                <ActivityIndicator size="small" color="#1E40AF" />
              ) : assignedToAdminId && assignedToAdminName ? (
                <Text className="text-[15px] text-[#0F172A]">
                  {assignedToAdminName}
                </Text>
              ) : (
                <Text className="text-[15px] text-[#94A3B8]">
                  Select admin
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Modal
            visible={sitePickerVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setSitePickerVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setSitePickerVisible(false)}
              className="flex-1 bg-black/50 justify-end"
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                className="bg-white rounded-t-[20px] max-h-[70%]"
              >
                <View className="p-4 border-b border-[#E2E8F0]">
                  <Text className="text-[17px] font-semibold text-[#0F172A]">
                    PO issue site
                  </Text>
                  <Text className="text-[13px] text-[#64748B] mt-1">
                    Optional. Pick an active site or leave unset.
                  </Text>
                </View>
                <FlatList
                  ListHeaderComponent={
                    <TouchableOpacity
                      onPress={() => {
                        setOrderSiteId(null);
                        setOrderSiteName('');
                        setSitePickerVisible(false);
                      }}
                      className="px-4 py-4 border-b border-[#E2E8F0]"
                    >
                      <Text className="text-[15px] font-medium text-[#64748B]">
                        No site
                      </Text>
                    </TouchableOpacity>
                  }
                  data={activeSites}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setOrderSiteId(item.id);
                        setOrderSiteName(item.name);
                        setSitePickerVisible(false);
                      }}
                      className="px-4 py-4 border-b border-[#E2E8F0]"
                    >
                      <Text className="text-[15px] font-medium text-[#0F172A]">
                        {item.name}
                      </Text>
                      {item.address ? (
                        <Text
                          className="text-[13px] text-[#64748B] mt-0.5"
                          numberOfLines={2}
                        >
                          {item.address}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    !sitesLoading ? (
                      <View className="p-4">
                        <Text className="text-[15px] text-[#64748B]">
                          No active sites. Add sites under Site Management.
                        </Text>
                      </View>
                    ) : null
                  }
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          <Modal
            visible={adminSelectorVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setAdminSelectorVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setAdminSelectorVisible(false)}
              className="flex-1 bg-black/50 justify-end"
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                className="bg-white rounded-t-[20px] max-h-[70%]"
              >
                <View className="p-4 border-b border-[#E2E8F0]">
                  <Text className="text-[17px] font-semibold text-[#0F172A]">
                    Select Admin
                  </Text>
                  <Text className="text-[13px] text-[#64748B] mt-1">
                    Only the selected admin can approve this PO.
                  </Text>
                </View>
                <FlatList
                  data={adminUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        const name = item.displayName || item.email || 'Unknown';
                        setAssignedToAdminId(item.id);
                        setAssignedToAdminName(name);
                        assignedAdminRef.current = {
                          assignedToAdminId: item.id,
                          assignedToAdminName: name,
                        };
                        setAdminSelectorVisible(false);
                      }}
                      className="px-4 py-4 border-b border-[#E2E8F0]"
                    >
                      <Text className="text-[15px] font-medium text-[#0F172A]">
                        {item.displayName || item.email || 'Unknown'}
                      </Text>
                      {item.email && (
                        <Text className="text-[13px] text-[#64748B] mt-0.5">
                          {item.email}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    !adminUsersLoading ? (
                      <View className="p-4">
                        <Text className="text-[15px] text-[#64748B]">
                          No admins found.
                        </Text>
                      </View>
                    ) : null
                  }
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* Buttons */}
          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              onPress={() => handleSubmit(true)}
              disabled={isSubmitting || isDeleting || !isDirty}
              className={`flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center ${!isDirty ? 'opacity-50' : ''}`}
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
              disabled={isSubmitting || isDeleting}
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

          {/* Delete Draft - only when editing a draft */}
          {poId && editingPOStatus === 'draft' && (
            <TouchableOpacity
              onPress={handleDeleteDraft}
              disabled={isDeleting}
              className="mt-3 pt-3 border-t border-[#E2E8F0] flex-row items-center justify-center gap-2"
              accessibilityRole="button"
              accessibilityLabel={isDeleting ? 'Deleting draft' : 'Delete draft'}
              accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              )}
              <Text className="text-[15px] font-medium text-[#DC2626]">
                Delete Draft
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

    </ScreenLayout>
  );
};
