import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setSelectedMaintenance,
  updateMaintenanceInState,
  clearError,
} from '../../store/slices/maintenanceSlice';
import {
  selectMaintenanceById,
  selectMaintenanceError,
} from '../../store/selectors/maintenanceSelectors';
import { subscribeToMaintenanceById } from '../../services/firebase/maintenanceService';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import type {
  MaintenanceStatus,
  IssueType,
  WriteOffReason,
  MaintenancePhoto,
} from '../../types/maintenance';
import type { MaintenanceStackParamList } from '../../navigation/MaintenanceStackParamList';

/** Thumbnail that shows a placeholder if the image fails to load or URL is missing. Tappable to expand. */
function PhotoThumbnail({
  photo,
  onPress,
}: {
  photo: MaintenancePhoto;
  onPress?: (uri: string) => void;
}) {
  const [error, setError] = useState(false);
  const uri = photo?.url?.trim();
  if (!uri) {
    return (
      <View className="w-32 h-32 rounded-lg bg-[#F1F5F9] items-center justify-center">
        <Ionicons name="image-outline" size={32} color="#94A3B8" />
        <Text className="text-[11px] text-[#64748B] mt-1">No image</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="w-32 h-32 rounded-lg bg-[#F1F5F9] items-center justify-center">
        <Ionicons name="alert-circle-outline" size={32} color="#94A3B8" />
        <Text className="text-[11px] text-[#64748B] mt-1">Failed to load</Text>
      </View>
    );
  }
  const content = (
    <Image
      source={{ uri }}
      className="w-full h-full"
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
  return (
    <View className="w-32 h-32 rounded-lg bg-[#F1F5F9] overflow-hidden">
      {onPress ? (
        <TouchableOpacity
          className="w-full h-full"
          onPress={() => onPress(uri)}
          activeOpacity={0.9}
          accessibilityLabel="View full size photo"
          accessibilityRole="button"
        >
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
}

type NavigationProp = StackNavigationProp<MaintenanceStackParamList, 'MaintenanceDetail'>;
type RouteParamsProp = RouteProp<MaintenanceStackParamList, 'MaintenanceDetail'>;

// Issue type labels
const issueTypeLabels: Record<IssueType, string> = {
  motor_electrical: 'Motor/Electrical',
  physical_damage: 'Physical Damage',
  wear_and_tear: 'Wear and Tear',
  missing_parts: 'Missing Parts',
  other: 'Other',
};

// Write-off reason labels
const writeOffReasonLabels: Record<WriteOffReason, string> = {
  beyond_repair: 'Beyond Repair',
  high_repair_cost: 'High Repair Cost',
  obsolete: 'Obsolete',
  lost_stolen: 'Lost/Stolen',
  other: 'Other',
};

// Status badges
const statusConfig: Record<MaintenanceStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-[#D97706]/15', text: 'text-[#D97706]', label: 'Pending' },
  partial_return: { bg: 'bg-[#8B5CF6]/15', text: 'text-[#8B5CF6]', label: 'Partial Return' },
  returned: { bg: 'bg-[#16A34A]/15', text: 'text-[#16A34A]', label: 'Returned' },
  written_off: { bg: 'bg-[#DC2626]/15', text: 'text-[#DC2626]', label: 'Written Off' },
};

// Format date helper
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * MaintenanceDetailScreen
 * 
 * Displays detailed information about a maintenance record including:
 * - Item card with image, name, SKU, quantity
 * - Issue details section
 * - Photos gallery (if any)
 * - Status timeline/updates section
 * - Action buttons based on status
 */
export const MaintenanceDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParamsProp>();
  const dispatch = useAppDispatch();
  const { maintenanceId } = route.params;

  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const maintenance = useAppSelector((state) => selectMaintenanceById(maintenanceId)(state));
  const error = useAppSelector(selectMaintenanceError);

  const [expandedPhotoUri, setExpandedPhotoUri] = useState<string | null>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const insets = useSafeAreaInsets();

  // Snapshot-based real-time subscription to this maintenance record
  useEffect(() => {
    if (!maintenanceId) return;
    const unsubscribe = subscribeToMaintenanceById(maintenanceId, (record) => {
      if (record) {
        dispatch(setSelectedMaintenance(record));
        dispatch(updateMaintenanceInState(record));
      } else {
        dispatch(setSelectedMaintenance(null));
      }
    });
    return () => {
      unsubscribe();
      dispatch(setSelectedMaintenance(null));
    };
  }, [dispatch, maintenanceId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleReturnToInventory = useCallback(() => {
    if (!maintenanceId) return;
    navigation.navigate('ReturnFromMaintenance', { maintenanceId });
  }, [navigation, maintenanceId]);

  const handleWriteOff = useCallback(() => {
    if (!maintenanceId) return;
    navigation.navigate('WriteOff', { maintenanceId });
  }, [navigation, maintenanceId]);

  useAutoClearError(error, () => dispatch(clearError()));

  // Status-based action buttons
  const actionButtons = useMemo(() => {
    if (!maintenance) return null;

    const { status } = maintenance;

    // Read-only states
    if (status === 'returned' || status === 'written_off') {
      return null;
    }

    // Active states (pending or partial_return): Show Return and Write Off
    return (
      <View className="mb-6 mt-2 gap-3">
        <TouchableOpacity
          className="bg-[#16A34A] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
          onPress={handleReturnToInventory}
          activeOpacity={0.7}
          accessibilityLabel="Return to inventory"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-undo" size={20} color="#FFFFFF" />
          <Text className="text-[15px] font-semibold text-white">Return to Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-[#DC2626] rounded-[10px] h-[50px] items-center justify-center flex-row gap-2"
          onPress={handleWriteOff}
          activeOpacity={0.7}
          accessibilityLabel="Write off item"
          accessibilityRole="button"
        >
          <Ionicons name="trash" size={20} color="#FFFFFF" />
          <Text className="text-[15px] font-semibold text-white">Write Off</Text>
        </TouchableOpacity>
      </View>
    );
  }, [maintenance, handleReturnToInventory, handleWriteOff]);

  // Loading state (waiting for snapshot or initial load)
  if (maintenanceId && !maintenance && !error) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Maintenance Details" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[15px] text-[#64748B] mt-4">Loading maintenance record...</Text>
        </View>
      </ScreenLayout>
    );
  }

  // Error state
  if (error && !maintenance) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Maintenance Details" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
            Error Loading Record
          </Text>
          <Text className="text-[15px] text-[#64748B] mt-2 text-center">{error}</Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center mt-6"
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // Not found state
  if (!maintenance) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Maintenance Details" showBack onBackPress={handleBack} />
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons name="build-outline" size={48} color="#94A3B8" />
          <Text className="text-[17px] font-semibold text-[#0F172A] mt-4 text-center">
            Record Not Found
          </Text>
          <Text className="text-[15px] text-[#64748B] mt-2 text-center">
            This maintenance record doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            className="bg-[#1E40AF] rounded-[10px] h-[50px] px-6 items-center justify-center mt-6"
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  const statusInfo = statusConfig[maintenance.status] ?? {
    bg: 'bg-[#475569]/15',
    text: 'text-[#475569]',
    label: 'Unknown',
  };

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Maintenance Details" showBack onBackPress={handleBack} />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Item Information Card */}
        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 mt-4">
          {/* Status Badge */}
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[17px] font-semibold text-[#0F172A]">Item Information</Text>
            <View className={`px-2 py-1 rounded-full ${statusInfo.bg}`}>
              <Text className={`text-[12px] font-medium ${statusInfo.text}`}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Item Name and SKU */}
          <View className="mb-3">
            <Text className="text-[15px] font-semibold text-[#0F172A] mb-1">
              {maintenance.itemName}
            </Text>
            <Text className="text-[13px] text-[#64748B]">SKU: {maintenance.itemSku}</Text>
          </View>

          {/* Quantity */}
          <View className="flex-row justify-between items-center">
            <Text className="text-[13px] text-[#64748B]">Quantity in Maintenance</Text>
            <Text className="text-[15px] font-semibold text-[#0F172A]">
              {maintenance.quantity}
            </Text>
          </View>
        </View>

        {/* Issue Details Section */}
        <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
          <Text className="text-[17px] font-semibold text-[#0F172A] mb-4">Issue Details</Text>

          <View className="gap-4">
            {/* Issue Type */}
            <View>
              <Text className="text-[13px] text-[#64748B] mb-1">Issue Type</Text>
              <Text className="text-[15px] text-[#0F172A]">
                {issueTypeLabels[maintenance.issueType]}
              </Text>
            </View>

            {/* Issue Description */}
            <View>
              <Text className="text-[13px] text-[#64748B] mb-1">Description</Text>
              <Text className="text-[15px] text-[#0F172A]">
                {maintenance.issueDescription?.trim() || 'No description'}
              </Text>
            </View>

            {/* Reported By */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[13px] text-[#64748B]">Reported By</Text>
              <Text className="text-[15px] text-[#0F172A]">
                {maintenance.reportedByName}
              </Text>
            </View>

            {/* Reported Date */}
            <View className="flex-row justify-between items-center">
              <Text className="text-[13px] text-[#64748B]">Reported On</Text>
              <Text className="text-[15px] text-[#0F172A]">
                {formatDate(maintenance.addedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Photos Gallery (if any) */}
        {maintenance.photos && maintenance.photos.length > 0 && (
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {maintenance.photos.map((photo, index) => (
                <PhotoThumbnail
                  key={`${photo.fileName}-${index}`}
                  photo={photo}
                  onPress={(uri) => setExpandedPhotoUri(uri)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Full-screen image modal */}
        <Modal
          visible={!!expandedPhotoUri}
          transparent
          animationType="fade"
          onRequestClose={() => setExpandedPhotoUri(null)}
        >
          <Pressable
            className="flex-1 bg-black/90 justify-center items-center"
            onPress={() => setExpandedPhotoUri(null)}
            style={{ width: screenWidth, height: screenHeight }}
          >
            {expandedPhotoUri && (
              <>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                  className="flex-1 justify-center items-center w-full"
                >
                  <Image
                    source={{ uri: expandedPhotoUri }}
                    style={{
                      width: screenWidth,
                      height: screenHeight * 0.8,
                    }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className="absolute right-4 min-w-[48px] min-h-[48px] w-12 h-12 rounded-full bg-white/20 items-center justify-center"
                  style={{ top: insets.top + 8 }}
                  onPress={() => setExpandedPhotoUri(null)}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Modal>

        {/* Return/Write-off Information (if applicable) */}
        {maintenance.status === 'returned' && (
          <View className="bg-[#F0FDF4] rounded-[10px] p-4 border border-[#16A34A]/30 mb-3">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="arrow-undo" size={20} color="#16A34A" />
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Return Information
              </Text>
            </View>

            <View className="gap-3">
              {maintenance.returnedQuantity && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[13px] text-[#64748B]">Returned Quantity</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {maintenance.returnedQuantity}
                  </Text>
                </View>
              )}

              {maintenance.repairSummary && (
                <View>
                  <Text className="text-[13px] text-[#64748B] mb-1">Repair Summary</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {maintenance.repairSummary}
                  </Text>
                </View>
              )}

              {maintenance.repairCost && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[13px] text-[#64748B]">Repair Cost</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    ₹{maintenance.repairCost.toLocaleString()}
                  </Text>
                </View>
              )}

              {maintenance.repairedBy && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[13px] text-[#64748B]">Repaired By</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {maintenance.repairedBy}
                  </Text>
                </View>
              )}

              {maintenance.returnedAt && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[13px] text-[#64748B]">Returned On</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {formatDate(maintenance.returnedAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {maintenance.status === 'written_off' && (
          <View className="bg-[#FEF2F2] rounded-[10px] p-4 border border-[#DC2626]/30 mb-3">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="close-circle" size={20} color="#DC2626" />
              <Text className="text-[17px] font-semibold text-[#0F172A]">
                Write-Off Information
              </Text>
            </View>

            <View className="gap-3">
              {maintenance.writeOffReason && (
                <View>
                  <Text className="text-[13px] text-[#64748B] mb-1">Reason</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {writeOffReasonLabels[maintenance.writeOffReason]}
                  </Text>
                </View>
              )}

              {maintenance.writeOffExplanation && (
                <View>
                  <Text className="text-[13px] text-[#64748B] mb-1">Explanation</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {maintenance.writeOffExplanation}
                  </Text>
                </View>
              )}

              {maintenance.writtenOffAt && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-[13px] text-[#64748B]">Written Off On</Text>
                  <Text className="text-[15px] text-[#0F172A]">
                    {formatDate(maintenance.writtenOffAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Status Timeline/Updates Section */}
        {maintenance.updates && maintenance.updates.length > 0 && (
          <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3">
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-3">
              Status Updates
            </Text>

            {maintenance.updates.map((update, index) => (
              <View
                key={index}
                className={`pb-3 mb-3 ${
                  index < maintenance.updates.length - 1 ? 'border-b border-[#E2E8F0]' : ''
                }`}
              >
                <View className="flex-row justify-between items-start mb-1">
                  <Text className="text-[15px] font-medium text-[#0F172A]">
                    {update.addedByName}
                  </Text>
                  <Text className="text-[13px] text-[#64748B]">
                    {formatDate(typeof update.addedAt === 'string' ? update.addedAt : new Date().toISOString())}
                  </Text>
                </View>
                <Text className="text-[15px] text-[#0F172A]">{update.note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {actionButtons}
      </ScrollView>
    </ScreenLayout>
  );
};
