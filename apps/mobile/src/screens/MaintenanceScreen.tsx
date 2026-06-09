import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getMaintenanceRecords } from '../lib/api';
import dayjs from 'dayjs';
import { colors, shadows, radius } from '../theme';
import { log } from '../../../packages/shared/src/utils/clientLogger';

function getStatusChip(status: string) {
  switch (status) {
    case 'completed':
      return { bg: colors.gem + '25', text: colors.gemLight, border: colors.gem + '40' };
    case 'scheduled':
    case 'maintenance':
      return { bg: colors.gold + '25', text: colors.goldLight, border: colors.gold + '40' };
    case 'cancelled':
      return { bg: colors.danger + '25', text: '#fca5a5', border: colors.danger + '40' };
    case 'in_progress':
    default:
      return { bg: colors.info + '25', text: '#93c5fd', border: colors.info + '40' };
  }
}

export default function MaintenanceScreen({ navigation }: any) {
  useEffect(() => { log.screen('Maintenance'); }, []);
  const [assetType, setAssetType] = useState<string | undefined>();
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['maintenance', assetType],
    queryFn: () => getMaintenanceRecords({ asset_type: assetType }),
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.filterRow}>
        {[undefined, 'machinery', 'vehicle'].map(t => (
          <TouchableOpacity
            key={String(t)}
            style={[styles.filterBtn, assetType === t && styles.filterBtnActive]}
            onPress={() => setAssetType(t)}
          >
            <Text style={[styles.filterBtnText, assetType === t && styles.filterBtnTextActive]}>
              {t || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={data as any[]}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.goldLight}
            colors={[colors.goldLight]}
          />
        }
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const chip = getStatusChip(item.status);
          return (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.assetName}>{item.asset_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: chip.bg, borderColor: chip.border }]}>
                  <Text style={[styles.statusText, { color: chip.text }]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={styles.meta}>{item.asset_type === 'vehicle' ? 'Vehicle' : 'Machinery'}</Text>
                <Text style={styles.meta}>
                  {item.scheduled_date ? dayjs(item.scheduled_date).format('DD MMM YYYY') : 'No date'}
                </Text>
                {item.cost > 0 && (
                  <Text style={styles.cost}>₹{Number(item.cost).toLocaleString('en-IN')}</Text>
                )}
              </View>
              {item.vendor_name && <Text style={styles.vendor}>{item.vendor_name}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No records found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandDeep,
  },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.goldLight,
    borderColor: colors.goldLight,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMid,
    textTransform: 'capitalize',
  },
  filterBtnTextActive: {
    color: colors.brand,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    ...shadows.card,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  title: {
    fontSize: 13,
    color: colors.textMid,
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    color: colors.textDim,
  },
  cost: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gemLight,
  },
  vendor: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textDim,
    marginTop: 40,
  },
});
