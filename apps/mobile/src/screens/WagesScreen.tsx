import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkers, getAttendance, submitAttendance } from '../lib/api';
import dayjs from 'dayjs';
import { colors, shadows, radius } from '../theme';
import { log } from '../../../packages/shared/src/utils/clientLogger';

const statusOptions = ['present', 'absent', 'half_day', 'leave'];

function getStatusColor(status: string): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'present':
      return { bg: colors.gem + '25', text: colors.gemLight, border: colors.gem + '40', dot: colors.gemLight };
    case 'absent':
      return { bg: colors.danger + '25', text: '#fca5a5', border: colors.danger + '40', dot: colors.danger };
    case 'half_day':
      return { bg: colors.gold + '25', text: colors.goldLight, border: colors.gold + '40', dot: colors.goldLight };
    case 'leave':
    default:
      return { bg: colors.info + '25', text: '#93c5fd', border: colors.info + '40', dot: '#93c5fd' };
  }
}

function getActiveBtnStyle(status: string): { backgroundColor: string; borderColor: string } {
  switch (status) {
    case 'present':
      return { backgroundColor: colors.gem, borderColor: colors.gem };
    case 'absent':
      return { backgroundColor: colors.danger, borderColor: colors.danger };
    case 'half_day':
      return { backgroundColor: colors.gold, borderColor: colors.gold };
    case 'leave':
    default:
      return { backgroundColor: colors.info, borderColor: colors.info };
  }
}

export default function WagesScreen() {
  useEffect(() => { log.screen('Wages'); }, []);
  const qc = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: getWorkers });
  const { data: attendance = [], refetch } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => getAttendance({ date: selectedDate }),
  });

  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: submitAttendance,
    onSuccess: () => {
      log.action('Attendance saved');
      Alert.alert('Saved', 'Attendance saved');
      refetch();
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: () => Alert.alert('Error', 'Failed to save'),
  });

  const getStatus = (workerId: string) => {
    const a = (attendance as any[]).find((x: any) => x.worker_id === workerId);
    return localStatus[workerId] || a?.status || 'present';
  };

  const handleSave = () => {
    const entries = (workers as any[]).map((w: any) => ({
      worker_id: w.id,
      status: getStatus(w.id),
      overtime_hours: 0,
      advance: 0,
    }));
    mutation.mutate({ date: selectedDate, entries });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance</Text>
        <Text style={styles.headerDate}>{dayjs(selectedDate).format('dddd, DD MMM YYYY')}</Text>
      </View>
      <FlatList
        data={workers as any[]}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const status = getStatus(item.id);
          const sc = getStatusColor(status);
          return (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Text style={styles.workerDesig}>
                    {item.designation} · ₹{Number(item.wage_rate).toLocaleString('en-IN')}/{item.wage_type === 'daily' ? 'day' : 'mo'}
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
              </View>
              <View style={styles.statusRow}>
                {statusOptions.map(s => {
                  const isActive = status === s;
                  const activeStyle = getActiveBtnStyle(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusBtn,
                        isActive && { backgroundColor: activeStyle.backgroundColor, borderColor: activeStyle.borderColor },
                      ]}
                      onPress={() => setLocalStatus(ls => ({ ...ls, [item.id]: s }))}
                    >
                      <Text style={[styles.statusBtnText, isActive && styles.statusBtnTextActive]}>
                        {s.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.brand} />
            ) : (
              <Text style={styles.saveBtnText}>Save Attendance</Text>
            )}
          </TouchableOpacity>
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
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerDate: {
    color: colors.textMid,
    fontSize: 13,
    marginTop: 2,
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
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  workerDesig: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.brandLight + '60',
  },
  statusBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMid,
    textTransform: 'capitalize',
  },
  statusBtnTextActive: {
    color: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.goldLight,
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    margin: 4,
    marginTop: 8,
  },
  saveBtnText: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 15,
  },
});
