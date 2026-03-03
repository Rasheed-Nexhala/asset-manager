import React, { useState, useCallback, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
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
import type { Item } from '../../types/inventory';
import type { IssueType, AddToMaintenanceData } from '../../types/maintenance';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';

type NavigationProp = StackNavigationProp<MaintenanceStackParamList, 'AddToMaintenance'>;

const MAX_PHOTOS = 5;

interface FormErrors {
  item?: string;
  quantity?: string;
  issueType?: string;
  description?: string;
}

export const AddToMaintenanceScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  
  // Form state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!selectedItem) {
      newErrors.item = 'Please select an item';
    }
    
    if (quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    if (selectedItem && quantity > (selectedItem.centralStoreQuantity || 0)) {
      newErrors.quantity = `Cannot exceed available quantity (${selectedItem.centralStoreQuantity})`;
    }
    
    if (!issueType) {
      newErrors.issueType = 'Please select issue type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle quantity changes
  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
      if (errors.quantity) {
        setErrors({ ...errors, quantity: undefined });
      }
    }
  };
  
  const handleIncrement = () => {
    const maxQuantity = selectedItem?.centralStoreQuantity || 0;
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
      if (errors.quantity) {
        setErrors({ ...errors, quantity: undefined });
      }
    }
  };
  
  const handleQuantityChange = (text: string) => {
    const value = parseInt(text, 10);
    if (!isNaN(value) && value > 0) {
      setQuantity(value);
      if (errors.quantity) {
        setErrors({ ...errors, quantity: undefined });
      }
    } else if (text === '') {
      setQuantity(0);
    }
  };
  
  // Handle item selection
  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setQuantity(1);
    if (errors.item) {
      setErrors({ ...errors, item: undefined });
    }
  };
  
  // Handle issue type selection
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

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!selectedItem || !issueType || !userId || !userName) {
      Alert.alert('Error', 'Missing required information');
      return;
    }
    
    setIsSubmitting(true);
    
    const data: AddToMaintenanceData = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      itemSku: selectedItem.sku,
      quantity,
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
            onPress: () => navigation.goBack(),
          },
        ]
      );

      // Reset form
      setSelectedItem(null);
      setQuantity(1);
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
          {/* Item Selector */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Item <Text className="text-[#DC2626]">*</Text>
            </Text>
            <ItemSelectorForMaintenance
              onSelect={handleItemSelect}
              selectedItemId={selectedItem?.id}
            />
            {errors.item && (
              <Text className="text-[13px] text-[#DC2626]">{errors.item}</Text>
            )}
          </View>
          
          {/* Quantity Input */}
          <View className="gap-1.5">
            <Text className="text-[15px] text-[#0F172A]">
              Quantity <Text className="text-[#DC2626]">*</Text>
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="w-12 h-12 border border-[#E2E8F0] rounded-full items-center justify-center bg-white"
                onPress={handleDecrement}
                disabled={quantity <= 1 || isSubmitting}
                accessibilityLabel="Decrease quantity"
                accessibilityRole="button"
              >
                <Text className="text-[#1E40AF] text-xl font-semibold">−</Text>
              </TouchableOpacity>
              
              <TextInput
                className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white flex-1 text-center text-xl font-bold text-[#0F172A]"
                value={quantity.toString()}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
              
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
            </View>
            {errors.quantity && (
              <Text className="text-[13px] text-[#DC2626]">{errors.quantity}</Text>
            )}
          </View>
          
          {/* Issue Type Selector */}
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
          
          {/* Description Input (Optional) */}
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
          
          {/* Reported By Input (Optional) */}
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
          
          {/* Photos (Optional) */}
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
                    accessibilityLabel={`Photo ${index + 1}`}
                  />
                  <TouchableOpacity
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#DC2626] items-center justify-center"
                    onPress={() => handleRemovePhoto(index)}
                    disabled={isSubmitting}
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    accessibilityRole="button"
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
                  accessibilityLabel="Add photo"
                  accessibilityRole="button"
                >
                  {imageLoading ? (
                    <ActivityIndicator size="small" color="#1E40AF" />
                  ) : (
                    <Ionicons name="camera-outline" size={28} color="#1E40AF" />
                  )}
                  <Text className="text-[11px] text-[#64748B] mt-1">
                    Add
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {photoUris.length > 0 && (
              <Text className="text-[12px] text-[#64748B]">
                {photoUris.length}/{MAX_PHOTOS} photos
              </Text>
            )}
          </View>
          
          {/* Submit Button */}
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
