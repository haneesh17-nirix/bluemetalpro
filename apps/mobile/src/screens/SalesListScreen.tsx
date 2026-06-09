import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getSales } from '../lib/api';
import dayjs from 'dayjs';

const C = '#1a3c5e';

export default function SalesListScreen({ navigation }: any) {
  const [from] = useState(dayjs().format('YYYY-MM-01'));
  const [to] = useState(dayjs().format('YYYY-MM-DD'));
  const { data: sales = [], isLoading, refetch } = useQuery({ queryKey: ['sales', { from, to }], queryFn: () => getSales({ from, to }) });

  const today = dayjs().format('YYYY-MM-DD');
  const todaySales = (sales as any[]).filter((s: any) => dayjs(s.sale_date).format('YYYY-MM-DD') === today);
  const todayTotal = todaySales.reduce((s: number, i: any) => s + Number(i.grand_total), 0);

  return (
    <View style={styles.container}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryLabel}>Today's Sales</Text>
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 12, paddingTop: 8 }}
        renderItem={({ item }) => (
          <View style={styles.saleCard}>
            <View style={styles.saleHeader}>
              <Text style={styles.invoiceNo}>{item.invoice_number}</Text>
              <View style={[styles.badge, item.status === 'confirmed' ? styles.badgeGreen : styles.badgeRed]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.partyName}>{item.party_name || 'CASH'}</Text>
            <View style={styles.saleFooter}>
              <View>
                <Text style={styles.footerLabel}>Date</Text>
                <Text style={styles.footerValue}>{dayjs(item.sale_date).format('DD/MM/YYYY')}</Text>
              </View>
              <View>
                <Text style={styles.footerLabel}>Vehicle</Text>
                <Text style={styles.footerValue}>{item.vehicle_number || '-'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.footerLabel}>Total</Text>
                <Text style={[styles.footerValue, { color: C, fontWeight: 'bold', fontSize: 15 }]}>
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
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  summaryBar: { backgroundColor: C, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  summaryValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  summaryCount: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  fab: { backgroundColor: '#f59e0b', margin: 12, padding: 12, borderRadius: 12, alignItems: 'center' },
  fabText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  saleCard: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNo: { fontSize: 14, fontWeight: '700', color: C },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeGreen: { backgroundColor: '#d1fae5' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#065f46' },
  partyName: { fontSize: 15, color: '#374151', marginTop: 4, fontWeight: '500' },
  saleFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#f3f4f6' },
  footerLabel: { fontSize: 10, color: '#9ca3af' },
  footerValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  balanceRow: { marginTop: 8, backgroundColor: '#fef3c7', padding: 6, borderRadius: 6 },
  balanceDue: { fontSize: 11, color: '#92400e', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
