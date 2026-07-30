import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

import ProductosAdminScreen from './ProductosAdminScreen';
import CategoriasAdminScreen from './CategoriasAdminScreen';
import TiendaAdminScreen from './TiendaAdminScreen';
import PedidosAdminScreen from './PedidosAdminScreen';

const Tab = createBottomTabNavigator();

export default function DashboardScreen() {
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
        name="PedidosTab" 
        component={PedidosAdminScreen}
        options={{
          tabBarLabel: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ProductosTab" 
        component={ProductosAdminScreen}
        options={{
          tabBarLabel: 'Productos',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-variant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="CategoriasTab" 
        component={CategoriasAdminScreen}
        options={{
          tabBarLabel: 'Categorías',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tag-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="TiendaTab" 
        component={TiendaAdminScreen}
        options={{
          tabBarLabel: 'Mi Tienda',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="store-cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
