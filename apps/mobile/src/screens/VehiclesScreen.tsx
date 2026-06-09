import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVehicles, createVehicle } from '../lib/api';
import { colors, shadows, radius } from '../theme';

function getStatusChip(status: string) {
  switch (status) {
    case 'active':
      return { bg: colors.gem + '25', text: colors.gemLight, border: colors.gem + '40' };
    case 'retired':
      return { bg: colors.danger + '25', text: '#fca5a5', border: colors.danger + '40' };
    case 'maintenance':
    default:
      return { bg: colors.gold + '25', text: colors.goldLight, border: colors.gold + '40' };
  }
}

export default function VehiclesScreen() {
  const qc = useQueryClient();
  const { data: vehicles = [], isLoading, refetch } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    registration_number: '',
    vehicle_type: '',
    owner_name: '',
    owner_phone: '',
    capacity_mt: '',
  });

  const mutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      Alert.alert('Added', 'Vehicle added');
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setShowAdd(false);
    },
    onError: () => Alert.alert('Error', 'Failed to add vehicle'),
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+ Add Vehicle</Text>
      </TouchableOpacity>
      <FlatList
        data={vehicles as any[]}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const chip = getStatusChip(item.status);
          return (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.regNo}>{item.registration_number}</Text>
                <View style={[styles.badge, { backgroundColor: chip.bg, borderColor: chip.border }]}>
                  <Text style={[styles.badgeText, { color: chip.text }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.type}>{item.vehicle_type}</Text>
              <Text style={styles.owner}>{item.owner_name} · {item.owner_phone}</Text>
              {item.capacity_mt && <Text style={styles.capacity}>{item.capacity_mt} MT capacity</Text>}
            </View>
          );
        }}
      />
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Vehicle</Text>
            {[
              { key: 'registration_number', label: 'Reg. Number', upper: true },
              { key: 'vehicle_type', label: 'Type (Tipper, Tractor…)' },
              { key: 'owner_name', label: 'Owner Name' },
              { key: 'owner_phone', label: 'Owner Phone', numeric: true },
              { key: 'capacity_mt', label: 'Capacity (MT)', numeric: true },
            ].map(f => (
              <View key={f.key}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(x => ({ ...x, [f.key]: f.upper ? v.toUpperCase() : v }))}
                  keyboardType={f.numeric ? 'decimal-pad' : 'default'}
                  placeholderTextColor={colors.textDim}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, mutation.isPending && { opacity: 0.6 }]}
                onPress={() => mutation.mutate(form)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color={colors.brand} size="small" />
                ) : (
                  <Text style={styles.submitText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandDeep,
  },
  fab: {
    backgroundColor: colors.goldLight,
    margin: 12,
    padding: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  fabText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...shadows.card,
  },
  regNo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  type: {
    fontSize: 13,
    color: colors.textMid,
    marginTop: 4,
  },
  owner: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
  },
  capacity: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.gold + '30',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMid,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md - 2,
    padding: 10,
    fontSize: 14,
    backgroundColor: colors.brandLight + '90',
    color: colors.white,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: radius.md - 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.brandLight + '60',
  },
  cancelText: {
    color: colors.textMid,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.goldLight,
    padding: 12,
    borderRadius: radius.md - 2,
    alignItems: 'center',
  },
  submitText: {
    color: colors.brand,
    fontWeight: '700',
  },
});
