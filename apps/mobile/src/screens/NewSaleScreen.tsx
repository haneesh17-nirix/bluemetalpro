import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSale, getParties, getProducts, getVehicles } from '../lib/api';
import { Picker } from '@react-native-picker/picker';
import { log } from '@bluemetal/shared';
import { colors, radius, shadows } from '../theme';

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
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      {/* Sale Details */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Sale Details</Text>

        <Text style={s.label}>INVOICE TYPE</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={form.invoice_type} onValueChange={(v: string) => setForm(f => ({ ...f, invoice_type: v }))} style={s.picker} dropdownIconColor={colors.textDim}>
            <Picker.Item label="Tax Invoice" value="tax_invoice" color={colors.white} />
            <Picker.Item label="Delivery Challan" value="delivery_challan" color={colors.white} />
            <Picker.Item label="Bill of Supply" value="bill_of_supply" color={colors.white} />
          </Picker>
        </View>

        <Text style={s.label}>DATE</Text>
        <TextInput style={s.input} value={form.sale_date} onChangeText={v => setForm(f => ({ ...f, sale_date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textFaint} />

        <Text style={s.label}>CUSTOMER</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={form.party_id} onValueChange={(v: string) => setForm(f => ({ ...f, party_id: v }))} style={s.picker} dropdownIconColor={colors.textDim}>
            <Picker.Item label="-- CASH --" value="" color={colors.white} />
            {(parties as any[]).map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} color={colors.white} />)}
          </Picker>
        </View>

        <Text style={s.label}>VEHICLE</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={form.vehicle_id} onValueChange={(v: string) => {
            const vh = (vehicles as any[]).find((x: any) => x.id === v);
            setForm(f => ({ ...f, vehicle_id: v, vehicle_number: vh?.registration_number }));
          }} style={s.picker} dropdownIconColor={colors.textDim}>
            <Picker.Item label="-- Select Vehicle --" value="" color={colors.white} />
            {(vehicles as any[]).map((v: any) => <Picker.Item key={v.id} label={v.registration_number} value={v.id} color={colors.white} />)}
          </Picker>
        </View>

        <Text style={s.label}>DRIVER NAME</Text>
        <TextInput style={s.input} value={form.driver_name} onChangeText={v => setForm(f => ({ ...f, driver_name: v }))} placeholder="Driver name" placeholderTextColor={colors.textFaint} />
      </View>

      {/* Items */}
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={s.sectionTitle}>Items</Text>
          <TouchableOpacity onPress={addItem} style={s.addBtn} activeOpacity={0.8}>
            <Text style={s.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        {items.map((item, idx) => (
          <View key={idx} style={s.itemCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text style={[s.label, { marginTop: 0 }]}>PRODUCT</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.pickerWrap}>
              <Picker selectedValue={item.product_id} onValueChange={(v: string) => updateItem(idx, 'product_id', v)} style={s.picker} dropdownIconColor={colors.textDim}>
                <Picker.Item label="Select product..." value="" color={colors.white} />
                {(products as any[]).map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} color={colors.white} />)}
              </Picker>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>QTY ({item.unit})</Text>
                <TextInput style={s.input} value={String(item.quantity)} onChangeText={v => updateItem(idx, 'quantity', v)} keyboardType="decimal-pad" placeholder="0.000" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>RATE (₹)</Text>
                <TextInput style={s.input} value={String(item.rate)} onChangeText={v => updateItem(idx, 'rate', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textFaint} />
              </View>
            </View>
            <Text style={s.itemTotal}>
              Amount: ₹{(Number(item.quantity) * Number(item.rate)).toLocaleString('en-IN')}
              {'  ·  '}GST ({item.gst_rate}%): ₹{(Number(item.quantity) * Number(item.rate) * item.gst_rate / 100).toLocaleString('en-IN')}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals & Payment */}
      <View style={s.card}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Subtotal</Text>
          <Text style={s.totalValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>GST</Text>
          <Text style={s.totalValue}>₹{gstTotal.toLocaleString('en-IN')}</Text>
        </View>
        <View style={[s.totalRow, s.grandTotalRow]}>
          <Text style={s.grandLabel}>Grand Total</Text>
          <Text style={s.grandValue}>₹{(subtotal + gstTotal).toLocaleString('en-IN')}</Text>
        </View>

        <Text style={s.label}>PAYMENT MODE</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={form.payment_mode} onValueChange={(v: string) => setForm(f => ({ ...f, payment_mode: v }))} style={s.picker} dropdownIconColor={colors.textDim}>
            {['credit', 'cash', 'upi', 'cheque', 'neft', 'rtgs'].map(m => (
              <Picker.Item key={m} label={m.toUpperCase()} value={m} color={colors.white} />
            ))}
          </Picker>
        </View>

        <Text style={s.label}>AMOUNT RECEIVED</Text>
        <TextInput style={s.input} value={form.amount_received} onChangeText={v => setForm(f => ({ ...f, amount_received: v }))} keyboardType="decimal-pad" placeholderTextColor={colors.textFaint} />
      </View>

      <TouchableOpacity style={[s.submitBtn, mutation.isPending && { opacity: 0.6 }]} onPress={handleSubmit} disabled={mutation.isPending} activeOpacity={0.85}>
        {mutation.isPending
          ? <ActivityIndicator color={colors.brand} />
          : <Text style={s.submitBtnText}>Create Invoice</Text>
        }
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandDeep },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    margin: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 8 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, color: colors.textDim, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.white,
    backgroundColor: `${colors.brandLight}90`,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: `${colors.brandLight}90`,
    overflow: 'hidden',
  },
  picker: { color: colors.white },
  itemCard: {
    backgroundColor: `${colors.brand}80`,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemTotal: { fontSize: 11, color: colors.goldLight, marginTop: 8, fontWeight: '600' },
  removeText: { fontSize: 12, color: '#f87171', fontWeight: '600' },
  addBtn: {
    backgroundColor: `${colors.brandBright}25`,
    borderWidth: 1,
    borderColor: `${colors.brandBright}50`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  addBtnText: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  grandTotalRow: { borderTopWidth: 1, borderColor: colors.border, marginTop: 4, paddingTop: 12 },
  totalLabel: { fontSize: 13, color: colors.textMid },
  totalValue: { fontSize: 13, color: colors.white },
  grandLabel: { fontSize: 16, fontWeight: '800', color: colors.goldLight },
  grandValue: { fontSize: 16, fontWeight: '800', color: colors.goldLight },
  submitBtn: {
    backgroundColor: colors.goldLight,
    margin: 12,
    padding: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadows.gold,
  },
  submitBtnText: { color: colors.brand, fontSize: 16, fontWeight: '800' },
});
