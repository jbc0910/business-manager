import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

// Suprimir advertencias internas de librerías de terceros que no son accionables
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TiendaProvider, useTienda } from '@/context/TiendaContext';
import { supabase } from '@/config/supabase';
import { theme } from '@/styles/theme';

import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import ForgotPasswordScreen from '@/screens/ForgotPasswordScreen';
import SetupTiendaScreen from '@/screens/SetupTiendaScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import CatalogoScreen from '@/screens/CatalogoScreen';
import CartScreen from '@/screens/CartScreen';
import DomiciliarioDashboardScreen from '@/screens/DomiciliarioDashboardScreen';
import RastreoActivoScreen from '@/screens/Repartidor/RastreoActivoScreen';
import { CartProvider } from '@/context/CartContext';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, profile, isGlobalLoading } = useAuth();
  const { tienda, isLoadingTienda } = useTienda();

  // Esperar únicamente si se está cargando la autenticación global,
  // o si el usuario no es Domiciliario y la tienda aún está cargando datos.
  if (isGlobalLoading || (user && profile?.rol !== 'Domiciliario' && isLoadingTienda)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : profile?.rol === 'Domiciliario' ? (
        <>
          <Stack.Screen name="DomiciliarioDashboard" component={DomiciliarioDashboardScreen} />
          <Stack.Screen name="RastreoActivo" component={RastreoActivoScreen} />
        </>
      ) : !tienda ? (
        <Stack.Screen name="SetupTienda" component={SetupTiendaScreen} />
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Catalogo" component={CatalogoScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  useEffect(() => {
    const handleDeepLink = async (event) => {
      if (!event?.url) return;
      try {
        const urlObj = new URL(event.url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch (err) {
        console.warn('Error processing deep link:', err);
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <TiendaProvider>
          <CartProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </CartProvider>
        </TiendaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
});