import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getMaintenanceRecords } from '../lib/api';
import dayjs from 'dayjs';

const statusColors: any = { scheduled: '#fbbf24', in_progress: '#3b82f6', completed: '#10b981', cancelled: '#9ca3af' };

export default function MaintenanceScreen({ navigation }: any) {
  const [assetType, setAssetType] = useState<string | undefined>();
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ['maintenance', assetType], queryFn: () => getMaintenanceRecords({ asset_type: assetType }) });

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <View style={styles.filterRow}>
        {[undefined, 'machinery', 'vehicle'].map(t => (
          <TouchableOpacity key={String(t)} style={[styles.filterBtn, assetType === t && styles.filterBtnActive]} onPress={() => setAssetType(t)}>
            <Text style={[styles.filterBtnText, assetType === t && { color: 'white' }]}>{t || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={data as any[]}
        keyExtractor={(item: any) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.assetName}>{item.asset_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '22' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>{item.status.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={styles.meta}>{item.asset_type === 'vehicle' ? 'Vehicle' : 'Machinery'}</Text>
              <Text style={styles.meta}>{item.scheduled_date ? dayjs(item.scheduled_date).format('DD MMM YYYY') : 'No date'}</Text>
              {item.cost > 0 && <Text style={styles.cost}>₹{Number(item.cost).toLocaleString('en-IN')}</Text>}
            </View>
            {item.vendor_name && <Text style={styles.vendor}>{item.vendor_name}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#9ca3af', marginTop: 40 }}>No records found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db' },
  filterBtnActive: { backgroundColor: '#1a3c5e', borderColor: '#1a3c5e' },
  filterBtnText: { fontSize: 13, fontWeight: '500', color: '#374151', textTransform: 'capitalize' },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  assetName: { fontSize: 14, fontWeight: '700', color: '#1a3c5e' },
  title: { fontSize: 13, color: '#374151', marginTop: 4 },
  meta: { fontSize: 11, color: '#9ca3af' },
  cost: { fontSize: 12, fontWeight: '600', color: '#059669' },
  vendor: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
});
