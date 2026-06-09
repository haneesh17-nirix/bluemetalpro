import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getQuarrySales, createQuarrySale, getParties, getProducts, getVehicles } from '../lib/api';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';
import { colors, shadows, radius } from '../theme';

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quarry Sales</Text>
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>+ New Quarry Sale</Text>
      </TouchableOpacity>

      <FlatList
        data={sales as any[]}
        keyExtractor={(item: any) => item.id}
        refreshControl={<View />}
        contentContainerStyle={{ padding: 12 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.invoiceNo}>{item.invoice_number}</Text>
              <Text style={styles.dateText}>{dayjs(item.sale_date).format('DD/MM/YYYY')}</Text>
            </View>
            <Text style={styles.productName}>{item.product_name}</Text>
            <Text style={styles.metaText}>{item.party_name} | {item.vehicle_number}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.qtyText}>{Number(item.quantity).toFixed(3)} MT @ ₹{item.rate}</Text>
              <Text style={styles.totalText}>₹{Number(item.grand_total).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}
      />

      <Modal visible={showForm} animationType="slide">
        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <StatusBar barStyle="light-content" />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Quarry Sale</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.card, { margin: 12 }]}>
            {[
              { label: 'DATE', key: 'sale_date', placeholder: 'YYYY-MM-DD' },
              { label: 'QUANTITY (MT)', key: 'quantity', placeholder: '0.000', numeric: true },
              { label: 'RATE (₹/MT)', key: 'rate', placeholder: '0.00', numeric: true },
              { label: 'ROYALTY RATE (₹/MT)', key: 'royalty_rate', placeholder: '0.00', numeric: true },
              { label: 'AMOUNT RECEIVED', key: 'amount_received', placeholder: '0.00', numeric: true },
            ].map(f => (
              <View key={f.key}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key]}
                  onChangeText={v => setForm((x: any) => ({ ...x, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.textDim}
                  keyboardType={f.numeric ? 'decimal-pad' : 'default'}
                />
              </View>
            ))}

            <Text style={styles.label}>PRODUCT</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={form.product_id}
                onValueChange={(v: string) => { const p = (products as any[]).find((x: any) => x.id === v); setForm((f: any) => ({ ...f, product_id: v, product_name: p?.name })); }}
                dropdownIconColor={colors.textMid}
                style={{ color: colors.text }}
              >
                <Picker.Item label="Select product" value="" color={colors.textDim} />
                {(products as any[]).filter((p: any) => p.category === 'boulder').map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} color={colors.text} />)}
              </Picker>
            </View>

            <Text style={styles.label}>PARTY</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={form.party_id}
                onValueChange={(v: string) => { const p = (parties as any[]).find((x: any) => x.id === v); setForm((f: any) => ({ ...f, party_id: v, party_name: p?.name })); }}
                dropdownIconColor={colors.textMid}
                style={{ color: colors.text }}
              >
                <Picker.Item label="-- Select Party --" value="" color={colors.textDim} />
                {(parties as any[]).map((p: any) => <Picker.Item key={p.id} label={p.name} value={p.id} color={colors.text} />)}
              </Picker>
            </View>

            <Text style={styles.label}>VEHICLE</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={form.vehicle_id}
                onValueChange={(v: string) => { const vh = (vehicles as any[]).find((x: any) => x.id === v); setForm((f: any) => ({ ...f, vehicle_id: v, vehicle_number: vh?.registration_number })); }}
                dropdownIconColor={colors.textMid}
                style={{ color: colors.text }}
              >
                <Picker.Item label="-- Select Vehicle --" value="" color={colors.textDim} />
                {(vehicles as any[]).map((v: any) => <Picker.Item key={v.id} label={v.registration_number} value={v.id} color={colors.text} />)}
              </Picker>
            </View>

            <View style={styles.totalBanner}>
              <Text style={styles.totalBannerLabel}>TOTAL</Text>
              <Text style={styles.totalBannerValue}>₹{total.toLocaleString('en-IN')}</Text>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => mutation.mutate(form)}
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator color={colors.brand} />
                : <Text style={styles.submitBtnText}>Save Quarry Sale</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandDeep },
  header: {
    backgroundColor: colors.surfaceCard,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  fab: {
    backgroundColor: colors.goldLight,
    margin: 12,
    padding: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  fabText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
  separator: { height: 1, backgroundColor: colors.border + '60' },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...shadows.card,
  },
  invoiceNo: { fontWeight: '700', color: colors.text, fontSize: 14 },
  dateText: { color: colors.textMid, fontSize: 12 },
  productName: { fontWeight: '600', color: colors.text, marginTop: 4 },
  metaText: { color: colors.textMid, fontSize: 12, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: colors.border + '60',
    paddingTop: 8,
  },
  qtyText: { fontSize: 12, color: colors.textMid },
  totalText: { fontWeight: 'bold', color: colors.goldLight },
  // Modal
  modalScroll: { flex: 1, backgroundColor: colors.brandDeep },
  modalHeader: {
    backgroundColor: colors.surfaceCard,
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  closeBtn: { color: colors.goldLight, fontWeight: '600', fontSize: 14 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    fontSize: 14,
    backgroundColor: colors.brand + '90',
    color: colors.text,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.brand + '90',
    overflow: 'hidden',
  },
  totalBanner: {
    backgroundColor: colors.gold + '20',
    borderWidth: 1,
    borderColor: colors.gold + '30',
    padding: 12,
    borderRadius: radius.md,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  totalBannerValue: { color: colors.goldLight, fontWeight: 'bold', fontSize: 18 },
  submitBtn: {
    backgroundColor: colors.goldLight,
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: colors.brand, fontSize: 16, fontWeight: '700' },
});
