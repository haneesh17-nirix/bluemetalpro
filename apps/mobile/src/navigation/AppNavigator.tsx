import React from 'react';
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
import { useAuth } from '../hooks/useAuth';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const C = '#1a3c5e';

function SalesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: C }, headerTintColor: 'white', headerTitleStyle: { fontWeight: 'bold' } }}>
      <Stack.Screen name="SalesList" component={SalesListScreen} options={{ title: 'Sales' }} />
      <Stack.Screen name="NewSale" component={NewSaleScreen} options={{ title: 'New Sale' }} />
    </Stack.Navigator>
  );
}

function MainTabs({ user }: { user: any }) {
  const isAdmin = user?.role === 'admin';
  const canSale = ['admin', 'sales_operator', 'accounts'].includes(user?.role);
  const canReport = ['admin', 'report_viewer', 'accounts'].includes(user?.role);

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        const icons: any = { Dashboard: 'home', Sales: 'receipt', Quarry: 'mountain', Reports: 'bar-chart', More: 'menu' };
        return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
      },
      tabBarActiveTintColor: C,
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      {canSale && <Tab.Screen name="Sales" component={SalesStack} />}
      {['admin', 'quarry_operator', 'accounts'].includes(user?.role) && <Tab.Screen name="Quarry" component={QuarryScreen} />}
      {canReport && <Tab.Screen name="Reports" component={ReportsScreen} />}
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: C }, headerTintColor: 'white', headerTitleStyle: { fontWeight: 'bold' } }}>
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
    { label: 'Vehicles', screen: 'Vehicles', icon: 'car' },
    { label: 'Maintenance', screen: 'Maintenance', icon: 'construct' },
    { label: 'Wages & Attendance', screen: 'Wages', icon: 'people' },
    { label: 'Notifications', screen: 'Notifications', icon: 'notifications' },
  ];
  const { View, Text, TouchableOpacity, StyleSheet } = require('react-native');
  const { Ionicons } = require('@expo/vector-icons');
  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8', padding: 16 }}>
      {items.map(item => (
        <TouchableOpacity key={item.screen} onPress={() => navigation.navigate(item.screen)}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8 }}>
          <Ionicons name={item.icon} size={22} color={C} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#1f2937' }}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <NavigationContainer>
      {user ? <MainTabs user={user} /> : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
