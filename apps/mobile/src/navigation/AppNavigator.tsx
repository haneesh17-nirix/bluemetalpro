import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
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
import LoginScreen from '../screens/LoginScreen';
import CrusherSelectScreen from '../screens/CrusherSelectScreen';
import { useAuth } from '../hooks/useAuth';
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
    </Stack.Navigator>
  );
}

function MoreMenuScreen({ navigation }: any) {
  const items = [
    { label: 'Vehicles',          screen: 'Vehicles',      icon: 'car-outline',           color: colors.brandBright },
    { label: 'Maintenance',       screen: 'Maintenance',   icon: 'construct-outline',     color: '#7c3aed' },
    { label: 'Wages & Attendance',screen: 'Wages',         icon: 'people-outline',        color: colors.gem },
    { label: 'Notifications',     screen: 'Notifications', icon: 'notifications-outline', color: colors.goldDark },
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
    </View>
  );
}

function MainTabs({ user }: { user: any }) {
  const canSale   = ['admin', 'sales_operator', 'accounts'].includes(user?.role);
  const canReport = ['admin', 'report_viewer', 'accounts'].includes(user?.role);
  const canQuarry = ['admin', 'quarry_operator', 'accounts'].includes(user?.role);

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
      {canSale   && <Tab.Screen name="Sales"   component={SalesStack} />}
      {canQuarry && <Tab.Screen name="Quarry"  component={QuarryScreen} />}
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
