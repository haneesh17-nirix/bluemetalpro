import React, { useState } from 'react';
import { log } from '../../../packages/shared/src/utils/clientLogger';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, Image,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { login, selectCrusher } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { colors, shadows, radius } from '../theme';

async function registerForPushNotifications() {
  if (!Device.isDevice) return undefined;
  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return undefined;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      const fcmToken = await registerForPushNotifications();
      const data = await login(email.trim().toLowerCase(), password, fcmToken);
      if (data.crushers && data.crushers.length === 1) {
        // Auto-select the only crusher
        const sel = await selectCrusher(data.crushers[0].id);
        await SecureStore.setItemAsync('token', sel.token);
        log.action('Login successful', { role: sel.user?.role, crusher: data.crushers[0].name });
        await signIn(sel.token, sel.user, sel.crusher);
      } else if (data.crushers && data.crushers.length > 1) {
        // Multiple crushers — store temp token and crusher list, navigate to select screen
        await SecureStore.setItemAsync('token', data.temp_token);
        await SecureStore.setItemAsync('crushers_list', JSON.stringify(data.crushers));
        await SecureStore.setItemAsync('user', JSON.stringify(data.user));
        log.action('Login — crusher selection required', { count: data.crushers.length });
        navigation.navigate('SelectCrusher', { crushers: data.crushers, user: data.user });
      } else {
        throw new Error('No crusher access configured');
      }
    } catch (err: any) {
      log.error('Login failed');
      Alert.alert('Login Failed', err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandDeep} />

      {/* Background glow blobs */}
      <View style={s.glowTop} />
      <View style={s.glowBottom} />

      <View style={s.inner}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Text style={s.logoInitials}>BM</Text>
          </View>
          <View style={s.logoTextWrap}>
            <Text style={s.logoTitle}>BlueMetal Pro</Text>
            <Text style={s.logoSub}>Quarry & Stone ERP</Text>
          </View>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.subheading}>Sign in to your workspace</Text>

          {/* Email */}
          <Text style={s.label}>EMAIL ADDRESS</Text>
          <View style={s.inputWrap}>
            <Ionicons name="mail-outline" size={17} color={colors.textFaint} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@company.com"
              placeholderTextColor={colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={s.label}>PASSWORD</Text>
          <View style={s.inputWrap}>
            <Ionicons name="lock-closed-outline" size={17} color={colors.textFaint} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* Sign in button */}
          <TouchableOpacity style={[s.btn, loading && { opacity: 0.65 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={colors.brand} />
              : <>
                  <Text style={s.btnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.brand} />
                </>
            }
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>BlueMetal Pro · Quarry & Stone Crushing ERP</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandDeep },

  glowTop: {
    position: 'absolute', top: -80, left: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: colors.brandBright, opacity: 0.12,
  },
  glowBottom: {
    position: 'absolute', bottom: -60, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: colors.gold, opacity: 0.08,
  },

  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  logoWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 36, gap: 14 },
  logoCircle: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: colors.goldDark,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.gold,
  },
  logoInitials: { color: colors.brandDeep, fontSize: 22, fontWeight: '800' },
  logoTextWrap: {},
  logoTitle: { color: colors.white, fontSize: 22, fontWeight: '700' },
  logoSub: { color: colors.goldMuted, fontSize: 12, marginTop: 1 },

  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: `${colors.gold}30`,
    ...shadows.card,
  },
  heading: { color: colors.white, fontSize: 20, fontWeight: '700', marginBottom: 2 },
  subheading: { color: colors.textMid, fontSize: 13, marginBottom: 24 },

  label: { color: colors.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${colors.brandLight}90`,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: colors.white, fontSize: 15, paddingVertical: 13 },
  eyeBtn: { padding: 4 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 24, paddingVertical: 14, borderRadius: radius.md,
    backgroundColor: colors.goldLight,
    ...shadows.gold,
  },
  btnText: { color: colors.brand, fontSize: 16, fontWeight: '700' },

  footer: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: 32 },
});
