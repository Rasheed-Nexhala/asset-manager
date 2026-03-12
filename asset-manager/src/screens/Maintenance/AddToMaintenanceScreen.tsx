import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import ItemSelectorForMaintenance from '../../components/Maintenance/ItemSelectorForMaintenance';
import IssueTypeSelector from '../../components/Maintenance/IssueTypeSelector';
import { addToMaintenanceThunk } from '../../store/thunks/maintenanceThunks';
import {
  selectUserId,
  selectUserDisplayName,
} from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  isWeightBasedItem,
  kgToPieces,
  tonToKg,
  getConversionErrorMessage,
  piecesToKg,
  formatWeight,
} from '../../utils/weightConversionUtils';
import type { Item } from '../../types/inventory';
import type { IssueType, AddToMaintenanceData } from '../../types/maintenance';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';

type NavigationProp = StackNavigationProp<MaintenanceStackParamList, 'AddToMaintenance'>;
type RouteParamsProp = RouteProp<MaintenanceStackParamList, 'AddToMaintenance'>;

const MAX_PHOTOS = 5;

interface FormErrors {
  item?: string;
  quantity?: string;
  issueType?: string;
  description?: string;
}

export const AddToMaintenanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParamsProp>();
  const dispatch = useAppDispatch();
  
  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  
  // Form state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Weight & Quantity state
  const isSteelItem = selectedItem ? isWeightBasedItem(selectedItem) : false;
  const hasFullWeightConfig =
    isSteelItem &&
    selectedItem?.weightPerMeter != null &&
    selectedItem?.lengthPerPiece != null;

  const [entryMode, setEntryMode] = useState<'pieces' | 'kg' | 'ton'>('pieces');
  const [amountStr, setAmountStr] = useState('1');
  const [quantity, setQuantity] = useState(1);

  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      ImagePicker.requestMediaLibraryPermissionsAsync().then(({ status }) => {
        if (status !== 'granted') {
          console.warn('Image picker permission not granted');
        }
      });
    }
  }, []);

  const appliedSelectionRef = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const params = route.params;
      const item = params?.selectedItem;
      if (item && appliedSelectionRef.current !== item.id) {
        appliedSelectionRef.current = item.id;
        setSelectedItem(item);
        setAmountStr('1');
        setQuantity(1);
        setEntryMode('pieces');
        setErrors((prev) => (prev.item ? { ...prev, item: undefined } : prev));
      }
      if (!item) {
        appliedSelectionRef.current = null;
      }
    }, [route.params])
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!selectedItem) {
      newErrors.item = 'Please select an item';
    }
    
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      newErrors.quantity = 'Please enter a valid positive amount';
    } else {
      const isDiscreteUnit = (unit: string) => ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(unit);
      if (entryMode === 'pieces' || !hasFullWeightConfig) {
        if (entryMode === 'pieces' && hasFullWeightConfig && !Number.isInteger(num)) {
          newErrors.quantity = 'Pieces must be a whole number';
        } else if (!hasFullWeightConfig && isDiscreteUnit(selectedItem?.unit || '') && !Number.isInteger(num)) {
          newErrors.quantity = `Quantity in ${selectedItem?.unit} must be a whole number`;
        } else if (num > (selectedItem?.centralStoreQuantity || 0)) {
          newErrors.quantity = `Cannot exceed available quantity (${selectedItem?.centralStoreQuantity})`;
        }
      } else {
        // Weight mode validation
        const kg = entryMode === 'ton' ? tonToKg(num) : num;
        const res = kgToPieces(kg, selectedItem!.weightPerMeter!, selectedItem!.lengthPerPiece!);
        if (!res.isExact) {
          newErrors.quantity = getConversionErrorMessage(kg, selectedItem!.weightPerMeter!, selectedItem!.lengthPerPiece!);
        } else if (res.pieces > (selectedItem?.centralStoreQuantity || 0)) {
          newErrors.quantity = `Cannot exceed available quantity (${selectedItem?.centralStoreQuantity} pieces)`;
        }
      }
    }
    
    if (!issueType) {
      newErrors.issueType = 'Please select issue type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleModeChange = useCallback((m: 'pieces' | 'kg' | 'ton') => {
    setEntryMode(m);
    setErrors((prev) => ({ ...prev, quantity: undefined }));
    if (quantity > 0 && hasFullWeightConfig) {
      if (m === 'pieces') {
        setAmountStr(String(quantity));
      } else if (m === 'kg') {
        setAmountStr(String(piecesToKg(quantity, selectedItem!.weightPerMeter!, selectedItem!.lengthPerPiece!)));
      } else if (m === 'ton') {
        setAmountStr(String(piecesToKg(quantity, selectedItem!.weightPerMeter!, selectedItem!.lengthPerPiece!) / 1000));
      }
    } else if (quantity > 0) {
      setAmountStr(String(quantity));
    } else {
      setAmountStr('');
    }
  }, [quantity, hasFullWeightConfig, selectedItem]);
  
  const handleAmountChange = (text: string) => {
    setAmountStr(text);
    if (!text.trim()) {
      setQuantity(0);
      setErrors((prev) => ({ ...prev, quantity: undefined }));
      return;
    }

    const num = parseFloat(text);
    if (isNaN(num) || num < 0) {
      setErrors((prev) => ({ ...prev, quantity: 'Invalid amount' }));
      return;
    }

    const isDiscreteUnit = (unit: string) => ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(unit);
    if (entryMode === 'pieces' || !hasFullWeightConfig) {
      if (entryMode === 'pieces' && hasFullWeightConfig && !Number.isInteger(num)) {
        setErrors((prev) => ({ ...prev, quantity: 'Pieces must be a whole number' }));
        return;
      }
      if (!hasFullWeightConfig && isDiscreteUnit(selectedItem?.unit || '') && !Number.isInteger(num)) {
        setErrors((prev) => ({ ...prev, quantity: `Quantity in ${selectedItem?.unit} must be a whole number` }));
        return;
      }
      setErrors((prev) => ({ ...prev, quantity: undefined }));
      setQuantity(num);
    } else {
      const kg = entryMode === 'ton' ? tonToKg(num) : num;
      const res = kgToPieces(kg, selectedItem!.weightPerMeter!, selectedItem!.lengthPerPiece!);
      if (!res.isExact) {
        setErrors((prev) => ({ ...prev, quantity: getConversionErrorMessage(kg, selectedItem!.weightPerMeter!, selectedItem!.lengthPerPiece!) }));
      } else {
        setErrors((prev) => ({ ...prev, quantity: undefined }));
        setQuantity(res.pieces);
      }
    }
  };

  const handleDecrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    if (quantity > 1) {
      const newQty = quantity - 1;
      setAmountStr(String(newQty));
      setQuantity(newQty);
      setErrors((prev) => ({ ...prev, quantity: undefined }));
    }
  };
  
  const handleIncrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    const maxQuantity = selectedItem?.centralStoreQuantity || 0;
    if (quantity < maxQuantity) {
      const newQty = quantity + 1;
      setAmountStr(String(newQty));
      setQuantity(newQty);
      setErrors((prev) => ({ ...prev, quantity: undefined }));
    }
  };
  
  const handleIssueTypeSelect = (type: IssueType) => {
    setIssueType(type);
    if (errors.issueType) {
      setErrors({ ...errors, issueType: undefined });
    }
  };
  
  const handleDescriptionChange = (text: string) => setDescription(text);

  const handleImagePick = useCallback(async () => {
    if (photoUris.length >= MAX_PHOTOS) return;
    try {
      setImageLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        setPhotoUris((prev) =>
          prev.length < MAX_PHOTOS ? [...prev, uri] : prev
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setImageLoading(false);
    }
  }, [photoUris.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (!selectedItem || !issueType || !userId || !userName) {
      Alert.alert('Error', 'Missing required information');
      return;
    }
    
    setIsSubmitting(true);
    
    const data: AddToMaintenanceData = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      itemSku: selectedItem.sku,
      quantity, // Submitting the perfectly exact integer pieces
      issueType,
      issueDescription: description.trim() || '',
      reportedBy: reportedBy.trim() || undefined,
      reportedByName: reportedBy.trim() || undefined,
      photos: [],
    };
    
    try {
      await dispatch(
        addToMaintenanceThunk({
          data,
          userId,
          userName,
          photoUris: photoUris.length > 0 ? photoUris : undefined,
        })
      ).unwrap();

      Alert.alert(
        'Success',
        'Item has been added to maintenance',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MaintenanceDashboard'),
          },
        ]
      );

      // Reset form
      setSelectedItem(null);
      setAmountStr('1');
      setQuantity(1);
      setEntryMode('pieces');
      setIssueType(null);
      setDescription('');
      setReportedBy('');
      setPhotoUris([]);
      setErrors({});
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add item to maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ScreenLayout edges={['top']} keyboardAware>
      <ScreenHeader title="Add to Maintenance" showBack onBackPress={handleBack} />
      
      <ScrollView className="flex-1 px-4">
        <View className="gap-4 py-4">
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Item <Text className="text-[#DC2626]">*</Text>
            </Text>
            <ItemSelectorForMaintenance
              selectedItemId={selectedItem?.id}
              selectedItem={selectedItem}
            />
            {errors.item && (
              <Text className="text-[13px] text-[#DC2626]">{errors.item}</Text>
            )}
          </View>
          
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Quantity <Text className="text-[#DC2626]">*</Text>
            </Text>

            {hasFullWeightConfig && (
              <View className="flex-row gap-3 mb-2">
                {(['pieces', 'kg', 'ton'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    className={`flex-1 h-10 rounded-lg border items-center justify-center ${
                      entryMode === m
                        ? 'bg-[#1E40AF] border-[#1E40AF]'
                        : 'bg-white border-[#E2E8F0]'
                    }`}
                    onPress={() => handleModeChange(m)}
                    disabled={isSubmitting}
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        entryMode === m ? 'text-white' : 'text-[#0F172A]'
                      }`}
                    >
                      {m === 'pieces' ? 'Pcs' : m === 'kg' ? 'Kg' : 'Ton'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className="flex-row items-center gap-3">
              {(!hasFullWeightConfig || entryMode === 'pieces') && (
                <TouchableOpacity
                  className="w-12 h-12 border border-[#E2E8F0] rounded-full items-center justify-center bg-white"
                  onPress={handleDecrement}
                  disabled={quantity <= 1 || isSubmitting}
                  accessibilityLabel="Decrease quantity"
                  accessibilityRole="button"
                >
                  <Text className="text-[#1E40AF] text-xl font-semibold">−</Text>
                </TouchableOpacity>
              )}
              
              <TextInput
                className={`border rounded-lg h-12 px-4 bg-white flex-1 text-center text-xl font-bold text-[#0F172A] ${errors.quantity ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
                value={amountStr}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                editable={!isSubmitting}
                accessibilityLabel="Quantity amount"
              />
              
              {(!hasFullWeightConfig || entryMode === 'pieces') && (
                <TouchableOpacity
                  className="w-12 h-12 border border-[#1E40AF] rounded-full items-center justify-center bg-[#1E40AF]"
                  onPress={handleIncrement}
                  disabled={
                    !selectedItem ||
                    quantity >= (selectedItem.centralStoreQuantity || 0) ||
                    isSubmitting
                  }
                  accessibilityLabel="Increase quantity"
                  accessibilityRole="button"
                >
                  <Text className="text-white text-xl font-semibold">+</Text>
                </TouchableOpacity>
              )}
            </View>

            {hasFullWeightConfig && !errors.quantity && quantity > 0 && entryMode !== 'pieces' && (
               <Text className="text-[13px] text-[#16A34A] mt-1 font-medium">
                 = {quantity} pieces
               </Text>
            )}
            {hasFullWeightConfig && !errors.quantity && quantity > 0 && entryMode === 'pieces' && (
               <Text className="text-[13px] text-[#64748B] mt-1">
                 ≈ {formatWeight(piecesToKg(quantity, selectedItem!.weightPerMeter!, selectedItem!.lengthPerPiece!), 'Kg')}
               </Text>
            )}

            {errors.quantity && (
              <Text className="text-[13px] text-[#DC2626]">{errors.quantity}</Text>
            )}
          </View>
          
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Issue Type <Text className="text-[#DC2626]">*</Text>
            </Text>
            <IssueTypeSelector
              value={issueType}
              onSelect={handleIssueTypeSelect}
              error={errors.issueType}
              disabled={isSubmitting}
            />
          </View>
          
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Description</Text>
            <TextInput
              className="border border-[#E2E8F0] rounded-lg px-4 py-3 bg-white text-[15px] text-[#0F172A]"
              placeholder="Describe the issue in detail (optional)"
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={handleDescriptionChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
              maxLength={500}
            />
            <Text className="text-[13px] text-[#64748B] ml-auto">
              {description.length}/500
            </Text>
          </View>
          
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Reported By</Text>
            <TextInput
              className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px] text-[#0F172A]"
              placeholder="Name of person reporting the issue (optional)"
              placeholderTextColor="#94A3B8"
              value={reportedBy}
              onChangeText={setReportedBy}
              editable={!isSubmitting}
            />
          </View>
          
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">Photos (Optional)</Text>
            <View className="flex-row flex-wrap gap-2">
              {photoUris.map((uri, index) => (
                <View
                  key={`${uri}-${index}`}
                  className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#F1F5F9]"
                >
                  <Image
                    source={{ uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#DC2626] items-center justify-center"
                    onPress={() => handleRemovePhoto(index)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {photoUris.length < MAX_PHOTOS && (
                <TouchableOpacity
                  className="w-20 h-20 border border-[#E2E8F0] border-dashed rounded-lg items-center justify-center bg-[#F8FAFC]"
                  onPress={handleImagePick}
                  disabled={isSubmitting || imageLoading}
                >
                  {imageLoading ? (
                    <ActivityIndicator size="small" color="#1E40AF" />
                  ) : (
                    <Ionicons name="camera-outline" size={28} color="#1E40AF" />
                  )}
                  <Text className="text-[11px] text-[#64748B] mt-1">Add</Text>
                </TouchableOpacity>
              )}
            </View>
            {photoUris.length > 0 && (
              <Text className="text-[12px] text-[#64748B]">
                {photoUris.length}/{MAX_PHOTOS} photos
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            className={`bg-[#1E40AF] rounded-[10px] h-[50px] items-center justify-center mt-2 ${
              isSubmitting ? 'opacity-50' : ''
            }`}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.7}
            accessibilityLabel="Add to maintenance"
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-[15px] font-semibold text-white">
                Add to Maintenance
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};
