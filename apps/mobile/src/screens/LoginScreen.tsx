import React, { useState } from 'react';
import { log } from '@bluemetal/shared';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, Image, ScrollView,
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

const features = [
  { icon: 'shield-checkmark-outline', label: 'Secure & Compliant', sub: 'GST-ready, role-based access' },
  { icon: 'trending-up-outline',      label: 'Live Analytics',     sub: 'Real-time dashboards & KPIs' },
  { icon: 'hardware-chip-outline',    label: 'Smart Operations',   sub: 'Weighbridge & maintenance' },
  { icon: 'globe-outline',            label: 'Multi-Plant',        sub: 'All units in one platform' },
];

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      const fcmToken = await registerForPushNotifications();
      const data = await login(email.trim().toLowerCase(), password, fcmToken);
      if (data.crushers && data.crushers.length === 1) {
        const sel = await selectCrusher(data.crushers[0].id);
        await SecureStore.setItemAsync('token', sel.token);
        log.action('Login successful', { role: sel.user?.role, crusher: data.crushers[0].name });
        await signIn(sel.token, sel.user, sel.crusher);
      } else if (data.crushers && data.crushers.length > 1) {
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
      <StatusBar barStyle="light-content" backgroundColor="#06090f" />

      {/* Background blobs */}
      <View style={s.blobTL} />
      <View style={s.blobBR} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Top branding panel ── */}
        <View style={s.brandPanel}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoImgShadow}>
              <Image
                source={require('../../assets/logo-icon.png')}
                style={s.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={s.logoTextWrap}>
              <Text style={s.logoName}>BlueMetal Pro</Text>
              <Text style={s.logoTag}>QUARRY ERP</Text>
            </View>
          </View>

          {/* Feature grid */}
          <View style={s.featGrid}>
            {features.map(f => (
              <View style={s.featCard} key={f.label}>
                <View style={s.featIcon}>
                  <Ionicons name={f.icon as any} size={14} color="#c9a84c" />
                </View>
                <View style={s.featText}>
                  <Text style={s.featLabel}>{f.label}</Text>
                  <Text style={s.featSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Form panel ── */}
        <View style={s.formPanel}>
          <View style={s.card}>

            {/* Eyebrow */}
            <View style={s.eyebrow}>
              <View style={s.eyebrowDot} />
              <Text style={s.eyebrowText}>Secure login</Text>
            </View>

            <Text style={s.heading}>Welcome back</Text>
            <Text style={s.subheading}>Sign in to your workspace</Text>

            {/* Email */}
            <Text style={s.label}>EMAIL ADDRESS</Text>
            <View style={[s.inputWrap, focusedField === 'email' && s.inputFocused]}>
              <Ionicons name="mail-outline" size={14}
                color={focusedField === 'email' ? 'rgba(180,138,32,0.7)' : 'rgba(150,170,210,0.28)'}
                style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="admin@company.com"
                placeholderTextColor="rgba(150,170,210,0.28)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <Text style={[s.label, { marginTop: 16 }]}>PASSWORD</Text>
            <View style={[s.inputWrap, focusedField === 'password' && s.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={14}
                color={focusedField === 'password' ? 'rgba(180,138,32,0.7)' : 'rgba(150,170,210,0.28)'}
                style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                placeholderTextColor="rgba(150,170,210,0.28)"
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={14}
                  color={showPw ? 'rgba(180,138,32,0.7)' : 'rgba(150,170,210,0.28)'}
                />
              </TouchableOpacity>
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#d4a838" />
                : <>
                    <Text style={s.btnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={15} color="#d4a838" />
                  </>
              }
            </TouchableOpacity>

            {/* Divider footer */}
            <View style={s.divider}>
              <Text style={s.dividerText}>BlueMetal Pro · Quarry & Stone Crushing ERP</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06090f' },

  blobTL: {
    position: 'absolute', top: -80, left: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(37,99,168,0.14)',
  },
  blobBR: {
    position: 'absolute', bottom: -60, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(184,149,62,0.10)',
  },

  scroll: { flexGrow: 1 },

  /* ── Branding panel ── */
  brandPanel: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184,149,62,0.08)',
    alignItems: 'center',
    gap: 24,
  },

  logoWrap: { alignItems: 'center', gap: 16 },
  logoImgShadow: {
    shadowColor: 'rgba(160,112,20,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImg: { width: 88, height: 88 },
  logoTextWrap: { alignItems: 'center', gap: 4 },
  logoName: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  logoTag: {
    fontSize: 11, fontWeight: '700', letterSpacing: 3,
    color: '#c9a84c',
  },

  featGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    width: '100%', justifyContent: 'center',
  },
  featCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, width: '47%',
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  featIcon: {
    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(184,149,62,0.1)',
    borderWidth: 1, borderColor: 'rgba(184,149,62,0.18)',
  },
  featText: { flex: 1, gap: 2 },
  featLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(220,232,248,0.9)' },
  featSub: { fontSize: 10, color: 'rgba(180,200,228,0.4)', lineHeight: 14 },

  /* ── Form panel ── */
  formPanel: { padding: 24, paddingBottom: 40 },

  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(122,80,16,0.8)',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 16,
  },

  eyebrow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: 20, marginBottom: 14,
    backgroundColor: 'rgba(184,149,62,0.08)',
    borderWidth: 1, borderColor: 'rgba(184,149,62,0.2)',
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#c9a84c',
    shadowColor: '#c9a84c', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  eyebrowText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#c9a84c' },

  heading: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subheading: { color: 'rgba(180,200,228,0.45)', fontSize: 13, marginBottom: 24 },

  label: {
    color: 'rgba(170,190,220,0.5)', fontSize: 11,
    fontWeight: '700', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 6,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(3,9,24,0.65)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: 'rgba(180,138,32,0.55)',
    backgroundColor: 'rgba(2,8,28,0.92)',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#dde6f4', fontSize: 14, paddingVertical: 13 },
  eyeBtn: { padding: 4 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#6a4808',
    borderWidth: 1, borderColor: 'rgba(120,80,15,0.7)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  btnDisabled: { backgroundColor: '#3a2008', opacity: 0.6 },
  btnText: { color: '#d4a838', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  divider: {
    marginTop: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  dividerText: { fontSize: 11, color: 'rgba(150,170,210,0.22)' },
});
