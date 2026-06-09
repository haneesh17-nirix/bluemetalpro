import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getUpcomingMaintenance } from '../lib/api';

const C = { primary: '#1a3c5e', accent: '#f59e0b', bg: '#f0f4f8' };

function KpiCard({ label, value, sub, color }: any) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });

  const fmt = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BlueMetal Pro</Text>
        <Text style={styles.headerSub}>Today's Overview</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.kpiGrid}>
          <KpiCard label="Sales" value={fmt(data?.today_sales?.total)} sub={`${data?.today_sales?.count || 0} invoices`} color="#2563a8" />
          <KpiCard label="Pending" value={fmt(data?.total_pending?.total)} sub="Receivables" color="#f59e0b" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Products (30 days)</Text>
        {(data?.top_products || []).map((p: any, i: number) => (
          <View key={i} style={styles.productRow}>
            <View style={styles.productRank}><Text style={styles.productRankText}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productQty}>{Number(p.qty || 0).toFixed(2)} MT</Text>
            </View>
            <Text style={styles.productAmount}>{fmt(p.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {[
            { label: 'New Sale', screen: 'NewSale', color: C.primary },
            { label: 'New Receipt', screen: 'NewReceipt', color: '#059669' },
            { label: 'Quarry Sale', screen: 'NewQuarrySale', color: '#7c3aed' },
            { label: 'Attendance', screen: 'Attendance', color: '#db2777' },
          ].map(a => (
            <TouchableOpacity key={a.screen} style={[styles.actionBtn, { backgroundColor: a.color }]}
              onPress={() => navigation.navigate(a.screen)}>
              <Text style={styles.actionBtnText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: C.primary, padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: C.primary, marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', gap: 12 },
  kpiCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  kpiValue: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  kpiSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  productRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  productRankText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  productName: { fontSize: 13, fontWeight: '600', color: '#1f2937' },
  productQty: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  productAmount: { fontSize: 14, fontWeight: 'bold', color: C.primary },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { flex: 1, minWidth: '45%', padding: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
