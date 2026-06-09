import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSale, getParties, getProducts, getVehicles } from '../lib/api';
import { Picker } from '@react-native-picker/picker';
import { log } from '../../../packages/shared/src/utils/clientLogger';

const C = { primary: '#1a3c5e', bg: '#f0f4f8', accent: '#f59e0b' };

export default function NewSaleScreen({ navigation }: any) {
  useEffect(() => { log.screen('NewSale'); }, []);
  const qc = useQueryClient();
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: () => getParties({ type: 'customer' }) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const [form, setForm] = useState({ invoice_type: 'tax_invoice', sale_date: new Date().toISOString().split('T')[0], party_id: '', vehicle_id: '', driver_name: '', payment_mode: 'credit', amount_received: '0', is_same_state: true });
  const [items, setItems] = useState([{ product_id: '', product_name: '', unit: 'MT', quantity: '', rate: '', gst_rate: 5, hsn_code: '' }]);

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      log.action('Sale submitted');
      Alert.alert('Success', 'Sale invoice created!');
      qc.invalidateQueries({ queryKey: ['sales'] });
      navigation.goBack();
    },
    onError: () => { log.error('Sale submission failed'); Alert.alert('Error', 'Failed to create sale'); },
  });

  const addItem = () => setItems(i => [...i, { product_id: '', product_name: '', unit: 'MT', quantity: '', rate: '', gst_rate: 5, hsn_code: '' }]);
  const removeItem = (idx: number) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    setItems(items => items.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'product_id') {
        const p = (products as any[]).find((p: any) => p.id === value);
        return p ? { ...item, product_id: p.id, product_name: p.name, hsn_code: p.hsn_code || '', unit: p.unit, gst_rate: p.gst_rate, rate: String(p.default_sale_price || '') } : item;
      }
      return { ...item, [field]: value };
    }));
  };

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);
  const gstTotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate) * i.gst_rate / 100), 0);

  const handleSubmit = () => {
    const validItems = items.filter(i => i.product_id && Number(i.quantity) > 0);
    if (!validItems.length) return Alert.alert('Error', 'Add at least one item');
    mutation.mutate({ ...form, amount_received: Number(form.amount_received), items: validItems });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sale Details</Text>
        <Text style={styles.label}>Invoice Type</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={form.invoice_type} onValueChange={(v: string) => setForm(f => ({ ...f, invoice_type: v }))}>
            <Picker.Item label="Tax Invoice" value="tax_invoice" />
            <Picker.Item label="Delivery Challan" value="delivery_challan" />
            <Picker.Item label="Bill of Supply" value="bill_of_supply" />
          </Picker>
        </View>

        <Text style={styles.label}>Date</Text>
        <TextInput style={styles.input} value={form.sale_date} onChangeText={v => setForm(f => ({ ...f, sale_date: v }))} placeholder="YYYY-MM-DD" />

        <Text style={styles.label}>Customer</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={form.party_id} onValueChange={(v: string) => setForm(f => ({ ...f, party_id: v }))}>
            <Picker.Item label="-- CASH --" value="" />
            {(parties as any[]).map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Vehicle</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={form.vehicle_id} onValueChange={(v: string) => {
            const vh = (vehicles as any[]).find((x: any) => x.id === v);
            setForm(f => ({ ...f, vehicle_id: v, vehicle_number: vh?.registration_number }));
          }}>
            <Picker.Item label="-- Select Vehicle --" value="" />
            {(vehicles as any[]).map((v: any) => <Picker.Item key={v.id} label={v.registration_number} value={v.id} />)}
          </Picker>
        </View>

        <Text style={styles.label}>Driver Name</Text>
        <TextInput style={styles.input} value={form.driver_name} onChangeText={v => setForm(f => ({ ...f, driver_name: v }))} placeholder="Driver name" />
      </View>

      {/* Items */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Items</Text>
          <TouchableOpacity onPress={addItem} style={styles.addBtn}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
        </View>
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.label}>Product</Text>
              {items.length > 1 && <TouchableOpacity onPress={() => removeItem(idx)}><Text style={{ color: '#ef4444', fontSize: 12 }}>Remove</Text></TouchableOpacity>}
            </View>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={item.product_id} onValueChange={(v: string) => updateItem(idx, 'product_id', v)}>
                <Picker.Item label="Select product..." value="" />
                {(products as any[]).map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
              </Picker>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Qty ({item.unit})</Text>
                <TextInput style={styles.input} value={String(item.quantity)} onChangeText={v => updateItem(idx, 'quantity', v)} keyboardType="decimal-pad" placeholder="0.000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Rate (₹)</Text>
                <TextInput style={styles.input} value={String(item.rate)} onChangeText={v => updateItem(idx, 'rate', v)} keyboardType="decimal-pad" placeholder="0.00" />
              </View>
            </View>
            <Text style={styles.itemTotal}>Amount: ₹{(Number(item.quantity) * Number(item.rate)).toLocaleString('en-IN')}  |  GST ({item.gst_rate}%): ₹{(Number(item.quantity) * Number(item.rate) * item.gst_rate / 100).toLocaleString('en-IN')}</Text>
          </View>
        ))}
      </View>

      {/* Totals & Payment */}
      <View style={styles.card}>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>₹{subtotal.toLocaleString('en-IN')}</Text></View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>GST</Text><Text style={styles.totalValue}>₹{gstTotal.toLocaleString('en-IN')}</Text></View>
        <View style={[styles.totalRow, styles.grandTotalRow]}><Text style={styles.grandLabel}>Grand Total</Text><Text style={styles.grandValue}>₹{(subtotal + gstTotal).toLocaleString('en-IN')}</Text></View>

        <Text style={styles.label}>Payment Mode</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={form.payment_mode} onValueChange={(v: string) => setForm(f => ({ ...f, payment_mode: v }))}>
            {['credit', 'cash', 'upi', 'cheque', 'neft', 'rtgs'].map(m => <Picker.Item key={m} label={m.toUpperCase()} value={m} />)}
          </Picker>
        </View>
        <Text style={styles.label}>Amount Received</Text>
        <TextInput style={styles.input} value={form.amount_received} onChangeText={v => setForm(f => ({ ...f, amount_received: v }))} keyboardType="decimal-pad" />
      </View>

      <TouchableOpacity style={[styles.submitBtn, mutation.isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={mutation.isPending}>
        {mutation.isPending ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Create Invoice</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  card: { backgroundColor: 'white', borderRadius: 16, margin: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.primary, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: '#f9fafb' },
  pickerWrap: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#f9fafb', overflow: 'hidden' },
  itemCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  itemTotal: { fontSize: 11, color: '#2563a8', marginTop: 6, fontWeight: '500' },
  addBtn: { backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  addBtnText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  grandTotalRow: { borderTopWidth: 1, borderColor: '#e5e7eb', marginTop: 4, paddingTop: 10 },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalValue: { fontSize: 13, color: '#1f2937' },
  grandLabel: { fontSize: 16, fontWeight: 'bold', color: C.primary },
  grandValue: { fontSize: 16, fontWeight: 'bold', color: C.primary },
  submitBtn: { backgroundColor: C.primary, margin: 12, padding: 16, borderRadius: 14, alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
