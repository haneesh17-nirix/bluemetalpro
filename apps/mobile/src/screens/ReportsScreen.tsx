import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getItemWiseReport } from '../lib/api';
import dayjs from 'dayjs';

const C = '#1a3c5e';

export default function ReportsScreen() {
  const from = dayjs().format('YYYY-MM-01');
  const to = dayjs().format('YYYY-MM-DD');
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ['item-report', { from, to }], queryFn: () => getItemWiseReport({ from, to }) });

  const grandTotal = (data as any[]).reduce((s: number, r: any) => s + Number(r.total_with_gst), 0);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Item-wise Sales</Text>
        <Text style={styles.headerSub}>{dayjs(from).format('DD MMM')} – {dayjs(to).format('DD MMM YYYY')}</Text>
      </View>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Month Total</Text>
        <Text style={styles.totalValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
      </View>
      {(data as any[]).map((r: any, i: number) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.productName}>{r.product_name}</Text>
            <Text style={styles.qty}>{Number(r.total_quantity).toFixed(2)} {r.unit} · {r.num_invoices} invoices</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.amount}>₹{Number(r.total_with_gst).toLocaleString('en-IN')}</Text>
            <Text style={styles.amountSub}>+GST ₹{Number(r.total_cgst + r.total_sgst + r.total_igst).toLocaleString('en-IN')}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: C, padding: 20, paddingTop: 50 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  totalCard: { backgroundColor: '#f59e0b', margin: 12, padding: 16, borderRadius: 14 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  totalValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  row: { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  rowLeft: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  qty: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: 'bold', color: C },
  amountSub: { fontSize: 10, color: '#6b7280' },
});
