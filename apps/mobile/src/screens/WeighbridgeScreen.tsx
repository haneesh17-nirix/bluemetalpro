import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import dayjs from 'dayjs';
import { log } from '@bluemetal/shared';
import { colors, radius, shadows } from '../theme';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  stable:   { bg: 'rgba(52,211,153,0.10)', text: '#34d399', border: 'rgba(52,211,153,0.30)' },
  unstable: { bg: 'rgba(251,146,60,0.10)', text: '#fb923c', border: 'rgba(251,146,60,0.30)' },
  overload: { bg: 'rgba(248,113,113,0.10)', text: '#f87171', border: 'rgba(248,113,113,0.30)' },
  error:    { bg: 'rgba(248,113,113,0.10)', text: '#f87171', border: 'rgba(248,113,113,0.30)' },
  unknown:  { bg: 'rgba(255,255,255,0.04)', text: colors.textDim, border: colors.border },
};

function LiveCard({ wb }: { wb: any }) {
  const [live, setLive] = useState<any>(null);

  const { data: cloudLive } = useQuery({
    queryKey: ['wb-live-mobile', wb.id],
    queryFn: () => api.get(`/weighbridge/${wb.id}/live`).then(r => r.data),
    refetchInterval: live ? false : 3000,
  });

  const weight = live || cloudLive;
  const kg = Number(weight?.weight_kg || 0);
  const status: string = weight?.status || 'unknown';
  const sc = STATUS_COLORS[status] || STATUS_COLORS.unknown;

  return (
    <View style={[s.liveCard, { backgroundColor: sc.bg, borderColor: sc.border }]}>
      <View style={s.liveCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.wbName, { color: sc.text }]}>{wb.name}</Text>
          {wb.location_label ? <Text style={s.wbLocation}>{wb.location_label}</Text> : null}
        </View>
        <View style={[s.statusBadge, { backgroundColor: sc.border }]}>
          <Text style={[s.statusText, { color: sc.text }]}>{status}</Text>
        </View>
      </View>

      <Text style={[s.weightValue, { color: sc.text }]}>
        {kg.toLocaleString('en-IN')}
      </Text>
      <Text style={[s.weightUnit, { color: sc.text }]}>
        kg  ·  {(kg / 1000).toFixed(3)} MT
      </Text>

      {weight?.vehicle_number && (
        <Text style={s.vehicleLabel}>
          Vehicle: <Text style={s.vehicleBold}>{weight.vehicle_number}</Text>
        </Text>
      )}
      {weight?.captured_at && (
        <Text style={s.timestamp}>{dayjs(weight.captured_at).format('HH:mm:ss')}</Text>
      )}
    </View>
  );
}

function TicketRow({ ticket }: { ticket: any }) {
  return (
    <View style={s.ticketRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.ticketNumber}>{ticket.ticket_number}</Text>
        <Text style={s.ticketSub}>{ticket.vehicle_number || '—'} · {ticket.party_name || 'CASH'}</Text>
        <Text style={s.ticketTime}>{dayjs(ticket.created_at).format('DD/MM/YY HH:mm')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.ticketNet}>{Number(ticket.net_weight_mt).toFixed(3)} MT</Text>
        <Text style={s.ticketNetKg}>{Number(ticket.net_weight_kg).toLocaleString('en-IN')} kg</Text>
        {ticket.sale_id && (
          <View style={s.linkedBadge}>
            <Text style={s.linkedText}>Linked</Text>
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
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldLight} />}
    >
      <Text style={s.sectionTitle}>Live Scales</Text>

      {wbLoading ? (
        <ActivityIndicator color={colors.goldLight} style={{ marginVertical: 20 }} />
      ) : (weighbridges as any[]).length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="scale-outline" size={36} color={colors.textDim} />
          <Text style={s.emptyText}>No weighbridges configured</Text>
        </View>
      ) : (
        <View style={s.liveGrid}>
          {(weighbridges as any[]).map((wb: any) => (
            <LiveCard key={wb.id} wb={wb} />
          ))}
        </View>
      )}

      <View style={s.ticketsHeader}>
        <Text style={s.sectionTitle}>Recent Tickets</Text>
        <TouchableOpacity onPress={() => refetchTickets()} style={s.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color={colors.goldLight} />
        </TouchableOpacity>
      </View>

      {ticketsLoading ? (
        <ActivityIndicator color={colors.goldLight} style={{ marginVertical: 20 }} />
      ) : (tickets as any[]).length === 0 ? (
        <Text style={s.noTickets}>No tickets today</Text>
      ) : (
        <View style={s.ticketsList}>
          {(tickets as any[]).map((t: any) => <TicketRow key={t.id} ticket={t} />)}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.brandDeep },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: colors.white, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  liveGrid:        { paddingHorizontal: 16, gap: 12 },
  liveCard:        { borderWidth: 1.5, borderRadius: radius.xl, padding: 16, gap: 4 },
  liveCardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  wbName:          { fontSize: 15, fontWeight: '700' },
  wbLocation:      { fontSize: 12, color: colors.textDim, marginTop: 2 },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusText:      { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  weightValue:     { fontSize: 42, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center', marginVertical: 4 },
  weightUnit:      { fontSize: 16, textAlign: 'center', opacity: 0.7 },
  vehicleLabel:    { fontSize: 12, color: colors.textMid, textAlign: 'center', marginTop: 8 },
  vehicleBold:     { fontWeight: '700', color: colors.white },
  timestamp:       { fontSize: 10, color: colors.textFaint, textAlign: 'center', marginTop: 4 },
  ticketsHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 16 },
  refreshBtn:      { padding: 6 },
  ticketsList:     { marginHorizontal: 16, gap: 8 },
  ticketRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  ticketNumber:    { fontSize: 13, fontWeight: '700', color: colors.white },
  ticketSub:       { fontSize: 11, color: colors.textMid, marginTop: 2 },
  ticketTime:      { fontSize: 10, color: colors.textFaint, marginTop: 2 },
  ticketNet:       { fontSize: 16, fontWeight: '800', color: colors.goldLight },
  ticketNetKg:     { fontSize: 11, color: colors.textDim, marginTop: 1 },
  linkedBadge:     { backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, marginTop: 4, borderWidth: 1, borderColor: 'rgba(52,211,153,0.30)' },
  linkedText:      { fontSize: 10, color: '#34d399', fontWeight: '600' },
  empty:           { alignItems: 'center', padding: 40, gap: 8 },
  emptyText:       { color: colors.textDim, fontSize: 14 },
  noTickets:       { textAlign: 'center', color: colors.textDim, marginTop: 16, fontSize: 14 },
});
