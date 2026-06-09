import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { login } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const C = '#1a3c5e';

async function registerForPushNotifications() {
  if (!Device.isDevice) return undefined;
  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return undefined;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      const fcmToken = await registerForPushNotifications();
      const data = await login(email.trim().toLowerCase(), password, fcmToken);
      await signIn(data.token, data.user);
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>SC</Text>
        </View>
        <Text style={styles.title}>BlueMetal Pro</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C },
  inner: { flex: 1, justifyContent: 'center', padding: 32 },
  logoBox: { width: 72, height: 72, backgroundColor: '#f59e0b', borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  logoText: { fontSize: 28, fontWeight: 'bold', color: C },
  title: { fontSize: 26, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 36 },
  form: { backgroundColor: 'white', borderRadius: 20, padding: 24 },
  label: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: '#f9fafb' },
  btn: { backgroundColor: C, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
