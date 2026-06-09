import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [crusher, setCrusherState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      const crusherStr = await SecureStore.getItemAsync('crusher');
      if (token && userStr) setUser(JSON.parse(userStr));
      if (crusherStr) setCrusherState(JSON.parse(crusherStr));
      setIsLoading(false);
    })();
  }, []);

  const signIn = async (token: string, userData: any, crusherData?: any) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    if (crusherData) {
      await SecureStore.setItemAsync('crusher', JSON.stringify(crusherData));
      setCrusherState(crusherData);
    }
    setUser(userData);
  };

  const setCrusher = async (crusherData: any) => {
    await SecureStore.setItemAsync('crusher', JSON.stringify(crusherData));
    setCrusherState(crusherData);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('crusher');
    await SecureStore.deleteItemAsync('crushers_list');
    setUser(null);
    setCrusherState(null);
  };

  return { user, crusher, isLoading, signIn, signOut, setCrusher };
}
