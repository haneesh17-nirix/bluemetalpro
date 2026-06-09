import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVehicles, createVehicle } from '../lib/api';

const C = '#1a3c5e';

export default function VehiclesScreen() {
  const qc = useQueryClient();
  const { data: vehicles = [], isLoading, refetch } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ registration_number: '', vehicle_type: '', owner_name: '', owner_phone: '', capacity_mt: '' });

  const mutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => { Alert.alert('Added', 'Vehicle added'); qc.invalidateQueries({ queryKey: ['vehicles'] }); setShowAdd(false); },
    onError: () => Alert.alert('Error', 'Failed to add vehicle'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+ Add Vehicle</Text>
      </TouchableOpacity>
      <FlatList
        data={vehicles as any[]}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.regNo}>{item.registration_number}</Text>
              <View style={[styles.badge, item.status === 'active' ? styles.green : styles.yellow]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.type}>{item.vehicle_type}</Text>
            <Text style={styles.owner}>{item.owner_name} · {item.owner_phone}</Text>
            {item.capacity_mt && <Text style={styles.capacity}>{item.capacity_mt} MT capacity</Text>}
          </View>
        )}
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
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, mutation.isPending && { opacity: 0.6 }]} onPress={() => mutation.mutate(form)} disabled={mutation.isPending}>
                {mutation.isPending ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.submitText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: { backgroundColor: C, margin: 12, padding: 12, borderRadius: 12, alignItems: 'center' },
  fabText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  regNo: { fontSize: 15, fontWeight: '700', color: C },
  type: { fontSize: 13, color: '#374151', marginTop: 4 },
  owner: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  capacity: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  green: { backgroundColor: '#d1fae5' },
  yellow: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#065f46' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: '#f9fafb' },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db' },
  submitBtn: { flex: 1, backgroundColor: C, padding: 12, borderRadius: 10, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold' },
});
