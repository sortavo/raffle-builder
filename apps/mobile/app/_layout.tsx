// Root Layout with navigation
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from '../src/providers';

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="raffle/[id]"
              options={{
                headerShown: true,
                headerTitle: '',
                headerTransparent: true,
                headerBackTitle: 'Volver',
              }}
            />
            <Stack.Screen
              name="checkout/[raffleId]"
              options={{
                headerShown: true,
                headerTitle: 'Comprar boletos',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="auth/login"
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
