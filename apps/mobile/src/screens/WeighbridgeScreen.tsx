import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import dayjs from 'dayjs';
import { log } from '@bluemetal/shared';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  stable:   { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  unstable: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d' },
  overload: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  error:    { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  unknown:  { bg: '#f9fafb', text: '#9ca3af', border: '#e5e7eb' },
};

function LiveCard({ wb }: { wb: any }) {
  const [live, setLive] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: cloudLive } = useQuery({
    queryKey: ['wb-live-mobile', wb.id],
    queryFn: () => api.get(`/weighbridge/${wb.id}/live`).then(r => r.data),
    refetchInterval: live ? false : 3000,
  });

  const weight = live || cloudLive;
  const kg = Number(weight?.weight_kg || 0);
  const status: string = weight?.status || 'unknown';
  const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown;

  return (
    <View style={[styles.liveCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.liveCardHeader}>
        <View>
          <Text style={[styles.wbName, { color: colors.text }]}>{wb.name}</Text>
          {wb.location_label ? <Text style={styles.wbLocation}>{wb.location_label}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.border }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
        </View>
      </View>

      <Text style={[styles.weightValue, { color: colors.text }]}>
        {kg.toLocaleString('en-IN')}
      </Text>
      <Text style={[styles.weightUnit, { color: colors.text }]}>
        kg  ·  {(kg / 1000).toFixed(3)} MT
      </Text>

      {weight?.vehicle_number && (
        <Text style={styles.vehicleLabel}>Vehicle: <Text style={styles.vehicleBold}>{weight.vehicle_number}</Text></Text>
      )}
      {weight?.captured_at && (
        <Text style={styles.timestamp}>{dayjs(weight.captured_at).format('HH:mm:ss')}</Text>
      )}
    </View>
  );
}

function TicketRow({ ticket }: { ticket: any }) {
  return (
    <View style={styles.ticketRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
        <Text style={styles.ticketSub}>{ticket.vehicle_number || '—'} · {ticket.party_name || 'CASH'}</Text>
        <Text style={styles.ticketTime}>{dayjs(ticket.created_at).format('DD/MM/YY HH:mm')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.ticketNet}>{Number(ticket.net_weight_mt).toFixed(3)} MT</Text>
        <Text style={styles.ticketNetKg}>{Number(ticket.net_weight_kg).toLocaleString('en-IN')} kg</Text>
        {ticket.sale_id && (
          <View style={styles.linkedBadge}>
            <Text style={styles.linkedText}>Linked</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function WeighbridgeScreen() {
  useEffect(() => { log.screen('Weighbridge'); }, []);
  const { data: weighbridges = [], isLoading: wbLoading, refetch: refetchWb } = useQuery({
    queryKey: ['weighbridges-mobile'],
    queryFn: () => api.get('/weighbridge').then(r => r.data),
  });

  const { data: tickets = [], isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['tickets-mobile'],
    queryFn: () => api.get('/weighbridge/tickets').then(r => r.data),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchWb(), refetchTickets()]);
    setRefreshing(false);
  }, [refetchWb, refetchTickets]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a3c5e" />}
    >
      <Text style={styles.sectionTitle}>Live Scales</Text>

      {wbLoading ? (
        <ActivityIndicator color="#1a3c5e" style={{ marginVertical: 20 }} />
      ) : (weighbridges as any[]).length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="scale-outline" size={36} color="#9ca3af" />
          <Text style={styles.emptyText}>No weighbridges configured</Text>
        </View>
      ) : (
        <View style={styles.liveGrid}>
          {(weighbridges as any[]).map((wb: any) => (
            <LiveCard key={wb.id} wb={wb} />
          ))}
        </View>
      )}

      <View style={styles.ticketsHeader}>
        <Text style={styles.sectionTitle}>Recent Tickets</Text>
        <TouchableOpacity onPress={() => refetchTickets()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color="#1a3c5e" />
        </TouchableOpacity>
      </View>

      {ticketsLoading ? (
        <ActivityIndicator color="#1a3c5e" style={{ marginVertical: 20 }} />
      ) : (tickets as any[]).length === 0 ? (
        <Text style={styles.noTickets}>No tickets today</Text>
      ) : (
        <View style={styles.ticketsList}>
          {(tickets as any[]).map((t: any) => <TicketRow key={t.id} ticket={t} />)}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a3c5e', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  liveGrid: { paddingHorizontal: 16, gap: 12 },
  liveCard: { borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 4 },
  liveCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  wbName: { fontSize: 15, fontWeight: '700' },
  wbLocation: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  weightValue: { fontSize: 42, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center', marginVertical: 4 },
  weightUnit: { fontSize: 16, textAlign: 'center', opacity: 0.7 },
  vehicleLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  vehicleBold: { fontWeight: '700', color: '#374151' },
  timestamp: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
  ticketsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 16 },
  refreshBtn: { padding: 4 },
  ticketsList: { marginHorizontal: 16, gap: 8 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  ticketNumber: { fontSize: 13, fontWeight: '700', color: '#1a3c5e' },
  ticketSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  ticketTime: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  ticketNet: { fontSize: 16, fontWeight: '800', color: '#111827' },
  ticketNetKg: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  linkedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  linkedText: { fontSize: 10, color: '#16a34a', fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  noTickets: { textAlign: 'center', color: '#9ca3af', marginTop: 16, fontSize: 14 },
});
