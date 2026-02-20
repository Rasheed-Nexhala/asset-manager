import React, { useState } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { addToMaintenanceThunk } from '../../store/thunks/maintenanceThunks';
import { AddToMaintenanceData } from '../../types/maintenance';

interface QuickMoveToMaintenanceButtonProps {
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  issueDescription: string;
  sourceRequestId: string;
  sourceReturnDate: Date;
  onSuccess?: () => void;
}

export default function QuickMoveToMaintenanceButton({
  itemId,
  itemName,
  itemSku,
  quantity,
  issueDescription,
  sourceRequestId,
  sourceReturnDate,
  onSuccess,
}: QuickMoveToMaintenanceButtonProps) {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);
  const [loading, setLoading] = useState(false);
  
  const handleQuickMove = () => {
    Alert.alert(
      'Move to Maintenance',
      `Move ${quantity} ${itemName} to maintenance?\n\nThis will remove the item from available inventory and track it in the maintenance system.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Move to Maintenance',
          style: 'destructive',
          onPress: async () => {
            if (!userId || !userName) {
              Alert.alert('Error', 'User information not available');
              return;
            }
            
            setLoading(true);
            
            try {
              const maintenanceData: AddToMaintenanceData = {
                itemId,
                itemName,
                itemSku,
                quantity,
                issueType: 'physical_damage', // Default for damaged returns
                issueDescription,
                sourceRequestId,
                sourceReturnDate,
              };
              
              await dispatch(
                addToMaintenanceThunk({
                  data: maintenanceData,
                  userId,
                  userName,
                })
              ).unwrap();
              
              Alert.alert('Success', 'Item moved to maintenance successfully');
              onSuccess?.();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to move item to maintenance');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  return (
    <TouchableOpacity
      className={`rounded-lg px-4 py-2.5 flex-row items-center justify-center gap-2 ${
        loading ? 'bg-[#D97706]/70' : 'bg-[#D97706]'
      }`}
      onPress={handleQuickMove}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityLabel={loading ? 'Moving to maintenance, please wait' : 'Move to maintenance'}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text className="text-[14px] font-semibold text-white">Please wait…</Text>
        </>
      ) : (
        <>
          <Ionicons name="construct" size={18} color="#FFFFFF" />
          <Text className="text-[14px] font-semibold text-white">
            Move to Maintenance
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
