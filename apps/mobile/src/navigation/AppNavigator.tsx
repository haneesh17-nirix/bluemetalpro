import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import SalesListScreen from '../screens/SalesListScreen';
import NewSaleScreen from '../screens/NewSaleScreen';
import QuarryScreen from '../screens/QuarryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import WagesScreen from '../screens/WagesScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WeighbridgeScreen from '../screens/WeighbridgeScreen';
import LoginScreen from '../screens/LoginScreen';
import CrusherSelectScreen from '../screens/CrusherSelectScreen';
import { useAuth } from '../hooks/useAuth';
import { getUserCrushers } from '../lib/api';
import { colors, radius } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const stackHeader = {
  headerStyle: { backgroundColor: colors.brand, borderBottomWidth: 1, borderBottomColor: colors.borderLight } as any,
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' as const, color: colors.white },
  headerBackTitleVisible: false,
};

function SalesStack() {
  return (
    <Stack.Navigator screenOptions={stackHeader}>
      <Stack.Screen name="SalesList" component={SalesListScreen} options={{ title: 'Sales' }} />
      <Stack.Screen name="NewSale" component={NewSaleScreen} options={{ title: 'New Sale' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={stackHeader}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
      <Stack.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Maintenance' }} />
      <Stack.Screen name="Wages" component={WagesScreen} options={{ title: 'Wages & Attendance' }} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: 'Vehicles' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Weighbridge" component={WeighbridgeScreen} options={{ title: 'Weighbridge' }} />
      <Stack.Screen name="SelectCrusher" component={CrusherSelectScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MoreMenuScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleSwitchPlant = async () => {
    setSwitching(true);
    try {
      const crushers = await getUserCrushers();
      if (!crushers || crushers.length === 0) {
        Alert.alert('No Access', 'No active plants found for your account.');
        return;
      }
      if (crushers.length === 1) {
        Alert.alert('Only One Plant', `You only have access to "${crushers[0].name}".`);
        return;
      }
      navigation.navigate('SelectCrusher', { crushers, user });
    } catch {
      Alert.alert('Error', 'Could not fetch plant list. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const items = [
    { label: 'Vehicles',          screen: 'Vehicles',      icon: 'car-outline',           color: colors.brandBright },
    { label: 'Maintenance',       screen: 'Maintenance',   icon: 'construct-outline',     color: '#7c3aed' },
    { label: 'Wages & Attendance',screen: 'Wages',         icon: 'people-outline',        color: colors.gem },
    { label: 'Notifications',     screen: 'Notifications', icon: 'notifications-outline', color: colors.goldDark },
    { label: 'Weighbridge',       screen: 'Weighbridge',   icon: 'scale-outline',         color: '#0891b2' },
  ];

  return (
    <View style={more.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandDeep} />
      {items.map(item => (
        <TouchableOpacity key={item.screen} onPress={() => navigation.navigate(item.screen)}
          style={more.row} activeOpacity={0.75}>
          <View style={[more.iconBox, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </View>
          <Text style={more.label}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
        </TouchableOpacity>
      ))}

      {/* Switch Plant */}
      <TouchableOpacity
        onPress={handleSwitchPlant}
        disabled={switching}
        style={[more.row, { marginTop: 8, borderColor: `${colors.brandBright}40` }]}
        activeOpacity={0.75}
      >
        <View style={[more.iconBox, { backgroundColor: `${colors.brandBright}20` }]}>
          {switching
            ? <ActivityIndicator size="small" color={colors.brandBright} />
            : <Ionicons name="swap-horizontal-outline" size={20} color={colors.brandBright} />
          }
        </View>
        <Text style={more.label}>Switch Plant</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
      </TouchableOpacity>

      {/* Sign Out */}
      <TouchableOpacity
        onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: signOut },
        ])}
        style={[more.row, { marginTop: 8, borderColor: 'rgba(248,113,113,0.25)' }]}
        activeOpacity={0.75}
      >
        <View style={[more.iconBox, { backgroundColor: 'rgba(248,113,113,0.12)' }]}>
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
        </View>
        <Text style={[more.label, { color: '#f87171' }]}>Sign Out</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
      </TouchableOpacity>
    </View>
  );
}

function MainTabs({ user }: { user: any }) {
  const canOps    = ['admin', 'operations'].includes(user?.role);
  const canReport = ['admin', 'operations', 'report_viewer'].includes(user?.role);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['home',       'home-outline'],
            Sales:     ['receipt',    'receipt-outline'],
            Quarry:    ['diamond',    'diamond-outline'],
            Reports:   ['bar-chart',  'bar-chart-outline'],
            More:      ['grid',       'grid-outline'],
          };
          const [filled, outline] = icons[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? filled : outline) as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.goldLight,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.brand,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerShown: false,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {canOps    && <Tab.Screen name="Sales"   component={SalesStack} />}
      {canOps    && <Tab.Screen name="Quarry"  component={QuarryScreen} />}
      {canReport && <Tab.Screen name="Reports" component={ReportsScreen} />}
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, crusher, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <NavigationContainer>
      {user && crusher ? <MainTabs user={user} /> : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SelectCrusher" component={CrusherSelectScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const more = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandDeep, padding: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  label: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
});
