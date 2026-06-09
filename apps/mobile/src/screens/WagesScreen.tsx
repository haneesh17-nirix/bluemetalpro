import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkers, getAttendance, submitAttendance } from '../lib/api';
import dayjs from 'dayjs';

const C = '#1a3c5e';
const statusOptions = ['present', 'absent', 'half_day', 'leave'];
const statusColors: any = { present: '#10b981', absent: '#ef4444', half_day: '#f59e0b', leave: '#6b7280' };

export default function WagesScreen() {
  const qc = useQueryClient();
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(today);
  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: getWorkers });
  const { data: attendance = [], refetch } = useQuery({ queryKey: ['attendance', selectedDate], queryFn: () => getAttendance({ date: selectedDate }) });

  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: submitAttendance,
    onSuccess: () => { Alert.alert('Saved', 'Attendance saved'); refetch(); qc.invalidateQueries({ queryKey: ['attendance'] }); },
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
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <View style={{ backgroundColor: '#db2777', padding: 16 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Attendance</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{dayjs(selectedDate).format('dddd, DD MMM YYYY')}</Text>
      </View>
      <FlatList
        data={workers as any[]}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const status = getStatus(item.id);
          return (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Text style={styles.workerDesig}>{item.designation} · ₹{Number(item.wage_rate).toLocaleString('en-IN')}/{item.wage_type === 'daily' ? 'day' : 'mo'}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
              </View>
              <View style={styles.statusRow}>
                {statusOptions.map(s => (
                  <TouchableOpacity key={s} style={[styles.statusBtn, status === s && { backgroundColor: statusColors[s] }]}
                    onPress={() => setLocalStatus(ls => ({ ...ls, [item.id]: s }))}>
                    <Text style={[styles.statusBtnText, status === s && { color: 'white' }]}>{s.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={[styles.saveBtn, mutation.isPending && { opacity: 0.6 }]} onPress={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Attendance</Text>}
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  workerName: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  workerDesig: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  statusBtnText: { fontSize: 10, fontWeight: '600', color: '#4b5563', textTransform: 'capitalize' },
  saveBtn: { backgroundColor: '#db2777', padding: 14, borderRadius: 12, alignItems: 'center', margin: 4, marginTop: 8 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
