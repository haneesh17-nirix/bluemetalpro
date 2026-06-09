import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllRead } from '../lib/api';
import dayjs from 'dayjs';
import { log } from '../../../packages/shared/src/utils/clientLogger';

export default function NotificationsScreen() {
  useEffect(() => { log.screen('Notifications'); }, []);
  const qc = useQueryClient();
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const markAllMutation = useMutation({ mutationFn: markAllRead, onSuccess: () => refetch() });

  const typeColors: any = { sale: '#2563a8', payment: '#059669', maintenance: '#f59e0b', quarry: '#7c3aed' };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
        <TouchableOpacity onPress={() => markAllMutation.mutate()}>
          <Text style={{ color: '#2563a8', fontWeight: '600', fontSize: 13 }}>Mark all read</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data as any[]}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.is_read && styles.unread]}>
            <View style={[styles.dot, { backgroundColor: typeColors[item.type] || '#9ca3af' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{dayjs(item.sent_at).format('DD MMM, hh:mm A')}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40 }}>No notifications</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  unread: { backgroundColor: '#eff6ff', borderLeftWidth: 3, borderLeftColor: '#2563a8' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  title: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  body: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  time: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
});
