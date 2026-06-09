import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar,
} from 'react-native';
import { log } from '../../../packages/shared/src/utils/clientLogger';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getDashboard, getUpcomingMaintenance } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { colors, shadows, radius } from '../theme';

const fmt = (v: any) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

function KpiCard({ label, value, sub, iconName, iconBg }: any) {
  return (
    <View style={[kpi.card, shadows.card]}>
      <View style={[kpi.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color="#fff" />
      </View>
      <Text style={kpi.value}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
      {sub ? <Text style={kpi.sub}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen({ navigation }: any) {
  useEffect(() => { log.screen('Dashboard'); }, []);
  const { crusher } = useAuth();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  const { data: maintenance = [] } = useQuery({ queryKey: ['upcoming-maintenance'], queryFn: getUpcomingMaintenance });

  const kpis = [
    { label: "Today's Sales",  value: fmt(data?.today_sales?.total),   sub: `${data?.today_sales?.count || 0} invoices`, iconName: 'cart-outline',    iconBg: colors.brandBright },
    { label: 'Receivables',    value: fmt(data?.total_pending?.total),  sub: 'Outstanding',                               iconName: 'trending-up',     iconBg: colors.goldDark },
    { label: 'Alerts',         value: String(maintenance?.length || 0), sub: 'Maintenance due',                            iconName: 'warning-outline', iconBg: colors.danger },
  ];

  const quickActions = [
    { label: 'New Sale',     screen: 'NewSale',         icon: 'receipt-outline',      color: colors.brandBright },
    { label: 'Quarry',       screen: 'NewQuarrySale',   icon: 'mountain-outline',     color: colors.gem },
    { label: 'Attendance',   screen: 'Attendance',      icon: 'people-outline',       color: colors.goldDark },
    { label: 'Maintenance',  screen: 'Maintenance',     icon: 'construct-outline',    color: '#7c3aed' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandDeep} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Dashboard</Text>
          <Text style={s.headerSub}>{crusher?.name || "Today's overview"}</Text>
          <Text style={s.headerCrusherDetail}>{crusher?.city ? crusher.city + (crusher.state ? ', ' + crusher.state : '') : ''}</Text>
        </View>
        <TouchableOpacity style={s.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={20} color={colors.goldLight} />
          <View style={s.bellDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.gold} />}
      >
        {/* KPI row */}
        <View style={s.kpiRow}>
          {kpis.map(k => <KpiCard key={k.label} {...k} />)}
        </View>

        {/* Top Products */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Top Products <Text style={s.sectionMeta}>— last 30 days</Text></Text>
          <View style={[s.card, shadows.card]}>
            {(data?.top_products || []).length === 0 && (
              <Text style={s.empty}>No data yet</Text>
            )}
            {(data?.top_products || []).map((p: any, i: number) => (
              <View key={i} style={[s.productRow, i > 0 && s.productBorder]}>
                <View style={[s.rankBadge, { backgroundColor: i === 0 ? colors.goldDark : colors.border }]}>
                  <Text style={s.rankText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.productName}>{p.name}</Text>
                  <Text style={s.productQty}>{Number(p.qty || 0).toFixed(1)} MT</Text>
                </View>
                <Text style={[s.productAmt, i === 0 && { color: colors.goldLight }]}>{fmt(p.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming Maintenance */}
        {maintenance?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Maintenance Due</Text>
            {maintenance.slice(0, 3).map((m: any) => (
              <View key={m.id} style={[s.alertRow, shadows.card]}>
                <View style={s.alertIcon}>
                  <Ionicons name="construct-outline" size={16} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertAsset}>{m.asset_name}</Text>
                  <Text style={s.alertTitle}>{m.title}</Text>
                </View>
                <Text style={s.alertDate}>
                  {new Date(m.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.actionGrid}>
            {quickActions.map(a => (
              <TouchableOpacity key={a.screen} style={[s.actionBtn, { borderColor: `${a.color}40` }, shadows.card]}
                onPress={() => navigation.navigate(a.screen)} activeOpacity={0.75}>
                <View style={[s.actionIcon, { backgroundColor: `${a.color}20` }]}>
                  <Ionicons name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const kpi = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  value: { color: colors.white, fontSize: 18, fontWeight: '700' },
  label: { color: colors.textMid, fontSize: 11, marginTop: 2 },
  sub:   { color: colors.textFaint, fontSize: 10, marginTop: 1 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandDeep },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: colors.brand,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '700' },
  headerSub:   { color: colors.textMid, fontSize: 12, marginTop: 1 },
  headerCrusherDetail: { color: colors.textFaint, fontSize: 10, marginTop: 1 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${colors.gold}15`, borderWidth: 1, borderColor: `${colors.gold}25`,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.goldLight,
    borderWidth: 1.5, borderColor: colors.brand,
  },

  scroll: { paddingBottom: 32 },
  kpiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 18 },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  sectionMeta:  { color: colors.textDim, fontWeight: '400', fontSize: 12 },

  card: {
    backgroundColor: colors.surfaceCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  empty: { color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  productRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  productBorder: { borderTopWidth: 1, borderTopColor: `${colors.border}80` },
  rankBadge: {
    width: 26, height: 26, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rankText:    { color: colors.white, fontSize: 11, fontWeight: '700' },
  productName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  productQty:  { color: colors.textDim, fontSize: 11, marginTop: 1 },
  productAmt:  { color: colors.text, fontSize: 13, fontWeight: '700' },

  alertRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${colors.danger}10`,
    borderRadius: radius.md, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: `${colors.danger}20`,
  },
  alertIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${colors.danger}20`,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  alertAsset: { color: colors.text, fontSize: 13, fontWeight: '600' },
  alertTitle: { color: colors.textMid, fontSize: 11, marginTop: 1 },
  alertDate:  { color: colors.textDim, fontSize: 11 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    width: '47%', backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg, padding: 16,
    borderWidth: 1, alignItems: 'center',
  },
  actionIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  actionLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
