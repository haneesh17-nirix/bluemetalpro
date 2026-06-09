import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { selectCrusher } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { log } from '@bluemetal/shared';
import { colors, shadows, radius } from '../theme';

export default function CrusherSelectScreen({ route, navigation }: any) {
  const { crushers = [], user } = route.params || {};
  const { signIn } = useAuth();
  const [selecting, setSelecting] = useState<string | null>(null);

  const handleSelect = async (crusher: any) => {
    setSelecting(crusher.id);
    try {
      const data = await selectCrusher(crusher.id);
      log.action('Crusher selected', { name: crusher.name });
      await signIn(data.token, data.user, data.crusher);
      await SecureStore.deleteItemAsync('crushers_list');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to select crusher');
      setSelecting(null);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandDeep} />

      <View style={s.glowTop} />

      <View style={s.header}>
        <View style={s.iconWrap}>
          <Ionicons name="business-outline" size={28} color={colors.goldLight} />
        </View>
        <Text style={s.title}>Select Plant</Text>
        <Text style={s.subtitle}>Choose the crushing plant you want to manage</Text>
      </View>

      <FlatList
        data={crushers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item: c }) => (
          <TouchableOpacity
            onPress={() => handleSelect(c)}
            disabled={!!selecting}
            style={[s.card, { borderColor: selecting === c.id ? colors.gold : colors.border }]}
            activeOpacity={0.8}
          >
            <View style={s.iconBox}>
              <Text style={s.iconLetter}>{c.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.name}>{c.name}</Text>
              {(c.city || c.state) && (
                <Text style={s.location}>
                  <Ionicons name="location-outline" size={11} color={colors.textDim} />
                  {' '}{[c.city, c.state].filter(Boolean).join(', ')}
                </Text>
              )}
              {c.gstin && <Text style={s.gstin}>GSTIN: {c.gstin}</Text>}
              <View style={s.roleBadge}>
                <Text style={s.roleText}>{c.role || 'member'}</Text>
              </View>
            </View>
            <View style={s.chevron}>
              {selecting === c.id
                ? <ActivityIndicator size="small" color={colors.gold} />
                : <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              }
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandDeep },
  glowTop: {
    position: 'absolute', top: -60, right: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: colors.gold, opacity: 0.06,
  },
  header: { alignItems: 'center', paddingTop: 64, paddingBottom: 32, paddingHorizontal: 24 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1, borderColor: `${colors.gold}40`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, ...shadows.gold,
  },
  title: { color: colors.white, fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMid, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg, padding: 16,
    borderWidth: 1, ...shadows.card,
  },
  iconBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: `${colors.goldDark}30`,
    borderWidth: 1, borderColor: `${colors.gold}30`,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconLetter: { color: colors.goldLight, fontSize: 18, fontWeight: '800' },
  info: { flex: 1 },
  name: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  location: { color: colors.textDim, fontSize: 11, marginBottom: 2 },
  gstin: { color: colors.textFaint, fontSize: 10, fontFamily: 'monospace', marginBottom: 4 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: `${colors.brandBright}25`,
    borderWidth: 1, borderColor: `${colors.brandBright}40`,
  },
  roleText: { color: '#93c5fd', fontSize: 10, fontWeight: '600' },
  chevron: { flexShrink: 0, width: 24, alignItems: 'center' },
});
