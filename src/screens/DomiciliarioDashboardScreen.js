import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

import EntregasScreen from './Repartidor/EntregasScreen';
import DomiciliarioPerfilScreen from './Repartidor/DomiciliarioPerfilScreen';

const Tab = createBottomTabNavigator();

export default function DomiciliarioDashboardScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 12,
        }
      }}
    >
      <Tab.Screen 
        name="EntregasTab" 
        component={EntregasScreen}
        options={{
          tabBarLabel: 'Entregas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bike" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="PerfilTab" 
        component={DomiciliarioPerfilScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
