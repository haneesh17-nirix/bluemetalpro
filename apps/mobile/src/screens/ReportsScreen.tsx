import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getItemWiseReport } from '../lib/api';
import dayjs from 'dayjs';
import { colors, shadows, radius } from '../theme';

export default function ReportsScreen() {
  const from = dayjs().format('YYYY-MM-01');
  const to = dayjs().format('YYYY-MM-DD');
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ['item-report', { from, to }], queryFn: () => getItemWiseReport({ from, to }) });

  const grandTotal = (data as any[]).reduce((s: number, r: any) => s + Number(r.total_with_gst), 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.goldLight} />}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Item-wise Sales</Text>
        <Text style={styles.headerSub}>{dayjs(from).format('DD MMM')} – {dayjs(to).format('DD MMM YYYY')}</Text>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>MONTH TOTAL</Text>
        <Text style={styles.totalValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
      </View>

      <View style={{ paddingHorizontal: 12, paddingBottom: 24 }}>
        {(data as any[]).map((r: any, i: number) => (
          <View key={i} style={[styles.row, i < (data as any[]).length - 1 && styles.rowBorder]}>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandDeep },
  header: {
    backgroundColor: colors.surfaceCard,
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: colors.textMid, fontSize: 13, marginTop: 2 },
  totalCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.gold + '30',
    margin: 12,
    padding: 16,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textDim,
    letterSpacing: 0.8,
  },
  totalValue: { color: colors.goldLight, fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  row: {
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    ...shadows.card,
  },
  rowBorder: {
    // separator handled by marginBottom on each row
  },
  rowLeft: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: colors.text },
  qty: { fontSize: 11, color: colors.textMid, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: 'bold', color: colors.goldLight },
  amountSub: { fontSize: 10, color: colors.textDim, marginTop: 2 },
});
