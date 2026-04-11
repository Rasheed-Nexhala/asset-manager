import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeAssignmentsByRequestId } from '../../services/firebase/vehicleFuelAssignmentService';
import type { VehicleFuelAssignment } from '../../types/vehicleFuelAssignment';

type Props = {
  requestId: string;
  tabNavigation: {
    navigate: (name: string, params?: { screen?: string; params?: Record<string, unknown> }) => void;
  };
};

export const VehicleFuelAllocationsSection: React.FC<Props> = ({ requestId, tabNavigation }) => {
  const [rows, setRows] = useState<VehicleFuelAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAssignmentsByRequestId(requestId, (list) => {
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, [requestId]);

  if (loading) {
    return (
      <View className="bg-[#F8FAFC] rounded-[10px] p-3 border border-[#E2E8F0]">
        <View className="bg-white rounded-[10px] p-8 border border-[#E2E8F0] items-center justify-center min-h-[120px]">
          <ActivityIndicator size="small" color="#1E40AF" />
          <Text className="text-[13px] text-[#64748B] mt-3">Loading fuel dispensed…</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-[#F8FAFC] rounded-[10px] p-3 border border-[#E2E8F0]">
      <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0]">
        <View className="flex-row flex-wrap items-center gap-2 mb-2">
          <View className="px-2 py-1 rounded-full bg-[#D97706]/15">
            <Text className="text-[12px] font-medium text-[#D97706]">Fleet</Text>
          </View>
          <Text className="text-[17px] font-semibold text-[#0F172A]">Fuel to vehicles</Text>
        </View>

        <View className="flex-row gap-2 mb-4 bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0]">
          <Ionicons name="information-circle-outline" size={20} color="#64748B" style={{ marginTop: 2 }} />
          <Text className="text-[13px] text-[#64748B] flex-1 leading-5">
            Dispensed from this request’s fuel lines. Liters are logged on each vehicle; stock is not returned to the
            central store.
          </Text>
        </View>

        {rows.length === 0 ? (
          <View className="items-center py-6 px-2">
            <View className="w-16 h-16 rounded-full bg-[#F1F5F9] items-center justify-center mb-3">
              <Ionicons name="car-outline" size={36} color="#94A3B8" />
            </View>
            <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">No fuel dispensed yet</Text>
            <Text className="text-[15px] text-[#64748B] text-center mb-5">
              Add vehicles, then dispense fuel from transferred fuel lines.
            </Text>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => tabNavigation.navigate('Inventory', { screen: 'VehiclesList' })}
                className="flex-1 border-[1.5px] border-[#B45309] rounded-[10px] min-h-[48px] justify-center items-center px-2"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-[#B45309]">Vehicles</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  tabNavigation.navigate('Inventory', {
                    screen: 'AllocateFuelToVehicles',
                    params: { returnTo: 'requests' },
                  })
                }
                className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] min-h-[48px] justify-center items-center px-2"
                accessibilityRole="button"
              >
                <Text className="text-[15px] font-semibold text-[#1E40AF]">Dispense fuel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="gap-3">
            {rows.map((row) => (
              <View key={row.id} className="rounded-[10px] border border-[#E2E8F0] p-4">
                <View className="flex-row justify-between items-start gap-2 mb-2">
                  <Text className="text-[15px] font-semibold text-[#0F172A] flex-1" numberOfLines={2}>
                    {row.itemName}
                  </Text>
                  <Text className="text-[15px] font-bold text-amber-700">{row.quantityLiters} L</Text>
                </View>
                <View className="flex-row gap-4 pb-3 border-b border-[#E2E8F0]">
                  <View className="flex-1">
                    <Text className="text-[13px] text-[#64748B]">Vehicle</Text>
                    <Text className="text-[15px] font-medium text-[#0F172A]" numberOfLines={1}>
                      {row.vehicleNumber}
                    </Text>
                  </View>
                </View>
                <Text className="text-[13px] text-[#64748B] mt-2">
                  {new Date(row.createdAt).toLocaleString()} · {row.assignedByName}
                </Text>
              </View>
            ))}
          </View>
        )}

        {rows.length > 0 && (
          <View className="flex-row gap-3 mt-4 pt-4 border-t border-[#E2E8F0]">
            <TouchableOpacity
              onPress={() => tabNavigation.navigate('Inventory', { screen: 'VehiclesList' })}
              className="flex-1 border-[1.5px] border-[#B45309] rounded-[10px] min-h-[48px] justify-center items-center px-2"
            >
              <Text className="text-[15px] font-semibold text-[#B45309] text-center">Vehicles</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                tabNavigation.navigate('Inventory', {
                  screen: 'AllocateFuelToVehicles',
                  params: { returnTo: 'requests' },
                })
              }
              className="flex-1 border-[1.5px] border-[#1E40AF] rounded-[10px] min-h-[48px] justify-center items-center px-2"
            >
              <Text className="text-[15px] font-semibold text-[#1E40AF] text-center">Dispense more</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};
