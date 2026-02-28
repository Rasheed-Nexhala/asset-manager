import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import {
  subscribeToNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../services/firebase/notificationService';
import { useAppSelector } from '../../store/hooks';
import { selectUserId } from '../../store/selectors/authSelectors';

export const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const userId = useAppSelector(selectUserId);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, setNotifications);
    return () => unsubscribe();
  }, [userId]);

  const handleNotificationPress = useCallback(
    async (item: NotificationItem) => {
      if (!userId) return;
      await markNotificationRead(userId, item.id);
      const data = item.data as {
        requestId?: string;
        poId?: string;
        screen?: string;
        maintenanceId?: string;
        itemId?: string;
      } | undefined;
      const nav = navigation as {
        navigate: (name: string, params?: object) => void;
      };
      if (data?.requestId && data?.screen === 'ProcessRequest') {
        nav.navigate('Tabs', {
          screen: 'Requests',
          params: {
            screen: 'ProcessRequest',
            params: { requestId: data.requestId },
          },
        });
      } else if (
        (data?.screen === 'ApprovePO' || data?.screen === 'ReceivePO') &&
        data?.poId
      ) {
        nav.navigate('Tabs', {
          screen: 'PurchaseOrders',
          params: {
            screen: data.screen,
            params: { poId: data.poId },
          },
        });
      } else if (data?.screen === 'PurchaseOrderList') {
        nav.navigate('Tabs', {
          screen: 'PurchaseOrders',
          params: { screen: 'PurchaseOrderList' },
        });
      } else if (data?.screen === 'RequestQueue') {
        nav.navigate('Tabs', {
          screen: 'Requests',
          params: { screen: 'RequestQueue' },
        });
      } else if (data?.screen === 'MaintenanceDetail' && data?.maintenanceId) {
        nav.navigate('Tabs', {
          screen: 'Inventory',
          params: {
            screen: 'Maintenance',
            params: {
              screen: 'MaintenanceDetail',
              params: { maintenanceId: data.maintenanceId },
            },
          },
        });
      } else if (data?.screen === 'Maintenance' && data?.maintenanceId) {
        nav.navigate('Tabs', {
          screen: 'Inventory',
          params: {
            screen: 'Maintenance',
            params: {
              screen: 'MaintenanceDetail',
              params: { maintenanceId: data.maintenanceId },
            },
          },
        });
      } else if (data?.screen === 'Maintenance') {
        nav.navigate('Tabs', {
          screen: 'Inventory',
          params: { screen: 'Maintenance' },
        });
      } else if (data?.screen === 'ItemDetail' && data?.itemId) {
        nav.navigate('Tabs', {
          screen: 'Inventory',
          params: {
            screen: 'ItemDetail',
            params: { itemId: data.itemId },
          },
        });
      } else if (data?.screen === 'Users') {
        nav.navigate('Tabs', {
          screen: 'Dashboard',
          params: { screen: 'Users' },
        });
      } else {
        nav.navigate('Tabs', {
          screen: 'Requests',
          params: { screen: 'RequestQueue' },
        });
      }
    },
    [userId, navigation]
  );

  const renderItem: ListRenderItem<NotificationItem> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        className={`bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 mx-4 ${!item.read ? 'opacity-100' : 'opacity-80'}`}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start">
          <View className="w-2 h-2 mt-2 mr-2 flex-shrink-0">
            {!item.read && (
              <View className="w-2 h-2 rounded-full bg-[#1E40AF]" />
            )}
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-[#0F172A]" numberOfLines={1}>
              {item.title}
            </Text>
            <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleNotificationPress]
  );

  const keyExtractor = useCallback((item: NotificationItem) => item.id, []);

  if (!userId) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader
          title="Notifications"
          showBack
          onBackPress={() => navigation.goBack()}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-gray-600 text-center">
            Sign in to see notifications
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader
        title="Notifications"
        showBack
        onBackPress={() => navigation.goBack()}
      />
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          notifications.length === 0 ? { flexGrow: 1 } : { paddingTop: 16, paddingBottom: 24 }
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 pt-16">
            <Text className="text-base text-gray-600 text-center">
              No notifications yet
            </Text>
          </View>
        }
      />
    </ScreenLayout>
  );
};
