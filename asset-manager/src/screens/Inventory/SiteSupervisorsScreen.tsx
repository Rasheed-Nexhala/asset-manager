import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAppSelector } from '../../store/hooks';
import { selectUserId } from '../../store/selectors/authSelectors';
import { selectAssignedSiteIdForUser } from '../../store/selectors/sitesSelectors';
import { siteSupervisorService } from '../../services/firebase/siteSupervisorService';
import type { SiteSupervisor, SiteSupervisorInput } from '../../types/siteSupervisor';
import type { InventoryStackParamList } from '../../navigation/InventoryStackNavigator';

type Nav = StackNavigationProp<InventoryStackParamList, 'SiteSupervisors'>;

export const SiteSupervisorsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const userId = useAppSelector(selectUserId);
  const siteId = useAppSelector(selectAssignedSiteIdForUser(userId));

  const [rows, setRows] = useState<SiteSupervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SiteSupervisor | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!siteId) {
      setLoading(false);
      return;
    }
    const unsub = siteSupervisorService.subscribeSiteSupervisors(siteId, (list) => {
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, [siteId]);

  const openAdd = useCallback(() => {
    setEditing(null);
    setName('');
    setPhone('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((s: SiteSupervisor) => {
    setEditing(s);
    setName(s.name);
    setPhone(s.phone ?? '');
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!siteId || !userId) return;
    const input: SiteSupervisorInput = { name: name.trim(), phone: phone.trim() || undefined };
    if (!input.name) {
      Alert.alert('Name required', 'Enter a supervisor name.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await siteSupervisorService.updateSiteSupervisor(siteId, editing.id, input);
      } else {
        await siteSupervisorService.addSiteSupervisor(siteId, input, userId);
      }
      setModalOpen(false);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }, [siteId, userId, name, phone, editing]);

  const handleDelete = useCallback(
    (s: SiteSupervisor) => {
      if (!siteId) return;
      Alert.alert(
        'Remove supervisor',
        `Remove ${s.name}? They must have no outstanding materials.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await siteSupervisorService.deleteSiteSupervisor(siteId, s.id);
              } catch (e: unknown) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Could not remove');
              }
            },
          },
        ]
      );
    },
    [siteId]
  );

  if (!siteId) {
    return (
      <ScreenLayout edges={['top']}>
        <ScreenHeader title="Site team" showBack onBackPress={() => navigation.goBack()} />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-full bg-[#F1F5F9] items-center justify-center mb-4">
            <Ionicons name="location-outline" size={36} color="#94A3B8" />
          </View>
          <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">No working site</Text>
          <Text className="text-[15px] text-[#64748B] text-center leading-6">
            Open Inventory and select which site you are acting for, then come back here.
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  const listHeader = (
    <View className="pb-4">
      <View className="flex-row items-center gap-2 mb-2">
        <View className="px-2 py-1 rounded-full bg-[#B45309]/15">
          <Text className="text-[12px] font-medium text-[#B45309]">Site Manager</Text>
        </View>
      </View>
      <Text className="text-[13px] text-[#64748B] leading-5">
        Field contacts who receive materials you assign — not separate app logins. Use Split stock to allocate quantities after transfer.
      </Text>
    </View>
  );

  const listEmpty = (
    <View className="bg-white rounded-[10px] p-6 border border-[#E2E8F0] items-center py-10">
      <View className="w-16 h-16 rounded-full bg-[#B45309]/15 items-center justify-center mb-4">
        <Ionicons name="people-outline" size={36} color="#B45309" />
      </View>
      <Text className="text-[22px] font-semibold text-[#0F172A] text-center mb-2">No supervisors yet</Text>
      <Text className="text-[15px] text-[#64748B] text-center mb-6 leading-6 px-1">
        Add foremen or leads so you can split transferred stock by person.
      </Text>
      <TouchableOpacity
        onPress={openAdd}
        className="bg-[#1E40AF] rounded-[10px] min-h-[50px] px-8 items-center justify-center w-full max-w-sm"
        accessibilityRole="button"
        accessibilityLabel="Add your first supervisor"
      >
        <Text className="text-[15px] font-semibold text-white">Add supervisor</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenLayout edges={['top']}>
      <ScreenHeader title="Site team" showBack onBackPress={() => navigation.goBack()} />

      {loading ? (
        <View
          className="flex-1 items-center justify-center px-4"
          accessibilityLabel="Loading site team"
          accessibilityState={{ busy: true }}
        >
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text className="text-[13px] text-[#64748B] mt-3">Loading team…</Text>
        </View>
      ) : (
        <FlatList
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          data={rows}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={({ item }) => {
            const initial = (item.name.trim()[0] ?? '?').toUpperCase();
            return (
              <View className="bg-white rounded-[10px] p-4 border border-[#E2E8F0] mb-3 flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-[#B45309]/15 items-center justify-center mr-3">
                  <Text className="text-[17px] font-bold text-[#B45309]">{initial}</Text>
                </View>
                <View className="flex-1 mr-2 min-w-0">
                  <Text className="text-[15px] font-semibold text-[#0F172A]" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.phone ? (
                    <Text className="text-[13px] text-[#64748B] mt-0.5" numberOfLines={1}>
                      {item.phone}
                    </Text>
                  ) : (
                    <Text className="text-[13px] text-[#94A3B8] mt-0.5">No phone</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => openEdit(item)}
                  className="w-12 h-12 items-center justify-center"
                  accessibilityLabel={`Edit ${item.name}`}
                >
                  <Ionicons name="pencil-outline" size={22} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  className="w-12 h-12 items-center justify-center"
                  accessibilityLabel={`Remove ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={22} color="#DC2626" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {rows.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] px-4 py-3">
          <TouchableOpacity
            onPress={openAdd}
            className="bg-[#1E40AF] rounded-[10px] min-h-[50px] items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Add supervisor"
          >
            <Text className="text-[15px] font-semibold text-white">Add supervisor</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={modalOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-2xl p-4 pb-8 border-t border-[#E2E8F0]">
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-[17px] font-semibold text-[#0F172A] mb-4">
              {editing ? 'Edit supervisor' : 'New supervisor'}
            </Text>
            <View className="gap-1.5 mb-3">
              <Text className="text-[15px] text-[#0F172A]">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="#94A3B8"
                className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px]"
              />
            </View>
            <View className="gap-1.5 mb-6">
              <Text className="text-[15px] text-[#0F172A]">Phone (optional)</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Contact number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                className="border border-[#E2E8F0] rounded-lg h-12 px-4 bg-white text-[15px]"
              />
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                className="flex-1 border-[1.5px] border-[#64748B] rounded-[10px] h-[50px] justify-center items-center"
              >
                <Text className="text-[15px] font-semibold text-[#64748B]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className={`flex-1 rounded-[10px] h-[50px] flex-row items-center justify-center gap-2 ${
                  saving ? 'bg-[#1E40AF]/70' : 'bg-[#1E40AF]'
                }`}
                accessibilityLabel={saving ? 'Saving supervisor, please wait' : 'Save supervisor'}
                accessibilityState={{ disabled: saving, busy: saving }}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-[15px] font-semibold text-white">Please wait…</Text>
                  </>
                ) : (
                  <Text className="text-[15px] font-semibold text-white">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
};
