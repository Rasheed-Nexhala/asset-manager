import './global.css';
import './config/firebase';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { InteractionManager, LogBox, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { useAuthStateSync } from './src/hooks/useAuthStateSync';
import { useUserRoleSync } from './src/hooks/useUserRoleSync';
import { useInventoryAccessSync } from './src/hooks/useInventoryAccessSync';
import { useManagerValidationSync } from './src/hooks/useManagerValidationSync';
import { usePushTokenRegistration } from './src/hooks/usePushTokenRegistration';
import { useAppSelector } from './src/store/hooks';
import { selectUserId, selectAuthInitialized } from './src/store/selectors/authSelectors';
import { RootNavigator } from './src/navigation/RootNavigator';
import { WeightViewPreferenceProvider } from './src/hooks/useWeightViewPreference';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { NoInternetScreen } from './src/components/NoInternetScreen';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { SplashOverlay } from './src/components/SplashOverlay';

Sentry.init({
  // Replace this with your DSN from sentry.io → Project Settings → Client Keys
  dsn: 'https://80a5aafc133c0fd1dea255dc128179e0@o4511017429041152.ingest.de.sentry.io/4511017435660368',
  // Only send crash reports in production — keeps dev logs clean
  enabled: !__DEV__,
  // Attach breadcrumbs (recent actions) to each crash report for context
  attachStacktrace: true,
});

// Keep splash screen visible until auth state is resolved
SplashScreen.preventAutoHideAsync();

// Suppress SafeAreaView deprecation warning
// We're already using react-native-safe-area-context correctly
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

function AppContent() {
  const [fontsLoaded, fontError] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (fontError) {
      console.error('Error loading fonts:', fontError);
    }
  }, [fontError]);

  useAuthStateSync();
  const userId = useAppSelector(selectUserId);
  const authInitialized = useAppSelector(selectAuthInitialized);
  useUserRoleSync(userId);
  useInventoryAccessSync();
  useManagerValidationSync();
  usePushTokenRegistration(userId);
  const { isOffline, retry } = useNetworkStatus();

  useEffect(() => {
    // Wait for all animations/interactions to settle before hiding the native splash,
    // ensuring SplashOverlay is fully painted and committed to the screen first.
    const task = InteractionManager.runAfterInteractions(() => {
      SplashScreen.hideAsync();
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (!authInitialized) return;
    Sentry.addBreadcrumb({
      category: 'auth_lifecycle',
      message: 'auth_initialized',
      level: 'info',
    });
  }, [authInitialized]);

  useEffect(() => {
    if (!authInitialized) return;
    Sentry.addBreadcrumb({
      category: 'auth_lifecycle',
      message: userId ? 'user_session_active' : 'user_session_cleared',
      level: 'info',
      data: {
        hasUserId: Boolean(userId),
      },
    });
  }, [authInitialized, userId]);

  // Proceed if auth is done AND (fonts are loaded OR they failed to load, so we don't get stuck)
  if (!authInitialized || (!fontsLoaded && !fontError)) {
    return (
      <>
        <StatusBar style="dark" />
        <SplashOverlay />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <RootNavigator />
        {isOffline && (
          <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
            <NoInternetScreen onRetry={retry} />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    backgroundColor: '#F8FAFC',
  },
});

function App() {
  return (
    <AppErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <WeightViewPreferenceProvider>
            <AppContent />
          </WeightViewPreferenceProvider>
        </SafeAreaProvider>
      </Provider>
    </AppErrorBoundary>
  );
}

export default Sentry.wrap(App);
