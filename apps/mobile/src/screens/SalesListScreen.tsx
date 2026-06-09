import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getSales } from '../lib/api';
import dayjs from 'dayjs';
import { colors, shadows, radius } from '../theme';
import { log } from '@bluemetal/shared';

export default function SalesListScreen({ navigation }: any) {
  useEffect(() => { log.screen('SalesList'); }, []);
  const [from] = useState(dayjs().format('YYYY-MM-01'));
  const [to] = useState(dayjs().format('YYYY-MM-DD'));
  const { data: sales = [], isLoading, refetch } = useQuery({ queryKey: ['sales', { from, to }], queryFn: () => getSales({ from, to }) });

  const today = dayjs().format('YYYY-MM-DD');
  const todaySales = (sales as any[]).filter((s: any) => dayjs(s.sale_date).format('YYYY-MM-DD') === today);
  const todayTotal = todaySales.reduce((s: number, i: any) => s + Number(i.grand_total), 0);

  const getStatusStyle = (status: string) => {
    if (status === 'confirmed' || status === 'paid' || status === 'completed') {
      return { backgroundColor: colors.gemLight + '22', borderColor: colors.gemLight + '60' };
    }
    if (status === 'pending') {
      return { backgroundColor: colors.goldLight + '22', borderColor: colors.goldLight + '60' };
    }
    return { backgroundColor: colors.danger + '22', borderColor: colors.danger + '60' };
  };

  const getStatusTextColor = (status: string) => {
    if (status === 'confirmed' || status === 'paid' || status === 'completed') return colors.gemLight;
    if (status === 'pending') return colors.goldLight;
    return colors.danger;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryLabel}>TODAY'S SALES</Text>
          <Text style={styles.summaryValue}>₹{todayTotal.toLocaleString('en-IN')}</Text>
        </View>
        <Text style={styles.summaryCount}>{todaySales.length} invoices</Text>
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewSale')}>
        <Text style={styles.fabText}>+ New Sale</Text>
      </TouchableOpacity>

      <FlatList
        data={sales as any[]}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.goldLight} />}
        contentContainerStyle={{ padding: 12, paddingTop: 8 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.saleCard}>
            <View style={styles.saleHeader}>
              <Text style={styles.invoiceNo}>{item.invoice_number}</Text>
              <View style={[styles.badge, getStatusStyle(item.status)]}>
                <Text style={[styles.badgeText, { color: getStatusTextColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.partyName}>{item.party_name || 'CASH'}</Text>
            <View style={styles.saleFooter}>
              <View>
                <Text style={styles.footerLabel}>DATE</Text>
                <Text style={styles.footerValue}>{dayjs(item.sale_date).format('DD/MM/YYYY')}</Text>
              </View>
              <View>
                <Text style={styles.footerLabel}>VEHICLE</Text>
                <Text style={styles.footerValue}>{item.vehicle_number || '-'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.footerLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>
                  ₹{Number(item.grand_total).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
            {Number(item.balance_due) > 0 && (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceDue}>Balance Due: ₹{Number(item.balance_due).toLocaleString('en-IN')}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No sales this month</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandDeep },
  summaryBar: {
    backgroundColor: colors.surfaceCard,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: { color: colors.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  summaryValue: { color: colors.goldLight, fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  summaryCount: { color: colors.textMid, fontSize: 13 },
  fab: {
    backgroundColor: colors.goldLight,
    margin: 12,
    padding: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  fabText: { color: colors.brand, fontWeight: '700', fontSize: 15 },
  separator: { height: 1, backgroundColor: colors.border + '60' },
  saleCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...shadows.card,
  },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNo: { fontSize: 14, fontWeight: '700', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  partyName: { fontSize: 15, color: colors.text, marginTop: 4, fontWeight: '500' },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.border + '60',
  },
  footerLabel: { fontSize: 10, color: colors.textDim, fontWeight: '700', letterSpacing: 0.8 },
  footerValue: { fontSize: 13, color: colors.textMid, fontWeight: '500', marginTop: 2 },
  totalAmount: { fontSize: 15, color: colors.goldLight, fontWeight: '700', marginTop: 2 },
  balanceRow: {
    marginTop: 8,
    backgroundColor: colors.danger + '18',
    borderWidth: 1,
    borderColor: colors.danger + '40',
    padding: 6,
    borderRadius: 6,
  },
  balanceDue: { fontSize: 11, color: colors.danger, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textDim, marginTop: 40 },
});
