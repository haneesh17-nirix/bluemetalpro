import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuarrySales, createQuarrySale, getParties, getProducts, getVehicles } from '../lib/api';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';

const C = '#1a3c5e';

export default function QuarryScreen() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ sale_date: dayjs().format('YYYY-MM-DD'), quantity: '', rate: '', royalty_rate: '0', amount_received: '0', payment_mode: 'cash' });

  const { data: sales = [], isLoading, refetch } = useQuery({ queryKey: ['quarry'], queryFn: () => getQuarrySales() });
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => getParties({ type: 'customer' }) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const mutation = useMutation({
    mutationFn: createQuarrySale,
    onSuccess: () => { Alert.alert('Success', 'Quarry sale added'); qc.invalidateQueries({ queryKey: ['quarry'] }); setShowForm(false); },
    onError: () => Alert.alert('Error', 'Failed'),
  });

  const qty = Number(form.quantity);
  const rate = Number(form.rate);
  const royalty = Number(form.royalty_rate);
  const total = qty * rate + qty * royalty;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <View style={{ backgroundColor: '#7c3aed', padding: 16 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Quarry Sales</Text>
      </View>
      <TouchableOpacity style={[styles.fab, { backgroundColor: '#7c3aed' }]} onPress={() => setShowForm(true)}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>+ New Quarry Sale</Text>
      </TouchableOpacity>
      <FlatList
        data={sales as any[]}
        keyExtractor={(item: any) => item.id}
        refreshControl={<View />}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '700', color: '#7c3aed' }}>{item.invoice_number}</Text>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>{dayjs(item.sale_date).format('DD/MM/YYYY')}</Text>
            </View>
            <Text style={{ fontWeight: '600', color: '#1f2937', marginTop: 4 }}>{item.product_name}</Text>
            <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.party_name} | {item.vehicle_number}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 8 }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{Number(item.quantity).toFixed(3)} MT @ ₹{item.rate}</Text>
              <Text style={{ fontWeight: 'bold', color: '#7c3aed' }}>₹{Number(item.grand_total).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}
      />
      <Modal visible={showForm} animationType="slide">
        <ScrollView style={{ flex: 1, backgroundColor: '#f0f4f8' }} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: '#7c3aed', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>New Quarry Sale</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ color: 'white' }}>Close</Text></TouchableOpacity>
          </View>
          <View style={[styles.card, { margin: 12 }]}>
            {[
              { label: 'Date', key: 'sale_date', placeholder: 'YYYY-MM-DD' },
              { label: 'Quantity (MT)', key: 'quantity', placeholder: '0.000', numeric: true },
              { label: 'Rate (₹/MT)', key: 'rate', placeholder: '0.00', numeric: true },
              { label: 'Royalty Rate (₹/MT)', key: 'royalty_rate', placeholder: '0.00', numeric: true },
              { label: 'Amount Received', key: 'amount_received', placeholder: '0.00', numeric: true },
            ].map(f => (
              <View key={f.key}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput style={styles.input} value={form[f.key]} onChangeText={v => setForm((x: any) => ({ ...x, [f.key]: v }))} placeholder={f.placeholder} keyboardType={f.numeric ? 'decimal-pad' : 'default'} />
              </View>
            ))}
            <Text style={styles.label}>Product</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.product_id} onValueChange={(v: string) => { const p = (products as any[]).find((x: any) => x.id === v); setForm((f: any) => ({ ...f, product_id: v, product_name: p?.name })); }}>
                <Picker.Item label="Select product" value="" />
                {(products as any[]).filter((p: any) => p.category === 'boulder').map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
              </Picker>
            </View>
            <Text style={styles.label}>Party</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.party_id} onValueChange={(v: string) => { const p = (parties as any[]).find((x: any) => x.id === v); setForm((f: any) => ({ ...f, party_id: v, party_name: p?.name })); }}>
                <Picker.Item label="-- Select Party --" value="" />
                {(parties as any[]).map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
              </Picker>
            </View>
            <Text style={styles.label}>Vehicle</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={form.vehicle_id} onValueChange={(v: string) => { const vh = (vehicles as any[]).find((x: any) => x.id === v); setForm((f: any) => ({ ...f, vehicle_id: v, vehicle_number: vh?.registration_number })); }}>
                <Picker.Item label="-- Select Vehicle --" value="" />
                {(vehicles as any[]).map((v: any) => <Picker.Item key={v.id} label={v.registration_number} value={v.id} />)}
              </Picker>
            </View>
            <View style={{ backgroundColor: '#f3e8ff', padding: 12, borderRadius: 10, marginTop: 12 }}>
              <Text style={{ color: '#7c3aed', fontWeight: 'bold', fontSize: 16 }}>Total: ₹{total.toLocaleString('en-IN')}</Text>
            </View>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#7c3aed' }]} onPress={() => mutation.mutate(form)} disabled={mutation.isPending}>
              {mutation.isPending ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Save Quarry Sale</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: { margin: 12, padding: 12, borderRadius: 12, alignItems: 'center' },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: '#f9fafb' },
  pickerWrap: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#f9fafb', overflow: 'hidden' },
  submitBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
