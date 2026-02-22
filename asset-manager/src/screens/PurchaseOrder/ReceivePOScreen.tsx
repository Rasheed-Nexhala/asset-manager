import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormField } from '../../components/FormField';
import { InvoiceUploadField, POReceiptSummary } from '../../components/PurchaseOrder';
import { getPOById } from '../../services/firebase/purchaseOrderService';
import { uploadPOInvoice } from '../../services/firebase/storageService';
import { receivePO } from '../../store/thunks/purchaseOrderThunks';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectAllItems } from '../../store/selectors/inventorySelectors';
import { fetchItems } from '../../store/thunks/inventoryThunks';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { PurchaseOrderStackParamList } from '../../navigation/PurchaseOrderStackParamList';

type RouteParams = RouteProp<PurchaseOrderStackParamList, 'ReceivePO'>;
type NavigationProp = StackNavigationProp<
  PurchaseOrderStackParamList,
  'ReceivePO'
>;

export const ReceivePOScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { poId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const allItems = useAppSelector(selectAllItems);

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [invoiceFile, setInvoiceFile] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [receivedDate, setReceivedDate] = useState(new Date());
  const [receivedNotes, setReceivedNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  useEffect(() => {
    dispatch(fetchItems());
  }, [dispatch]);

  useEffect(() => {
    getPOById(poId)
      .then((p) => {
        if (p) {
          setPo(p);
          const initial: Record<string, number> = {};
          p.items.forEach((i) => {
            initial[i.itemId] = i.quantity;
          });
          setReceivedQuantities(initial);
        }
      })
      .finally(() => setLoading(false));
  }, [poId]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleQuantityChange = useCallback((itemId: string, qty: number) => {
    setReceivedQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, qty) }));
  }, []);

  const handleUploadInvoice = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to pick invoice image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingInvoice(true);
    try {
      const { url, fileName } = await uploadPOInvoice(
        result.assets[0].uri,
        poId,
        result.assets[0].fileName ?? undefined
      );
      setInvoiceFile({ fileName, fileUrl: url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      Alert.alert('Error', msg);
    } finally {
      setUploadingInvoice(false);
    }
  }, [poId]);

  const handleConfirm = useCallback(async () => {
    if (!po || !userId || !userName) return;
    if (!invoiceFile) {
      Alert.alert('Error', 'Invoice/Bill attachment is required.');
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        receivePO({
          poId,
          receiveData: {
            receivedQuantities: Object.entries(receivedQuantities).map(
              ([itemId, qty]) => ({ itemId, receivedQuantity: qty })
            ),
            documents: [
              { type: 'invoice', fileName: invoiceFile.fileName, fileUrl: invoiceFile.fileUrl },
            ],
            receivedDate: receivedDate.toISOString(),
            receivedNotes: receivedNotes.trim() || undefined,
          },
          userId,
          userName,
        })
      ).unwrap();
      Alert.alert('Success', 'Purchase order received. Inventory updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to receive PO';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [
    po,
    poId,
    userId,
    userName,
    receivedQuantities,
    invoiceFile,
    receivedDate,
    receivedNotes,
    dispatch,
    navigation,
  ]);

  const inventoryUpdates = po
    ? po.items.map((item) => {
        const received = receivedQuantities[item.itemId] ?? 0;
        const invItem = allItems.find((i) => i.id === item.itemId);
        const current = invItem?.centralStoreQuantity ?? 0;
        return {
          itemName: item.itemName,
          currentQty: current,
          receivedQty: received,
          newQty: current + received,
        };
      }).filter((u) => u.receivedQty > 0)
    : [];

  if (loading || !po) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Receive PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">
            Loading purchase order...
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  if (po.status !== 'approved' && po.status !== 'ordered') {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Receive PO" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-[15px] text-[#64748B] text-center">
            Only approved or ordered POs can be received. Current status: {po.status}.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title={`Receive ${po.poNumber}`}
        showBack
        onBackPress={handleBack}
      />

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4">
          <Text className="text-[13px] text-[#64748B]">Vendor</Text>
          <Text className="text-[15px] font-medium text-[#0F172A]">
            {po.vendorName}
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
            ITEMS RECEIVED
          </Text>
          {po.items.map((item) => {
            const received = receivedQuantities[item.itemId] ?? item.quantity;
            const fullQty = received >= item.quantity;
            return (
              <View
                key={item.itemId}
                className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3"
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-8 h-8 items-center justify-center">
                    <Ionicons
                      name={fullQty ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={fullQty ? '#16A34A' : '#64748B'}
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[15px] font-medium text-[#0F172A]">
                      {item.itemName}
                    </Text>
                    <Text className="text-[13px] text-[#64748B] mt-0.5">
                      Ordered: {item.quantity}
                    </Text>
                  </View>
                </View>
                <View className="gap-1.5">
                  <Text className="text-[13px] text-[#64748B]">
                    Received Qty
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <TextInput
                      value={String(received)}
                      onChangeText={(t) =>
                        handleQuantityChange(
                          item.itemId,
                          parseInt(t.replace(/\D/g, ''), 10) || 0
                        )
                      }
                      keyboardType="number-pad"
                      className="border border-[#E2E8F0] rounded-lg h-12 w-24 px-4 bg-white text-[15px] text-[#0F172A]"
                      placeholderTextColor="#94A3B8"
                    />
                    {fullQty && (
                      <Text className="text-[13px] font-medium text-[#16A34A]">
                        ✓ Full quantity
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mb-4">
          <InvoiceUploadField
            fileName={invoiceFile?.fileName ?? null}
            fileUrl={invoiceFile?.fileUrl ?? null}
            onUpload={handleUploadInvoice}
            onRemove={() => setInvoiceFile(null)}
            label="Invoice/Bill"
            required
          />
          {uploadingInvoice && (
            <View className="mt-2">
              <ActivityIndicator size="small" color="#1E40AF" />
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-[15px] font-medium text-[#0F172A] mb-1.5">
            Received Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="border border-[#E2E8F0] rounded-lg h-12 px-4 flex-row items-center justify-between bg-white"
          >
            <Text className="text-[#0F172A]">
              {receivedDate.toLocaleDateString('en-IN')}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#64748B" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={receivedDate}
              mode="date"
              display="default"
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (d) setReceivedDate(d);
              }}
            />
          )}
        </View>

        <FormField
          label="Notes (Optional)"
          value={receivedNotes}
          onChangeText={setReceivedNotes}
          placeholder="Additional notes"
          multiline
        />

        <POReceiptSummary updates={inventoryUpdates} />

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={saving || !invoiceFile}
          className={`mt-6 rounded-[10px] h-[50px] items-center justify-center ${
            saving || !invoiceFile ? 'bg-[#94A3B8]' : 'bg-[#1E40AF]'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-[15px] font-semibold text-white">
              CONFIRM & UPDATE INVENTORY
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
};
